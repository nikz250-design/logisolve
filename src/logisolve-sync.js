// logisolve-sync.js
// Supabase REST + Realtime WebSocket + offline queue + storage
// ─────────────────────────────────────────────────────

const SB_URL = "https://ecxqxspphoehmkvlmbtv.supabase.co";
const SB_KEY = "sb_publishable_xTPWFkPZaNN4jAeuFifVaw_yXvQvdfC";
export const STORAGE_VER = 5;

// ── REST ─────────────────────────────────────────────────────────────────────

export async function sbFetch(path, opts={}) {
  try {
    const res = await fetch(`${SB_URL}/rest/v1${path}`, {
      ...opts,
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        "Prefer": opts.method==="POST"?"resolution=merge-duplicates,return=minimal":"return=minimal",
        ...(opts.headers||{}),
      },
    });
    const txt = await res.text();
    return txt ? JSON.parse(txt) : null;
  } catch(e) { opLog.push("SB_FETCH_ERR",{error:e?.message,path}); return null; }
}

export async function loadTable(table) {
  const rows = await sbFetch(`/${table}?select=id,data&order=created_at.asc`);
  return Array.isArray(rows)&&rows.length>0 ? rows.map(r=>r.data) : null;
}

export async function upsertRow(table, id, data) {
  const stamped = { ...data, _updatedAt: new Date().toISOString() };
  await sbFetch(`/${table}`, {
    method:"POST",
    body: JSON.stringify({id, data: stamped}),
  });
}

export async function deleteRow(table, id) {
  await sbFetch(`/${table}?id=eq.${encodeURIComponent(id)}`, {method:"DELETE"});
}

export async function loadAllFromSupabase() {
  const [tickets,clients,suppliers,units,parts] = await Promise.all([
    loadTable("tickets"),loadTable("clients"),loadTable("suppliers"),
    loadTable("units"),loadTable("parts"),
  ]);
  if (!tickets && !clients) return null;
  return {tickets,clients,suppliers,units,parts};
}

export async function seedIfEmpty(initialState) {
  const existing = await loadTable("tickets");
  if (existing) return;
  await Promise.all([
    ...initialState.tickets.map(t=>upsertRow("tickets",t.id,t)),
    ...initialState.clients.map(c=>upsertRow("clients",c.id,c)),
    ...initialState.suppliers.map(s=>upsertRow("suppliers",s.id,s)),
    ...initialState.units.map(u=>upsertRow("units",u.id,u)),
    ...initialState.parts.map(p=>upsertRow("parts",p.id,p)),
  ]);
}

// ── Realtime WebSocket ────────────────────────────────────────────────────────
// Supabase Realtime v1 protocol over WSS
// Prerequisite: enable Realtime on each table in Supabase dashboard

let _ws = null;
let _hb = null;
let _stopping = false;
const TABLES = ["tickets","clients","suppliers","units","parts"];

export function subscribeRealtime(onEvent) {
  if (_ws) return;
  _stopping = false;

  const connect = () => {
    if (_stopping) return;
    try {
      const ws = new WebSocket(
        `${SB_URL.replace("https://","wss://")}/realtime/v1/websocket?apikey=${SB_KEY}&vsn=1.0.0`
      );
      _ws = ws;

      ws.onopen = () => {
        opLog.push("REALTIME_CONNECTED");
        // Join a channel per table
        TABLES.forEach(table => {
          ws.send(JSON.stringify({
            topic:`realtime:public:${table}`,
            event:"phx_join",
            payload:{config:{broadcast:{self:false},presence:{key:""}}},
            ref:null,
          }));
        });
        // Heartbeat every 25s (Supabase times out at 60s)
        _hb = setInterval(()=>{
          if(ws.readyState===WebSocket.OPEN)
            ws.send(JSON.stringify({topic:"phoenix",event:"heartbeat",payload:{},ref:null}));
        }, 25000);
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          // Supabase Realtime events: INSERT, UPDATE, DELETE
          if (["INSERT","UPDATE","DELETE"].includes(msg.event)) {
            const table = (msg.topic||"").split(":")[2];
            if (table && msg.payload?.record) {
              onEvent({table, event:msg.event, record:msg.payload.record});
            }
          }
        } catch {}
      };

      ws.onclose = () => {
        _ws = null;
        clearInterval(_hb);
        if (!_stopping) {
          opLog.push("REALTIME_RECONNECTING");
          setTimeout(connect, 5000); // auto-reconnect
        }
      };

      ws.onerror = () => {
        opLog.push("REALTIME_WS_ERR");
        ws.close();
      };

    } catch(e) {
      opLog.push("REALTIME_CONNECT_FAIL",{error:e?.message});
      setTimeout(connect, 10000);
    }
  };

  connect();
}

export function disconnectRealtime() {
  _stopping = true;
  if (_ws) { _ws.close(); _ws = null; }
  clearInterval(_hb);
}

// ── Offline pending queue ─────────────────────────────────────────────────────

const PENDING_KEY = "lgs_pending_v1";

export const pendingQueue = {
  _q: [],
  push(op)  { this._q.push({...op,ts:Date.now()}); this._persist(); },
  flush()   { const q=[...this._q]; this._q=[]; this._persist(); return q; },
  peek()    { return [...this._q]; },
  size()    { return this._q.length; },
  _persist(){ try{ localStorage.setItem(PENDING_KEY,JSON.stringify(this._q)); }catch{} },
  _restore(){ try{ const s=localStorage.getItem(PENDING_KEY); if(s)this._q=JSON.parse(s)||[]; }catch{ this._q=[]; } },
};
pendingQueue._restore();

// ── Structured op log ─────────────────────────────────────────────────────────

export const opLog = {
  _logs:[],
  push(action, detail={}) {
    const entry={ts:new Date().toISOString(),action,online:navigator.onLine,...detail};
    this._logs.push(entry);
    if(this._logs.length>500) this._logs.shift();
    if(detail.error) console.warn("[LogiSolve]",action,detail);
  },
  get(filter){ return filter?this._logs.filter(e=>e.action.includes(filter)):[...this._logs]; },
  clear(){ this._logs=[]; },
};

// ── Safe localStorage ─────────────────────────────────────────────────────────

export function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch(e) {
    if(e.name==="QuotaExceededError") {
      // Remove old backups to free space
      Object.keys(localStorage)
        .filter(k=>k.startsWith("lgs_backup_"))
        .forEach(k=>localStorage.removeItem(k));
      try{ localStorage.setItem(key,value); return true; }catch{ return false; }
    }
    return false;
  }
}

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem("logisolve_state");
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.version!==STORAGE_VER) return null;
    return s;
  } catch { return null; }
}

export function saveToStorage(state) {
  safeLocalSet("logisolve_state", JSON.stringify({version:STORAGE_VER,...state}));
}
