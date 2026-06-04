import React, { useState, useReducer, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import FlotaModule from "./modules/flota/index.jsx";

// ── Sourcing Copilot — AI contextual para sourcing de refacciones ────────────
import SourcingCopilot from "./components/sourcing/SourcingCopilot.jsx";

// ── AutoInsight — insights IA automáticos sin interacción del usuario ────────
import AutoInsight           from "./components/ai/AutoInsight.jsx";
import { useStateEvents }    from "./ai/engine/useStateEvents.js";
import MChat                 from "./components/ai/MChat.jsx";

// ═══════════════════════════════════════════════════════════════════════════════
// L1 — DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════
const C_DARK = {
  _dark:true,
  // ── Surface system — glassmorphism dark
  bg0:"#0D0F12",
  bg1:"rgba(22,24,28,0.62)",
  bg2:"rgba(16,18,22,0.94)",
  bg3:"rgba(28,32,40,0.74)",
  bg4:"rgba(38,44,54,0.88)",
  bgSolid:"#111418",
  border:"rgba(255,255,255,0.07)",
  borderHi:"rgba(255,255,255,0.13)",
  blue:"#8FE3BE",  blueHi:"#BFE8D3", blueDim:"rgba(143,227,190,0.12)",
  cyan:"#8FE3BE",  cyanDim:"rgba(143,227,190,0.09)",
  green:"#8FE3BE", greenDim:"rgba(143,227,190,0.12)",
  red:"#FF7A7A",   redDim:"rgba(255,122,122,0.12)",
  yellow:"#F5C842",yellowDim:"rgba(245,200,66,0.12)",
  orange:"#F97316",amber:"#F5C842",
  purple:"#A78BFA",purpleDim:"rgba(167,139,250,0.1)",
  t1:"#F5F5F7", t2:"#B6BBC4", t3:"#7E848E", t4:"#556070",
  p1:"#FF7A7A", p1dim:"rgba(255,122,122,0.12)", p1dot:"#FF7A7A",
  p2:"#F5C842", p2dim:"rgba(245,200,66,0.12)",  p2dot:"#F5C842",
  p3:"#8FE3BE", p3dim:"rgba(143,227,190,0.12)", p3dot:"#8FE3BE",
  p4:"#7E848E", p4dim:"rgba(126,132,142,0.10)", p4dot:"#7E848E",
  glass:"blur(28px) saturate(1.6)",
};
const C_LIGHT = {
  _dark:false,
  // ── Surface system — Apple liquid glass / VisionOS light
  bg0:"#F5F4F0",
  bg1:"rgba(255,255,255,0.32)",
  bg2:"rgba(255,255,255,0.80)",
  bg3:"rgba(255,255,255,0.18)",
  bg4:"rgba(255,255,255,0.55)",
  bgSolid:"#F5F4F0",
  border:"rgba(0,0,0,0.06)",
  borderHi:"rgba(0,0,0,0.10)",
  // Accent — soft mint pastel (glow/tint only, not for text)
  blue:"#9FE0BE",  blueHi:"#BFE8D3", blueDim:"rgba(159,224,190,0.22)",
  cyan:"#9FE0BE",  cyanDim:"rgba(159,224,190,0.16)",
  green:"#9FE0BE", greenDim:"rgba(159,224,190,0.22)",
  red:"#E05555",   redDim:"rgba(224,85,85,0.12)",
  yellow:"#C8860A",yellowDim:"rgba(200,134,10,0.12)",
  orange:"#C06620",amber:"#C8860A",
  purple:"#9B8DD0",purpleDim:"rgba(155,141,208,0.12)",
  // Typography — warm dark, never pure black
  t1:"#161616", t2:"#6E6E73", t3:"#A1A1A6", t4:"#C8C8CC",
  p1:"#E05555", p1dim:"rgba(224,85,85,0.10)", p1dot:"#E05555",
  p2:"#C8860A", p2dim:"rgba(200,134,10,0.10)", p2dot:"#C8860A",
  p3:"#5CBF8A", p3dim:"rgba(92,191,138,0.15)", p3dot:"#5CBF8A",
  p4:"#A1A1A6", p4dim:"rgba(161,161,166,0.10)", p4dot:"#A1A1A6",
  glass:"blur(44px) saturate(2.8) brightness(1.02)",
};
// Module-level alias for backwards-compat (PRIORITY, UNIT_STATUS etc.)
const C = C_DARK;

// Theme context — provides active palette to all components
const ThemeCtx = React.createContext(C_DARK);

// Mobile A palette derived from active theme
function makeA(C) {
  return {
    // ── Accent greens
    lime:       C._dark ? C.green : "#2A9768",
    limeFill:   C._dark ? C.green : "#9FE0BE",
    limeDim:    C.greenDim,
    limeMid:    C._dark ? "rgba(143,227,190,0.18)" : "rgba(255,255,255,0.82)",
    mint:       C._dark ? C.blue : "#2A9768",
    mintDim:    C.blueDim,
    amber:      C.yellow,
    amberDim:   C.yellowDim,
    red:        C.red,
    redDim:     C.redDim,
    // ── Liquid glass card surfaces
    // Light: very transparent + strong blur so background colors refract through
    card:       C._dark ? "rgba(22,24,28,0.62)" : "rgba(255,255,255,0.22)",
    cardHi:     C._dark ? "rgba(32,35,42,0.75)" : "rgba(255,255,255,0.42)",
    blur:       C.glass,
    // Multi-layer shadow: white border ring + soft ambient + inner highlight
    shadow:     C._dark
      ? "0 8px 32px rgba(0,0,0,0.44), 0 1px 0 rgba(255,255,255,0.06) inset"
      : "0 0 0 1px rgba(255,255,255,0.75), 0 12px 40px rgba(0,0,0,0.04), 0 2px 0 rgba(255,255,255,1) inset, 0 -1px 0 rgba(255,255,255,0.20) inset",
    shadowSm:   C._dark
      ? "0 4px 16px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset"
      : "0 0 0 1px rgba(255,255,255,0.70), 0 6px 20px rgba(0,0,0,0.03), 0 1.5px 0 rgba(255,255,255,1) inset",
    // ── Active pill / filter chip
    pillBg:             C._dark ? "rgba(143,227,190,0.18)" : "rgba(255,255,255,0.90)",
    pillBorder:         C._dark ? C.green                  : "rgba(255,255,255,0.80)",
    pillColor:          C._dark ? C.green                  : C.t1,
    pillShadow:         C._dark ? "none"                   : "0 4px 12px rgba(0,0,0,0.06)",
    // ── Inactive pill border — more visible than the generic card border
    pillBorderInactive: C._dark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.12)",
    t1: C.t1, t2: C.t2, t3: C.t3, r: 24,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// L2 — DOMAIN CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const PRIORITY = {
  P1: { id:"P1", label:"Unidad detenida",         short:"P1", color:C.p1, dim:C.p1dim, dot:C.p1dot, marginBonus:40 },
  P2: { id:"P2", label:"Operacion comprometida",  short:"P2", color:C.p2, dim:C.p2dim, dot:C.p2dot, marginBonus:20 },
  P3: { id:"P3", label:"Preventivo urgente",      short:"P3", color:C.p3, dim:C.p3dim, dot:C.p3dot, marginBonus:0  },
  P4: { id:"P4", label:"Solicitud normal",        short:"P4", color:C.p4, dim:C.p4dim, dot:C.p4dot, marginBonus:0  },
};

const OP_TYPES = [
  { id:"consumable", label:"Consumible",    short:"CONS",  baseMin:20, baseMax:35,  cap:80  },
  { id:"general",    label:"Ref. General",  short:"REF-G", baseMin:25, baseMax:40,  cap:100 },
  { id:"tech",       label:"Serv. Tecnico", short:"SERV",  baseMin:35, baseMax:60,  cap:120 },
  { id:"heavy",      label:"Ref. Pesada",   short:"REF-P", baseMin:35, baseMax:70,  cap:140 },
  { id:"logistics",  label:"Logistica",     short:"LOG",   baseMin:15, baseMax:30,  cap:60  },
  { id:"rescue",     label:"Rescate",       short:"RESC",  baseMin:60, baseMax:150, cap:220 },
];

const MODIFIERS = [
  { id:"urgency",  label:"Urgencia / ent. inmediata", pct:20 },
  { id:"offhours", label:"Fuera de horario",           pct:20 },
  { id:"rare",     label:"Pieza dificil / rara",       pct:25 },
  { id:"credit",   label:"Credito",                    pct:10 },
];

// Ticket pipeline — operational states
const TICKET_PIPELINE = [
  "recibido","validando","sourcing","cotizado","autorizado",
  "comprado","transito","entregado","facturado","cobrado","cerrado",
];
const TICKET_META = {
  recibido:   { label:"Recibido",        color:"rgba(74,106,138,0.18)",  dot:"#6B9EC8" },
  validando:  { label:"Validando",       color:"rgba(200,180,50,0.14)",  dot:"#C8C050" },
  sourcing:   { label:"Sourcing",        color:"rgba(74,112,192,0.18)",  dot:"#7AA0E0" },
  cotizado:   { label:"Cotizado",        color:"rgba(112,160,64,0.18)",  dot:"#8FC855" },
  autorizado: { label:"Autorizado",      color:"rgba(48,160,80,0.18)",   dot:"#50C878" },
  comprado:   { label:"Comprado",        color:"rgba(48,128,90,0.18)",   dot:"#50A888" },
  transito:   { label:"En Transito",     color:"rgba(112,160,48,0.18)",  dot:"#90C848" },
  entregado:  { label:"Entregado",       color:"rgba(48,192,128,0.18)",  dot:"#8FE3BE" },
  facturado:  { label:"Facturado",       color:"rgba(167,139,250,0.14)", dot:"#A78BFA" },
  cobrado:    { label:"Cobrado",         color:"rgba(48,192,48,0.18)",   dot:"#50D070" },
  cerrado:    { label:"Cerrado",         color:"rgba(126,132,142,0.14)", dot:"#8A9AA4" },
  cancelado:  { label:"Cancelado",       color:"rgba(255,122,122,0.14)", dot:"#FF7A7A" },
};
const TICKET_ALL = [...TICKET_PIPELINE, "cancelado"];

const TICKET_TRANSITIONS = {
  recibido:   ["validando","sourcing","cancelado"],
  validando:  ["sourcing","cotizado","cancelado"],
  sourcing:   ["cotizado","cancelado"],
  cotizado:   ["autorizado","cancelado"],
  autorizado: ["comprado","cancelado"],
  comprado:   ["transito","cancelado"],
  transito:   ["entregado","cancelado"],
  entregado:  ["facturado","cancelado"],
  facturado:  ["cobrado","cancelado"],
  cobrado:    ["cerrado"],
  cerrado:    [],
  cancelado:  [],
};

// ── FINANCIAL STATUS SETS — 4-layer architecture ─────────────────────────────
// Layer 1: OPERADO — trabajo ya ejecutado (genera utilidad operativa)
const OPERADO_SET   = new Set(["entregado","facturado","cobrado","cerrado"]);
// Layer 2: CASH — dinero ya recibido
const CASH_SET      = new Set(["cobrado","cerrado"]);
// Layer 3: CARTERA — entregado/facturado pero no cobrado
const CARTERA_SET   = new Set(["entregado","facturado"]);
// Layer 4: FORECAST — pipeline probable, NO contamina revenue
const FORECAST_SET  = new Set(["cotizado","autorizado"]);
// Operational pipeline (en proceso, aún no entregado)
const PIPELINE_SET  = new Set(["recibido","validando","sourcing","comprado","transito"]);
// Closed states
const CLOSED_SET    = new Set(["cerrado","cancelado","cobrado"]);
const PAID_SET      = new Set(["cobrado","cerrado"]);
// Legacy alias — kept for backward compat
const REVENUE_SET   = OPERADO_SET;

const FAMILIAS_DEF = [
  {key:"clutch",       label:"Clutch",       kw:["clutch","embrague"]},
  {key:"frenos",       label:"Frenos",       kw:["freno","balata","disco","caliper","pastilla"]},
  {key:"suspension",   label:"Suspensión",   kw:["suspens","amort","resorte","horquil","rotula","muñon"]},
  {key:"motor",        label:"Motor",        kw:["motor","piston","cigueñ","biela","junta","carter","valvula","culata"]},
  {key:"electrico",    label:"Eléctrico",    kw:["electr","sensor","alternador","arrancador","bujia","bobina","fusible","abs","ecu"]},
  {key:"hidraulico",   label:"Hidráulico",   kw:["hidraul","bomba","cilindro","manguer","direccion"]},
  {key:"iluminacion",  label:"Iluminación",  kw:["faro","luz","lampar","led","plafon"]},
  {key:"transmision",  label:"Transmisión",  kw:["transmis","caja","diferencial","cardan","flecha"]},
];
const classifyFamilia = titulo => {
  const t=(titulo||"").toLowerCase();
  for(const f of FAMILIAS_DEF) { if(f.kw.some(k=>t.includes(k))) return f.key; }
  return "otros";
};

const PROB = [
  { id:"high",   label:"Alta",  pct:90 },
  { id:"medium", label:"Media", pct:60 },
  { id:"low",    label:"Baja",  pct:30 },
];

// Unit operational status
const UNIT_STATUS = {
  operativa:  { label:"Operativa",  color:C.green, dot:"#30C060" },
  detenida:   { label:"Detenida",   color:C.red,   dot:"#C03030" },
  preventivo: { label:"Preventivo", color:C.yellow,dot:"#C09020" },
  taller:     { label:"En taller",  color:C.orange,dot:"#C07020" },
};

const STORAGE_KEY = "logisolve_v5";
const STORAGE_VER = 6;

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════
const SB_URL = "https://ecxqxspphoehmkvlmbtv.supabase.co";
const SB_KEY = "sb_publishable_xTPWFkPZaNN4jAeuFifVaw_yXvQvdfC";

async function sbFetch(path, opts={}) {
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
  } catch(e) { console.warn("sbFetch:",e); return null; }
}

// ── Supabase Storage — file attachments ───────────────────────────────────────
const SB_BUCKET = "logisolve-docs";

async function sbUploadFile(ticketId, file, category) {
  const ext = file.name.split('.').pop() || 'bin';
  const path = `${ticketId}/${category}_${Date.now()}.${ext}`;
  const res = await fetch(`${SB_URL}/storage/v1/object/${SB_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  });
  if (!res.ok) {
    let detail = String(res.status);
    try { const j = await res.json(); detail = j.message || j.error || detail; } catch(_) {}
    if (typeof detail === "string" && detail.includes("row-level security")) {
      throw new Error("Sin permiso para subir archivos. Ejecuta las políticas RLS en Supabase → Editor SQL.");
    }
    if (res.status === 404) {
      throw new Error(`El bucket "${SB_BUCKET}" no existe. Créalo en Supabase → Almacenamiento.`);
    }
    throw new Error(`Error al subir: ${detail}`);
  }
  return {
    id: path,
    name: file.name,
    type: file.type,
    size: file.size,
    category,
    uploadedAt: new Date().toISOString(),
    url: `${SB_URL}/storage/v1/object/public/${SB_BUCKET}/${path}`,
  };
}

async function sbDeleteFile(path) {
  try {
    await fetch(`${SB_URL}/storage/v1/object/${SB_BUCKET}`, {
      method: 'DELETE',
      headers: {
        'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}`, 'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prefixes: [path] }),
    });
  } catch(e) { console.warn('sbDeleteFile:', e); }
}

async function loadTable(table) {
  const PAGE = 1000;
  let all = [];
  let offset = 0;
  while (true) {
    const rows = await sbFetch(`/${table}?select=id,data&order=created_at.asc&limit=${PAGE}&offset=${offset}`);
    if (!Array.isArray(rows) || rows.length === 0) break;
    all = all.concat(rows);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }
  return all.length > 0 ? all.map(r => r.data) : null;
}

async function upsertRow(table, id, data) {
  await sbFetch(`/${table}`, {
    method:"POST",
    body: JSON.stringify({id, data}),
  });
}

async function deleteRow(table, id) {
  await sbFetch(`/${table}?id=eq.${encodeURIComponent(id)}`, { method:"DELETE" });
}

async function loadAllFromSupabase() {
  const [tickets,clients,suppliers,units,parts] = await Promise.all([
    loadTable("tickets"), loadTable("clients"), loadTable("suppliers"),
    loadTable("units"),   loadTable("parts"),
  ]);
  // CRITICAL: never fall back to seed data silently.
  // If Supabase returns null for a table, keep current state (handled upstream).
  if (!tickets && !clients && !suppliers && !units && !parts) return null;
  const result = {};
  if (Array.isArray(tickets))   result.tickets   = tickets;
  if (Array.isArray(clients))   result.clients   = clients;
  if (Array.isArray(suppliers)) result.suppliers = suppliers;
  if (Array.isArray(units))     result.units     = units;
  if (Array.isArray(parts))     result.parts     = parts;
  return result;
}

async function seedIfEmpty() {
  const existing = await loadTable("tickets");
  if (existing) return; // already has data
  await Promise.all([
    ...initialState.tickets.map(t=>upsertRow("tickets",t.id,t)),
    ...initialState.clients.map(c=>upsertRow("clients",c.id,c)),
    ...initialState.suppliers.map(s=>upsertRow("suppliers",s.id,s)),
    ...initialState.units.map(u=>upsertRow("units",u.id,u)),
    ...initialState.parts.map(p=>upsertRow("parts",p.id,p)),
  ]);
}


// ── HOOKS ────────────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [dVal, setDVal] = useState(value);
  useEffect(()=>{
    const t = setTimeout(()=>setDVal(value), delay);
    return ()=>clearTimeout(t);
  },[value, delay]);
  return dVal;
}

// ── SAFE HELPERS ─────────────────────────────────────────────────────────────
const safeNumber = (v, fallback=0) => {
  const n = typeof v==="string" ? parseFloat(v.replace(/,/g,"")) : Number(v);
  return (isFinite(n) && !isNaN(n)) ? n : fallback;
};
const safeStr = (v) => (v==null ? "" : String(v));
const safeLower = (v) => safeStr(v).toLowerCase();
const safeArr = (v) => (Array.isArray(v) ? v : []);
const genId = (prefix) => {
  const uuid = (typeof crypto!=="undefined"&&crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g,"").slice(0,8).toUpperCase()
    : Date.now().toString(36).toUpperCase()+Math.random().toString(36).slice(2,6).toUpperCase();
  return `${prefix}-${uuid}`;
};

// ── OPERATIONAL LOG — lightweight in-memory ring buffer ──────────────────────
const opLog = (() => {
  const buf = [];
  return {
    push: (type, data={}) => {
      buf.push({type, data, ts: Date.now()});
      if (buf.length > 200) buf.shift();
      if (process.env.NODE_ENV !== "production") console.debug("[opLog]", type, data);
    },
    all: () => [...buf],
  };
})();

// ── PENDING QUEUE — offline sync deferred operations ─────────────────────────
const pendingQueue = (() => {
  let q = [];
  return {
    push:  (item) => { q.push(item); },
    peek:  ()     => [...q],
    flush: ()     => { const out=[...q]; q=[]; return out; },
    clear: ()     => { q=[]; },
  };
})();

// ═══════════════════════════════════════════════════════════════════════════════
function computeSnap(p) {
  const { costo=0, gasolina=0, otros=0, iva=16, isr=20,
          compraConIVA=true, ventaConIVA=true, mode="auto", margin=0, manualPrice=0 } = p;
  const ivaR = safeNumber(iva,16)/100, isrR = safeNumber(isr,20)/100;
  const c0 = safeNumber(costo), g0 = safeNumber(gasolina), o0 = safeNumber(otros);
  const costoBase  = compraConIVA ? c0/(1+ivaR) : c0;
  const ivaAcred   = compraConIVA ? c0-costoBase : costoBase*ivaR;
  const gastos     = g0+o0;
  const costoTotal = costoBase+gastos;
  let precioSinIVA;
  if (mode==="manual") {
    const raw = safeNumber(manualPrice);
    precioSinIVA = ventaConIVA ? raw/(1+ivaR) : raw;
  } else {
    precioSinIVA = costoTotal*(1+safeNumber(margin)/100);
  }
  // Always calculate markup from real values — never copy margin input
  const markupSobre      = costoTotal>0 ? ((precioSinIVA-costoTotal)/costoTotal)*100 : 0;
  const ivaTraslad       = precioSinIVA*ivaR;
  const precioConIVA     = ventaConIVA ? precioSinIVA+ivaTraslad : precioSinIVA;
  const ivaNeto          = ivaTraslad-ivaAcred;
  const uBruta           = precioSinIVA-costoTotal;
  const isrAmt           = Math.max(uBruta*isrR,0);
  const uNeta            = uBruta-isrAmt;
  const margenNetoPrecio = precioSinIVA>0 ? (uNeta/precioSinIVA)*100 : 0;
  // Fiscal metrics
  const cargaFiscal      = ivaNeto+isrAmt;
  const eficienciaFiscal = uBruta>0 ? (uNeta/uBruta)*100 : 0;
  const costoFiscalPct   = precioSinIVA>0 ? (cargaFiscal/precioSinIVA)*100 : 0;
  // Operative alerts
  const alertas = [];
  if (margenNetoPrecio>0 && margenNetoPrecio<15)  alertas.push("margen_critico");
  if (ivaNeto>uNeta)                               alertas.push("carga_fiscal_alta");
  if (markupSobre>0 && markupSobre<25)             alertas.push("markup_bajo");
  return {
    costoBase,ivaAcred,gastos,costoTotal,
    precioSinIVA,ivaTraslad,precioConIVA,
    ivaNeto,uBruta,isr:isrAmt,uNeta,
    markupSobre,margenNetoPrecio,
    cargaFiscal,eficienciaFiscal,costoFiscalPct,
    alertas,
    params:{iva,isr}
  };
}

function effectiveMargin(opId, priority, mods, custom, customVal) {
  const op  = OP_TYPES.find(o=>o.id===opId)||OP_TYPES[0];
  const pr  = PRIORITY[priority]||PRIORITY.P3;
  const base = Math.round((op.baseMin+op.baseMax)/2) + pr.marginBonus;
  if (custom) return Math.min(customVal, op.cap);
  const modSum = mods.reduce((s,id)=>{ const m=MODIFIERS.find(m=>m.id===id); return s+(m?m.pct:0); },0);
  return Math.min(base+modSum, op.cap);
}

// ── MIGRACIÓN DE LÍNEAS — compatibilidad total con tickets viejos ─────────────
function migrateLinea(l, fallbackSnap, ivaR=0.16) {
  if (!l) return null;
  return {
    titulo:       safeStr(l.titulo) || safeStr(l.title) || "Sin descripción",
    partRef:      safeStr(l.partRef),
    qty:          safeNumber(l.qty, 1) || 1,
    costoUnit:    safeNumber(l.costoUnit, (l.snap?.costoBase||0)*(1+ivaR)),
    gasolina:     safeNumber(l.gasolina, l.snap?.gastos||0),
    otros:        safeNumber(l.otros, 0),
    mode:         l.mode || "manual",
    manualPrice:  safeStr(l.manualPrice || (l.snap?.precioConIVA||0).toFixed(2)),
    customMgn:    !!l.customMgn,
    customVal:    safeNumber(l.customVal, 27),
    descripcionPDF: safeStr(l.descripcionPDF),
    snap:         l.snap || fallbackSnap,
  };
}

// ── HELPER CENTRALIZADO DE TOTALES ───────────────────────────────────────────
// ── FINANCIAL HELPERS — always above calculateTicketTotals ────────────────────
const calcMarkup = (precioSinIVA, costoTotal) =>
  safeNumber(costoTotal) > 0
    ? ((safeNumber(precioSinIVA) - safeNumber(costoTotal)) / safeNumber(costoTotal)) * 100
    : 0;

// Resolves unit price vs line total unambiguously — prevents double multiplication.
// After Fase 2, lines have explicit unitPrice/lineTotal.
// Legacy lines only have snap.precioConIVA which is always unit price (qty was 1).
function resolveLineFinancials(ml, fallbackSnap, qty) {
  const lsnap = ml.snap || fallbackSnap || {};
  const q = Math.max(safeNumber(qty, 1), 1);
  // Prefer explicit fields (post-Fase2 saves)
  const unitPrice = safeNumber(
    ml.unitPrice ?? lsnap.unitPrice ?? lsnap.precioUnitario ?? lsnap.precioConIVA
  );
  const unitSinIVA = safeNumber(
    ml.unitSinIVA ?? lsnap.unitSinIVA ?? lsnap.precioSinIVA
  );
  // If explicit lineTotal exists, use it — don't multiply again
  const lineTotal        = ml.lineTotal != null ? safeNumber(ml.lineTotal) : unitPrice * q;
  const lineTotalSinIVA  = ml.lineTotalSinIVA != null ? safeNumber(ml.lineTotalSinIVA) : unitSinIVA * q;
  return { unitPrice, lineTotal, unitSinIVA, lineTotalSinIVA, qty: q };
}

function calculateTicketTotals(ticket) {
  if (!ticket) return null;
  const snap   = ticket.snap || {};
  const lineas = safeArr(ticket.lineas);
  const iva    = safeNumber(snap.params?.iva, 16);
  const isr    = safeNumber(snap.params?.isr, 20);

  if (lineas.length === 0) {
    // Legacy ticket — snap is the source of truth
    return {
      lineas: [],
      subtotal:    safeNumber(snap.precioSinIVA),
      ivaAmt:      safeNumber(snap.ivaTraslad),
      total:       safeNumber(snap.precioConIVA),
      costoTotal:  safeNumber(snap.costoTotal),
      uNeta:       safeNumber(snap.uNeta),
      uBruta:      safeNumber(snap.uBruta),
      isrAmt:      safeNumber(snap.isr),
      ivaNeto:     safeNumber(snap.ivaNeto),
      markupSobre: calcMarkup(snap.precioSinIVA, snap.costoTotal),
      margenNeto:  safeNumber(snap.margenNetoPrecio),
      ivaPct: iva, isrPct: isr,
    };
  }

  const ivaR = iva / 100;
  let subtotal=0, ivaAmt=0, total=0, costoTotal=0, uNeta=0, uBruta=0, isrAmt=0, ivaNeto=0;

  const lineasCalc = lineas.map(l => {
    const ml  = migrateLinea(l, snap, ivaR);
    const qty = safeNumber(ml.qty, 1) || 1;
    const lsnap = ml.snap || snap || {};

    // Defensive validation (qty is always ≥1 via safeNumber guard above)

    const fin = resolveLineFinancials(ml, snap, qty);

    const lineIVA    = safeNumber(lsnap.ivaTraslad) * qty;
    const lineCosto  = safeNumber(lsnap.costoTotal) * qty;
    const lineUNeta  = safeNumber(lsnap.uNeta) * qty;
    const lineUBruta = safeNumber(lsnap.uBruta) * qty;
    const lineISR    = safeNumber(lsnap.isr) * qty;
    const lineIVANeto= safeNumber(lsnap.ivaNeto) * qty;

    subtotal   += fin.lineTotalSinIVA;
    ivaAmt     += lineIVA;
    total      += fin.lineTotal;
    costoTotal += lineCosto;
    uNeta      += lineUNeta;
    uBruta     += lineUBruta;
    isrAmt     += lineISR;
    ivaNeto    += lineIVANeto;

    return {
      ...ml,
      unitPrice: fin.unitPrice, lineTotal: fin.lineTotal,
      unitSinIVA: fin.unitSinIVA, lineTotalSinIVA: fin.lineTotalSinIVA,
      lineIVA, lineCosto, lineUNeta,
    };
  });

  const markupSobre = costoTotal > 0 ? ((subtotal - costoTotal) / costoTotal) * 100 : 0;
  const margenNeto  = subtotal > 0 ? (uNeta / subtotal) * 100 : 0;

  // Guard: if lineas are stale (ticket was manually edited in Historial after creation),
  // snap.precioConIVA is the authoritative total — fall back to legacy single-snap path.
  const snapTotal = safeNumber(snap.precioConIVA);
  if (snapTotal > 0) {
    const diff = Math.abs(total - snapTotal);
    if (diff > 0.5) {
      return {
        lineas: [],
        subtotal:    safeNumber(snap.precioSinIVA),
        ivaAmt:      safeNumber(snap.ivaTraslad),
        total:       snapTotal,
        costoTotal:  safeNumber(snap.costoTotal),
        uNeta:       safeNumber(snap.uNeta),
        uBruta:      safeNumber(snap.uBruta),
        isrAmt:      safeNumber(snap.isr),
        ivaNeto:     safeNumber(snap.ivaNeto),
        markupSobre: calcMarkup(snap.precioSinIVA, snap.costoTotal),
        margenNeto:  safeNumber(snap.margenNetoPrecio),
        ivaPct: iva, isrPct: isr,
      };
    }
  }

  return {
    lineas: lineasCalc,
    subtotal, ivaAmt, total,
    costoTotal, uNeta, uBruta, isrAmt, ivaNeto,
    markupSobre, margenNeto, ivaPct: iva, isrPct: isr,
  };
}

function utilidadPonderada(uNeta, probId) {
  const p = PROB.find(x=>x.id===probId)||PROB[0];
  return uNeta*(p.pct/100);
}

// ═══════════════════════════════════════════════════════════════════════════════
// L3.5 — SHARED SELECTORS (single source of truth for derived ticket data)
// All components MUST use these instead of inline filter logic.
// Changing a business rule here updates all views simultaneously.
// ═══════════════════════════════════════════════════════════════════════════════

// Active non-deleted tickets
const sel_active     = (ts) => ts.filter(t=>!t._deleted);

// Operado: work already done (entregado/facturado/cobrado/cerrado)
const sel_operados   = (ts) => sel_active(ts).filter(t=>OPERADO_SET.has(t.status));

// Cash: money actually received
const sel_cobrados   = (ts) => sel_active(ts).filter(t=>CASH_SET.has(t.status));

// Cartera: delivered/invoiced but not yet paid — business rule lives here
const sel_cartera    = (ts) => sel_active(ts).filter(t=>CARTERA_SET.has(t.status));

// Vencidos: cartera past the promesa de pago date
const sel_vencidos   = (ts) => sel_cartera(ts).filter(t=>{
  if(!t.promesaPago) return false;
  const d=parseDateMX(t.promesaPago); return d&&new Date()>d;
});

// Forecast: probable but not yet done (cotizado/autorizado)
const sel_forecast   = (ts) => sel_active(ts).filter(t=>FORECAST_SET.has(t.status));

// Open pipeline (not closed, not cancelled)
const sel_open       = (ts) => sel_active(ts).filter(t=>!CLOSED_SET.has(t.status));

// Sum a snap field over a ticket array
const sumSnap        = (ts, key) => ts.reduce((s,t)=>s+safeNumber(t.snap?.[key]),0);

// Period filter — from parseDateMX of t.date
const sel_inRange    = (ts, from, to) => ts.filter(t=>{
  const d=parseDateMX(t.date); return d&&d>=from&&d<=to;
});

// Build period range object
const buildRange = (period) => {
  const now=new Date(); const from=new Date(now);
  if     (period==="today") from.setHours(0,0,0,0);
  else if(period==="week")  from.setDate(now.getDate()-7);
  else if(period==="month") from.setDate(now.getDate()-30);
  else if(period==="3m")    from.setDate(now.getDate()-90);
  else                      from.setFullYear(2000); // "all"
  return {from,to:now};
};
const mxn   = n => new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:2}).format(n||0);
const fpct  = n => ((n||0).toFixed(1))+"%";
const clamp = (v,mn,mx) => Math.min(Math.max(v,mn),mx);
const todayMX = () => new Date().toLocaleDateString("es-MX",{day:"2-digit",month:"2-digit",year:"numeric"});
const nowISO  = () => new Date().toISOString();
const fmtTS   = ts => { try { return new Date(ts).toLocaleString("es-MX",{hour12:false,day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}); } catch { return ts; } };
const margenColor = v => v>=20?C.green:v>=10?C.yellow:C.red;

function parseDateMX(s) {
  if (!s) return null;
  const p = s.split("/");
  if (p.length!==3) return null;
  const dt = new Date(`${p[2]}-${p[1]}-${p[0]}`);
  return isNaN(dt.getTime())?null:dt;
}
function daysFromNow(s) {
  const d=parseDateMX(s); if(!d) return null;
  return Math.round((Date.now()-d.getTime())/(1000*60*60*24));
}
function canTransition(from,to) { return (TICKET_TRANSITIONS[from]||[]).includes(to); }
function mkEvent(type,detail={}) { return {type,ts:nowISO(),...detail}; }

// Folio for PDFs: COT-YYYYMMDD-XXXX (works for both LS-XXXX and TKT-YYYYMMDD-NNN ids)
function mkFolio(tkt, prefix="COT") {
  const p=(tkt.date||"").split("/"); // DD/MM/YYYY
  const dateStr=p.length===3?`${p[2]}${p[1]}${p[0]}`:"000000";
  const m=/^(?:LS|OP)-(\d+)$/.exec(tkt.id);
  if(m) return `${prefix}-${dateStr}-${m[1]}`;
  return tkt.id.replace(/^(TKT|LS|OP)-/,`${prefix}-`);
}

let _seq = (() => {
  try { const n = parseInt(localStorage.getItem("logisolve_seq")||"0",10); return isNaN(n)?0:n; } catch { return 0; }
})();
function mkTicketId() {
  _seq++;
  try { localStorage.setItem("logisolve_seq", String(_seq)); } catch {}
  return `OP-${String(_seq).padStart(4,"0")}`;
}
function mkUnitId() { return genId("UNI"); }
function mkPartId() { return `PRT-${Date.now().toString().slice(-5)}`; }

// ═══════════════════════════════════════════════════════════════════════════════
// L5 — SEED DATA
// ═══════════════════════════════════════════════════════════════════════════════
const S1 = { costoBase:2344.83,ivaAcred:375.17,gastos:230,costoTotal:2574.83,precioSinIVA:4568.97,ivaTraslad:731.03,precioConIVA:5300,ivaNeto:355.86,uBruta:1994.14,isr:398.83,uNeta:1595.31,markupSobre:77.45,margenNetoPrecio:34.92,params:{iva:16,isr:20}};
const S2 = { costoBase:2181.03,ivaAcred:348.97,gastos:230,costoTotal:2411.03,precioSinIVA:4396.55,ivaTraslad:703.45,precioConIVA:5100,ivaNeto:354.48,uBruta:1985.52,isr:397.10,uNeta:1588.41,markupSobre:82.35,margenNetoPrecio:36.13,params:{iva:16,isr:20}};
const S3 = { costoBase:612.93,ivaAcred:98.07,gastos:230,costoTotal:842.93,precioSinIVA:1853.45,ivaTraslad:296.55,precioConIVA:2150,ivaNeto:198.48,uBruta:1010.52,isr:202.10,uNeta:808.41,markupSobre:119.88,margenNetoPrecio:43.62,params:{iva:16,isr:20}};
const S4 = { costoBase:129.31,ivaAcred:20.69,gastos:230,costoTotal:359.31,precioSinIVA:560.34,ivaTraslad:89.66,precioConIVA:650,ivaNeto:68.97,uBruta:201.03,isr:40.21,uNeta:160.83,markupSobre:55.95,margenNetoPrecio:28.70,params:{iva:16,isr:20}};
const S5 = { costoBase:2941.38,ivaAcred:470.62,gastos:230,costoTotal:3171.38,precioSinIVA:6017.24,ivaTraslad:962.76,precioConIVA:6980,ivaNeto:492.14,uBruta:2845.86,isr:569.17,uNeta:2276.69,markupSobre:89.74,margenNetoPrecio:37.84,params:{iva:16,isr:20}};
const S6 = { costoBase:5948.28,ivaAcred:951.72,gastos:230,costoTotal:6178.28,precioSinIVA:8526.02,ivaTraslad:1364.16,precioConIVA:9890.18,ivaNeto:412.44,uBruta:2347.74,isr:469.55,uNeta:1878.19,markupSobre:38.00,margenNetoPrecio:22.03,params:{iva:16,isr:20}};
const S7 = { costoBase:1724.14,ivaAcred:275.86,gastos:230,costoTotal:1954.14,precioSinIVA:3514.66,ivaTraslad:562.34,precioConIVA:4077,ivaNeto:286.48,uBruta:1560.52,isr:312.10,uNeta:1248.41,markupSobre:79.86,margenNetoPrecio:35.52,params:{iva:16,isr:20}};

const mk = (e,to)=>[mkEvent("created"),mkEvent("status_changed",{to})];

const SEED_TICKETS = [
  {id:"TKT-20260512-001",titulo:"Horquilla clutch Freightliner M2 106",opId:"rescue",opShort:"RESC",priority:"P1",clientId:"CLI-00001",supplierId:"PRV-00001",unitId:"UNI-00001",partRef:"",date:"12/05/2026",status:"entregado",payType:"credit",promesaPago:"26/05/2026",cobrado:false,mods:["urgency","offhours"],prob:"high",horasOp:3,notes:"Unidad varada en carretera Cuautitlan-Huehuetoca",snap:S1,timeline:[{ts:"2026-05-12T08:02:00Z",evento:"Solicitud recibida",actor:"Logis Express"},{ts:"2026-05-12T08:15:00Z",evento:"VIN validado — Freightliner M2 106",actor:"Sistema"},{ts:"2026-05-12T08:41:00Z",evento:"Proveedor localizado — El Cerrito",actor:"Operador"},{ts:"2026-05-12T09:10:00Z",evento:"Pago confirmado",actor:"Logis Express"},{ts:"2026-05-12T10:30:00Z",evento:"En ruta al punto de entrega",actor:"El Cerrito"},{ts:"2026-05-12T11:55:00Z",evento:"Entregado. Unidad recuperada.",actor:"Operador"}],history:mk("created","entregado")},
  {id:"TKT-20260513-001",titulo:"Kit Primer Sayer automotriz",opId:"consumable",opShort:"CONS",priority:"P3",clientId:"CLI-00001",supplierId:"",unitId:"",partRef:"",date:"13/05/2026",status:"entregado",payType:"credit",promesaPago:"27/05/2026",cobrado:false,mods:[],prob:"high",horasOp:1,notes:"",snap:S2,timeline:[{ts:"2026-05-13T09:00:00Z",evento:"Solicitud recibida",actor:"Logis Express"},{ts:"2026-05-13T10:20:00Z",evento:"Entregado",actor:"Operador"}],history:mk("created","entregado")},
  {id:"TKT-20260513-002",titulo:"3 baleros 6206 ZZ C3 / Reten dif. Ford F350 2012",opId:"consumable",opShort:"CONS",priority:"P2",clientId:"CLI-00001",supplierId:"PRV-00002",unitId:"UNI-00003",partRef:"6206ZZC3",date:"13/05/2026",status:"entregado",payType:"credit",promesaPago:"27/05/2026",cobrado:false,mods:["rare"],prob:"high",horasOp:2,notes:"Pieza escasa en plaza — se consiguio con Autopartes Casillas Tepotzotlan",snap:S3,timeline:[{ts:"2026-05-13T10:00:00Z",evento:"Solicitud recibida",actor:"Logis Express"},{ts:"2026-05-13T10:45:00Z",evento:"Pieza localizada — Autopartes Casillas",actor:"Operador"},{ts:"2026-05-13T13:00:00Z",evento:"Entregado",actor:"Operador"}],history:mk("created","entregado")},
  {id:"TKT-20260513-003",titulo:"Empaque / junta de candelero Eaton",opId:"consumable",opShort:"CONS",priority:"P3",clientId:"CLI-00001",supplierId:"PRV-00001",unitId:"",partRef:"",date:"13/05/2026",status:"entregado",payType:"credit",promesaPago:"27/05/2026",cobrado:false,mods:[],prob:"high",horasOp:1,notes:"",snap:S4,timeline:[{ts:"2026-05-13T11:00:00Z",evento:"Solicitud recibida",actor:"Logis Express"},{ts:"2026-05-13T12:30:00Z",evento:"Entregado",actor:"Operador"}],history:mk("created","entregado")},
  {id:"TKT-20260514-001",titulo:"Horquilla clutch Freightliner M2 106 (2a op.)",opId:"heavy",opShort:"REF-P",priority:"P1",clientId:"CLI-00001",supplierId:"PRV-00001",unitId:"UNI-00001",partRef:"",date:"14/05/2026",status:"entregado",payType:"credit",promesaPago:"29/05/2026",cobrado:false,mods:["urgency"],prob:"high",horasOp:2.5,notes:"Segunda unidad de flota con falla identica",snap:S5,timeline:[{ts:"2026-05-14T07:30:00Z",evento:"Solicitud recibida",actor:"Logis Express"},{ts:"2026-05-14T07:45:00Z",evento:"Diagnostico confirmado — misma pieza",actor:"Operador"},{ts:"2026-05-14T08:00:00Z",evento:"Proveedor contactado — stock disponible",actor:"Operador"},{ts:"2026-05-14T09:30:00Z",evento:"Entregado",actor:"Operador"}],history:mk("created","entregado")},
  {id:"TKT-20260514-002",titulo:"Juego de faros delanteros Ford F350 2014",opId:"general",opShort:"REF-G",priority:"P3",clientId:"CLI-00001",supplierId:"PRV-00002",unitId:"UNI-00002",partRef:"",date:"14/05/2026",status:"entregado",payType:"credit",promesaPago:"30/05/2026",cobrado:false,mods:[],prob:"high",horasOp:1.5,notes:"Surtido por Autopartes Casillas Tepotzotlan",snap:S6,timeline:[{ts:"2026-05-14T10:00:00Z",evento:"Solicitud recibida",actor:"Logis Express"},{ts:"2026-05-14T10:30:00Z",evento:"Autopartes Casillas — stock confirmado",actor:"Operador"},{ts:"2026-05-14T12:00:00Z",evento:"Entregado",actor:"Operador"}],history:mk("created","entregado")},
  {id:"TKT-20260514-003",titulo:"Multiple de escape Ford F350 Super Duty",opId:"general",opShort:"REF-G",priority:"P2",clientId:"CLI-00001",supplierId:"",unitId:"UNI-00004",partRef:"",date:"14/05/2026",status:"entregado",payType:"credit",promesaPago:"30/05/2026",cobrado:false,mods:["offhours"],prob:"high",horasOp:2,notes:"Solicitud recibida fuera de horario",snap:S7,timeline:[{ts:"2026-05-14T19:30:00Z",evento:"Solicitud recibida (fuera de horario)",actor:"Logis Express"},{ts:"2026-05-14T20:15:00Z",evento:"Proveedor nocturno localizado",actor:"Operador"},{ts:"2026-05-14T22:00:00Z",evento:"Entregado",actor:"Operador"}],history:mk("created","entregado")},
];

const SEED_CLIENTS = [{
  id:"CLI-00001", empresa:"Logis Express", contacto:"", tel:"", correo:"", rfc:"",
  direccion:"Manzana 006", ciudad:"Cuautitlán Izcalli", estado:"Estado de México",
  creditDays:15, category:"A", score:80,
  unidades:["UNI-00001","UNI-00002","UNI-00003","UNI-00004"],
}];

const SEED_SUPPLIERS = [
  {
    id:"PRV-00001", nombre:"Refaccionaria Diesel El Cerrito", categoria:"heavy",
    especialidad:"Refacciones diesel, clutch, motor, transmision",
    entregaDias:1, confiabilidad:90, contacto:"56 20 35 00 60",
    correo:"refaccionaria.diesel@homail.com", horario:"Lun-Sab 07:00-20:00",
    cobertura:"CDMX, Edomex", scoreOp:88, incidencias:0,
  },
  {
    id:"PRV-00002", nombre:"Autopartes Casillas", categoria:"general",
    especialidad:"Autopartes multimarca — Ford, VW, Chevrolet, Hyundai, Nissan, Audi, Toyota, Mercedes, Honda",
    entregaDias:1, confiabilidad:87, contacto:"55 4327 4660 / 55 5876 9400 / 55 5876 3539",
    correo:"", horario:"",
    cobertura:"Tepotzotlan, Edomex — Arcos del Sitio",
    scoreOp:82, incidencias:0,
  },
];

const SEED_UNITS = [
  {id:"UNI-00001",vin:"3AKJHHDR9JSJU1234",marca:"Freightliner",modelo:"M2 106",anio:2019,motor:"Detroit DD5",transmision:"Allison 2100",config:"6x2",clientId:"CLI-00001",statusOp:"operativa",km:284000,notas:"Historial de falla en clutch — revisar en 50k km",placa:"",economico:""},
  {id:"UNI-00002",vin:"1FDWF36P14EB12345",marca:"Ford",modelo:"F-350 Super Duty",anio:2014,motor:"6.7L Power Stroke V8",transmision:"TorqShift 6A",config:"4x2",clientId:"CLI-00001",statusOp:"operativa",km:198000,notas:"",placa:"",economico:""},
  {id:"UNI-00003",vin:"1FDWF36P04EB67890",marca:"Ford",modelo:"F-350 Super Duty",anio:2012,motor:"6.7L Power Stroke V8",transmision:"TorqShift 6A",config:"4x2",clientId:"CLI-00001",statusOp:"preventivo",km:312000,notas:"Diferencial con desgaste — programar revision",placa:"",economico:""},
  {id:"UNI-00004",vin:"1FDWF36P09EB55555",marca:"Ford",modelo:"F-350 Super Duty",anio:2016,motor:"6.7L Power Stroke V8",transmision:"TorqShift 6A",config:"4x2",clientId:"CLI-00001",statusOp:"operativa",km:156000,notas:"",placa:"",economico:""},
];

const SEED_PARTS = [
  {id:"PRT-00001",nombre:"Horquilla de clutch",oem:"A0002500370",aftermarket:"FTE MHK0504",aplicacion:"Freightliner M2 106 / DD5 / Detroit",notas:"Revisar compatibilidad con transmision Allison",proveedor:"Refaccionaria Diesel El Cerrito",ultimoPrecio:2720,ultimaFecha:"12/05/2026"},
  {id:"PRT-00002",nombre:"Balero 6206 ZZ C3",oem:"6206ZZC3",aftermarket:"SKF 6206-2Z/C3",aplicacion:"Ford F-350 / diferencial trasero",notas:"Usar siempre C3 (holgura mayor para alta temperatura)",proveedor:"",ultimoPrecio:711,ultimaFecha:"13/05/2026"},
  {id:"PRT-00003",nombre:"Reten de diferencial",oem:"F81Z-4676-AA",aftermarket:"National 710561",aplicacion:"Ford F-350 Super Duty 2012 / trasero",notas:"",proveedor:"",ultimoPrecio:0,ultimaFecha:""},
  {id:"PRT-00004",nombre:"Empaque candelero Eaton",oem:"S-14753",aftermarket:"",aplicacion:"Eaton Fuller / transmisiones 10 velocidades",notas:"Solo original — no hay aftermarket confiable",proveedor:"Refaccionaria Diesel El Cerrito",ultimoPrecio:150,ultimaFecha:"13/05/2026"},
];

const initialState = {
  tickets:   SEED_TICKETS,
  clients:   SEED_CLIENTS,
  suppliers: SEED_SUPPLIERS,
  units:     SEED_UNITS,
  parts:     SEED_PARTS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// L6 — STORE
// ═══════════════════════════════════════════════════════════════════════════════
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p.version===STORAGE_VER ? p.data : null;
  } catch { return null; }
}
function saveToStorage(s) {
  const payload = {version:STORAGE_VER,savedAt:nowISO(),data:{tickets:s.tickets,clients:s.clients,suppliers:s.suppliers,units:s.units,parts:s.parts}};
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(payload)); }
  catch(e) {
    // Quota exceeded (flota grande) — guardar sin unidades; Supabase es la fuente primaria
    try {
      const slim = {...payload, data:{...payload.data, units:[]}};
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch { console.warn("storage:",e); }
  }
}

function reducer(state,action) {
  switch(action.type) {
    // TICKETS
    case "TKT_ADD":    return {...state,tickets:[action.t,...state.tickets]};
    case "TKT_UPDATE": {
      const patch = {...action.patch};
      // Sync cobrado when status changes via edit
      // "cobrado" status → cobrado=true
      // "cerrado" → keep existing value (cerrado = archived, not necessarily paid)
      // any other status → cobrado=false
      if (patch.status !== undefined) {
        if (patch.status === "cobrado") patch.cobrado = true;
        else if (patch.status !== "cerrado") patch.cobrado = false;
        // cerrado: leave cobrado as-is (don't override)
      }
      return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,...patch,history:[...(t.history||[]),mkEvent("edited",{fields:Object.keys(action.patch)})]})};
    }    case "TKT_STATUS": {
      const {id,to}=action;
      return {...state,tickets:state.tickets.map(t=>{
        if(t.id!==id) return t;
        if(!canTransition(t.status,to)) return t;
        const tlEvent = {ts:nowISO(),evento:"Estado: "+TICKET_META[to].label,actor:"Operador"};
        const extra = to==="cancelado" && action.cancelReason ? {cancelReason:action.cancelReason} : {};
        return {...t,...extra,status:to,cobrado:PAID_SET.has(to),timeline:[...(t.timeline||[]),tlEvent],history:[...(t.history||[]),mkEvent("status_changed",{from:t.status,to})]};
      })};
    }
    case "TKT_DELETE":   return {...state,tickets:state.tickets.filter(t=>t.id!==action.id)};
    case "TKT_SOFT_DEL": return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,_deleted:true,_deletedAt:nowISO()})};
    case "TKT_RESTORE":  return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,_deleted:false,_deletedAt:null})};
    case "TKT_COBRADO": return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,cobrado:true,status:"cobrado",timeline:[...(t.timeline||[]),{ts:nowISO(),evento:"Cobrado",actor:"Operador"}],history:[...(t.history||[]),mkEvent("cobrado")]})};
    case "TKT_TIMELINE": return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,timeline:[...(t.timeline||[]),{ts:nowISO(),evento:action.evento,actor:action.actor||"Operador"}]})};
    case "TKT_BULK_RENAME": { // action.map: [{oldId,newId}]
      const idMap=new Map(action.map.map(({oldId,newId})=>[oldId,newId]));
      return {...state,tickets:state.tickets.map(t=>idMap.has(t.id)?{...t,id:idMap.get(t.id)}:t)};
    }
    case "CLI_ADD":    return {...state,clients:[...state.clients,action.c]};
    case "CLI_UPDATE": return {...state,clients:state.clients.map(c=>c.id===action.id?{...c,...action.patch}:c)};
    case "CLI_DELETE": return {...state,clients:state.clients.filter(c=>c.id!==action.id)};
    // SUPPLIERS
    case "SUP_ADD":    return {...state,suppliers:[...state.suppliers,action.s]};
    case "SUP_UPDATE": return {...state,suppliers:state.suppliers.map(s=>s.id===action.id?{...s,...action.patch}:s)};
    case "SUP_DELETE": return {...state,suppliers:state.suppliers.filter(s=>s.id!==action.id)};
    // UNITS
    case "UNIT_ADD":      return {...state,units:[...state.units,action.u]};
    case "UNIT_UPDATE":   return {...state,units:state.units.map(u=>u.id===action.id?{...u,...action.patch}:u)};
    case "UNIT_DELETE":   return {...state,units:state.units.filter(u=>u.id!==action.id)};
    case "UNITS_CLEAR":   return {...state, units: []};
    case "UNITS_REPLACE": {
      // Deduplicate by id first, then vin, then economico to prevent ghost units
      const incoming = safeArr(action.units);
      const seen = new Set();
      const deduped = incoming.filter(u => {
        const key = u.id || u.vin || u.economico;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return {...state, units: deduped};
    }
    // PARTS
    case "PART_ADD":    return {...state,parts:[...state.parts,action.p]};
    case "PART_UPDATE": return {...state,parts:state.parts.map(p=>p.id===action.id?{...p,...action.patch}:p)};
    case "PART_DELETE": return {...state,parts:state.parts.filter(p=>p.id!==action.id)};
    // PERSISTENCE
    case "IMPORT": {
      const d = action.data;
      // Only replace a table if the incoming data is a real non-empty array.
      // Never overwrite production data with empty or null from a partial Supabase failure.
      const merge = (incoming, current) =>
        Array.isArray(incoming) && incoming.length > 0 ? incoming : current;
      return {
        tickets:   merge(d.tickets,   state.tickets),
        clients:   merge(d.clients,   state.clients),
        suppliers: merge(d.suppliers, state.suppliers),
        units:     merge(d.units,     state.units),
        parts:     merge(d.parts,     state.parts),
      };
    }
    case "RESET": return {...initialState};
    case "NOOP":  return state; // trigger effects without mutation
    default: return state;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// L7 — TOAST HOOK
// ═══════════════════════════════════════════════════════════════════════════════
function useToasts() {
  const [toasts,setToasts] = useState([]);
  const push = useCallback((msg,type="info")=>{
    const id = genId("T");
    setToasts(p=>[...p,{id,msg,type}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),3000);
  },[]);
  return {toasts,push};
}

// ── buildCotizacionHTML — genera HTML del documento (usado en preview y download) ─
function buildCotizacionHTML(tkt, cl, un, supp) {
  const totals = calculateTicketTotals(tkt);
  const folio  = mkFolio(tkt,"COT");
  const fechaLarga=(()=>{
    const p=tkt.date.split("/"); if(p.length!==3) return tkt.date;
    const m=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    return `${parseInt(p[0])} de ${m[parseInt(p[1])-1]} de ${p[2]}`;
  })();
  const formaPago = tkt.payType==="credit"
    ? "Crédito"+(tkt.promesaPago?` — Fecha límite: ${tkt.promesaPago}`:"")
    : "Contado / Transferencia bancaria";
  const entrega = supp&&supp.entregaDias
    ? `${supp.entregaDias} día${supp.entregaDias>1?"s":""} hábiles`
    : "24-48 hrs hábiles";
  const unidadStr = un
    ? `${un.economico?"Eco. "+un.economico+" · ":""}${un.marca} ${un.modelo} ${un.anio}`
    : "";
  const clDirParts=[]; if(cl?.direccion)clDirParts.push(cl.direccion); if(cl?.ciudad)clDirParts.push(cl.ciudad); if(cl?.estado)clDirParts.push(cl.estado);
  const clLine = cl ? cl.empresa+(clDirParts.length?" · "+clDirParts.join(", "):"") : "—";
  const fmtMXN = n=>safeNumber(n).toLocaleString("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:2});
  const notaLine = tkt.notes?`<li>${tkt.notes}</li>`:"";
  const conceptos = (()=>{
    const ls = tkt.lineas||[];
    if (!ls.length) return [{titulo:tkt.titulo,partRef:tkt.partRef||"",snap:tkt.snap,qty:1,descripcionPDF:""}];
    const lSum = ls.reduce((s,l)=>s+(l.lineTotal||l.snap?.precioConIVA||0),0);
    const sTotal = tkt.snap?.precioConIVA||0;
    if (sTotal>0 && Math.abs(lSum-sTotal)>0.5)
      return [{titulo:tkt.titulo,partRef:tkt.partRef||"",snap:tkt.snap,qty:1,descripcionPDF:""}];
    return ls;
  })();
  const filas = conceptos.map((c,i)=>{
    const ml=migrateLinea(c,tkt.snap); const qty=safeNumber(ml.qty,1)||1;
    const fin=resolveLineFinancials(ml,tkt.snap,qty);
    const desc=ml.descripcionPDF||"Atención correctiva para continuidad operativa de unidad en CEDIS SMO. Incluye integración de componente compatible, validación operativa y seguimiento logístico.";
    const unTag=unidadStr&&i===0?`<br><br><strong>Unidad:</strong> ${unidadStr}`:"";
    const refTag=ml.partRef?`<br><br><strong>Clave:</strong> ${ml.partRef}`:"";
    return `<tr><td>${String(i+1).padStart(2,"0")}</td><td>${ml.titulo||"Sin descripcion"}</td><td>${desc}${unTag}${refTag}</td><td class="money">${fmtMXN(fin.lineTotal)}</td></tr>`;
  }).join("");
  if(!filas.trim()) return null;
  const body=`<style>*{box-sizing:border-box;margin:0;padding:0}.page{width:794px;background:#fff;padding:50px;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.5}.top-header{border:1px solid #dcdcdc;padding:20px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0}.brand h1{font-size:28px;font-weight:800;margin:0}.brand p{font-size:10px;color:#666;font-weight:700;margin-top:4px}.issuer{text-align:right;font-size:11px;line-height:1.6}.hero{background:#000;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:20px;margin-top:14px}.hero-title{font-size:22px;font-weight:800}.hero-meta{text-align:right}.hero-meta .folio{font-size:18px;font-weight:800}.hero-meta .date{font-size:13px;font-weight:700}.meta-table{width:100%;border-collapse:collapse;margin-top:14px}.meta-table td{border:1px solid #e3e3e3;padding:10px 12px;font-size:11px}.meta-table td:first-child{width:100px;background:#fafafa;font-weight:700}.section-title{margin-top:22px;margin-bottom:10px;font-size:13px;font-weight:800}.detail-table{width:100%;border-collapse:collapse}.detail-table th{background:#000;color:#fff;padding:10px 12px;text-align:left;font-size:10px}.detail-table td{border:1px solid #e5e5e5;padding:12px;vertical-align:top;font-size:11px;line-height:1.6}.money{text-align:right;white-space:nowrap;font-weight:700}.totals{width:300px;margin-left:auto;margin-top:16px;border-collapse:collapse}.totals td{border:1px solid #e3e3e3;padding:10px 12px;font-size:11px}.totals td:last-child{text-align:right;font-weight:700}.grand-total td{background:#000;color:#fff;font-weight:800}.block{margin-top:22px}.block h3{font-size:13px;font-weight:800;margin-bottom:8px}.block ul{padding-left:16px}.block li{margin-bottom:5px;font-size:11px;line-height:1.6}.footer{margin-top:28px;border-top:1px solid #e5e5e5;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#444}</style><div class="page"><div class="top-header"><div class="brand"><h1>LOGISOLVE</h1><p>Logistics &middot; Supply &middot; Solutions</p></div><div class="issuer"><strong>Alejandro Saucedo</strong><br>RFC: SAME9612277T9<br>Tel. 5562321807<br>contacto@logisolve.mx</div></div><div class="hero"><div class="hero-title">COTIZACI&Oacute;N</div><div class="hero-meta"><div>No.</div><div class="folio">${folio}</div><div class="date">Fecha: ${tkt.date.replace(/\//g," / ")}</div></div></div><table class="meta-table"><tr><td>Cliente</td><td>${clLine}</td></tr><tr><td>Vigencia</td><td>3 d&iacute;as naturales</td></tr><tr><td>Atenci&oacute;n</td><td>&Aacute;rea de Compras / Operaciones</td></tr></table><div class="section-title">DETALLE DEL CONCEPTO</div><table class="detail-table"><thead><tr><th style="width:36px">No.</th><th style="width:160px">Concepto</th><th>Descripci&oacute;n t&eacute;cnica / operativa</th><th style="width:110px;text-align:right">Importe</th></tr></thead><tbody>${filas}</tbody></table><table class="totals"><tr><td>Subtotal</td><td>${fmtMXN(totals.subtotal)} MXN</td></tr><tr><td>IVA (${totals.ivaPct}%)</td><td>${fmtMXN(totals.ivaAmt)} MXN</td></tr><tr class="grand-total"><td>TOTAL &middot; IVA INCLUIDO</td><td>${fmtMXN(totals.total)} MXN</td></tr></table><div class="block"><h3>ALCANCE DEL SERVICIO</h3><ul><li>Integraci&oacute;n y coordinaci&oacute;n de componente requerido para continuidad operativa.</li><li>Validaci&oacute;n y coordinaci&oacute;n operativa.</li><li>Entrega directa en CEDIS SMO.</li><li>Seguimiento y trazabilidad log&iacute;stica.</li></ul></div><div class="block"><h3>CONDICIONES COMERCIALES</h3><ul><li>Precio IVA incluido en el total.</li><li>Forma de pago: ${formaPago}.</li><li>Entrega conforme a disponibilidad confirmada al momento de autorizaci&oacute;n.</li><li>Precios sujetos a cambio y disponibilidad al momento de confirmar.</li><li>Vigencia: 3 d&iacute;as naturales a partir de la fecha de emisi&oacute;n.</li>${notaLine}</ul></div><div class="block"><h3>OBSERVACIONES</h3><ul><li>Tiempo estimado de entrega: ${entrega}, sujeto a disponibilidad.</li><li>La validaci&oacute;n t&eacute;cnica final de compatibilidad corresponde al cliente.</li><li>La garant&iacute;a aplica conforme a pol&iacute;ticas del fabricante o proveedor.</li></ul></div><div class="footer"><div>Quedo atento para cualquier duda o confirmaci&oacute;n.</div><div>LogiSolve &middot; ${fechaLarga}</div></div></div>`;
  return {folio, body};
}

// ── PDFPreviewModal — preview nativo para iPhone/Safari ──────────────────────
function PDFPreviewModal({tkt,cl,un,supp,onClose}) {
  const C = React.useContext(ThemeCtx);
  const frameRef=useRef(null);
  const [ready,setReady]=useState(false);
  const result=useMemo(()=>buildCotizacionHTML(tkt,cl,un,supp),[tkt]);
  const htmlDoc=useMemo(()=>{
    if(!result) return null;
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=794px"><style>body{margin:0;background:#f0f0f0;display:flex;justify-content:center;min-height:100vh;}@media print{body{background:white;margin:0;}}</style></head><body>${result.body}</body></html>`;
  },[result]);

  const handlePrint=()=>{
    if(!htmlDoc) return;
    try{
      const blob=new Blob([htmlDoc],{type:"text/html;charset=utf-8"});
      const url=URL.createObjectURL(blob);
      const w=window.open(url,"_blank");
      if(w){
        w.addEventListener("load",()=>{w.focus();w.print();setTimeout(()=>URL.revokeObjectURL(url),60000);});
      } else {
        URL.revokeObjectURL(url);
        frameRef.current?.contentWindow?.print();
      }
    }catch(e){frameRef.current?.contentWindow?.print();}
  };
  const handleShare=()=>{
    if(navigator.share){
      navigator.share({title:`Cotización ${tkt.id}`,text:`${tkt.titulo||""}\nTotal: ${mxn(tkt.snap?.precioConIVA||0)}\n${tkt.id}`}).catch(()=>{});
    } else { handlePrint(); }
  };

  if(!htmlDoc) return (
    <div style={{position:"fixed",inset:0,zIndex:700,background:C.bg0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontSize:13,color:C.red}}>No se pudo generar el documento</div>
      <button onClick={onClose} style={{padding:"12px 24px",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,color:C.t1,fontSize:14,cursor:"pointer"}}>Cerrar</button>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,zIndex:700,background:C.bg0,display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,borderBottom:`1px solid ${C.border}`,
        padding:`calc(env(safe-area-inset-top,44px) + 10px) 16px 12px`,
        display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={onClose} style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,
          color:C.t1,padding:"10px 14px",cursor:"pointer",fontSize:14,minWidth:44,minHeight:44,lineHeight:1}}>←</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,color:C.cyan,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{result.folio}</div>
          <div style={{fontSize:11,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(tkt.titulo||"").substring(0,44)}</div>
        </div>
        {typeof navigator!=="undefined"&&navigator.share&&(
          <button onClick={handleShare} style={{background:C.bg0,border:`1px solid ${C.border}`,borderRadius:10,
            color:C.t1,padding:"10px 14px",cursor:"pointer",fontSize:13,minWidth:44,minHeight:44,fontWeight:600}}>↑</button>
        )}
        <button onClick={handlePrint} style={{background:C.blue,border:`1px solid ${C.blueHi}`,borderRadius:10,
          color:C.t1,padding:"10px 16px",cursor:"pointer",fontSize:13,fontWeight:700,minHeight:44,whiteSpace:"nowrap"}}>↓ PDF</button>
      </div>
      {/* Loading */}
      {!ready&&(
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12}}>
          <div style={{width:32,height:32,borderRadius:16,border:`3px solid ${C.border}`,borderTopColor:C.cyan,animation:"spin 0.8s linear infinite"}}/>
          <div style={{fontSize:12,color:C.t3}}>Generando vista previa...</div>
        </div>
      )}
      {/* Preview */}
      <iframe ref={frameRef} srcDoc={htmlDoc} onLoad={()=>setReady(true)}
        style={{flex:1,border:"none",display:ready?"block":"none",background:"white"}}
        title="Vista previa cotización"
        sandbox="allow-same-origin allow-scripts allow-modals allow-popups allow-forms"/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PDF GENERATOR — formato oficial Logisolve
// ═══════════════════════════════════════════════════════════════════════════════
function generarCotizacionPDF(tkt, cl, un, supp) {
  const totals = calculateTicketTotals(tkt);
  const folio = mkFolio(tkt,"COT");

  const fechaLarga = (()=>{
    const p = tkt.date.split("/");
    if (p.length !== 3) return tkt.date;
    const meses = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    return `${parseInt(p[0])} de ${meses[parseInt(p[1])-1]} de ${p[2]}`;
  })();

  const formaPago =
    tkt.payType === "credit"
      ? "Cr\u00e9dito" + (tkt.promesaPago ? ` \u2014 Fecha l\u00edmite: ${tkt.promesaPago}` : "")
      : "Contado / Transferencia bancaria";

  const entrega =
    supp && supp.entregaDias
      ? `${supp.entregaDias} d\u00eda${supp.entregaDias > 1 ? "s" : ""} h\u00e1biles`
      : "24-48 hrs h\u00e1biles";

  const unidadStr = un
    ? `${un.economico ? "Eco. " + un.economico + " \u00b7 " : ""}${un.marca} ${un.modelo} ${un.anio}`
    : "";

  const clDirParts = [];
  if (cl?.direccion) clDirParts.push(cl.direccion);
  if (cl?.ciudad)    clDirParts.push(cl.ciudad);
  if (cl?.estado)    clDirParts.push(cl.estado);

  const clLine = cl
    ? cl.empresa + (clDirParts.length ? " \u00b7 " + clDirParts.join(", ") : "")
    : "\u2014";

  const fmtMXN = (n) =>
    safeNumber(n).toLocaleString("es-MX", { style:"currency", currency:"MXN", minimumFractionDigits:2 });

  const notaLine = tkt.notes ? `<li>${tkt.notes}</li>` : "";

  const conceptos = (()=>{
    const ls = tkt.lineas||[];
    if (!ls.length) return [{titulo:tkt.titulo,partRef:tkt.partRef||"",snap:tkt.snap,qty:1,descripcionPDF:""}];
    const lSum = ls.reduce((s,l)=>s+(l.lineTotal||l.snap?.precioConIVA||0),0);
    const sTotal = tkt.snap?.precioConIVA||0;
    if (sTotal>0 && Math.abs(lSum-sTotal)>0.5)
      return [{titulo:tkt.titulo,partRef:tkt.partRef||"",snap:tkt.snap,qty:1,descripcionPDF:""}];
    return ls;
  })();

  const filas = tkt.kitMode
    // ── KIT MODE: una sola fila con título del kit y componentes como lista ──
    ? (()=>{
        const componentList = conceptos.map((c,i)=>{
          const ml = migrateLinea(c, tkt.snap);
          return `${i+1}. ${ml.titulo||"Componente"}`;
        }).join("<br>");
        const unTag = unidadStr ? `<br><br><strong>Unidad:</strong> ${unidadStr}` : "";
        return `<tr>
          <td>01</td>
          <td>${tkt.titulo||"Kit"}</td>
          <td>${componentList}${unTag}</td>
          <td class="money">${fmtMXN(totals.total)}</td>
        </tr>`;
      })()
    // ── NORMAL MODE: una fila por componente ────────────────────────────────
    : conceptos.map((c,i) => {
    const ml      = migrateLinea(c, tkt.snap);
    const qty     = safeNumber(ml.qty, 1) || 1;
    const fin     = resolveLineFinancials(ml, tkt.snap, qty);
    const desc    = ml.descripcionPDF ||
      "Atenci\u00f3n correctiva para continuidad operativa de unidad en CEDIS SMO. Incluye integraci\u00f3n de componente compatible, validaci\u00f3n operativa y seguimiento log\u00edstico.";
    const unTag   = unidadStr && i === 0 ? `<br><br><strong>Unidad:</strong> ${unidadStr}` : "";
    const refTag  = ml.partRef ? `<br><br><strong>Clave:</strong> ${ml.partRef}` : "";
    const qtyTag  = qty > 1
      ? `<br><span style="font-size:9px;color:#666">${qty} pzs &times; ${fmtMXN(fin.unitPrice)} c/u</span>`
      : "";
    return `<tr>
      <td>${String(i+1).padStart(2,"0")}</td>
      <td>${ml.titulo||"Sin descripcion"}${qtyTag}</td>
      <td>${desc}${unTag}${refTag}</td>
      <td class="money">${fmtMXN(fin.lineTotal)}</td>
    </tr>`;
  }).join("");

  // Validación defensiva
  if (!filas.trim()) {
    console.warn("[PDF] filas vacías, abortando");
    return;
  }

  // HTML del contenido — SIN <html><head><body>, solo estilos + .page
  const innerHTML = `
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      .page{width:794px;background:#fff;padding:36px 46px 28px;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12px;line-height:1.45}
      /* ── HEADER ── */
      .top-header{border:1px solid #dcdcdc;padding:16px 20px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0}
      .brand h1{font-size:26px;font-weight:800;margin:0;color:#0a0a0a}
      .brand p{font-size:9px;color:#666;font-weight:700;margin-top:3px}
      .issuer{text-align:right;font-size:10px;line-height:1.55;color:#444}
      .issuer strong{color:#0a0a0a}
      /* ── HERO BAR ── */
      .hero{background:#000;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:14px 18px;margin-top:12px}
      .hero-title{font-size:20px;font-weight:800}
      .hero-meta{text-align:right}
      .hero-meta .lbl{font-size:8px;color:rgba(255,255,255,0.6)}
      .hero-meta .folio{font-size:15px;font-weight:800}
      .hero-meta .date{font-size:11px;font-weight:700}
      /* ── META TABLE ── */
      .meta-table{width:100%;border-collapse:collapse;margin-top:12px}
      .meta-table td{border:1px solid #e3e3e3;padding:7px 11px;font-size:10px}
      .meta-table td:first-child{width:90px;background:#fafafa;font-weight:700}
      /* ── DETAIL TABLE ── */
      .section-title{margin-top:16px;margin-bottom:8px;font-size:12px;font-weight:800}
      .detail-table{width:100%;border-collapse:collapse}
      .detail-table th{background:#000;color:#fff;padding:8px 10px;text-align:left;font-size:9.5px}
      .detail-table td{border:1px solid #e5e5e5;padding:9px 10px;vertical-align:top;font-size:10.5px;line-height:1.5}
      .money{text-align:right;white-space:nowrap;font-weight:700}
      /* ── TOTALS ── */
      .totals{width:280px;margin-left:auto;margin-top:10px;border-collapse:collapse}
      .totals td{border:1px solid #e3e3e3;padding:7px 11px;font-size:10px}
      .totals td:last-child{text-align:right;font-weight:700}
      .grand-total td{background:#000;color:#fff;font-weight:800}
      /* ── STACKED SECTIONS ── */
      .blocks-row{margin-top:14px}
      .block{margin-bottom:8px}
      .block h3{font-size:10px;font-weight:800;margin-bottom:5px}
      .block ul{list-style:none;padding:0}
      .block li{font-size:9.5px;line-height:1.5;margin-bottom:3px;padding-left:12px;position:relative}
      .block li::before{content:"·";position:absolute;left:2px;color:#555}
      /* ── FOOTER ── */
      .footer{margin-top:12px;border-top:1px solid #e5e5e5;padding-top:7px;display:flex;justify-content:space-between;font-size:8.5px;color:#777}
    </style>
    <div class="page">
      <div class="top-header">
        <div class="brand">
          <h1>LOGISOLVE</h1>
          <p>Logistics &middot; Supply &middot; Solutions</p>
        </div>
        <div class="issuer">
          <strong>Alejandro Saucedo</strong><br>
          RFC: SAME9612277T9<br>
          Tel. 5562321807
        </div>
      </div>
      <div class="hero">
        <div class="hero-title">COTIZACI&Oacute;N</div>
        <div class="hero-meta">
          <div class="lbl">No.</div>
          <div class="folio">${folio}</div>
          <div class="date">Fecha: ${tkt.date.replace(/\//g," / ")}</div>
        </div>
      </div>
      <table class="meta-table">
        <tr><td>Cliente</td><td>${clLine}</td></tr>
        <tr><td>Vigencia</td><td>3 d&iacute;as naturales</td></tr>
        <tr><td>Atenci&oacute;n</td><td>&Aacute;rea de Compras / Operaciones</td></tr>
      </table>
      <div class="section-title">Detalle del concepto</div>
      <table class="detail-table">
        <thead><tr>
          <th style="width:32px">No.</th>
          <th style="width:150px">Concepto</th>
          <th>Descripci&oacute;n t&eacute;cnica / operativa</th>
          <th style="width:100px;text-align:right">Importe</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td>${fmtMXN(totals.subtotal)} MXN</td></tr>
        <tr><td>IVA (${totals.ivaPct}%)</td><td>${fmtMXN(totals.ivaAmt)} MXN</td></tr>
        <tr class="grand-total"><td>TOTAL &middot; IVA INCLUIDO</td><td>${fmtMXN(totals.total)} MXN</td></tr>
      </table>
      <div class="blocks-row">
        <div class="block">
          <h3>ALCANCE DEL SERVICIO</h3>
          <ul>
            <li>Integraci&oacute;n y coordinaci&oacute;n de componente requerido para continuidad operativa.</li>
            <li>Validaci&oacute;n y coordinaci&oacute;n operativa.</li>
            <li>Entrega directa en CEDIS SMO.</li>
            <li>Seguimiento y trazabilidad log&iacute;stica.</li>
          </ul>
        </div>
        <div class="block">
          <h3>CONDICIONES COMERCIALES</h3>
          <ul>
            <li>Precio IVA incluido en el total.</li>
            <li>Forma de pago: ${formaPago}.</li>
            <li>Entrega conforme a disponibilidad confirmada al momento de autorizaci&oacute;n.</li>
            <li>Precios sujetos a cambio y disponibilidad al momento de confirmar.</li>
            <li>Vigencia: 3 d&iacute;as naturales a partir de la fecha de emisi&oacute;n.</li>
          </ul>
        </div>
        <div class="block">
          <h3>OBSERVACIONES</h3>
          <ul>
            <li>Tiempo estimado de entrega: ${entrega}, sujeto a disponibilidad.</li>
            <li>La validaci&oacute;n t&eacute;cnica final de compatibilidad corresponde al cliente.</li>
            <li>La garant&iacute;a aplica conforme a pol&iacute;ticas del fabricante o proveedor.</li>
            ${notaLine}
          </ul>
        </div>
      </div>
      <div class="footer">
        <div>Quedo atento para cualquier duda o confirmaci&oacute;n.</div>
        <div>LogiSolve &middot; ${fechaLarga}</div>
      </div>
    </div>`;

  // Contenedor: position:absolute en (0,0), visible, sin z-index negativo
  const container = document.createElement("div");
  container.style.cssText = "position:absolute;top:0;left:0;width:794px;background:white;opacity:1;pointer-events:none;";
  container.innerHTML = innerHTML;
  document.body.appendChild(container);

  const generate = () => {
    // Validate DOM has content before proceeding
    const text = container.innerText || "";
    if (!text.trim()) {
      console.warn("[PDF] contenedor vacío, abortando");
      container.remove();
      return;
    }

    // eslint-disable-next-line no-undef
    html2pdf()
      .set({
        margin: 0,
        filename: `${folio}.pdf`,
        image: { type:"jpeg", quality:0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit:"mm", format:"a4", orientation:"portrait" },
      })
      .from(container.querySelector('.page')||container.firstElementChild)
      .save()
      .finally(() => { container.remove(); });
  };

  // doble rAF — garantiza que el DOM esté pintado
  const go = () => requestAnimationFrame(() => requestAnimationFrame(generate));

  if (typeof html2pdf !== "undefined") {
    go();
  } else {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    script.onload = go;
    script.onerror = () => {
      container.remove();
      alert("No se pudo cargar html2pdf.js. Verifica tu conexi\u00f3n.");
    };
    document.head.appendChild(script);
  }
}
// ── Acta de Entrega, Recepción y Conformidad ─────────────────────────────────
function generarActaRecepcionPDF(tkt, cl, un) {
  const folio = mkFolio(tkt,"ACT");
  const now = new Date();
  const pad = n => String(n).padStart(2,'0');
  const fechaHoy = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()}`;
  const horaHoy  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // Detalle rows
  const conceptos = (()=>{
    const ls = tkt.lineas||[];
    if (!ls.length) return [{titulo:tkt.titulo, partRef:tkt.partRef||'', qty:1}];
    const lSum = ls.reduce((s,l)=>s+(l.lineTotal||l.snap?.precioConIVA||0),0);
    const sTotal = tkt.snap?.precioConIVA||0;
    if (sTotal>0 && Math.abs(lSum-sTotal)>0.5) return [{titulo:tkt.titulo, partRef:tkt.partRef||'', qty:1}];
    return ls;
  })();
  const unLabel = un ? `${un.marca} ${un.modelo}` : '';
  const filas = conceptos.map(c=>`
    <tr>
      <td style="text-align:center">${c.qty||1}</td>
      <td>${unLabel}</td>
      <td>${c.titulo||c.descripcionPDF||''}</td>
      <td>${c.partRef||''}</td>
      <td style="text-align:center">Nuevo</td>
    </tr>`).join('');

  const blue = '#1a3a6b';
  const html = `<style>*{box-sizing:border-box;margin:0;padding:0}.page{width:794px;padding:28px 36px 32px;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#111}.main-title{text-align:center;margin-bottom:6px}.main-title h1{font-size:16px;font-weight:900;letter-spacing:0.02em}.main-title p{font-size:10px;font-weight:600;color:#333}.header-bar{display:flex;border:1px solid #ccc;margin-bottom:0}.hb-left{background:${blue};color:#fff;font-size:10px;font-weight:800;padding:8px 12px;flex:1;display:flex;align-items:center;letter-spacing:0.04em}.hb-right{font-size:9px;padding:5px 10px;line-height:1.7;min-width:130px;border-left:1px solid #ccc}.hb-right b{font-weight:700}table.section{width:100%;border-collapse:collapse;margin-bottom:0}table.section .sec-hd{background:${blue};color:#fff;font-size:9px;font-weight:800;padding:5px 8px;letter-spacing:0.06em;text-align:left}table.section td{border:1px solid #ccc;padding:5px 8px;font-size:9.5px;vertical-align:middle}table.section .lbl{background:#eef1f7;font-weight:700;width:130px;white-space:nowrap}table.section .val{background:#fff}.dt{width:100%;border-collapse:collapse}.dt th{background:${blue};color:#fff;font-size:9px;font-weight:800;padding:5px 8px;text-align:left}.dt td{border:1px solid #ccc;padding:5px 8px;font-size:9.5px}.obs-box{border:1px solid #ccc;min-height:52px;padding:6px 8px;font-size:9.5px;color:#666}.obs-photo{border:1px solid #ccc;min-height:34px;padding:5px 8px;font-size:9px;color:#999;font-style:italic}.decl{font-size:8.5px;line-height:1.55;margin:8px 0;text-align:justify}.sig-table{width:100%;border-collapse:collapse;margin-top:6px}.sig-table th{background:#dde3ee;font-size:9px;font-weight:800;padding:5px 8px;text-align:left;letter-spacing:0.05em;border:1px solid #ccc}.sig-table td{border:1px solid #ccc;padding:36px 10px 5px;font-size:9px;color:#444}.sp{height:6px}</style><div class="page">
  <div class="main-title">
    <h1>LOGISOLVE</h1>
    <p>Log&iacute;stica, Suministro y Soporte Automotriz Integrado</p>
  </div>
  <div class="header-bar">
    <div class="hb-left">ACTA DE ENTREGA, RECEPCI&Oacute;N Y CONFORMIDAD</div>
    <div class="hb-right">
      <b>Folio:</b> ${folio}<br>
      <b>Fecha:</b> ${fechaHoy}<br>
      <b>Hora:</b> ${horaHoy}
    </div>
  </div>
  <div class="sp"></div>

  <table class="section">
    <tr><th class="sec-hd" colspan="4">1. DATOS DEL CLIENTE</th></tr>
    <tr>
      <td class="lbl">Cliente / Empresa</td><td class="val" colspan="3">${cl?.empresa||''}</td>
    </tr>
    <tr>
      <td class="lbl">Contacto</td><td class="val">${cl?.contacto||''}</td>
      <td class="lbl" style="width:80px">Correo</td><td class="val">${cl?.correo||''}</td>
    </tr>
    <tr>
      <td class="lbl">Tel&eacute;fono</td><td class="val">${cl?.tel||''}</td>
      <td class="lbl" style="width:80px">RFC</td><td class="val">${cl?.rfc||''}</td>
    </tr>
    <tr>
      <td class="lbl">Ubicaci&oacute;n de entrega</td><td class="val" colspan="3"></td>
    </tr>
  </table>
  <div class="sp"></div>

  <table class="section">
    <tr><th class="sec-hd" colspan="6">2. DATOS DE LA UNIDAD (SI APLICA)</th></tr>
    <tr>
      <td class="lbl">Marca</td><td class="val">${un?.marca||''}</td>
      <td class="lbl">Modelo</td><td class="val">${un?.modelo||''}</td>
      <td class="lbl">A&ntilde;o</td><td class="val">${un?.anio||''}</td>
    </tr>
    <tr>
      <td class="lbl">Placas</td><td class="val">${un?.placa||''}</td>
      <td class="lbl">No. Econ&oacute;mico</td><td class="val">${un?.economico||''}</td>
      <td class="lbl">VIN</td><td class="val">${un?.vin||''}</td>
    </tr>
    <tr>
      <td class="lbl">Kilometraje</td><td class="val" colspan="5">${un?.km ? un.km.toLocaleString('es-MX')+' km' : ''}</td>
    </tr>
  </table>
  <div class="sp"></div>

  <table class="dt">
    <thead>
      <tr>
        <th style="width:38px;text-align:center">Cant.</th>
        <th style="width:110px">Unidad</th>
        <th>Descripci&oacute;n</th>
        <th style="width:100px">No. Parte</th>
        <th style="width:65px;text-align:center">Estado</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td></td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
  <div class="sp"></div>

  <table class="section">
    <tr><th class="sec-hd" colspan="1">4. OBSERVACIONES Y EVIDENCIA</th></tr>
    <tr><td><div style="font-size:9px;margin-bottom:2px;font-weight:600">Observaciones:</div>
      <div class="obs-box">${tkt.notes||''}</div>
      <div style="margin-top:6px" class="obs-photo">Espacio para evidencia fotogr&aacute;fica (opcional)</div>
    </td></tr>
  </table>
  <div class="sp"></div>

  <div class="decl"><b>DECLARACI&Oacute;N DE CONFORMIDAD.</b> El cliente declara haber recibido y verificado los bienes, componentes, refacciones y/o servicios descritos en el presente documento, manifestando su conformidad respecto a cantidad, identificaci&oacute;n y estado f&iacute;sico aparente. Cualquier garant&iacute;a aplicable estar&aacute; sujeta a las pol&iacute;ticas del fabricante, proveedor o LogiSolve seg&uacute;n corresponda.</div>

  <table class="sig-table">
    <tr>
      <th style="width:50%">ENTREGA</th>
      <th style="width:50%">RECEPCI&Oacute;N CONFORME</th>
    </tr>
    <tr>
      <td>Nombre y Firma</td>
      <td>Nombre, Cargo y Firma</td>
    </tr>
  </table>
</div>`;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px';
  container.innerHTML = html;
  document.body.appendChild(container);

  const generate = () => {
    // eslint-disable-next-line no-undef
    html2pdf()
      .set({
        margin: 0,
        filename: `${folio}-acta.pdf`,
        image: { type:'jpeg', quality:0.98 },
        html2canvas: { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false, scrollX:0, scrollY:0 },
        jsPDF: { unit:'mm', format:'a4', orientation:'portrait' },
      })
      .from(container.querySelector('.page') || container.firstElementChild)
      .save()
      .finally(() => { container.remove(); });
  };

  const go = () => requestAnimationFrame(() => requestAnimationFrame(generate));
  if (typeof html2pdf !== 'undefined') {
    go();
  } else {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    script.onload = go;
    script.onerror = () => { container.remove(); alert('No se pudo cargar html2pdf.js.'); };
    document.head.appendChild(script);
  }
}
// Modal de confirmacion PDF
function PDFConfirm({tkt,cl,un,supp,onClose}) {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.bg2,border:`1px solid ${C.borderHi}`,borderRadius:6,padding:22,maxWidth:340,width:"90%"}}>
        <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
          <span style={{fontSize:14,color:C.green}}>✓</span>
          <div style={{fontSize:11,color:C.green,fontWeight:700}}>Ticket registrado</div>
        </div>
        <div style={{fontSize:10,color:C.t2,marginBottom:3,lineHeight:1.5,fontFamily:"'Courier New',monospace"}}>{tkt.id}</div>
        <div style={{fontSize:10,color:C.t3,marginBottom:14,lineHeight:1.4}}>{tkt.titulo.substring(0,70)}</div>
        <div style={{height:1,background:C.border,marginBottom:14}}/>
        <div style={{fontSize:10,color:C.t2,marginBottom:12}}>¿Generar cotización PDF ahora?</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>{generarCotizacionPDF(tkt,cl,un,supp);onClose();}}
            style={{flex:1,padding:"9px",background:C.blue,border:"none",borderRadius:4,color:C.t1,fontSize:11,fontWeight:700,cursor:"pointer"}}>
            Generar PDF
          </button>
          <button onClick={onClose}
            style={{padding:"9px 14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,color:C.t2,fontSize:11,cursor:"pointer"}}>
            Después
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// L8 — UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════
const Logo = React.memo(function Logo() {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <svg width="22" height="22" viewBox="0 0 28 28">
        <line x1="2" y1="14" x2="26" y2="14" stroke={C.blue} strokeWidth="1.5"/>
        <line x1="8" y1="14" x2="8" y2="8"   stroke={C.cyanDim} strokeWidth="1"/>
        <line x1="8" y1="8"  x2="17" y2="8"  stroke={C.cyanDim} strokeWidth="1"/>
        <line x1="17" y1="14" x2="17" y2="20" stroke={C.cyanDim} strokeWidth="1"/>
        <line x1="8"  y1="20" x2="17" y2="20" stroke={C.cyanDim} strokeWidth="1"/>
        <circle cx="2"  cy="14" r="2"   fill={C.blue}/>
        <circle cx="8"  cy="14" r="1.4" fill={C.blue}/>
        <circle cx="17" cy="14" r="1.4" fill={C.blue}/>
        <circle cx="26" cy="14" r="2.2" fill={C.cyan}/>
        <circle cx="8"  cy="8"  r="1.2" fill={C.cyanDim}/>
        <circle cx="17" cy="8"  r="1.2" fill={C.orange}/>
        <circle cx="8"  cy="20" r="1.1" fill={C.cyanDim}/>
        <circle cx="17" cy="20" r="1.2" fill={C.cyanDim}/>
      </svg>
      <div>
        <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.12em",color:C.t1,fontFamily:"'Courier New',monospace",lineHeight:1}}>
          LOGI<span style={{color:C.orange}}>SOLVE</span>
          <span style={{fontSize:7,color:C.t3,marginLeft:5}}>v5</span>
        </div>
        <div style={{fontSize:6,color:C.t3,letterSpacing:"0.2em",marginTop:2}}>SUPPLY · OPS · TRANSPORT</div>
      </div>
    </div>
  );
})

const PriorityBadge = React.memo(function PriorityBadge({pid,small}) {
  const p=PRIORITY[pid]||PRIORITY.P4;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:small?"2px 5px":"3px 8px",borderRadius:2,background:p.dim,border:`1px solid ${p.color}66`,fontSize:small?7:8,color:p.dot,fontWeight:700,letterSpacing:"0.05em",whiteSpace:"nowrap",fontFamily:"'Courier New',monospace"}}>
      {p.short} <span style={{fontWeight:400,opacity:.7,fontSize:small?6:7}}>{p.label}</span>
    </span>
  );
})

const StatusBadge = React.memo(function StatusBadge({sid,meta,small}) {
  const s=meta[sid]||(meta.recibido||Object.values(meta)[0]);
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:3,padding:small?"2px 5px":"3px 7px",borderRadius:2,background:s.color+"33",border:`1px solid ${s.color}55`,fontSize:small?7:8,color:s.dot,fontWeight:600,whiteSpace:"nowrap"}}>
      <span style={{width:4,height:4,borderRadius:"50%",background:s.dot,flexShrink:0}}/>
      {s.label}
    </span>
  );
})

const KPI = React.memo(function KPI({label,value,color,sub,accent,alert}) {
  return (
    <div style={{background:accent?C.blueDim:alert?C.redDim:C.bg2,border:`1px solid ${accent?C.blue:alert?C.red+"55":C.border}`,borderRadius:3,padding:"8px 10px",minWidth:0,overflow:"hidden"}}>
      <div style={{fontSize:7,color:C.t3,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</div>
      <div style={{fontSize:13,fontWeight:800,color:color||C.t1,fontFamily:"'Courier New',monospace",lineHeight:1.1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{value}</div>
      {sub&&<div style={{fontSize:7,color:C.t3,marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub}</div>}
    </div>
  );
})

function Field({label,value,onChange,prefix="$",suffix,hint,hi,min=0,step=1,type="text",disabled,placeholder,rows}) {
  const st={flex:1,background:"transparent",border:"none",outline:"none",color:hi?C.cyan:disabled?C.t3:C.t1,fontSize:hi?13:11,fontWeight:hi?700:400,padding:"7px 0",fontFamily:"'Courier New',monospace"};
  return (
    <div style={{marginBottom:7}}>
      {label&&<div style={{fontSize:7,color:hi?C.cyan:C.t3,letterSpacing:"0.14em",marginBottom:3,textTransform:"uppercase"}}>{label}</div>}
      <div style={{display:"flex",alignItems:rows?"flex-start":"center",background:disabled?C.bg3:C.bg0,border:`1px solid ${hi?C.blueHi:C.border}`,borderRadius:3,overflow:"hidden"}}>
        {prefix&&<span style={{padding:"0 6px",color:hi?C.cyan:C.t3,fontSize:10,fontFamily:"'Courier New',monospace",flexShrink:0,paddingTop:rows?8:0}}>{prefix}</span>}
        {rows?(
          <textarea rows={rows} value={String(value)} disabled={disabled} placeholder={placeholder||""}
            onChange={e=>onChange(e.target.value)} style={{...st,resize:"vertical",paddingTop:7}}/>
        ):(
          <input type={type} value={value} min={type==="number"?min:undefined} step={type==="number"?step:undefined} disabled={disabled} placeholder={placeholder||""}
            onChange={e=>{const v=e.target.value;onChange(v);}} style={st}/>
        )}
        {suffix&&<span style={{padding:"0 6px",color:C.t3,fontSize:10,flexShrink:0}}>{suffix}</span>}
      </div>
      {hint&&<div style={{fontSize:7,color:C.t3,marginTop:2}}>{hint}</div>}
    </div>
  );
}

function Sel({label,value,onChange,options}) {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{marginBottom:7}}>
      {label&&<div style={{fontSize:7,color:C.t3,letterSpacing:"0.14em",marginBottom:3,textTransform:"uppercase"}}>{label}</div>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"6px 7px",color:C.t1,fontSize:11,outline:"none",fontFamily:"'Courier New',monospace",cursor:"pointer"}}>
        {options.map(o=><option key={o.value} value={o.value} style={{background:C.bg1}}>{o.label}</option>)}
      </select>
    </div>
  );
}

const Toggle = React.memo(function Toggle({label,value,onChange}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${C.bg4}`}}>
      <span style={{fontSize:10,color:C.t2}}>{label}</span>
      <div onClick={()=>onChange(!value)} style={{width:28,height:15,borderRadius:8,cursor:"pointer",position:"relative",background:value?C.blue:C.bg4,border:`1px solid ${value?C.blueHi:C.border}`,flexShrink:0}}>
        <div style={{position:"absolute",top:2,left:value?12:2,width:9,height:9,borderRadius:"50%",background:value?C.t1:C.t3,transition:"left .15s"}}/>
      </div>
    </div>
  );
})

const SHdr = React.memo(function SHdr({title,right}) {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:C.bg3,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:7,color:C.t3,letterSpacing:"0.2em",fontWeight:700}}>{title}</div>
      {right&&<div style={{fontSize:9,color:C.t2}}>{right}</div>}
    </div>
  );
})

const MiniBar = React.memo(function MiniBar({value,max,color}) {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{height:3,background:C.bg4,borderRadius:2,overflow:"hidden",marginTop:3}}>
      <div style={{height:"100%",width:`${clamp((value/Math.max(max,1))*100,0,100)}%`,background:color||C.cyan}}/>
    </div>
  );
})

const EmptyState = React.memo(function EmptyState({icon,title,sub}) {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{textAlign:"center",padding:"32px 16px",color:C.t3}}>
      <div style={{fontSize:24,marginBottom:6,opacity:.4}}>{icon}</div>
      <div style={{fontSize:11,color:C.t2,marginBottom:3}}>{title}</div>
      {sub&&<div style={{fontSize:9,color:C.t3}}>{sub}</div>}
    </div>
  );
})

const Confirm = React.memo(function Confirm({msg,onConfirm,onCancel}) {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:"rgba(16,18,22,0.92)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",border:`1px solid ${C.borderHi}`,borderRadius:20,padding:22,maxWidth:320,width:"90%",boxShadow:"0 16px 60px rgba(0,0,0,0.6)"}}>
        <div style={{fontSize:12,color:C.t1,marginBottom:16,lineHeight:1.6}}>{msg}</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={onCancel}  style={{padding:"7px 16px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,color:C.t2,fontSize:11,cursor:"pointer"}}>Cancelar</button>
          <button onClick={onConfirm} style={{padding:"7px 16px",background:C.red,border:"none",borderRadius:10,color:"#0D0F12",fontSize:11,fontWeight:700,cursor:"pointer"}}>Confirmar</button>
        </div>
      </div>
    </div>
  );
})

const Toasts = React.memo(function Toasts({items}) {
  const C = React.useContext(ThemeCtx);
  if(!items.length) return null;
  const s=t=>t==="success"
    ?{border:`1px solid rgba(143,227,190,0.30)`,color:"#8FE3BE",background:"rgba(14,24,20,0.92)"}
    :t==="error"
    ?{border:`1px solid rgba(255,122,122,0.30)`,color:"#FF7A7A",background:"rgba(24,12,12,0.92)"}
    :{border:`1px solid ${C.border}`,color:C.t2,background:"rgba(14,16,20,0.92)"};
  return (
    <div style={{position:"fixed",bottom:"calc(90px + env(safe-area-inset-bottom,0px) + 8px)",right:12,zIndex:999,display:"flex",flexDirection:"column",gap:6,maxWidth:"calc(100vw - 24px)"}}>
      {items.map(t=>(
        <div key={t.id} style={{borderRadius:14,padding:"10px 16px",fontSize:11,fontFamily:"'Courier New',monospace",maxWidth:300,...s(t.type),boxShadow:"0 6px 24px rgba(0,0,0,.5)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
          {t.msg}
        </div>
      ))}
    </div>
  );
})

function SearchPalette({state,onNavigate,onClose}) {
  const C = React.useContext(ThemeCtx);
  const [q,setQ]=useState("");
  const ref=useRef();
  useEffect(()=>{ref.current?.focus();},[]);
  useEffect(()=>{const h=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);},[onClose]);
  const results=useMemo(()=>{
    if(!q.trim()) return [];
    const lq=q.toLowerCase(); const r=[];
    state.tickets.forEach(t=>{if(safeLower(t.titulo).includes(lq)||safeLower(t.id).includes(lq))r.push({type:"ticket",label:t.titulo,sub:t.id,tab:"tickets"});});
    state.clients.forEach(c=>{if(safeLower(c.empresa).includes(lq))r.push({type:"client",label:c.empresa,sub:c.id,tab:"clientes"});});
    state.suppliers.forEach(s=>{if(safeLower(s.nombre).includes(lq))r.push({type:"supplier",label:s.nombre,sub:s.id,tab:"proveedores"});});
    state.units.forEach(u=>{if(safeLower(u.marca).includes(lq)||safeLower(u.modelo).includes(lq)||safeLower(u.vin).includes(lq))r.push({type:"unit",label:`${u.marca} ${u.modelo} ${u.anio}`,sub:u.vin,tab:"unidades"});});
    state.parts.forEach(p=>{if(safeLower(p.nombre).includes(lq)||safeLower(p.oem).includes(lq))r.push({type:"part",label:p.nombre,sub:p.oem,tab:"catalogo"});});
    return r.slice(0,14);
  },[q,state]);
  const tl={ticket:"Ticket",client:"Cliente",supplier:"Prov.",unit:"Unidad",part:"Parte"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)",zIndex:600,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:70}} onClick={onClose}>
      <div style={{width:"90%",maxWidth:520,background:"rgba(16,18,22,0.92)",backdropFilter:"blur(32px)",WebkitBackdropFilter:"blur(32px)",border:`1px solid ${C.borderHi}`,borderRadius:16,overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",gap:7,padding:"7px 11px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{color:C.t3,fontSize:11}}>&#9906;</span>
          <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar ticket, unidad, parte, cliente, proveedor..."
            style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:11,fontFamily:"'Courier New',monospace"}}/>
          <span style={{fontSize:7,color:C.t3,border:`1px solid ${C.border}`,borderRadius:2,padding:"1px 4px"}}>ESC</span>
        </div>
        {results.length===0&&q.length>0&&<EmptyState icon="&#128269;" title="Sin resultados"/>}
        {results.length===0&&q.length===0&&<div style={{padding:"10px 12px",fontSize:9,color:C.t3}}>Busca en tickets, unidades, partes, clientes y proveedores.</div>}
        {results.map((r,i)=>(
          <div key={i} onClick={()=>{onNavigate(r.tab);onClose();}}
            style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 12px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:C.bg1}}>
            <div>
              <div style={{fontSize:10,color:C.t1}}>{r.label}</div>
              <div style={{fontSize:8,color:C.t3,fontFamily:"'Courier New',monospace"}}>{r.sub}</div>
            </div>
            <span style={{fontSize:7,color:C.t3,border:`1px solid ${C.border}`,borderRadius:2,padding:"1px 5px"}}>{tl[r.type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CLIENT PICKER (búsqueda por empresa, RFC, contacto) ─────────────────────
function ClientPicker({clients, value, onChange, placeholder="Buscar cliente...", mobile=false}) {
  const C = React.useContext(ThemeCtx);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const selected = clients.find(c => c.id === value);
  const displayLabel = selected ? selected.empresa : "";

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h, {passive:true});
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return clients.slice(0, 60);
    const lq = q.toLowerCase();
    return clients.filter(c =>
      safeLower(c.empresa).includes(lq) ||
      safeLower(c.rfc||"").includes(lq) ||
      safeLower(c.contacto||"").includes(lq)
    );
  }, [q, clients]);

  const triggerPad  = mobile ? "12px 14px" : "6px 8px";
  const triggerFont = mobile ? 16 : 10;
  const labelFont   = mobile ? 10 : 7;
  const dropFont    = mobile ? 13 : 9;
  const dropHeight  = mobile ? 280 : 220;
  const itemPad     = mobile ? "10px 12px" : "6px 9px";

  return (
    <div ref={ref} style={{position:"relative", marginBottom: mobile ? 10 : 7}}>
      <div style={{fontSize:labelFont,color:C.t3,letterSpacing:"0.14em",marginBottom: mobile ? 5 : 3,textTransform:"uppercase"}}>{mobile ? "Cliente" : "CLIENTE"}</div>
      <div
        onClick={() => { setOpen(o => !o); setQ(""); }}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg0,border:`1px solid ${open?C.blueHi:C.border}`,borderRadius: mobile ? 6 : 3,padding:triggerPad,cursor:"pointer",minHeight: mobile ? 46 : 28}}
      >
        {value ? (
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:triggerFont,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{displayLabel}</div>
            {selected?.rfc && <div style={{fontSize: mobile ? 11 : 7,color:C.t3,marginTop:2,fontFamily:"'Courier New',monospace"}}>{selected.rfc}</div>}
          </div>
        ) : (
          <span style={{fontSize:triggerFont,color:C.t3}}>{placeholder}</span>
        )}
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,marginLeft:6}}>
          {value && <span onClick={e=>{e.stopPropagation();onChange("");}} style={{fontSize: mobile ? 18 : 10,color:C.red,cursor:"pointer",padding:"0 3px",lineHeight:1}}>×</span>}
          <span style={{fontSize: mobile ? 10 : 8,color:C.t3}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:300,background:C.bg2,border:`1px solid ${C.blueHi}`,borderRadius: mobile ? 6 : 3,boxShadow:"0 4px 20px rgba(0,0,0,.6)",maxHeight:dropHeight,display:"flex",flexDirection:"column"}}>
          <div style={{padding: mobile ? "10px 12px" : "5px 8px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Empresa, RFC, contacto..."
              style={{width:"100%",background:"transparent",border:"none",outline:"none",color:C.t1,fontSize: mobile ? 16 : 10,fontFamily:"inherit"}}
            />
          </div>
          <div style={{overflowY:"auto",WebkitOverflowScrolling:"touch",flex:1}}>
            {results.length === 0 ? (
              <div style={{padding:itemPad,color:C.t3,fontSize:dropFont}}>Sin resultados</div>
            ) : results.map(c => (
              <div key={c.id}
                onClick={() => { onChange(c.id); setOpen(false); setQ(""); }}
                style={{padding:itemPad,cursor:"pointer",borderBottom:`1px solid ${C.border}`,background:c.id===value?C.blueDim:"transparent"}}>
                <div style={{fontSize:dropFont,color:c.id===value?C.cyan:C.t1,fontWeight:c.id===value?700:400}}>{c.empresa}</div>
                {c.rfc && <div style={{fontSize: mobile ? 11 : 7,color:C.t3,fontFamily:"'Courier New',monospace"}}>{c.rfc}</div>}
              </div>
            ))}
          </div>
          {value && (
            <div style={{padding: mobile ? "10px 12px" : "5px 8px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
              <div onClick={() => { onChange(""); setOpen(false); }} style={{fontSize:dropFont,color:C.red,cursor:"pointer"}}>× Quitar cliente</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SUPPLIER PICKER (búsqueda por nombre, especialidad) ──────────────────────
function SupplierPicker({suppliers, value, onChange, placeholder="Buscar proveedor...", mobile=false}) {
  const C = React.useContext(ThemeCtx);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const selected = suppliers.find(s => s.id === value);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h, {passive:true});
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return suppliers.slice(0, 60);
    const lq = q.toLowerCase();
    return suppliers.filter(s =>
      safeLower(s.nombre).includes(lq) ||
      safeLower(s.especialidad||"").includes(lq) ||
      safeLower(s.cobertura||"").includes(lq)
    );
  }, [q, suppliers]);

  const triggerPad  = mobile ? "12px 14px" : "6px 8px";
  const triggerFont = mobile ? 16 : 10;
  const labelFont   = mobile ? 10 : 7;
  const dropFont    = mobile ? 13 : 9;
  const dropHeight  = mobile ? 260 : 200;
  const itemPad     = mobile ? "10px 12px" : "6px 9px";

  return (
    <div ref={ref} style={{position:"relative", marginBottom: mobile ? 10 : 7}}>
      <div style={{fontSize:labelFont,color:C.t3,letterSpacing:"0.14em",marginBottom: mobile ? 5 : 3,textTransform:"uppercase"}}>{mobile ? "Proveedor" : "PROVEEDOR"}</div>
      <div
        onClick={() => { setOpen(o => !o); setQ(""); }}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg0,border:`1px solid ${open?C.blueHi:C.border}`,borderRadius: mobile ? 6 : 3,padding:triggerPad,cursor:"pointer",minHeight: mobile ? 46 : 28}}
      >
        {value ? (
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:triggerFont,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected?.nombre||value}</div>
            {selected?.especialidad && <div style={{fontSize: mobile ? 11 : 7,color:C.t3,marginTop:2}}>{selected.especialidad}</div>}
          </div>
        ) : (
          <span style={{fontSize:triggerFont,color:C.t3}}>{placeholder}</span>
        )}
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,marginLeft:6}}>
          {value && <span onClick={e=>{e.stopPropagation();onChange("");}} style={{fontSize: mobile ? 18 : 10,color:C.red,cursor:"pointer",padding:"0 3px",lineHeight:1}}>×</span>}
          <span style={{fontSize: mobile ? 10 : 8,color:C.t3}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:300,background:C.bg2,border:`1px solid ${C.blueHi}`,borderRadius: mobile ? 6 : 3,boxShadow:"0 4px 20px rgba(0,0,0,.6)",maxHeight:dropHeight,display:"flex",flexDirection:"column"}}>
          <div style={{padding: mobile ? "10px 12px" : "5px 8px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Nombre, especialidad..."
              style={{width:"100%",background:"transparent",border:"none",outline:"none",color:C.t1,fontSize: mobile ? 16 : 10,fontFamily:"inherit"}}
            />
          </div>
          <div style={{overflowY:"auto",WebkitOverflowScrolling:"touch",flex:1}}>
            {results.length === 0 ? (
              <div style={{padding:itemPad,color:C.t3,fontSize:dropFont}}>Sin resultados</div>
            ) : results.map(s => (
              <div key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); setQ(""); }}
                style={{padding:itemPad,cursor:"pointer",borderBottom:`1px solid ${C.border}`,background:s.id===value?C.blueDim:"transparent"}}>
                <div style={{fontSize:dropFont,color:s.id===value?C.cyan:C.t1,fontWeight:s.id===value?700:400}}>{s.nombre}</div>
                {s.especialidad && <div style={{fontSize: mobile ? 11 : 7,color:C.t3}}>{s.especialidad}</div>}
              </div>
            ))}
          </div>
          {value && (
            <div style={{padding: mobile ? "10px 12px" : "5px 8px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
              <div onClick={() => { onChange(""); setOpen(false); }} style={{fontSize:dropFont,color:C.red,cursor:"pointer"}}>× Quitar proveedor</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── UNIT PICKER (búsqueda por económico, placa, marca, modelo) ──────────────
function UnitPicker({units, value, onChange, placeholder="Buscar por eco, placa, marca...", mobile=false}) {
  const C = React.useContext(ThemeCtx);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const selected = units.find(u => u.id === value);
  const displayLabel = selected
    ? `${selected.economico ? "Eco." + selected.economico + " · " : ""}${selected.marca} ${selected.modelo} ${selected.anio}`
    : "";

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h, {passive:true});
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, []);

  const results = useMemo(() => {
    if (!q.trim()) return units.slice(0, 80);
    const lq = q.toLowerCase();
    return units.filter(u =>
      (u.economico && safeLower(u.economico).includes(lq)) ||
      (u.placa && safeLower(u.placa).includes(lq)) ||
      safeLower(u.marca).includes(lq) ||
      safeLower(u.modelo).includes(lq) ||
      safeLower(u.vin).includes(lq)
    );
  }, [q, units]);

  const triggerPad  = mobile ? "12px 14px" : "6px 8px";
  const triggerFont = mobile ? 15 : 10;
  const labelFont   = mobile ? 10 : 7;
  const dropFont    = mobile ? 13 : 9;
  const dropSubFont = mobile ? 11 : 7;
  const dropHeight  = mobile ? 320 : 260;
  const itemPad     = mobile ? "10px 12px" : "6px 9px";

  return (
    <div ref={ref} style={{position:"relative",marginBottom: mobile ? 10 : 7}}>
      <div style={{fontSize:labelFont,color:C.t3,letterSpacing:"0.14em",marginBottom: mobile ? 5 : 3,textTransform:"uppercase"}}>{mobile ? "Unidad" : "UNIDAD"}</div>
      <div
        onClick={() => { setOpen(o => !o); setQ(""); }}
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg0,border:`1px solid ${open?C.blueHi:C.border}`,borderRadius: mobile ? 6 : 3,padding:triggerPad,cursor:"pointer",minHeight: mobile ? 46 : 32}}
      >
        {value ? (
          <div style={{minWidth:0,flex:1}}>
            <div style={{fontSize:triggerFont,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontFamily:"'Courier New',monospace"}}>{displayLabel}</div>
            {selected?.placa && <div style={{fontSize:dropSubFont,color:C.t3,marginTop:2}}>Placa {selected.placa}</div>}
          </div>
        ) : (
          <span style={{fontSize:triggerFont,color:C.t3}}>{placeholder}</span>
        )}
        <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,marginLeft:6}}>
          {value && <span onClick={e=>{e.stopPropagation();onChange("");}} style={{fontSize: mobile ? 18 : 10,color:C.red,cursor:"pointer",padding:"0 3px",lineHeight:1}}>×</span>}
          <span style={{fontSize: mobile ? 10 : 8,color:C.t3}}>{open?"▲":"▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:300,background:C.bg2,border:`1px solid ${C.blueHi}`,borderRadius: mobile ? 6 : 3,boxShadow:"0 4px 20px rgba(0,0,0,.6)",maxHeight:dropHeight,display:"flex",flexDirection:"column"}}>
          <div style={{padding: mobile ? "10px 12px" : "5px 8px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Eco., placa, marca, modelo..."
              style={{width:"100%",background:"transparent",border:"none",outline:"none",color:C.t1,fontSize: mobile ? 15 : 10,fontFamily:"'Courier New',monospace"}}
            />
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            <div
              onClick={() => { onChange(""); setOpen(false); }}
              style={{padding:itemPad,borderBottom:`1px solid ${C.border}`,cursor:"pointer",fontSize:dropFont,color:C.t3}}
            >
              — Sin unidad —
            </div>
            {results.length === 0 && <div style={{padding:itemPad,fontSize:dropFont,color:C.t3}}>Sin resultados</div>}
            {results.map(u => (
              <div
                key={u.id}
                onClick={() => { onChange(u.id); setOpen(false); setQ(""); }}
                style={{padding:itemPad,borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:u.id===value?C.blueDim:"transparent",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}
              >
                <div style={{minWidth:0,flex:1}}>
                  <div style={{display:"flex",gap:5,alignItems:"center"}}>
                    {u.economico && <span style={{fontSize: mobile ? 13 : 9,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace",flexShrink:0}}>Eco.{u.economico}</span>}
                    <span style={{fontSize: mobile ? 13 : 9,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.marca} {u.modelo} {u.anio}</span>
                  </div>
                  <div style={{fontSize:dropSubFont,color:C.t3,fontFamily:"'Courier New',monospace",marginTop:2}}>
                    {u.placa && <span>Placa {u.placa} · </span>}
                    <span>{u.vin.slice(-8)}</span>
                  </div>
                </div>
                <StatusBadge sid={u.statusOp} meta={UNIT_STATUS} small/>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── TIMELINE COMPONENT ───────────────────────────────────────────────────────
const Timeline = React.memo(function Timeline({events, active=false, mobile=false}) {
  const C = React.useContext(ThemeCtx);
  if(!events||!events.length) return <div style={{padding:"8px 12px",fontSize:9,color:C.t3}}>Sin eventos registrados.</div>;

  const parseTS = ts => { try { return new Date(ts); } catch { return null; } };
  const fmtDelta = ms => {
    const min = Math.round(ms/60000);
    if(min < 1)  return "+&lt;1 min";
    if(min < 60) return `+${min} min`;
    const h = Math.floor(min/60), m = min%60;
    return m > 0 ? `+${h}h ${m}min` : `+${h}h`;
  };
  const fmtTotal = ms => {
    const min = Math.round(ms/60000);
    if(min < 60) return `${min} min`;
    const h = Math.floor(min/60), m = min%60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const parsed = events.map(ev => ({...ev, date: parseTS(ev.ts)}));
  const first  = parsed[0]?.date;
  const last   = parsed[parsed.length-1]?.date;
  const totalMs = (first && last && last > first) ? last - first : 0;

  // If ticket still active, show time since last event
  const nowMs  = Date.now();
  const sinceLastMs = last ? nowMs - last.getTime() : 0;
  const sinceLastMin = Math.round(sinceLastMs / 60000);

  const dotSize   = mobile ? 10 : 8;
  const tsFont    = mobile ? 11 : 8;
  const evFont    = mobile ? 13 : 10;
  const actFont   = mobile ? 11 : 8;
  const deltaFont = mobile ? 10 : 8;
  const pad       = mobile ? "10px 14px" : "6px 12px";

  return (
    <div style={{padding:pad}}>
      {parsed.map((ev, i)=>{
        const prevDate = i > 0 ? parsed[i-1].date : null;
        const deltaMs  = (prevDate && ev.date && ev.date > prevDate) ? ev.date - prevDate : 0;
        return (
          <div key={i}>
            {/* Delta entre eventos */}
            {i > 0 && deltaMs > 0 && (
              <div style={{display:"flex",alignItems:"center",gap:6,margin:`${mobile?4:2}px 0 ${mobile?4:2}px ${Math.floor(dotSize/2)}px`}}>
                <div style={{width:1,height:mobile?18:14,background:C.border}}/>
                <span style={{fontSize:deltaFont,color:C.t3,fontFamily:"'Courier New',monospace",
                  background:C.bg3,padding:"1px 5px",borderRadius:3,border:`1px solid ${C.border}`}}
                  dangerouslySetInnerHTML={{__html:fmtDelta(deltaMs)}}/>
              </div>
            )}
            <div style={{display:"flex",gap:mobile?12:10,alignItems:"flex-start"}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                <div style={{width:dotSize,height:dotSize,borderRadius:"50%",
                  background: i===parsed.length-1 ? (active?C.green:C.cyan) : C.cyan,
                  border:`1.5px solid ${i===parsed.length-1?(active?C.green:C.cyan):C.cyanDim}`,
                  boxShadow: i===parsed.length-1&&active?`0 0 6px ${C.green}88`:"none",
                  flexShrink:0,marginTop:2}}/>
                {i < parsed.length-1 && <div style={{width:1,flex:1,background:C.border,minHeight:mobile?18:12,marginTop:2}}/>}
              </div>
              <div style={{paddingBottom: i<parsed.length-1?(mobile?10:8):0, minWidth:0}}>
                <div style={{fontSize:tsFont,color:C.t3,fontFamily:"'Courier New',monospace",marginBottom:1}}>{fmtTS(ev.ts)}</div>
                <div style={{fontSize:evFont,color:C.t1,lineHeight:1.3,fontWeight:500}}>{ev.evento}</div>
                {ev.actor&&<div style={{fontSize:actFont,color:C.t2,marginTop:1}}>by {ev.actor}</div>}
              </div>
            </div>
          </div>
        );
      })}

      {/* Tiempo activo si sigue en proceso */}
      {active && sinceLastMin > 0 && (
        <div style={{display:"flex",alignItems:"center",gap:6,margin:`${mobile?4:2}px 0 ${mobile?8:6}px ${Math.floor(dotSize/2)}px`}}>
          <div style={{width:1,height:mobile?18:14,background:C.border}}/>
          <span style={{fontSize:deltaFont,color:C.green,fontFamily:"'Courier New',monospace",
            background:`${C.green}12`,padding:"1px 5px",borderRadius:3,border:`1px solid ${C.green}33`,
            animation:"pulse 2s infinite"}}>
            +{sinceLastMin < 60 ? `${sinceLastMin} min` : `${Math.floor(sinceLastMin/60)}h ${sinceLastMin%60}min`} · en curso
          </span>
        </div>
      )}

      {/* Total */}
      {totalMs > 0 && (
        <div style={{marginTop:mobile?12:8,padding:mobile?"8px 12px":"5px 8px",
          background:C.bg3,border:`1px solid ${C.border}`,borderRadius:mobile?8:4,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:mobile?11:8,color:C.t3,letterSpacing:"0.08em",textTransform:"uppercase"}}>Tiempo total</span>
          <span style={{fontSize:mobile?13:9,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{fmtTotal(totalMs)}</span>
        </div>
      )}
    </div>
  );
})

// ═══════════════════════════════════════════════════════════════════════════════
// L9 — MODULES
// ═══════════════════════════════════════════════════════════════════════════════

// ── CENTRO DE OPERACIONES (Dashboard) ────────────────────────────────────────
function CentroOps({state}) {
  const C = React.useContext(ThemeCtx);
  const {tickets,clients,suppliers,units} = state;
  // Use shared selectors — business rules defined once in L3.5
  const active   = useMemo(()=>sel_active(tickets),[tickets]);
  const operados = useMemo(()=>sel_operados(tickets),[tickets]);
  const revenueOp   = useMemo(()=>sumSnap(operados,"precioConIVA"),[operados]);
  const utilidadOp  = useMemo(()=>sumSnap(operados,"uNeta"),[operados]);
  const uBrutaOp    = useMemo(()=>sumSnap(operados,"uBruta"),[operados]);
  const costoOp     = useMemo(()=>sumSnap(operados,"costoTotal"),[operados]);
  const costoProducto = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap?.costoBase)*(1+safeNumber(t.snap?.params?.iva,16)/100),0),[operados]);
  const gastosOp    = useMemo(()=>sumSnap(operados,"gastos"),[operados]);
  const totalInv    = costoProducto;
  const ivaNetoOp   = useMemo(()=>sumSnap(operados,"ivaNeto"),[operados]);
  const isrOp       = useMemo(()=>sumSnap(operados,"isr"),[operados]);
  const cargaFiscal = ivaNetoOp + isrOp;
  const margenOp    = revenueOp>0?(utilidadOp/revenueOp)*100:0;
  const eficienciaFiscal = uBrutaOp>0?(utilidadOp/uBrutaOp)*100:0;
  const roi         = totalInv>0?(utilidadOp/totalInv)*100:0;
  const markupProm  = useMemo(()=>{const v=operados.filter(t=>safeNumber(t.snap?.costoTotal)>0);return v.length>0?v.reduce((s,t)=>s+calcMarkup((t.snap?.precioSinIVA||0),(t.snap?.costoTotal||0)),0)/v.length:0;},[operados]);

  // ── LAYER 2: CASH — solo cobrado/cerrado ───────────────────────────────────
  const cobrados    = useMemo(()=>sel_cobrados(tickets),[tickets]);
  const cashTotal   = useMemo(()=>sumSnap(cobrados,"precioConIVA"),[cobrados]);
  const cashNeta    = useMemo(()=>sumSnap(cobrados,"uNeta"),[cobrados]);

  // ── LAYER 3: CARTERA — shared selector (business rule defined once) ─────────
  const cartera     = useMemo(()=>sel_cartera(tickets),[tickets]);
  const carteraMonto= useMemo(()=>sumSnap(cartera,"precioConIVA"),[cartera]);
  const cxp         = useMemo(()=>cartera.reduce((s,t)=>s+safeNumber(t.snap?.costoTotal),0),[cartera]);
  const flujoOp     = carteraMonto - cargaFiscal - cxp;
  const vencidos    = useMemo(()=>sel_vencidos(tickets),[tickets]);

  // ── LAYER 4: FORECAST — cotizado+autorizado ────────────────────────────────
  const forecastTkts= useMemo(()=>sel_forecast(tickets),[tickets]);
  const forecastMonto=useMemo(()=>sumSnap(forecastTkts,"precioConIVA"),[forecastTkts]);
  const forecastUtil= useMemo(()=>forecastTkts.reduce((s,t)=>s+utilidadPonderada(safeNumber(t.snap?.uNeta),t.prob),0),[forecastTkts]);
  const cotizados   = useMemo(()=>forecastTkts.filter(t=>t.status==="cotizado"),[forecastTkts]);
  const autorizados = useMemo(()=>forecastTkts.filter(t=>t.status==="autorizado"),[forecastTkts]);

  // ── OPERATIONAL ────────────────────────────────────────────────────────────
  const totalHoras  = useMemo(()=>active.reduce((s,t)=>s+safeNumber(t.horasOp),0),[active]);
  const uPorHora    = totalHoras>0?utilidadOp/totalHoras:0;
  const uPH         = uPorHora;
  const p1Active    = useMemo(()=>active.filter(t=>t.priority==="P1"&&!CLOSED_SET.has(t.status)),[active]);

  // By category — only operados
  const byOp = useMemo(()=>OP_TYPES.map(op=>{
    const sub=operados.filter(t=>t.opId===op.id);
    return{label:op.label,short:op.short,count:sub.length,neta:sub.reduce((s,t)=>s+safeNumber(t.snap?.uNeta),0),fact:sub.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0)};
  }).sort((a,b)=>b.neta-a.neta),[operados]);
  const maxByOp = Math.max(...byOp.map(o=>o.neta),1);

  // Top clientes — only operados
  const topClients = useMemo(()=>clients.map(c=>{
    const co=operados.filter(t=>t.clientId===c.id);
    return{label:c.empresa,neta:co.reduce((s,t)=>s+safeNumber(t.snap?.uNeta),0),fact:co.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0),count:co.length};
  }).filter(c=>c.count>0).sort((a,b)=>b.neta-a.neta).slice(0,5),[operados,clients]);
  const maxClient = Math.max(...topClients.map(c=>c.neta),1);

  // Legacy aliases for existing UI code below
  const realizados = operados;
  const totalFact  = revenueOp;
  const totalNeta  = utilidadOp;
  const rentabilidadProm = margenOp;
  const ivaNetoTotal = ivaNetoOp;
  const isrTotal = isrOp;
  const cargaFiscalTotal = cargaFiscal;
  const carteraPend = carteraMonto;
  const forecast = forecastUtil;
  const eficienciaFiscalGlobal = eficienciaFiscal;
  const utilidadBrutaTotal = uBrutaOp;
  // Additional derived vars used in UI
  const pctNeta    = revenueOp > 0 ? (utilidadOp / revenueOp) * 100 : 0;
  const abiertas   = useMemo(()=>active.filter(t=>!CLOSED_SET.has(t.status)),[active]);
  const cobradas   = useMemo(()=>active.filter(t=>PAID_SET.has(t.status)),[active]);
  const conversion = active.length > 0 ? (cobradas.length / active.length) * 100 : 0;

  // Aging cartera — only entregado/facturado credit tickets with past promesaPago
  const aging = useMemo(()=>{
    const pend=tickets.filter(t=>CARTERA_SET.has(t.status)&&t.payType==="credit"&&!t._deleted&&t.promesaPago);
    const bucket=(mn,mx)=>pend.filter(t=>{const d=parseDateMX(t.promesaPago);if(!d)return false;const ms=Date.now()-d.getTime();return ms>=mn*86400000&&(mx==null||ms<mx*86400000);}).reduce((s,t)=>s+(t.snap?.precioConIVA||0),0);
    return{a30:bucket(0,30),a60:bucket(30,60),mas60:bucket(60,null)};
  },[tickets]);

  // Top proveedores — only operados (exclude cancelled, _deleted)
  const topSupp = useMemo(()=>suppliers.map(s=>{
    const so=operados.filter(t=>t.supplierId===s.id);
    return{label:s.nombre,neta:so.reduce((acc,t)=>acc+(t.snap?.uNeta||0),0),count:so.length};
  }).filter(s=>s.count>0).sort((a,b)=>b.neta-a.neta).slice(0,4),[operados,suppliers]);

  // Eficiencia
  const eficientes = useMemo(()=>tickets.filter(t=>t.horasOp>0).map(t=>({titulo:t.titulo,uPH:(t.snap?.uNeta||0)/t.horasOp,uNeta:t.snap?.uNeta||0,horas:t.horasOp})).sort((a,b)=>b.uPH-a.uPH).slice(0,4),[tickets]);

  return (
    <div style={{padding:"10px 13px",maxWidth:1300,margin:"0 auto"}}>

      {/* Alertas */}
      {(p1Active.length>0||vencidos.length>0)&&(
        <div style={{marginBottom:8,display:"flex",flexDirection:"column",gap:4}}>
          {p1Active.length>0&&(
            <div style={{background:C.p1dim,border:`1px solid ${C.p1}55`,borderRadius:3,padding:"5px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:9,color:C.p1dot,fontWeight:700}}>P1 ACTIVO — {p1Active.length} ticket{p1Active.length>1?"s":""} / unidad detenida</span>
              <span style={{fontSize:8,color:C.p1dot}}>{p1Active.map(t=>t.id).join(" / ")}</span>
            </div>
          )}
          {vencidos.length>0&&(
            <div style={{background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:3,padding:"5px 10px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:9,color:"#C04040",fontWeight:700}}>CARTERA VENCIDA — {vencidos.length} op. / {mxn(vencidos.reduce((s,t)=>s+(t.snap?.precioConIVA||0),0))}</span>
              <span style={{fontSize:8,color:"#C04040"}}>{vencidos.map(t=>t.id).join(" / ")}</span>
            </div>
          )}
        </div>
      )}

      {/* KPI fila 1 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:5}}>
        <KPI label="Realizado (entregado+)"   value={mxn(totalFact)}   color={C.cyan}   accent/>
        <KPI label="Utilidad neta"     value={mxn(totalNeta)}   color={totalNeta>=0?C.green:C.red} sub={fpct(pctNeta)+" del facturado"}/>
        <KPI label="Cartera pendiente" value={mxn(carteraPend)} color={C.yellow} alert={vencidos.length>0} sub={vencidos.length>0?vencidos.length+" vencida"+(vencidos.length>1?"s":""):""}/>
        <KPI label="Forecast"          value={mxn(forecast)}    color={C.cyan}   sub="Hasta estado Transito"/>
      </div>

      {/* KPI fila 2 */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:8}}>
        <KPI label="Tickets abiertos" value={String(abiertas.length)} color={C.t1}/>
        <KPI label="Conversion"       value={fpct(conversion)}        color={conversion>=60?C.green:C.yellow} sub="cierre / total"/>
        <KPI label="Rentabilidad neta"     value={fpct(rentabilidadProm)}        color={margenColor(rentabilidadProm)} sub="neto s/precio"/>
        <KPI label="Util / hora"      value={totalHoras>0?mxn(uPorHora):"---"} color={C.cyan} sub={totalHoras>0?totalHoras.toFixed(1)+"h registradas":""}/>
      </div>

      {/* 3 columnas principales */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:7}}>

        {/* Col 1: Por categoria */}
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
          <SHdr title="UTILIDAD POR CATEGORIA"/>
          {byOp.filter(o=>o.count>0).length===0
            ?<EmptyState icon="&#128202;" title="Sin datos"/>
            :byOp.filter(o=>o.count>0).map(op=>(
              <div key={op.short} style={{padding:"5px 11px",borderBottom:`1px solid ${C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:1}}>
                  <span style={{fontSize:9,color:C.t2}}>{op.label} <span style={{fontSize:7,color:C.t3}}>({op.count})</span></span>
                  <span style={{fontSize:9,fontWeight:700,color:op.neta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(op.neta)}</span>
                </div>
                <MiniBar value={op.neta} max={maxByOp} color={C.cyanDim}/>
                <div style={{fontSize:7,color:C.t3,marginTop:1}}>Fact: {mxn(op.fact)}</div>
              </div>
            ))
          }
        </div>

        {/* Col 2: Top clientes + Aging */}
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
            <SHdr title="TOP CLIENTES — UTILIDAD"/>
            {topClients.length===0
              ?<EmptyState icon="&#127970;" title="Vincula clientes a tickets"/>
              :topClients.map((c,i)=>(
                <div key={i} style={{padding:"5px 11px",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:1}}>
                    <span style={{fontSize:9,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60%"}}>{c.label}</span>
                    <span style={{fontSize:9,fontWeight:700,color:c.neta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(c.neta)}</span>
                  </div>
                  <MiniBar value={c.neta} max={maxClient} color={C.greenDim}/>
                </div>
              ))
            }
          </div>
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
            <SHdr title="AGING CARTERA"/>
            {[["< 30 dias",aging.a30,C.green],["30-60 dias",aging.a60,C.yellow],["> 60 dias",aging.mas60,C.red]].map(([lbl,val,col],i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 11px",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:9,color:C.t2}}>{lbl}</span>
                <span style={{fontSize:9,fontWeight:700,color:col,fontFamily:"'Courier New',monospace"}}>{mxn(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Top proveedores + Eficiencia */}
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
            <SHdr title="TOP PROVEEDORES"/>
            {topSupp.length===0
              ?<EmptyState icon="&#127981;" title="Vincula proveedores a tickets"/>
              :topSupp.map((s,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 11px",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>
                    <div style={{fontSize:9,color:C.t2}}>{s.label}</div>
                    <div style={{fontSize:7,color:C.t3}}>{s.count} ops</div>
                  </div>
                  <span style={{fontSize:9,fontWeight:700,color:s.neta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(s.neta)}</span>
                </div>
              ))
            }
          </div>
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
            <SHdr title="EFICIENCIA — UTIL/HORA"/>
            {eficientes.length===0
              ?<EmptyState icon="&#9201;" title="Registra horas en tickets"/>
              :eficientes.map((e,i)=>(
                <div key={i} style={{padding:"5px 11px",borderBottom:`1px solid ${C.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:8,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"65%"}}>{e.titulo}</span>
                    <span style={{fontSize:9,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(e.uPH)}/h</span>
                  </div>
                  <div style={{fontSize:7,color:C.t3,marginTop:1}}>{mxn(e.uNeta)} · {e.horas}h</div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Pipeline strip — ancho completo */}
      <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",marginBottom:7}}>
        <SHdr title="DISTRIBUCION PIPELINE"/>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${TICKET_ALL.length},1fr)`}}>
          {TICKET_ALL.map(sid=>{
            const s=TICKET_META[sid];
            const count=tickets.filter(t=>t.status===sid).length;
            return (
              <div key={sid} style={{padding:"7px 3px",textAlign:"center",borderRight:`1px solid ${C.border}`}}>
                <div style={{fontSize:15,fontWeight:800,color:count>0?s.dot:C.t3,fontFamily:"'Courier New',monospace",lineHeight:1}}>{count}</div>
                <div style={{fontSize:6,color:C.t3,marginTop:2,lineHeight:1.3}}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen financiero — 3 bloques separados */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:7}}>

        {/* BLOQUE 1 — OPERACIÓN */}
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,padding:10}}>
          <SHdr title="OPERACIÓN REALIZADA"/>
          <div style={{fontSize:7,color:C.t3,marginBottom:6}}>Entregado · Facturado · Cobrado · {operados.length} tickets</div>
          {[
            ["Revenue operado",   mxn(revenueOp),  C.cyan],
            ["Costo producto",    mxn(costoProducto), C.t2],
            ["Gastos operativos", mxn(gastosOp),   C.t2],
            ["Costo total",       mxn(costoOp),    C.t2],
            ["Utilidad operativa",mxn(utilidadOp), utilidadOp>=0?C.green:C.red],
            ["Margen neto",       fpct(margenOp),  margenColor(margenOp)],
            ["Markup promedio",   fpct(markupProm),C.blueHi],
            ["ROI operativo",     fpct(roi),        roi>=25?C.green:C.yellow],
            ["IVA neto SAT",      mxn(ivaNetoOp),  C.yellow],
            ["ISR estimado",      mxn(isrOp),       C.yellow],
            ["Carga fiscal",      mxn(cargaFiscal), C.red],
            ["Eficiencia fiscal", fpct(eficienciaFiscal),eficienciaFiscal>=75?C.green:C.yellow],
          ].map(([lbl,val,col],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:8,color:C.t3}}>{lbl}</span>
              <span style={{fontSize:10,fontWeight:800,color:col,fontFamily:"'Courier New',monospace"}}>{val}</span>
            </div>
          ))}
        </div>

        {/* BLOQUE 2 — COBRANZA */}
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,padding:10}}>
          <SHdr title="COBRANZA"/>
          <div style={{fontSize:7,color:C.t3,marginBottom:6}}>Cash recibido vs cartera pendiente</div>
          {[
            ["Cash cobrado",     mxn(cashTotal),    C.green],
            ["Util. sobre cobrado",mxn(cashNeta),   C.green],
            ["Cartera pendiente",mxn(carteraMonto), C.yellow],
            ["Vencidas",         String(vencidos.length)+" tickets", vencidos.length>0?C.red:C.t3],
            ["CxP proveedores",  mxn(cxp),          C.t2],
            ["Flujo operativo",  mxn(flujoOp),      flujoOp>=0?C.green:C.red],
          ].map(([lbl,val,col],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:8,color:C.t3}}>{lbl}</span>
              <span style={{fontSize:10,fontWeight:800,color:col,fontFamily:"'Courier New',monospace"}}>{val}</span>
            </div>
          ))}
          <div style={{marginTop:8,fontSize:7,color:C.t3}}>DESGLOSE CARTERA</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginTop:4}}>
            <KPI label="Por cobrar" value={String(cartera.length)} sub="tickets"/>
            <KPI label="Cobrados" value={String(cobrados.length)} sub="tickets"/>
          </div>
        </div>

        {/* BLOQUE 3 — FORECAST */}
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,padding:10}}>
          <SHdr title="FORECAST / PIPELINE"/>
          <div style={{fontSize:7,color:C.t3,marginBottom:6}}>Cotizado + Autorizado — NO contamina revenue</div>
          {[
            ["Cotizados",        String(cotizados.length)+" tickets",  C.t2],
            ["Autorizados",      String(autorizados.length)+" tickets",C.cyan],
            ["Revenue forecast", mxn(forecastMonto),                   C.cyan],
            ["Util. forecast",   mxn(forecastUtil),                    C.blueHi],
          ].map(([lbl,val,col],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:8,color:C.t3}}>{lbl}</span>
              <span style={{fontSize:10,fontWeight:800,color:col,fontFamily:"'Courier New',monospace"}}>{val}</span>
            </div>
          ))}
          <div style={{marginTop:8}}>
            <KPI label="P1 abiertos" value={String(p1Active.length)} color={p1Active.length>0?C.red:C.t3}/>
          </div>
        </div>
      </div>

      {/* Fila inferior: categorías + prioridades */}
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:7}}>
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,padding:10}}>
          <SHdr title="RESUMEN RÁPIDO"/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginTop:8}}>
            {[["Revenue op.",mxn(revenueOp),C.cyan],["Cash cobrado",mxn(cashTotal),C.green],["Cartera",mxn(carteraMonto),C.yellow],["Util. operativa",mxn(utilidadOp),utilidadOp>=0?C.green:C.red],["Forecast",mxn(forecastMonto),C.t2]].map(([lbl,val,col],i)=>(
              <div key={i} style={{padding:"5px 8px",background:C.bg2,borderRadius:3,border:`1px solid ${C.border}`}}>
                <div style={{fontSize:7,color:C.t3,marginBottom:2}}>{lbl}</div>
                <div style={{fontSize:12,fontWeight:800,color:col,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Prioridades */}
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",minWidth:220}}>
          <SHdr title="PRIORIDADES"/>
          {Object.values(PRIORITY).map(pr=>{
            const count=tickets.filter(t=>t.priority===pr.id).length;
            const open=tickets.filter(t=>t.priority===pr.id&&!CLOSED_SET.has(t.status)).length;
            return (
              <div key={pr.id} style={{display:"flex",gap:8,padding:"6px 12px",borderBottom:`1px solid ${C.border}`,alignItems:"center"}}>
                <PriorityBadge pid={pr.id} small/>
                <div style={{fontSize:9,color:C.t2,whiteSpace:"nowrap"}}>{count} total</div>
                <div style={{fontSize:9,fontWeight:700,color:open>0?pr.dot:C.t3,fontFamily:"'Courier New',monospace",marginLeft:"auto"}}>{open} abiertos</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── TICKETS (pipeline operativo) ─────────────────────────────────────────────
function Tickets({state,dispatch,toast,scheduleHardDelete}) {
  const C = React.useContext(ThemeCtx);
  const {tickets,clients,suppliers,units} = state;
  const [fStatus, setFStatus] = useState("all");
  const [fPrio,   setFPrio]   = useState("all");
  const [search,  setSearch]  = useState("");
  const [expId,   setExpId]   = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [tlInput, setTlInput] = useState({evento:"",actor:"Operador"});
  const dSearch = useDebounce(search, 250);

  const filtered = useMemo(()=>tickets.filter(t=>{
    if(fStatus!=="all"&&t.status!==fStatus) return false;
    if(fPrio!=="all"&&t.priority!==fPrio)   return false;
    if(dSearch){const lq=safeLower(dSearch);if(!safeLower(t.titulo).includes(lq)&&!safeLower(t.id).includes(lq))return false;}
    return true;
  }),[tickets,fStatus,fPrio,dSearch]);

  const moveStatus=(id,to)=>{
    const t=tickets.find(t=>t.id===id);
    if(!t||!canTransition(t.status,to)){toast("Transicion no permitida","error");return;}
    dispatch({type:"TKT_STATUS",id,to});
    toast(TICKET_META[to].label,"info");
  };

  const addTlEvent=(id)=>{
    if(!tlInput.evento.trim()) return;
    dispatch({type:"TKT_TIMELINE",id,evento:tlInput.evento,actor:tlInput.actor});
    setTlInput({evento:"",actor:"Operador"});
    toast("Evento registrado","success");
  };

  return (
    <div style={{padding:"10px 13px",maxWidth:1200,margin:"0 auto"}}>
      {confirm&&<Confirm msg={"Eliminar ticket: "+confirm.titulo+"?"} onConfirm={()=>{
        const id=confirm.id;
        dispatch({type:"TKT_SOFT_DEL",id});
        scheduleHardDelete(id);
        toast("Ticket a papelera — restaurable","info");
        setConfirm(null);setExpId(null);
      }} onCancel={()=>setConfirm(null)}/>}

      {/* Filtros */}
      <div style={{display:"flex",gap:5,marginBottom:7,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar ticket o ID..."
          style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 8px",color:C.t1,fontSize:10,outline:"none",width:180,fontFamily:"'Courier New',monospace"}}/>
        <select value={fPrio} onChange={e=>setFPrio(e.target.value)} style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t1,fontSize:10,outline:"none",cursor:"pointer"}}>
          <option value="all">Todas las prioridades</option>
          {Object.values(PRIORITY).map(p=><option key={p.id} value={p.id} style={{background:C.bg1}}>{p.id} — {p.label}</option>)}
        </select>
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t1,fontSize:10,outline:"none",cursor:"pointer"}}>
          <option value="all">Todos los estados</option>
          {TICKET_ALL.map(id=><option key={id} value={id} style={{background:C.bg1}}>{TICKET_META[id].label}</option>)}
        </select>
        <span style={{fontSize:8,color:C.t3}}>{filtered.length} resultado{filtered.length!==1?"s":""}</span>
      </div>

      <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"24px 1.8fr 0.5fr 0.7fr 0.7fr 0.8fr 0.7fr 0.6fr 22px",padding:"4px 9px",borderBottom:`1px solid ${C.border}`,fontSize:7,color:C.t3,letterSpacing:"0.1em",gap:4}}>
          <span/>
          <span>ID / TITULO</span><span>TIPO</span><span>PRIORIDAD</span><span>ESTADO</span>
          <span>PRECIO</span><span>UTIL.</span><span>PAGO</span><span/>
        </div>
        {filtered.length===0&&<EmptyState icon="&#128203;" title="Sin tickets" sub="Registra un nuevo ticket desde el Cotizador"/>}
        {filtered.map((t,i)=>{
          const exp=expId===t.id;
          const cl=clients.find(c=>c.id===t.clientId);
          const un=units.find(u=>u.id===t.unitId);
          const allowed=TICKET_TRANSITIONS[t.status]||[];
          const venc=t.promesaPago&&!t.cobrado&&parseDateMX(t.promesaPago)&&new Date()>parseDateMX(t.promesaPago);
          const pr=PRIORITY[t.priority]||PRIORITY.P4;
          return (
            <div key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
              <div onClick={()=>setExpId(exp?null:t.id)}
                style={{display:"grid",gridTemplateColumns:"24px 1.8fr 0.5fr 0.7fr 0.7fr 0.8fr 0.7fr 0.6fr 22px",padding:"6px 9px",background:exp?C.blueDim:i%2===0?C.bg1:C.bg2,cursor:"pointer",gap:4,alignItems:"center",borderLeft:`3px solid ${pr.dot}`}}>
                <div/>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:8,fontWeight:700,color:C.t1,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.id}</div>
                  <div style={{fontSize:9,color:C.cyan,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</div>
                  <div style={{fontSize:7,color:C.t3}}>{t.date}{cl?" · "+cl.empresa:""}{un?" · "+un.marca+" "+un.modelo:""}</div>
                </div>
                <div style={{fontSize:8,color:C.t2,fontFamily:"'Courier New',monospace"}}>{t.opShort}</div>
                <PriorityBadge pid={t.priority} small/>
                <StatusBadge sid={t.status} meta={TICKET_META} small/>
                <div style={{fontSize:9,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{mxn(t.snap?.precioConIVA||0)}</div>
                <div style={{fontSize:9,fontWeight:700,color:(t.snap?.uNeta||0)>=0?C.green:C.red,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{mxn(t.snap?.uNeta||0)}</div>
                <div>
                  <div style={{fontSize:7,color:t.payType==="credit"?C.yellow:C.t3}}>{t.payType==="credit"?"CRED":"CONT"}</div>
                  {venc&&<div style={{fontSize:7,color:C.red,fontWeight:700}}>VENC</div>}
                </div>
                <div style={{fontSize:9,color:C.t3,textAlign:"center"}}>{exp?"^":"v"}</div>
              </div>

              {exp&&(
                <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
                    {/* Timeline */}
                    <div style={{borderRight:`1px solid ${C.border}`}}>
                      <SHdr title={`TIMELINE · ${(t.timeline||[]).length} EVENTOS`}/>
                      <Timeline events={t.timeline||[]} active={!CLOSED_SET.has(t.status)&&t.status!=="cancelado"}/>
                      {/* Agregar evento */}
                      <div style={{padding:"6px 10px",borderTop:`1px solid ${C.border}`,display:"flex",gap:5}}>
                        <input value={tlInput.evento} onChange={e=>setTlInput(p=>({...p,evento:e.target.value}))} placeholder="Nuevo evento..."
                          style={{flex:1,background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t1,fontSize:9,outline:"none",fontFamily:"inherit"}}/>
                        <input value={tlInput.actor} onChange={e=>setTlInput(p=>({...p,actor:e.target.value}))} placeholder="Actor"
                          style={{width:80,background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t2,fontSize:9,outline:"none",fontFamily:"inherit"}}/>
                        <button onClick={()=>addTlEvent(t.id)} style={{padding:"4px 9px",background:C.blue,border:"none",borderRadius:3,color:C.t1,fontSize:9,cursor:"pointer",fontWeight:600}}>+</button>
                      </div>
                    </div>
                    {/* Detalles + acciones */}
                    <div>
                      <SHdr title="DETALLE FINANCIERO"/>
                      <div style={{padding:"6px 10px"}}>
                        {[["Costo total",mxn(t.snap?.costoTotal||0),C.t1],["Markup",fpct(calcMarkup(t.snap?.precioSinIVA||0,t.snap?.costoTotal||0)),C.blueHi],["Precio c/IVA",mxn(t.snap?.precioConIVA||0),C.cyan],["IVA neto SAT",mxn(t.snap?.ivaNeto||0),C.yellow],["Util. bruta",mxn(t.snap?.uBruta||0),C.t1],["ISR",mxn(t.snap?.isr||0),C.yellow],["Util. neta",mxn(t.snap?.uNeta||0),(t.snap?.uNeta||0)>=0?C.green:C.red],["Margen neto",fpct(t.snap?.margenNetoPrecio||0),margenColor(t.snap?.margenNetoPrecio||0)]].map(([lbl,val,col],j)=>(
                          <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",borderBottom:`1px solid ${C.border}`}}>
                            <span style={{fontSize:8,color:C.t2}}>{lbl}</span>
                            <span style={{fontSize:9,fontWeight:600,color:col,fontFamily:"'Courier New',monospace"}}>{val}</span>
                          </div>
                        ))}
                        {t.notes&&<div style={{marginTop:5,fontSize:8,color:C.t3,fontStyle:"italic",lineHeight:1.4}}>"{t.notes}"</div>}
                        {t.promesaPago&&<div style={{marginTop:4,fontSize:8,color:venc?C.red:C.yellow}}>Promesa: {t.promesaPago}{venc?" (VENCIDA)":""}</div>}
                      </div>
                      <SHdr title="MOVER A ESTADO"/>
                      <div style={{padding:"6px 10px",display:"flex",gap:3,flexWrap:"wrap",alignItems:"center"}}>
                        {allowed.map(to=>{const s=TICKET_META[to];return(
                          <button key={to} onClick={e=>{e.stopPropagation();moveStatus(t.id,to);}}
                            style={{padding:"2px 7px",borderRadius:2,border:`1px solid ${s.dot}44`,background:s.color+"22",color:s.dot,fontSize:7,cursor:"pointer",fontWeight:600}}>
                            {s.label}
                          </button>
                        );})}
                        {allowed.length===0&&<span style={{fontSize:8,color:C.t3}}>Estado final</span>}
                      </div>
                      <div style={{padding:"4px 10px 8px",display:"flex",gap:5}}>
                        {t.payType==="credit"&&!t.cobrado&&(
                          <button onClick={()=>{dispatch({type:"TKT_COBRADO",id:t.id});toast("Marcado como cobrado","success");}}
                            style={{padding:"3px 10px",background:C.greenDim,border:`1px solid ${C.green}44`,borderRadius:3,color:C.green,fontSize:9,cursor:"pointer",fontWeight:600}}>
                            Cobrado
                          </button>
                        )}
                        <button onClick={e=>{e.stopPropagation();const cl=clients.find(c=>c.id===t.clientId);const un=units.find(u=>u.id===t.unitId);const supp=suppliers.find(s=>s.id===t.supplierId);generarCotizacionPDF(t,cl,un,supp);}}
                          style={{padding:"3px 10px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,fontSize:9,cursor:"pointer",fontWeight:600}}>
                          Cotizacion PDF
                        </button>
                        <button onClick={e=>{e.stopPropagation();setConfirm(t);}}
                          style={{padding:"3px 8px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:3,color:C.red,fontSize:8,cursor:"pointer",fontWeight:700,marginLeft:"auto"}}>
                          x Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── COTIZADOR ────────────────────────────────────────────────────────────────
const emptyLine = (opType, priority, activeMods) => {
  const mg = effectiveMargin(opType||"consumable", priority||"P3", activeMods||[], false, 27);
  return {
    key:         genId("TOAST"),
    titulo:      "",
    partRef:     "",
    qty:         1,
    costoUnit:   0,
    gasolina:    0,
    otros:       0,
    mode:        "auto",
    manualPrice: "0",
    customMgn:   false,
    customVal:   mg,
  };
};

function Cotizador({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {clients,suppliers,units} = state;

  // Ticket-level fields
  const [opType,    setOpType]    = useState("consumable");
  const [priority,  setPriority]  = useState("P3");
  const [activeMods,setActiveMods]= useState([]);
  const [customMgn, setCustomMgn] = useState(false);
  const [customVal, setCustomVal] = useState(27);
  const [fecha,     setFecha]     = useState(todayMX());
  const [clientId,  setClientId]  = useState("");
  const [supplierId,setSupplierId]= useState("");
  const [unitId,    setUnitId]    = useState("");
  const [status,    setStatus]    = useState("recibido");
  const [payType,   setPayType]   = useState("contado");
  const [promesa,   setPromesa]   = useState("");
  const [prob,      setProb]      = useState("high");
  const [horasOp,   setHorasOp]   = useState(0);
  const [notes,     setNotes]     = useState("");
  const [iva,       setIva]       = useState(16);
  const [isr,       setIsr]       = useState(20);
  const [cIVA,      setCIVA]      = useState(true);
  const [vIVA,      setVIVA]      = useState(true);
  // Multi-line
  const [lineas,    setLineas]    = useState([emptyLine("consumable","P3",[])]);
  const [pdfPending, setPdfPending] = useState(null); // {tkt,cl,un,supp}
  const [catalogSearch, setCatalogSearch] = useState(null); // idx of line being searched
  const opMeta = useMemo(()=>OP_TYPES.find(o=>o.id===opType)||OP_TYPES[0],[opType]);
  const pr     = useMemo(()=>PRIORITY[priority]||PRIORITY.P3,[priority]);

  // Shared margin from ticket-level modifiers (applied to all lines in Auto mode)
  const sharedMargin = useMemo(()=>effectiveMargin(opType,priority,activeMods,customMgn,customVal),[opType,priority,activeMods,customMgn,customVal]);
  const capped = useMemo(()=>{
    const op=opMeta; const base=Math.round((op.baseMin+op.baseMax)/2)+pr.marginBonus;
    const raw=base+activeMods.reduce((s,id)=>{const m=MODIFIERS.find(m=>m.id===id);return s+(m?m.pct:0);},0);
    return !customMgn&&raw>op.cap;
  },[opMeta,pr,activeMods,customMgn]);

  const toggleMod = useCallback(id=>setActiveMods(p=>p.includes(id)?p.filter(x=>x!==id):p.length>=4?p:[...p,id]),[]);

  // Each line uses sharedMargin unless it has its own customMgn
  const lineSnaps = useMemo(()=>lineas.map(l=>{
    const mg      = l.customMgn ? Math.min(safeNumber(l.customVal), opMeta.cap) : sharedMargin;
    const qty     = l._qtyRaw!==undefined ? (parseInt(l._qtyRaw)||1) : (safeNumber(l.qty,1)||1);
    const costoU  = l._costoUnitRaw!==undefined ? safeNumber(l._costoUnitRaw) : safeNumber(l.costoUnit);
    const gasol   = l._gasolinaRaw!==undefined  ? safeNumber(l._gasolinaRaw)  : safeNumber(l.gasolina);
    const otros_  = l._otrosRaw!==undefined      ? safeNumber(l._otrosRaw)     : safeNumber(l.otros);
    const costo   = costoU * qty;
    return computeSnap({costo,gasolina:gasol,otros:otros_,iva,isr,
      compraConIVA:cIVA,ventaConIVA:vIVA,mode:l.mode||"manual",margin:mg,manualPrice:l.manualPrice||"0"});
  }),[lineas,sharedMargin,opMeta,iva,isr,cIVA,vIVA]);

  const totalSnap = useMemo(()=>{
    const sum=k=>lineSnaps.reduce((s,sn)=>s+safeNumber(sn[k]),0);
    const precioSinIVA=sum("precioSinIVA"), uNeta=sum("uNeta");
    return {
      precioConIVA:sum("precioConIVA"),precioSinIVA,
      costoTotal:sum("costoTotal"),costoBase:sum("costoBase"),gastos:sum("gastos"),
      uNeta,uBruta:sum("uBruta"),isr:sum("isr"),
      ivaTraslad:sum("ivaTraslad"),ivaAcred:sum("ivaAcred"),ivaNeto:sum("ivaNeto"),
      markupSobre:sum("costoTotal")>0?((precioSinIVA-sum("costoTotal"))/sum("costoTotal"))*100:0,
      margenNetoPrecio:precioSinIVA>0?(uNeta/precioSinIVA)*100:0,
      params:{iva,isr},
    };
  },[lineSnaps,iva,isr]);

  const aggMargen = totalSnap.precioSinIVA>0?(totalSnap.uNeta/totalSnap.precioSinIVA)*100:0;
  const mColor    = margenColor(aggMargen);
  const uEsp      = totalSnap.uNeta*(PROB.find(p=>p.id===prob)?.pct||90)/100;
  const uPH       = horasOp>0?totalSnap.uNeta/horasOp:null;

  const updateLinea = useCallback((idx,patch)=>setLineas(p=>p.map((l,i)=>i===idx?{...l,...patch}:l)),[]);
  const removeLinea = useCallback(idx=>setLineas(p=>p.filter((_,i)=>i!==idx)),[]);
  const addLinea    = useCallback(()=>setLineas(p=>[...p,emptyLine(opType,priority,activeMods)]),[opType,priority,activeMods]);

  // Reset custom margin when opType/priority changes (state update during render — safe pattern)
  const [lastOpKey, setLastOpKey] = useState(()=>opType+priority);
  const curOpKey = opType+priority;
  if(lastOpKey!==curOpKey){setLastOpKey(curOpKey);setCustomMgn(false);setActiveMods([]);}

  const [isSaving, setIsSaving] = useState(false);
  const save = useCallback(()=>{
    if(isSaving) return; // double-click guard
    const titulo = lineas.map(l=>l.titulo.trim()||"Sin descripcion").join(" / ");
    if(!titulo||titulo==="Sin descripcion") { toast("Agrega al menos un concepto","error"); return; }
    setIsSaving(true);
    const cl   = clients.find(c=>c.id===clientId);
    const un   = units.find(u=>u.id===unitId);
    const supp = suppliers.find(s=>s.id===supplierId);
    const lineasConSnap = lineas.map((l,i)=>({
      titulo:l.titulo||"Sin descripcion", partRef:l.partRef||"",
      qty:safeNumber(l.qty,1)||1, costoUnit:safeNumber(l.costoUnit),
      gasolina:safeNumber(l.gasolina), otros:safeNumber(l.otros),
      mode:l.mode||"manual", manualPrice:l.manualPrice||"0",
      descripcionPDF:l.descripcionPDF||"",
      snap:lineSnaps[i],
    }));
    const snapAgregado = {
      ...totalSnap,
      markupSobre:      totalSnap.costoTotal>0?((totalSnap.precioSinIVA-totalSnap.costoTotal)/totalSnap.costoTotal)*100:0,
      margenNetoPrecio: aggMargen,
    };
    const tkt = {
      id:mkTicketId(fecha), titulo, opId:opType, opShort:opMeta.short, priority,
      clientId, supplierId, unitId,
      partRef:lineas.map(l=>l.partRef).filter(Boolean).join(", "),
      date:fecha, status, payType,
      promesaPago:payType==="credit"?promesa:null,
      cobrado:PAID_SET.has(status),
      mods:[...activeMods], prob, horasOp:safeNumber(horasOp), notes,
      mode:lineas.length>1?"multilinea":"auto",
      lineas:lineasConSnap,
      snap:snapAgregado,
      timeline:[{ts:nowISO(),evento:"Ticket creado",actor:"Operador"}],
      history:[mkEvent("created",{titulo,status,priority})],
    };
    dispatch({type:"TKT_ADD",t:tkt});

    // ── Catálogo auto-sync silencioso ───────────────────────────────────
    lineas.forEach(l=>{
      if(!l.titulo||!l.titulo.trim()) return;
      const nomNorm=(l.titulo||"").trim().toLowerCase();
      const oem=(l.partRef||"").trim();
      const exists=state.parts.find(p=>
        (oem&&(oem===p.oem||oem===p.aftermarket))||
        p.nombre.toLowerCase()===nomNorm||
        (nomNorm.length>6&&p.nombre.toLowerCase().startsWith(nomNorm.slice(0,Math.floor(nomNorm.length*0.75))))
      );
      if(!exists&&(safeNumber(l.costoUnit)>0||oem)){
        dispatch({type:"PART_ADD",p:{
          id:mkPartId(),nombre:l.titulo.trim(),oem,aftermarket:"",
          aplicacion:un?`${un.marca} ${un.modelo} ${un.anio||""}`.trim():"",
          notas:`Auto: ${todayMX()}`,proveedor:supp?.nombre||"",
          ultimoPrecio:safeNumber(l.costoUnit),ultimaFecha:fecha,frecuencia:1,
        }});
      } else if(exists){
        const patch={frecuencia:(exists.frecuencia||1)+1};
        if(safeNumber(l.costoUnit)>0) patch.ultimoPrecio=safeNumber(l.costoUnit);
        if(fecha) patch.ultimaFecha=fecha;
        if(supp?.nombre) patch.proveedor=supp.nombre;
        dispatch({type:"PART_UPDATE",id:exists.id,patch});
      }
    });
    // ───────────────────────────────────────────────────────────────────

    opLog.push("TKT_CREATED", {id:tkt.id, titulo});
    toast("Ticket registrado: "+tkt.id,"success");
    setPdfPending({tkt,cl,un,supp});
    setLineas([emptyLine(opType,priority,[])]);
    setNotes(""); setHorasOp(0);
    setTimeout(()=>setIsSaving(false), 1500); // reset after 1.5s
  },[isSaving,lineas,lineSnaps,totalSnap,aggMargen,fecha,opType,opMeta,priority,clientId,supplierId,unitId,status,payType,promesa,activeMods,prob,horasOp,notes,dispatch,toast,clients,units,suppliers]);

  // ── RENDER ──────────────────────────────────────────────────────────────────
  const [catalogQ, setCatalogQ] = useState("");
  const catalogResults = useMemo(()=>{
    if(catalogSearch===null) return [];
    const q=(catalogQ||"").toLowerCase().trim();
    if(!q) return state.parts.slice(0,12);
    return state.parts.filter(p=>
      p.nombre.toLowerCase().includes(q)||
      (p.oem||"").toLowerCase().includes(q)||
      (p.aftermarket||"").toLowerCase().includes(q)||
      (p.aplicacion||"").toLowerCase().includes(q)
    ).slice(0,12);
  },[catalogQ,catalogSearch,state.parts]);

  const selectFromCatalog = useCallback((p)=>{
    const idx = catalogSearch;
    updateLinea(idx,{
      titulo:   p.nombre,
      partRef:  p.oem||p.aftermarket||"",
      costoUnit: p.ultimoPrecio||0,
      manualPrice: String(p.ultimoPrecio||0),
    });
    setCatalogSearch(null);
    setCatalogQ("");
  },[catalogSearch,updateLinea]);

  return (
    <div style={{padding:"10px 13px",maxWidth:1200,margin:"0 auto"}}>
      {pdfPending&&<PDFConfirm {...pdfPending} onClose={()=>setPdfPending(null)}/>}

      {/* Modal busqueda en catalogo */}
      {catalogSearch!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>{setCatalogSearch(null);setCatalogQ("");}}>
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.borderHi}`,borderRadius:5,width:"90%",maxWidth:520,overflow:"hidden"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.border}`,background:C.bg2}}>
              <span style={{fontSize:9,color:C.cyan,fontFamily:"'Courier New',monospace",fontWeight:700}}>CATALOGO — LINEA {String(catalogSearch+1).padStart(2,"0")}</span>
              <input autoFocus value={catalogQ} onChange={e=>setCatalogQ(e.target.value)}
                placeholder="Buscar por nombre, OEM, aplicacion..."
                style={{flex:1,background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 8px",color:C.t1,fontSize:10,outline:"none",fontFamily:"'Courier New',monospace"}}/>
              <button onClick={()=>{setCatalogSearch(null);setCatalogQ("");}}
                style={{padding:"3px 8px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t3,fontSize:10,cursor:"pointer"}}>x</button>
            </div>
            {state.parts.length===0&&(
              <div style={{padding:"20px",textAlign:"center",color:C.t3,fontSize:9}}>Sin partes en el catalogo. Registra partes en el modulo Catalogo.</div>
            )}
            {catalogResults.map((p,i)=>(
              <div key={p.id} onClick={()=>selectFromCatalog(p)}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:i%2===0?C.bg1:C.bg0}}>
                <div style={{minWidth:0,flex:1,marginRight:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                  <div style={{fontSize:8,color:C.t3,fontFamily:"'Courier New',monospace"}}>
                    {p.oem&&<span style={{color:C.cyan}}>{p.oem}</span>}
                    {p.oem&&p.aplicacion&&" · "}
                    {p.aplicacion&&<span>{p.aplicacion}</span>}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {p.ultimoPrecio>0&&<div style={{fontSize:10,fontWeight:700,color:C.yellow,fontFamily:"'Courier New',monospace"}}>{mxn(p.ultimoPrecio)}</div>}
                  <div style={{fontSize:7,color:C.t3}}>{p.ultimaPrecio||p.ultimaFecha||""}</div>
                </div>
              </div>
            ))}
            {catalogResults.length===0&&catalogQ&&(
              <div style={{padding:"16px",textAlign:"center",color:C.t3,fontSize:9}}>Sin resultados para "{catalogQ}"</div>
            )}
          </div>
        </div>
      )}

      {/* Prioridad */}
      <div style={{marginBottom:8}}>
        <div style={{fontSize:7,color:C.t3,letterSpacing:"0.18em",marginBottom:4}}>PRIORIDAD OPERATIVA</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
          {Object.values(PRIORITY).map(p=>{
            const active=priority===p.id;
            return (
              <div key={p.id} onClick={()=>setPriority(p.id)}
                style={{padding:"7px 10px",borderRadius:3,cursor:"pointer",background:active?p.dim:C.bg2,border:`2px solid ${active?p.dot:C.border}`,display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:active?p.dot:C.t3,flexShrink:0}}/>
                <div>
                  <div style={{fontSize:9,fontWeight:700,color:active?p.dot:C.t2,fontFamily:"'Courier New',monospace"}}>{p.id}</div>
                  <div style={{fontSize:8,color:active?C.t1:C.t3}}>{p.label}</div>
                </div>
                {active&&pr.marginBonus>0&&<span style={{marginLeft:"auto",fontSize:7,color:p.dot}}>+{pr.marginBonus}%</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tipo */}
      <div style={{marginBottom:8}}>
        <div style={{fontSize:7,color:C.t3,letterSpacing:"0.18em",marginBottom:4}}>TIPO DE OPERACION</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4}}>
          {OP_TYPES.map(op=>{
            const active=opType===op.id;
            return (
              <div key={op.id} onClick={()=>setOpType(op.id)}
                style={{padding:"5px 7px",borderRadius:3,cursor:"pointer",background:active?C.blueDim:C.bg2,border:`1px solid ${active?C.blueHi:C.border}`}}>
                <div style={{fontSize:8,fontWeight:700,color:active?C.t1:C.t2,lineHeight:1.2}}>{op.label}</div>
                <div style={{fontSize:7,color:C.t3,marginTop:1}}>{op.baseMin}--{op.baseMax}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Layout: izquierda descripcion+lineas, derecha margen+resultados */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:10}}>

        {/* LEFT */}
        <div>
          {/* Datos del ticket */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
            <SHdr title="DATOS DEL TICKET"/>
            <div style={{padding:9}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                <div>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>FECHA</div>
                  <input value={fecha} onChange={e=>setFecha(e.target.value)} placeholder="DD/MM/AAAA"
                    style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 6px",color:C.t1,fontSize:10,outline:"none",boxSizing:"border-box",fontFamily:"'Courier New',monospace"}}/>
                </div>
                <Sel label="Estado" value={status} onChange={setStatus} options={TICKET_ALL.map(id=>({value:id,label:TICKET_META[id].label}))}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginTop:4}}>
                <Sel label="Cliente"   value={clientId}   onChange={setClientId}   options={[{value:"",label:"-- Sin cliente --"},...clients.map(c=>({value:c.id,label:c.empresa}))]}/>
              </div>
              <UnitPicker units={units} value={unitId} onChange={setUnitId}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginTop:0}}>
                <Sel label="Proveedor" value={supplierId} onChange={setSupplierId} options={[{value:"",label:"-- Sin proveedor --"},...suppliers.map(s=>({value:s.id,label:s.nombre}))]}/>
                <Sel label="Pago"      value={payType}    onChange={setPayType}    options={[{value:"contado",label:"Contado"},{value:"credit",label:"Credito"}]}/>
              </div>
              {payType==="credit"&&(
                <div style={{marginBottom:0,marginTop:0}}>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>PROMESA DE PAGO</div>
                  <input value={promesa} onChange={e=>setPromesa(e.target.value)} placeholder="DD/MM/AAAA"
                    style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 6px",color:C.yellow,fontSize:10,outline:"none",boxSizing:"border-box",fontFamily:"'Courier New',monospace"}}/>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginTop:4}}>
                <Sel label="Prob. cierre" value={prob} onChange={setProb} options={PROB.map(p=>({value:p.id,label:p.label+" ("+p.pct+"%)"}))}/>
                <div>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>HORAS OP.</div>
                  <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,overflow:"hidden"}}>
                    <input type="text" inputMode="decimal" min={0} step={0.5} value={horasOp} onChange={e=>setHorasOp(e.target.value)}
                      onBlur={()=>setHorasOp(v=>String(safeNumber(v)))}
                      style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:11,padding:"5px 0 5px 7px",fontFamily:"'Courier New',monospace"}}/>
                    <span style={{padding:"0 6px",color:C.t3,fontSize:10}}>h</span>
                  </div>
                </div>
              </div>
              <div style={{marginTop:5}}>
                <div style={{fontSize:7,color:C.t3,marginBottom:2}}>NOTAS / DIAGNOSTICO</div>
                <textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observaciones, diagnostico, evidencia..."
                  style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 7px",color:C.t2,fontSize:9,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
              </div>
            </div>
          </div>

          {/* Lineas de cotizacion */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
            <SHdr title={"LINEAS DE COTIZACION ("+lineas.length+")"} right={
              <button onClick={addLinea} style={{fontSize:8,background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,padding:"2px 8px",cursor:"pointer",fontWeight:600}}>
                + Agregar linea
              </button>
            }/>
            <div style={{padding:9}}>
              {lineas.map((l,i)=>{
                const mg    = l.customMgn?Math.min(l.customVal,opMeta.cap):sharedMargin;
                const lsnap = lineSnaps[i]||{precioConIVA:0,uNeta:0,margenNetoPrecio:0,ivaNeto:0};
                const lmc   = margenColor(lsnap.margenNetoPrecio);
                return (
                  <div key={l.key} style={{background:C.bg0,border:`1px solid ${C.borderHi}`,borderRadius:3,marginBottom:i<lineas.length-1?7:0,overflow:"hidden"}}>
                    {/* Header linea */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 9px",background:C.bg3,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,borderBottom:`1px solid ${C.border}`}}>
                      <span style={{fontSize:8,color:C.cyan,fontFamily:"'Courier New',monospace",fontWeight:700}}>LINEA {String(i+1).padStart(2,"0")}</span>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:10,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(lsnap.precioConIVA)}</span>
                        <span style={{fontSize:8,color:lmc,fontFamily:"'Courier New',monospace"}}>{fpct(lsnap.margenNetoPrecio)}</span>
                        {lineas.length>1&&<button onClick={()=>removeLinea(i)} style={{padding:"1px 6px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:2,color:C.red,fontSize:8,cursor:"pointer",fontWeight:700}}>x</button>}
                      </div>
                    </div>
                    <div style={{padding:"8px 9px"}}>
                      {/* Descripcion, parte y boton catalogo */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 110px auto",gap:5,marginBottom:6}}>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>DESCRIPCION</div>
                          <input value={l.titulo} onChange={e=>updateLinea(i,{titulo:e.target.value})}
                            placeholder={"Pieza o servicio "+(i+1)}
                            style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.t1,fontSize:10,outline:"none",fontFamily:"inherit"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>NUM. PARTE</div>
                          <input value={l.partRef} onChange={e=>updateLinea(i,{partRef:e.target.value})} placeholder="OEM / ref."
                            style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.t2,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace"}}/>
                        </div>
                        <div style={{display:"flex",alignItems:"flex-end"}}>
                          <button onClick={()=>setCatalogSearch(i)}
                            style={{padding:"4px 8px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,fontSize:8,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                            + Catalogo
                          </button>
                        </div>
                      </div>
                      {/* Cantidad + Costo unitario + Gasolina + Otros */}
                      <div style={{display:"grid",gridTemplateColumns:"80px 1fr 1fr 1fr",gap:5,marginBottom:6}}>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>CANT.</div>
                          <div style={{display:"flex",alignItems:"center",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden"}}>
                            <input type="text" inputMode="numeric"
                              value={l._qtyRaw!==undefined?l._qtyRaw:String(l.qty||1)}
                              onChange={e=>updateLinea(i,{_qtyRaw:e.target.value})}
                              onBlur={()=>setLineas(p=>p.map((line,idx)=>{if(idx!==i)return line;const n=parseInt(line._qtyRaw);return {...line,qty:isFinite(n)&&n>=1?n:1,_qtyRaw:undefined};}))}
                              style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:12,fontWeight:700,padding:"5px 0 5px 7px",fontFamily:"'Courier New',monospace"}}/>
                            <span style={{padding:"0 5px",color:C.t3,fontSize:9}}>pz</span>
                          </div>
                        </div>
                        {[["COSTO UNIT. (c/IVA)","costoUnit"],["GASOLINA","gasolina"],["OTROS","otros"]].map(([lbl,k])=>(
                          <div key={k}>
                            <div style={{fontSize:7,color:C.t3,marginBottom:2}}>{lbl}</div>
                            <div style={{display:"flex",alignItems:"center",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,overflow:"hidden"}}>
                              <span style={{padding:"0 5px",color:C.t3,fontSize:10,fontFamily:"'Courier New',monospace"}}>$</span>
                              <input type="text" inputMode="decimal"
                                value={l[`_${k}Raw`]!==undefined?l[`_${k}Raw`]:String(l[k]||0)}
                                onChange={e=>updateLinea(i,{[`_${k}Raw`]:e.target.value})}
                                onBlur={()=>setLineas(p=>p.map((line,idx)=>idx!==i?line:{...line,[k]:safeNumber(line[`_${k}Raw`]),[`_${k}Raw`]:undefined}))}
                                style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:10,padding:"5px 0",fontFamily:"'Courier New',monospace"}}/>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Subtotal de cantidad */}
                      {(safeNumber(l.qty,1))>1&&(
                        <div style={{fontSize:8,color:C.t3,fontFamily:"'Courier New',monospace",marginBottom:6}}>
                          {l.qty} × {mxn(safeNumber(l.costoUnit))} = <span style={{color:C.cyan,fontWeight:700}}>{mxn(safeNumber(l.costoUnit)*safeNumber(l.qty,1))}</span> costo total
                        </div>
                      )}
                      {/* Modo precio */}
                      <div style={{display:"flex",gap:7,alignItems:"center"}}>
                        <div style={{display:"flex",borderRadius:3,overflow:"hidden",border:`1px solid ${C.border}`,flexShrink:0}}>
                          {[["auto","Auto"],["manual","Manual"]].map(([id,lbl])=>(
                            <button key={id} onClick={()=>updateLinea(i,{mode:id})}
                              style={{padding:"3px 8px",border:"none",cursor:"pointer",fontSize:8,fontWeight:600,background:l.mode===id?C.blue:C.bg2,color:l.mode===id?C.t1:C.t2}}>
                              {lbl}
                            </button>
                          ))}
                        </div>
                        {l.mode==="auto"?(
                          <div style={{display:"flex",alignItems:"center",gap:5,flex:1}}>
                            <span style={{fontSize:7,color:C.t3,flexShrink:0}}>Margen:</span>
                            {l.customMgn?(
                              <input type="number" min={0} step={0.5} value={l._customValRaw!==undefined?l._customValRaw:String(l.customVal||27)}
                              onChange={e=>updateLinea(i,{_customValRaw:e.target.value})}
                              onBlur={()=>setLineas(p=>p.map((line,idx)=>idx!==i?line:{...line,customVal:safeNumber(line._customValRaw,27),_customValRaw:undefined}))}
                                style={{width:55,background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.blueHi}`,borderRadius:3,padding:"3px 5px",color:C.cyan,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace",textAlign:"right"}}/>
                            ):(
                              <span style={{fontSize:11,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{fpct(mg)}</span>
                            )}
                            <button onClick={()=>updateLinea(i,{customMgn:!l.customMgn})}
                              style={{fontSize:7,padding:"2px 5px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:2,color:C.t3,cursor:"pointer"}}>
                              {l.customMgn?"auto":"editar"}
                            </button>
                          </div>
                        ):(
                          <div style={{display:"flex",alignItems:"center",gap:5,flex:1}}>
                            <span style={{fontSize:7,color:C.t3,flexShrink:0}}>Precio c/IVA:</span>
                            <div style={{display:"flex",alignItems:"center",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden",flex:1}}>
                              <span style={{padding:"0 4px",color:C.cyan,fontSize:10,fontFamily:"'Courier New',monospace"}}>$</span>
                              <input type="number" min={0} step={0.01} value={l.manualPrice} onChange={e=>updateLinea(i,{manualPrice:e.target.value})}
                                style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:11,fontWeight:700,padding:"4px 0",fontFamily:"'Courier New',monospace"}}/>
                            </div>
                            <span style={{fontSize:8,color:lmc,fontFamily:"'Courier New',monospace",flexShrink:0}}>{fpct(lsnap.margenNetoPrecio)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IVA e ISR globales */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
            <SHdr title="PARAMETROS FISCALES"/>
            <div style={{padding:9}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:6}}>
                <div>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>IVA (%)</div>
                  <input type="number" min={0} step={0.1} value={iva} onChange={e=>setIva(e.target.value)}
                    onBlur={()=>setIva(v=>String(safeNumber(v,16)))}
                    style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 7px",color:C.t1,fontSize:11,outline:"none",fontFamily:"'Courier New',monospace"}}/>
                </div>
                <div>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>ISR (%)</div>
                  <input type="number" min={0} step={0.1} value={isr} onChange={e=>setIsr(e.target.value)}
                    onBlur={()=>setIsr(v=>String(safeNumber(v,20)))}
                    style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 7px",color:C.t1,fontSize:11,outline:"none",fontFamily:"'Courier New',monospace"}}/>
                </div>
              </div>
              <Toggle label="Compra incluye IVA?" value={cIVA} onChange={setCIVA}/>
              <Toggle label="Venta incluye IVA?"  value={vIVA} onChange={setVIVA}/>
            </div>
          </div>

          <button onClick={save} disabled={isSaving}
            style={{width:"100%",padding:"9px",background:isSaving?C.bg2:C.blue,border:"none",borderRadius:4,color:isSaving?C.t3:C.t1,fontSize:11,fontWeight:700,cursor:isSaving?"not-allowed":"pointer",letterSpacing:"0.08em",opacity:isSaving?0.6:1}}>
            {isSaving?"Registrando…":"+ Registrar ticket operativo"}
          </button>
        </div>

        {/* RIGHT — margen + resultados */}
        <div>
          {/* Margen efectivo */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:6,overflow:"hidden"}}>
            <SHdr title="MARGEN EFECTIVO" right={
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:7,color:C.t3}}>Manual</span>
                <div onClick={()=>setCustomMgn(!customMgn)} style={{width:26,height:14,borderRadius:7,cursor:"pointer",position:"relative",background:customMgn?C.blue:C.bg4,border:`1px solid ${customMgn?C.blueHi:C.border}`}}>
                  <div style={{position:"absolute",top:2,left:customMgn?11:2,width:8,height:8,borderRadius:"50%",background:customMgn?C.t1:C.t3,transition:"left .15s"}}/>
                </div>
              </div>
            }/>
            <div style={{padding:9}}>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:4}}>
                <div style={{fontSize:22,fontWeight:800,fontFamily:"'Courier New',monospace",color:capped?C.yellow:C.cyan,lineHeight:1}}>
                  {fpct(sharedMargin)}
                </div>
                <div style={{fontSize:8,color:C.t3}}>base + prioridad + mods</div>
              </div>
              <div style={{display:"flex",gap:8,fontSize:7,color:C.t3,marginBottom:6}}>
                <span>Rango: {opMeta.baseMin}--{opMeta.baseMax}%</span>
                <span>Cap: {opMeta.cap}%</span>
                {pr.marginBonus>0&&<span style={{color:pr.dot}}>+{pr.marginBonus}% P{priority.slice(1)}</span>}
              </div>
              {capped&&<div style={{fontSize:7,color:C.yellow,fontFamily:"'Courier New',monospace",marginBottom:6}}>CAP APLICADO</div>}
              {/* Modificadores */}
              <div style={{fontSize:7,color:C.t3,marginBottom:4}}>MODIFICADORES</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:3,marginBottom:6}}>
                {MODIFIERS.map(mod=>{
                  const active=activeMods.includes(mod.id);
                  return (
                    <div key={mod.id} onClick={()=>toggleMod(mod.id)}
                      style={{padding:"4px 6px",borderRadius:3,cursor:"pointer",background:active?C.blueDim:C.bg3,border:`1px solid ${active?C.blueHi:C.border}`,display:"flex",alignItems:"center",gap:4}}>
                      <div style={{width:4,height:4,borderRadius:"50%",background:active?C.cyan:C.t3,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:8,fontWeight:600,color:active?C.t1:C.t2,lineHeight:1.2}}>{mod.label}</div>
                        <div style={{fontSize:7,color:active?C.cyanDim:C.t3}}>+{mod.pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {customMgn&&(
                <div>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>MARGEN PERSONALIZADO</div>
                  <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden"}}>
                    <input type="number" min={0} step={0.5} value={customVal} onChange={e=>setCustomVal(e.target.value)}
                    onBlur={()=>setCustomVal(v=>safeNumber(v,27))}
                      style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:12,fontWeight:700,padding:"5px 7px",fontFamily:"'Courier New',monospace"}}/>
                    <span style={{padding:"0 7px",color:C.t3,fontSize:10}}>%</span>
                  </div>
                  <div style={{fontSize:7,color:C.t3,marginTop:2}}>Modificadores ignorados en lineas sin margen propio</div>
                </div>
              )}
            </div>
          </div>

          {/* KPIs totales */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
            <KPI label="Precio total c/IVA" value={mxn(totalSnap.precioConIVA)} color={C.cyan} accent sub={lineas.length>1?lineas.length+" lineas":""}/>
            <KPI label="Util. neta total"   value={mxn(totalSnap.uNeta)} color={totalSnap.uNeta>=0?C.green:C.red} sub={fpct(aggMargen)+" del precio"}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:5}}>
            <KPI label="Costo total"  value={mxn(totalSnap.costoTotal)}/>
            <KPI label="Util. pond."  value={mxn(uEsp)} color={C.yellow} sub={PROB.find(p=>p.id===prob)?.label}/>
            <KPI label="Util/hora"    value={uPH?mxn(uPH):"---"} color={C.cyan} sub={horasOp>0?horasOp+"h":""}/>
          </div>

          {/* IVA */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:5,overflow:"hidden"}}>
            <SHdr title="FISCAL — IVA CONSOLIDADO"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
              {[["IVA Acreditable","Recuperas",mxn(totalSnap.ivaAcred),C.blueHi],["IVA Trasladado","Cobras",mxn(totalSnap.ivaTraslad),C.cyan],["IVA Neto SAT","Pagas al SAT",mxn(totalSnap.ivaNeto),totalSnap.ivaNeto>=0?C.yellow:C.green]].map(([lbl,sub,val,col],i)=>(
                <div key={i} style={{padding:"7px 8px",borderRight:i<2?`1px solid ${C.border}`:"none"}}>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>{lbl}</div>
                  <div style={{fontSize:11,fontWeight:800,color:col,fontFamily:"'Courier New',monospace"}}>{val}</div>
                  <div style={{fontSize:7,color:C.t3,marginTop:1}}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Desglose por linea cuando hay mas de una */}
          {lineas.length>1&&(
            <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",marginBottom:5}}>
              <SHdr title="DESGLOSE POR LINEA"/>
              {lineas.map((l,i)=>{
                const lsnap=lineSnaps[i]||{precioConIVA:0,uNeta:0,margenNetoPrecio:0};
                return (
                  <div key={l.key} style={{display:"flex",justifyContent:"space-between",padding:"5px 9px",borderBottom:i<lineas.length-1?`1px solid ${C.border}`:"none",background:i%2===0?C.bg1:C.bg0}}>
                    <div style={{minWidth:0,flex:1,marginRight:8}}>
                      <div style={{fontSize:9,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.titulo||"Linea "+(i+1)}</div>
                      {l.partRef&&<div style={{fontSize:7,color:C.t3,fontFamily:"'Courier New',monospace"}}>{l.partRef}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(lsnap.precioConIVA)}</div>
                      <div style={{fontSize:8,color:lsnap.uNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(lsnap.uNeta)}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 9px",background:C.blueDim,borderTop:`1px solid ${C.blueHi}`}}>
                <span style={{fontSize:9,fontWeight:700,color:C.t1}}>TOTAL</span>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(totalSnap.precioConIVA)}</div>
                  <div style={{fontSize:9,fontWeight:700,color:totalSnap.uNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(totalSnap.uNeta)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Barra margen */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,padding:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:8,color:C.t2}}>Margen neto promedio s/precio</span>
              <span style={{fontSize:9,fontWeight:700,color:mColor,fontFamily:"'Courier New',monospace"}}>{fpct(aggMargen)}</span>
            </div>
            <div style={{height:4,background:C.bg4,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${clamp(aggMargen,0,100)}%`,background:mColor,transition:"width .3s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:7,color:C.t3}}>
              <span>Bajo &lt;10%</span><span>Aceptable 10-20%</span><span>Optimo &gt;20%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── COTIZADOR REFACCIONES ─────────────────────────────────────────────────────
let _cotSeq = 1;
function mkCotId(dateStr) {
  const p=(dateStr||"").replace(/\//g,"-").split("-");
  let y,m,d;
  if(p.length===3){p[0].length===4?([y,m,d]=p):([d,m,y]=p);}
  else{const n=new Date();y=n.getFullYear();m=String(n.getMonth()+1).padStart(2,"0");d=String(n.getDate()).padStart(2,"0");}
  return `COT-${y}${String(m).padStart(2,"0")}${String(d).padStart(2,"0")}-${String(_cotSeq++).padStart(3,"0")}`;
}

const emptyRefLine = () => ({
  key:         genId("REF"),
  descripcion: "",
  oem:         "",
  aftermarket: "",
  qty:         1,
  costoUnit:   0,
  modo:        "auto",
  margen:      30,
  precioManual:"0",
  notas:       "",
});

function CotizadorRefacciones({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {clients,units,suppliers,parts} = state;

  const [fecha,      setFecha]      = useState(todayMX());
  const [clientId,   setClientId]   = useState("");
  const [unitId,     setUnitId]     = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [vigencia,   setVigencia]   = useState(3);
  const [payType,    setPayType]    = useState("contado");
  const [promesa,    setPromesa]    = useState("");
  const [notes,      setNotes]      = useState("");
  const [iva,        setIva]        = useState(16);
  const [cIVA,       setCIVA]       = useState(true);
  const [vIVA,       setVIVA]       = useState(true);
  const [globalMargen, setGlobalMargen] = useState(30);
  const [useGlobal,    setUseGlobal]    = useState(true);
  const [lineas,       setLineas]       = useState([emptyRefLine()]);
  const [catalogSearch,setCatalogSearch]= useState(null);
  const [catalogQ,     setCatalogQ]     = useState("");
  const [isSaving,     setIsSaving]     = useState(false);

  const lineSnaps = useMemo(()=>lineas.map(l=>{
    const mg    = useGlobal ? globalMargen : (l._mgnRaw!==undefined ? safeNumber(l._mgnRaw,30) : l.margen);
    const qty   = l._qtyRaw!==undefined ? (parseInt(l._qtyRaw)||1) : (safeNumber(l.qty,1)||1);
    const costoU= l._costoRaw!==undefined ? safeNumber(l._costoRaw) : safeNumber(l.costoUnit);
    const costo = costoU*qty;
    return computeSnap({costo,gasolina:0,otros:0,iva,isr:0,compraConIVA:cIVA,ventaConIVA:vIVA,mode:l.modo,margin:mg,manualPrice:l.precioManual||"0"});
  }),[lineas,globalMargen,useGlobal,iva,cIVA,vIVA]);

  const totalSnap = useMemo(()=>{
    const sum=k=>lineSnaps.reduce((s,sn)=>s+safeNumber(sn[k]),0);
    const precioSinIVA=sum("precioSinIVA"), uNeta=sum("uNeta");
    return {
      precioConIVA:sum("precioConIVA"), precioSinIVA,
      costoTotal:sum("costoTotal"), uNeta, uBruta:sum("uBruta"),
      ivaTraslad:sum("ivaTraslad"), ivaAcred:sum("ivaAcred"), ivaNeto:sum("ivaNeto"),
      margenNetoPrecio: precioSinIVA>0?(uNeta/precioSinIVA)*100:0,
    };
  },[lineSnaps]);

  const aggMargen = totalSnap.margenNetoPrecio;
  const mColor    = margenColor(aggMargen);

  const updateLinea = useCallback((idx,patch)=>setLineas(p=>p.map((l,i)=>i===idx?{...l,...patch}:l)),[]);
  const removeLinea = useCallback(idx=>setLineas(p=>p.filter((_,i)=>i!==idx)),[]);
  const addLinea    = useCallback(()=>setLineas(p=>[...p,emptyRefLine()]),[]);

  const catalogResults = useMemo(()=>{
    if(catalogSearch===null) return [];
    const q=(catalogQ||"").toLowerCase().trim();
    if(!q) return parts.slice(0,12);
    return parts.filter(p=>
      p.nombre.toLowerCase().includes(q)||
      (p.oem||"").toLowerCase().includes(q)||
      (p.aftermarket||"").toLowerCase().includes(q)||
      (p.aplicacion||"").toLowerCase().includes(q)
    ).slice(0,12);
  },[catalogQ,catalogSearch,parts]);

  const selectFromCatalog = useCallback(p=>{
    const idx=catalogSearch;
    updateLinea(idx,{descripcion:p.nombre,oem:p.oem||"",aftermarket:p.aftermarket||"",costoUnit:p.ultimoPrecio||0,precioManual:String(p.ultimoPrecio||0)});
    setCatalogSearch(null); setCatalogQ("");
  },[catalogSearch,updateLinea]);

  const generarPDF = useCallback(()=>{
    const cl   = clients.find(c=>c.id===clientId);
    const un   = units.find(u=>u.id===unitId);
    const supp = suppliers.find(s=>s.id===supplierId);
    const folio = mkCotId(fecha);

    const fechaLarga=(()=>{
      const p=fecha.split("/");
      if(p.length!==3) return fecha;
      const meses=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
      return `${parseInt(p[0])} de ${meses[parseInt(p[1])-1]} de ${p[2]}`;
    })();

    const unidadStr=un?`${un.economico?"Eco. "+un.economico+" · ":""}${un.marca} ${un.modelo} ${un.anio}${un.placa?" · Placa: "+un.placa:""}${un.vin?" · VIN: "+un.vin:""}` : "";
    const clLine=cl?cl.empresa+(cl.ciudad?` · ${cl.ciudad}${cl.estado?", "+cl.estado:""}` :""):"—";
    const formaPago=payType==="credit"?`Crédito`+(promesa?` — Fecha límite: ${promesa}`:""):"Contado / Transferencia bancaria";
    const entrega=supp?.entregaDias?`${supp.entregaDias} día${supp.entregaDias>1?"s":""} hábiles`:"24-48 hrs hábiles";
    const fmtMXN=n=>safeNumber(n).toLocaleString("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:2});
    const vigenciaStr=`${vigencia} día${vigencia!==1?"s":""} naturales`;
    const notaLine=notes?`<li>${notes}</li>`:"";
    const unidadRow=unidadStr?`<tr><td>Unidad</td><td>${unidadStr}</td></tr>`:"";

    const filas=lineas.map((l,i)=>{
      const lsnap=lineSnaps[i]||{};
      const qty=safeNumber(l.qty,1)||1;
      const unitPrice=qty>0?safeNumber(lsnap.precioConIVA)/qty:0;
      const refs=[l.oem&&`OEM: ${l.oem}`,l.aftermarket&&`Alt: ${l.aftermarket}`].filter(Boolean).join(" · ");
      return `<tr>
        <td>${String(i+1).padStart(2,"0")}</td>
        <td><strong>${l.descripcion||"Sin descripción"}</strong>${refs?`<br><span style="font-size:10px;color:#666">${refs}</span>`:""}</td>
        <td class="money">${qty}</td>
        <td class="money">${fmtMXN(unitPrice)}</td>
        <td class="money">${fmtMXN(lsnap.precioConIVA)}</td>
      </tr>`;
    }).join("");

    const innerHTML=`
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        .page{width:794px;background:#fff;padding:50px;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.5}
        .top-header{border:1px solid #dcdcdc;padding:20px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0}
        .brand h1{font-size:28px;font-weight:800;margin:0}
        .brand p{font-size:10px;color:#666;font-weight:700;margin-top:4px}
        .issuer{text-align:right;font-size:11px;line-height:1.6}
        .hero{background:#000;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:20px;margin-top:14px}
        .hero-title{font-size:20px;font-weight:800}
        .hero-meta{text-align:right}
        .hero-meta .folio{font-size:18px;font-weight:800}
        .hero-meta .date{font-size:13px;font-weight:700}
        .meta-table{width:100%;border-collapse:collapse;margin-top:14px}
        .meta-table td{border:1px solid #e3e3e3;padding:10px 12px;font-size:11px}
        .meta-table td:first-child{width:120px;background:#fafafa;font-weight:700}
        .section-title{margin-top:22px;margin-bottom:10px;font-size:13px;font-weight:800}
        .detail-table{width:100%;border-collapse:collapse}
        .detail-table th{background:#000;color:#fff;padding:10px 12px;text-align:left;font-size:10px}
        .detail-table td{border:1px solid #e5e5e5;padding:10px 12px;vertical-align:top;font-size:11px;line-height:1.5}
        .money{text-align:right;white-space:nowrap;font-weight:700}
        .totals{width:320px;margin-left:auto;margin-top:16px;border-collapse:collapse}
        .totals td{border:1px solid #e3e3e3;padding:10px 12px;font-size:11px}
        .totals td:last-child{text-align:right;font-weight:700}
        .grand-total td{background:#000;color:#fff;font-weight:800}
        .block{margin-top:22px}
        .block h3{font-size:13px;font-weight:800;margin-bottom:8px}
        .block ul{padding-left:16px}
        .block li{margin-bottom:5px;font-size:11px;line-height:1.6}
        .footer{margin-top:28px;border-top:1px solid #e5e5e5;padding-top:10px;display:flex;justify-content:space-between;font-size:10px;color:#444}
      </style>
      <div class="page">
        <div class="top-header">
          <div class="brand"><h1>LOGISOLVE</h1><p>Logistics &middot; Supply &middot; Solutions</p></div>
          <div class="issuer"><strong>Alejandro Saucedo</strong><br>RFC: SAME9612277T9<br>Tel. 5562321807<br>contacto@logisolve.mx</div>
        </div>
        <div class="hero">
          <div class="hero-title">COTIZACIÓN DE REFACCIONES</div>
          <div class="hero-meta"><div>No.</div><div class="folio">${folio}</div><div class="date">Fecha: ${fecha.replace(/\//g," / ")}</div></div>
        </div>
        <table class="meta-table">
          <tr><td>Cliente</td><td>${clLine}</td></tr>
          ${unidadRow}
          <tr><td>Vigencia</td><td>${vigenciaStr}</td></tr>
          <tr><td>Forma de pago</td><td>${formaPago}</td></tr>
          <tr><td>Atención</td><td>Área de Compras / Operaciones</td></tr>
        </table>
        <div class="section-title">REFACCIONES COTIZADAS</div>
        <table class="detail-table">
          <thead><tr>
            <th style="width:36px">No.</th>
            <th>Descripción / Número de parte</th>
            <th style="width:55px;text-align:right">Cant.</th>
            <th style="width:120px;text-align:right">P. Unit. c/IVA</th>
            <th style="width:130px;text-align:right">Importe c/IVA</th>
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
        <table class="totals">
          <tr><td>Subtotal (sin IVA)</td><td>${fmtMXN(totalSnap.precioSinIVA)} MXN</td></tr>
          <tr><td>IVA (${iva}%)</td><td>${fmtMXN(totalSnap.ivaTraslad)} MXN</td></tr>
          <tr class="grand-total"><td>TOTAL &middot; IVA INCLUIDO</td><td>${fmtMXN(totalSnap.precioConIVA)} MXN</td></tr>
        </table>
        <div class="block">
          <h3>CONDICIONES COMERCIALES</h3>
          <ul>
            <li>Precios incluyen IVA en el total general.</li>
            <li>Forma de pago: ${formaPago}.</li>
            <li>Entrega estimada: ${entrega} después de confirmación de pedido.</li>
            <li>Precios sujetos a disponibilidad al momento de autorización.</li>
            <li>Vigencia: ${vigenciaStr} a partir de la fecha de emisión.</li>
            ${notaLine}
          </ul>
        </div>
        <div class="block">
          <h3>OBSERVACIONES</h3>
          <ul>
            <li>La compatibilidad final de las refacciones debe ser validada por el técnico responsable.</li>
            <li>La garantía aplica conforme a políticas del fabricante o proveedor.</li>
            <li>Números de parte OEM/aftermarket indicados para referencia — confirmar aplicación antes de instalar.</li>
          </ul>
        </div>
        <div class="footer">
          <div>Quedo atento para cualquier duda o confirmación.</div>
          <div>LogiSolve &middot; ${fechaLarga}</div>
        </div>
      </div>`;

    const container=document.createElement("div");
    container.style.cssText="position:absolute;top:0;left:0;width:794px;background:white;opacity:1;pointer-events:none;";
    container.innerHTML=innerHTML;
    document.body.appendChild(container);

    const generate=()=>{
      // eslint-disable-next-line no-undef
      html2pdf().set({margin:0,filename:`${folio}.pdf`,image:{type:"jpeg",quality:0.98},
        html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false,scrollX:0,scrollY:0},
        jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
      }).from(container.querySelector('.page')||container.firstElementChild).save().finally(()=>{container.remove();});
    };
    const go=()=>requestAnimationFrame(()=>requestAnimationFrame(generate));
    if(typeof html2pdf!=="undefined"){go();}
    else{
      const script=document.createElement("script");
      script.src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload=go;
      script.onerror=()=>{container.remove();toast("Error cargando generador PDF","error");};
      document.head.appendChild(script);
    }
  },[lineas,lineSnaps,totalSnap,fecha,clientId,unitId,supplierId,vigencia,payType,promesa,notes,iva,clients,units,suppliers,toast]);

  const convertirATicket = useCallback(()=>{
    if(isSaving) return;
    const titulo=lineas.map(l=>l.descripcion.trim()||"Sin descripción").join(" / ");
    if(!titulo||titulo==="Sin descripción"){toast("Agrega al menos una refacción","error");return;}
    setIsSaving(true);
    const lineasConSnap=lineas.map((l,i)=>({
      titulo:l.descripcion||"Sin descripción", partRef:l.oem||l.aftermarket||"",
      qty:safeNumber(l.qty,1)||1, costoUnit:safeNumber(l.costoUnit),
      gasolina:0, otros:0, mode:l.modo, manualPrice:l.precioManual||"0",
      descripcionPDF:l.notas||"", snap:lineSnaps[i],
    }));
    const snapAgregado={
      ...totalSnap,
      markupSobre:totalSnap.costoTotal>0?((totalSnap.precioSinIVA-totalSnap.costoTotal)/totalSnap.costoTotal)*100:0,
      margenNetoPrecio:aggMargen, params:{iva,isr:0},
    };
    const tkt={
      id:mkTicketId(fecha), titulo, opId:"general", opShort:"REF-G", priority:"P3",
      clientId, supplierId, unitId,
      partRef:lineas.map(l=>l.oem||l.aftermarket).filter(Boolean).join(", "),
      date:fecha, status:"cotizado", payType,
      promesaPago:payType==="credit"?promesa:null,
      cobrado:false, mods:[], prob:"high", horasOp:0, notes,
      mode:lineas.length>1?"multilinea":"auto",
      lineas:lineasConSnap, snap:snapAgregado,
      timeline:[{ts:nowISO(),evento:"Creado desde Cotizador de Refacciones",actor:"Operador"}],
      history:[mkEvent("created",{titulo,status:"cotizado",priority:"P3"})],
    };
    dispatch({type:"TKT_ADD",t:tkt});
    opLog.push("TKT_CREATED",{id:tkt.id,titulo});
    toast("Ticket registrado: "+tkt.id,"success");
    setTimeout(()=>setIsSaving(false),1500);
  },[isSaving,lineas,lineSnaps,totalSnap,aggMargen,fecha,clientId,supplierId,unitId,payType,promesa,notes,iva,dispatch,toast]);

  const reset=useCallback(()=>{
    setLineas([emptyRefLine()]); setClientId(""); setUnitId(""); setSupplierId("");
    setNotes(""); setPayType("contado"); setPromesa(""); setFecha(todayMX());
  },[]);

  const selectedUnit = units.find(u=>u.id===unitId);

  return (
    <div style={{padding:"10px 13px",maxWidth:1200,margin:"0 auto"}}>

      {/* Catalog modal */}
      {catalogSearch!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.75)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center"}}
          onClick={()=>{setCatalogSearch(null);setCatalogQ("");}}>
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.borderHi}`,borderRadius:5,width:"90%",maxWidth:520,overflow:"hidden"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderBottom:`1px solid ${C.border}`,background:C.bg2}}>
              <span style={{fontSize:9,color:C.cyan,fontFamily:"'Courier New',monospace",fontWeight:700}}>CATÁLOGO — REF {String(catalogSearch+1).padStart(2,"0")}</span>
              <input autoFocus value={catalogQ} onChange={e=>setCatalogQ(e.target.value)}
                placeholder="Buscar por nombre, OEM, aplicación..."
                style={{flex:1,background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 8px",color:C.t1,fontSize:10,outline:"none",fontFamily:"'Courier New',monospace"}}/>
              <button onClick={()=>{setCatalogSearch(null);setCatalogQ("");}}
                style={{padding:"3px 8px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t3,fontSize:10,cursor:"pointer"}}>x</button>
            </div>
            {parts.length===0&&<div style={{padding:"20px",textAlign:"center",color:C.t3,fontSize:9}}>Sin partes en el catálogo.</div>}
            {catalogResults.map((p,i)=>(
              <div key={p.id} onClick={()=>selectFromCatalog(p)}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 12px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",background:i%2===0?C.bg1:C.bg0}}>
                <div style={{minWidth:0,flex:1,marginRight:10}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                  <div style={{fontSize:8,color:C.t3,fontFamily:"'Courier New',monospace"}}>
                    {p.oem&&<span style={{color:C.cyan}}>{p.oem}</span>}
                    {p.oem&&p.aplicacion&&" · "}
                    {p.aplicacion&&<span>{p.aplicacion}</span>}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {p.ultimoPrecio>0&&<div style={{fontSize:10,fontWeight:700,color:C.yellow,fontFamily:"'Courier New',monospace"}}>{mxn(p.ultimoPrecio)}</div>}
                  <div style={{fontSize:7,color:C.t3}}>{p.ultimaFecha||""}</div>
                </div>
              </div>
            ))}
            {catalogResults.length===0&&catalogQ&&<div style={{padding:"16px",textAlign:"center",color:C.t3,fontSize:9}}>Sin resultados para "{catalogQ}"</div>}
          </div>
        </div>
      )}

      <div className="ref-grid" style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:10}}>

        {/* LEFT */}
        <div>

          {/* Quote header */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
            <SHdr title="DATOS DE LA COTIZACIÓN"/>
            <div style={{padding:9}}>
              <div className="ref-hdr-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:5}}>
                <div>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>FECHA</div>
                  <input value={fecha} onChange={e=>setFecha(e.target.value)} placeholder="DD/MM/AAAA"
                    style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 6px",color:C.t1,fontSize:10,outline:"none",boxSizing:"border-box",fontFamily:"'Courier New',monospace"}}/>
                </div>
                <div>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>VIGENCIA</div>
                  <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,overflow:"hidden"}}>
                    <input type="text" inputMode="numeric" value={vigencia}
                      onChange={e=>setVigencia(e.target.value)}
                      onBlur={()=>setVigencia(v=>Math.max(1,parseInt(v)||3))}
                      style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:11,padding:"5px 7px",fontFamily:"'Courier New',monospace"}}/>
                    <span style={{padding:"0 6px",color:C.t3,fontSize:9}}>días</span>
                  </div>
                </div>
                <Sel label="Pago" value={payType} onChange={setPayType}
                  options={[{value:"contado",label:"Contado"},{value:"credit",label:"Crédito"}]}/>
              </div>
              {payType==="credit"&&(
                <div style={{marginBottom:5}}>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>PROMESA DE PAGO</div>
                  <input value={promesa} onChange={e=>setPromesa(e.target.value)} placeholder="DD/MM/AAAA"
                    style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 6px",color:C.yellow,fontSize:10,outline:"none",boxSizing:"border-box",fontFamily:"'Courier New',monospace"}}/>
                </div>
              )}
              <div className="ref-half-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
                <Sel label="Cliente" value={clientId} onChange={setClientId}
                  options={[{value:"",label:"-- Sin cliente --"},...clients.map(c=>({value:c.id,label:c.empresa}))]}/>
                <Sel label="Proveedor" value={supplierId} onChange={setSupplierId}
                  options={[{value:"",label:"-- Sin proveedor --"},...suppliers.map(s=>({value:s.id,label:s.nombre}))]}/>
              </div>
              <UnitPicker units={units} value={unitId} onChange={setUnitId}/>
              {selectedUnit&&(
                <div style={{background:C.bg3,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.borderHi}`,borderRadius:3,padding:"6px 9px",marginTop:4,marginBottom:4}}>
                  <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontSize:9,color:C.t1,fontWeight:700}}>{selectedUnit.marca} {selectedUnit.modelo} {selectedUnit.anio}</span>
                    {selectedUnit.motor&&<span style={{fontSize:8,color:C.t3}}>{selectedUnit.motor}</span>}
                    {selectedUnit.vin&&<span style={{fontSize:8,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{selectedUnit.vin}</span>}
                    {selectedUnit.placa&&<span style={{fontSize:8,color:C.t2,fontFamily:"'Courier New',monospace"}}>Placa: {selectedUnit.placa}</span>}
                    {selectedUnit.economico&&<span style={{fontSize:8,color:C.t2,fontFamily:"'Courier New',monospace"}}>Eco: {selectedUnit.economico}</span>}
                  </div>
                </div>
              )}
              <div style={{marginTop:4}}>
                <div style={{fontSize:7,color:C.t3,marginBottom:2}}>NOTAS / OBSERVACIONES</div>
                <textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)}
                  placeholder="Diagnóstico, condiciones especiales..."
                  style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 7px",color:C.t2,fontSize:9,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
              </div>
            </div>
          </div>

          {/* Parts table */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
            <SHdr title={`REFACCIONES (${lineas.length})`} right={
              <button onClick={addLinea}
                style={{fontSize:8,background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,padding:"2px 8px",cursor:"pointer",fontWeight:600}}>
                + Agregar refacción
              </button>
            }/>
            <div style={{padding:9}}>
              {lineas.map((l,i)=>{
                const lsnap=lineSnaps[i]||{precioConIVA:0,uNeta:0,margenNetoPrecio:0};
                const lmc=margenColor(lsnap.margenNetoPrecio);
                const qty=safeNumber(l.qty,1)||1;
                const unitPriceConIVA=qty>0?lsnap.precioConIVA/qty:0;
                return (
                  <div key={l.key} style={{background:C.bg0,border:`1px solid ${C.borderHi}`,borderRadius:3,marginBottom:i<lineas.length-1?7:0,overflow:"hidden"}}>
                    {/* Line header */}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 9px",background:C.bg3,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,borderBottom:`1px solid ${C.border}`}}>
                      <span style={{fontSize:8,color:C.cyan,fontFamily:"'Courier New',monospace",fontWeight:700}}>
                        REFACCIÓN {String(i+1).padStart(2,"0")}
                      </span>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:10,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(lsnap.precioConIVA)}</span>
                        <span style={{fontSize:8,color:lmc,fontFamily:"'Courier New',monospace"}}>{fpct(lsnap.margenNetoPrecio)}</span>
                        {lineas.length>1&&(
                          <button onClick={()=>removeLinea(i)}
                            style={{padding:"1px 6px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:2,color:C.red,fontSize:8,cursor:"pointer",fontWeight:700}}>x</button>
                        )}
                      </div>
                    </div>

                    <div style={{padding:"8px 9px"}}>
                      {/* Row 1: Description + OEM + Aftermarket + Catalog button */}
                      <div className="ref-line-row1" style={{display:"grid",gridTemplateColumns:"1fr 120px 120px auto",gap:5,marginBottom:6}}>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>DESCRIPCIÓN</div>
                          <input value={l.descripcion} onChange={e=>updateLinea(i,{descripcion:e.target.value})}
                            placeholder={`Refacción ${i+1}`}
                            style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.t1,fontSize:10,outline:"none",fontFamily:"inherit"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>NUM. OEM</div>
                          <input value={l.oem} onChange={e=>updateLinea(i,{oem:e.target.value})} placeholder="A0012345..."
                            style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.cyan,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>AFTERMARKET</div>
                          <input value={l.aftermarket} onChange={e=>updateLinea(i,{aftermarket:e.target.value})} placeholder="Alt. compatible"
                            style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.t2,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace"}}/>
                        </div>
                        <div style={{display:"flex",alignItems:"flex-end"}}>
                          <button onClick={()=>setCatalogSearch(i)}
                            style={{padding:"4px 8px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,fontSize:8,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                            Catálogo
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Qty + Cost + Mode + Price */}
                      <div className="ref-line-row2" style={{display:"grid",gridTemplateColumns:"80px 1fr auto",gap:5,alignItems:"end"}}>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>CANT.</div>
                          <div style={{display:"flex",alignItems:"center",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden"}}>
                            <input type="text" inputMode="numeric"
                              value={l._qtyRaw!==undefined?l._qtyRaw:String(l.qty||1)}
                              onChange={e=>updateLinea(i,{_qtyRaw:e.target.value})}
                              onBlur={()=>setLineas(p=>p.map((line,idx)=>{if(idx!==i)return line;const n=parseInt(line._qtyRaw);return {...line,qty:isFinite(n)&&n>=1?n:1,_qtyRaw:undefined};}))}
                              style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:12,fontWeight:700,padding:"5px 0 5px 7px",fontFamily:"'Courier New',monospace"}}/>
                            <span style={{padding:"0 5px",color:C.t3,fontSize:9}}>pz</span>
                          </div>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>COSTO UNIT. {cIVA?"(c/IVA)":"(s/IVA)"}</div>
                          <div style={{display:"flex",alignItems:"center",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,overflow:"hidden"}}>
                            <span style={{padding:"0 5px",color:C.t3,fontSize:10,fontFamily:"'Courier New',monospace"}}>$</span>
                            <input type="text" inputMode="decimal"
                              value={l._costoRaw!==undefined?l._costoRaw:String(l.costoUnit||0)}
                              onChange={e=>updateLinea(i,{_costoRaw:e.target.value})}
                              onBlur={()=>setLineas(p=>p.map((line,idx)=>idx!==i?line:{...line,costoUnit:safeNumber(line._costoRaw),_costoRaw:undefined}))}
                              style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:10,padding:"5px 0",fontFamily:"'Courier New',monospace"}}/>
                          </div>
                        </div>
                        {/* Mode + margin or manual price */}
                        <div style={{display:"flex",gap:5,alignItems:"center"}}>
                          <div style={{display:"flex",borderRadius:3,overflow:"hidden",border:`1px solid ${C.border}`,flexShrink:0}}>
                            {[["auto","Auto"],["manual","Manual"]].map(([id,lbl])=>(
                              <button key={id} onClick={()=>updateLinea(i,{modo:id})}
                                style={{padding:"4px 7px",border:"none",cursor:"pointer",fontSize:8,fontWeight:600,background:l.modo===id?C.blue:C.bg2,color:l.modo===id?C.t1:C.t2}}>
                                {lbl}
                              </button>
                            ))}
                          </div>
                          {l.modo==="auto"?(
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <span style={{fontSize:7,color:C.t3,flexShrink:0}}>Mgn:</span>
                              {useGlobal?(
                                <span style={{fontSize:11,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{fpct(globalMargen)}</span>
                              ):(
                                <input type="number" min={0} step={0.5}
                                  value={l._mgnRaw!==undefined?l._mgnRaw:String(l.margen||30)}
                                  onChange={e=>updateLinea(i,{_mgnRaw:e.target.value})}
                                  onBlur={()=>setLineas(p=>p.map((line,idx)=>idx!==i?line:{...line,margen:safeNumber(line._mgnRaw,30),_mgnRaw:undefined}))}
                                  style={{width:52,background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.blueHi}`,borderRadius:3,padding:"3px 5px",color:C.cyan,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace",textAlign:"right"}}/>
                              )}
                              <span style={{fontSize:8,color:C.t3}}>→</span>
                              <span style={{fontSize:9,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{mxn(unitPriceConIVA)}/pz</span>
                            </div>
                          ):(
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <span style={{fontSize:7,color:C.t3,flexShrink:0}}>Precio c/IVA:</span>
                              <div style={{display:"flex",alignItems:"center",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden"}}>
                                <span style={{padding:"0 4px",color:C.cyan,fontSize:10,fontFamily:"'Courier New',monospace"}}>$</span>
                                <input type="number" min={0} step={0.01} value={l.precioManual}
                                  onChange={e=>updateLinea(i,{precioManual:e.target.value})}
                                  style={{width:90,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:11,fontWeight:700,padding:"4px 0",fontFamily:"'Courier New',monospace"}}/>
                              </div>
                              <span style={{fontSize:8,color:lmc,fontFamily:"'Courier New',monospace",flexShrink:0}}>{fpct(lsnap.margenNetoPrecio)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {qty>1&&(
                        <div style={{fontSize:8,color:C.t3,fontFamily:"'Courier New',monospace",marginTop:5}}>
                          {qty} × {mxn(unitPriceConIVA)} = <span style={{color:C.cyan,fontWeight:700}}>{mxn(lsnap.precioConIVA)}</span> total
                        </div>
                      )}

                      <input value={l.notas} onChange={e=>updateLinea(i,{notas:e.target.value})}
                        placeholder="Descripción en PDF — dejar vacío para usar texto genérico"
                        style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,outline:"none",color:C.t3,fontSize:8,padding:"5px 0",marginTop:6,fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tax params */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
            <SHdr title="PARÁMETROS FISCALES"/>
            <div style={{padding:9,display:"grid",gridTemplateColumns:"80px 1fr 1fr",gap:8,alignItems:"center"}}>
              <div>
                <div style={{fontSize:7,color:C.t3,marginBottom:2}}>IVA (%)</div>
                <input type="number" min={0} step={0.1} value={iva}
                  onChange={e=>setIva(e.target.value)} onBlur={()=>setIva(v=>String(safeNumber(v,16)))}
                  style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 7px",color:C.t1,fontSize:11,outline:"none",fontFamily:"'Courier New',monospace"}}/>
              </div>
              <Toggle label="Compra incluye IVA" value={cIVA} onChange={setCIVA}/>
              <Toggle label="Venta incluye IVA"  value={vIVA} onChange={setVIVA}/>
            </div>
          </div>

          {/* Actions */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
            <button onClick={generarPDF}
              style={{padding:"9px",background:C.blue,border:"none",borderRadius:4,color:C.t1,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em"}}>
              Generar PDF
            </button>
            <button onClick={convertirATicket} disabled={isSaving}
              style={{padding:"9px",background:isSaving?C.bg2:C.green,border:"none",borderRadius:4,color:isSaving?C.t3:C.t1,fontSize:10,fontWeight:700,cursor:isSaving?"not-allowed":"pointer",letterSpacing:"0.06em",opacity:isSaving?0.6:1}}>
              {isSaving?"Registrando…":"Convertir a ticket"}
            </button>
            <button onClick={reset}
              style={{padding:"9px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:4,color:C.t2,fontSize:10,cursor:"pointer"}}>
              Limpiar
            </button>
          </div>
        </div>

        {/* RIGHT — margin + summary */}
        <div>
          {/* Global margin */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:6,overflow:"hidden"}}>
            <SHdr title="MARGEN GLOBAL" right={
              <div style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:7,color:C.t3}}>Por línea</span>
                <div onClick={()=>setUseGlobal(!useGlobal)}
                  style={{width:26,height:14,borderRadius:7,cursor:"pointer",position:"relative",background:!useGlobal?C.blue:C.bg4,border:`1px solid ${!useGlobal?C.blueHi:C.border}`}}>
                  <div style={{position:"absolute",top:2,left:!useGlobal?11:2,width:8,height:8,borderRadius:"50%",background:!useGlobal?C.t1:C.t3,transition:"left .15s"}}/>
                </div>
              </div>
            }/>
            <div style={{padding:9}}>
              {useGlobal?(
                <div>
                  <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:6}}>
                    <div style={{fontSize:24,fontWeight:800,fontFamily:"'Courier New',monospace",color:C.cyan,lineHeight:1}}>
                      {fpct(globalMargen)}
                    </div>
                    <div style={{fontSize:8,color:C.t3}}>aplicado a todas las líneas</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden"}}>
                    <input type="number" min={0} step={0.5} value={globalMargen}
                      onChange={e=>setGlobalMargen(safeNumber(e.target.value,30))}
                      style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:13,fontWeight:700,padding:"6px 8px",fontFamily:"'Courier New',monospace"}}/>
                    <span style={{padding:"0 7px",color:C.t3,fontSize:10}}>%</span>
                  </div>
                </div>
              ):(
                <div style={{fontSize:9,color:C.t3,padding:"8px 0"}}>Margen configurado por refacción individualmente.</div>
              )}
            </div>
          </div>

          {/* KPI totals */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
            <KPI label="Total c/IVA" value={mxn(totalSnap.precioConIVA)} color={C.cyan} accent
              sub={lineas.length>1?lineas.length+" refacciones":""}/>
            <KPI label="Util. neta" value={mxn(totalSnap.uNeta)}
              color={totalSnap.uNeta>=0?C.green:C.red}
              sub={fpct(aggMargen)+" del precio"}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
            <KPI label="Subtotal s/IVA" value={mxn(totalSnap.precioSinIVA)}/>
            <KPI label="Costo total"    value={mxn(totalSnap.costoTotal)}/>
          </div>

          {/* IVA breakdown */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:5,overflow:"hidden"}}>
            <SHdr title="FISCAL — IVA"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr"}}>
              {[
                ["IVA Acreditable","Recuperas",mxn(totalSnap.ivaAcred),C.blueHi],
                ["IVA Trasladado","Cobras",mxn(totalSnap.ivaTraslad),C.cyan],
                ["IVA Neto SAT","Pagas al SAT",mxn(totalSnap.ivaNeto),totalSnap.ivaNeto>=0?C.yellow:C.green],
              ].map(([lbl,sub,val,col],i)=>(
                <div key={i} style={{padding:"7px 8px",borderRight:i<2?`1px solid ${C.border}`:"none"}}>
                  <div style={{fontSize:7,color:C.t3,marginBottom:2}}>{lbl}</div>
                  <div style={{fontSize:11,fontWeight:800,color:col,fontFamily:"'Courier New',monospace"}}>{val}</div>
                  <div style={{fontSize:7,color:C.t3,marginTop:1}}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Per-line breakdown */}
          {lineas.length>1&&(
            <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",marginBottom:5}}>
              <SHdr title="DESGLOSE POR REFACCIÓN"/>
              {lineas.map((l,i)=>{
                const lsnap=lineSnaps[i]||{precioConIVA:0,uNeta:0};
                return (
                  <div key={l.key} style={{display:"flex",justifyContent:"space-between",padding:"5px 9px",borderBottom:i<lineas.length-1?`1px solid ${C.border}`:"none",background:i%2===0?C.bg1:C.bg0}}>
                    <div style={{minWidth:0,flex:1,marginRight:8}}>
                      <div style={{fontSize:9,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.descripcion||`Refacción ${i+1}`}</div>
                      {l.oem&&<div style={{fontSize:7,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{l.oem}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(lsnap.precioConIVA)}</div>
                      <div style={{fontSize:8,color:lsnap.uNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(lsnap.uNeta)}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 9px",background:C.blueDim,borderTop:`1px solid ${C.blueHi}`}}>
                <span style={{fontSize:9,fontWeight:700,color:C.t1}}>TOTAL</span>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(totalSnap.precioConIVA)}</div>
                  <div style={{fontSize:9,fontWeight:700,color:totalSnap.uNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(totalSnap.uNeta)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Margin bar */}
          <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,padding:8}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
              <span style={{fontSize:8,color:C.t2}}>Margen neto s/precio</span>
              <span style={{fontSize:9,fontWeight:700,color:mColor,fontFamily:"'Courier New',monospace"}}>{fpct(aggMargen)}</span>
            </div>
            <div style={{height:4,background:C.bg4,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${clamp(aggMargen,0,100)}%`,background:mColor,transition:"width .3s"}}/>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:3,fontSize:7,color:C.t3}}>
              <span>Bajo &lt;10%</span><span>Aceptable 10-20%</span><span>Óptimo &gt;20%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── UNIDADES ──────────────────────────────────────────────────────────────────
function Unidades({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {units,clients,tickets} = state;
  const [search,  setSearch]  = useState("");
  const [fStatus, setFStatus] = useState("all");
  const [sel,     setSel]     = useState(null);
  const [editId,  setEditId]  = useState(null);
  const [adding,  setAdding]  = useState(false);
  const [confirm, setConfirm] = useState(null);
  const empty={vin:"",marca:"",modelo:"",anio:"",motor:"",transmision:"",config:"",clientId:"",statusOp:"operativa",km:"",notas:"",placa:"",economico:""};
  const [form,setForm]=useState(empty);
  const sf=k=>v=>setForm(p=>({...p,[k]:v}));
  const dSearch = useDebounce(search, 250);

  const [fConOp, setFConOp] = useState(false);

  const unitsWithOpenOp = useMemo(()=>new Set(tickets.filter(t=>!CLOSED_SET.has(t.status)&&t.unitId).map(t=>t.unitId)),[tickets]);

  const filtered=useMemo(()=>units.filter(u=>{
    if(fStatus!=="all"&&u.statusOp!==fStatus) return false;
    if(fConOp&&!unitsWithOpenOp.has(u.id)) return false;
    if(dSearch){const lq=safeLower(dSearch);if(!safeLower(u.vin).includes(lq)&&!safeLower(u.marca).includes(lq)&&!safeLower(u.modelo).includes(lq)&&!safeLower(u.economico).includes(lq)&&!safeLower(u.placa).includes(lq))return false;}
    return true;
  }),[units,dSearch,fStatus,fConOp,unitsWithOpenOp]);

  const unitTickets=useCallback(id=>tickets.filter(t=>t.unitId===id),[tickets]);

  const startAdd=()=>{setAdding(true);setEditId(null);setForm(empty);};
  const startEdit=(u,e)=>{e.stopPropagation();setEditId(u.id);setAdding(false);setForm({...u});};
  const cancel=()=>{setAdding(false);setEditId(null);setForm(empty);};
  const save=()=>{
    const parsed={...form,km:parseInt(form.km)||0};
    if(editId){dispatch({type:"UNIT_UPDATE",id:editId,patch:parsed});toast("Unidad actualizada","success");}
    else{dispatch({type:"UNIT_ADD",u:{...parsed,id:mkUnitId()}});toast("Unidad registrada","success");}
    cancel();
  };
  const del=(id,e)=>{e.stopPropagation();setConfirm(units.find(u=>u.id===id));};

  const showForm=adding||!!editId;
  const stMeta=UNIT_STATUS;

  return (
    <div style={{padding:"10px 13px",maxWidth:1200,margin:"0 auto"}}>
      {confirm&&<Confirm msg={"Eliminar unidad: "+confirm.marca+" "+confirm.modelo+" "+confirm.anio+"?"} onConfirm={()=>{dispatch({type:"UNIT_DELETE",id:confirm.id});setSel(null);setConfirm(null);toast("Unidad eliminada","info");}} onCancel={()=>setConfirm(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <div style={{fontSize:7,color:C.t3,letterSpacing:"0.2em"}}>FLOTA — {units.length} unidades registradas</div>
        <button onClick={showForm?cancel:startAdd} style={{padding:"4px 11px",background:showForm?"transparent":C.blue,border:`1px solid ${showForm?C.border:C.blue}`,borderRadius:3,color:showForm?C.t2:C.t1,fontSize:10,fontWeight:600,cursor:"pointer"}}>
          {showForm?"Cancelar":"+ Nueva unidad"}
        </button>
      </div>

      {showForm&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:4,padding:11,marginBottom:8}}>
          <div style={{fontSize:7,color:C.t3,letterSpacing:"0.18em",marginBottom:7}}>{editId?"EDITAR UNIDAD":"NUEVA UNIDAD"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:7}}>
            <Field label="VIN / Serial"   value={form.vin}          onChange={sf("vin")}          prefix=""/>
            <Field label="Marca"          value={form.marca}        onChange={sf("marca")}        prefix=""/>
            <Field label="Modelo"         value={form.modelo}       onChange={sf("modelo")}       prefix=""/>
            <Field label="Año"            value={form.anio}         onChange={sf("anio")}         prefix="" type="number" min={1990}/>
            <Field label="Motor"          value={form.motor}        onChange={sf("motor")}        prefix=""/>
            <Field label="Transmision"    value={form.transmision}  onChange={sf("transmision")}  prefix=""/>
            <Field label="Configuracion"  value={form.config}       onChange={sf("config")}       prefix="" placeholder="4x2, 6x4..."/>
            <Field label="Kilometraje"    value={form.km}           onChange={sf("km")}           prefix="" suffix="km" type="number" min={0}/>
            <Field label="No. Económico"  value={form.economico||""} onChange={sf("economico")}   prefix="" placeholder="Ej: 1045"/>
            <Field label="Placa"          value={form.placa||""}    onChange={sf("placa")}        prefix="" placeholder="Ej: 912FE2"/>
            <Sel label="Cliente"          value={form.clientId}     onChange={sf("clientId")}     options={[{value:"",label:"-- Sin cliente --"},...clients.map(c=>({value:c.id,label:c.empresa}))]}/>
            <Sel label="Estado operativo" value={form.statusOp}     onChange={sf("statusOp")}     options={Object.entries(UNIT_STATUS).map(([k,v])=>({value:k,label:v.label}))}/>
          </div>
          <Field label="Notas tecnicas" value={form.notas} onChange={sf("notas")} prefix="" rows={2} placeholder="Historial tecnico, advertencias, patrones de falla..."/>
          <div style={{display:"flex",gap:6,marginTop:7}}>
            <button onClick={save} style={{padding:"5px 14px",background:C.blue,border:"none",borderRadius:3,color:C.t1,fontSize:11,fontWeight:700,cursor:"pointer"}}>{editId?"Guardar cambios":"Guardar unidad"}</button>
            <button onClick={cancel} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:11,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      {units.length===0&&!showForm&&<EmptyState icon="&#128666;" title="Sin unidades registradas" sub='Agrega la primera con "+ Nueva unidad"'/>}

      {/* Filtros */}
      {units.length>0&&(
        <div style={{display:"flex",gap:5,marginBottom:6,alignItems:"center",flexWrap:"wrap"}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar eco., placa, VIN, marca..."
            style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 8px",color:C.t1,fontSize:10,outline:"none",width:220,fontFamily:"'Courier New',monospace"}}/>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t1,fontSize:10,outline:"none",cursor:"pointer"}}>
            <option value="all">Todos los estados</option>
            {Object.entries(UNIT_STATUS).map(([k,v])=><option key={k} value={k} style={{background:C.bg1}}>{v.label}</option>)}
          </select>
          <button onClick={()=>setFConOp(v=>!v)}
            style={{padding:"4px 10px",background:fConOp?C.yellowDim:"transparent",border:`1px solid ${fConOp?C.yellow:C.border}`,borderRadius:3,color:fConOp?C.yellow:C.t2,fontSize:10,cursor:"pointer",fontWeight:fConOp?700:400,display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:fConOp?C.yellow:C.t3,flexShrink:0,display:"inline-block"}}/>
            Con operación abierta {fConOp&&unitsWithOpenOp.size>0?`(${unitsWithOpenOp.size})`:""}
          </button>
          {(search||fStatus!=="all"||fConOp)&&(
            <button onClick={()=>{setSearch("");setFStatus("all");setFConOp(false);}}
              style={{padding:"4px 8px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t3,fontSize:9,cursor:"pointer"}}>
              × Limpiar
            </button>
          )}
          <span style={{fontSize:8,color:C.t3,marginLeft:"auto"}}>{filtered.length} de {units.length}</span>
        </div>
      )}

      {filtered.length>0&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"0.6fr 0.5fr 1.4fr 0.7fr 1fr 1fr 0.6fr 0.6fr 0.6fr 60px",padding:"4px 9px",borderBottom:`1px solid ${C.border}`,fontSize:7,color:C.t3,letterSpacing:"0.1em",gap:5}}>
            <span>ECO.</span><span>VIN</span><span>UNIDAD</span><span>AÑO</span><span>MOTOR</span><span>TRANSMISION</span><span>KM</span><span>CLIENTE</span><span>ESTADO</span><span/>
          </div>
          {filtered.map((u,i)=>{
            const st=stMeta[u.statusOp]||stMeta.operativa;
            const cl=clients.find(c=>c.id===u.clientId);
            const tks=unitTickets(u.id);
            const openTks=tks.filter(t=>!CLOSED_SET.has(t.status));
            const exp=sel===u.id;
            return (
              <div key={u.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <div onClick={()=>setSel(exp?null:u.id)}
                  style={{display:"grid",gridTemplateColumns:"0.6fr 0.5fr 1.4fr 0.7fr 1fr 1fr 0.6fr 0.6fr 0.6fr 60px",padding:"7px 9px",background:exp?C.blueDim:i%2===0?C.bg1:C.bg2,gap:5,alignItems:"center",cursor:"pointer",borderLeft:`3px solid ${st.dot}`}}>
                  <div style={{fontSize:9,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.economico||"—"}</div>
                  <div style={{fontSize:8,color:C.t3,fontFamily:"'Courier New',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.vin.slice(-8)}</div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:C.t1}}>{u.marca} {u.modelo}</div>
                    <div style={{display:"flex",gap:5,alignItems:"center",marginTop:1}}>
                      <span style={{fontSize:7,color:C.t3}}>{u.id} · {u.config||"---"}</span>
                      {openTks.length>0&&<span style={{fontSize:7,fontWeight:700,color:C.yellow,background:C.yellowDim,border:`1px solid ${C.yellow}44`,borderRadius:2,padding:"0 4px"}}>{openTks.length} op. abierta{openTks.length>1?"s":""}</span>}
                    </div>
                  </div>
                  <div style={{fontSize:9,color:C.t2,fontFamily:"'Courier New',monospace"}}>{u.anio}</div>
                  <div style={{fontSize:8,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.motor||"---"}</div>
                  <div style={{fontSize:8,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.transmision||"---"}</div>
                  <div style={{fontSize:9,color:C.t2,fontFamily:"'Courier New',monospace"}}>{u.km?u.km.toLocaleString():"---"}</div>
                  <div style={{fontSize:8,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cl?cl.empresa.split(" ")[0]:"---"}</div>
                  <div>
                    <span style={{display:"inline-block",padding:"2px 5px",borderRadius:2,background:st.color+"22",border:`1px solid ${st.color}55`,fontSize:7,color:st.dot,fontWeight:600}}>{st.label}</span>
                  </div>
                  <div style={{display:"flex",gap:3}}>
                    <button onClick={e=>startEdit(u,e)} style={{padding:"2px 5px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:8,cursor:"pointer"}}>Editar</button>
                    <button onClick={e=>del(u.id,e)}    style={{padding:"2px 4px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:3,color:C.red,fontSize:9,cursor:"pointer"}}>x</button>
                  </div>
                </div>
                {exp&&(
                  <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,padding:"8px 11px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:6,fontSize:8}}>
                      <span style={{color:C.t3}}>No. Económico: <span style={{color:C.cyan,fontFamily:"'Courier New',monospace",fontWeight:700}}>{u.economico||"---"}</span></span>
                      <span style={{color:C.t3}}>Placa: <span style={{color:C.t2,fontFamily:"'Courier New',monospace"}}>{u.placa||"---"}</span></span>
                      <span style={{color:C.t3}}>VIN: <span style={{color:C.t2,fontFamily:"'Courier New',monospace"}}>{u.vin||"---"}</span></span>
                      <span style={{color:C.t3}}>Config: <span style={{color:C.t2}}>{u.config||"---"}</span></span>
                      <span style={{color:C.t3}}>Motor: <span style={{color:C.t2}}>{u.motor||"---"}</span></span>
                      <span style={{color:C.t3}}>Transmision: <span style={{color:C.t2}}>{u.transmision||"---"}</span></span>
                    </div>
                    {u.notas&&<div style={{fontSize:8,color:C.t3,marginBottom:6,fontStyle:"italic",lineHeight:1.4}}>"{u.notas}"</div>}
                    <div style={{fontSize:7,color:C.t3,marginBottom:4,letterSpacing:"0.1em"}}>HISTORIAL OPERATIVO ({tks.length} tickets)</div>
                    {tks.length===0?<div style={{fontSize:8,color:C.t3}}>Sin tickets vinculados a esta unidad.</div>:
                      tks.slice(0,4).map(t=>(
                        <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:`1px solid ${C.border}`,fontSize:8,alignItems:"center"}}>
                          <span style={{color:C.t3,fontFamily:"'Courier New',monospace"}}>{t.id}</span>
                          <span style={{color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>{t.titulo}</span>
                          <PriorityBadge pid={t.priority} small/>
                          <StatusBadge sid={t.status} meta={TICKET_META} small/>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CATALOGO DE PARTES ────────────────────────────────────────────────────────
function Catalogo({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {parts,suppliers} = state;
  const [search, setSearch]  = useState("");
  const [sel,    setSel]     = useState(null);
  const [editId, setEditId]  = useState(null);
  const [adding, setAdding]  = useState(false);
  const [confirm,setConfirm] = useState(null);
  const empty={nombre:"",oem:"",aftermarket:"",aplicacion:"",notas:"",proveedor:"",ultimoPrecio:"",ultimaFecha:""};
  const [form,setForm]=useState(empty);
  const sf=k=>v=>setForm(p=>({...p,[k]:v}));
  const dSearch = useDebounce(search, 250);

  const filtered=useMemo(()=>parts.filter(p=>{
    if(!dSearch.trim()) return true;
    const lq=safeLower(dSearch);
    return safeLower(p.nombre).includes(lq)||safeLower(p.oem).includes(lq)||safeLower(p.aftermarket).includes(lq)||safeLower(p.aplicacion).includes(lq);
  }),[parts,dSearch]);

  const startAdd=()=>{setAdding(true);setEditId(null);setForm(empty);};
  const startEdit=(p,e)=>{e.stopPropagation();setEditId(p.id);setAdding(false);setForm({...p,ultimoPrecio:String(p.ultimoPrecio||"")});};
  const cancel=()=>{setAdding(false);setEditId(null);setForm(empty);};
  const save=()=>{
    const parsed={...form,ultimoPrecio:parseFloat(form.ultimoPrecio)||0};
    if(editId){dispatch({type:"PART_UPDATE",id:editId,patch:parsed});toast("Parte actualizada","success");}
    else{dispatch({type:"PART_ADD",p:{...parsed,id:mkPartId()}});toast("Parte registrada","success");}
    cancel();
  };
  const del=(id,e)=>{e.stopPropagation();setConfirm(parts.find(p=>p.id===id));};
  const showForm=adding||!!editId;

  return (
    <div style={{padding:"10px 13px",maxWidth:1200,margin:"0 auto"}}>
      {confirm&&<Confirm msg={"Eliminar: "+confirm.nombre+"?"} onConfirm={()=>{dispatch({type:"PART_DELETE",id:confirm.id});setSel(null);setConfirm(null);toast("Eliminado","info");}} onCancel={()=>setConfirm(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <div style={{fontSize:7,color:C.t3,letterSpacing:"0.2em"}}>CATALOGO DE PARTES — {parts.length} registradas</div>
        <button onClick={showForm?cancel:startAdd} style={{padding:"4px 11px",background:showForm?"transparent":C.blue,border:`1px solid ${showForm?C.border:C.blue}`,borderRadius:3,color:showForm?C.t2:C.t1,fontSize:10,fontWeight:600,cursor:"pointer"}}>
          {showForm?"Cancelar":"+ Nueva parte"}
        </button>
      </div>

      {showForm&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:4,padding:11,marginBottom:8}}>
          <div style={{fontSize:7,color:C.t3,letterSpacing:"0.18em",marginBottom:7}}>{editId?"EDITAR PARTE":"NUEVA PARTE"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
            <Field label="Nombre / descripcion" value={form.nombre}       onChange={sf("nombre")}       prefix=""/>
            <Field label="Num. OEM"             value={form.oem}          onChange={sf("oem")}          prefix=""/>
            <Field label="Aftermarket / equiv."  value={form.aftermarket}  onChange={sf("aftermarket")}  prefix="" placeholder="Marca · codigo"/>
            <Field label="Aplicacion / modelos" value={form.aplicacion}   onChange={sf("aplicacion")}   prefix="" placeholder="Marca modelo año motor"/>
            <Field label="Ultimo precio (c/IVA)" value={form.ultimoPrecio} onChange={sf("ultimoPrecio")} type="number" min={0}/>
            <Field label="Ultima fecha"          value={form.ultimaFecha}  onChange={sf("ultimaFecha")}  prefix="" hint="DD/MM/AAAA"/>
            <Field label="Proveedor habitual"    value={form.proveedor}    onChange={sf("proveedor")}    prefix=""/>
          </div>
          <Field label="Notas tecnicas" value={form.notas} onChange={sf("notas")} prefix="" rows={2} placeholder="Advertencias, variantes, notas de compatibilidad..."/>
          <div style={{display:"flex",gap:6,marginTop:7}}>
            <button onClick={save} style={{padding:"5px 14px",background:C.blue,border:"none",borderRadius:3,color:C.t1,fontSize:11,fontWeight:700,cursor:"pointer"}}>{editId?"Guardar cambios":"Guardar parte"}</button>
            <button onClick={cancel} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:11,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{marginBottom:6}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar por nombre, OEM, aftermarket, aplicacion..."
          style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 9px",color:C.t1,fontSize:10,outline:"none",width:320,fontFamily:"'Courier New',monospace"}}/>
      </div>

      {parts.length===0&&!showForm&&<EmptyState icon="&#128295;" title="Sin partes registradas" sub='Agrega la primera con "+ Nueva parte"'/>}

      {filtered.length>0&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 2fr 0.8fr 60px",padding:"4px 9px",borderBottom:`1px solid ${C.border}`,fontSize:7,color:C.t3,letterSpacing:"0.1em",gap:5}}>
            <span>NOMBRE</span><span>OEM</span><span>AFTERMARKET</span><span>APLICACION</span><span>ULT. PRECIO</span><span/>
          </div>
          {filtered.map((p,i)=>{
            const exp=sel===p.id;
            return (
              <div key={p.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <div onClick={()=>setSel(exp?null:p.id)}
                  style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 2fr 0.8fr 60px",padding:"7px 9px",background:exp?C.blueDim:i%2===0?C.bg1:C.bg2,gap:5,alignItems:"center",cursor:"pointer"}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                    <div style={{fontSize:7,color:C.t3}}>{p.id}</div>
                  </div>
                  <div style={{fontSize:9,color:C.cyan,fontFamily:"'Courier New',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.oem||"---"}</div>
                  <div style={{fontSize:8,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.aftermarket||"---"}</div>
                  <div style={{fontSize:8,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.aplicacion||"---"}</div>
                  <div style={{fontSize:9,fontWeight:700,color:C.yellow,fontFamily:"'Courier New',monospace"}}>{p.ultimoPrecio?mxn(p.ultimoPrecio):"---"}</div>
                  <div style={{display:"flex",gap:3}}>
                    <button onClick={e=>startEdit(p,e)} style={{padding:"2px 5px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:8,cursor:"pointer"}}>Editar</button>
                    <button onClick={e=>del(p.id,e)}    style={{padding:"2px 4px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:3,color:C.red,fontSize:9,cursor:"pointer"}}>x</button>
                  </div>
                </div>
                {exp&&(
                  <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,padding:"7px 11px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:4,fontSize:8}}>
                      <span style={{color:C.t3}}>OEM: <span style={{color:C.cyan,fontFamily:"'Courier New',monospace"}}>{p.oem||"---"}</span></span>
                      <span style={{color:C.t3}}>Aftermarket: <span style={{color:C.t2}}>{p.aftermarket||"---"}</span></span>
                      <span style={{color:C.t3}}>Proveedor: <span style={{color:C.t2}}>{p.proveedor||"---"}</span></span>
                      <span style={{color:C.t3}}>Ult. precio: <span style={{color:C.yellow,fontFamily:"'Courier New',monospace"}}>{p.ultimoPrecio?mxn(p.ultimoPrecio):"---"}</span></span>
                      <span style={{color:C.t3}}>Ult. fecha: <span style={{color:C.t2}}>{p.ultimaFecha||"---"}</span></span>
                    </div>
                    {p.notas&&<div style={{fontSize:8,color:C.t3,lineHeight:1.5,fontStyle:"italic"}}>"{p.notas}"</div>}
                    <div style={{fontSize:8,color:C.t2,marginTop:4,lineHeight:1.4}}>Aplicacion: <span style={{color:C.t1}}>{p.aplicacion||"---"}</span></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── PROVEEDORES ───────────────────────────────────────────────────────────────
function Proveedores({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {suppliers,tickets} = state;
  const [sel,    setSel]    = useState(null);
  const [editId, setEditId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [confirm,setConfirm]= useState(null);
  const empty={nombre:"",categoria:"heavy",especialidad:"",entregaDias:1,confiabilidad:85,contacto:"",correo:"",horario:"",cobertura:"",scoreOp:80,incidencias:0};
  const [form,setForm]=useState(empty);
  const sf=k=>v=>setForm(p=>({...p,[k]:v}));

  const stats=useCallback(id=>{
    const so=tickets.filter(t=>t.supplierId===id);
    return{total:so.length,neta:so.reduce((s,t)=>s+(t.snap?.uNeta||0),0),inv:so.reduce((s,t)=>s+(t.snap?.costoBase||0)*(1+((t.snap?.params?.iva||16))/100),0)};
  },[tickets]);
  const maxNeta=useMemo(()=>Math.max(...suppliers.map(s=>stats(s.id).neta),1),[suppliers,tickets]);

  const startAdd=()=>{setAdding(true);setEditId(null);setForm(empty);};
  const startEdit=(s,e)=>{e.stopPropagation();setEditId(s.id);setAdding(false);setForm({...s});};
  const cancel=()=>{setAdding(false);setEditId(null);setForm(empty);};
  const save=()=>{
    if(editId){dispatch({type:"SUP_UPDATE",id:editId,patch:form});toast("Proveedor actualizado","success");}
    else{dispatch({type:"SUP_ADD",s:{...form,id:"PRV-"+Date.now().toString().slice(-5)}});toast("Proveedor registrado","success");}
    cancel();
  };
  const del=(id,e)=>{e.stopPropagation();setConfirm(suppliers.find(s=>s.id===id));};
  const showForm=adding||!!editId;

  return (
    <div style={{padding:"10px 13px",maxWidth:1100,margin:"0 auto"}}>
      {confirm&&<Confirm msg={"Eliminar: "+confirm.nombre+"?"} onConfirm={()=>{dispatch({type:"SUP_DELETE",id:confirm.id});setSel(null);setConfirm(null);toast("Eliminado","info");}} onCancel={()=>setConfirm(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <div style={{fontSize:7,color:C.t3,letterSpacing:"0.2em"}}>RED DE SUMINISTRO — {suppliers.length} proveedores</div>
        <button onClick={showForm?cancel:startAdd} style={{padding:"4px 11px",background:showForm?"transparent":C.blue,border:`1px solid ${showForm?C.border:C.blue}`,borderRadius:3,color:showForm?C.t2:C.t1,fontSize:10,fontWeight:600,cursor:"pointer"}}>
          {showForm?"Cancelar":"+ Nuevo proveedor"}
        </button>
      </div>

      {showForm&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:4,padding:11,marginBottom:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
            <Field label="Nombre"          value={form.nombre}        onChange={sf("nombre")}        prefix=""/>
            <Field label="Especialidad"    value={form.especialidad}  onChange={sf("especialidad")}  prefix=""/>
            <Field label="Contacto"        value={form.contacto}      onChange={sf("contacto")}      prefix=""/>
            <Field label="Correo"          value={form.correo}        onChange={sf("correo")}        prefix=""/>
            <Field label="Horario"         value={form.horario}       onChange={sf("horario")}       prefix="" placeholder="Lun-Sab 07:00-20:00"/>
            <Field label="Cobertura"       value={form.cobertura}     onChange={sf("cobertura")}     prefix="" placeholder="CDMX, Edomex..."/>
            <Field label="Entrega (dias)"  value={form.entregaDias}   onChange={sf("entregaDias")}   prefix="" type="number" min={0}/>
            <Field label="Confiabilidad"   value={form.confiabilidad} onChange={sf("confiabilidad")} prefix="" suffix="/100" type="number" min={0}/>
            <Field label="Score operativo" value={form.scoreOp}       onChange={sf("scoreOp")}       prefix="" suffix="/100" type="number" min={0}/>
            <Field label="Incidencias"     value={form.incidencias}   onChange={sf("incidencias")}   prefix="" type="number" min={0}/>
            <Sel   label="Categoria"       value={form.categoria}     onChange={sf("categoria")}     options={OP_TYPES.map(o=>({value:o.id,label:o.label}))}/>
          </div>
          <div style={{display:"flex",gap:6,marginTop:7}}>
            <button onClick={save} style={{padding:"5px 14px",background:C.blue,border:"none",borderRadius:3,color:C.t1,fontSize:11,fontWeight:700,cursor:"pointer"}}>{editId?"Guardar cambios":"Guardar proveedor"}</button>
            <button onClick={cancel} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:11,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}

      {suppliers.length===0&&!showForm&&<EmptyState icon="&#127981;" title="Sin proveedores registrados"/>}

      {suppliers.length>0&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1.8fr 0.8fr 0.6fr 0.6fr 0.7fr 1fr 1fr 60px",padding:"4px 9px",borderBottom:`1px solid ${C.border}`,fontSize:7,color:C.t3,letterSpacing:"0.1em",gap:5}}>
            <span>PROVEEDOR</span><span>COBERTURA</span><span>ENTREGA</span><span>CONF.</span><span>SCORE OP.</span><span>INVERTIDO</span><span>UTIL. GEN.</span><span/>
          </div>
          {suppliers.map((s,i)=>{
            const st=stats(s.id);
            const exp=sel===s.id;
            return (
              <div key={s.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <div onClick={()=>setSel(exp?null:s.id)}
                  style={{display:"grid",gridTemplateColumns:"1.8fr 0.8fr 0.6fr 0.6fr 0.7fr 1fr 1fr 60px",padding:"7px 9px",background:exp?C.blueDim:i%2===0?C.bg1:C.bg2,gap:5,alignItems:"center",cursor:"pointer"}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.nombre}</div>
                    <div style={{fontSize:7,color:C.t3}}>{s.especialidad}</div>
                    <MiniBar value={st.neta} max={maxNeta} color={C.greenDim}/>
                  </div>
                  <div style={{fontSize:8,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.cobertura||"---"}</div>
                  <div style={{fontSize:9,color:C.t1,fontFamily:"'Courier New',monospace"}}>{s.entregaDias}d</div>
                  <div style={{fontSize:9,fontWeight:700,color:s.confiabilidad>=90?C.green:s.confiabilidad>=75?C.yellow:C.red,fontFamily:"'Courier New',monospace"}}>{s.confiabilidad}%</div>
                  <div style={{fontSize:9,fontWeight:700,color:s.scoreOp>=80?C.green:s.scoreOp>=60?C.yellow:C.red,fontFamily:"'Courier New',monospace"}}>{s.scoreOp}</div>
                  <div style={{fontSize:9,color:C.t2,fontFamily:"'Courier New',monospace"}}>{mxn(st.inv)}</div>
                  <div style={{fontSize:10,fontWeight:700,color:st.neta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(st.neta)}</div>
                  <div style={{display:"flex",gap:3}}>
                    <button onClick={e=>startEdit(s,e)} style={{padding:"2px 5px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:8,cursor:"pointer"}}>Editar</button>
                    <button onClick={e=>del(s.id,e)}    style={{padding:"2px 4px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:3,color:C.red,fontSize:9,cursor:"pointer"}}>x</button>
                  </div>
                </div>
                {exp&&(
                  <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,padding:"7px 11px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,fontSize:8}}>
                      <span style={{color:C.t3}}>ID: <span style={{color:C.t2,fontFamily:"'Courier New',monospace"}}>{s.id}</span></span>
                      <span style={{color:C.t3}}>Contacto: <span style={{color:C.t2}}>{s.contacto||"---"}</span></span>
                      <span style={{color:C.t3}}>Correo: <span style={{color:C.t2}}>{s.correo||"---"}</span></span>
                      <span style={{color:C.t3}}>Horario: <span style={{color:C.t2}}>{s.horario||"---"}</span></span>
                      <span style={{color:C.t3}}>Incidencias: <span style={{color:s.incidencias>0?C.red:C.green,fontFamily:"'Courier New',monospace"}}>{s.incidencias}</span></span>
                      <span style={{color:C.t3}}>Util. prom/op: <span style={{color:C.green,fontFamily:"'Courier New',monospace"}}>{mxn(st.total>0?st.neta/st.total:0)}</span></span>
                      <span style={{color:C.t3}}>Margen s/inv: <span style={{color:C.cyan,fontFamily:"'Courier New',monospace"}}>{st.inv>0?fpct((st.neta/st.inv)*100):"---"}</span></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CLIENTES ──────────────────────────────────────────────────────────────────
function Clientes({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {clients,tickets,units} = state;
  const [sel,setSel]=useState(null);
  const [editId,setEditId]=useState(null);
  const [adding,setAdding]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const empty={empresa:"",contacto:"",tel:"",correo:"",rfc:"",direccion:"",ciudad:"",estado:"",creditDays:15,category:"B",score:70};
  const [form,setForm]=useState(empty);
  const sf=k=>v=>setForm(p=>({...p,[k]:v}));

  const stats=useCallback(id=>{
    const co=tickets.filter(t=>t.clientId===id);
    return{total:co.length,fact:co.reduce((s,t)=>s+(t.snap?.precioConIVA||0),0),neta:co.reduce((s,t)=>s+(t.snap?.uNeta||0),0),pend:co.filter(t=>t.payType==="credit"&&!t.cobrado).reduce((s,t)=>s+(t.snap?.precioConIVA||0),0)};
  },[tickets]);
  const maxFact=useMemo(()=>Math.max(...clients.map(c=>stats(c.id).fact),1),[clients,tickets]);

  const startAdd=()=>{setAdding(true);setEditId(null);setForm(empty);};
  const startEdit=(c,e)=>{e.stopPropagation();setEditId(c.id);setAdding(false);setForm({...c});};
  const cancel=()=>{setAdding(false);setEditId(null);setForm(empty);};
  const save=()=>{
    if(editId){dispatch({type:"CLI_UPDATE",id:editId,patch:form});toast("Cliente actualizado","success");}
    else{dispatch({type:"CLI_ADD",c:{...form,id:genId("CLI"),unidades:[]}});toast("Cliente registrado","success");}
    cancel();
  };
  const del=(id,e)=>{e.stopPropagation();setConfirm(clients.find(c=>c.id===id));};
  const showForm=adding||!!editId;

  return (
    <div style={{padding:"10px 13px",maxWidth:1100,margin:"0 auto"}}>
      {confirm&&<Confirm msg={"Eliminar: "+confirm.empresa+"?"} onConfirm={()=>{dispatch({type:"CLI_DELETE",id:confirm.id});setSel(null);setConfirm(null);toast("Eliminado","info");}} onCancel={()=>setConfirm(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <div style={{fontSize:7,color:C.t3,letterSpacing:"0.2em"}}>CLIENTES — {clients.length} registrados</div>
        <button onClick={showForm?cancel:startAdd} style={{padding:"4px 11px",background:showForm?"transparent":C.blue,border:`1px solid ${showForm?C.border:C.blue}`,borderRadius:3,color:showForm?C.t2:C.t1,fontSize:10,fontWeight:600,cursor:"pointer"}}>
          {showForm?"Cancelar":"+ Nuevo cliente"}
        </button>
      </div>
      {showForm&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:4,padding:11,marginBottom:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
            <Field label="Empresa / Razón social" value={form.empresa}    onChange={sf("empresa")}    prefix="" hint="Razón social"/>
            <Field label="RFC"                    value={form.rfc||""}    onChange={sf("rfc")}         prefix=""/>
            <Field label="Contacto"               value={form.contacto}   onChange={sf("contacto")}   prefix=""/>
            <Field label="Teléfono"               value={form.tel}        onChange={sf("tel")}         prefix=""/>
            <Field label="Correo"                 value={form.correo||""} onChange={sf("correo")}     prefix=""/>
            <Field label="Días crédito"           value={form.creditDays} onChange={sf("creditDays")} prefix="" suffix="días" type="number"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:7,marginTop:7}}>
            <Field label="Dirección"   value={form.direccion||""} onChange={sf("direccion")} prefix="" hint="Calle, número, colonia"/>
            <Field label="Ciudad"      value={form.ciudad||""}    onChange={sf("ciudad")}    prefix=""/>
            <Field label="Estado"      value={form.estado||""}    onChange={sf("estado")}    prefix=""/>
          </div>
          <div style={{display:"flex",gap:6,marginTop:7}}>
            <button onClick={save} style={{padding:"5px 14px",background:C.blue,border:"none",borderRadius:3,color:C.t1,fontSize:11,fontWeight:700,cursor:"pointer"}}>{editId?"Guardar cambios":"Guardar cliente"}</button>
            <button onClick={cancel} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:11,cursor:"pointer"}}>Cancelar</button>
          </div>
        </div>
      )}
      {clients.length===0&&!showForm&&<EmptyState icon="&#127970;" title="Sin clientes registrados"/>}
      {clients.length>0&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1.6fr 0.8fr 1fr 1fr 0.8fr 0.6fr 60px",padding:"4px 9px",borderBottom:`1px solid ${C.border}`,fontSize:7,color:C.t3,letterSpacing:"0.1em",gap:5}}>
            <span>EMPRESA</span><span>CONTACTO</span><span>FACTURADO</span><span>UTIL. NETA</span><span>PENDIENTE</span><span>SCORE</span><span/>
          </div>
          {clients.map((c,i)=>{
            const st=stats(c.id);
            const pctU=st.fact>0?(st.neta/st.fact)*100:0;
            const exp=sel===c.id;
            const cliUnits=units.filter(u=>u.clientId===c.id);
            return (
              <div key={c.id} style={{borderBottom:`1px solid ${C.border}`}}>
                <div onClick={()=>setSel(exp?null:c.id)}
                  style={{display:"grid",gridTemplateColumns:"1.6fr 0.8fr 1fr 1fr 0.8fr 0.6fr 60px",padding:"7px 9px",background:exp?C.blueDim:i%2===0?C.bg1:C.bg2,gap:5,alignItems:"center",cursor:"pointer"}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.empresa}</div>
                    <div style={{fontSize:7,color:C.t3}}>{c.id}</div>
                    <MiniBar value={st.fact} max={maxFact} color={C.cyanDim}/>
                  </div>
                  <div style={{fontSize:9,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.contacto||"---"}</div>
                  <div style={{fontSize:10,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(st.fact)}</div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:st.neta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(st.neta)}</div>
                    <div style={{fontSize:7,color:C.t3}}>{fpct(pctU)} del fact.</div>
                  </div>
                  <div style={{fontSize:9,color:st.pend>0?C.yellow:C.t3,fontFamily:"'Courier New',monospace",fontWeight:st.pend>0?700:400}}>{st.pend>0?mxn(st.pend):"---"}</div>
                  <div style={{fontSize:10,fontWeight:700,color:c.score>=80?C.green:c.score>=60?C.yellow:C.red,fontFamily:"'Courier New',monospace"}}>{c.score}</div>
                  <div style={{display:"flex",gap:3}}>
                    <button onClick={e=>startEdit(c,e)} style={{padding:"2px 5px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:8,cursor:"pointer"}}>Editar</button>
                    <button onClick={e=>del(c.id,e)}    style={{padding:"2px 4px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:3,color:C.red,fontSize:9,cursor:"pointer"}}>x</button>
                  </div>
                </div>
                {exp&&(
                  <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,padding:"7px 11px"}}>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:5,fontSize:8}}>
                      <span style={{color:C.t3}}>Tel: <span style={{color:C.t2}}>{c.tel||"---"}</span></span>
                      <span style={{color:C.t3}}>Credito: <span style={{color:C.yellow}}>{c.creditDays}d</span></span>
                      <span style={{color:C.t3}}>Tickets: <span style={{color:C.t1}}>{st.total}</span></span>
                    </div>
                    {cliUnits.length>0&&(
                      <div style={{marginBottom:5}}>
                        <div style={{fontSize:7,color:C.t3,marginBottom:3}}>FLOTA VINCULADA</div>
                        {cliUnits.map(u=><div key={u.id} style={{fontSize:8,color:C.t2,marginBottom:2}}>&#128666; {u.marca} {u.modelo} {u.anio} — {u.vin}</div>)}
                      </div>
                    )}
                    <div style={{fontSize:7,color:C.t3,marginBottom:3}}>ULTIMOS TICKETS</div>
                    {tickets.filter(t=>t.clientId===c.id).slice(0,3).map(t=>(
                      <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderBottom:`1px solid ${C.border}`,fontSize:8,alignItems:"center",gap:6}}>
                        <span style={{color:C.t3,fontFamily:"'Courier New',monospace",flexShrink:0}}>{t.id}</span>
                        <span style={{color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{t.titulo}</span>
                        <PriorityBadge pid={t.priority} small/>
                        <StatusBadge sid={t.status} meta={TICKET_META} small/>
                        <span style={{color:(t.snap?.uNeta||0)>=0?C.green:C.red,fontFamily:"'Courier New',monospace",flexShrink:0}}>{mxn((t.snap?.uNeta||0))}</span>
                      </div>
                    ))}
                    {tickets.filter(t=>t.clientId===c.id).length===0&&<div style={{fontSize:8,color:C.t3}}>Sin tickets vinculados.</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CARTERA ───────────────────────────────────────────────────────────────────
function Cartera({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {tickets,clients}=state;
  const now=useMemo(()=>new Date(),[]);
  // Use shared selectors — same criteria as MCartera (CARTERA_SET + !cobrado)
  const pendientes = useMemo(()=>sel_cartera(tickets),[tickets]);
  const cobrados   = useMemo(()=>sel_cobrados(tickets),[tickets]);
  const vencidos   = useMemo(()=>sel_vencidos(tickets),[tickets]);

  return (
    <div style={{padding:"10px 13px",maxWidth:950,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:8}}>
        <KPI label="Cartera pendiente" value={mxn(pendientes.reduce((s,t)=>s+(t.snap?.precioConIVA||0),0))} color={C.yellow} accent sub={pendientes.length+" tickets"}/>
        <KPI label="Vencidas"          value={mxn(vencidos.reduce((s,t)=>s+(t.snap?.precioConIVA||0),0))}   color={C.red}    alert={vencidos.length>0} sub={vencidos.length+" vencidas"}/>
        <KPI label="Cobrado (credito)" value={mxn(cobrados.reduce((s,t)=>s+(t.snap?.precioConIVA||0),0))}   color={C.green}  sub={cobrados.length+" cobradas"}/>
        <KPI label="Emision total"     value={mxn(creditOps.reduce((s,t)=>s+(t.snap?.precioConIVA||0),0))}  color={C.t1}     sub="credito emitido"/>
      </div>
      {vencidos.length>0&&(
        <div style={{background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:3,padding:"6px 10px",marginBottom:7}}>
          <div style={{fontSize:8,color:C.red,fontWeight:700,marginBottom:3}}>CARTERA VENCIDA — {vencidos.length} operaciones</div>
          {vencidos.map(t=>{const cl=clients.find(c=>c.id===t.clientId);return(
            <div key={t.id} style={{fontSize:8,color:C.t2,marginBottom:2,fontFamily:"'Courier New',monospace"}}>{t.id} · {cl?.empresa||"---"} · {mxn(t.snap?.precioConIVA||0)} · Vto: {t.promesaPago}</div>
          );})}
        </div>
      )}
      <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
        <SHdr title="CUENTAS POR COBRAR" right={pendientes.length+" pendientes"}/>
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 0.8fr 0.9fr 0.8fr 0.7fr 90px",padding:"4px 9px",borderBottom:`1px solid ${C.border}`,fontSize:7,color:C.t3,letterSpacing:"0.1em",gap:4}}>
          <span>TICKET / OP</span><span>CLIENTE</span><span>ESTADO</span><span>MONTO</span><span>PROMESA</span><span>DIAS</span><span/>
        </div>
        {pendientes.length===0&&<EmptyState icon="&#9989;" title="Sin creditos pendientes"/>}
        {pendientes.map((t,i)=>{
          const cl=clients.find(c=>c.id===t.clientId);
          const dias=daysFromNow(t.promesaPago);
          const venc=dias!=null&&dias>0;
          return (
            <div key={t.id} style={{display:"grid",gridTemplateColumns:"1.5fr 1fr 0.8fr 0.9fr 0.8fr 0.7fr 90px",padding:"6px 9px",background:venc?C.redDim:i%2===0?C.bg1:C.bg2,borderBottom:`1px solid ${C.border}`,gap:4,alignItems:"center"}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:8,fontWeight:700,color:C.t1,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.id}</div>
                <div style={{fontSize:8,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo.substring(0,30)}</div>
              </div>
              <div style={{fontSize:9,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cl?.empresa||"---"}</div>
              <StatusBadge sid={t.status} meta={TICKET_META} small/>
              <div style={{fontSize:10,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(t.snap?.precioConIVA||0)}</div>
              <div style={{fontSize:9,color:C.t2,fontFamily:"'Courier New',monospace"}}>{t.promesaPago||"---"}</div>
              <div style={{fontSize:9,fontWeight:700,color:venc?C.red:C.green,fontFamily:"'Courier New',monospace"}}>{dias!=null?(venc?"+"+dias+"d":Math.abs(dias)+"d"):"---"}</div>
              <button onClick={()=>{dispatch({type:"TKT_COBRADO",id:t.id});toast("Cobrado","success");}}
                style={{padding:"2px 7px",background:C.greenDim,border:`1px solid ${C.green}44`,borderRadius:3,color:C.green,fontSize:9,cursor:"pointer",fontWeight:600}}>Cobrado</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AJUSTES ───────────────────────────────────────────────────────────────────
function Ajustes({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const fileRef=useRef();
  const importUnitsFile=useRef();
  const [confirmReset,setConfirmReset]=useState(false);
  const [confirmClearUnits,setConfirmClearUnits]=useState(false);
  const [exporting, setExporting] = useState(false);
  const [showBackups, setShowBackups] = useState(false);
  const [backupList, setBackupList] = useState([]);
  const [previewKey, setPreviewKey] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [importMode, setImportMode] = useState("merge"); // "merge" | "replace"

  const savedAt=(()=>{try{const r=localStorage.getItem(STORAGE_KEY);if(r){const p=JSON.parse(r);return p.savedAt?new Date(p.savedAt).toLocaleString("es-MX"):"---";}}catch(_e){}return "---";})();

  const importUnitsJSON=(file, mode="merge")=>{
    const r=new FileReader();
    r.onload=e=>{
      try{
        const d=JSON.parse(e.target.result);
        const arr=Array.isArray(d)?d:(d.units||[]);
        if(!arr.length){toast("Sin unidades en el JSON","error");return;}
        if(mode==="replace") {
          dispatch({type:"UNITS_REPLACE", units: arr.map(u=>({...u, clientId:u.clientId||"CLI-00001"}))});
          toast(`Flotilla reemplazada: ${arr.length} unidades`,"success");
        } else {
          arr.forEach(u=>{if(!u.id)return;dispatch({type:"UNIT_ADD",u:{...u,clientId:u.clientId||"CLI-00001"}});});
          toast(`${arr.length} unidades agregadas`,"success");
        }
      }catch{toast("Archivo inválido","error");}
    };
    r.readAsText(file);
  };

  // Load backup keys from localStorage
  const loadBackupList = () => {
    try {
      const keys = Object.keys(localStorage)
        .filter(k=>k.startsWith("lgs_backup_")||k==="logisolve_state"||k==="lgs_pending_v1")
        .map(k=>{
          try {
            const raw = localStorage.getItem(k);
            const size = (raw?.length||0);
            let info = {key:k, size, date:"---", tickets:0, units:0};
            if(raw) {
              const parsed = JSON.parse(raw);
              if(parsed.exportedAt||parsed.savedAt) info.date = new Date(parsed.exportedAt||parsed.savedAt).toLocaleString("es-MX");
              info.tickets = safeArr(parsed.tickets).length;
              info.units   = safeArr(parsed.units).length;
            }
            return info;
          } catch { return {key:k, size:0, date:"---", tickets:0, units:0}; }
        });
      setBackupList(keys);
    } catch(e) { toast("Error leyendo localStorage","error"); }
  };

  const exportData=async()=>{
    if(exporting) return;
    setExporting(true);
    try {
      await new Promise(r=>setTimeout(r,0));
      const payload = {version:STORAGE_VER, exportedAt:nowISO(), ...state};
      const json = JSON.stringify(payload, null, 2);
      // Save a copy in localStorage as backup
      const backupKey = "lgs_backup_"+Date.now();
      try { localStorage.setItem(backupKey, json); } catch(_e) {}
      const blob = new Blob([json],{type:"application/json"});
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href=url; a.download="logisolve-backup-"+Date.now()+".json"; a.click();
      URL.revokeObjectURL(url);
      opLog.push("EXPORT_OK", {tickets: state.tickets.length});
      toast("Backup exportado","success");
    } catch(e) {
      toast("Error al exportar","error");
    } finally { setExporting(false); }
  };

  const importData=file=>{
    const r=new FileReader();
    r.onload=e=>{
      try{
        const d=JSON.parse(e.target.result);
        if(!d||typeof d!=="object") throw new Error("JSON inválido");
        // Validate before importing
        const tCount = safeArr(d.tickets).length;
        const uCount = safeArr(d.units).length;
        dispatch({type:"IMPORT",data:d});
        opLog.push("IMPORT_OK", {tickets:tCount, units:uCount});
        toast(`Importado: ${tCount} tickets, ${uCount} unidades`,"success");
      } catch(e) {
        opLog.push("IMPORT_ERROR", {error: e?.message});
        toast("Archivo inválido: "+e?.message,"error");
      }
    };
    r.readAsText(file);
  };

  const previewBackup = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if(!raw) return;
      const d = JSON.parse(raw);
      setPreviewKey(key);
      setPreviewData(d);
    } catch { toast("No se pudo leer el backup","error"); }
  };

  const deleteBackup = (key) => {
    try {
      localStorage.removeItem(key);
      setBackupList(p=>p.filter(b=>b.key!==key));
      if(previewKey===key) { setPreviewKey(null); setPreviewData(null); }
      toast("Backup eliminado","info");
    } catch { toast("Error al eliminar","error"); }
    setConfirmDel(null);
  };

  const restoreFromBackup = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if(!raw) return;
      const d = JSON.parse(raw);
      dispatch({type:"IMPORT",data:d});
      toast("Datos restaurados desde backup","success");
    } catch { toast("Error al restaurar","error"); }
  };

  return (
    <div style={{padding:"10px 13px",maxWidth:640,margin:"0 auto"}}>
      {confirmReset&&<Confirm msg="Restablecer todos los datos al estado inicial?" onConfirm={()=>{dispatch({type:"RESET"});setConfirmReset(false);toast("Sistema restablecido","info");}} onCancel={()=>setConfirmReset(false)}/>}
      {confirmClearUnits&&<Confirm msg={`Eliminar las ${state.units.length} unidades de la flotilla?`} onConfirm={()=>{dispatch({type:"UNITS_CLEAR"});setConfirmClearUnits(false);toast("Flotilla eliminada","info");}} onCancel={()=>setConfirmClearUnits(false)}/>}
      {confirmDel&&<Confirm msg={"Eliminar backup: "+confirmDel+"?"} onConfirm={()=>deleteBackup(confirmDel)} onCancel={()=>setConfirmDel(null)}/>}

      <div style={{fontSize:7,color:C.t3,letterSpacing:"0.2em",marginBottom:9}}>AJUSTES DEL SISTEMA</div>
      {[
        {title:"PERSISTENCIA",content:(
          <div style={{padding:11}}>
            <div style={{fontSize:9,color:C.t2,marginBottom:5}}>Guardado automático en Supabase + localStorage.</div>
            <div style={{fontSize:8,color:C.t3,marginBottom:8}}>Último guardado: <span style={{color:C.cyan,fontFamily:"'Courier New',monospace"}}>{savedAt}</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
              <KPI label="Tickets"    value={String(state.tickets.filter(t=>!t._deleted).length)}/>
              <KPI label="Unidades"   value={String(state.units.length)}/>
              <KPI label="Clientes"   value={String(state.clients.length)}/>
              <KPI label="Partes"     value={String(state.parts.length)}/>
            </div>
          </div>
        )},
        {title:"EXPORTAR BACKUP",content:(
          <div style={{padding:11}}>
            <div style={{fontSize:9,color:C.t2,marginBottom:7}}>Exporta todos los datos como JSON. También guarda una copia en localStorage.</div>
            <button onClick={exportData} disabled={exporting} style={{padding:"6px 14px",background:exporting?C.bg2:C.blue,border:"none",borderRadius:3,color:exporting?C.t3:C.t1,fontSize:11,fontWeight:700,cursor:exporting?"not-allowed":"pointer"}}>
              {exporting?"Exportando…":"⬇ Exportar JSON"}
            </button>
          </div>
        )},
        {title:"VER Y GESTIONAR BACKUPS (localStorage)",content:(
          <div style={{padding:11}}>
            <div style={{fontSize:9,color:C.t2,marginBottom:7}}>Backups guardados en este navegador. Puedes ver, restaurar o eliminar cada uno.</div>
            <button onClick={()=>{setShowBackups(v=>!v);loadBackupList();}} style={{padding:"5px 12px",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:10,cursor:"pointer",marginBottom:8}}>
              {showBackups?"▲ Ocultar":"▼ Ver backups"}
            </button>
            {showBackups&&(
              <div>
                {backupList.length===0&&<div style={{fontSize:9,color:C.t3}}>No hay backups guardados.</div>}
                {backupList.map(b=>(
                  <div key={b.key} style={{background:C.bg0,border:`1px solid ${C.border}`,borderRadius:4,padding:"8px 10px",marginBottom:6}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:9,fontFamily:"'Courier New',monospace",color:C.cyan,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{b.key}</div>
                        <div style={{fontSize:8,color:C.t3}}>{b.date} · {b.tickets} tickets · {b.units} unidades · {(b.size/1024).toFixed(1)}KB</div>
                      </div>
                      <div style={{display:"flex",gap:5,flexShrink:0,marginLeft:8}}>
                        <button onClick={()=>previewKey===b.key?setPreviewKey(null):previewBackup(b.key)}
                          style={{padding:"3px 8px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,fontSize:9,cursor:"pointer"}}>
                          {previewKey===b.key?"▲":"👁"}
                        </button>
                        <button onClick={()=>restoreFromBackup(b.key)}
                          style={{padding:"3px 8px",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:9,cursor:"pointer"}}>
                          ↩ Restaurar
                        </button>
                        <button onClick={()=>setConfirmDel(b.key)}
                          style={{padding:"3px 8px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:3,color:C.red,fontSize:9,cursor:"pointer"}}>
                          ✕
                        </button>
                      </div>
                    </div>
                    {previewKey===b.key&&previewData&&(
                      <div style={{marginTop:8,padding:"8px",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,borderRadius:3,border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:8,color:C.t3,marginBottom:6}}>PREVIEW DEL BACKUP</div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:8}}>
                          <KPI label="Tickets"    value={String(safeArr(previewData.tickets).length)}/>
                          <KPI label="Clientes"   value={String(safeArr(previewData.clients).length)}/>
                          <KPI label="Unidades"   value={String(safeArr(previewData.units).length)}/>
                        </div>
                        <div style={{fontSize:8,color:C.t3,fontFamily:"'Courier New',monospace",maxHeight:120,overflow:"auto",whiteSpace:"pre-wrap",wordBreak:"break-all"}}>
                          {JSON.stringify({version:previewData.version,exportedAt:previewData.exportedAt,tickets:safeArr(previewData.tickets).slice(0,3).map(t=>({id:t.id,titulo:t.titulo,date:t.date}))},null,2)}
                          {safeArr(previewData.tickets).length>3&&`\n... y ${safeArr(previewData.tickets).length-3} tickets más`}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div style={{fontSize:8,color:C.t3,marginTop:6}}>
                  localStorage usado: ~{(Object.keys(localStorage).reduce((s,k)=>{try{return s+(localStorage.getItem(k)||"").length;}catch{return s;}},0)/1024).toFixed(0)}KB
                </div>
              </div>
            )}
          </div>
        )},
        {title:"IMPORTAR FLOTILLA (JSON)",content:(
          <div style={{padding:11}}>
            <div style={{fontSize:9,color:C.t2,marginBottom:4}}>Importa unidades desde JSON.</div>
            <div style={{fontSize:8,color:C.t3,marginBottom:8}}>Campos: id, vin, marca, modelo, anio, motor, transmision, config, clientId, statusOp, km, notas, placa, economico</div>

            {/* Mode toggle */}
            <div style={{display:"flex",gap:6,marginBottom:10}}>
              {[["merge","Agregar a existentes"],["replace","Reemplazar toda la flotilla"]].map(([m,l])=>(
                <button key={m} onClick={()=>setImportMode(m)}
                  style={{padding:"4px 10px",border:`1px solid ${importMode===m?C.blueHi:C.border}`,borderRadius:3,background:importMode===m?C.blueDim:"transparent",color:importMode===m?C.cyan:C.t2,fontSize:9,cursor:"pointer",fontWeight:importMode===m?700:400}}>
                  {l}
                </button>
              ))}
            </div>

            {importMode==="replace"&&(
              <div style={{padding:"6px 10px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:3,marginBottom:8,fontSize:8,color:C.red}}>
                ⚠ Esto eliminará las {state.units.length} unidades actuales y las reemplazará con el JSON.
              </div>
            )}

            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <input ref={importUnitsFile} type="file" accept=".json" onChange={e=>{if(e.target.files[0])importUnitsJSON(e.target.files[0],importMode);e.target.value="";}} style={{display:"none"}}/>
              <button onClick={()=>importUnitsFile.current&&importUnitsFile.current.click()}
                style={{padding:"6px 14px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                ⬆ {importMode==="replace"?"Reemplazar flotilla":"Importar flotilla JSON"}
              </button>
              <button onClick={()=>setConfirmClearUnits(true)}
                style={{padding:"6px 12px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:3,color:C.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>
                🗑 Limpiar flotilla
              </button>
            </div>

            <div style={{fontSize:8,color:C.t3,marginTop:6}}>Flotilla actual: <span style={{color:C.cyan,fontFamily:"'Courier New',monospace"}}>{state.units.length} unidades</span></div>
          </div>
        )},
        {title:"IMPORTAR DATOS COMPLETOS",content:(
          <div style={{padding:11}}>
            <div style={{fontSize:9,color:C.t2,marginBottom:4}}>Importa un backup JSON completo. <span style={{color:C.yellow}}>Reemplaza los datos actuales.</span></div>
            <input ref={fileRef} type="file" accept=".json" onChange={e=>{if(e.target.files[0])importData(e.target.files[0]);}} style={{display:"none"}}/>
            <button onClick={()=>fileRef.current&&fileRef.current.click()} style={{padding:"6px 14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:11,cursor:"pointer"}}>⬆ Importar JSON</button>
          </div>
        )},
        {title:"RESTABLECER",content:(
          <div style={{padding:11}}>
            <div style={{fontSize:9,color:C.t2,marginBottom:7}}>Elimina todos los datos y vuelve al estado inicial. <span style={{color:C.red}}>No se puede deshacer.</span></div>
            <button onClick={()=>setConfirmReset(true)} style={{padding:"6px 14px",background:C.redDim,border:`1px solid ${C.red}55`,borderRadius:3,color:C.red,fontSize:11,fontWeight:700,cursor:"pointer"}}>Restablecer sistema</button>
          </div>
        )},
      ].map(sec=>(
        <div key={sec.title} style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
          <SHdr title={sec.title}/>
          {sec.content}
        </div>
      ))}
    </div>
  );
}

// ── MAjustes — Ajustes móvil ─────────────────────────────────────────────────
function MAjustes({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const fileRef=useRef();
  const importUnitsFile=useRef();
  const [confirmReset,setConfirmReset]=useState(false);
  const [confirmClearUnits,setConfirmClearUnits]=useState(false);
  const [exporting,setExporting]=useState(false);
  const [importMode,setImportMode]=useState("merge");

  const savedAt=(()=>{try{const r=localStorage.getItem(STORAGE_KEY);if(r){const p=JSON.parse(r);return p.savedAt?new Date(p.savedAt).toLocaleString("es-MX"):"---";}}catch(_e){}return "---";})();

  const importUnitsJSON=(file,mode="merge")=>{
    const r=new FileReader();
    r.onload=e=>{
      try{
        const d=JSON.parse(e.target.result);
        const arr=Array.isArray(d)?d:(d.units||[]);
        if(!arr.length){toast("Sin unidades en el JSON","error");return;}
        if(mode==="replace"){dispatch({type:"UNITS_REPLACE",units:arr.map(u=>({...u,clientId:u.clientId||"CLI-00001"}))});toast(`Flotilla reemplazada: ${arr.length} unidades`,"success");}
        else{arr.forEach(u=>{if(!u.id)return;dispatch({type:"UNIT_ADD",u:{...u,clientId:u.clientId||"CLI-00001"}});});toast(`${arr.length} unidades agregadas`,"success");}
      }catch{toast("Archivo inválido","error");}
    };
    r.readAsText(file);
  };

  const exportData=async()=>{
    if(exporting) return;
    setExporting(true);
    try{
      await new Promise(r=>setTimeout(r,0));
      const payload={version:STORAGE_VER,exportedAt:nowISO(),...state};
      const json=JSON.stringify(payload,null,2);
      try{localStorage.setItem("lgs_backup_"+Date.now(),json);}catch(_e){}
      const blob=new Blob([json],{type:"application/json"});
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");
      a.href=url;a.download="logisolve-backup-"+Date.now()+".json";a.click();
      URL.revokeObjectURL(url);
      toast("Backup exportado","success");
    }catch{toast("Error al exportar","error");}
    finally{setExporting(false);}
  };

  const importData=file=>{
    const r=new FileReader();
    r.onload=e=>{
      try{
        const d=JSON.parse(e.target.result);
        if(!d||typeof d!=="object") throw new Error("JSON inválido");
        dispatch({type:"IMPORT",data:d});
        toast(`Importado: ${safeArr(d.tickets).length} tickets, ${safeArr(d.units).length} unidades`,"success");
      }catch(e){toast("Archivo inválido: "+e?.message,"error");}
    };
    r.readAsText(file);
  };

  const Card=({title,children})=>(
    <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:10}}>
      <div style={{padding:"11px 16px",borderBottom:`1px solid ${C.border}`,background:C.bg3}}>
        <div style={{fontSize:10,color:C.t3,letterSpacing:"0.18em",fontWeight:700}}>{title}</div>
      </div>
      <div style={{padding:"14px 16px"}}>{children}</div>
    </div>
  );

  return (
    <div style={{padding:"14px 14px 8px"}}>
      {confirmReset&&<Confirm msg="Restablecer todos los datos al estado inicial?" onConfirm={()=>{dispatch({type:"RESET"});setConfirmReset(false);toast("Sistema restablecido","info");}} onCancel={()=>setConfirmReset(false)}/>}
      {confirmClearUnits&&<Confirm msg={`Eliminar las ${state.units.length} unidades de la flotilla?`} onConfirm={()=>{dispatch({type:"UNITS_CLEAR"});setConfirmClearUnits(false);toast("Flotilla eliminada","info");}} onCancel={()=>setConfirmClearUnits(false)}/>}

      <div style={{fontSize:11,color:C.t3,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700,marginBottom:14}}>Ajustes del sistema</div>

      <Card title="PERSISTENCIA">
        <div style={{fontSize:13,color:C.t2,marginBottom:4}}>Guardado automático en Supabase + localStorage.</div>
        <div style={{fontSize:11,color:C.t3,marginBottom:12}}>Último guardado: <span style={{color:C.cyan,fontFamily:"'Courier New',monospace"}}>{savedAt}</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["Tickets",state.tickets.filter(t=>!t._deleted).length],["Unidades",state.units.length],["Clientes",state.clients.length],["Partes",state.parts.length]].map(([l,v])=>(
            <div key={l} style={{background:C.bg0,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px"}}>
              <div style={{fontSize:22,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{v}</div>
              <div style={{fontSize:10,color:C.t3,textTransform:"uppercase",letterSpacing:"0.1em"}}>{l}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="STORAGE — ADJUNTOS">
        <div style={{fontSize:13,color:C.t2,marginBottom:8}}>Para subir adjuntos (facturas, cartas de recepción, etc.) necesitas crear el bucket <span style={{color:C.cyan,fontFamily:"'Courier New',monospace"}}>logisolve-docs</span> en Supabase Storage.</div>
        <a href="https://supabase.com/dashboard/project/ecxqxspphoehmkvlmbtv/storage/buckets"
          target="_blank" rel="noreferrer"
          style={{display:"block",textDecoration:"none",padding:"10px 14px",borderRadius:10,
            background:C.blueDim,border:`1px solid ${C.blueHi}`,color:C.cyan,
            fontSize:12,fontWeight:700,textAlign:"center"}}>
          Abrir Supabase Storage ↗
        </a>
        <div style={{fontSize:10,color:C.t3,marginTop:8,lineHeight:1.5}}>
          Pasos: New bucket → nombre: <b style={{color:C.t2}}>logisolve-docs</b> → activar <b style={{color:C.t2}}>Public bucket</b> → Create bucket. Luego en Policies agrega INSERT para el rol anon.
        </div>
      </Card>

      <Card title="EXPORTAR BACKUP">
        <div style={{fontSize:13,color:C.t2,marginBottom:12}}>Exporta todos los datos como JSON y guarda copia en localStorage.</div>
        <MBtn label={exporting?"Exportando…":"⬇ Exportar JSON"} full color={C.t1} bg={exporting?C.bg2:C.blue} border={exporting?C.border:C.blue} onClick={exportData}/>
      </Card>

      <Card title="IMPORTAR FLOTILLA (JSON)">
        <div style={{fontSize:13,color:C.t2,marginBottom:4}}>Importa unidades desde JSON. Flotilla actual: <span style={{color:C.cyan,fontWeight:700}}>{state.units.length}</span></div>
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[["merge","Agregar"],["replace","Reemplazar"]].map(([m,l])=>(
            <button key={m} onClick={()=>setImportMode(m)}
              style={{flex:1,padding:"8px",border:`1px solid ${importMode===m?C.blueHi:C.border}`,borderRadius:8,background:importMode===m?C.blueDim:"transparent",color:importMode===m?C.cyan:C.t2,fontSize:12,cursor:"pointer",fontWeight:importMode===m?700:400}}>
              {l}
            </button>
          ))}
        </div>
        {importMode==="replace"&&(
          <div style={{padding:"10px 12px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:8,marginBottom:12,fontSize:12,color:C.red}}>
            ⚠ Esto eliminará las {state.units.length} unidades actuales.
          </div>
        )}
        <input ref={importUnitsFile} type="file" accept=".json" onChange={e=>{if(e.target.files[0])importUnitsJSON(e.target.files[0],importMode);e.target.value="";}} style={{display:"none"}}/>
        <div style={{display:"flex",gap:8}}>
          <MBtn label={importMode==="replace"?"⬆ Reemplazar flotilla":"⬆ Importar flotilla"} full color={C.cyan} bg={C.blueDim} border={C.blueHi} onClick={()=>importUnitsFile.current&&importUnitsFile.current.click()}/>
        </div>
        {state.units.length>0&&<div style={{marginTop:8}}><MBtn label="🗑 Limpiar flotilla" full color={C.red} bg={C.redDim} border={C.red+"44"} onClick={()=>setConfirmClearUnits(true)}/></div>}
      </Card>

      <Card title="IMPORTAR DATOS COMPLETOS">
        <div style={{fontSize:13,color:C.t2,marginBottom:12}}>Importa un backup JSON completo. <span style={{color:C.yellow}}>Reemplaza los datos actuales.</span></div>
        <input ref={fileRef} type="file" accept=".json" onChange={e=>{if(e.target.files[0])importData(e.target.files[0]);}} style={{display:"none"}}/>
        <MBtn label="⬆ Importar JSON" full color={C.t2} bg="transparent" border={C.border} onClick={()=>fileRef.current&&fileRef.current.click()}/>
      </Card>

      <Card title="RESTABLECER">
        <div style={{fontSize:13,color:C.t2,marginBottom:12}}>Elimina todos los datos y vuelve al estado inicial. <span style={{color:C.red}}>No se puede deshacer.</span></div>
        <MBtn label="Restablecer sistema" full color={C.red} bg={C.redDim} border={C.red+"55"} onClick={()=>setConfirmReset(true)}/>
      </Card>
    </div>
  );
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────────
function Historial({state,dispatch,toast,scheduleHardDelete,cancelHardDelete}) {
  const C = React.useContext(ThemeCtx);
  const {tickets,clients,units,suppliers} = state;
  const [hide,    setHide]   = useState(false);
  const [expId,   setExpId]  = useState(null);
  const [editId,  setEditId] = useState(null);
  const [ef,      setEf]     = useState({});
  const [confirm, setConfirm]= useState(null);
  const [showTrash, setShowTrash] = useState(false);
  const [sortBy, setSortBy]  = useState("date_desc");
  const sfn = k => v => setEf(p=>({...p,[k]:v}));

  const activeTickets  = useMemo(()=>tickets.filter(t=>!t._deleted),[tickets]);
  const active = activeTickets; // alias
  const trashedTickets = useMemo(()=>tickets.filter(t=>t._deleted),[tickets]);

  const sortedTickets = useMemo(()=>{
    const arr = [...activeTickets];
    // Convert DD/MM/YYYY to YYYY/MM/DD for correct date sort
    const toSortable = (d="") => { const p=d.split("/"); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; };
    switch(sortBy){
      case "date_asc":   return arr.sort((a,b)=>toSortable(a.date).localeCompare(toSortable(b.date)));
      case "total_desc": return arr.sort((a,b)=>safeNumber(b.snap?.precioConIVA)-safeNumber(a.snap?.precioConIVA));
      case "uneta_desc": return arr.sort((a,b)=>safeNumber(b.snap?.uNeta)-safeNumber(a.snap?.uNeta));
      case "priority":   return arr.sort((a,b)=>a.priority.localeCompare(b.priority));
      default:           return arr.sort((a,b)=>toSortable(b.date).localeCompare(toSortable(a.date)));
    }
  },[activeTickets,sortBy]);

  const realizados = useMemo(()=>activeTickets.filter(t=>REVENUE_SET.has(t.status)),[activeTickets]);
  const totalFact = useMemo(()=>realizados.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0),[realizados]);
  const totalNeta = useMemo(()=>realizados.reduce((s,t)=>s+safeNumber(t.snap?.uNeta),0),[realizados]);
  const totalInv  = useMemo(()=>realizados.reduce((s,t)=>s+safeNumber(t.snap?.costoBase)*(1+(safeNumber(t.snap?.params?.iva,16))/100),0),[realizados]);
  const pctN      = totalFact>0?(totalNeta/totalFact)*100:0;

  const days = useMemo(()=>{
    const d={};
    activeTickets.forEach(t=>{if(!d[t.date])d[t.date]={v:0,n:0,c:0};d[t.date].v+=safeNumber(t.snap?.precioConIVA);d[t.date].n+=safeNumber(t.snap?.uNeta);d[t.date].c++;});
    return d;
  },[activeTickets]);

  const [editLineas, setEditLineas] = useState([]);
  const updLinea = (idx,patch) => setEditLineas(p=>p.map((l,i)=>i===idx?{...l,...patch}:l));
  const delLinea = idx => setEditLineas(p=>p.filter((_,i)=>i!==idx));
  const addEditLinea = () => setEditLineas(p=>[...p,{titulo:"",partRef:"",manualPrice:"0",qty:1}]);

  const startEdit = useCallback((t,e)=>{
    e.stopPropagation();
    setEditId(t.id);
    setExpId(t.id);
    const iva = t.snap?.params?.iva||16;
    const ivaR = iva/100;
    // costoBase en snap es sin IVA; el cotizador trabaja con costo CON IVA
    const toConIVA = (snap) => (snap?.costoBase||0)*(1+ivaR);
    let lineas;
    if(t.lineas&&t.lineas.length>0) {
      lineas = t.lineas.map(l=>({
        titulo:       l.titulo||"",
        partRef:      l.partRef||"",
        qty:          safeNumber(l.qty,1)||1,
        costoUnit:    safeNumber(l.costoUnit, toConIVA(l.snap)),
        gasolina:     safeNumber(l.gasolina, l.snap?.gastos||0),
        otros:        safeNumber(l.otros, 0),
        mode:         l.mode||"manual",
        manualPrice:  l.manualPrice||(l.snap?.precioConIVA||0).toFixed(2),
        customMgn:    !!l.customMgn,
        customVal:    safeNumber(l.customVal, 27),
        descripcionPDF: l.descripcionPDF||"",
      }));
    } else {
      const parts=(t.titulo||"").split(" / ").filter(Boolean);
      if(parts.length>1) {
        const pxLinea=((t.snap?.precioConIVA||0)/parts.length).toFixed(2);
        const costoXLinea=toConIVA(t.snap)/parts.length;
        lineas=parts.map(p=>({titulo:p.trim(),partRef:"",qty:1,costoUnit:costoXLinea,gasolina:0,otros:0,mode:"manual",manualPrice:pxLinea,customMgn:false,customVal:27,descripcionPDF:""}));
      } else {
        lineas=[{titulo:t.titulo||"",partRef:t.partRef||"",qty:1,costoUnit:safeNumber(t.costoUnit,toConIVA(t.snap)),gasolina:safeNumber(t.gasolina,t.snap?.gastos||0),otros:safeNumber(t.otros,0),mode:t.mode||"manual",manualPrice:t.manualPrice||(t.snap?.precioConIVA||0).toFixed(2),customMgn:!!t.customMgn,customVal:safeNumber(t.customVal,27),descripcionPDF:""}];
      }
    }
    setEditLineas(lineas);
    setEf({
      date:t.date, clientId:t.clientId||"", supplierId:t.supplierId||"",
      unitId:t.unitId||"",
      unitIds: t.unitIds ? [...t.unitIds] : (t.unitId ? [t.unitId] : []),
      status:t.status, payType:t.payType, promesaPago:t.promesaPago||"",
      prob:t.prob||"high", horasOp:t.horasOp||0, notes:t.notes||"",
      iva, isr:t.snap?.params?.isr||20,
      cIVA:true, vIVA:true,
      opType:t.opId||"consumable", activeMods:[...(t.mods||[])], priority:t.priority||"P3",
    });
  },[]);

  const cancelEdit = useCallback(()=>{setEditId(null);setEf({});setEditLineas([]);},[]);

  // Snap agregado de todas las líneas — igual que cotizador
  const editTotalSnap = useMemo(()=>{
    if(!editId||!editLineas.length) return null;
    const iva=safeNumber(ef.iva,16); const isr=safeNumber(ef.isr,20);
    const opType=ef.opType||"consumable"; const priority=ef.priority||"P3";
    const activeMods=safeArr(ef.activeMods);
    const sharedMgn = effectiveMargin(opType,priority,activeMods,false,27);
    const snaps = editLineas.map(l=>{
      const mg = l.customMgn?Math.min(safeNumber(l.customVal),99):sharedMgn;
      const qty = safeNumber(l.qty,1)||1;
      const costo = safeNumber(l.costoUnit)*qty;
      return computeSnap({costo,gasolina:safeNumber(l.gasolina),otros:safeNumber(l.otros),iva,isr,
        compraConIVA:ef.cIVA!==false,ventaConIVA:ef.vIVA!==false,
        mode:l.mode||"manual",margin:mg,manualPrice:l.manualPrice||"0"});
    });
    const sum=k=>snaps.reduce((s,sn)=>s+safeNumber(sn[k]),0);
    const precioSinIVA=sum("precioSinIVA");
    const uNeta=sum("uNeta");
    return {
      precioConIVA:sum("precioConIVA"), precioSinIVA,
      ivaTraslad:sum("ivaTraslad"), ivaAcred:sum("ivaAcred"), ivaNeto:sum("ivaNeto"),
      costoTotal:sum("costoTotal"), costoBase:sum("costoBase"), gastos:sum("gastos"),
      uNeta, uBruta:sum("uBruta"), isr:sum("isr"),
      markupSobre:sum("costoTotal")>0?((precioSinIVA-sum("costoTotal"))/sum("costoTotal"))*100:0,
      margenNetoPrecio:precioSinIVA>0?(uNeta/precioSinIVA)*100:0,
      params:{iva,isr},
    };
  },[editId,editLineas,ef]);

  const liveSnap = editTotalSnap;

  const saveEdit = useCallback(id=>{
    if(!editTotalSnap) return;
    const titulo = editLineas.map(l=>l.titulo.trim()||"Sin descripcion").join(" / ");
    const opType=ef.opType||"consumable"; const priority=ef.priority||"P3";
    const activeMods=ef.activeMods||[];
    const sharedMgn=effectiveMargin(opType,priority,activeMods,false,27);
    const lineasConSnap = editLineas.map(l=>{
      const mg=l.customMgn?Math.min(l.customVal,99):sharedMgn;
      const costo=(l.costoUnit||0)*(l.qty||1);
      const snap=computeSnap({costo,gasolina:l.gasolina||0,otros:l.otros||0,
        iva:parseFloat(ef.iva)||16,isr:parseFloat(ef.isr)||20,
        compraConIVA:ef.cIVA!==false,ventaConIVA:ef.vIVA!==false,
        mode:l.mode||"manual",margin:mg,manualPrice:l.manualPrice||"0"});
      return {titulo:l.titulo||"Sin descripcion",partRef:l.partRef||"",snap,qty:l.qty||1,descripcionPDF:l.descripcionPDF||""};
    });
    const opMeta=OP_TYPES.find(o=>o.id===opType)||OP_TYPES[0];
    const patch={
      titulo, lineas:lineasConSnap,
      opId:opType, opShort:opMeta.short, priority:ef.priority||"P3",
      mods:[...activeMods],
      date:ef.date, clientId:ef.clientId, supplierId:ef.supplierId,
      unitId:(ef.unitIds||[])[0]||ef.unitId||"",
      unitIds: ef.unitIds||[],
      status:ef.status, payType:ef.payType,
      promesaPago:ef.payType==="credit"?ef.promesaPago:null,
      cobrado:PAID_SET.has(ef.status), prob:ef.prob,
      horasOp:parseFloat(ef.horasOp)||0, notes:ef.notes,
      snap:editTotalSnap, mode:editLineas.length>1?"multilinea":"auto",
      partRef:editLineas.map(l=>l.partRef).filter(Boolean).join(", "),
    };
    dispatch({type:"TKT_UPDATE",id,patch});
    toast("Ticket actualizado","success");
    cancelEdit();
  },[ef,editLineas,editTotalSnap,dispatch,toast,cancelEdit]);

  const desgloseRows = t=>{
    const s = t.snap||{};
    const iva16  = safeNumber(s.params?.iva,16);
    const carga  = safeNumber(s.cargaFiscal, safeNumber(s.ivaNeto)+safeNumber(s.isr));
    const efic   = safeNumber(s.eficienciaFiscal, safeNumber(s.uBruta)>0?(safeNumber(s.uNeta)/safeNumber(s.uBruta))*100:0);
    const rows = [
      ["Costo producto (c/IVA)",  mxn(safeNumber(s.costoBase)*(1+iva16/100)), C.t2,     false],
      ["IVA acreditable",         mxn(s.ivaAcred),                            C.blueHi, false],
      ["Gastos operativos",       mxn(s.gastos),                              C.t2,     false],
      ["Costo operativo total",   mxn(s.costoTotal),                          C.t1,     true ],
      ["Markup s/costo",          fpct(calcMarkup(s.precioSinIVA,s.costoTotal)),                        C.blueHi, false],
      ["Precio sin IVA",          mxn(s.precioSinIVA),                        C.cyan,   false],
      ["IVA trasladado",          mxn(s.ivaTraslad),                          C.cyan,   false],
      ["Precio con IVA",          mxn(s.precioConIVA),                        C.cyan,   true ],
      ["IVA neto SAT",            mxn(s.ivaNeto),                             C.yellow, false],
      ["Utilidad bruta",          mxn(s.uBruta),                              C.t2,     false],
      ["ISR estimado SAT",        mxn(s.isr),                                 C.yellow, false],
      ["Carga fiscal total",      mxn(carga),                                 C.red,    false],
      ["Utilidad neta",           mxn(s.uNeta),                               safeNumber(s.uNeta)>=0?C.green:C.red, true],
      ["Rentabilidad neta",       fpct(s.margenNetoPrecio),                   margenColor(safeNumber(s.margenNetoPrecio)), false],
      ["Eficiencia fiscal",       fpct(efic),                                 efic>=75?C.green:efic>=60?C.yellow:C.red, false],
    ];
    const al = safeArr(s.alertas);
    if(al.includes("margen_critico"))    rows.push(["⚠ Margen crítico","< 15%",C.red,false]);
    if(al.includes("carga_fiscal_alta")) rows.push(["⚠ Carga fiscal alta","> util. neta",C.red,false]);
    if(al.includes("markup_bajo"))       rows.push(["⚠ Markup insuficiente","< 25%",C.yellow,false]);
    return rows;
  };

  return (
    <div style={{padding:"10px 13px",maxWidth:1050,margin:"0 auto"}}>
      {confirm&&<Confirm msg={"Eliminar: "+confirm.titulo+"?"} onConfirm={()=>{
        const id=confirm.id;
        dispatch({type:"TKT_SOFT_DEL",id});
        scheduleHardDelete(id);
        toast("Ticket a papelera — restaurable","info");
        setConfirm(null);setExpId(null);
      }} onCancel={()=>setConfirm(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
        <div style={{fontSize:7,color:C.t3,letterSpacing:"0.2em"}}>HISTORIAL DE OPERACIONES</div>
        <button onClick={()=>setHide(!hide)} style={{padding:"3px 9px",background:hide?C.blue:"transparent",border:`1px solid ${hide?C.blueHi:C.border}`,borderRadius:3,color:hide?C.t1:C.t2,fontSize:9,cursor:"pointer"}}>
          {hide?"Mostrar":"Ocultar"} cifras
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:8}}>
        <KPI label="Total facturado" value={mxn(totalFact)} color={C.cyan}/>
        <KPI label="Total invertido" value={hide?"---":mxn(totalInv)} color={C.t2} sub="Costo prod. c/IVA"/>
        <KPI label="Utilidad neta"   value={hide?"---":mxn(totalNeta)} color={totalNeta>=0?C.green:C.red} sub={hide?"---":fpct(pctN)+" del facturado"}/>
        <KPI label="Operaciones"     value={String(tickets.length)} color={C.t1} sub={Object.keys(days).length+" dias"}/>
      </div>

      <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"1.6fr 0.5fr 0.6fr 0.7fr 0.6fr 0.7fr 0.7fr 56px 20px",padding:"4px 9px",borderBottom:`1px solid ${C.border}`,fontSize:7,color:C.t3,letterSpacing:"0.1em",gap:4}}>
          <span>ID / TITULO</span><span>TIPO</span><span>PRIO</span><span>ESTADO</span><span>MARKUP</span><span>PRECIO</span><span>UTIL.</span><span/><span/>
        </div>

        {/* Sort controls */}
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:7,color:C.t3}}>ORDENAR:</span>
          {[["date_desc","Más reciente"],["date_asc","Más antiguo"],["total_desc","Mayor total"],["uneta_desc","Mayor utilidad"],["priority","Prioridad"]].map(([v,l])=>(
            <button key={v} onClick={()=>setSortBy(v)}
              style={{padding:"2px 7px",background:sortBy===v?C.blueDim:"transparent",border:`1px solid ${sortBy===v?C.blueHi:C.border}`,borderRadius:3,color:sortBy===v?C.cyan:C.t3,fontSize:7,cursor:"pointer"}}>
              {l}
            </button>
          ))}
        </div>
        {sortedTickets.map((t,i)=>{
          const exp=expId===t.id;
          const editing=editId===t.id;
          const cl=clients.find(c=>c.id===t.clientId);
          return (
            <div key={t.id} style={{borderBottom:`1px solid ${C.border}`}}>
              <div onClick={()=>{if(!editing)setExpId(exp?null:t.id);}}
                style={{display:"grid",gridTemplateColumns:"1.6fr 0.5fr 0.6fr 0.7fr 0.6fr 0.7fr 0.7fr 56px 20px",padding:"6px 9px",background:editing?C.blueDim:exp?C.bg3:i%2===0?C.bg1:C.bg2,cursor:editing?"default":"pointer",gap:4,alignItems:"center",borderLeft:`2px solid ${PRIORITY[t.priority]?.dot||C.border}`}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:8,fontWeight:700,color:C.t1,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t.id}</div>
                  <div style={{fontSize:9,color:C.cyan,lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</div>
                  <div style={{fontSize:7,color:C.t3}}>{t.date}{cl?" · "+cl.empresa.split(" ")[0]:""}</div>
                </div>
                <div style={{fontSize:8,fontFamily:"'Courier New',monospace",color:C.t2,fontWeight:600}}>{t.opShort}</div>
                <PriorityBadge pid={t.priority} small/>
                <StatusBadge sid={t.status} meta={TICKET_META} small/>
                <div style={{fontSize:9,color:C.blueHi,fontFamily:"'Courier New',monospace"}}>{hide?"---":fpct(calcMarkup((t.snap?.precioSinIVA||0),(t.snap?.costoTotal||0)))}</div>
                <div style={{fontSize:9,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{mxn((t.snap?.precioConIVA||0))}</div>
                <div style={{fontSize:9,fontWeight:700,color:(t.snap?.uNeta||0)>=0?C.green:C.red,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{hide?"---":mxn((t.snap?.uNeta||0))}</div>
                <div style={{display:"flex",gap:3}}>
                  {!editing&&<button onClick={e=>startEdit(t,e)} style={{padding:"2px 5px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:8,cursor:"pointer"}}>Editar</button>}
                  {!editing&&<button onClick={e=>{e.stopPropagation();const cl2=clients.find(c=>c.id===t.clientId);const un2=units?.find(u=>u.id===t.unitId);const su2=suppliers?.find(s=>s.id===t.supplierId);generarCotizacionPDF(t,cl2,un2,su2);}} style={{padding:"2px 5px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,fontSize:8,cursor:"pointer"}}>PDF</button>}
                  {!editing&&<button onClick={e=>{e.stopPropagation();setConfirm(t);}} style={{padding:"2px 4px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:3,color:C.red,fontSize:9,cursor:"pointer",fontWeight:700}}>x</button>}
                </div>
                <div style={{fontSize:9,color:C.t3,textAlign:"center"}}>{exp?"^":"v"}</div>
              </div>

              {exp&&(
                <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`}}>
                  {editing?(
                    <div style={{padding:10}}>
                      <div style={{fontSize:7,color:C.cyan,letterSpacing:"0.14em",marginBottom:7,fontWeight:700}}>EDITANDO {t.id}</div>

                      {/* Datos generales */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:6}}>
                        <Field label="Fecha"  value={ef.date}   onChange={sfn("date")}   prefix="" hint="DD/MM/AAAA"/>
                        <Sel label="Estado"   value={ef.status} onChange={sfn("status")} options={TICKET_ALL.map(id=>({value:id,label:TICKET_META[id].label}))}/>
                        <Sel label="Pago" value={ef.payType} onChange={sfn("payType")} options={[{value:"contado",label:"Contado"},{value:"credit",label:"Credito"}]}/>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                        <Sel label="Cliente"   value={ef.clientId}   onChange={sfn("clientId")}   options={[{value:"",label:"-- Sin cliente --"},...clients.map(c=>({value:c.id,label:c.empresa}))]}/>
                        <Sel label="Proveedor" value={ef.supplierId} onChange={sfn("supplierId")} options={[{value:"",label:"-- Sin proveedor --"},...suppliers.map(s=>({value:s.id,label:s.nombre}))]}/>
                      </div>
                      {/* Multi-unidad */}
                      <div style={{marginBottom:7}}>
                        <div style={{fontSize:7,color:C.t3,letterSpacing:"0.14em",marginBottom:3}}>UNIDADES VINCULADAS</div>
                        {(ef.unitIds||[]).map((uid,idx)=>{
                          const u=units.find(un=>un.id===uid);
                          if(!u) return null;
                          return (
                            <div key={uid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:C.bg3,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 8px",marginBottom:3}}>
                              <span style={{fontSize:9,color:C.cyan,fontFamily:"'Courier New',monospace"}}>
                                {u.economico?"Eco."+u.economico+" · ":""}{u.marca} {u.modelo} {u.anio}{u.placa?" · "+u.placa:""}
                              </span>
                              <span onClick={()=>setEf(p=>({...p,unitIds:(p.unitIds||[]).filter((_,i)=>i!==idx)}))}
                                style={{cursor:"pointer",color:C.red,fontSize:13,padding:"0 4px",lineHeight:1,fontWeight:700}}>×</span>
                            </div>
                          );
                        })}
                        <UnitPicker
                          units={units.filter(u=>!(ef.unitIds||[]).includes(u.id))}
                          value=""
                          onChange={uid=>{if(uid)setEf(p=>({...p,unitIds:[...(p.unitIds||[]),uid]}));}}
                          placeholder={(ef.unitIds||[]).length===0?"Buscar por eco, placa, marca...":"+ Agregar otra unidad"}
                        />
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:6}}>
                        {ef.payType==="credit"&&<Field label="Promesa" value={ef.promesaPago} onChange={sfn("promesaPago")} prefix="" hint="DD/MM/AAAA"/>}
                        <Sel label="Prob." value={ef.prob} onChange={sfn("prob")} options={PROB.map(p=>({value:p.id,label:p.label+" ("+p.pct+"%)"}))}/>
                        <Field label="Horas op." value={ef.horasOp} onChange={sfn("horasOp")} prefix="" suffix="h" type="number" min={0} step={0.5}/>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                          <Field label="IVA %" value={ef.iva} onChange={sfn("iva")} prefix="" suffix="%" type="number" min={0} step={0.1}/>
                          <Field label="ISR %" value={ef.isr} onChange={sfn("isr")} prefix="" suffix="%" type="number" min={0} step={0.1}/>
                        </div>
                      </div>

                      {/* Tipo de operación y modificadores */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                        <div>
                          <div style={{fontSize:7,color:C.t3,letterSpacing:"0.14em",marginBottom:3}}>TIPO DE OPERACIÓN</div>
                          <select value={ef.opType||"consumable"} onChange={e=>sfn("opType")(e.target.value)}
                            style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 6px",color:C.t1,fontSize:10,outline:"none"}}>
                            {OP_TYPES.map(op=><option key={op.id} value={op.id}>{op.label} ({op.baseMin}-{op.baseMax}%)</option>)}
                          </select>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,letterSpacing:"0.14em",marginBottom:3}}>PRIORIDAD</div>
                          <select value={ef.priority||"P3"} onChange={e=>sfn("priority")(e.target.value)}
                            style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:3,padding:"5px 6px",color:C.t1,fontSize:10,outline:"none"}}>
                            {Object.values(PRIORITY).map(p=><option key={p.id} value={p.id}>{p.id} — {p.label}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* Parámetros fiscales */}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:6}}>
                        <Field label="IVA %" value={ef.iva} onChange={sfn("iva")} prefix="" suffix="%" type="text" inputMode="decimal"/>
                        <Field label="ISR %" value={ef.isr} onChange={sfn("isr")} prefix="" suffix="%" type="text" inputMode="decimal"/>
                        <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",paddingBottom:2}}>
                          <Toggle label="Compra c/IVA" value={ef.cIVA!==false} onChange={v=>sfn("cIVA")(v)}/>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",paddingBottom:2}}>
                          <Toggle label="Venta c/IVA" value={ef.vIVA!==false} onChange={v=>sfn("vIVA")(v)}/>
                        </div>
                      </div>

                      {/* Líneas */}
                      <div style={{height:1,background:C.border,margin:"4px 0 7px"}}/>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                        <div style={{fontSize:7,color:C.t3,letterSpacing:"0.14em"}}>LÍNEAS ({editLineas.length})</div>
                        <button onClick={addEditLinea} style={{fontSize:8,background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,padding:"2px 8px",cursor:"pointer",fontWeight:600}}>+ Agregar línea</button>
                      </div>
                      {editLineas.map((l,idx)=>{
                        const mg = l.customMgn ? Math.min(l.customVal,99) : effectiveMargin(ef.opType||"consumable",ef.priority||"P3",ef.activeMods||[],false,27);
                        const costo=(l.costoUnit||0)*(l.qty||1);
                        const lsnap = computeSnap({costo,gasolina:l.gasolina||0,otros:l.otros||0,iva:parseFloat(ef.iva)||16,isr:parseFloat(ef.isr)||20,compraConIVA:ef.cIVA!==false,ventaConIVA:ef.vIVA!==false,mode:l.mode||"manual",margin:mg,manualPrice:l.manualPrice||"0"});
                        return (
                        <div key={idx} style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.borderHi}`,borderRadius:3,padding:"7px 9px",marginBottom:5}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
                            <span style={{fontSize:8,color:C.cyan,fontFamily:"'Courier New',monospace",fontWeight:700}}>LÍNEA {String(idx+1).padStart(2,"0")} · {mxn(lsnap.precioConIVA)} · {fpct(lsnap.margenNetoPrecio)}</span>
                            {editLineas.length>1&&<button onClick={()=>delLinea(idx)} style={{padding:"1px 6px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:2,color:C.red,fontSize:8,cursor:"pointer",fontWeight:700}}>× Eliminar</button>}
                          </div>
                          {/* Descripción y parte */}
                          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:5,marginBottom:5}}>
                            <Field label="Descripción / producto" value={l.titulo} onChange={v=>updLinea(idx,{titulo:v})} prefix=""/>
                            <Field label="Ref. / OEM" value={l.partRef||""} onChange={v=>updLinea(idx,{partRef:v})} prefix=""/>
                          </div>
                          <Field label="Descripción PDF (aparece en cotización)" value={l.descripcionPDF||""} onChange={v=>updLinea(idx,{descripcionPDF:v})} prefix="" hint="Dejar vacío para usar texto por defecto" rows={2}/>
                          {/* Qty, costo, gasolina, otros */}
                          <div style={{display:"grid",gridTemplateColumns:"70px 1fr 1fr 1fr",gap:5,marginBottom:5}}>
                            <Field label="Cant." value={l._qtyRaw!==undefined?l._qtyRaw:String(l.qty||1)} onChange={v=>updLinea(idx,{_qtyRaw:v})} onBlur={()=>{const n=parseInt(l._qtyRaw);updLinea(idx,{qty:isFinite(n)&&n>=1?n:1,_qtyRaw:undefined});}} prefix="" suffix="pz" type="text" inputMode="numeric"/>
                            <Field label="Costo unit. c/IVA" value={l.costoUnit||0} onChange={v=>updLinea(idx,{costoUnit:v})} onBlur={()=>updLinea(idx,{costoUnit:safeNumber(l.costoUnit)})} type="text" inputMode="decimal"/>
                            <Field label="Gasolina" value={l.gasolina||0} onChange={v=>updLinea(idx,{gasolina:v})} onBlur={()=>updLinea(idx,{gasolina:safeNumber(l.gasolina)})} type="text" inputMode="decimal"/>
                            <Field label="Otros gastos" value={l.otros||0} onChange={v=>updLinea(idx,{otros:v})} onBlur={()=>updLinea(idx,{otros:safeNumber(l.otros)})} type="text" inputMode="decimal"/>
                          </div>
                          {(safeNumber(l.qty,1))>1&&<div style={{fontSize:7,color:C.t3,marginBottom:5,fontFamily:"'Courier New',monospace"}}>{l.qty} × {mxn(safeNumber(l.costoUnit))} = {mxn(safeNumber(l.costoUnit)*safeNumber(l.qty,1))} costo total</div>}
                          {/* Modo precio */}
                          <div style={{display:"flex",gap:7,alignItems:"center"}}>
                            <div style={{display:"flex",borderRadius:3,overflow:"hidden",border:`1px solid ${C.border}`,flexShrink:0}}>
                              {[["auto","Auto"],["manual","Manual"]].map(([id,lbl])=>(
                                <button key={id} onClick={()=>updLinea(idx,{mode:id})}
                                  style={{padding:"3px 8px",border:"none",cursor:"pointer",fontSize:8,fontWeight:600,background:l.mode===id?C.blue:C.bg2,color:l.mode===id?C.t1:C.t2}}>{lbl}</button>
                              ))}
                            </div>
                            {l.mode==="auto" ? (
                              <div style={{display:"flex",alignItems:"center",gap:5,flex:1}}>
                                <span style={{fontSize:7,color:C.t3}}>Margen:</span>
                                {l.customMgn ? (
                                  <input type="text" inputMode="decimal" value={l._customValRaw!==undefined?l._customValRaw:String(l.customVal||27)}
                                  onChange={e=>updLinea(idx,{_customValRaw:e.target.value})}
                                  onBlur={()=>updLinea(idx,{customVal:safeNumber(l._customValRaw,27),_customValRaw:undefined})}
                                    style={{width:55,background:C.bg0,border:`1px solid ${C.blueHi}`,borderRadius:3,padding:"3px 5px",color:C.cyan,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace",textAlign:"right"}}/>
                                ) : (
                                  <span style={{fontSize:11,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{fpct(mg)}</span>
                                )}
                                <button onClick={()=>updLinea(idx,{customMgn:!l.customMgn})}
                                  style={{fontSize:7,padding:"2px 5px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:2,color:C.t3,cursor:"pointer"}}>
                                  {l.customMgn?"auto":"editar"}
                                </button>
                              </div>
                            ) : (
                              <div style={{display:"flex",alignItems:"center",gap:5,flex:1}}>
                                <span style={{fontSize:7,color:C.t3}}>Precio c/IVA:</span>
                                <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden",flex:1}}>
                                  <span style={{padding:"0 4px",color:C.cyan,fontSize:10,fontFamily:"'Courier New',monospace"}}>$</span>
                                  <input type="text" inputMode="decimal" value={l.manualPrice} onChange={e=>updLinea(idx,{manualPrice:e.target.value})}
                                    style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:11,fontWeight:700,padding:"4px 0",fontFamily:"'Courier New',monospace"}}/>
                                </div>
                                <span style={{fontSize:8,color:margenColor(lsnap.margenNetoPrecio),fontFamily:"'Courier New',monospace",flexShrink:0}}>{fpct(lsnap.margenNetoPrecio)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        );
                      })}

                      {/* Preview total */}
                      {liveSnap&&(
                        <div style={{background:C.bg3,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,borderRadius:3,border:`1px solid ${C.borderHi}`,padding:"6px 9px",marginBottom:6,display:"flex",gap:16,alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:7,color:C.t3,marginBottom:1}}>TOTAL c/IVA</div>
                            <div style={{fontSize:13,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(liveSnap.precioConIVA)}</div>
                          </div>
                          <div>
                            <div style={{fontSize:7,color:C.t3,marginBottom:1}}>UTIL. NETA</div>
                            <div style={{fontSize:12,fontWeight:700,color:liveSnap.uNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(liveSnap.uNeta)}</div>
                          </div>
                          <div style={{fontSize:7,color:C.t3}}>{editLineas.length} línea{editLineas.length>1?"s":""}</div>
                        </div>
                      )}

                      <Field label="Notas" value={ef.notes} onChange={sfn("notes")} prefix="" rows={2}/>
                      <div style={{display:"flex",gap:5,marginTop:5}}>
                        <button onClick={()=>saveEdit(t.id)} style={{padding:"5px 14px",background:C.blue,border:"none",borderRadius:3,color:C.t1,fontSize:11,fontWeight:700,cursor:"pointer"}}>Guardar</button>
                        <button onClick={cancelEdit} style={{padding:"5px 10px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:11,cursor:"pointer"}}>Cancelar</button>
                      </div>
                    </div>
                  ):(
                    <>
                        {/* Líneas individuales si existen */}
                      {t.lineas&&t.lineas.length>0 ? (
                        <div>
                          {t.lineas.map((l,j)=>(
                            <div key={j} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 11px",borderBottom:`1px solid ${C.border}`,background:j%2===0?C.bg0:C.bg1}}>
                              <div style={{minWidth:0,flex:1}}>
                                <div style={{fontSize:9,color:C.t1,fontWeight:600}}>{l.titulo||"Sin descripcion"}</div>
                                {l.partRef&&<div style={{fontSize:7,color:C.t3,fontFamily:"'Courier New',monospace"}}>{l.partRef}</div>}
                              </div>
                              <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                                <div style={{fontSize:9,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(l.snap?.precioConIVA||0)}</div>
                                <div style={{fontSize:7,color:C.t3}}>c/IVA</div>
                              </div>
                            </div>
                          ))}
                          <div style={{display:"flex",justifyContent:"space-between",padding:"5px 11px",background:C.bg3,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,borderBottom:`1px solid ${C.border}`}}>
                            <span style={{fontSize:9,fontWeight:700,color:C.t1}}>TOTAL</span>
                            <span style={{fontSize:10,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn((t.snap?.precioConIVA||0))}</span>
                          </div>
                        </div>
                      ) : (
                        desgloseRows(t).map(([lbl,val,col,bold],j)=>(
                          <div key={j} style={{display:"flex",justifyContent:"space-between",padding:"3px 11px",background:bold?C.bg3:j%2===0?C.bg0:C.bg1,borderBottom:j<12?`1px solid ${C.border}`:"none"}}>
                            <span style={{fontSize:9,color:bold?C.t1:C.t2,fontWeight:bold?700:400}}>{lbl}</span>
                            <span style={{fontSize:9,fontWeight:bold?800:600,color:col,fontFamily:"'Courier New',monospace"}}>{val}</span>
                          </div>
                        ))
                      )}
                      <div style={{padding:"4px 11px",fontSize:7,color:C.t3,display:"flex",gap:8,flexWrap:"wrap"}}>
                        <span>IVA {t.snap?.params?.iva||16}%</span>
                        <span>ISR {t.snap?.params?.isr||20}%</span>
                        {cl&&<span>Cliente: {cl.empresa}</span>}
                        {(()=>{
                          const uids=[...new Set([...(t.unitIds||[]),t.unitId].filter(Boolean))];
                          if(!uids.length) return null;
                          return uids.map(uid=>{
                            const u=units.find(x=>x.id===uid);
                            return u?<span key={uid} style={{color:C.blueHi}}>{u.economico?"Eco."+u.economico+" ":""}{u.marca} {u.modelo}</span>:null;
                          });
                        })()}
                        {t.mods&&t.mods.length>0&&<span>Mods: {t.mods.join(", ")}</span>}
                        {t.horasOp>0&&<span>Util/h: {mxn((t.snap?.uNeta||0)/t.horasOp)}</span>}
                        {t.payType==="credit"&&<span style={{color:C.yellow}}>Credito · {t.promesaPago||"sin fecha"}</span>}
                        {t.notes&&<span style={{fontStyle:"italic"}}>{t.notes}</span>}
                      </div>
                      {/* Timeline compacto */}
                      {t.timeline&&t.timeline.length>0&&(
                        <div style={{padding:"4px 11px 8px",borderTop:`1px solid ${C.border}`}}>
                          <div style={{fontSize:7,color:C.t3,marginBottom:3}}>TIMELINE ({t.timeline.length} eventos)</div>
                          {t.timeline.slice(-3).map((ev,j)=>(
                            <div key={j} style={{fontSize:7,color:C.t3,fontFamily:"'Courier New',monospace",marginBottom:1}}>
                              {fmtTS(ev.ts)} — {ev.evento}{ev.actor?" · "+ev.actor:""}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Subtotales por dia */}
        {Object.keys(days).sort().reverse().map(d=>(
          <div key={d} style={{display:"grid",gridTemplateColumns:"1.6fr 0.5fr 0.6fr 0.7fr 0.6fr 0.7fr 0.7fr 56px 20px",padding:"4px 9px",background:C.bg4,borderTop:`1px solid ${C.border}`,gap:4,alignItems:"center"}}>
            <div style={{fontSize:7,color:C.t3}}>&#128197; {d} · {days[d].c} op.</div>
            <div/><div/><div/><div/>
            <div style={{fontSize:9,fontWeight:700,color:C.t2,fontFamily:"'Courier New',monospace"}}>{mxn(days[d].v)}</div>
            <div style={{fontSize:9,fontWeight:700,fontFamily:"'Courier New',monospace",color:days[d].n>=0?C.green:C.red}}>{hide?"---":mxn(days[d].n)}</div>
            <div/><div/>
          </div>
        ))}

        {/* Total global */}
        <div style={{display:"grid",gridTemplateColumns:"1.6fr 0.5fr 0.6fr 0.7fr 0.6fr 0.7fr 0.7fr 56px 20px",padding:"8px 9px",background:C.blueDim,borderTop:`2px solid ${C.blue}`,gap:4,alignItems:"center"}}>
          <div><div style={{fontSize:8,color:C.cyan,fontWeight:700}}>TOTAL GLOBAL</div><div style={{fontSize:7,color:C.t3}}>{activeTickets.length} operaciones{trashedTickets.length>0?` · ${trashedTickets.length} en papelera`:""}</div></div>
          <div/><div/><div/><div/>
          <div style={{fontSize:11,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(totalFact)}</div>
          <div style={{fontSize:11,fontWeight:800,fontFamily:"'Courier New',monospace",color:totalNeta>=0?C.green:C.red}}>{hide?"---":mxn(totalNeta)}</div>
          <div/><div/>
        </div>
      </div>

      {/* Papelera */}
      {trashedTickets.length>0&&(
        <div style={{margin:"10px 0",padding:"0 9px"}}>
          <button onClick={()=>setShowTrash(v=>!v)}
            style={{fontSize:8,color:C.t3,background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,padding:"3px 8px",cursor:"pointer"}}>
            🗑 Papelera ({trashedTickets.length}) {showTrash?"▲":"▼"}
          </button>
          {showTrash&&trashedTickets.map(t=>(
            <div key={t.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 9px",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,borderBottom:`1px solid ${C.border}`,opacity:0.6}}>
              <div>
                <span style={{fontSize:8,color:C.t3,fontFamily:"'Courier New',monospace"}}>{t.id}</span>
                <span style={{fontSize:9,color:C.t2,marginLeft:8}}>{t.titulo}</span>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>{dispatch({type:"TKT_RESTORE",id:t.id});cancelHardDelete(t.id);toast("Ticket restaurado","success");}}
                  style={{fontSize:8,padding:"2px 8px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,cursor:"pointer"}}>↩ Restaurar</button>
                <button onClick={()=>dispatch({type:"TKT_DELETE",id:t.id})}
                  style={{fontSize:8,padding:"2px 8px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:3,color:C.red,cursor:"pointer"}}>✕ Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOBILE VIEWS — diseñadas para pulgar, una columna, elementos grandes
// ═══════════════════════════════════════════════════════════════════════════════

// ── Helpers móviles ──────────────────────────────────────────────────────────
function MCard({children,style={}}) {
  const C = React.useContext(ThemeCtx);
  return <div style={{background:"rgba(22,24,28,0.82)",border:"1px solid rgba(255,255,255,0.04)",borderRadius:18,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 16px rgba(255,255,255,0.04)",...style}}>{children}</div>;
}
function MRow({label,value,color,bold}) {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <span style={{fontSize:12,color:"#4A5568"}}>{label}</span>
      <span style={{fontSize:bold?16:13,fontWeight:bold?800:600,color:color||"#F3F4F6",fontFamily:"'Courier New',monospace"}}>{value}</span>
    </div>
  );
}
function MBtn({label,color,bg,border,onClick,full,small}) {
  const C = React.useContext(ThemeCtx);
  return (
    <button onClick={onClick} style={{
      width:full?"100%":"auto",
      padding:small?"10px 16px":"15px 20px",
      background:bg||"rgba(255,255,255,0.07)",
      border:`1px solid ${border||"rgba(255,255,255,0.1)"}`,
      borderRadius:12,cursor:"pointer",
      fontSize:small?12:14,fontWeight:700,
      color:color||"#F3F4F6",letterSpacing:"0.04em",
      minHeight:small?40:48,touchAction:"manipulation",WebkitTapHighlightColor:"transparent",
    }}>{label}</button>
  );
}
function MField({label,value,onChange,type="text",placeholder,suffix,color}) {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{marginBottom:10}}>
      {label&&<div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5,textTransform:"uppercase",fontWeight:600}}>{label}</div>}
      <div style={{display:"flex",alignItems:"center",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",minHeight:48}}>
        <input type={type} value={value} placeholder={placeholder||""} onChange={e=>onChange(e.target.value)}
          style={{flex:1,background:"transparent",border:"none",outline:"none",color:color||C.t1,
            fontSize:16,/* 16px prevents iOS auto-zoom on focus */
            padding:"12px 14px",fontFamily:"inherit"}}/>
        {suffix&&<span style={{padding:"0 12px",color:C.t3,fontSize:12}}>{suffix}</span>}
      </div>
    </div>
  );
}
function MSel({label,value,onChange,options}) {
  const C = React.useContext(ThemeCtx);
  return (
    <div style={{marginBottom:10}}>
      {label&&<div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5,textTransform:"uppercase",fontWeight:600}}>{label}</div>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 14px",color:C.t1,
          fontSize:16,/* 16px prevents iOS auto-zoom on focus */
          outline:"none",fontFamily:"inherit",minHeight:48,appearance:"auto"}}>
        {options.map(o=><option key={o.value} value={o.value} style={{background:C.bgSolid}}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── MOps — Dashboard móvil ───────────────────────────────────────────────────
function MOps({state,setTab,triggerMargin}) {
  const C = React.useContext(ThemeCtx);
  const {tickets,clients} = state;
  const [period,setPeriod]     = useState("month");
  const [heatMetric,setHeatMetric] = useState("venta");
  const [heatDay,setHeatDay]       = useState(null); // {dn,yr,mo}
  const [heatViewDate,setHeatViewDate] = useState(()=>new Date());
  const [sparkMode,setSparkMode]   = useState("week"); // "week" | "month"
  const [sparkMonthDate,setSparkMonthDate] = useState(()=>new Date());

  // ── Accent palette — Black/white monochrome
  const A = makeA(C);

  // ── Periods ───────────────────────────────────────────────────────────────
  const range     = useMemo(()=>buildRange(period),[period]);
  const prevRange = useMemo(()=>{
    const ms=range.to-range.from;
    return {from:new Date(range.from.getTime()-ms),to:new Date(range.from)};
  },[range]);

  // ── Core metrics ──────────────────────────────────────────────────────────
  const operados = useMemo(()=>
    sel_operados(tickets).filter(t=>{const d=parseDateMX(t.date);return d&&d>=range.from&&d<=range.to;})
  ,[tickets,range]);
  const prevOps = useMemo(()=>
    sel_operados(tickets).filter(t=>{const d=parseDateMX(t.date);return d&&d>=prevRange.from&&d<=prevRange.to;})
  ,[tickets,prevRange]);

  const totalFact = useMemo(()=>sumSnap(operados,"precioConIVA"),[operados]);
  const totalNeta = useMemo(()=>sumSnap(operados,"uNeta"),[operados]);
  const prevFact  = useMemo(()=>sumSnap(prevOps,"precioConIVA"),[prevOps]);
  const growth    = prevFact>0?((totalFact-prevFact)/prevFact)*100:null;
  const margen    = totalFact>0?(totalNeta/totalFact)*100:0;

  const carteraTkts  = useMemo(()=>sel_cartera(tickets),[tickets]);
  const carteraMonto = useMemo(()=>sumSnap(carteraTkts,"precioConIVA"),[carteraTkts]);
  const pipeline     = useMemo(()=>sel_open(tickets),[tickets]);
  const p1Active     = useMemo(()=>pipeline.filter(t=>t.priority==="P1"),[pipeline]);
  // "Acción requerida" = P1 stuck in early stages (not yet sourced/purchased)
  const EARLY_STAGES = new Set(["recibido","validando","sourcing","cotizado"]);
  const p1Bloqueados = useMemo(()=>p1Active.filter(t=>EARLY_STAGES.has(t.status)),[p1Active]);
  const p1EnProceso  = useMemo(()=>p1Active.filter(t=>!EARLY_STAGES.has(t.status)),[p1Active]);
  const p2Active     = useMemo(()=>pipeline.filter(t=>t.priority==="P2"),[pipeline]);
  const vencidos     = useMemo(()=>sel_vencidos(tickets),[tickets]);

  // ── Financial deep metrics (full breakdown) ────────────────────────────────
  const costoProducto = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap?.costoBase)*(1+safeNumber(t.snap?.params?.iva,16)/100),0),[operados]);
  const gastosOp      = useMemo(()=>sumSnap(operados,"gastos"),[operados]);
  const uBrutaOp      = useMemo(()=>sumSnap(operados,"uBruta"),[operados]);
  const ivaNetoOp     = useMemo(()=>sumSnap(operados,"ivaNeto"),[operados]);
  const isrOp         = useMemo(()=>sumSnap(operados,"isr"),[operados]);
  const cargaFiscal   = ivaNetoOp + isrOp;
  const eficienciaFiscal = uBrutaOp>0?(totalNeta/uBrutaOp)*100:0;
  const roi           = costoProducto>0?(totalNeta/costoProducto)*100:0;
  const markupProm    = useMemo(()=>{
    const v=operados.filter(t=>safeNumber(t.snap?.costoTotal)>0);
    return v.length>0?v.reduce((s,t)=>s+calcMarkup(safeNumber(t.snap?.precioSinIVA),safeNumber(t.snap?.costoTotal)),0)/v.length:0;
  },[operados]);
  const cobradosTkts  = useMemo(()=>sel_cobrados(tickets),[tickets]);
  const cashTotal     = useMemo(()=>sumSnap(cobradosTkts,"precioConIVA"),[cobradosTkts]);
  // CxP: only current cartera tickets (same set as carteraMonto) to avoid accumulating all historical unpaid suppliers
  const cxp           = useMemo(()=>sel_cartera(tickets).reduce((s,t)=>s+safeNumber(t.snap?.costoTotal),0),[tickets]);
  const flujoOp       = carteraMonto - cargaFiscal - cxp;
  const forecastTkts  = useMemo(()=>sel_forecast(tickets),[tickets]);
  const forecastMonto = useMemo(()=>sumSnap(forecastTkts,"precioConIVA"),[forecastTkts]);
  const forecastUtil  = useMemo(()=>forecastTkts.reduce((s,t)=>s+utilidadPonderada(safeNumber(t.snap?.uNeta),t.prob),0),[forecastTkts]);

  // ── Operational status ────────────────────────────────────────────────────
  const opsStatus = useMemo(()=>{
    if(p1Bloqueados.length>0) return {msg:`${p1Bloqueados.length} P1 requiere${p1Bloqueados.length>1?"n":""} acción`,level:"critical"};
    if(vencidos.length>0) return {msg:`${vencidos.length} cobro${vencidos.length>1?"s":""} vencido${vencidos.length>1?"s":""}`,level:"warning"};
    if(p1EnProceso.length>0) return {msg:`${p1EnProceso.length} P1 en progreso`,level:"warning"};
    if(operados.length===0) return {msg:"Sin operaciones en este período",level:"idle"};
    if(margen>=25) return {msg:"Margen saludable · Todo operando",level:"good"};
    if(margen>=15) return {msg:"Rentabilidad estable",level:"ok"};
    return {msg:"Margen bajo — revisar precios",level:"warn"};
  },[p1Bloqueados,p1EnProceso,vencidos,operados,margen]);

  const sc = {
    critical:{dot:A.red,   text:A.red},
    warning: {dot:A.amber, text:A.amber},
    idle:    {dot:A.t3,    text:A.t3},
    good:    {dot:A.lime,  text:A.lime},
    ok:      {dot:A.mint,  text:A.mint},
    warn:    {dot:A.amber, text:A.amber},
  }[opsStatus.level];

  // ── 7-day sparkline ───────────────────────────────────────────────────────
  const sparkData = useMemo(()=>{
    const days=[];
    for(let i=6;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const dd=String(d.getDate()).padStart(2,"0");
      const mm=String(d.getMonth()+1).padStart(2,"0");
      const ds=`${dd}/${mm}/${d.getFullYear()}`;
      const val=sumSnap(sel_operados(tickets).filter(t=>t.date===ds),"uNeta");
      days.push({val,today:i===0,label:i===0?"Hoy":`${dd}/${mm}`});
    }
    return days;
  },[tickets]);
  const maxSpark = Math.max(...sparkData.map(d=>d.val),1);

  // Monthly sparkline — day by day for selected month
  const sparkMonthData = useMemo(()=>{
    const now=new Date();
    const yr=sparkMonthDate.getFullYear(), mo=sparkMonthDate.getMonth();
    const isCurrentMonth=yr===now.getFullYear()&&mo===now.getMonth();
    const daysInMo=new Date(yr,mo+1,0).getDate();
    const lastDay=isCurrentMonth?now.getDate():daysInMo;
    const days=[];
    for(let dn=1;dn<=lastDay;dn++){
      const dd=String(dn).padStart(2,"0");
      const mm=String(mo+1).padStart(2,"0");
      const ds=`${dd}/${mm}/${yr}`;
      const val=sumSnap(sel_operados(tickets).filter(t=>t.date===ds),"uNeta");
      const isToday=isCurrentMonth&&dn===now.getDate();
      days.push({val,dn,isToday,label:isToday?"Hoy":`${dn}/${mm}`});
    }
    return days;
  },[tickets,sparkMonthDate]);
  const maxSparkMonth = Math.max(...sparkMonthData.map(d=>Math.max(d.val,0)),1);
  const sparkMonthPath = useMemo(()=>{
    const W=280,H=50,pts=sparkMonthData.length;
    if(pts<2) return {line:"",area:""};
    const xs=sparkMonthData.map((_,i)=>(i/(pts-1))*W);
    const ys=sparkMonthData.map(d=>H-(Math.max(d.val,0)/maxSparkMonth)*(H-6)-3);
    const line=xs.map((x,i)=>`${i===0?"M":"L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    return {line, area:line+` L${W},${H} L0,${H} Z`, xs, ys};
  },[sparkMonthData,maxSparkMonth]);

  // SVG sparkline path (280×52 viewBox)
  const sparkPath = useMemo(()=>{
    const W=280,H=50,pts=sparkData.length;
    const xs=sparkData.map((_,i)=>(i/(pts-1))*W);
    const ys=sparkData.map(d=>H-(Math.max(d.val,0)/maxSpark)*(H-6)-3);
    const line=xs.map((x,i)=>`${i===0?"M":"L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    return {line, area:line+` L${W},${H} L0,${H} Z`};
  },[sparkData,maxSpark]);

  const growthUp = growth!==null&&growth>=0;
  const pLabel   = {"today":"Hoy","week":"7 días","month":"30 días","3m":"90 días"}[period]||"Período";

  return (
    <div style={{minHeight:"100vh",background:"transparent",paddingBottom:40}}>

      {/* ══ ALERT BANNER — breaks layout, appears FIRST ══════════════════════ */}
      {(p1Bloqueados.length>0||p1EnProceso.length>0||vencidos.length>0)&&(
        <div style={{
          background: p1Bloqueados.length>0
            ? "rgba(239,68,68,0.08)"
            : "rgba(245,158,11,0.06)",
          borderBottom: `1px solid ${p1Bloqueados.length>0?"rgba(239,68,68,0.2)":"rgba(245,158,11,0.15)"}`,
          padding:"20px 20px 16px",
        }}>
          {p1Bloqueados.length>0&&(
            <div style={{marginBottom:(p1EnProceso.length>0||vencidos.length>0)?18:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:A.red,flexShrink:0}}/>
                <span style={{fontSize:10,fontWeight:800,color:A.red,letterSpacing:"0.16em",textTransform:"uppercase"}}>
                  Acción requerida
                </span>
              </div>
              {p1Bloqueados.slice(0,2).map((t,i)=>(
                <div key={t.id} onClick={()=>setTab("tickets")}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",
                    cursor:"pointer",borderTop:i>0?`1px solid rgba(232,72,72,0.12)`:"none"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:A.t1,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>{t.titulo}</div>
                    <div style={{fontSize:11,color:A.red}}>Pendiente acción · {TICKET_META[t.status]?.label||t.status}</div>
                  </div>
                  <div style={{fontSize:20,color:A.red,opacity:0.65,flexShrink:0}}>›</div>
                </div>
              ))}
              {p1Bloqueados.length>2&&(
                <div onClick={()=>setTab("tickets")} style={{fontSize:11,color:A.red,marginTop:8,cursor:"pointer",opacity:0.8}}>
                  +{p1Bloqueados.length-2} más →
                </div>
              )}
            </div>
          )}
          {p1EnProceso.length>0&&(
            <div style={{marginBottom:vencidos.length>0?18:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:A.amber,flexShrink:0}}/>
                <span style={{fontSize:10,fontWeight:700,color:A.amber,letterSpacing:"0.14em",textTransform:"uppercase"}}>
                  P1 en progreso
                </span>
              </div>
              <div style={{fontSize:11,color:A.t3}}>
                {p1EnProceso.length} operación{p1EnProceso.length>1?"es":""} — {p1EnProceso.map(t=>TICKET_META[t.status]?.label||t.status).join(", ")}
              </div>
            </div>
          )}
          {vencidos.length>0&&(
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:A.amber,flexShrink:0}}/>
                <span style={{fontSize:10,fontWeight:800,color:A.amber,letterSpacing:"0.16em",textTransform:"uppercase"}}>
                  Cobros vencidos
                </span>
              </div>
              {vencidos.slice(0,1).map(t=>(
                <div key={t.id} onClick={()=>setTab("cartera")}
                  style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",cursor:"pointer"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:600,color:A.t1,overflow:"hidden",
                      textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>
                      {t.titulo}
                    </div>
                    <div style={{fontSize:11,color:A.amber}}>Prometido {t.promesaPago} · Vencido</div>
                  </div>
                  <div style={{fontSize:20,color:A.amber,opacity:0.65,flexShrink:0}}>›</div>
                </div>
              ))}
              {vencidos.length>1&&(
                <div onClick={()=>setTab("cartera")}
                  style={{fontSize:11,color:A.amber,marginTop:8,cursor:"pointer",opacity:0.8}}>
                  +{vencidos.length-1} más →
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{padding:"0 16px"}}>
        {/* ── Period tabs + IA button ── */}
        <div style={{display:"flex",gap:6,padding:"20px 0 20px",overflowX:"auto",
          scrollbarWidth:"none",msOverflowStyle:"none",alignItems:"center"}}>
          {[["today","Hoy"],["week","7d"],["month","30d"],["3m","3M"]].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)}
              className={period===v?"glass-pill-active":"glass-pill-inactive"}
              style={{
                flexShrink:0,padding:"7px 18px",borderRadius:20,fontSize:12,fontWeight:700,
                color:period===v ? A.pillColor : A.t3,
                cursor:"pointer",letterSpacing:"0.04em",transition:"all 0.18s",
              }}>
              {l}
            </button>
          ))}
          {triggerMargin&&(
            <button
              onClick={()=>{
                const t=[...tickets].filter(t=>safeNumber(t.snap?.costoTotal)>0)
                  .sort((a,b)=>b.date.localeCompare(a.date))[0];
                if(t) triggerMargin(t);
              }}
              style={{
                flexShrink:0,marginLeft:"auto",padding:"7px 13px",borderRadius:20,
                background:"rgba(143,227,190,0.10)",border:"1px solid rgba(143,227,190,0.28)",
                color:"#8FE3BE",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:"0.04em",
                display:"flex",alignItems:"center",gap:5,
              }}>
              ⚡ IA
            </button>
          )}
        </div>

        {/* ══ HERO CARD ══════════════════════════════════════ */}
        <div className="glass-card" style={{
          padding:"28px 24px",
          marginBottom:12,
        }}>
          {/* Operational status line */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:22}}>
            <div style={{
              width:6,height:6,borderRadius:"50%",background:sc.dot,flexShrink:0,
              boxShadow:"none",
            }}/>
            <span style={{fontSize:11,fontWeight:700,color:sc.text,letterSpacing:"0.1em",textTransform:"uppercase"}}>
              {opsStatus.msg}
            </span>
          </div>

          {/* Label */}
          <div style={{fontSize:9,color:A.t3,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:10}}>
            Facturado · {pLabel}
          </div>

          {/* GIANT number */}
          <div style={{
            fontSize:58,fontWeight:800,color:C.t1,lineHeight:0.9,
            letterSpacing:"-0.025em",fontVariantNumeric:"tabular-nums",
            marginBottom:16,
          }}>
            {mxn(totalFact)}
          </div>

          {/* Growth chip */}
          {growth!==null&&(
            <div style={{marginBottom:22}}>
              <span style={{
                display:"inline-flex",alignItems:"center",gap:6,
                padding:"5px 14px",borderRadius:20,
                background: growthUp?A.limeDim:A.redDim,
                border:`1px solid ${growthUp?C.borderHi:"rgba(224,85,85,0.25)"}`,
              }}>
                <span style={{fontSize:14,fontWeight:800,color:growthUp?A.lime:A.red}}>
                  {growthUp?"+":""}{growth.toFixed(0)}%
                </span>
                <span style={{fontSize:10,color:A.t3,letterSpacing:"0.05em"}}>vs anterior</span>
              </span>
            </div>
          )}

          {/* Divider */}
          <div style={{height:1,background:C.border,marginBottom:22}}/>

          {/* Secondary KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0}}>
            {[
              {label:"Util. neta", value:mxn(totalNeta), color:A.lime},
              {label:"Margen",    value:fpct(margen),    color:margen>=25?A.lime:margen>=15?A.mint:A.amber, border:true},
              {label:"Ops",       value:operados.length, color:A.t1, border:true},
            ].map(({label,value,color,border})=>(
              <div key={label} style={{paddingLeft:border?14:0,
                borderLeft:border?`1px solid ${C.border}`:"none"}}>
                <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:7}}>
                  {label}
                </div>
                <div style={{fontSize:22,fontWeight:800,color,letterSpacing:"-0.01em"}}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ QUICK ACTIONS ═════════════════════════════════════════════════════ */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
          <button onClick={()=>setTab("cotizador")} className="glass-button" style={{
            borderRadius:18,padding:"18px 16px",
            textAlign:"left",WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
          }}>
            <div style={{fontSize:22,fontWeight:800,color:A.lime,lineHeight:1,marginBottom:6}}>+</div>
            <div style={{fontSize:13,fontWeight:700,color:A.lime,letterSpacing:"-0.01em",lineHeight:1.2}}>
              Nueva<br/>cotización
            </div>
          </button>
          <button onClick={()=>setTab("tickets")} className="glass-button" style={{
            borderRadius:18,padding:"18px 16px",
            cursor:"pointer",textAlign:"left",
            WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
          }}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
              <span style={{fontSize:26,fontWeight:800,color:A.t1,lineHeight:1}}>{pipeline.length}</span>
              {p1Active.length>0&&(
                <span style={{width:7,height:7,borderRadius:"50%",background:A.red,display:"inline-block",
                  }}/>
              )}
            </div>
            <div style={{fontSize:12,fontWeight:600,color:A.t2}}>
              en Pipeline
              {p1Active.length>0&&<div style={{fontSize:10,color:A.red,marginTop:3}}>{p1Active.length} P1 urgente{p1Active.length>1?"s":""}</div>}
            </div>
          </button>
        </div>

        {/* ══ CARTERA WIDGET — interactive, touchable ═══════════════════════════ */}
        <div onClick={()=>setTab("cartera")} style={{
          background: vencidos.length>0
            ? "rgba(245,158,11,0.08)"
            : A.card,
          borderRadius:A.r,
          padding:"22px 24px",
          marginBottom:12,
          boxShadow:A.shadow,
          cursor:"pointer",
          border:`1px solid ${vencidos.length>0?"rgba(240,160,48,0.25)":C.border}`,
          WebkitTapHighlightColor:"transparent",
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",textTransform:"uppercase"}}>
              Cartera activa
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {vencidos.length>0&&(
                <span style={{
                  fontSize:10,fontWeight:700,color:A.amber,
                  background:A.amberDim,
                  padding:"3px 10px",borderRadius:10,
                  border:"1px solid rgba(240,160,48,0.28)",
                }}>
                  {vencidos.length} vencida{vencidos.length>1?"s":""}
                </span>
              )}
              <span style={{fontSize:20,color:A.t3,opacity:0.5}}>›</span>
            </div>
          </div>
          <div style={{
            fontSize:42,fontWeight:800,lineHeight:1,letterSpacing:"-0.025em",
            color:vencidos.length>0?A.amber:carteraMonto>0?A.t1:A.t3,
            marginBottom:10,fontVariantNumeric:"tabular-nums",
          }}>
            {mxn(carteraMonto)}
          </div>
          <div style={{fontSize:11,color:A.t3}}>
            {carteraTkts.length} ticket{carteraTkts.length!==1?"s":""} pendientes · toca para detalle
          </div>
        </div>

        {/* ══ SPARKLINE — util trend ══════════════════════════════════════════ */}
        <div className="glass-card" style={{
          padding:"22px 24px",marginBottom:12,
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:sparkMode==="month"?3:0}}>
                Utilidad neta
              </div>
              {sparkMode==="month"&&(()=>{
                const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                const yr=sparkMonthDate.getFullYear(), mo=sparkMonthDate.getMonth();
                const now=new Date();
                const isCurrent=yr===now.getFullYear()&&mo===now.getMonth();
                const goPrev=()=>setSparkMonthDate(new Date(yr,mo-1,1));
                const goNext=()=>{const n=new Date(yr,mo+1,1);if(n<=now)setSparkMonthDate(n);};
                return (
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button onClick={goPrev}
                      style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                        width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",
                        color:A.t2,fontSize:13,cursor:"pointer",flexShrink:0,padding:0}}>‹</button>
                    <span style={{fontSize:12,fontWeight:700,color:A.t1}}>
                      {MESES[mo]} {yr}
                    </span>
                    <button onClick={goNext} disabled={isCurrent}
                      style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,
                        width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",
                        color:isCurrent?A.t3:A.t2,fontSize:13,cursor:isCurrent?"default":"pointer",
                        opacity:isCurrent?0.35:1,flexShrink:0,padding:0}}>›</button>
                  </div>
                );
              })()}
            </div>
            <div style={{display:"flex",gap:5,alignItems:"center"}}>
              {growth!==null&&sparkMode==="week"&&(
                <span style={{fontSize:10,fontWeight:700,color:growthUp?A.lime:A.red,marginRight:6}}>
                  {growthUp?"+":""}{growth.toFixed(0)}%
                </span>
              )}
              {[["week","7 días"],["month","Por mes"]].map(([v,l])=>(
                <button key={v} onClick={()=>setSparkMode(v)}
                  style={{padding:"4px 10px",borderRadius:14,fontSize:9,fontWeight:700,cursor:"pointer",
                    letterSpacing:"0.04em",
                    background:sparkMode===v?"rgba(143,227,190,0.12)":"transparent",
                    border:`1px solid ${sparkMode===v?"rgba(143,227,190,0.4)":C.border}`,
                    color:sparkMode===v?A.lime:A.t3}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {sparkMode==="week"?(
            <>
              <svg viewBox="0 0 280 52" style={{width:"100%",height:52,display:"block",overflow:"visible"}}>
                <defs>
                  <linearGradient id="mops-sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={A.lime} stopOpacity="0.25"/>
                    <stop offset="100%" stopColor={A.lime} stopOpacity="0.02"/>
                  </linearGradient>
                </defs>
                <path d={sparkPath.area} fill="url(#mops-sg)"/>
                <path d={sparkPath.line} fill="none" stroke={A.lime} strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
                {sparkData.map((d,i)=>{
                  if(!d.today) return null;
                  const x=(i/(sparkData.length-1))*280;
                  const y=50-(Math.max(d.val,0)/maxSpark)*(50-6)-3;
                  return (
                    <g key="td">
                      <circle cx={x} cy={y} r={10} fill={A.lime} opacity={0.1}/>
                      <circle cx={x} cy={y} r={5}  fill={A.lime} opacity={0.85}/>
                    </g>
                  );
                })}
              </svg>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:10}}>
                {sparkData.map((d,i)=>(
                  <div key={i} style={{fontSize:8,color:d.today?A.lime:A.t3,
                    fontWeight:d.today?800:400,textAlign:"center",letterSpacing:"0.02em"}}>
                    {d.label}
                  </div>
                ))}
              </div>
            </>
          ):(
            <>
              {/* Monthly line chart — day by day */}
              <svg viewBox="0 0 280 52" style={{width:"100%",height:52,display:"block",overflow:"visible"}}>
                <defs>
                  <linearGradient id="mops-mg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={A.lime} stopOpacity="0.25"/>
                    <stop offset="100%" stopColor={A.lime} stopOpacity="0.02"/>
                  </linearGradient>
                </defs>
                {sparkMonthPath.area&&<path d={sparkMonthPath.area} fill="url(#mops-mg)"/>}
                {sparkMonthPath.line&&<path d={sparkMonthPath.line} fill="none" stroke={A.lime} strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>}
                {sparkMonthData.map((d,i)=>{
                  if(!d.isToday||!sparkMonthPath.xs) return null;
                  const x=sparkMonthPath.xs[i], y=sparkMonthPath.ys[i];
                  return (
                    <g key="td">
                      <circle cx={x} cy={y} r={10} fill={A.lime} opacity={0.1}/>
                      <circle cx={x} cy={y} r={5}  fill={A.lime} opacity={0.85}/>
                    </g>
                  );
                })}
              </svg>
              {/* X-axis: show every ~5 days + today */}
              <div style={{display:"flex",justifyContent:"space-between",marginTop:10,position:"relative"}}>
                {sparkMonthData.filter((_,i)=>i===0||i===sparkMonthData.length-1||(i+1)%5===0).map((d,i)=>(
                  <div key={i} style={{fontSize:8,color:d.isToday?A.lime:A.t3,
                    fontWeight:d.isToday?800:400,textAlign:"center",letterSpacing:"0.02em"}}>
                    {d.isToday?"Hoy":d.dn}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ══ MAPA DE CALOR — MENSUAL ══════════════════════════════════════════ */}
        {(()=>{
          const refDate = heatViewDate;
          const yr = refDate.getFullYear();
          const mo = refDate.getMonth();
          const goHeatPrev=()=>{ setHeatViewDate(new Date(yr,mo-1,1)); setHeatDay(null); };
          const goHeatNext=()=>{ const n=new Date(yr,mo+1,1); if(n<=new Date()) { setHeatViewDate(n); setHeatDay(null); } };
          const isHeatCurrent=yr===new Date().getFullYear()&&mo===new Date().getMonth();
          // Build day → {venta,neta,ops,solic,tkts[]} for this month
          const dmap={};
          const operadosSet=new Set(sel_operados(tickets).map(t=>t.id));
          const parseDN=(s)=>{
            if(!s) return null;
            const p=s.split("/");
            if(p.length!==3) return null;
            return {dn:parseInt(p[0]),mo:parseInt(p[1])-1,yr:parseInt(p[2])};
          };
          sel_operados(tickets).forEach(t=>{
            const p=parseDN(t.date);
            if(!p||p.yr!==yr||p.mo!==mo) return;
            const k=p.dn;
            if(!dmap[k]) dmap[k]={venta:0,neta:0,ops:0,solic:0,tkts:[]};
            dmap[k].venta+=safeNumber(t.snap?.precioConIVA);
            dmap[k].neta +=safeNumber(t.snap?.uNeta);
            dmap[k].ops  +=1;
            dmap[k].tkts.push(t);
          });
          tickets.filter(t=>!t._deleted).forEach(t=>{
            const p=parseDN(t.date);
            if(!p||p.yr!==yr||p.mo!==mo) return;
            const k=p.dn;
            if(!dmap[k]) dmap[k]={venta:0,neta:0,ops:0,solic:0,tkts:[]};
            dmap[k].solic+=1;
            if(!operadosSet.has(t.id)) dmap[k].tkts.push(t);
          });
          const daysInMo = new Date(yr,mo+1,0).getDate();
          // Start offset (Mon=0)
          const rawDow = new Date(yr,mo,1).getDay();
          const offset = rawDow===0?6:rawDow-1;
          const totalCells = Math.ceil((offset+daysInMo)/7)*7;
          const cells=[];
          for(let i=0;i<totalCells;i++){
            const dn=i-offset+1;
            const valid=dn>=1&&dn<=daysInMo;
            const fut=valid&&new Date(yr,mo,dn)>new Date();
            cells.push({dn,valid,fut,data:valid?(dmap[dn]||null):null});
          }
          const rows=[];
          for(let r=0;r<totalCells/7;r++) rows.push(cells.slice(r*7,(r+1)*7));
          const vals=Object.values(dmap);
          const maxV=Math.max(...vals.map(d=>d.venta),1);
          const maxN=Math.max(...vals.map(d=>Math.max(d.neta,0)),1);
          const maxO=Math.max(...vals.map(d=>d.ops),1);
          const maxS=Math.max(...vals.map(d=>d.solic),1);
          const METRICS=[
            {v:"venta",l:"Venta",      hC:"#8FE3BE",hBg:"rgba(143,227,190,0.12)",hBd:"rgba(143,227,190,0.4)"},
            {v:"neta", l:"Util. neta", hC:"#8FE3BE",hBg:"rgba(143,227,190,0.12)",hBd:"rgba(143,227,190,0.4)"},
            {v:"ops",  l:"Ops",        hC:"#60A5FA",hBg:"rgba(96,165,250,0.15)", hBd:"rgba(96,165,250,0.4)"},
            {v:"solic",l:"Solicitudes",hC:"#C084FC",hBg:"rgba(192,132,252,0.15)",hBd:"rgba(192,132,252,0.4)"},
          ];
          const mCfg=METRICS.find(m=>m.v===heatMetric)||METRICS[0];
          const getVal=data=>{if(!data)return 0;return heatMetric==="venta"?data.venta:heatMetric==="neta"?Math.max(data.neta,0):heatMetric==="ops"?data.ops:data.solic;};
          const getMax=()=>heatMetric==="venta"?maxV:heatMetric==="neta"?maxN:heatMetric==="ops"?maxO:maxS;
          const MESES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
          const todayStr=new Date().toDateString();
          const selData=heatDay&&heatDay.yr===yr&&heatDay.mo===mo?(dmap[heatDay.dn]||null):null;
          const selDateStr=heatDay?`${String(heatDay.dn).padStart(2,"0")}/${String(mo+1).padStart(2,"0")}/${yr}`:"";
          return (
            <div className="glass-card" style={{padding:"22px 24px",marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div>
                  <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:3}}>Mapa de calor</div>
                  <div style={{fontSize:13,fontWeight:700,color:A.t1}}>{MESES[mo]} {yr}</div>
                </div>
                <div style={{display:"flex",gap:4,alignItems:"center"}}>
                  <button onClick={goHeatPrev}
                    style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,
                      width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",
                      color:A.t2,fontSize:16,cursor:"pointer",flexShrink:0}}>‹</button>
                  <button onClick={goHeatNext} disabled={isHeatCurrent}
                    style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,
                      width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",
                      color:isHeatCurrent?A.t3:A.t2,fontSize:16,cursor:isHeatCurrent?"default":"pointer",
                      opacity:isHeatCurrent?0.35:1,flexShrink:0}}>›</button>
                </div>
              </div>
              {/* Metric toggles */}
              <div style={{display:"flex",gap:5,marginBottom:16,flexWrap:"wrap"}}>
                {METRICS.map(({v,l,hC,hBg,hBd})=>(
                  <button key={v} onClick={()=>{setHeatMetric(v);setHeatDay(null);}}
                    style={{padding:"5px 12px",borderRadius:20,fontSize:10,fontWeight:700,cursor:"pointer",
                      letterSpacing:"0.04em",textTransform:"uppercase",
                      background:heatMetric===v?hBg:"rgba(255,255,255,0.03)",
                      border:`1px solid ${heatMetric===v?hBd:C.border}`,
                      color:heatMetric===v?hC:A.t3}}>
                    {l}
                  </button>
                ))}
              </div>
              {/* Day-of-week headers */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:5}}>
                {["L","M","X","J","V","S","D"].map(d=>(
                  <div key={d} style={{textAlign:"center",fontSize:8,color:A.t3,letterSpacing:"0.06em",fontWeight:600}}>{d}</div>
                ))}
              </div>
              {/* Calendar rows */}
              {rows.map((row,ri)=>(
                <div key={ri} style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
                  {row.map((cell,ci)=>{
                    if(!cell.valid) return <div key={ci} style={{aspectRatio:"1",borderRadius:5}}/>;
                    const val=getVal(cell.data);
                    const pct=val>0?Math.max(0.18,val/getMax()):0;
                    const isToday=!cell.fut&&new Date(yr,mo,cell.dn).toDateString()===todayStr;
                    const isSel=heatDay&&heatDay.dn===cell.dn&&heatDay.yr===yr&&heatDay.mo===mo;
                    const hexA=pct>0?Math.round(pct*255).toString(16).padStart(2,"0"):"";
                    const bg=cell.fut
                      ?(C._dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)")
                      :pct>0?`${mCfg.hC}${hexA}`
                      :(C._dark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)");
                    const textC=pct>0.5?(C._dark?"rgba(0,0,0,0.85)":"rgba(255,255,255,0.9)"):A.t3;
                    return (
                      <div key={ci}
                        onClick={()=>cell.data?setHeatDay(isSel?null:{dn:cell.dn,yr,mo}):null}
                        style={{aspectRatio:"1",borderRadius:5,background:bg,
                          border:isSel?`2px solid ${mCfg.hC}`
                            :isToday?`1.5px solid ${mCfg.hC}88`:"none",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          cursor:cell.data?"pointer":"default"}}>
                        <span style={{fontSize:9,fontWeight:(isToday||isSel)?800:400,color:textC,userSelect:"none"}}>
                          {cell.dn}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
              {/* Legend */}
              <div style={{display:"flex",alignItems:"center",gap:5,marginTop:10,justifyContent:"flex-end"}}>
                <span style={{fontSize:8,color:A.t3}}>Menos</span>
                {[0.18,0.38,0.58,0.78,1].map((i,idx)=>(
                  <div key={idx} style={{width:11,height:11,borderRadius:2,
                    background:`${mCfg.hC}${Math.round(i*255).toString(16).padStart(2,"0")}`}}/>
                ))}
                <span style={{fontSize:8,color:A.t3}}>Más</span>
              </div>
              {/* ── Day detail panel ─────────────────────────────────────── */}
              {heatDay&&heatDay.yr===yr&&heatDay.mo===mo&&(
                <div style={{marginTop:16,borderTop:`1px solid ${C.border}`,paddingTop:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div>
                      <div style={{fontSize:9,color:A.t3,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:2}}>Detalle del día</div>
                      <div style={{fontSize:13,fontWeight:700,color:mCfg.hC}}>{selDateStr}</div>
                    </div>
                    <button onClick={()=>setHeatDay(null)}
                      style={{background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,
                        padding:"4px 10px",color:A.t3,fontSize:11,cursor:"pointer"}}>✕</button>
                  </div>
                  {selData&&(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>
                      {[
                        {l:"Solicitudes",v:selData.solic,   c:"#C084FC"},
                        {l:"Operadas",   v:selData.ops,     c:A.lime},
                        {l:"Venta",      v:mxn(selData.venta),c:A.t1},
                        {l:"Util.",      v:mxn(selData.neta), c:selData.neta>=0?A.lime:A.red},
                      ].map(({l,v,c})=>(
                        <div key={l} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                          <div style={{fontSize:8,color:A.t3,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>{l}</div>
                          <div style={{fontSize:12,fontWeight:800,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selData&&selData.tkts.length>0?(
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {selData.tkts.map(t=>{
                        const sm=TICKET_META[t.status]||{};
                        return (
                          <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,
                            padding:"10px 12px",borderRadius:10,
                            background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:12,fontWeight:600,color:A.t1,
                                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:3}}>
                                {t.titulo||"Sin título"}
                              </div>
                              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                                <span style={{fontSize:9,color:sm.color||A.t3,letterSpacing:"0.06em"}}>
                                  {sm.label||t.status}
                                </span>
                                {t.priority&&(
                                  <span style={{fontSize:9,fontWeight:700,
                                    color:t.priority==="P1"?A.red:t.priority==="P2"?A.amber:A.t3}}>
                                    {t.priority}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div style={{textAlign:"right",flexShrink:0}}>
                              {safeNumber(t.snap?.precioConIVA)>0&&(
                                <div style={{fontSize:12,fontWeight:700,color:A.t1,fontVariantNumeric:"tabular-nums"}}>
                                  {mxn(safeNumber(t.snap?.precioConIVA))}
                                </div>
                              )}
                              {safeNumber(t.snap?.uNeta)!==0&&(
                                <div style={{fontSize:10,fontVariantNumeric:"tabular-nums",
                                  color:safeNumber(t.snap?.uNeta)>=0?A.lime:A.red}}>
                                  {mxn(safeNumber(t.snap?.uNeta))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ):(
                    <div style={{textAlign:"center",padding:"16px 0",fontSize:12,color:A.t3}}>
                      Sin tickets registrados este día
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══ SALUD FINANCIERA ══════════════════════════════════════════════════ */}
        {operados.length>0&&(
          <div className="glass-card" style={{padding:"22px 24px",marginBottom:12}}>
            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:18}}>
              Salud financiera · {pLabel}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
              {[
                {label:"Facturado",    value:mxn(totalFact),   color:A.t1},
                {label:"Util. neta",   value:mxn(totalNeta),   color:A.lime},
                {label:"Carga fiscal", value:mxn(cargaFiscal), color:A.amber},
                {label:"ROI",          value:fpct(roi),        color:roi>=30?A.lime:roi>=15?A.mint:A.amber},
                {label:"Markup prom.", value:fpct(markupProm), color:A.t2},
                {label:"Margen neto",  value:fpct(margen),     color:margen>=25?A.lime:margen>=15?A.mint:A.amber},
              ].map(({label,value,color})=>(
                <div key={label}>
                  <div style={{fontSize:9,color:A.t3,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>{label}</div>
                  <div style={{fontSize:18,fontWeight:800,color,fontVariantNumeric:"tabular-nums"}}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{height:1,background:C.border,marginBottom:14}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {label:"Cartera",   value:mxn(carteraMonto), color:vencidos.length>0?A.amber:A.t2},
                {label:"Cash",      value:mxn(cashTotal),    color:A.lime},
                {label:"Forecast",  value:mxn(forecastMonto),color:A.t3},
              ].map(({label,value,color})=>(
                <div key={label} style={{textAlign:"center",padding:"10px 6px",
                  background:C._dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",borderRadius:10}}>
                  <div style={{fontSize:8,color:A.t3,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:5}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:700,color,fontVariantNumeric:"tabular-nums"}}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ CLIENTE LÍDER ═════════════════════════════════════════════════════ */}
        {(()=>{
          const map={};
          operados.forEach(t=>{if(t.clientId) map[t.clientId]=(map[t.clientId]||0)+safeNumber(t.snap?.precioConIVA);});
          const top=Object.entries(map).sort((a,b)=>b[1]-a[1])[0];
          if(!top) return null;
          const cl=clients.find(c=>c.id===top[0]);
          if(!cl) return null;
          const pct=totalFact>0?(top[1]/totalFact)*100:0;
          return (
            <div className="glass-card" style={{padding:"22px 24px",marginBottom:12}}>
              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:18}}>
                Cliente líder · {pLabel}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:16}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:A.t1,marginBottom:6}}>{cl.empresa}</div>
                  <div style={{fontSize:30,fontWeight:800,color:A.t1,letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums"}}>
                    {mxn(top[1])}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:26,fontWeight:800,color:A.lime,letterSpacing:"-0.02em",lineHeight:1}}>
                    {pct.toFixed(0)}%
                  </div>
                  <div style={{fontSize:9,color:A.t3,letterSpacing:"0.1em",textTransform:"uppercase",marginTop:4}}>
                    del total
                  </div>
                </div>
              </div>
              <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(pct,100)}%`,
                  background:`linear-gradient(90deg,${A.lime},${A.mint})`,
                  borderRadius:2,transition:"width 600ms ease"}}/>
              </div>
            </div>
          );
        })()}

        {/* ── Sin datos empty state ── */}
        {operados.length===0&&!p1Active.length&&!vencidos.length&&!p1EnProceso.length&&(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:11,color:A.t3,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>
              Sin operaciones en {pLabel.toLowerCase()}
            </div>
            <div style={{fontSize:13,color:A.t3,marginBottom:20}}>
              Crea una cotización para comenzar
            </div>
            <button onClick={()=>setTab("cotizador")} style={{
              background:A.limeDim,border:`1px solid ${C.borderHi}`,
              borderRadius:12,padding:"10px 22px",cursor:"pointer",
              fontSize:13,fontWeight:600,color:A.lime,letterSpacing:"0.04em",
            }}>
              + Nueva cotización
            </button>
          </div>
        )}

        {/* ══ RESUMEN FINANCIERO — tabla completa ══════════════════════════════ */}
        <div className="glass-card" style={{
          overflow:"hidden",marginBottom:12,
        }}>
          {/* Header */}
          <div style={{padding:"20px 22px 16px",borderBottom:`1px solid ${C.border}`}}>
            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:6}}>
              Resumen financiero
            </div>
            <div style={{fontSize:11,color:A.t2}}>{pLabel} · {operados.length} operación{operados.length!==1?"es":""}</div>
          </div>
          {/* Rows */}
          {[
            {label:"Revenue operado",   val:mxn(totalFact),          col:A.lime,     bold:true},
            {label:"Costo producto",    val:mxn(costoProducto),      col:A.t2},
            {label:"Gastos operativos", val:mxn(gastosOp),           col:A.t2},
            {label:"Cash cobrado",      val:mxn(cashTotal),          col:"#8FE3BE"},
            {label:"Utilidad operativa",val:mxn(totalNeta),          col:totalNeta>=0?"#8FE3BE":A.red, bold:true},
            {label:"Markup promedio",   val:fpct(markupProm),        col:A.lime},
            {label:"Rentabilidad neta", val:fpct(margen),            col:margen>=20?"#8FE3BE":margen>=10?"#F3F4F6":A.amber},
            {label:"ROI operativo",     val:fpct(roi),               col:roi>=25?"#8FE3BE":A.amber},
            {label:"IVA neto SAT",      val:mxn(ivaNetoOp),         col:A.amber},
            {label:"ISR estimado",      val:mxn(isrOp),              col:A.amber},
            {label:"Carga fiscal",      val:mxn(cargaFiscal),        col:A.red},
            {label:"Eficiencia fiscal", val:fpct(eficienciaFiscal),  col:eficienciaFiscal>=75?"#8FE3BE":A.amber},
            {label:"Cartera pendiente", val:mxn(carteraMonto),       col:vencidos.length>0?A.amber:A.t1},
            {label:"Flujo operativo",   val:mxn(flujoOp),            col:flujoOp>=0?"#8FE3BE":A.red},
            {label:"Forecast revenue",  val:mxn(forecastMonto),      col:A.t2},
            {label:"Forecast utilidad", val:mxn(forecastUtil),       col:forecastUtil>0?A.lime:A.t2},
            {label:"P1 activos",        val:String(p1Active.length), col:p1Active.length>0?A.red:A.t3, bold:p1Active.length>0},
            {label:"P2 activos",        val:String(p2Active.length), col:p2Active.length>0?A.amber:A.t3},
          ].map(({label,val,col,bold},i,arr)=>(
            <div key={label} style={{
              display:"flex",justifyContent:"space-between",alignItems:"center",
              padding:"12px 22px",
              borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",
              background:bold?(C._dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)"):"transparent",
            }}>
              <span style={{fontSize:12,color:A.t2,letterSpacing:"0.01em"}}>{label}</span>
              <span style={{
                fontSize:bold?15:13,fontWeight:bold?800:600,
                color:col,fontFamily:"'Courier New',monospace",
                letterSpacing:"0.01em",
              }}>{val}</span>
            </div>
          ))}
          {/* Footer CTA */}
          <div style={{padding:"16px 22px"}}>
            <button onClick={()=>setTab("cotizador")}
              style={{width:"100%",padding:"14px",
                background:A.limeFill,
                border:"none",borderRadius:14,cursor:"pointer",
                fontSize:14,fontWeight:700,color:C._dark?"#0A1F14":"#161616",
                letterSpacing:"0.02em",touchAction:"manipulation",
                boxShadow:`0 4px 20px ${A.limeDim}`,
              }}>
              + Nueva cotización
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── StatusFlowSheet — bottom sheet para cambiar estado de ticket en mobile ────
const MOTIVOS_CANCEL = ["Precio","Sin disponibilidad","Cliente desistió","Tiempo de entrega","Proveedor falló","Duplicado","Otro"];

function StatusFlowSheet({tkt, dispatch, toast, onClose}) {
  const C = React.useContext(ThemeCtx);
  const [cancelMotivo, setCancelMotivo] = useState(null);
  const [showCancelPicker, setShowCancelPicker] = useState(false);
  if(!tkt) return null;
  const nexts = TICKET_TRANSITIONS[tkt.status] || [];
  const meta  = TICKET_META[tkt.status] || {};
  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:201,
        background:"rgba(14,16,20,0.92)",backdropFilter:"blur(32px) saturate(1.8)",WebkitBackdropFilter:"blur(32px) saturate(1.8)",
        borderRadius:"28px 28px 0 0",borderTop:`1px solid rgba(255,255,255,0.10)`,
        padding:`16px 16px calc(20px + env(safe-area-inset-bottom,0px))`,
        boxShadow:"0 -12px 60px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.06) inset"}}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
        </div>
        {/* Current state */}
        <div style={{marginBottom:4}}>
          <div style={{fontSize:9,color:C.t3,letterSpacing:"0.15em",textTransform:"uppercase",marginBottom:4}}>Estado actual</div>
          <div style={{fontSize:13,fontWeight:700,color:meta.dot||C.t2}}>{meta.label||tkt.status}</div>
          <div style={{fontSize:11,color:C.t3,marginTop:2,marginBottom:16}}>{tkt.titulo}</div>
        </div>
        {/* Cancel picker */}
        {showCancelPicker ? (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:9,color:C.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>
              Motivo de cancelación:
            </div>
            {MOTIVOS_CANCEL.map(m=>(
              <button key={m} onClick={()=>setCancelMotivo(m)}
                style={{padding:"12px 16px",borderRadius:12,cursor:"pointer",textAlign:"left",
                  background:cancelMotivo===m?`${C.red}22`:C.bg2,
                  border:`1px solid ${cancelMotivo===m?C.red:C.border}`,
                  fontSize:13,fontWeight:cancelMotivo===m?700:500,color:cancelMotivo===m?C.red:C.t1}}>
                {m}
              </button>
            ))}
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={()=>{setShowCancelPicker(false);setCancelMotivo(null);}}
                style={{flex:1,padding:"12px",borderRadius:12,background:"transparent",
                  border:`1px solid ${C.border}`,color:C.t2,fontSize:13,cursor:"pointer",fontWeight:600}}>
                Atrás
              </button>
              <button onClick={()=>{
                if(!cancelMotivo) return;
                dispatch({type:"TKT_STATUS",id:tkt.id,to:"cancelado",cancelReason:cancelMotivo});
                toast(`Cancelado · ${cancelMotivo}`,"success");
                onClose();
              }}
                disabled={!cancelMotivo}
                style={{flex:1,padding:"12px",borderRadius:12,cursor:cancelMotivo?"pointer":"not-allowed",
                  background:cancelMotivo?`${C.red}22`:"transparent",
                  border:`1px solid ${cancelMotivo?C.red:C.border}`,
                  color:cancelMotivo?C.red:C.t3,fontSize:13,fontWeight:700}}>
                Confirmar
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Transitions */}
            {nexts.length===0?(
              <div style={{textAlign:"center",padding:"16px 0",color:C.t3,fontSize:13}}>
                Ticket en estado final — sin transiciones disponibles
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div style={{fontSize:9,color:C.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>
                  Mover a:
                </div>
                {nexts.map(to=>{
                  const m=TICKET_META[to]||{};
                  const isCancel=to==="cancelado";
                  return (
                    <button key={to} onClick={()=>{
                      if(isCancel){ setShowCancelPicker(true); return; }
                      dispatch({type:"TKT_STATUS",id:tkt.id,to});
                      toast(`${meta.label||tkt.status} → ${m.label||to}`,"success");
                      onClose();
                    }}
                      style={{padding:"14px 18px",borderRadius:14,cursor:"pointer",
                        background:isCancel?C.redDim:C.bg2,
                        border:`1px solid ${isCancel?C.red+"50":m.dot||C.border}`,
                        display:"flex",alignItems:"center",gap:12,textAlign:"left"}}>
                      <div style={{width:10,height:10,borderRadius:5,background:m.dot||C.border,flexShrink:0}}/>
                      <div>
                        <div style={{fontSize:14,fontWeight:700,color:isCancel?C.red:C.t1}}>{m.label||to}</div>
                        {to==="cancelado"&&<div style={{fontSize:10,color:C.red,marginTop:1}}>Esta acción no se puede deshacer</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={onClose}
              style={{marginTop:16,width:"100%",padding:"12px",borderRadius:12,
                background:"transparent",border:`1px solid ${C.border}`,
                color:C.t2,fontSize:13,cursor:"pointer",fontWeight:600}}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </>
  );
}

// ── MEditSheet — bottom sheet para editar ticket en mobile ────────────────────
function MEditSheet({ticket, state, dispatch, toast, onClose}) {
  const C = React.useContext(ThemeCtx);
  const A = makeA(C);

  const snap0 = ticket.snap || {};
  const [titulo,    setTitulo]    = useState(ticket.titulo || "");
  const [costoIVA,  setCostoIVA]  = useState(String(safeNumber(snap0.costoTotal + (snap0.ivaAcred||0)) || 0));
  const [precioIVA, setPrecioIVA] = useState(String(safeNumber(snap0.precioConIVA) || 0));
  const [notes,     setNotes]     = useState(ticket.notes || "");
  const [priority,  setPriority]  = useState(ticket.priority || "P3");

  const iva = safeNumber(snap0.params?.iva, 16);
  const isr = safeNumber(snap0.params?.isr, 20);

  const preview = useMemo(()=>{
    const costo = safeNumber(costoIVA);
    const precio = safeNumber(precioIVA);
    if (!costo && !precio) return null;
    return computeSnap({
      costo, compraConIVA: true,
      manualPrice: precio, ventaConIVA: true, mode: "manual",
      gasolina: 0, otros: 0, iva, isr,
    });
  }, [costoIVA, precioIVA, iva, isr]);

  const handleSave = () => {
    const newSnap = computeSnap({
      costo: safeNumber(costoIVA), compraConIVA: true,
      manualPrice: safeNumber(precioIVA), ventaConIVA: true, mode: "manual",
      gasolina: 0, otros: 0, iva, isr,
    });
    dispatch({type:"TKT_UPDATE", id: ticket.id, patch:{
      titulo: titulo.trim() || ticket.titulo,
      notes, priority, snap: newSnap,
    }});
    toast("Ticket actualizado","success");
    onClose();
  };

  const inputStyle = {
    width:"100%", boxSizing:"border-box",
    background:C.bg2, border:`1px solid ${C.border}`,
    borderRadius:12, padding:"12px 14px",
    color:C.t1, fontSize:14, outline:"none",
    fontFamily:"inherit",
  };
  const labelStyle = {fontSize:9, color:A.t3, letterSpacing:"0.13em", textTransform:"uppercase", marginBottom:5, display:"block"};

  return (
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.55)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)"}}/>
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:201,
        background:"rgba(14,16,20,0.97)",backdropFilter:"blur(32px) saturate(1.8)",WebkitBackdropFilter:"blur(32px) saturate(1.8)",
        borderRadius:"28px 28px 0 0",borderTop:`1px solid rgba(255,255,255,0.10)`,
        padding:`16px 16px calc(20px + env(safe-area-inset-bottom,0px))`,
        boxShadow:"0 -12px 60px rgba(0,0,0,0.7)",
        maxHeight:"90vh",overflowY:"auto"}}>
        {/* Handle */}
        <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
        </div>
        <div style={{fontSize:11,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:14}}>Editar ticket</div>

        {/* Título */}
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Título</label>
          <input value={titulo} onChange={e=>setTitulo(e.target.value)} style={inputStyle} placeholder="Descripción del trabajo"/>
        </div>

        {/* Costo / Precio */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div>
            <label style={labelStyle}>Costo c/IVA ($)</label>
            <input type="number" inputMode="decimal" value={costoIVA} onChange={e=>setCostoIVA(e.target.value)} style={inputStyle} placeholder="0"/>
          </div>
          <div>
            <label style={labelStyle}>Precio c/IVA ($)</label>
            <input type="number" inputMode="decimal" value={precioIVA} onChange={e=>setPrecioIVA(e.target.value)} style={inputStyle} placeholder="0"/>
          </div>
        </div>

        {/* Live preview */}
        {preview&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:14,
            background:C.bg2,borderRadius:12,padding:"10px 14px",border:`1px solid ${C.border}`}}>
            {[
              {l:"Util. neta",  v:mxn(preview.uNeta),              c:preview.uNeta>=0?A.lime:A.red},
              {l:"Margen",      v:fpct(preview.margenNetoPrecio),   c:preview.margenNetoPrecio>=15?A.lime:A.amber},
              {l:"Costo base",  v:mxn(preview.costoBase),          c:A.t2},
            ].map(({l,v,c})=>(
              <div key={l}>
                <div style={{fontSize:8,color:A.t3,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:3}}>{l}</div>
                <div style={{fontSize:13,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Notas */}
        <div style={{marginBottom:14}}>
          <label style={labelStyle}>Notas</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)}
            rows={2} style={{...inputStyle, resize:"none"}} placeholder="Observaciones internas"/>
        </div>

        {/* Prioridad */}
        <div style={{marginBottom:18}}>
          <label style={labelStyle}>Prioridad</label>
          <div style={{display:"flex",gap:6}}>
            {["P1","P2","P3","P4"].map(p=>{
              const active = priority===p;
              const colors = {P1:C.p1,P2:C.p2,P3:C.p3,P4:C.p4};
              const col = colors[p]||C.border;
              return (
                <button key={p} onClick={()=>setPriority(p)}
                  style={{flex:1,padding:"9px 0",borderRadius:10,
                    background:active?`${col}22`:"transparent",
                    border:`1px solid ${active?col:C.border}`,
                    color:active?col:A.t3,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{display:"flex",gap:8}}>
          <button onClick={onClose}
            style={{flex:1,padding:"13px",borderRadius:14,background:"transparent",
              border:`1px solid ${C.border}`,color:A.t2,fontSize:13,cursor:"pointer",fontWeight:600}}>
            Cancelar
          </button>
          <button onClick={handleSave}
            style={{flex:2,padding:"13px",borderRadius:14,
              background:"linear-gradient(135deg,rgba(60,207,170,0.25),rgba(60,207,170,0.12))",
              border:"1px solid rgba(60,207,170,0.4)",color:A.mint,
              fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:"0.04em"}}>
            Guardar cambios
          </button>
        </div>
      </div>
    </>
  );
}

// ── MPipeline — Pipeline móvil ───────────────────────────────────────────────
function MPipeline({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {tickets,clients,units} = state;
  const [filter,setFilter]       = useState("active");
  const [sortBy,setSortBy]       = useState("priority");
  const [search,setSearch]       = useState("");
  const [statusSheet,setStatusSheet] = useState(null);
  const [editSheet,setEditSheet]  = useState(null);
  const [expandId,setExpandId]   = useState(null);

  // Accent palette — glassmorphism
  const A = makeA(C);

  const PIPE_STAGES = ["recibido","validando","sourcing","cotizado","autorizado","comprado","transito","entregado","facturado","cobrado","cerrado"];
  const stageProgress = s => { if(s==="cancelado") return 0; const i=PIPE_STAGES.indexOf(s); return i>=0?((i+1)/PIPE_STAGES.length)*100:0; };
  const progColor = s => { const i=PIPE_STAGES.indexOf(s); return i<=1?A.amber:i<=4?A.mint:A.lime; };

  const prC = {
    P1:{dot:C.p1, dim:C.p1dim},
    P2:{dot:C.p2, dim:C.p2dim},
    P3:{dot:C.p3, dim:C.p3dim},
    P4:{dot:C.p4, dim:C.p4dim},
  };

  const active   = useMemo(()=>tickets.filter(t=>!t._deleted),[tickets]);
  const filtered = useMemo(()=>{
    let arr=active;
    if(filter==="active")   arr=arr.filter(t=>!CLOSED_SET.has(t.status));
    else if(filter==="p1")  arr=arr.filter(t=>t.priority==="P1"&&!CLOSED_SET.has(t.status));
    else if(filter==="venc") arr=arr.filter(t=>{
      if(!t.promesaPago||t.cobrado) return false;
      const d=parseDateMX(t.promesaPago); return d&&new Date()>d;
    });
    else if(filter!=="all") arr=arr.filter(t=>t.status===filter);
    if(search.trim()){
      const lq=search.toLowerCase();
      arr=arr.filter(t=>
        (t.titulo||"").toLowerCase().includes(lq)||
        (t.id||"").toLowerCase().includes(lq)||
        clients.find(c=>c.id===t.clientId)?.empresa?.toLowerCase().includes(lq)||
        units.find(u=>u.id===t.unitId)?.economico?.toLowerCase().includes(lq)
      );
    }
    const pOrd={P1:0,P2:1,P3:2,P4:3};
    const sOrd=["recibido","validando","sourcing","cotizado","autorizado","comprado","transito","entregado","facturado","cobrado","cerrado","cancelado"];
    return [...arr].sort((a,b)=>{
      if(sortBy==="status")  return sOrd.indexOf(a.status)-sOrd.indexOf(b.status);
      if(sortBy==="cartera") return (b.snap?.precioConIVA||0)-(a.snap?.precioConIVA||0);
      if(sortBy==="date")    return b.date.localeCompare(a.date);
      const pd=(pOrd[a.priority]??3)-(pOrd[b.priority]??3);
      return pd!==0?pd:b.date.localeCompare(a.date);
    });
  },[active,filter,sortBy,search,clients,units]);

  const SORT_OPTS=[["priority","↕ Prioridad"],["date","↕ Fecha"],["cartera","↕ Monto"],["status","↕ Estado"]];
  const sortLabel = SORT_OPTS.find(s=>s[0]===sortBy)?.[1] ?? "↕";

  const cntOf = st => active.filter(t=>t.status===st).length;
  const CHIPS=[
    ["active","Activos", active.filter(t=>!CLOSED_SET.has(t.status)).length, null],
    ["p1",   "P1 🔴",   active.filter(t=>t.priority==="P1"&&!CLOSED_SET.has(t.status)).length, C.p1],
    ["venc", "Vencidos",active.filter(t=>{if(!t.promesaPago||t.cobrado)return false;const d=parseDateMX(t.promesaPago);return d&&new Date()>d;}).length, "#e07c00"],
    ["entregado","Entregado",cntOf("entregado"), A.mint],
    ["facturado","Facturado",cntOf("facturado"), A.cyan],
    ["cobrado",  "Cobrado",  cntOf("cobrado"),   A.lime],
    ["cerrado",  "Cerrado",  cntOf("cerrado"),   A.t2],
    ["cancelado","Cancelado",cntOf("cancelado"),  C.red],
    ["all",      "Todos",    active.length, null],
  ];

  return (
    <div style={{minHeight:"100vh",background:"transparent",paddingBottom:40}}>
      {statusSheet&&<StatusFlowSheet tkt={statusSheet} dispatch={dispatch} toast={toast} onClose={()=>setStatusSheet(null)}/>}
      {editSheet&&<MEditSheet ticket={editSheet} state={state} dispatch={dispatch} toast={toast} onClose={()=>setEditSheet(null)}/>}

      <div style={{padding:"0 14px"}}>
        {/* Filter + sort — single row */}
        <div style={{display:"flex",alignItems:"center",gap:6,padding:"18px 0 14px",overflowX:"auto",scrollbarWidth:"none",msOverflowStyle:"none"}}>
          {CHIPS.map(([v,l,c,ac])=>{
            const on=filter===v;
            const dotColor=ac||(on?A.lime:null);
            return (
              <button key={v} onClick={()=>setFilter(v)}
                style={{
                  flexShrink:0,display:"flex",alignItems:"center",gap:5,
                  padding:"7px 13px",borderRadius:20,fontSize:11,fontWeight:700,whiteSpace:"nowrap",
                  background:on?(ac?ac+"22":A.limeDim):"transparent",
                  border:`1px solid ${on?(ac||A.lime):A.pillBorderInactive}`,
                  color:on?(ac||A.lime):A.t3,
                  cursor:"pointer",transition:"all 0.15s",
                }}>
                {l}
                {c>0&&<span style={{
                  fontSize:9,fontWeight:800,borderRadius:9,padding:"1px 5px",
                  background:on?(ac?ac+"33":A.limeDim):C.bg3,
                  color:on?(ac||A.lime):A.t3,
                  border:`1px solid ${on?(ac||A.lime)+"50":A.pillBorderInactive}`,
                }}>{c}</span>}
              </button>
            );
          })}
          {/* Sort toggle — at end */}
          <button onClick={()=>{
            const idx=SORT_OPTS.findIndex(s=>s[0]===sortBy);
            setSortBy(SORT_OPTS[(idx+1)%SORT_OPTS.length][0]);
          }} style={{
            flexShrink:0,padding:"7px 11px",borderRadius:20,fontSize:10,fontWeight:700,
            background:"transparent",border:`1px solid ${A.pillBorderInactive}`,
            color:A.t3,cursor:"pointer",whiteSpace:"nowrap",transition:"all 0.15s",
          }}>{sortLabel}</button>
        </div>

        {/* Buscador */}
        <input
          value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar por título, ID, cliente, eco..."
          style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,
            border:`1px solid ${search?A.cyan:C.border}`,borderRadius:12,
            padding:"12px 16px",color:A.t1,fontSize:15,outline:"none",marginBottom:12,
            boxSizing:"border-box",fontFamily:"inherit",transition:"border-color .2s"}}/>

        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:11,color:A.t3,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>
              Sin tickets
            </div>
            <div style={{fontSize:13,color:A.t3}}>{search?"Sin resultados para «"+search+"»":"Ajusta el filtro"}</div>
          </div>
        )}

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {filtered.map(t=>{
            const meta     = TICKET_META[t.status]||{};
            const pr       = prC[t.priority]||prC.P4;
            const cl       = clients.find(c=>c.id===t.clientId);
            const un       = units.find(u=>u.id===t.unitId);
            const prog     = stageProgress(t.status);
            const pCol     = progColor(t.status);
            const isClosed = CLOSED_SET.has(t.status);
            const isP1     = t.priority==="P1";
            const isVenc   = !t.cobrado&&t.promesaPago&&(()=>{const d=parseDateMX(t.promesaPago);return d&&new Date()>d;})();
            const isExp    = expandId===t.id;
            const price    = safeNumber(t.snap?.precioConIVA);
            const uNeta    = safeNumber(t.snap?.uNeta);

            return (
              <div key={t.id} style={{
                background:isP1?"rgba(239,68,68,0.08)":A.card,
                borderRadius:A.r,overflow:"hidden",
                boxShadow:isP1
                  ? "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(239,68,68,0.15)"
                  : A.shadow,
              }}>
                {/* Tap area */}
                <div onClick={()=>setExpandId(isExp?null:t.id)} style={{padding:"16px 16px 14px",cursor:"pointer"}}>
                  {/* Row 1: badges + date */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"nowrap"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:4,
                        fontSize:9,fontWeight:800,padding:"3px 8px",borderRadius:10,
                        background:pr.dim,color:pr.dot,letterSpacing:"0.08em"}}>
                        <span style={{width:5,height:5,borderRadius:"50%",background:pr.dot,
                          boxShadow:isP1?`0 0 6px ${pr.dot}`:"none",display:"inline-block",flexShrink:0}}/>
                        {t.priority}
                      </span>
                      <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:10,
                        background:`${meta.dot||"#8A9AA4"}18`,color:meta.dot||A.t3,letterSpacing:"0.05em"}}>
                        {meta.label||t.status}
                      </span>
                      {isVenc&&<span style={{fontSize:9,fontWeight:800,padding:"3px 7px",borderRadius:10,
                        background:A.redDim,color:A.red,letterSpacing:"0.06em"}}>VENCIDO</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                      <span style={{fontSize:10,color:A.t3}}>{t.date}</span>
                      <span style={{fontSize:14,color:A.t3,transform:isExp?"rotate(90deg)":"none",
                        transition:"transform 200ms",display:"inline-block",lineHeight:1}}>›</span>
                    </div>
                  </div>
                  {/* Title */}
                  <div style={{fontSize:15,fontWeight:700,color:A.t1,lineHeight:1.3,marginBottom:6}}>{t.titulo}</div>
                  {/* Client + unit */}
                  {(cl||un)&&(
                    <div style={{fontSize:11,color:A.t2,marginBottom:10,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {cl&&<span>{cl.empresa}</span>}
                      {cl&&un&&<span style={{color:A.t3,margin:"0 4px"}}>·</span>}
                      {un&&<span style={{color:A.t3}}>{un.economico?"Eco. "+un.economico:un.marca+" "+un.modelo}</span>}
                    </div>
                  )}
                  {/* Progress */}
                  {!isClosed&&(
                    <div>
                      <div style={{height:2,background:C.border,borderRadius:2,overflow:"hidden",marginBottom:4}}>
                        <div style={{height:"100%",width:`${prog}%`,background:pCol,borderRadius:2,transition:"width 400ms ease"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between"}}>
                        <span style={{fontSize:8,color:A.t3}}>Etapa {PIPE_STAGES.indexOf(t.status)+1}/{PIPE_STAGES.length}</span>
                        <span style={{fontSize:8,color:pCol,fontWeight:700}}>{prog.toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded */}
                {isExp&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:"16px",background:C.bg0}}>
                    {/* KPIs financieros */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                      {[
                        {l:"Precio c/IVA", v:mxn(price),    c:A.t1},
                        {l:"Util. neta",   v:mxn(uNeta),    c:uNeta>=0?A.lime:A.red},
                        {l:"Costo total",  v:mxn(safeNumber(t.snap?.costoTotal)), c:A.t2},
                        {l:"Margen",       v:fpct(safeNumber(t.snap?.margenNetoPrecio)), c:A.t2},
                      ].map(({l,v,c})=>(
                        <div key={l}>
                          <div style={{fontSize:8,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>{l}</div>
                          <div style={{fontSize:16,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    {t.notes&&<div style={{fontSize:11,color:A.t2,padding:"10px 12px",background:C._dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",
                      borderRadius:10,marginBottom:12,border:`1px solid ${C.border}`}}>{t.notes}</div>}

                    {/* Timeline completo */}
                    {(t.timeline||[]).length > 0 && (
                      <div style={{marginBottom:14,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
                        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{fontSize:9,fontWeight:700,color:A.t3,letterSpacing:"0.14em",textTransform:"uppercase"}}>Timeline · {(t.timeline||[]).length} eventos</span>
                          {!CLOSED_SET.has(t.status)&&t.status!=="cancelado"&&(
                            <span style={{fontSize:9,fontWeight:700,color:A.lime,background:`${A.lime}15`,border:`1px solid ${A.lime}33`,borderRadius:6,padding:"2px 7px"}}>EN CURSO</span>
                          )}
                        </div>
                        <Timeline events={t.timeline||[]} active={!CLOSED_SET.has(t.status)&&t.status!=="cancelado"} mobile/>
                      </div>
                    )}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:8,color:A.t3,letterSpacing:"0.08em",textTransform:"uppercase"}}>{t.id}</div>
                      <div style={{display:"flex",gap:7}}>
                        <button onClick={e=>{e.stopPropagation();setEditSheet(t);}}
                          style={{padding:"7px 14px",borderRadius:10,
                            background:"rgba(60,207,170,0.10)",
                            border:"1px solid rgba(60,207,170,0.3)",
                            color:A.mint,fontSize:10,fontWeight:700,
                            cursor:"pointer",letterSpacing:"0.06em"}}>
                          Editar ✎
                        </button>
                        <button onClick={e=>{e.stopPropagation();
                          const c2=clients.find(c=>c.id===t.clientId);
                          const u2=units.find(u=>u.id===t.unitId);
                          generarCotizacionPDF(t,c2,u2,null).catch(()=>toast("Error PDF","error"));}}
                          style={{padding:"7px 14px",borderRadius:10,background:"transparent",
                            border:`1px solid ${C.border}`,color:A.t2,fontSize:10,
                            fontWeight:600,cursor:"pointer",letterSpacing:"0.06em"}}>
                          COT ↗
                        </button>
                        <button onClick={e=>{e.stopPropagation();
                          const c2=clients.find(c=>c.id===t.clientId);
                          const u2=units.find(u=>u.id===t.unitId);
                          generarActaRecepcionPDF(t,c2,u2);}}
                          style={{padding:"7px 14px",borderRadius:10,background:"transparent",
                            border:`1px solid ${C.border}`,color:A.t2,fontSize:10,
                            fontWeight:600,cursor:"pointer",letterSpacing:"0.06em"}}>
                          Acta ↗
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:22,fontWeight:800,color:A.t1,lineHeight:1,
                      letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums"}}>{mxn(price)}</div>
                    <div style={{fontSize:10,color:uNeta>=0?A.lime:A.red,marginTop:3,fontWeight:600}}>
                      Util. {mxn(uNeta)}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {CARTERA_SET.has(t.status)&&t.payType==="credit"&&!t.cobrado&&(
                      <button onClick={e=>{e.stopPropagation();dispatch({type:"TKT_COBRADO",id:t.id});toast("Cobrado ✓","success");}}
                        style={{padding:"10px 14px",borderRadius:12,background:A.mintDim,
                          border:`1px solid ${C.blue}33`,color:A.mint,
                          fontSize:11,fontWeight:800,cursor:"pointer",letterSpacing:"0.03em",
                          WebkitTapHighlightColor:"transparent"}}>
                        Cobrar ✓
                      </button>
                    )}
                    {!isClosed&&(
                      <button onClick={e=>{e.stopPropagation();setStatusSheet(t);}}
                        style={{padding:"10px 18px",borderRadius:12,
                          background:isP1?"rgba(232,72,72,0.15)":A.limeDim,
                          border:`1px solid ${isP1?"rgba(214,66,66,0.3)":"rgba(255,255,255,0.09)"}`,
                          color:isP1?A.red:A.lime,fontSize:12,fontWeight:700,cursor:"pointer",
                          letterSpacing:"0.04em",WebkitTapHighlightColor:"transparent"}}>
                        Estado →
                      </button>
                    )}
                    {isClosed&&(
                      <div style={{padding:"8px 14px",borderRadius:12,
                        background:t.status==="cancelado"?A.redDim:A.mintDim,
                        border:`1px solid ${t.status==="cancelado"?"rgba(232,72,72,0.25)":"rgba(60,207,170,0.25)"}`}}>
                        <div style={{fontSize:11,fontWeight:700,
                          color:t.status==="cancelado"?A.red:A.mint}}>
                          {t.status==="cancelado"?"Cancelado":t.cobrado?"Cobrado ✓":"Cerrado"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MCotizador — Flujo unificado mobile ────────────────────────────────────────
// ── PartPicker — Autocomplete inteligente del catálogo ──────────────────────
function PartPicker({parts, value, onChange, onSelect, placeholder, mobile}) {
  const C = React.useContext(ThemeCtx);
  const [open, setOpen] = useState(false);
  const ref  = useRef();

  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target)){setOpen(false);}};
    document.addEventListener("mousedown",h);
    document.addEventListener("touchstart",h,{passive:true});
    return()=>{document.removeEventListener("mousedown",h);document.removeEventListener("touchstart",h);};
  },[]);

  const results = useMemo(()=>{
    const q=(value||"").toLowerCase().trim();
    if(!q||q.length<1){
      // Show most frequent / recently used
      return [...parts].sort((a,b)=>(b.frecuencia||0)-(a.frecuencia||0)).slice(0,8);
    }
    return parts.filter(p=>
      safeLower(p.nombre).includes(q)||
      safeLower(p.oem||"").includes(q)||
      safeLower(p.aftermarket||"").includes(q)||
      safeLower(p.aplicacion||"").includes(q)
    ).slice(0,10);
  },[value,parts]);

  const showDropdown = open && (results.length>0 || (value||"").trim().length>0);

  return (
    <div ref={ref} style={{position:"relative",flex:1}}>
      <input
        value={value||""}
        onChange={e=>{onChange(e.target.value);setOpen(true);}}
        onFocus={()=>setOpen(true)}
        placeholder={placeholder||"Buscar o describir pieza..."}
        autoComplete="off"
        style={{width:"100%",background:C.bg2,border:`1px solid ${open?C.t1:C.border}`,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,
          borderRadius:10,padding:"13px 14px",color:"#F5F5F7",fontSize:16,
          outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}
      />
      {showDropdown&&(
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:400,
          background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:10,
          boxShadow:"0 8px 32px rgba(13,24,37,0.12)",maxHeight:280,overflowY:"auto",
          WebkitOverflowScrolling:"touch"}}>
          {results.map(p=>(
            <div key={p.id}
              onMouseDown={e=>{e.preventDefault();onSelect(p);setOpen(false);}}
              onTouchEnd={e=>{e.preventDefault();onSelect(p);setOpen(false);}}
              style={{padding:"11px 14px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",
                display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:"#F5F5F7",overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                <div style={{fontSize:10,color:"#7E848E",marginTop:1,fontFamily:"'Courier New',monospace"}}>
                  {p.oem&&<span>OEM: {p.oem}</span>}
                  {p.oem&&p.ultimoPrecio>0&&<span style={{color:C.border}}> · </span>}
                  {p.ultimoPrecio>0&&<span style={{color:C.yellow}}>{mxn(p.ultimoPrecio)}</span>}
                  {p.proveedor&&<span style={{color:C.border}}> · </span>}
                  {p.proveedor&&<span>{p.proveedor}</span>}
                </div>
                {p.aplicacion&&<div style={{fontSize:9,color:C.t3,marginTop:1}}>{p.aplicacion}</div>}
              </div>
              {(p.frecuencia||0)>1&&(
                <div style={{fontSize:9,color:"#F5F5F7",background:C.border,padding:"2px 7px",
                  borderRadius:10,flexShrink:0,fontWeight:700}}>×{p.frecuencia}</div>
              )}
            </div>
          ))}
          {(value||"").trim().length>2&&(
            <div onMouseDown={e=>{e.preventDefault();onSelect({nombre:(value||"").trim(),oem:"",ultimoPrecio:0});setOpen(false);}}
              onTouchEnd={e=>{e.preventDefault();onSelect({nombre:(value||"").trim(),oem:"",ultimoPrecio:0});setOpen(false);}}
              style={{padding:"11px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18,color:"#F5F5F7",lineHeight:1}}>＋</span>
              <span style={{fontSize:13,color:"#F5F5F7",fontWeight:600}}>Agregar "{(value||"").trim().slice(0,30)}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MCotizador — Flujo unificado mobile ──────────────────────────────────────
function MCotizador({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {clients,suppliers,units} = state;

  // Accent palette — Black/white monochrome
  const A = makeA(C);

  // Priority semantic colors
  const prColors = {
    P1:{dot:C.p1, dim:C.p1dim, label:"Unidad detenida"},
    P2:{dot:C.p2, dim:C.p2dim, label:"Operación comprometida"},
    P3:{dot:C.p3, dim:C.p3dim, label:"Preventivo urgente"},
    P4:{dot:C.p4, dim:C.p4dim, label:"Solicitud normal"},
  };

  const [step,setStep]          = useState(0);
  const [priority,setPriority]  = useState("P3");
  const [opType,setOpType]      = useState("consumable");
  const [activeMods,setActiveMods] = useState([]);
  const [iva]                   = useState(16);
  const [isr]                   = useState(20);
  const [lineas,setLineas]      = useState([emptyLine("consumable","P3",[])]);
  const [partQ,setPartQ]        = useState({});
  const [clientId,setClientId]  = useState("");
  const [unitId,setUnitId]      = useState("");
  const [supplierId,setSupplierId] = useState("");
  const [payType,setPayType]    = useState("contado");
  const [promesa,setPromesa]    = useState("");
  const [fecha,setFecha]        = useState(todayMX());
  const [notes,setNotes]        = useState("");
  const [pdfPending,setPdfPending] = useState(null);
  const [kitMode,setKitMode]       = useState(false);
  const [kitTitle,setKitTitle]     = useState("");

  const sharedMargin = useMemo(()=>effectiveMargin(opType,priority,activeMods,false,27),[opType,priority,activeMods]);
  const lineSnaps = useMemo(()=>lineas.map(l=>{
    const mg=l.customMgn?Math.min(l.customVal,100):sharedMargin;
    const costo=(l.costoUnit||0)*(l.qty||1);
    return computeSnap({costo,gasolina:l.gasolina||0,otros:l.otros||0,iva,isr,
      compraConIVA:true,ventaConIVA:true,mode:l.mode||"auto",margin:mg,manualPrice:l.manualPrice||"0"});
  }),[lineas,sharedMargin,iva,isr]);

  const totalPrecio = lineSnaps.reduce((s,sn)=>s+sn.precioConIVA,0);
  const totalNeta   = lineSnaps.reduce((s,sn)=>s+sn.uNeta,0);
  const aggMargen   = lineSnaps.reduce((s,sn)=>s+sn.precioSinIVA,0)>0
    ?(totalNeta/lineSnaps.reduce((s,sn)=>s+sn.precioSinIVA,0))*100:0;

  const upd = (i,patch)=>setLineas(p=>p.map((l,j)=>j===i?{...l,...patch}:l));
  const addLine = ()=>setLineas(p=>[...p,emptyLine(opType,priority,[])]);
  const removeLine = i=>setLineas(p=>p.length>1?p.filter((_,j)=>j!==i):p);
  const selectPart = (i,p) => {
    setPartQ(q=>{const nq={...q};delete nq[i];return nq;}); // remove key → falls back to l.titulo
    upd(i,{titulo:p.nombre,partRef:p.oem||"",costoUnit:p.ultimoPrecio||0,manualPrice:String(p.ultimoPrecio||0)});
  };

  const cl   = clients.find(c=>c.id===clientId);
  const un   = units.find(u=>u.id===unitId);
  const supp = suppliers.find(s=>s.id===supplierId);

  const save = ()=>{
    if(!lineas.some(l=>l.titulo?.trim())) { toast("Agrega al menos una descripción","error"); return; }
    if(kitMode&&!kitTitle.trim()) { toast("Escribe el nombre del kit","error"); return; }
    const titulo=kitMode&&kitTitle.trim()
      ? kitTitle.trim()
      : lineas.map(l=>l.titulo.trim()||"Sin descripción").join(" / ");
    const lineasConSnap=lineas.map((l,i)=>{
      const sn=lineSnaps[i];
      const qty=safeNumber(l.qty,1)||1;
      return {
        titulo:l.titulo||"Sin descripción",partRef:l.partRef||"",
        qty,
        costoUnit:safeNumber(l.costoUnit),
        gasolina:safeNumber(l.gasolina),otros:safeNumber(l.otros),
        mode:l.mode||"auto",manualPrice:l.manualPrice||"0",
        customMgn:!!l.customMgn,customVal:safeNumber(l.customVal,27),
        descripcionPDF:l.descripcionPDF||"",
        // Explicit totals prevent double-multiplication in resolveLineFinancials
        lineTotal:sn.precioConIVA,
        lineTotalSinIVA:sn.precioSinIVA,
        unitPrice:qty>1?sn.precioConIVA/qty:sn.precioConIVA,
        unitSinIVA:qty>1?sn.precioSinIVA/qty:sn.precioSinIVA,
        snap:sn,
      };
    });
    const pSin=lineSnaps.reduce((s,sn)=>s+sn.precioSinIVA,0);
    const cTot=lineSnaps.reduce((s,sn)=>s+sn.costoTotal,0);
    const totalSnap={
      precioConIVA:totalPrecio,precioSinIVA:pSin,costoTotal:cTot,
      costoBase:lineSnaps.reduce((s,sn)=>s+sn.costoBase,0),
      gastos:lineSnaps.reduce((s,sn)=>s+sn.gastos,0),
      uNeta:totalNeta,uBruta:lineSnaps.reduce((s,sn)=>s+sn.uBruta,0),
      isr:lineSnaps.reduce((s,sn)=>s+sn.isr,0),
      ivaTraslad:lineSnaps.reduce((s,sn)=>s+sn.ivaTraslad,0),
      ivaAcred:lineSnaps.reduce((s,sn)=>s+sn.ivaAcred,0),
      ivaNeto:lineSnaps.reduce((s,sn)=>s+sn.ivaNeto,0),
      markupSobre:cTot>0?((pSin-cTot)/cTot)*100:0,
      margenNetoPrecio:aggMargen,params:{iva,isr},
    };
    const tkt={
      id:mkTicketId(fecha),titulo,
      opId:opType,opShort:(OP_TYPES.find(o=>o.id===opType)||OP_TYPES[0]).short,
      priority,clientId,supplierId,unitId,
      partRef:lineas.map(l=>l.partRef).filter(Boolean).join(", "),
      date:fecha,status:"recibido",payType,
      promesaPago:payType==="credit"?promesa:null,cobrado:false,
      mods:[...activeMods],prob:"high",horasOp:0,notes,
      mode:"multilinea",lineas:lineasConSnap,snap:totalSnap,kitMode,
      timeline:[{ts:nowISO(),evento:"Ticket creado",actor:"Operador"}],
      history:[mkEvent("created",{titulo,status:"recibido",priority})],
    };
    dispatch({type:"TKT_ADD",t:tkt});
    lineas.forEach(l=>{
      if(!l.titulo?.trim()) return;
      const nomNorm=(l.titulo||"").trim().toLowerCase();
      const oem=(l.partRef||"").trim();
      const exists=state.parts.find(p=>
        (oem&&(oem===p.oem||oem===p.aftermarket))||
        p.nombre.toLowerCase()===nomNorm||
        (nomNorm.length>6&&p.nombre.toLowerCase().startsWith(nomNorm.slice(0,Math.floor(nomNorm.length*0.75))))
      );
      if(!exists&&(safeNumber(l.costoUnit)>0||oem)){
        dispatch({type:"PART_ADD",p:{id:mkPartId(),nombre:l.titulo.trim(),oem,aftermarket:"",
          aplicacion:un?`${un.marca} ${un.modelo} ${un.anio||""}`.trim():"",
          notas:`Auto: ${todayMX()}`,proveedor:supp?.nombre||"",
          ultimoPrecio:safeNumber(l.costoUnit),ultimaFecha:fecha,frecuencia:1}});
      } else if(exists){
        const patch={frecuencia:(exists.frecuencia||1)+1};
        if(safeNumber(l.costoUnit)>0) patch.ultimoPrecio=safeNumber(l.costoUnit);
        if(fecha) patch.ultimaFecha=fecha;
        if(supp?.nombre) patch.proveedor=supp.nombre;
        dispatch({type:"PART_UPDATE",id:exists.id,patch});
      }
    });
    toast("Ticket: "+tkt.id,"success");
    setPdfPending({tkt,cl,un,supp});
    setLineas([emptyLine(opType,priority,[])]);
    setNotes(""); setPartQ({});
    setClientId(""); setUnitId(""); setSupplierId("");
    setPayType("contado"); setPromesa(""); setStep(0);
    setKitMode(false); setKitTitle("");
  };

  // ── Step bar ──────────────────────────────────────────────────────────────
  const stepNames=["Tipo","Líneas","Datos"];
  const StepBar=()=>(
    <div style={{display:"flex",alignItems:"center",padding:"18px 0 22px",gap:0}}>
      {stepNames.map((name,i)=>{
        const done=i<step; const curr=i===step;
        return (
          <React.Fragment key={i}>
            {i>0&&(
              <div style={{flex:1,height:2,
                background:done?A.lime:C.border,
                borderRadius:1,margin:"0 8px",marginTop:-14}}/>
            )}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,
              cursor:done?"pointer":"default"}}
              onClick={()=>done&&setStep(i)}>
              <div style={{
                width:30,height:30,borderRadius:15,
                background:done?A.lime:curr?"transparent":"transparent",
                border:`2px solid ${done?A.lime:curr?A.lime:C.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:800,
                color:done?"#0A1800":curr?A.lime:A.t3,
                transition:"all 0.2s",
              }}>
                {done?"✓":i+1}
              </div>
              <div style={{fontSize:9,fontWeight:curr||done?700:400,
                color:done?A.lime:curr?A.lime:A.t3,
                letterSpacing:"0.1em",textTransform:"uppercase"}}>
                {name}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  // ══ STEP 0 — Tipo / Prioridad / Modificadores ════════════════════════════════
  if(step===0) return (
    <div style={{minHeight:"100vh",background:"transparent",padding:"0 16px 32px"}}>
      {pdfPending&&<PDFConfirm {...pdfPending} onClose={()=>setPdfPending(null)}/>}
      <StepBar/>

      <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",marginBottom:12,textTransform:"uppercase",fontWeight:700}}>Prioridad</div>
      {Object.entries(prColors).map(([pid,pc])=>{
        const sel=priority===pid;
        const pr=PRIORITY[pid]||PRIORITY.P4;
        return (
          <div key={pid} onClick={()=>setPriority(pid)}
            style={{padding:"16px",borderRadius:16,marginBottom:8,cursor:"pointer",
              background:sel?pc.dim:A.card,
              boxShadow:sel?`0 2px 20px rgba(0,0,0,0.5), 0 0 0 1.5px ${pc.dot}`:A.shadowSm,
              display:"flex",alignItems:"center",gap:14,
              transition:"all 0.15s",WebkitTapHighlightColor:"transparent"}}>
            <div style={{width:10,height:10,borderRadius:"50%",
              background:sel?pc.dot:C.border,flexShrink:0,
              boxShadow:"none",transition:"all 0.15s"}}/>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:sel?pc.dot:A.t2,transition:"color 0.15s"}}>
                {pid} — {pc.label}
              </div>
            </div>
            {sel&&pr.marginBonus>0&&(
              <span style={{fontSize:10,color:pc.dot,fontWeight:700,
                background:`${pc.dot}18`,padding:"3px 10px",borderRadius:10,
                border:`1px solid ${pc.dot}30`}}>+{pr.marginBonus}% margen</span>
            )}
          </div>
        );
      })}

      <div style={{height:1,background:C.border,margin:"20px 0"}}/>

      <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",marginBottom:12,textTransform:"uppercase",fontWeight:700}}>Tipo de operación</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {OP_TYPES.map(op=>{
          const sel=opType===op.id;
          return (
            <div key={op.id} onClick={()=>setOpType(op.id)}
              style={{padding:"14px",borderRadius:14,cursor:"pointer",
                background:sel?A.limeDim:A.card,
                boxShadow:sel?`0 0 0 1.5px ${C.blue}`:A.shadowSm,
                WebkitTapHighlightColor:"transparent",transition:"all 0.15s"}}>
              <div style={{fontSize:13,fontWeight:700,color:sel?A.lime:A.t2,marginBottom:4}}>{op.label}</div>
              <div style={{fontSize:10,color:A.t3}}>{op.baseMin}–{op.baseMax}%</div>
            </div>
          );
        })}
      </div>

      <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",marginBottom:12,textTransform:"uppercase",fontWeight:700}}>Modificadores</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:22}}>
        {MODIFIERS.map(mod=>{
          const on=activeMods.includes(mod.id);
          return (
            <div key={mod.id}
              onClick={()=>setActiveMods(p=>p.includes(mod.id)?p.filter(x=>x!==mod.id):[...p,mod.id])}
              style={{padding:"14px",borderRadius:14,cursor:"pointer",
                background:on?A.limeDim:A.card,
                boxShadow:on?`0 0 0 1.5px ${C.blue}`:A.shadowSm,
                display:"flex",alignItems:"flex-start",gap:10,
                WebkitTapHighlightColor:"transparent",transition:"all 0.15s"}}>
              <div style={{width:8,height:8,borderRadius:"50%",marginTop:3,flexShrink:0,
                background:on?A.lime:C.border,
                boxShadow:on?"none":"none",transition:"all 0.15s"}}/>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:on?A.lime:A.t2,marginBottom:2}}>{mod.label}</div>
                <div style={{fontSize:10,color:on?A.lime:A.t3,fontWeight:on?700:400}}>+{mod.pct}%</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-card" style={{padding:"20px 22px",marginBottom:24}}>
        <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:10}}>Margen efectivo</div>
        <div style={{fontSize:46,fontWeight:800,color:A.lime,lineHeight:1,letterSpacing:"-0.02em",marginBottom:8}}>
          {fpct(sharedMargin)}
        </div>
        <div style={{fontSize:10,color:A.t3}}>
          {opType} · P{priority.slice(1)} · {activeMods.length>0?activeMods.join(", "):"sin modificadores"}
        </div>
      </div>

      <button onClick={()=>setStep(1)} style={{
        width:"100%",padding:"16px",borderRadius:16,
        background:A.limeFill,
        border:"none",color:C._dark?"#0A1F14":"#161616",fontSize:14,fontWeight:700,cursor:"pointer",
        letterSpacing:"0.02em",WebkitTapHighlightColor:"transparent",
      }}>
        Siguiente: Líneas →
      </button>
    </div>
  );

  // ══ STEP 1 — Líneas con PartPicker ══════════════════════════════════════════
  if(step===1) return (
    <div style={{minHeight:"100vh",background:"transparent",padding:"0 16px 32px"}}>
      <StepBar/>

      {lineas.map((l,i)=>{
        const sn=lineSnaps[i];
        const isManual=l.mode==="manual";
        return (
          <div key={i} className="glass-card" style={{overflow:"hidden",marginBottom:12}}>
            <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`,
              display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{fontSize:9,color:A.t3,fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase"}}>
                Línea {i+1}
              </div>
              {lineas.length>1&&(
                <button onClick={()=>removeLine(i)}
                  style={{background:"transparent",border:"none",color:A.red,
                    fontSize:18,cursor:"pointer",padding:"0 4px",lineHeight:1,
                    WebkitTapHighlightColor:"transparent"}}>×</button>
              )}
            </div>
            <div style={{padding:"16px"}}>
              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.14em",marginBottom:8,textTransform:"uppercase",fontWeight:700}}>
                Descripción / Pieza
              </div>
              <PartPicker
                parts={state.parts}
                value={partQ[i]!==undefined?partQ[i]:(l.titulo||"")}
                onChange={v=>{setPartQ(q=>({...q,[i]:v}));upd(i,{titulo:v});}}
                onSelect={p=>selectPart(i,p)}
                mobile
              />
              {l.partRef&&(
                <div style={{fontSize:10,color:A.t3,marginTop:6,marginBottom:10,letterSpacing:"0.04em"}}>
                  OEM: {l.partRef}
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"1fr 80px",gap:8,marginBottom:8}}>
                <MField label="Costo unitario (c/IVA)" value={String(l.costoUnit||"")}
                  type="number" suffix="$"
                  onChange={v=>upd(i,{costoUnit:safeNumber(v),manualPrice:String(safeNumber(v))})}/>
                <MField label="Cant." value={String(l.qty||1)} type="number"
                  onChange={v=>upd(i,{qty:Math.max(1,safeNumber(v,1))||1})}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <MField label="Gasolina / flete" value={String(l.gasolina||"")} type="number" suffix="$"
                  onChange={v=>upd(i,{gasolina:safeNumber(v)})}/>
                <MField label="Otros gastos" value={String(l.otros||"")} type="number" suffix="$"
                  onChange={v=>upd(i,{otros:safeNumber(v)})}/>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                {[["auto","Auto (margen)"],["manual","Precio fijo"]].map(([m,lbl])=>(
                  <button key={m} onClick={()=>upd(i,{mode:m})}
                    style={{flex:1,padding:"9px",borderRadius:10,fontSize:11,fontWeight:700,
                      border:`1.5px solid ${l.mode===m?"rgba(255,255,255,0.15)":C.border}`,
                      background:l.mode===m?A.limeDim:"transparent",
                      color:l.mode===m?A.lime:A.t3,cursor:"pointer",
                      transition:"all 0.15s",WebkitTapHighlightColor:"transparent"}}>
                    {lbl}
                  </button>
                ))}
              </div>
              {isManual?(
                <MField label="Precio al cliente (c/IVA)" value={l.manualPrice||""} type="number" suffix="$"
                  onChange={v=>upd(i,{manualPrice:v})} color={A.amber}/>
              ):(
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <button onClick={()=>upd(i,{customMgn:!l.customMgn})}
                    style={{padding:"9px 14px",borderRadius:10,fontSize:10,fontWeight:700,flexShrink:0,
                      border:`1.5px solid ${l.customMgn?"rgba(255,255,255,0.15)":C.border}`,
                      background:l.customMgn?A.limeDim:"transparent",
                      color:l.customMgn?A.lime:A.t3,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                    Margen personalizado
                  </button>
                  {l.customMgn&&(
                    <MField label="" value={String(l.customVal||27)} type="number" suffix="%"
                      onChange={v=>upd(i,{customVal:safeNumber(v)})}/>
                  )}
                </div>
              )}
              <div style={{background:A.limeDim,borderRadius:12,padding:"12px 14px",
                display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,
                border:`1px solid ${C.border}`}}>
                {[
                  {label:"Precio línea",value:mxn(sn.precioConIVA),color:A.t1},
                  {label:"Util. neta",  value:mxn(sn.uNeta),       color:sn.uNeta>=0?A.lime:A.red},
                  {label:"Margen",      value:fpct(sn.margenNetoPrecio||0),
                    color:sn.margenNetoPrecio>=25?A.lime:sn.margenNetoPrecio>=15?A.mint:A.amber},
                ].map(({label,value,color})=>(
                  <div key={label}>
                    <div style={{fontSize:8,color:A.t3,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:4}}>{label}</div>
                    <div style={{fontSize:18,fontWeight:800,color,fontVariantNumeric:"tabular-nums"}}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={addLine} style={{
        width:"100%",padding:"14px",borderRadius:16,
        background:"transparent",border:`2px dashed ${C.border}`,
        color:A.t3,fontSize:13,fontWeight:700,cursor:"pointer",
        display:"flex",alignItems:"center",justifyContent:"center",gap:10,
        marginBottom:16,WebkitTapHighlightColor:"transparent",
      }}>
        <span style={{fontSize:22,color:A.lime,lineHeight:1,fontWeight:300}}>+</span>
        Agregar línea
      </button>

      {/* ── Agrupar como Kit ── */}
      {lineas.length>1&&(
        <div className="glass-card" style={{padding:"16px 18px",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:kitMode?12:0}}>
            <div>
              <div style={{fontSize:12,fontWeight:700,color:kitMode?A.lime:A.t1}}>Agrupar como kit</div>
              <div style={{fontSize:10,color:A.t3,marginTop:2}}>El PDF muestra un solo precio sin desglosar componentes</div>
            </div>
            <div onClick={()=>setKitMode(v=>!v)}
              style={{width:44,height:26,borderRadius:13,cursor:"pointer",flexShrink:0,
                background:kitMode?"rgba(143,227,190,0.3)":"rgba(255,255,255,0.07)",
                border:`1px solid ${kitMode?A.lime:C.border}`,
                position:"relative",transition:"background 0.2s"}}>
              <div style={{position:"absolute",top:3,
                left:kitMode?20:3,width:18,height:18,borderRadius:9,
                background:kitMode?A.lime:"rgba(255,255,255,0.3)",
                transition:"left 0.2s"}}/>
            </div>
          </div>
          {kitMode&&(
            <input
              value={kitTitle} onChange={e=>setKitTitle(e.target.value)}
              placeholder="Nombre del kit (ej. Kit eléctrico de protección...)"
              style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.04)",
                border:`1px solid ${A.lime}55`,borderRadius:10,padding:"11px 14px",
                color:A.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
          )}
        </div>
      )}

      <div className="glass-card" style={{padding:"20px 22px",marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div>
            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.14em",marginBottom:8,textTransform:"uppercase"}}>
              Total · {lineas.length} línea{lineas.length>1?"s":""}
            </div>
            <div style={{fontSize:40,fontWeight:800,color:A.t1,lineHeight:1,
              letterSpacing:"-0.025em",fontVariantNumeric:"tabular-nums"}}>
              {mxn(totalPrecio)}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:A.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.12em"}}>Util. neta</div>
            <div style={{fontSize:26,fontWeight:800,
              color:totalNeta>=0?A.lime:A.red,letterSpacing:"-0.02em",fontVariantNumeric:"tabular-nums"}}>
              {mxn(totalNeta)}
            </div>
            <div style={{fontSize:12,fontWeight:700,marginTop:4,
              color:aggMargen>=25?A.lime:aggMargen>=15?A.mint:A.amber}}>
              {fpct(aggMargen)}
            </div>
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setStep(0)}
          style={{padding:"14px 20px",borderRadius:14,background:"transparent",
            border:`1px solid ${C.border}`,color:A.t3,fontSize:12,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>
          ← Atrás
        </button>
        <button onClick={()=>setStep(2)} style={{
          flex:1,padding:"14px",borderRadius:14,
          background:A.limeFill,
          border:"none",color:C._dark?"#0A1F14":"#161616",fontSize:14,fontWeight:700,cursor:"pointer",
          WebkitTapHighlightColor:"transparent",
        }}>
          Siguiente: Datos →
        </button>
      </div>
    </div>
  );

  // ══ STEP 2 — Datos del ticket ════════════════════════════════════════════════
  return (
    <div style={{minHeight:"100vh",background:"transparent",padding:"0 16px 32px"}}>
      <StepBar/>

      <div className="glass-card" style={{overflow:"hidden",
        marginBottom:14}}>
        <div style={{padding:"18px 18px 6px"}}>
          <MField label="Fecha" value={fecha} onChange={setFecha} placeholder="DD/MM/AAAA"/>
          <ClientPicker   clients={clients}     value={clientId}    onChange={setClientId}   mobile/>
          <UnitPicker     units={units}          value={unitId}      onChange={setUnitId}     mobile/>
          <SupplierPicker suppliers={suppliers}  value={supplierId}  onChange={setSupplierId} mobile/>
          <MSel label="Pago" value={payType} onChange={setPayType}
            options={[{value:"contado",label:"Contado — sin seguimiento"},{value:"credit",label:"Crédito — genera cartera"}]}/>
          {payType==="credit"&&(
            <MField label="Promesa de pago" value={promesa} onChange={setPromesa}
              placeholder="DD/MM/AAAA" color={A.amber}/>
          )}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:9,color:A.t3,marginBottom:8,letterSpacing:"0.14em",
              textTransform:"uppercase",fontWeight:700}}>Notas</div>
            <textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Diagnóstico, observaciones..."
              style={{width:"100%",background:"rgba(255,255,255,0.03)",
                border:`1px solid ${C.border}`,borderRadius:12,
                padding:"12px 14px",color:A.t2,fontSize:13,outline:"none",
                boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
          </div>
        </div>
      </div>

      <div className="glass-card" style={{padding:"20px 22px",marginBottom:18}}>
        <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:14}}>Resumen</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14}}>
          <div>
            <div style={{fontSize:9,color:A.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.12em"}}>Total c/IVA</div>
            <div style={{fontSize:36,fontWeight:800,color:A.t1,lineHeight:1,
              letterSpacing:"-0.025em",fontVariantNumeric:"tabular-nums"}}>
              {mxn(totalPrecio)}
            </div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:9,color:A.t3,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.12em"}}>Util. neta</div>
            <div style={{fontSize:24,fontWeight:800,
              color:totalNeta>=0?A.lime:A.red,fontVariantNumeric:"tabular-nums"}}>
              {mxn(totalNeta)}
            </div>
          </div>
        </div>
        <div style={{height:1,background:C.border,marginBottom:14}}/>
        <div style={{display:"flex",flexDirection:"column",gap:5}}>
          {lineas.length>1&&<div style={{fontSize:10,color:A.t3}}>{lineas.length} líneas</div>}
          {cl&&<div style={{fontSize:11,color:A.t2}}>Cliente: <span style={{fontWeight:700,color:A.t1}}>{cl.empresa}</span></div>}
          {un&&<div style={{fontSize:11,color:A.t2}}>Unidad: <span style={{color:A.t1}}>{un.economico?"Eco. "+un.economico+" ":""}{un.marca} {un.modelo}</span></div>}
          <div style={{fontSize:10,color:A.t3}}>
            Pago: {payType==="credit"?`Crédito${promesa?" · "+promesa:""}` : "Contado"}
          </div>
        </div>
      </div>

      <div style={{display:"flex",gap:10}}>
        <button onClick={()=>setStep(1)}
          style={{padding:"14px 20px",borderRadius:14,background:"transparent",
            border:`1px solid ${C.border}`,color:A.t3,fontSize:12,cursor:"pointer",
            WebkitTapHighlightColor:"transparent"}}>
          ← Atrás
        </button>
        <button onClick={save} style={{
          flex:1,padding:"16px",borderRadius:14,
          background:A.limeFill,
          border:"none",color:C._dark?"#0A1F14":"#161616",fontSize:14,fontWeight:700,cursor:"pointer",
          letterSpacing:"0.02em",WebkitTapHighlightColor:"transparent",
        }}>
          Registrar ticket + PDF →
        </button>
      </div>
    </div>
  );
}

// ── MCartera — Cartera móvil ──────────────────────────────────────────────────
function MCartera({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {tickets,clients} = state;
  const now = new Date();

  const A = makeA(C);

  const creditTkts = useMemo(()=>tickets.filter(t=>!t._deleted&&t.payType==="credit"&&t.status!=="cancelado"),[tickets]);
  // Use status as source of truth — ignore cobrado flag (may be stale in DB)
  const pendientes = useMemo(()=>creditTkts.filter(t=>CARTERA_SET.has(t.status)),[creditTkts]);
  const cobradas   = useMemo(()=>creditTkts.filter(t=>t.status==="cobrado"),[creditTkts]);
  const cerradas   = useMemo(()=>creditTkts.filter(t=>t.status==="cerrado"),[creditTkts]);
  const totalPend  = useMemo(()=>pendientes.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0),[pendientes]);
  const totalCob   = useMemo(()=>cobradas.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0),[cobradas]);

  const msDay    = 86400000;
  const ageMs    = t => { const d=parseDateMX(t.promesaPago||t.date); return d?(now-d):0; };
  const daysOver = t => { const d=parseDateMX(t.promesaPago); if(!d) return 0; return Math.floor((now-d)/msDay); };

  const vencidas  = useMemo(()=>pendientes.filter(t=>{const d=parseDateMX(t.promesaPago);return d&&now>d;}),[pendientes]);
  const corriente = useMemo(()=>pendientes.filter(t=>{const d=parseDateMX(t.promesaPago);return !d||(d&&now<=d);}),[pendientes]);
  const totalVenc = useMemo(()=>vencidas.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0),[vencidas]);
  const totalCorr = useMemo(()=>corriente.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0),[corriente]);

  const aging = useMemo(()=>{
    const b=[{label:"0–30 d",min:0,max:30*msDay,monto:0},{label:"30–60 d",min:30*msDay,max:60*msDay,monto:0},{label:">60 d",min:60*msDay,max:Infinity,monto:0}];
    vencidas.forEach(t=>{const ms=ageMs(t);const bk=b.find(bk=>ms>=bk.min&&ms<bk.max);if(bk) bk.monto+=safeNumber(t.snap?.precioConIVA);});
    return b;
  },[vencidas]);
  const maxAging = Math.max(...aging.map(b=>b.monto),1);

  const cobrar = t => { dispatch({type:"TKT_COBRADO",id:t.id}); toast("Cobrado ✓","success"); };

  return (
    <div style={{minHeight:"100vh",background:"transparent",paddingBottom:40}}>

      {/* Alert banner when vencidas exist */}
      {vencidas.length>0&&(
        <div style={{
          background:"#0D1825",
          borderBottom:"1px solid rgba(212,146,26,0.3)",
          padding:"18px 20px 16px",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:A.amber,flexShrink:0}}/>
            <span style={{fontSize:10,fontWeight:800,color:A.amber,letterSpacing:"0.16em",textTransform:"uppercase"}}>
              {vencidas.length} cobro{vencidas.length>1?"s":""} vencido{vencidas.length>1?"s":""}
            </span>
          </div>
          <div style={{fontSize:30,fontWeight:800,color:A.amber,letterSpacing:"-0.02em",
            fontVariantNumeric:"tabular-nums",marginTop:8,marginBottom:4}}>
            {mxn(totalVenc)}
          </div>
          <div style={{fontSize:11,color:A.t3}}>por cobrar urgente</div>
        </div>
      )}

      <div style={{padding:"0 16px"}}>
        {/* Hero card */}
        <div className="glass-card" style={{padding:"26px 24px",marginTop:16,marginBottom:12}}>
          <div style={{fontSize:9,color:A.t3,letterSpacing:"0.18em",textTransform:"uppercase",marginBottom:10}}>
            Cuentas por cobrar
          </div>
          <div style={{fontSize:48,fontWeight:800,color:totalVenc>0?A.amber:A.t1,lineHeight:1,
            letterSpacing:"-0.025em",fontVariantNumeric:"tabular-nums",marginBottom:20}}>
            {mxn(totalPend)}
          </div>
          <div style={{height:1,background:C.border,marginBottom:20}}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            <div>
              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:7}}>Vencido</div>
              <div style={{fontSize:22,fontWeight:800,color:totalVenc>0?A.red:A.t3,
                fontVariantNumeric:"tabular-nums",letterSpacing:"-0.01em"}}>
                {mxn(totalVenc)}
              </div>
              <div style={{fontSize:10,color:totalVenc>0?A.red:A.t3,marginTop:4}}>
                {vencidas.length} factura{vencidas.length!==1?"s":""}
              </div>
            </div>
            <div style={{paddingLeft:16,borderLeft:`1px solid ${C.border}`}}>
              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:7}}>Al corriente</div>
              <div style={{fontSize:22,fontWeight:800,color:A.mint,
                fontVariantNumeric:"tabular-nums",letterSpacing:"-0.01em"}}>
                {mxn(totalCorr)}
              </div>
              <div style={{fontSize:10,color:A.t3,marginTop:4}}>
                {corriente.length} factura{corriente.length!==1?"s":""}
              </div>
            </div>
          </div>
        </div>

        {/* Aging breakdown */}
        {vencidas.length>0&&(
          <div className="glass-card" style={{padding:"20px 22px",marginBottom:12}}>
            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.16em",textTransform:"uppercase",marginBottom:16}}>
              Antigüedad
            </div>
            {aging.map((b,i)=>(
              <div key={i} style={{marginBottom:i<2?14:0}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:11,color:b.monto>0?A.t2:A.t3,fontWeight:b.monto>0?600:400}}>
                    {b.label}
                  </span>
                  <span style={{fontSize:12,fontWeight:700,fontVariantNumeric:"tabular-nums",
                    color:b.monto>0?(i===2?A.red:A.amber):A.t3}}>
                    {b.monto>0?mxn(b.monto):"—"}
                  </span>
                </div>
                {b.monto>0&&(
                  <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(b.monto/maxAging)*100}%`,
                      background:i===2?A.red:A.amber,borderRadius:2,transition:"width 500ms ease"}}/>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Vencidas section */}
        {vencidas.length>0&&(
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:A.red,flexShrink:0}}/>
              <span style={{fontSize:10,fontWeight:800,color:A.red,letterSpacing:"0.14em",textTransform:"uppercase"}}>
                Vencidas · {vencidas.length}
              </span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {vencidas.map(t=>{
                const cl=clients.find(c=>c.id===t.clientId);
                const over=daysOver(t);
                return (
                  <div key={t.id} style={{
                    background:"rgba(239,68,68,0.08)",
                    borderRadius:A.r,overflow:"hidden",
                    boxShadow:"0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(239,68,68,0.15)",
                  }}>
                    <div style={{padding:"16px 16px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div style={{fontSize:12,fontWeight:700,color:A.red}}>{cl?.empresa||"Sin cliente"}</div>
                        <div style={{fontSize:11,fontWeight:700,color:A.red,
                          background:"rgba(232,72,72,0.12)",padding:"2px 8px",borderRadius:8,
                          border:"1px solid rgba(232,72,72,0.2)"}}>
                          +{over}d
                        </div>
                      </div>
                      <div style={{fontSize:14,fontWeight:700,color:A.t1,marginBottom:6,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {t.titulo}
                      </div>
                      <div style={{fontSize:10,color:A.t3}}>Prometido: {t.promesaPago||"—"}</div>
                    </div>
                    <div style={{padding:"12px 16px",borderTop:"1px solid rgba(232,72,72,0.12)",
                      display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:22,fontWeight:800,color:A.red,letterSpacing:"-0.02em",
                        fontVariantNumeric:"tabular-nums"}}>
                        {mxn(t.snap?.precioConIVA||0)}
                      </div>
                      <button onClick={()=>cobrar(t)} style={{
                        padding:"10px 18px",borderRadius:12,
                        background:A.mintDim,border:`1px solid ${C.blue}33`,
                        color:A.mint,fontSize:12,fontWeight:800,cursor:"pointer",
                        letterSpacing:"0.04em",WebkitTapHighlightColor:"transparent",
                      }}>
                        Cobrar ✓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Al corriente */}
        {corriente.length>0&&(
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:A.mint,flexShrink:0}}/>
              <span style={{fontSize:10,fontWeight:800,color:A.mint,letterSpacing:"0.14em",textTransform:"uppercase"}}>
                Al corriente · {corriente.length}
              </span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {corriente.map(t=>{
                const cl=clients.find(c=>c.id===t.clientId);
                const d=parseDateMX(t.promesaPago);
                const daysLeft=d?Math.ceil((d-now)/86400000):null;
                const urgent=daysLeft!==null&&daysLeft<=3;
                return (
                  <div key={t.id} className="glass-card-sm" style={{overflow:"hidden"}}>
                    <div style={{padding:"16px 16px 14px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                        <div style={{fontSize:12,fontWeight:600,color:A.t2}}>{cl?.empresa||"Sin cliente"}</div>
                        {daysLeft!==null&&(
                          <div style={{fontSize:10,fontWeight:600,
                            color:urgent?A.amber:A.t3,
                            background:urgent?"rgba(240,160,48,0.12)":"transparent",
                            padding:"2px 8px",borderRadius:8}}>
                            {daysLeft<=0?"hoy":daysLeft===1?"mañana":`en ${daysLeft}d`}
                          </div>
                        )}
                      </div>
                      <div style={{fontSize:14,fontWeight:700,color:A.t1,marginBottom:4,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {t.titulo}
                      </div>
                      <div style={{fontSize:10,color:A.t3}}>Vence: {t.promesaPago||"—"}</div>
                    </div>
                    <div style={{padding:"12px 16px",borderTop:`1px solid ${C.border}`,
                      display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontSize:22,fontWeight:800,color:A.t1,letterSpacing:"-0.02em",
                        fontVariantNumeric:"tabular-nums"}}>
                        {mxn(t.snap?.precioConIVA||0)}
                      </div>
                      <button onClick={()=>cobrar(t)} style={{
                        padding:"10px 18px",borderRadius:12,
                        background:A.mintDim,border:`1px solid ${C.blue}33`,
                        color:A.mint,fontSize:12,fontWeight:800,cursor:"pointer",
                        letterSpacing:"0.04em",WebkitTapHighlightColor:"transparent",
                      }}>
                        Cobrar ✓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cobrado */}
        {cobradas.length>0&&(
          <div style={{marginBottom:16}}>
            <div style={{fontSize:9,color:A.lime,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>
              Cobrado · {cobradas.length} ops · {mxn(cobradas.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cobradas.slice(0,10).map(t=>{
                const cl=clients.find(c=>c.id===t.clientId);
                return (
                  <div key={t.id} className="glass-card-sm" style={{padding:"12px 16px",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:A.t2,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</div>
                      <div style={{fontSize:10,color:A.t3,marginTop:2}}>{cl?.empresa||""} · {t.date}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:800,color:A.mint,fontVariantNumeric:"tabular-nums",
                      marginLeft:12,flexShrink:0}}>
                      {mxn(t.snap?.precioConIVA||0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Cerrado/Archivado — separado del cobrado */}
        {cerradas.length>0&&(
          <div>
            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:10}}>
              Archivado · {cerradas.length} ops · {mxn(cerradas.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0))}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cerradas.slice(0,5).map(t=>{
                const cl=clients.find(c=>c.id===t.clientId);
                return (
                  <div key={t.id} className="glass-card-sm" style={{padding:"12px 16px",
                    display:"flex",justifyContent:"space-between",alignItems:"center",opacity:0.6}}>
                    <div style={{minWidth:0,flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:A.t2,overflow:"hidden",
                        textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</div>
                      <div style={{fontSize:10,color:A.t3,marginTop:2}}>{cl?.empresa||""} · {t.date}</div>
                    </div>
                    <div style={{fontSize:14,fontWeight:800,color:A.t3,fontVariantNumeric:"tabular-nums",
                      marginLeft:12,flexShrink:0}}>
                      {mxn(t.snap?.precioConIVA||0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendientes.length===0&&cobradas.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:11,color:A.t3,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>
              Sin operaciones a crédito
            </div>
            <div style={{fontSize:13,color:A.t3}}>Las ventas a crédito aparecen aquí</div>
          </div>
        )}
      </div>
    </div>
  );
}

const DOC_CATS = [
  {id:"factura",    label:"Factura",              icon:"🧾"},
  {id:"carta_rec",  label:"Carta de recepción",   icon:"📋"},
  {id:"acta_rec",   label:"Acta de recepción",    icon:"📄"},
  {id:"otro",       label:"Otro",                 icon:"📎"},
];

function MAttachments({ticket, dispatch, toast}) {
  const C = React.useContext(ThemeCtx);
  const [uploading, setUploading] = React.useState(null); // category being uploaded
  const [selCat, setSelCat] = React.useState("factura");
  const attachments = ticket.attachments || [];

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast("Archivo muy grande (máx 20 MB)", "error"); return; }
    setUploading(selCat);
    try {
      const att = await sbUploadFile(ticket.id, file, selCat);
      dispatch({ type: "TKT_UPDATE", id: ticket.id, patch: {
        attachments: [...attachments, att],
      }});
      toast("Archivo adjuntado ✓", "success");
    } catch(err) {
      console.error(err);
      toast(err.message || "Error al subir archivo", "error");
    } finally {
      setUploading(null);
      e.target.value = "";
    }
  };

  const handleDelete = async (att) => {
    await sbDeleteFile(att.id);
    dispatch({ type: "TKT_UPDATE", id: ticket.id, patch: {
      attachments: attachments.filter(a => a.id !== att.id),
    }});
    toast("Eliminado", "info");
  };

  const fmtSize = (b) => b > 1024*1024 ? `${(b/1024/1024).toFixed(1)} MB` : `${Math.round(b/1024)} KB`;

  return (
    <div style={{borderTop:`1px solid ${C.border}`, padding:"14px 16px"}}>
      <div style={{fontSize:9,color:C.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>
        Adjuntos ({attachments.length})
      </div>

      {/* Existing attachments */}
      {attachments.map(att => {
        const cat = DOC_CATS.find(d=>d.id===att.category) || DOC_CATS[3];
        return (
          <div key={att.id} style={{display:"flex",alignItems:"center",gap:8,
            padding:"8px 10px",borderRadius:8,background:C.bg1,border:`1px solid ${C.border}`,
            marginBottom:6}}>
            <span style={{fontSize:16,flexShrink:0}}>{cat.icon}</span>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,fontWeight:700,color:C.t1,
                overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{att.name}</div>
              <div style={{fontSize:9,color:C.t3}}>{cat.label} · {fmtSize(att.size)}</div>
            </div>
            <a href={att.url} target="_blank" rel="noreferrer"
              style={{fontSize:9,color:C.cyan,fontWeight:700,textDecoration:"none",
                padding:"4px 8px",borderRadius:6,background:`${C.cyan}18`,flexShrink:0}}>
              Ver ↗
            </a>
            <button onClick={()=>handleDelete(att)}
              style={{border:"none",background:"transparent",color:C.red,fontSize:14,
                cursor:"pointer",padding:"2px 4px",flexShrink:0}}>×</button>
          </div>
        );
      })}

      {/* Upload row */}
      <div style={{display:"flex",gap:6,alignItems:"center",marginTop:8}}>
        <select value={selCat} onChange={e=>setSelCat(e.target.value)}
          style={{flex:1,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:8,
            color:C.t2,fontSize:10,padding:"7px 8px",outline:"none"}}>
          {DOC_CATS.map(d=><option key={d.id} value={d.id}>{d.icon} {d.label}</option>)}
        </select>
        <label style={{padding:"7px 12px",borderRadius:8,
          background:uploading?C.bg1:C.blueDim,
          border:`1px solid ${uploading?C.border:C.blueHi}`,
          color:uploading?C.t3:C.cyan,fontSize:10,fontWeight:700,
          cursor:uploading?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0}}>
          {uploading ? "Subiendo…" : "+ Adjuntar"}
          <input type="file" disabled={!!uploading}
            accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,.xml"
            onChange={handleUpload}
            style={{display:"none"}}/>
        </label>
      </div>
    </div>
  );
}

function MHistorial({state,dispatch,toast,scheduleHardDelete,cancelHardDelete}) {
  const C = React.useContext(ThemeCtx);
  const {tickets,clients,units,suppliers} = state;
  const [period,setPeriod]   = useState("week");
  const [search,setSearch]   = useState("");
  const [expandId,setExpandId] = useState(null);
  const [editId,setEditId]   = useState(null);

  // ── Period range ──────────────────────────────────────────────────────────
  const range = useMemo(()=>{
    const now=new Date(); const from=new Date(now);
    if(period==="today")       { from.setHours(0,0,0,0); }
    else if(period==="week")   { from.setDate(now.getDate()-7); }
    else if(period==="month")  { from.setDate(now.getDate()-30); }
    else if(period==="3m")     { from.setDate(now.getDate()-90); }
    else                       { from.setFullYear(2000); } // "all"
    return {from,to:now};
  },[period]);

  const inRange = useCallback(t=>{
    const d=parseDateMX(t.date); return d&&d>=range.from&&d<=range.to;
  },[range]);

  // ── All non-deleted ───────────────────────────────────────────────────────
  const allActive = useMemo(()=>tickets.filter(t=>!t._deleted),[tickets]);

  const filtered = useMemo(()=>{
    let arr=allActive.filter(inRange);
    if(search.trim()) {
      const lq=search.toLowerCase();
      arr=arr.filter(t=>t.titulo?.toLowerCase().includes(lq)||t.id?.toLowerCase().includes(lq)||
        clients.find(c=>c.id===t.clientId)?.empresa?.toLowerCase().includes(lq));
    }
    const toS = (d="") => { const p=d.split("/"); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; };
    return [...arr].sort((a,b)=>toS(b.date).localeCompare(toS(a.date)));
  },[allActive,inRange,search,clients]);

  // ── Group by date ─────────────────────────────────────────────────────────
  const grouped = useMemo(()=>{
    const toS = (d="") => { const p=d.split("/"); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; };
    const groups={};
    filtered.forEach(t=>{
      const d=t.date||"Sin fecha";
      if(!groups[d]) groups[d]=[];
      groups[d].push(t);
    });
    // Sort dates desc (convert DD/MM/YYYY → YYYY/MM/DD for correct cross-month ordering)
    return Object.entries(groups).sort((a,b)=>toS(b[0]).localeCompare(toS(a[0])));
  },[filtered]);

  // ── Period summary ────────────────────────────────────────────────────────
  const periodFact = useMemo(()=>filtered.filter(t=>OPERADO_SET.has(t.status)).reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0),[filtered]);
  const periodNeta = useMemo(()=>filtered.filter(t=>OPERADO_SET.has(t.status)).reduce((s,t)=>s+safeNumber(t.snap?.uNeta),0),[filtered]);

  const todayStr = todayMX();
  const yesterdayStr = (()=>{const d=new Date();d.setDate(d.getDate()-1);const dd=String(d.getDate()).padStart(2,"0");const mm=String(d.getMonth()+1).padStart(2,"0");return `${dd}/${mm}/${d.getFullYear()}`;})();

  const dayLabel = d => {
    if(d===todayStr)     return "Hoy";
    if(d===yesterdayStr) return "Ayer";
    return d;
  };

  // ── Edit form state (lightweight) ────────────────────────────────────────
  const [ef,setEf]       = useState({});
  const sfn = k => v => setEf(p=>({...p,[k]:v}));
  const [mLineas,setMLineas] = useState([]);
  const mLsfn = (idx,k) => v => setMLineas(ls=>ls.map((l,i)=>i===idx?{...l,[k]:v}:l));
  const addMLinea = () => setMLineas(ls=>[...ls,{titulo:"",partRef:"",qty:1,costoUnit:"",precioUnit:"",descripcionPDF:""}]);
  const delMLinea = idx => setMLineas(ls=>ls.filter((_,i)=>i!==idx));

  // Catalog search for mobile line editing
  const [mCatalogIdx, setMCatalogIdx] = useState(null);
  const mCatalogResults = React.useMemo(()=>{
    if(mCatalogIdx===null) return [];
    const q=(mLineas[mCatalogIdx]?.titulo||"").toLowerCase().trim();
    if(q.length < 2) return [];
    return (state.parts||[]).filter(p=>
      (p.nombre||"").toLowerCase().includes(q)||
      (p.oem||"").toLowerCase().includes(q)||
      (p.aftermarket||"").toLowerCase().includes(q)||
      (p.aplicacion||"").toLowerCase().includes(q)
    ).slice(0,8);
  },[mCatalogIdx,mLineas,state.parts]);
  const mSelectCatalog = p => {
    setMLineas(ls=>ls.map((l,i)=>i===mCatalogIdx?{
      ...l,
      titulo:   p.nombre||l.titulo,
      partRef:  p.oem||p.aftermarket||l.partRef,
      costoUnit:String(p.ultimoPrecio||0),
    }:l));
    setMCatalogIdx(null);
  };

  const openEdit = t => {
    const s = t.snap || {};
    const ivaR_e = safeNumber(s.params?.iva,16)/100;
    const savedQty = Math.max(1, safeNumber(t.qty,1)||1);
    // Unit costs — divide stored totals by qty to show per-piece values
    const unitCostoIVA = (((s.costoBase||0)*(1+ivaR_e)) / savedQty).toFixed(2);
    const unitPrecioIVA = ((safeNumber(s.precioConIVA)||0) / savedQty).toFixed(2);
    // Compute existing lines before setEf so kitMode can depend on it
    const existingLineas = (t.lineas||[]).filter(l=>l.titulo);
    setEf({titulo:t.titulo||"",kitMode:t.kitMode||existingLineas.length>0,
           status:t.status,clientId:t.clientId||"",supplierId:t.supplierId||"",
           unitId:t.unitId||"",payType:t.payType||"contado",promesaPago:t.promesaPago||"",
           notes:t.notes||"",priority:t.priority||"P3",
           costoIVA:String(safeNumber(unitCostoIVA)||0),
           _gastos:String(safeNumber(s.gastos)||0),
           precioIVA:String(safeNumber(unitPrecioIVA)||0),
           qty:String(savedQty),
           _iva:safeNumber(s.params?.iva,16), _isr:safeNumber(s.params?.isr,20),
           quoteMode:false,
           opType:t.opId||"consumable",
           activeMods:[...(t.mods||[])],
    });
    // Restore existing lines if present and valid
    setMLineas(existingLineas.length > 0
      ? existingLineas.map(l=>({
          titulo:l.titulo||"",
          partRef:l.partRef||"",
          qty:l.qty||1,
          // l.costoUnit is stored with IVA (per-unit); fall back to snap derivation for old tickets
          costoUnit: l.costoUnit!=null
            ? String(Math.round(Number(l.costoUnit)*100)/100)
            : String(((l.snap?.costoBase||0) * (1 + (l.snap?.params?.iva||16)/100) / Math.max(1,l.qty||1)).toFixed(2)),
          // l.unitPrice is per-unit price; fall back for old tickets
          precioUnit: l.unitPrice!=null
            ? String(Math.round(Number(l.unitPrice)*100)/100)
            : String(((l.snap?.precioConIVA||0) / Math.max(1,l.qty||1)).toFixed(2)),
          descripcionPDF:l.descripcionPDF||"",
        }))
      : []
    );
    setEditId(t.id);
    setExpandId(null);
  };

  const saveEdit = t => {
    const iva = ef._iva||16; const isr = ef._isr||20;
    const gastos = safeNumber(ef._gastos);
    const opMeta = OP_TYPES.find(o=>o.id===(ef.opType||"consumable"))||OP_TYPES[0];
    const mgn = effectiveMargin(ef.opType||"consumable",ef.priority||"P3",ef.activeMods||[],false,27);

    let newSnap, newLineas, newTitulo, newQty;

    if (mLineas.length > 0) {
      // Multilinea mode — compute per-line snaps and aggregate
      const mgn = effectiveMargin(ef.opType||"consumable",ef.priority||"P3",ef.activeMods||[],false,27);
      const lineasConSnap = mLineas.map(l => {
        const qL = Math.max(1, Math.round(safeNumber(l.qty)||1));
        const costo = safeNumber(l.costoUnit) * qL;
        const snap = ef.quoteMode
          ? computeSnap({costo,compraConIVA:true,mode:"auto",margin:mgn,gasolina:0,otros:0,iva,isr})
          : computeSnap({costo,compraConIVA:true,mode:"manual",manualPrice:safeNumber(l.precioUnit)*qL,ventaConIVA:true,gasolina:0,otros:0,iva,isr});
        return {titulo:l.titulo||"Sin descripción", partRef:l.partRef||"",
                snap, qty:qL, descripcionPDF:l.descripcionPDF||"",
                costoUnit:safeNumber(l.costoUnit),
                unitPrice:safeNumber(l.precioUnit),
                lineTotal:snap.precioConIVA};
      });
      const totalPrecio = lineasConSnap.reduce((s,l)=>s+l.snap.precioConIVA,0);
      const totalCosto  = lineasConSnap.reduce((s,l)=>s+l.snap.costoTotal,0);
      newSnap = computeSnap({costo:totalCosto,compraConIVA:false,
        mode:"manual",manualPrice:totalPrecio,ventaConIVA:true,
        gasolina:gastos,otros:0,iva,isr});
      newLineas = lineasConSnap;
      newTitulo = ef.titulo || lineasConSnap.map(l=>l.titulo).join(" / ");
      newQty = lineasConSnap.reduce((s,l)=>s+l.qty,0);
    } else {
      // Single-line mode (legacy)
      newQty = Math.max(1, Math.round(safeNumber(ef.qty)||1));
      const totalCosto = safeNumber(ef.costoIVA) * newQty;
      if(ef.quoteMode) {
        newSnap = computeSnap({costo:totalCosto,compraConIVA:true,
          mode:"auto",margin:mgn,gasolina:gastos,otros:0,iva,isr});
      } else {
        newSnap = computeSnap({costo:totalCosto,compraConIVA:true,
          manualPrice:safeNumber(ef.precioIVA)*newQty,ventaConIVA:true,mode:"manual",
          gasolina:gastos,otros:0,iva,isr});
      }
      newLineas = [];
      newTitulo = ef.titulo || t.titulo;
    }

    const {costoIVA:_c,precioIVA:_p,_iva:_iv,_isr:_is,quoteMode:_q,opType:_ot,
           activeMods:_am,_gastos:_g,qty:_qty,titulo:_ti,kitMode:_km,...rest}=ef;
    dispatch({type:"TKT_UPDATE",id:t.id,patch:{
      ...rest, titulo:newTitulo, qty:newQty, snap:newSnap, lineas:newLineas,
      kitMode:ef.kitMode||false,
      opId:ef.opType||"consumable", opShort:opMeta.short, mods:ef.activeMods||[],
    }});
    toast("Actualizado","success");
    setEditId(null);
  };

  const A = makeA(C);
  const prC={P1:{dot:C.p1,dim:C.p1dim},P2:{dot:C.p2,dim:C.p2dim},
             P3:{dot:C.p3,dim:C.p3dim},P4:{dot:C.p4,dim:C.p4dim}};

  return (
    <div style={{minHeight:"100vh",background:"transparent",paddingBottom:40}}>

      {/* Catalog search modal removed — now inline in description field */}
      {false&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",zIndex:600,
          display:"flex",alignItems:"flex-end",justifyContent:"center"}}
          onClick={()=>{setMCatalogIdx(null);}}>
          <div style={{background:C.bg1,border:`1px solid ${C.borderHi}`,
            borderRadius:"16px 16px 0 0",width:"100%",maxWidth:560,
            maxHeight:"75vh",display:"flex",flexDirection:"column",overflow:"hidden"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
              <div style={{fontSize:9,color:A.cyan,letterSpacing:"0.12em",textTransform:"uppercase",
                fontWeight:800,marginBottom:8}}>
                Catálogo — Línea {(mCatalogIdx+1)}
              </div>
              <input autoFocus value={mCatalogQ} onChange={e=>setMCatalogQ(e.target.value)}
                placeholder="Buscar por nombre, OEM, aplicación..."
                style={{width:"100%",boxSizing:"border-box",background:C.bg0,
                  border:`1px solid ${C.borderHi}`,borderRadius:10,padding:"10px 14px",
                  color:A.t1,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
            </div>
            <div style={{overflowY:"auto",flex:1}}>
              {(state.parts||[]).length===0&&(
                <div style={{padding:"28px",textAlign:"center",color:A.t3,fontSize:12}}>
                  Sin partes en el catálogo. Agrégalas en el módulo Catálogo.
                </div>
              )}
              {mCatalogResults.map((p,i)=>(
                <div key={p.id} onClick={()=>mSelectCatalog(p)}
                  style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                    padding:"12px 16px",borderBottom:`1px solid ${C.border}`,cursor:"pointer",
                    background:i%2===0?C.bg1:C.bg0,activeStyle:{background:C.bg3}}}>
                  <div style={{flex:1,minWidth:0,marginRight:12}}>
                    <div style={{fontSize:13,fontWeight:700,color:A.t1,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.nombre}</div>
                    <div style={{fontSize:10,color:A.t3,marginTop:2,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {p.oem&&<span style={{color:A.cyan,fontFamily:"'Courier New',monospace"}}>{p.oem}</span>}
                      {p.oem&&p.aplicacion&&" · "}
                      {p.aplicacion}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    {p.ultimoPrecio>0&&(
                      <div style={{fontSize:13,fontWeight:800,color:A.amber,
                        fontVariantNumeric:"tabular-nums"}}>{mxn(p.ultimoPrecio)}</div>
                    )}
                    {p.ultimaFecha&&<div style={{fontSize:9,color:A.t3}}>{p.ultimaFecha}</div>}
                  </div>
                </div>
              ))}
              {mCatalogResults.length===0&&mCatalogQ&&(
                <div style={{padding:"24px",textAlign:"center",color:A.t3,fontSize:12}}>
                  Sin resultados para "{mCatalogQ}"
                </div>
              )}
            </div>
            <div style={{padding:"10px 16px",borderTop:`1px solid ${C.border}`,flexShrink:0}}>
              <button onClick={()=>{setMCatalogIdx(null);setMCatalogQ("");}}
                style={{width:"100%",padding:"10px",borderRadius:10,background:"transparent",
                  border:`1px solid ${C.border}`,color:A.t3,fontSize:13,cursor:"pointer"}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{padding:"0 14px"}}>

        {/* Period + search */}
        <div style={{display:"flex",gap:6,padding:"18px 0 12px",overflowX:"auto",scrollbarWidth:"none",msOverflowStyle:"none"}}>
          {[["today","Hoy"],["week","7d"],["month","30d"],["3m","3M"],["all","Todo"]].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriod(v)}
              className={period===v?"glass-pill-active":"glass-pill-inactive"}
              style={{
                flexShrink:0,padding:"7px 16px",borderRadius:20,fontSize:11,fontWeight:700,
                color:period===v ? A.pillColor : A.t3,
                cursor:"pointer",letterSpacing:"0.04em",transition:"all 0.18s",
              }}>{l}</button>
          ))}
        </div>

        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Buscar por título, ID, cliente..."
          style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,
            border:`1px solid ${C.border}`,borderRadius:12,
            padding:"12px 16px",color:A.t1,fontSize:16,outline:"none",marginBottom:14,
            boxSizing:"border-box",fontFamily:"inherit"}}/>

        {/* Period summary */}
        {filtered.length>0&&(
          <div className="glass-card" style={{padding:"16px 20px",marginBottom:16,display:"flex",gap:0}}>
            {[
              {label:"Facturado",value:mxn(periodFact),color:A.t1},
              {label:"Util. neta",value:mxn(periodNeta),color:A.lime,border:true},
              {label:"Ops",value:filtered.length,color:A.t2,border:true},
            ].map(({label,value,color,border})=>(
              <div key={label} style={{flex:1,paddingLeft:border?14:0,
                borderLeft:border?`1px solid ${C.border}`:"none"}}>
                <div style={{fontSize:8,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>
                  {label}
                </div>
                <div style={{fontSize:16,fontWeight:800,color,fontVariantNumeric:"tabular-nums"}}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {filtered.length===0&&(
          <div style={{textAlign:"center",padding:"48px 20px"}}>
            <div style={{fontSize:11,color:A.t3,letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:8}}>
              Sin resultados
            </div>
            <div style={{fontSize:13,color:A.t3}}>Ajusta el período o la búsqueda</div>
          </div>
        )}

        {/* Grouped by day */}
        {grouped.map(([date,dayTickets])=>{
          const dayFact=dayTickets.filter(t=>t.status!=="cancelado").reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
          const dayNeta=dayTickets.filter(t=>OPERADO_SET.has(t.status)).reduce((s,t)=>s+safeNumber(t.snap?.uNeta),0);
          return (
            <div key={date} style={{marginBottom:20}}>
              {/* Day header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:800,letterSpacing:"0.08em",
                  color:date===todayStr?A.lime:A.t2}}>
                  {dayLabel(date)}
                </div>
                {dayFact>0&&(
                  <div style={{fontSize:10,color:A.t3,fontVariantNumeric:"tabular-nums"}}>
                    {mxn(dayFact)}{dayNeta>0&&<span style={{color:A.lime}}> · {mxn(dayNeta)}</span>}
                  </div>
                )}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {dayTickets.map(t=>{
                  const meta   = TICKET_META[t.status]||{};
                  const pr     = prC[t.priority]||prC.P4;
                  const cl     = clients.find(c=>c.id===t.clientId);
                  const un     = units.find(u=>u.id===t.unitId);
                  const isExp  = expandId===t.id;
                  const isEdit = editId===t.id;
                  const isOp   = OPERADO_SET.has(t.status);
                  const isCan  = t.status==="cancelado";
                  const price  = safeNumber(t.snap?.precioConIVA);
                  const uNeta  = safeNumber(t.snap?.uNeta);

                  return (
                    <div key={t.id} style={{
                      background:isCan?"rgba(239,68,68,0.06)":A.card,
                      borderRadius:A.r,overflow:"hidden",
                      boxShadow:isCan
                        ?"0 2px 12px rgba(239,68,68,0.08), 0 0 0 1px rgba(239,68,68,0.18)"
                        :A.shadow,
                      opacity:isCan?0.85:1,
                    }}>
                      {/* Tap to expand */}
                      <div onClick={()=>{if(!isEdit) setExpandId(isExp?null:t.id);}}
                        style={{padding:"14px 16px",cursor:"pointer"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"nowrap"}}>
                            <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:10,
                              background:`${meta.dot||"#8A9AA4"}18`,color:meta.dot||A.t3,letterSpacing:"0.05em"}}>
                              {meta.label||t.status}
                            </span>
                            <span style={{fontSize:9,fontWeight:800,padding:"3px 7px",borderRadius:10,
                              background:pr.dim,color:pr.dot,letterSpacing:"0.06em"}}>
                              {t.priority}
                            </span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontSize:16,fontWeight:800,
                              color:isOp?A.t1:A.t3,fontVariantNumeric:"tabular-nums"}}>
                              {mxn(price)}
                            </span>
                            <span style={{fontSize:14,color:A.t3,
                              transform:isExp?"rotate(90deg)":"none",
                              transition:"transform 200ms",display:"inline-block",lineHeight:1}}>›</span>
                          </div>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:A.t1,lineHeight:1.3,marginBottom:4}}>
                          {t.titulo}
                        </div>
                        <div style={{fontSize:9,color:A.t3,fontFamily:"'Courier New',monospace",marginBottom:3,letterSpacing:"0.04em"}}>
                          {mkFolio(t,"OP")}
                        </div>
                        {(cl||un)&&(
                          <div style={{fontSize:10,color:A.t3,
                            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            {cl&&<span style={{color:A.t2}}>{cl.empresa}</span>}
                            {cl&&un&&<span style={{margin:"0 4px"}}>·</span>}
                            {un&&<span>{un.economico?"Eco. "+un.economico:un.marca+" "+un.modelo}</span>}
                          </div>
                        )}
                      </div>

                      {/* Expanded detail */}
                      {isExp&&!isEdit&&(
                        <div style={{borderTop:`1px solid ${C.border}`,
                          padding:"16px",background:C.bg0}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                            {[
                              {l:"Precio",       v:mxn(price),  c:A.t1},
                              {l:"Util. neta",   v:mxn(uNeta),  c:uNeta>=0?A.lime:A.red},
                              {l:"Costo s/IVA",  v:mxn(safeNumber(t.snap?.costoBase)), c:A.t2},
                              {l:"Costo c/IVA",  v:mxn(safeNumber(t.snap?.costoBase)+safeNumber(t.snap?.ivaAcred)), c:A.t1},
                              {l:"Otros gastos", v:safeNumber(t.snap?.gastos)>0?mxn(safeNumber(t.snap?.gastos)):"—", c:A.t2},
                              {l:"Margen",       v:fpct(safeNumber(t.snap?.margenNetoPrecio)), c:A.t2},
                            ].map(({l,v,c})=>(
                              <div key={l}>
                                <div style={{fontSize:8,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>{l}</div>
                                <div style={{fontSize:15,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
                              </div>
                            ))}
                          </div>
                          {t.timeline&&t.timeline.length>0&&(
                            <div style={{marginBottom:14}}>
                              <div style={{fontSize:8,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>
                                Últimos eventos
                              </div>
                              {[...t.timeline].reverse().slice(0,3).map((ev,i)=>(
                                <div key={i} style={{display:"flex",gap:8,alignItems:"flex-start",marginBottom:5}}>
                                  <div style={{width:4,height:4,borderRadius:"50%",
                                    background:C.border,marginTop:5,flexShrink:0}}/>
                                  <div style={{fontSize:10,color:A.t3,flex:1}}>
                                    <span style={{color:A.t2}}>{ev.evento}</span>
                                    {ev.ts&&<span style={{marginLeft:6,fontSize:9}}>{fmtTS(ev.ts)}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          <MAttachments ticket={t} dispatch={dispatch} toast={toast}/>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"0 16px 14px"}}>
                            <button onClick={()=>openEdit(t)} style={{
                              flex:1,padding:"9px 14px",borderRadius:10,background:"transparent",
                              border:`1px solid ${C.border}`,color:A.t2,
                              fontSize:11,fontWeight:600,cursor:"pointer",
                            }}>✏ Editar</button>
                            <button onClick={()=>{
                              const c2=clients.find(c=>c.id===t.clientId);
                              const u2=units.find(u=>u.id===t.unitId);
                              generarCotizacionPDF(t,c2,u2,null).catch(()=>toast("Error PDF","error"));
                            }} style={{
                              flex:1,padding:"9px 14px",borderRadius:10,background:"transparent",
                              border:`1px solid ${C.border}`,color:A.t2,
                              fontSize:11,fontWeight:600,cursor:"pointer",
                            }}>COT ↗</button>
                            <button onClick={()=>{
                              const c2=clients.find(c=>c.id===t.clientId);
                              const u2=units.find(u=>u.id===t.unitId);
                              generarActaRecepcionPDF(t,c2,u2);
                            }} style={{
                              flex:1,padding:"9px 14px",borderRadius:10,background:"transparent",
                              border:`1px solid ${C.border}`,color:A.t2,
                              fontSize:11,fontWeight:600,cursor:"pointer",
                            }}>Acta ↗</button>
                            {CARTERA_SET.has(t.status)&&t.payType==="credit"&&!t.cobrado&&(
                              <button onClick={()=>{dispatch({type:"TKT_COBRADO",id:t.id});toast("Cobrado ✓","success");setExpandId(null);}}
                                style={{flex:1,padding:"9px 14px",borderRadius:10,background:A.mintDim,
                                  border:`1px solid ${C.blue}33`,color:A.mint,fontSize:11,fontWeight:800,cursor:"pointer"}}>
                                Cobrar ✓
                              </button>
                            )}
                            {!CLOSED_SET.has(t.status)&&(
                              <button onClick={()=>{dispatch({type:"TKT_SOFT_DEL",id:t.id});toast("Eliminado","info");setExpandId(null);}}
                                style={{padding:"9px 12px",borderRadius:10,background:"transparent",
                                  border:"1px solid rgba(232,72,72,0.25)",color:A.red,fontSize:11,cursor:"pointer"}}>
                                🗑
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Quick edit form */}
                      {isEdit&&(
                        <div style={{borderTop:`1px solid ${C.border}`,
                          background:C.bg0,padding:"16px"}}>
                          <div style={{fontSize:9,color:A.lime,letterSpacing:"0.14em",
                            textTransform:"uppercase",marginBottom:14,fontWeight:800}}>
                            Editando: {t.titulo?.slice(0,28)}
                          </div>

                          {/* ── Título ── */}
                          <div style={{marginBottom:10}}>
                            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>Título de la operación</div>
                            <input value={ef.titulo||""} onChange={e=>sfn("titulo")(e.target.value)}
                              placeholder="Ej: Horquilla clutch Freightliner M2 106"
                              style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.03)",
                                border:`1px solid ${C.borderHi}`,borderRadius:10,padding:"10px 12px",
                                color:A.t1,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                          </div>

                          {/* ── Kit mode ── */}
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                            padding:"9px 12px",borderRadius:10,marginBottom:10,
                            background:ef.kitMode?"rgba(43,181,160,0.08)":"rgba(255,255,255,0.03)",
                            border:`1px solid ${ef.kitMode?C.blue+"55":C.border}`,cursor:"pointer"}}
                            onClick={()=>{
                              const next=!ef.kitMode;
                              sfn("kitMode")(next);
                              if(next) setMLineas([]);
                            }}>
                            <div>
                              <div style={{fontSize:11,fontWeight:600,color:ef.kitMode?A.lime:A.t2}}>Integrar como kit</div>
                              <div style={{fontSize:9,color:A.t3,marginTop:2}}>Agrupa las líneas como un paquete en el PDF</div>
                            </div>
                            <div style={{width:36,height:20,borderRadius:10,background:ef.kitMode?C.blue:"rgba(255,255,255,0.1)",
                              position:"relative",flexShrink:0,transition:"background 150ms"}}>
                              <div style={{position:"absolute",top:2,left:ef.kitMode?18:2,width:16,height:16,
                                borderRadius:"50%",background:"#fff",transition:"left 150ms"}}/>
                            </div>
                          </div>

                          <MSel label="Estado" value={ef.status} onChange={sfn("status")}
                            options={TICKET_ALL.map(s=>({value:s,label:(TICKET_META[s]?.label||s)}))}/>
                          <ClientPicker clients={clients} value={ef.clientId||""} onChange={sfn("clientId")} mobile/>
                          <UnitPicker units={units} value={ef.unitId||""} onChange={sfn("unitId")} mobile/>
                          <MSel label="Pago" value={ef.payType} onChange={sfn("payType")}
                            options={[{value:"contado",label:"Contado"},{value:"credit",label:"Crédito"}]}/>
                          {ef.payType==="credit"&&(
                            <MField label="Promesa de pago" value={ef.promesaPago}
                              onChange={sfn("promesaPago")} placeholder="DD/MM/AAAA" color={A.amber}/>
                          )}
                          {/* ── Campos individuales (ocultos en kit mode) ── */}
                          {!ef.kitMode&&(<>
                          {/* ── Cantidad ── */}
                          <div style={{marginBottom:8}}>
                            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>Cantidad (piezas)</div>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <button onClick={()=>sfn("qty")(String(Math.max(1,(safeNumber(ef.qty)||1)-1)))}
                                style={{width:38,height:38,borderRadius:8,flexShrink:0,
                                  background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,
                                  color:A.t1,fontSize:20,lineHeight:1,cursor:"pointer",
                                  display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                              <input type="number" inputMode="numeric" min="1" value={ef.qty||"1"}
                                onChange={e=>sfn("qty")(e.target.value)}
                                style={{flex:1,textAlign:"center",background:"rgba(255,255,255,0.03)",
                                  border:`1px solid ${C.borderHi}`,borderRadius:10,padding:"9px 6px",
                                  color:A.lime,fontSize:16,fontWeight:800,outline:"none",fontFamily:"inherit",
                                  fontVariantNumeric:"tabular-nums"}}/>
                              <button onClick={()=>sfn("qty")(String((safeNumber(ef.qty)||1)+1))}
                                style={{width:38,height:38,borderRadius:8,flexShrink:0,
                                  background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border}`,
                                  color:A.t1,fontSize:20,lineHeight:1,cursor:"pointer",
                                  display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                            </div>
                            {(safeNumber(ef.qty)||1)>1&&(
                              <div style={{fontSize:10,color:A.t3,marginTop:4,letterSpacing:"0.04em"}}>
                                Precio unitario · costos unitarios abajo
                              </div>
                            )}
                          </div>
                          {/* ── Costo / Precio ── */}
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                            <div>
                              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>
                                Costo c/IVA {(safeNumber(ef.qty)||1)>1?"(unitario)":"($)"}
                              </div>
                              <input type="number" inputMode="decimal" value={ef.costoIVA||""} onChange={e=>sfn("costoIVA")(e.target.value)}
                                placeholder="0"
                                style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.03)",
                                  border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",
                                  color:A.t1,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
                            </div>
                            <div>
                              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>
                                {ef.quoteMode
                                  ?(safeNumber(ef.qty||1)>1?"Precio calc. (unit)":"Precio calc.")
                                  :(safeNumber(ef.qty||1)>1?"Precio c/IVA (unit)":"Precio c/IVA ($)")}
                              </div>
                              {ef.quoteMode?(()=>{
                                const mgn=effectiveMargin(ef.opType||"consumable",ef.priority||"P3",ef.activeMods||[],false,27);
                                const qty=Math.max(1,safeNumber(ef.qty)||1);
                                const unitCalc=safeNumber(ef.costoIVA)>0?computeSnap({costo:safeNumber(ef.costoIVA),compraConIVA:true,mode:"auto",margin:mgn,gasolina:0,otros:0,iva:ef._iva||16,isr:ef._isr||20}).precioConIVA:0;
                                return <div style={{width:"100%",boxSizing:"border-box",background:"rgba(43,181,160,0.06)",
                                  border:`1px solid ${C.blue}44`,borderRadius:10,padding:"10px 12px",
                                  color:A.lime,fontSize:14,fontWeight:700,fontVariantNumeric:"tabular-nums",
                                  display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                                  <span>{unitCalc>0?(qty>1?`${mxn(unitCalc)} ×${qty}`:mxn(unitCalc)):"—"}</span>
                                  <span style={{fontSize:9,color:A.t3}}>{mgn}%</span>
                                </div>;
                              })():(
                                <input type="number" inputMode="decimal" value={ef.precioIVA||""} onChange={e=>sfn("precioIVA")(e.target.value)}
                                  placeholder="0"
                                  style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.03)",
                                    border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",
                                    color:A.t1,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
                              )}
                            </div>
                          </div>
                          {/* ── Gasolina / Flete / Otros ── */}
                          <div style={{marginBottom:8}}>
                            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5}}>Gasolina / Flete / Otros ($)</div>
                            <input type="number" inputMode="decimal" value={ef._gastos||""} onChange={e=>sfn("_gastos")(e.target.value)}
                              placeholder="0"
                              style={{width:"100%",boxSizing:"border-box",background:"rgba(255,255,255,0.03)",
                                border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",
                                color:A.amber,fontSize:14,outline:"none",fontFamily:"inherit"}}/>
                          </div>
                          {/* Live preview — single item only */}
                          {safeNumber(ef.costoIVA)>0&&(()=>{
                            const qty=Math.max(1,safeNumber(ef.qty)||1);
                            const totalCosto=safeNumber(ef.costoIVA)*qty;
                            const mgn=ef.quoteMode?effectiveMargin(ef.opType||"consumable",ef.priority||"P3",ef.activeMods||[],false,27):null;
                            const prev=computeSnap({costo:totalCosto,compraConIVA:true,
                              ...(ef.quoteMode?{mode:"auto",margin:mgn}:{mode:"manual",manualPrice:safeNumber(ef.precioIVA)*qty,ventaConIVA:true}),
                              gasolina:safeNumber(ef._gastos),otros:0,iva:ef._iva||16,isr:ef._isr||20});
                            const items=[
                              {l:qty>1?"Total venta":"Venta",v:mxn(prev.precioConIVA),c:A.t1},
                              {l:"Util.",v:mxn(prev.uNeta),c:prev.uNeta>=0?A.lime:A.red},
                              {l:"Margen",v:fpct(prev.margenNetoPrecio),c:prev.margenNetoPrecio>=15?A.lime:A.amber},
                              ...(safeNumber(ef._gastos)>0?[{l:"Gastos",v:mxn(prev.gastos),c:A.amber}]:[]),
                              ...(ef.quoteMode?[{l:"Mgn ef.",v:mgn+"%",c:A.lime}]:[]),
                            ];
                            return (
                              <div style={{display:"flex",gap:10,marginBottom:12,
                                background:"rgba(255,255,255,0.03)",borderRadius:10,
                                padding:"8px 12px",border:`1px solid ${C.border}`}}>
                                {items.map(({l,v,c})=>(
                                  <div key={l} style={{flex:1}}>
                                    <div style={{fontSize:8,color:A.t3,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:2}}>{l}</div>
                                    <div style={{fontSize:12,fontWeight:700,color:c,fontVariantNumeric:"tabular-nums"}}>{v}</div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          </>)}
                          {/* ── Modo: Manual / Cotizador (siempre visible) ── */}
                          <div style={{display:"flex",gap:6,marginBottom:12}}>
                            {[{v:false,l:"Manual"},{v:true,l:"⚙ Cotizador"}].map(({v,l})=>(
                              <button key={String(v)} onClick={()=>sfn("quoteMode")(v)}
                                style={{flex:1,padding:"7px 10px",borderRadius:8,fontSize:10,fontWeight:700,
                                  background:ef.quoteMode===v?"rgba(43,181,160,0.12)":"rgba(255,255,255,0.03)",
                                  border:`1px solid ${ef.quoteMode===v?C.blue+"55":C.border}`,
                                  color:ef.quoteMode===v?A.lime:A.t3,cursor:"pointer",
                                  textTransform:"uppercase",letterSpacing:"0.06em"}}>
                                {l}
                              </button>
                            ))}
                          </div>
                          {/* ── Cotizador selectors (siempre visibles cuando quoteMode) ── */}
                          {ef.quoteMode&&(<>
                            {/* Tipo de operación */}
                            <div style={{marginBottom:10}}>
                              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Tipo de operación</div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                                {OP_TYPES.map(op=>{const sel=ef.opType===op.id;return(
                                  <button key={op.id} onClick={()=>sfn("opType")(op.id)}
                                    style={{padding:"6px 4px",borderRadius:8,textAlign:"center",lineHeight:1.3,cursor:"pointer",
                                      background:sel?"rgba(43,181,160,0.12)":"rgba(255,255,255,0.03)",
                                      border:`1px solid ${sel?C.blue+"55":C.border}`,color:sel?A.lime:A.t2}}>
                                    <div style={{fontSize:9,fontWeight:sel?700:500}}>{op.label}</div>
                                    <div style={{fontSize:8,color:A.t3}}>{op.baseMin}-{op.baseMax}%</div>
                                  </button>
                                );})}
                              </div>
                            </div>
                            {/* Prioridad */}
                            <div style={{marginBottom:10}}>
                              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Prioridad</div>
                              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
                                {["P1","P2","P3","P4"].map(p=>{
                                  const pc=prC[p]; const sel=ef.priority===p;
                                  const bonus=PRIORITY[p].marginBonus;
                                  return(
                                    <button key={p} onClick={()=>sfn("priority")(p)}
                                      style={{padding:"7px 4px",borderRadius:8,textAlign:"center",lineHeight:1.3,cursor:"pointer",
                                        background:sel?pc.dim:"rgba(255,255,255,0.03)",
                                        border:`1px solid ${sel?pc.dot+"66":C.border}`,
                                        color:sel?pc.dot:A.t3,fontSize:10,fontWeight:sel?800:500}}>
                                      <div>{p}</div>
                                      {bonus>0&&<div style={{fontSize:7,color:pc.dot}}>+{bonus}%</div>}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            {/* Modificadores */}
                            <div style={{marginBottom:12}}>
                              <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>Modificadores</div>
                              {MODIFIERS.map(m=>{const on=(ef.activeMods||[]).includes(m.id);return(
                                <div key={m.id} onClick={()=>{
                                  const cur=ef.activeMods||[];
                                  sfn("activeMods")(on?cur.filter(x=>x!==m.id):[...cur,m.id]);
                                }} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                                  padding:"8px 12px",borderRadius:8,marginBottom:5,cursor:"pointer",
                                  background:on?"rgba(43,181,160,0.08)":"rgba(255,255,255,0.02)",
                                  border:`1px solid ${on?C.blue+"44":C.border}`}}>
                                  <span style={{fontSize:11,color:on?A.t1:A.t2}}>{m.label}</span>
                                  <span style={{fontSize:10,fontWeight:700,color:on?A.lime:A.t3}}>+{m.pct}%</span>
                                </div>
                              );})}
                            </div>
                          </>)}
                          <div style={{fontSize:9,color:A.t3,marginBottom:6,letterSpacing:"0.12em",textTransform:"uppercase"}}>
                            Notas
                          </div>
                          <textarea rows={2} value={ef.notes} onChange={e=>sfn("notes")(e.target.value)}
                            placeholder="Notas..."
                            style={{width:"100%",background:"rgba(255,255,255,0.03)",
                              border:`1px solid ${C.border}`,borderRadius:10,
                              padding:"10px 12px",color:A.t2,fontSize:13,outline:"none",
                              boxSizing:"border-box",fontFamily:"inherit",resize:"none",marginBottom:14}}/>

                          {/* ── Líneas / Productos ── */}
                          <div style={{height:1,background:C.border,marginBottom:12}}/>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                            <div style={{fontSize:9,color:A.t3,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:700}}>
                              Líneas ({mLineas.length})
                            </div>
                            <button onClick={addMLinea}
                              style={{padding:"5px 12px",borderRadius:8,fontSize:10,fontWeight:700,
                                background:C.blueDim,border:`1px solid ${C.blueHi}`,
                                color:A.cyan,cursor:"pointer"}}>
                              + Agregar producto/servicio
                            </button>
                          </div>
                          {mLineas.map((l,idx)=>(
                            <div key={idx} style={{background:"rgba(255,255,255,0.02)",
                              border:`1px solid ${C.borderHi}`,borderRadius:10,
                              padding:"10px 12px",marginBottom:8}}>
                              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                                <span style={{fontSize:9,color:A.cyan,fontWeight:700,letterSpacing:"0.1em"}}>
                                  LÍNEA {idx+1}
                                </span>
                                <button onClick={()=>delMLinea(idx)}
                                  style={{padding:"4px 8px",borderRadius:6,background:"transparent",
                                    border:`1px solid ${C.red}44`,color:A.red,fontSize:9,cursor:"pointer",fontWeight:700}}>
                                  × Eliminar
                                </button>
                              </div>
                              {/* Description input with inline catalog autocomplete */}
                              <div style={{position:"relative",marginBottom:6}}>
                                <input value={l.titulo}
                                  onChange={e=>{mLsfn(idx,"titulo")(e.target.value);setMCatalogIdx(idx);}}
                                  onFocus={()=>setMCatalogIdx(idx)}
                                  onBlur={()=>setTimeout(()=>setMCatalogIdx(v=>v===idx?null:v),180)}
                                  placeholder="Descripción del producto/servicio"
                                  style={{width:"100%",boxSizing:"border-box",
                                    background:"rgba(255,255,255,0.03)",
                                    border:`1px solid ${mCatalogIdx===idx&&mCatalogResults.length>0?C.blueHi:C.border}`,
                                    borderRadius:mCatalogIdx===idx&&mCatalogResults.length>0?"8px 8px 0 0":8,
                                    padding:"8px 10px",color:A.t1,fontSize:12,
                                    outline:"none",fontFamily:"inherit"}}/>
                                {mCatalogIdx===idx&&mCatalogResults.length>0&&(
                                  <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,
                                    background:C.bg1,border:`1px solid ${C.blueHi}`,borderTop:"none",
                                    borderRadius:"0 0 8px 8px",maxHeight:200,overflowY:"auto",
                                    boxShadow:"0 8px 24px rgba(0,0,0,0.4)"}}>
                                    {mCatalogResults.map((p,pi)=>(
                                      <div key={p.id}
                                        onPointerDown={e=>{e.preventDefault();mSelectCatalog(p);}}
                                        style={{padding:"9px 12px",cursor:"pointer",
                                          borderBottom:pi<mCatalogResults.length-1?`1px solid ${C.border}`:"none",
                                          display:"flex",flexDirection:"column",gap:2}}>
                                        <div style={{fontSize:12,color:A.t1,fontWeight:600,
                                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                          {p.nombre}
                                        </div>
                                        <div style={{display:"flex",gap:8,alignItems:"center"}}>
                                          {(p.oem||p.aftermarket)&&(
                                            <span style={{fontSize:10,color:A.cyan,fontFamily:"'Courier New',monospace"}}>
                                              {p.oem||p.aftermarket}
                                            </span>
                                          )}
                                          {p.ultimoPrecio>0&&(
                                            <span style={{fontSize:10,color:A.lime}}>
                                              {mxn(p.ultimoPrecio)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <input value={l.partRef} onChange={e=>mLsfn(idx,"partRef")(e.target.value)}
                                placeholder="No. parte / referencia"
                                style={{width:"100%",boxSizing:"border-box",marginBottom:6,
                                  background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,
                                  borderRadius:8,padding:"7px 10px",color:A.t2,fontSize:11,
                                  outline:"none",fontFamily:"inherit"}}/>
                              <div style={{display:"grid",gridTemplateColumns:"60px 1fr 1fr",gap:6}}>
                                <div>
                                  <div style={{fontSize:8,color:A.t3,marginBottom:3}}>Cant.</div>
                                  <input type="number" inputMode="numeric" min="1" value={l.qty}
                                    onChange={e=>mLsfn(idx,"qty")(Number(e.target.value)||1)}
                                    style={{width:"100%",boxSizing:"border-box",
                                      background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,
                                      borderRadius:8,padding:"8px 6px",color:A.lime,fontSize:13,
                                      fontWeight:700,outline:"none",textAlign:"center",fontFamily:"inherit"}}/>
                                </div>
                                <div>
                                  <div style={{fontSize:8,color:A.t3,marginBottom:3}}>Costo unit. c/IVA</div>
                                  <input type="number" inputMode="decimal" value={l.costoUnit}
                                    onChange={e=>mLsfn(idx,"costoUnit")(e.target.value)}
                                    placeholder="0"
                                    style={{width:"100%",boxSizing:"border-box",
                                      background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,
                                      borderRadius:8,padding:"8px 10px",color:A.t1,fontSize:12,
                                      outline:"none",fontFamily:"inherit"}}/>
                                </div>
                                <div>
                                  <div style={{fontSize:8,color:A.t3,marginBottom:3}}>Precio unit. c/IVA</div>
                                  {ef.quoteMode?(()=>{
                                    const mgn=effectiveMargin(ef.opType||"consumable",ef.priority||"P3",ef.activeMods||[],false,27);
                                    const qL=Math.max(1,safeNumber(l.qty)||1);
                                    const autoSnap=computeSnap({costo:safeNumber(l.costoUnit)*qL,compraConIVA:true,mode:"auto",margin:mgn,gasolina:0,otros:0,iva:ef._iva||16,isr:ef._isr||20});
                                    const unitP=autoSnap.precioConIVA/qL;
                                    return <div style={{width:"100%",boxSizing:"border-box",
                                      background:"rgba(43,181,160,0.07)",border:`1px solid ${C.blue}55`,
                                      borderRadius:8,padding:"8px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                                      <span style={{color:A.lime,fontSize:12,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>
                                        {unitP>0?mxn(unitP):"—"}
                                      </span>
                                      <span style={{fontSize:8,color:A.t3}}>{mgn}%</span>
                                    </div>;
                                  })():(
                                    <input type="number" inputMode="decimal" value={l.precioUnit}
                                      onChange={e=>mLsfn(idx,"precioUnit")(e.target.value)}
                                      placeholder="0"
                                      style={{width:"100%",boxSizing:"border-box",
                                        background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,
                                        borderRadius:8,padding:"8px 10px",color:A.cyan,fontSize:12,
                                        outline:"none",fontFamily:"inherit"}}/>
                                  )}
                                </div>
                              </div>
                              {safeNumber(l.costoUnit)>0&&(()=>{
                                const qL=Math.max(1,safeNumber(l.qty)||1);
                                const mgn=effectiveMargin(ef.opType||"consumable",ef.priority||"P3",ef.activeMods||[],false,27);
                                const snap=ef.quoteMode
                                  ?computeSnap({costo:safeNumber(l.costoUnit)*qL,compraConIVA:true,mode:"auto",margin:mgn,gasolina:0,otros:0,iva:ef._iva||16,isr:ef._isr||20})
                                  :computeSnap({costo:safeNumber(l.costoUnit)*qL,compraConIVA:true,mode:"manual",manualPrice:safeNumber(l.precioUnit)*qL,ventaConIVA:true,gasolina:0,otros:0,iva:ef._iva||16,isr:ef._isr||20});
                                return (
                                  <div style={{marginTop:6,fontSize:9,color:A.t3,fontVariantNumeric:"tabular-nums"}}>
                                    Total línea: <span style={{color:A.t1,fontWeight:700}}>{mxn(snap.precioConIVA)}</span>
                                    <span style={{color:snap.uNeta>=0?A.lime:A.red,marginLeft:8}}>
                                      Util: {mxn(snap.uNeta)}
                                    </span>
                                    {ef.quoteMode&&<span style={{color:A.t3,marginLeft:6}}>· {mgn}% margen</span>}
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                          {mLineas.length>0&&(
                            <div style={{padding:"8px 12px",borderRadius:8,marginBottom:12,
                              background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,
                              fontSize:10,color:A.t2,fontVariantNumeric:"tabular-nums"}}>
                              <span style={{color:A.t3}}>Total {mLineas.length} líneas: </span>
                              <span style={{fontWeight:800,color:A.t1}}>
                                {mxn(mLineas.reduce((s,l)=>s+safeNumber(l.precioUnit)*Math.max(1,safeNumber(l.qty)||1),0))}
                              </span>
                              <span style={{fontSize:9,color:A.t3,marginLeft:6}}>(reemplaza costo/precio de arriba)</span>
                            </div>
                          )}

                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>saveEdit(t)} style={{
                              flex:1,padding:"13px",borderRadius:12,
                              background:"rgba(43,181,160,0.15)",border:"1px solid rgba(43,181,160,0.3)",
                              color:A.lime,fontSize:13,fontWeight:700,cursor:"pointer",
                            }}>Guardar</button>
                            <button onClick={()=>setEditId(null)} style={{
                              padding:"13px 16px",borderRadius:12,background:"transparent",
                              border:`1px solid ${C.border}`,color:A.t3,fontSize:13,cursor:"pointer",
                            }}>Cancelar</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MClientes — Clientes móvil ────────────────────────────────────────────────
function MClientes({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {clients,tickets,units} = state;
  const [search,setSearch]=useState("");
  const [sel,setSel]=useState(null);
  const [editId,setEditId]=useState(null);
  const [adding,setAdding]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const empty={empresa:"",contacto:"",tel:"",correo:"",rfc:"",direccion:"",ciudad:"",estado:"",creditDays:15,category:"B",score:70};
  const [form,setForm]=useState(empty);
  const sf=k=>v=>setForm(p=>({...p,[k]:v}));
  const dSearch=useDebounce(search,250);

  const stats=useCallback(id=>{
    const co=tickets.filter(t=>t.clientId===id);
    return{total:co.length,fact:co.reduce((s,t)=>s+(t.snap?.precioConIVA||0),0),neta:co.reduce((s,t)=>s+(t.snap?.uNeta||0),0),pend:co.filter(t=>t.payType==="credit"&&!t.cobrado).reduce((s,t)=>s+(t.snap?.precioConIVA||0),0)};
  },[tickets]);

  const filtered=useMemo(()=>clients.filter(c=>{
    if(!dSearch.trim()) return true;
    const lq=safeLower(dSearch);
    return safeLower(c.empresa).includes(lq)||safeLower(c.contacto).includes(lq)||safeLower(c.tel).includes(lq);
  }),[clients,dSearch]);

  const startAdd=()=>{setAdding(true);setEditId(null);setSel(null);setForm(empty);window.scrollTo(0,0);};
  const startEdit=(c)=>{setEditId(c.id);setAdding(false);setSel(null);setForm({...c});window.scrollTo(0,0);};
  const cancel=()=>{setAdding(false);setEditId(null);setForm(empty);};
  const save=()=>{
    if(editId){dispatch({type:"CLI_UPDATE",id:editId,patch:form});toast("Cliente actualizado","success");}
    else{dispatch({type:"CLI_ADD",c:{...form,id:genId("CLI"),unidades:[]}});toast("Cliente registrado","success");}
    cancel();
  };
  const del=(c)=>setConfirm(c);
  const showForm=adding||!!editId;

  return (
    <div style={{padding:"14px 14px 8px"}}>
      {confirm&&<Confirm msg={"Eliminar: "+confirm.empresa+"?"} onConfirm={()=>{dispatch({type:"CLI_DELETE",id:confirm.id});setSel(null);setConfirm(null);toast("Eliminado","info");}} onCancel={()=>setConfirm(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700}}>Clientes · {clients.length}</div>
        <button onClick={showForm?cancel:startAdd} style={{padding:"7px 14px",background:showForm?"transparent":C.blue,border:`1px solid ${showForm?C.border:C.blue}`,borderRadius:20,color:showForm?C.t2:C.t1,fontSize:12,fontWeight:700,cursor:"pointer",minHeight:36}}>
          {showForm?"× Cancelar":"+ Nuevo"}
        </button>
      </div>
      {showForm&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontSize:10,color:C.t3,letterSpacing:"0.15em",marginBottom:10}}>{editId?"EDITAR CLIENTE":"NUEVO CLIENTE"}</div>
          <MField label="Empresa / Razón social" value={form.empresa}       onChange={sf("empresa")}/>
          <MField label="RFC"                    value={form.rfc||""}       onChange={sf("rfc")}/>
          <MField label="Contacto"               value={form.contacto}      onChange={sf("contacto")}/>
          <MField label="Teléfono"               value={form.tel}           onChange={sf("tel")} type="tel"/>
          <MField label="Correo"                 value={form.correo||""}    onChange={sf("correo")} type="email"/>
          <MField label="Días crédito"           value={form.creditDays}    onChange={sf("creditDays")} type="number" suffix="días"/>
          <MField label="Dirección"              value={form.direccion||""} onChange={sf("direccion")}/>
          <MField label="Ciudad"                 value={form.ciudad||""}    onChange={sf("ciudad")}/>
          <MField label="Estado"                 value={form.estado||""}    onChange={sf("estado")}/>
          <MBtn label={editId?"Guardar cambios":"Guardar cliente"} full color={C.t1} bg={C.blue} border={C.blue} onClick={save}/>
        </div>
      )}
      {!showForm&&clients.length>0&&(
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar empresa, contacto, tel..."
          style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.t1,fontSize:16,outline:"none",marginBottom:12,fontFamily:"inherit"}}/>
      )}
      {clients.length===0&&!showForm&&<EmptyState icon="🏢" title="Sin clientes" sub='Agrega el primero con "+ Nuevo"'/>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(c=>{
          const st=stats(c.id);
          const pctU=st.fact>0?(st.neta/st.fact)*100:0;
          const exp=sel===c.id;
          const cliUnits=units.filter(u=>u.clientId===c.id);
          return (
            <div key={c.id} style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${exp?C.cyan:C.border}`,borderRadius:14,overflow:"hidden"}}>
              <div onClick={()=>setSel(exp?null:c.id)} style={{padding:"14px 16px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{fontSize:15,fontWeight:800,color:C.t1,lineHeight:1.2,flex:1,marginRight:8}}>{c.empresa}</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace",flexShrink:0}}>{st.fact>0?mxn(st.fact):"—"}</div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontSize:11,color:C.t3}}>{c.contacto||"—"} · {c.tel||"—"}</div>
                  <div style={{fontSize:11,color:st.neta>=0?C.green:C.red,fontWeight:600}}>{st.fact>0?fpct(pctU)+" margen":st.total+" ops"}</div>
                </div>
                {st.pend>0&&<div style={{marginTop:4,fontSize:10,color:C.yellow,fontWeight:700}}>⚠ {mxn(st.pend)} por cobrar</div>}
              </div>
              {exp&&(
                <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,padding:"12px 16px"}}>
                  {c.rfc&&<div style={{fontSize:11,color:C.t3,marginBottom:4}}>RFC: <span style={{color:C.t2,fontFamily:"'Courier New',monospace"}}>{c.rfc}</span></div>}
                  {c.correo&&<div style={{fontSize:11,color:C.t3,marginBottom:4}}>Email: <span style={{color:C.cyan}}>{c.correo}</span></div>}
                  {c.direccion&&<div style={{fontSize:11,color:C.t3,marginBottom:4}}>Dir: <span style={{color:C.t2}}>{c.direccion}{c.ciudad?", "+c.ciudad:""}{c.estado?", "+c.estado:""}</span></div>}
                  <div style={{fontSize:11,color:C.t3,marginBottom:10}}>Crédito: <span style={{color:C.yellow}}>{c.creditDays}d</span> · Tickets: <span style={{color:C.t1}}>{st.total}</span> · Score: <span style={{color:c.score>=80?C.green:c.score>=60?C.yellow:C.red,fontWeight:700}}>{c.score}</span></div>
                  {cliUnits.length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:9,color:C.t3,marginBottom:4,letterSpacing:"0.1em"}}>FLOTILLA VINCULADA</div>
                      {cliUnits.map(u=><div key={u.id} style={{fontSize:11,color:C.t2,marginBottom:2}}>🚛 {u.marca} {u.modelo} {u.anio}{u.economico?" · Eco "+u.economico:""}</div>)}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>startEdit(c)} style={{flex:1,padding:"9px",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,color:C.t1,fontSize:13,cursor:"pointer",fontWeight:600}}>Editar</button>
                    <button onClick={()=>del(c)} style={{padding:"9px 14px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:10,color:C.red,fontSize:13,cursor:"pointer"}}>Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MUnidades — Flotilla móvil ────────────────────────────────────────────────
function MUnidades({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {units,clients,tickets} = state;
  const [search,setSearch]=useState("");
  const [sel,setSel]=useState(null);
  const [editId,setEditId]=useState(null);
  const [adding,setAdding]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const empty={vin:"",marca:"",modelo:"",anio:"",motor:"",transmision:"",config:"",clientId:"",statusOp:"operativa",km:"",notas:"",placa:"",economico:""};
  const [form,setForm]=useState(empty);
  const sf=k=>v=>setForm(p=>({...p,[k]:v}));
  const dSearch=useDebounce(search,250);

  const filtered=useMemo(()=>units.filter(u=>{
    if(!dSearch.trim()) return true;
    const lq=safeLower(dSearch);
    return safeLower(u.vin).includes(lq)||safeLower(u.marca).includes(lq)||safeLower(u.modelo).includes(lq)||safeLower(u.economico||"").includes(lq)||safeLower(u.placa||"").includes(lq);
  }),[units,dSearch]);

  const startAdd=()=>{setAdding(true);setEditId(null);setSel(null);setForm(empty);window.scrollTo(0,0);};
  const startEdit=(u)=>{setEditId(u.id);setAdding(false);setSel(null);setForm({...u});window.scrollTo(0,0);};
  const cancel=()=>{setAdding(false);setEditId(null);setForm(empty);};
  const save=()=>{
    const parsed={...form,km:parseInt(form.km)||0};
    if(editId){dispatch({type:"UNIT_UPDATE",id:editId,patch:parsed});toast("Unidad actualizada","success");}
    else{dispatch({type:"UNIT_ADD",u:{...parsed,id:mkUnitId()}});toast("Unidad registrada","success");}
    cancel();
  };
  const del=(u)=>setConfirm(u);
  const showForm=adding||!!editId;

  return (
    <div style={{padding:"14px 14px 8px"}}>
      {confirm&&<Confirm msg={"Eliminar: "+confirm.marca+" "+confirm.modelo+"?"} onConfirm={()=>{dispatch({type:"UNIT_DELETE",id:confirm.id});setSel(null);setConfirm(null);toast("Eliminada","info");}} onCancel={()=>setConfirm(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700}}>Flotilla · {units.length}</div>
        <button onClick={showForm?cancel:startAdd} style={{padding:"7px 14px",background:showForm?"transparent":C.blue,border:`1px solid ${showForm?C.border:C.blue}`,borderRadius:20,color:showForm?C.t2:C.t1,fontSize:12,fontWeight:700,cursor:"pointer",minHeight:36}}>
          {showForm?"× Cancelar":"+ Nueva"}
        </button>
      </div>
      {showForm&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontSize:10,color:C.t3,letterSpacing:"0.15em",marginBottom:10}}>{editId?"EDITAR UNIDAD":"NUEVA UNIDAD"}</div>
          <MField label="No. Económico"   value={form.economico||""} onChange={sf("economico")} placeholder="Ej: 1045"/>
          <MField label="Placa"           value={form.placa||""}     onChange={sf("placa")} placeholder="Ej: 912FE2"/>
          <MField label="Marca"           value={form.marca}         onChange={sf("marca")}/>
          <MField label="Modelo"          value={form.modelo}        onChange={sf("modelo")}/>
          <MField label="Año"             value={form.anio}          onChange={sf("anio")} type="number"/>
          <MField label="VIN / Serial"    value={form.vin}           onChange={sf("vin")}/>
          <MField label="Motor"           value={form.motor}         onChange={sf("motor")}/>
          <MField label="Transmisión"     value={form.transmision}   onChange={sf("transmision")}/>
          <MField label="Configuración"   value={form.config}        onChange={sf("config")} placeholder="4x2, 6x4..."/>
          <MField label="Kilometraje"     value={form.km}            onChange={sf("km")} type="number" suffix="km"/>
          <ClientPicker clients={clients} value={form.clientId||""} onChange={sf("clientId")} mobile/>
          <MSel   label="Estado"          value={form.statusOp}      onChange={sf("statusOp")} options={Object.entries(UNIT_STATUS).map(([k,v])=>({value:k,label:v.label}))}/>
          <MField label="Notas técnicas"  value={form.notas}         onChange={sf("notas")} placeholder="Historial, advertencias..."/>
          <MBtn label={editId?"Guardar cambios":"Guardar unidad"} full color={C.t1} bg={C.blue} border={C.blue} onClick={save}/>
        </div>
      )}
      {!showForm&&units.length>0&&(
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar eco., placa, VIN, marca..."
          style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.t1,fontSize:16,outline:"none",marginBottom:12,fontFamily:"inherit"}}/>
      )}
      {units.length===0&&!showForm&&<EmptyState icon="🚛" title="Sin unidades" sub='Agrega la primera con "+ Nueva"'/>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(u=>{
          const st=UNIT_STATUS[u.statusOp]||UNIT_STATUS.operativa;
          const cl=clients.find(c=>c.id===u.clientId);
          const openTks=tickets.filter(t=>t.unitId===u.id&&!CLOSED_SET.has(t.status));
          const allTks=tickets.filter(t=>t.unitId===u.id);
          const exp=sel===u.id;
          return (
            <div key={u.id} style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${exp?C.cyan:C.border}`,borderRadius:14,overflow:"hidden",borderLeft:`4px solid ${st.dot}`}}>
              <div onClick={()=>setSel(exp?null:u.id)} style={{padding:"14px 16px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div>
                    <span style={{fontSize:16,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace",marginRight:8}}>{u.economico||"—"}</span>
                    <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{u.marca} {u.modelo}</span>
                  </div>
                  <span style={{padding:"3px 8px",borderRadius:6,background:st.color+"22",border:`1px solid ${st.color}55`,fontSize:10,color:st.dot,fontWeight:600,flexShrink:0}}>{st.label}</span>
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:C.t3}}>{u.anio} · {u.placa||"Sin placa"}</span>
                  {u.km>0&&<span style={{fontSize:11,color:C.t3}}>{u.km.toLocaleString()} km</span>}
                  {openTks.length>0&&<span style={{fontSize:10,fontWeight:700,color:C.yellow,background:C.yellowDim,border:`1px solid ${C.yellow}44`,borderRadius:4,padding:"1px 6px"}}>{openTks.length} op. abierta{openTks.length>1?"s":""}</span>}
                </div>
                {cl&&<div style={{fontSize:11,color:C.t3,marginTop:2}}>🏢 {cl.empresa}</div>}
              </div>
              {exp&&(
                <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,padding:"12px 16px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10,fontSize:11}}>
                    <div style={{color:C.t3}}>VIN: <span style={{color:C.t2,fontFamily:"'Courier New',monospace",fontSize:10}}>{u.vin||"—"}</span></div>
                    <div style={{color:C.t3}}>Motor: <span style={{color:C.t2}}>{u.motor||"—"}</span></div>
                    <div style={{color:C.t3}}>Trans: <span style={{color:C.t2}}>{u.transmision||"—"}</span></div>
                    <div style={{color:C.t3}}>Config: <span style={{color:C.t2}}>{u.config||"—"}</span></div>
                  </div>
                  {u.notas&&<div style={{fontSize:11,color:C.t3,fontStyle:"italic",marginBottom:10,lineHeight:1.5}}>"{u.notas}"</div>}
                  {allTks.length>0&&(
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:9,color:C.t3,marginBottom:4,letterSpacing:"0.1em"}}>HISTORIAL ({allTks.length} tickets)</div>
                      {allTks.slice(0,3).map(t=>(
                        <div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}`,fontSize:11,alignItems:"center"}}>
                          <span style={{color:C.t3,fontFamily:"'Courier New',monospace",fontSize:10,flexShrink:0}}>{t.id}</span>
                          <span style={{color:C.t2,flex:1,marginLeft:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</span>
                          <StatusBadge sid={t.status} meta={TICKET_META} small/>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>startEdit(u)} style={{flex:1,padding:"9px",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,color:C.t1,fontSize:13,cursor:"pointer",fontWeight:600}}>Editar</button>
                    <button onClick={()=>del(u)} style={{padding:"9px 14px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:10,color:C.red,fontSize:13,cursor:"pointer"}}>Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MCatalogo — Catálogo móvil ────────────────────────────────────────────────
function MCatalogo({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {parts} = state;
  const [search,setSearch]=useState("");
  const [sel,setSel]=useState(null);
  const [editId,setEditId]=useState(null);
  const [adding,setAdding]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const [view,setView]=useState("frecuentes"); // "frecuentes"|"todos"
  const empty={nombre:"",oem:"",aftermarket:"",aplicacion:"",notas:"",proveedor:"",ultimoPrecio:"",ultimaFecha:"",frecuencia:0};
  const [form,setForm]=useState(empty);
  const sf=k=>v=>setForm(p=>({...p,[k]:v}));
  const dSearch=useDebounce(search,250);

  const frecuentes=useMemo(()=>[...parts].filter(p=>(p.frecuencia||0)>0).sort((a,b)=>(b.frecuencia||0)-(a.frecuencia||0)).slice(0,10),[parts]);

  const filtered=useMemo(()=>{
    const base=view==="frecuentes"&&!dSearch.trim()?frecuentes:parts;
    if(!dSearch.trim()) return base;
    const lq=safeLower(dSearch);
    return parts.filter(p=>safeLower(p.nombre).includes(lq)||safeLower(p.oem).includes(lq)||safeLower(p.aftermarket).includes(lq)||safeLower(p.aplicacion).includes(lq)||safeLower(p.proveedor).includes(lq));
  },[parts,frecuentes,dSearch,view]);

  const startAdd=()=>{setAdding(true);setEditId(null);setSel(null);setForm(empty);window.scrollTo(0,0);};
  const startEdit=(p)=>{setEditId(p.id);setAdding(false);setSel(null);setForm({...p,ultimoPrecio:String(p.ultimoPrecio||""),frecuencia:String(p.frecuencia||0)});window.scrollTo(0,0);};
  const cancel=()=>{setAdding(false);setEditId(null);setForm(empty);};
  const save=()=>{
    const parsed={...form,ultimoPrecio:parseFloat(form.ultimoPrecio)||0,frecuencia:parseInt(form.frecuencia)||0};
    if(editId){dispatch({type:"PART_UPDATE",id:editId,patch:parsed});toast("Parte actualizada","success");}
    else{dispatch({type:"PART_ADD",p:{...parsed,id:mkPartId()}});toast("Parte registrada","success");}
    cancel();
  };
  const del=(p)=>setConfirm(p);
  const showForm=adding||!!editId;
  const isSearching=dSearch.trim().length>0;

  return (
    <div style={{padding:"14px 14px 8px"}}>
      {confirm&&<Confirm msg={"Eliminar: "+confirm.nombre+"?"} onConfirm={()=>{dispatch({type:"PART_DELETE",id:confirm.id});setSel(null);setConfirm(null);toast("Eliminado","info");}} onCancel={()=>setConfirm(null)}/>}

      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700}}>Catálogo · {parts.length}</div>
        <button onClick={showForm?cancel:startAdd} style={{padding:"7px 14px",background:showForm?"transparent":C.blue,border:`1px solid ${showForm?C.border:C.blue}`,borderRadius:20,color:showForm?C.t2:C.t1,fontSize:12,fontWeight:700,cursor:"pointer",minHeight:36}}>
          {showForm?"× Cancelar":"+ Nueva parte"}
        </button>
      </div>

      {/* ── Add/Edit Form ── */}
      {showForm&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontSize:10,color:C.t3,letterSpacing:"0.15em",marginBottom:10}}>{editId?"EDITAR PARTE":"NUEVA PARTE"}</div>
          <MField label="Nombre / descripción"  value={form.nombre}       onChange={sf("nombre")}/>
          <MField label="Número OEM"            value={form.oem}          onChange={sf("oem")}/>
          <MField label="Aftermarket / equiv."  value={form.aftermarket}  onChange={sf("aftermarket")} placeholder="Marca · código"/>
          <MField label="Aplicación / modelos"  value={form.aplicacion}   onChange={sf("aplicacion")} placeholder="Marca modelo año motor"/>
          <MField label="Último precio (c/IVA)" value={form.ultimoPrecio} onChange={sf("ultimoPrecio")} type="number"/>
          <MField label="Última fecha"          value={form.ultimaFecha}  onChange={sf("ultimaFecha")} placeholder="DD/MM/AAAA"/>
          <MField label="Proveedor habitual"    value={form.proveedor}    onChange={sf("proveedor")}/>
          <MField label="Notas técnicas"        value={form.notas}        onChange={sf("notas")} placeholder="Advertencias, variantes..."/>
          <MBtn label={editId?"Guardar cambios":"Guardar parte"} full color={C.t1} bg={C.blue} border={C.blue} onClick={save}/>
        </div>
      )}

      {/* ── Search & View Tabs ── */}
      {!showForm&&parts.length>0&&(
        <>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar nombre, OEM, proveedor, aplicación..."
            style={{width:"100%",background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.t1,fontSize:16,outline:"none",marginBottom:10,fontFamily:"inherit",boxSizing:"border-box"}}/>
          {!isSearching&&frecuentes.length>0&&(
            <div style={{display:"flex",gap:6,marginBottom:12}}>
              {[["frecuentes","★ Frecuentes"],["todos","Todos"]].map(([v,l])=>(
                <button key={v} onClick={()=>setView(v)}
                  style={{padding:"6px 14px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
                    background:"transparent",border:`1px solid ${view===v?C.cyan:C.border}`,
                    color:view===v?C.cyan:C.t3}}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {parts.length===0&&!showForm&&<EmptyState icon="📦" title="Sin partes en catálogo" sub='Agrega la primera con "+ Nueva parte". Las partes que uses en cotizaciones aparecen aquí automáticamente.'/>}

      {/* ── Frecuentes hero banner ── */}
      {!showForm&&!isSearching&&view==="frecuentes"&&frecuentes.length>0&&(
        <div style={{background:"linear-gradient(135deg,rgba(15,20,22,0.95) 0%,rgba(20,27,29,0.90) 100%)",
          backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",
          border:`1px solid rgba(38,122,144,0.25)`,borderRadius:16,padding:"14px 16px",marginBottom:12,
          boxShadow:"0 4px 20px rgba(0,0,0,0.4)"}}>
          <div style={{fontSize:9,color:C.cyan,letterSpacing:"0.16em",textTransform:"uppercase",fontWeight:700,marginBottom:6}}>
            ★ MÁS USADAS EN COTIZACIONES
          </div>
          <div style={{fontSize:11,color:C.t3,lineHeight:1.5}}>
            Top {frecuentes.length} piezas por frecuencia de uso. El catálogo se sincroniza automáticamente cuando creas una cotización.
          </div>
        </div>
      )}

      {/* ── Parts list ── */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map((p,idx)=>{
          const exp=sel===p.id;
          const freq=p.frecuencia||0;
          const isFrecuente=freq>=2;
          return (
            <div key={p.id} style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,
              border:`1px solid ${exp?C.cyan:isFrecuente?`rgba(38,122,144,0.2)`:C.border}`,
              borderRadius:14,overflow:"hidden",
              boxShadow:isFrecuente?"0 0 0 1px rgba(59,130,246,0.2)":undefined}}>
              <div onClick={()=>setSel(exp?null:p.id)} style={{padding:"13px 15px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:3}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1,flex:1,marginRight:8,lineHeight:1.3}}>{p.nombre}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    {freq>0&&(
                      <div style={{padding:"2px 7px",borderRadius:20,background:freq>=5?`${C.cyan}22`:freq>=2?`${C.blue}22`:`${C.border}`,
                        border:`1px solid ${freq>=5?C.cyan+"44":freq>=2?C.blueHi+"44":C.border}`,
                        fontSize:9,fontWeight:800,color:freq>=5?C.cyan:freq>=2?C.blueHi:C.t3,letterSpacing:"0.04em"}}>
                        ×{freq}
                      </div>
                    )}
                    {p.ultimoPrecio>0&&<div style={{fontSize:12,fontWeight:700,color:C.yellow,fontFamily:"'Courier New',monospace"}}>{mxn(p.ultimoPrecio)}</div>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  {p.oem&&<div style={{fontSize:10,color:C.cyan,fontFamily:"'Courier New',monospace"}}>OEM: {p.oem}</div>}
                  {p.proveedor&&<div style={{fontSize:10,color:C.t3}}>· {p.proveedor}</div>}
                </div>
                {p.aplicacion&&<div style={{fontSize:10,color:C.t3,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.aplicacion}</div>}
              </div>
              {exp&&(
                <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,padding:"12px 15px"}}>
                  {p.aftermarket&&<div style={{fontSize:11,color:C.t3,marginBottom:5}}>Aftermarket: <span style={{color:C.t2}}>{p.aftermarket}</span></div>}
                  {p.proveedor&&<div style={{fontSize:11,color:C.t3,marginBottom:5}}>Proveedor: <span style={{color:C.t2}}>{p.proveedor}</span></div>}
                  {p.ultimaFecha&&<div style={{fontSize:11,color:C.t3,marginBottom:5}}>Ult. compra: <span style={{color:C.t2}}>{p.ultimaFecha}</span></div>}
                  {freq>0&&<div style={{fontSize:11,color:C.t3,marginBottom:5}}>Usado en cotizaciones: <span style={{color:C.cyan,fontWeight:700}}>×{freq} veces</span></div>}
                  {p.aplicacion&&<div style={{fontSize:11,color:C.t3,marginBottom:8,lineHeight:1.5}}>Aplicación: <span style={{color:C.t1}}>{p.aplicacion}</span></div>}
                  {p.notas&&<div style={{fontSize:11,color:C.t3,fontStyle:"italic",marginBottom:8,lineHeight:1.5}}>"{p.notas}"</div>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>startEdit(p)} style={{flex:1,padding:"9px",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,color:C.t1,fontSize:13,cursor:"pointer",fontWeight:600}}>Editar</button>
                    <button onClick={()=>del(p)} style={{padding:"9px 14px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:10,color:C.red,fontSize:13,cursor:"pointer"}}>Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length===0&&isSearching&&(
          <div style={{textAlign:"center",padding:"32px 16px"}}>
            <div style={{fontSize:28,marginBottom:8}}>🔍</div>
            <div style={{fontSize:14,color:C.t2,fontWeight:600,marginBottom:4}}>Sin resultados</div>
            <div style={{fontSize:12,color:C.t3}}>"{dSearch}" no está en el catálogo</div>
            <button onClick={()=>{setAdding(true);setForm({...empty,nombre:dSearch.trim()});}}
              style={{marginTop:14,padding:"10px 20px",background:C.blue,border:`1px solid ${C.blueHi}`,borderRadius:12,color:C.t1,fontSize:12,fontWeight:700,cursor:"pointer"}}>
              + Agregar "{dSearch.trim()}"
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MProveedores — Proveedores móvil ─────────────────────────────────────────
function MProveedores({state,dispatch,toast}) {
  const C = React.useContext(ThemeCtx);
  const {suppliers,tickets} = state;
  const [sel,setSel]=useState(null);
  const [editId,setEditId]=useState(null);
  const [adding,setAdding]=useState(false);
  const [confirm,setConfirm]=useState(null);
  const empty={nombre:"",categoria:"heavy",especialidad:"",entregaDias:1,confiabilidad:85,contacto:"",correo:"",horario:"",cobertura:"",scoreOp:80,incidencias:0};
  const [form,setForm]=useState(empty);
  const sf=k=>v=>setForm(p=>({...p,[k]:v}));

  const stats=useCallback(id=>{
    const so=tickets.filter(t=>t.supplierId===id);
    return{total:so.length,neta:so.reduce((s,t)=>s+(t.snap?.uNeta||0),0)};
  },[tickets]);

  const startAdd=()=>{setAdding(true);setEditId(null);setSel(null);setForm(empty);window.scrollTo(0,0);};
  const startEdit=(s)=>{setEditId(s.id);setAdding(false);setSel(null);setForm({...s});window.scrollTo(0,0);};
  const cancel=()=>{setAdding(false);setEditId(null);setForm(empty);};
  const save=()=>{
    if(editId){dispatch({type:"SUP_UPDATE",id:editId,patch:form});toast("Proveedor actualizado","success");}
    else{dispatch({type:"SUP_ADD",s:{...form,id:"PRV-"+Date.now().toString().slice(-5)}});toast("Proveedor registrado","success");}
    cancel();
  };
  const del=(s)=>setConfirm(s);
  const showForm=adding||!!editId;

  return (
    <div style={{padding:"14px 14px 8px"}}>
      {confirm&&<Confirm msg={"Eliminar: "+confirm.nombre+"?"} onConfirm={()=>{dispatch({type:"SUP_DELETE",id:confirm.id});setSel(null);setConfirm(null);toast("Eliminado","info");}} onCancel={()=>setConfirm(null)}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.15em",textTransform:"uppercase",fontWeight:700}}>Proveedores · {suppliers.length}</div>
        <button onClick={showForm?cancel:startAdd} style={{padding:"7px 14px",background:showForm?"transparent":C.blue,border:`1px solid ${showForm?C.border:C.blue}`,borderRadius:20,color:showForm?C.t2:C.t1,fontSize:12,fontWeight:700,cursor:"pointer",minHeight:36}}>
          {showForm?"× Cancelar":"+ Nuevo"}
        </button>
      </div>
      {showForm&&(
        <div style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontSize:10,color:C.t3,letterSpacing:"0.15em",marginBottom:10}}>{editId?"EDITAR PROVEEDOR":"NUEVO PROVEEDOR"}</div>
          <MField label="Nombre"          value={form.nombre}        onChange={sf("nombre")}/>
          <MField label="Especialidad"    value={form.especialidad}  onChange={sf("especialidad")}/>
          <MField label="Contacto"        value={form.contacto}      onChange={sf("contacto")}/>
          <MField label="Correo"          value={form.correo}        onChange={sf("correo")} type="email"/>
          <MField label="Horario"         value={form.horario}       onChange={sf("horario")} placeholder="Lun-Sab 07:00-20:00"/>
          <MField label="Cobertura"       value={form.cobertura}     onChange={sf("cobertura")} placeholder="CDMX, Edomex..."/>
          <MField label="Entrega (días)"  value={form.entregaDias}   onChange={sf("entregaDias")} type="number"/>
          <MField label="Confiabilidad"   value={form.confiabilidad} onChange={sf("confiabilidad")} type="number" suffix="/100"/>
          <MField label="Score operativo" value={form.scoreOp}       onChange={sf("scoreOp")} type="number" suffix="/100"/>
          <MField label="Incidencias"     value={form.incidencias}   onChange={sf("incidencias")} type="number"/>
          <MSel   label="Categoría"       value={form.categoria}     onChange={sf("categoria")} options={OP_TYPES.map(o=>({value:o.id,label:o.label}))}/>
          <MBtn label={editId?"Guardar cambios":"Guardar proveedor"} full color={C.t1} bg={C.blue} border={C.blue} onClick={save}/>
        </div>
      )}
      {suppliers.length===0&&!showForm&&<EmptyState icon="🔧" title="Sin proveedores" sub='Agrega el primero con "+ Nuevo"'/>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {suppliers.map(s=>{
          const st=stats(s.id);
          const exp=sel===s.id;
          const confColor=s.confiabilidad>=90?C.green:s.confiabilidad>=75?C.yellow:C.red;
          const scoreColor=s.scoreOp>=80?C.green:s.scoreOp>=60?C.yellow:C.red;
          return (
            <div key={s.id} style={{background:C.bg1,backdropFilter:C.glass,WebkitBackdropFilter:C.glass,border:`1px solid ${exp?C.cyan:C.border}`,borderRadius:14,overflow:"hidden"}}>
              <div onClick={()=>setSel(exp?null:s.id)} style={{padding:"14px 16px",cursor:"pointer"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.t1,marginBottom:2}}>{s.nombre}</div>
                    <div style={{fontSize:11,color:C.t3}}>{s.especialidad||"—"} · {s.cobertura||"—"}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:8}}>
                    <div style={{fontSize:12,color:confColor,fontWeight:700}}>{s.confiabilidad}%</div>
                    <div style={{fontSize:10,color:C.t3}}>confiab.</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:11,color:C.t3}}>{s.entregaDias}d entrega</span>
                  {st.total>0&&<span style={{fontSize:11,color:C.t3}}>{st.total} ops · <span style={{color:st.neta>=0?C.green:C.red,fontWeight:600}}>{mxn(st.neta)}</span></span>}
                </div>
              </div>
              {exp&&(
                <div style={{background:C.bg0,borderTop:`1px solid ${C.border}`,padding:"12px 16px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10,fontSize:11}}>
                    <div style={{color:C.t3}}>Contacto: <span style={{color:C.t2}}>{s.contacto||"—"}</span></div>
                    <div style={{color:C.t3}}>Horario: <span style={{color:C.t2}}>{s.horario||"—"}</span></div>
                    <div style={{color:C.t3}}>Score op: <span style={{color:scoreColor,fontWeight:700}}>{s.scoreOp}</span></div>
                    <div style={{color:C.t3}}>Incidencias: <span style={{color:s.incidencias>0?C.red:C.green,fontWeight:700}}>{s.incidencias}</span></div>
                  </div>
                  {s.correo&&<div style={{fontSize:11,color:C.t3,marginBottom:8}}>Email: <span style={{color:C.cyan}}>{s.correo}</span></div>}
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>startEdit(s)} style={{flex:1,padding:"9px",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,color:C.t1,fontSize:13,cursor:"pointer",fontWeight:600}}>Editar</button>
                    <button onClick={()=>del(s)} style={{padding:"9px 14px",background:"transparent",border:`1px solid ${C.red}44`,borderRadius:10,color:C.red,fontSize:13,cursor:"pointer"}}>Eliminar</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MInteligencia — Inteligencia Operativa IA
// ══════════════════════════════════════════════════════════════════════════════
function MInteligencia({state}) {
  const C = React.useContext(ThemeCtx);
  const A = makeA(C);
  const {tickets=[], clients=[], suppliers=[], units=[]} = state;

  // Inner tab navigation state
  const [iTab, setITab] = useState("unidades");

  // ── AI streaming state (kept as before) ──────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [progress, setProgress] = useState({chars:0, thinkingChars:0});
  const [phase,    setPhase]    = useState("idle");

  // ── Date parse helper ─────────────────────────────────────────────────────
  const parseDate = s => {
    const p = (s||"").split("/");
    return p.length===3 ? new Date(+p[2], +p[1]-1, +p[0]) : null;
  };

  const now = useMemo(() => new Date(), []);

  // ── PANEL 1: Unidades ─────────────────────────────────────────────────────
  const [selectedUnitId, setSelectedUnitId] = useState(null);

  const unidadesData = useMemo(() => {
    // Only concretadas: entregado, facturado, cobrado, cerrado
    const concretadas = tickets.filter(t=>!t._deleted && OPERADO_SET.has(t.status));
    const cutoff90 = new Date(now); cutoff90.setDate(now.getDate()-90);
    return units.map(u => {
      const uTickets = concretadas.filter(t => t.unitId === u.id);
      const gastoAcum = uTickets.reduce((s,t)=>s+safeNumber(t.snap?.costoTotal),0);
      const desembolsoAcum = uTickets.reduce((s,t)=>s+safeNumber(t.snap?.costoTotal)+safeNumber(t.snap?.ivaAcred),0);
      const utilidadGen = uTickets.reduce((s,t)=>s+safeNumber(t.snap?.uNeta),0);
      const revenueAcum = uTickets.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
      const dates = uTickets.map(t=>parseDate(t.date)).filter(Boolean).sort((a,b)=>a-b);
      const lastIncident = dates.length ? dates[dates.length-1] : null;
      const incidentes90d = uTickets.filter(t=>{const d=parseDate(t.date);return d&&d>=cutoff90;}).length;
      let avgDaysBetween = null;
      if(dates.length >= 2) {
        let total = 0;
        for(let i=1;i<dates.length;i++) total += (dates[i]-dates[i-1])/(1000*60*60*24);
        avgDaysBetween = total/(dates.length-1);
      }
      const cl = clients.find(c=>c.id===u.clientId);
      const alert = uTickets.length>5 || gastoAcum>50000 || incidentes90d>3;
      const sortedOps = [...uTickets].sort((a,b)=>{
        const da=parseDate(a.date), db=parseDate(b.date);
        return db-da;
      });
      return {unit:u, cl, ticketCount:uTickets.length, gastoAcum, desembolsoAcum, utilidadGen, revenueAcum,
              lastIncident, incidentes90d, avgDaysBetween, alert, ops:sortedOps};
    }).sort((a,b)=>b.gastoAcum-a.gastoAcum);
  }, [tickets, units, clients, now]);

  // ── PANEL 2: Proveedores ──────────────────────────────────────────────────
  const proveedoresData = useMemo(() => {
    const active = tickets.filter(t=>!t._deleted);
    const concretados = active.filter(t=>OPERADO_SET.has(t.status));
    return suppliers.filter(s=>s.id).map(s => {
      const sTickets = active.filter(t=>t.supplierId===s.id);
      const sConcretados = concretados.filter(t=>t.supplierId===s.id);
      const ticketCount = sTickets.length;
      const revenue = sConcretados.reduce((acc,t)=>acc+safeNumber(t.snap?.precioConIVA),0);
      const utilidad = sConcretados.reduce((acc,t)=>acc+safeNumber(t.snap?.uNeta),0);
      const tasaExito = ticketCount>0 ? (sConcretados.length/ticketCount)*100 : 0;
      return {supplier:s, ticketCount, concretadosCount:sConcretados.length, revenue, utilidad, tasaExito};
    }).filter(d=>d.ticketCount>0).sort((a,b)=>b.revenue-a.revenue);
  }, [tickets, suppliers]);

  // ── PANEL 3: Clientes ─────────────────────────────────────────────────────
  const clientesData = useMemo(() => {
    const active = tickets.filter(t=>!t._deleted);
    const operados = active.filter(t=>OPERADO_SET.has(t.status));
    const cartera = active.filter(t=>CARTERA_SET.has(t.status));
    return clients.map(cl => {
      const clOps = operados.filter(t=>t.clientId===cl.id);
      const clCart = cartera.filter(t=>t.clientId===cl.id);
      const revenue = clOps.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
      const utilidad = clOps.reduce((s,t)=>s+safeNumber(t.snap?.uNeta),0);
      const cartPending = clCart.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
      const ticketCount = clOps.length;
      const ticketPromedio = ticketCount>0 ? revenue/ticketCount : 0;
      // Puntualidad: credit tickets paid on time
      const creditTkts = clOps.filter(t=>t.payType==="credito");
      let puntualidad = null;
      if(creditTkts.length>0) {
        const creditDays = safeNumber(cl.creditDays,30);
        const onTime = creditTkts.filter(t=>{
          if(!t.cobrado) return false;
          const tDate = parseDate(t.date);
          const pDate = t.promesaPago ? parseDate(t.promesaPago) : null;
          if(!tDate) return false;
          const deadline = pDate || new Date(tDate.getTime()+creditDays*86400000);
          const cobroEv = (t.timeline||[]).find(e=>(e.evento||"").toLowerCase().includes("cobrado"));
          if(!cobroEv?.ts) return true; // sin evidencia de fecha real, asumir a tiempo
          const cobroDate = new Date(cobroEv.ts);
          return !isNaN(cobroDate) && cobroDate<=deadline;
        });
        puntualidad = (onTime.length/creditTkts.length)*100;
      }
      let score = "D";
      if(revenue>30000 && utilidad>8000) score="A";
      else if(revenue>10000) score="B";
      else if(revenue>3000) score="C";
      return {cl, revenue, utilidad, cartPending, ticketCount, ticketPromedio, puntualidad, score};
    }).filter(d=>d.ticketCount>0 || d.cartPending>0);
  }, [tickets, clients]);

  // ── PANEL 4: Dos Embudos — Operativo + Cobranza ──────────────────────────
  const pipelineData = useMemo(() => {
    const all    = tickets.filter(t=>!t._deleted);
    const noCanc = all.filter(t=>t.status!=="cancelado");
    const cancelled = all.filter(t=>t.status==="cancelado");
    const parseTS = ts => { try { return new Date(ts); } catch { return null; } };
    const findEv  = (tl, kw) => {
      const ev=(tl||[]).find(e=>(e.evento||"").toLowerCase().includes(kw));
      return ev ? parseTS(ev.ts) : null;
    };
    const avg = arr => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : null;
    const fmtH = h => h===null?"—": h<48?`${h.toFixed(1)}h`:`${(h/24).toFixed(1)}d`;

    // ── Embudo Operativo: acumulativo (tickets que llegaron a esa etapa o más) ──
    const opOrder = ["recibido","validando","sourcing","cotizado","autorizado","entregado"];
    const opSets = {
      recibido:   new Set([...TICKET_PIPELINE, ...Array.from(OPERADO_SET)]),
      validando:  new Set(["validando","sourcing","cotizado","autorizado","comprado","transito","entregado","facturado","cobrado","cerrado"]),
      sourcing:   new Set(["sourcing","cotizado","autorizado","comprado","transito","entregado","facturado","cobrado","cerrado"]),
      cotizado:   new Set(["cotizado","autorizado","comprado","transito","entregado","facturado","cobrado","cerrado"]),
      autorizado: new Set(["autorizado","comprado","transito","entregado","facturado","cobrado","cerrado"]),
      entregado:  OPERADO_SET,
    };
    const opLabel = {recibido:"Recibido",validando:"Validando",sourcing:"Sourcing",cotizado:"Cotizado",autorizado:"Autorizado",entregado:"Entregado"};

    const opCounts = {}; const opRevs = {};
    opOrder.forEach(s=>{
      const ts = noCanc.filter(t=>opSets[s].has(t.status));
      opCounts[s]=ts.length;
      opRevs[s]=ts.reduce((acc,t)=>acc+safeNumber(t.snap?.precioConIVA),0);
    });

    let bkIdx=0, bigDrop=0;
    const opStages = opOrder.map((s,i)=>{
      const count=opCounts[s];
      const prev = i>0 ? opCounts[opOrder[i-1]] : count;
      const convPct = i===0 ? 100 : (prev>0?(count/prev)*100:0);
      const lost = i>0 ? prev-count : 0;
      const lostRev = i>0 ? opRevs[opOrder[i-1]]-opRevs[s] : 0;
      const drop = prev-count;
      if(drop>bigDrop){bigDrop=drop;bkIdx=i;}
      return {key:s, label:opLabel[s], count, convPct, lost, lostRev, isBottleneck:false};
    });
    if(bigDrop>0) opStages[bkIdx].isBottleneck=true;

    // ── Tiempos por etapa (desde timeline) ──
    const times={recVal:[],valSrc:[],srcCot:[],cotAut:[],autEnt:[],total:[]};
    noCanc.forEach(t=>{
      const tl=t.timeline||[];
      const rec = findEv(tl,"solicitud recibida")||findEv(tl,"ticket creado")||parseDate(t.date);
      const val = findEv(tl,"estado: validando");
      const src = findEv(tl,"estado: sourcing");
      const cot = findEv(tl,"estado: cotizado");
      const aut = findEv(tl,"estado: autorizado");
      const ent = findEv(tl,"estado: entregado");
      if(rec&&val&&val>rec) times.recVal.push((val-rec)/3600000);
      if(val&&src&&src>val) times.valSrc.push((src-val)/3600000);
      if(src&&cot&&cot>src) times.srcCot.push((cot-src)/3600000);
      else if(rec&&cot&&cot>rec&&!src) times.srcCot.push((cot-rec)/3600000);
      if(cot&&aut&&aut>cot) times.cotAut.push((aut-cot)/3600000);
      if(aut&&ent&&ent>aut) times.autEnt.push((ent-aut)/3600000);
      if(rec&&ent&&ent>rec) times.total.push((ent-rec)/3600000);
    });
    const stageTimings=[
      {label:"Recibido → Validando",   avg:avg(times.recVal),  fmt:fmtH(avg(times.recVal)),  n:times.recVal.length,  hot:true},
      {label:"Validando → Sourcing",   avg:avg(times.valSrc),  fmt:fmtH(avg(times.valSrc)),  n:times.valSrc.length,  hot:true},
      {label:"Sourcing → Cotizado",    avg:avg(times.srcCot),  fmt:fmtH(avg(times.srcCot)),  n:times.srcCot.length,  hot:true},
      {label:"Cotizado → Autorizado",  avg:avg(times.cotAut),  fmt:fmtH(avg(times.cotAut)),  n:times.cotAut.length,  hot:false},
      {label:"Autorizado → Entregado", avg:avg(times.autEnt),  fmt:fmtH(avg(times.autEnt)),  n:times.autEnt.length,  hot:false},
      {label:"Tiempo total rec→ent",   avg:avg(times.total),   fmt:fmtH(avg(times.total)),   n:times.total.length,   hot:false},
    ];

    // ── Embudo de Cobranza ──
    const cobOrder = ["entregado","facturado","cobrado"];
    const cobSets = {
      entregado: OPERADO_SET,
      facturado: new Set(["facturado","cobrado","cerrado"]),
      cobrado:   CASH_SET,
    };
    const cobLabel={entregado:"Entregado",facturado:"Facturado",cobrado:"Cobrado"};
    const cobCounts={}; const cobRevs={};
    cobOrder.forEach(s=>{
      const ts=all.filter(t=>cobSets[s].has(t.status));
      cobCounts[s]=ts.length;
      cobRevs[s]=ts.reduce((acc,t)=>acc+safeNumber(t.snap?.precioConIVA),0);
    });
    const cobStages=cobOrder.map((s,i)=>{
      const count=cobCounts[s];
      const prev=i>0?cobCounts[cobOrder[i-1]]:count;
      const convPct=i===0?100:(prev>0?(count/prev)*100:0);
      const pendingRev=i>0?cobRevs[cobOrder[i-1]]-cobRevs[s]:0;
      return {key:s,label:cobLabel[s],count,convPct,pendingRev};
    });

    // Cartera vencida
    const carteraTkts=all.filter(t=>CARTERA_SET.has(t.status));
    const carteraTotal=carteraTkts.reduce((acc,t)=>acc+safeNumber(t.snap?.precioConIVA),0);
    const todayMs=now.getTime();
    const vencidaTkts=carteraTkts.filter(t=>{
      const d=parseDate(t.promesaPago);
      return d && d.getTime()<todayMs;
    });
    const carteraVencida=vencidaTkts.reduce((acc,t)=>acc+safeNumber(t.snap?.precioConIVA),0);

    // Días promedio de cobro (facturado → cobrado)
    const cobDays=[];
    all.filter(t=>CASH_SET.has(t.status)).forEach(t=>{
      const tl=t.timeline||[];
      const facD=findEv(tl,"estado: facturado");
      const cobD=findEv(tl,"estado: cobrado");
      if(facD&&cobD&&cobD>facD) cobDays.push((cobD-facD)/86400000);
    });
    const avgCobDays=avg(cobDays);

    // Top clientes por saldo pendiente
    const byClient={};
    carteraTkts.forEach(t=>{
      const v=safeNumber(t.snap?.precioConIVA);
      if(!byClient[t.clientId]) byClient[t.clientId]={clientId:t.clientId,total:0,count:0};
      byClient[t.clientId].total+=v;
      byClient[t.clientId].count++;
    });
    const topDeudores=Object.values(byClient).sort((a,b)=>b.total-a.total).slice(0,5);

    // Revenue perdido por cancelados
    const cancelRevenue=cancelled.reduce((acc,t)=>acc+safeNumber(t.snap?.precioConIVA),0);

    return {
      opStages, stageTimings, opTotal:opCounts.recibido||0,
      cancelCount:cancelled.length, cancelRevenue,
      cobStages, carteraTotal, carteraVencida, avgCobDays,
      topDeudores, cobTotal:cobCounts.entregado||0,
    };
  }, [tickets, now]);

  // ── PANEL 5 & 6: Partes ───────────────────────────────────────────────────
  const partesData = useMemo(() => {
    // Excluye eliminados. Cancelados SÍ cuentan (demanda real aunque no se concretó)
    const cutoff90 = new Date(now); cutoff90.setDate(now.getDate()-90);
    const partsMap = {};
    const norm = s => (s||"").toLowerCase().trim().replace(/\s+/g," ");
    // Clave invariante al orden de palabras: "kit primer sayer" y "primer sayer kit" → misma entrada
    const normKey = s => norm(s).split(" ").sort().join(" ");
    tickets.filter(t => !t._deleted).forEach(t => {
      const tDate = parseDate(t.date);
      const rev = safeNumber(t.snap?.precioConIVA);
      const util = safeNumber(t.snap?.uNeta);
      // Colectar nombres únicos por ticket para evitar doble conteo (titulo = lineas[0])
      const seenInTicket = new Set();
      const addPart = (name) => {
        const display = norm(name);
        const key = normKey(name);
        if(!key || key.length<3 || seenInTicket.has(key)) return;
        seenInTicket.add(key);
        if(!partsMap[key]) partsMap[key] = {name:display, freq:0, revenue:0, utilidad:0, lastDate:null};
        partsMap[key].freq++;
        partsMap[key].revenue += rev/Math.max(1,(t.lineas?.length||1));
        partsMap[key].utilidad += util/Math.max(1,(t.lineas?.length||1));
        if(tDate && (!partsMap[key].lastDate || tDate>partsMap[key].lastDate))
          partsMap[key].lastDate = tDate;
      };
      if(t.titulo) addPart(t.titulo);
      if(Array.isArray(t.lineas)) {
        t.lineas.forEach(l => {
          if(l.titulo) addPart(l.titulo);
          if(l.partRef) addPart(l.partRef);
        });
      }
    });
    const sorted = Object.values(partsMap).sort((a,b)=>b.freq-a.freq||b.revenue-a.revenue);
    const top15 = sorted.slice(0,15);
    const sugeridas = sorted.filter(p => p.freq>=3 && p.lastDate && p.lastDate>=cutoff90)
      .sort((a,b)=>b.freq-a.freq).slice(0,10)
      .map(p => ({
        ...p,
        avgRevPerTicket: p.freq>0 ? p.revenue/p.freq : 0,
      }));
    return {top15, sugeridas};
  }, [tickets, now]);

  // ── PANEL 7: KPIs Operativos ──────────────────────────────────────────────
  const kpisOpData = useMemo(() => {
    const active = tickets.filter(t=>!t._deleted);
    const parseTS = ts => { try { return new Date(ts); } catch{ return null; } };
    const findEvent = (timeline, keyword) => {
      const ev = (timeline||[]).find(e => (e.evento||"").toLowerCase().includes(keyword.toLowerCase()));
      return ev ? parseTS(ev.ts) : null;
    };
    const times = {validacion:[], cotizacion:[], entrega:[], cobro:[]};
    active.forEach(t => {
      const tl = t.timeline||[];
      const creado = findEvent(tl, "ticket creado") || parseDate(t.date);
      const cotizado = findEvent(tl, "estado: cotizado");
      const autorizado = findEvent(tl, "estado: autorizado");
      const entregado = findEvent(tl, "estado: entregado");
      const facturado = findEvent(tl, "estado: facturado");
      const cobrado = findEvent(tl, "estado: cobrado");
      const sourcingOrCot = findEvent(tl,"estado: sourcing") || cotizado;
      if(creado && sourcingOrCot && sourcingOrCot>creado)
        times.validacion.push((sourcingOrCot-creado)/3600000);
      if(creado && cotizado && cotizado>creado)
        times.cotizacion.push((cotizado-creado)/3600000);
      if(autorizado && entregado && entregado>autorizado)
        times.entrega.push((entregado-autorizado)/3600000);
      if(facturado && cobrado && cobrado>facturado)
        times.cobro.push((cobrado-facturado)/3600000);
    });
    const avg = arr => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : null;
    const fmtHrs = h => {
      if(h===null) return "—";
      if(h<48) return `${h.toFixed(1)}h`;
      return `${(h/24).toFixed(1)}d`;
    };
    return [
      {label:"Validación",    key:"validacion", hrs:avg(times.validacion),  fmt:fmtHrs(avg(times.validacion)),  n:times.validacion.length},
      {label:"Cotización",    key:"cotizacion", hrs:avg(times.cotizacion),  fmt:fmtHrs(avg(times.cotizacion)),  n:times.cotizacion.length},
      {label:"Entrega",       key:"entrega",    hrs:avg(times.entrega),     fmt:fmtHrs(avg(times.entrega)),     n:times.entrega.length},
      {label:"Cobro",         key:"cobro",      hrs:avg(times.cobro),       fmt:fmtHrs(avg(times.cobro)),       n:times.cobro.length},
    ];
  }, [tickets]);

  // ── PANEL 8: Alertas Estratégicas ────────────────────────────────────────
  const alertasData = useMemo(() => {
    const active = tickets.filter(t=>!t._deleted);
    const operados = active.filter(t=>OPERADO_SET.has(t.status));
    const cartera = active.filter(t=>CARTERA_SET.has(t.status));
    const alerts = [];

    // 1. Concentración de cliente
    const totalRev = operados.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
    if(totalRev>0) {
      const clientRevs = {};
      operados.forEach(t=>{ if(t.clientId) clientRevs[t.clientId]=(clientRevs[t.clientId]||0)+safeNumber(t.snap?.precioConIVA); });
      const topEntry = Object.entries(clientRevs).sort((a,b)=>b[1]-a[1])[0];
      if(topEntry) {
        const pct = (topEntry[1]/totalRev)*100;
        if(pct>50) {
          const cl = clients.find(c=>c.id===topEntry[0]);
          alerts.push({
            sev:"warning", icon:"⚠",
            title:"Concentración de cliente",
            desc:`${cl?.empresa||topEntry[0]} representa el ${fpct(pct)} del revenue total.`,
            action:"Diversificar cartera de clientes para reducir dependencia.",
          });
        }
      }
    }

    // 2. Concentración de proveedor
    const totalCost = operados.reduce((s,t)=>s+safeNumber(t.snap?.costoTotal),0);
    if(totalCost>0) {
      const suppCosts = {};
      operados.forEach(t=>{ if(t.supplierId) suppCosts[t.supplierId]=(suppCosts[t.supplierId]||0)+safeNumber(t.snap?.costoTotal); });
      const topSupp = Object.entries(suppCosts).sort((a,b)=>b[1]-a[1])[0];
      if(topSupp) {
        const pct = (topSupp[1]/totalCost)*100;
        if(pct>50) {
          const sp = suppliers.find(s=>s.id===topSupp[0]);
          alerts.push({
            sev:"warning", icon:"⚠",
            title:"Concentración de proveedor",
            desc:`${sp?.nombre||topSupp[0]} representa el ${fpct(pct)} del costo total.`,
            action:"Evaluar proveedores alternativos para reducir riesgo de cadena de suministro.",
          });
        }
      }
    }

    // 3. Unidades con gasto excesivo (solo operaciones concretadas)
    const cutoff90 = new Date(now); cutoff90.setDate(now.getDate()-90);
    units.forEach(u => {
      const uTkts = operados.filter(t=>t.unitId===u.id);
      const gasto = uTkts.reduce((s,t)=>s+safeNumber(t.snap?.costoTotal),0);
      if(gasto>50000) {
        const cl = clients.find(c=>c.id===u.clientId);
        alerts.push({
          sev:"red", icon:"🔴",
          title:"Unidad con gasto excesivo",
          desc:`${u.economico} (${u.marca} ${u.modelo}) — ${cl?.empresa||"sin cliente"} — Gasto acumulado: ${mxn(gasto)}`,
          action:"Evaluar si es más rentable la sustitución de la unidad.",
        });
      }
    });

    // 4. Cartera vencida
    const vencidos = cartera.filter(t=>{
      if(!t.promesaPago) return false;
      const d = parseDate(t.promesaPago);
      return d && now>d;
    });
    if(vencidos.length>0) {
      const montoVencido = vencidos.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
      alerts.push({
        sev:"red", icon:"🔴",
        title:"Cartera vencida",
        desc:`${vencidos.length} ticket(s) vencidos por ${mxn(montoVencido)} fuera de fecha de pago.`,
        action:"Contactar clientes con saldo vencido. Priorizar cobro inmediato.",
      });
    }

    // 5. Caída de margen (últimos 7d vs 7d anteriores)
    const from7 = new Date(now); from7.setDate(now.getDate()-7);
    const from14 = new Date(now); from14.setDate(now.getDate()-14);
    const last7 = operados.filter(t=>{const d=parseDate(t.date);return d&&d>=from7;});
    const prev7 = operados.filter(t=>{const d=parseDate(t.date);return d&&d>=from14&&d<from7;});
    if(last7.length>0 && prev7.length>0) {
      const avgM = arr => {
        const s = arr.reduce((acc,t)=>{
          const p=safeNumber(t.snap?.precioConIVA);
          const u=safeNumber(t.snap?.uNeta);
          return acc+(p>0?(u/p)*100:0);
        },0);
        return s/arr.length;
      };
      const mLast=avgM(last7), mPrev=avgM(prev7);
      if(mPrev>0 && (mPrev-mLast)>5) {
        alerts.push({
          sev:"warning", icon:"⚠",
          title:"Caída de margen",
          desc:`Margen promedio bajó ${fpct(mPrev-mLast)} en los últimos 7 días (${fpct(mPrev)} → ${fpct(mLast)}).`,
          action:"Revisar cotizaciones recientes. Verificar si se están aplicando correctamente los modificadores.",
        });
      }
    }

    // 6. Sin cobro en 30+ días
    const from30 = new Date(now); from30.setDate(now.getDate()-30);
    const cartera30 = cartera.filter(t=>{const d=parseDate(t.date);return d&&d<=from30;});
    if(cartera30.length>0) {
      const monto30 = cartera30.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
      alerts.push({
        sev:"warning", icon:"⚠",
        title:`Sin cobro en 30+ días`,
        desc:`${cartera30.length} ticket(s) en cartera con más de 30 días sin cobrar — ${mxn(monto30)}.`,
        action:"Revisar términos de pago y activar proceso de cobranza preventiva.",
      });
    }

    return alerts;
  }, [tickets, clients, suppliers, units, now]);

  // ── PANEL 9: Sourceabilidad ───────────────────────────────────────────────
  const sourceoData = useMemo(() => {
    const parseTS = ts => { try { return new Date(ts); } catch{ return null; } };
    const findTL = (tl,kw) => (tl||[]).find(e=>(e.evento||"").toLowerCase().includes(kw.toLowerCase()));
    const active = tickets.filter(t=>!t._deleted);
    const sourceoTimes = [];

    active.forEach(t => {
      if(!t.supplierId) return;
      const tl = t.timeline||[];
      const creadoEv = findTL(tl,"creado") || findTL(tl,"solicitud recibida");
      const provEv   = findTL(tl,"proveedor") || findTL(tl,"localizado") || findTL(tl,"sourcing");
      const creadoTS = creadoEv ? parseTS(creadoEv.ts) : (parseDate(t.date) ? (() => { const d=parseDate(t.date); return new Date(d.getFullYear(),d.getMonth(),d.getDate(),8,0); })() : null);
      const provTS   = provEv ? parseTS(provEv.ts) : null;
      if(creadoTS && provTS && provTS > creadoTS) {
        const horas = (provTS - creadoTS) / 3600000;
        if(horas < 168) sourceoTimes.push({horas, titulo:t.titulo||"", id:t.id, supplierId:t.supplierId});
      }
    });

    const avg = arr => arr.length ? arr.reduce((s,v)=>s+v,0)/arr.length : null;
    const med = arr => { if(!arr.length) return null; const s=[...arr].sort((a,b)=>a-b); const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2; };
    const fmtH = h => h===null?"—":h<48?`${h.toFixed(1)}h`:`${(h/24).toFixed(1)}d`;
    const horas = sourceoTimes.map(s=>s.horas);

    // Por parte: agrupar por titulo normalizado
    const norm = s=>(s||"").toLowerCase().trim().replace(/\s+/g," ");
    const parteMap = {};
    sourceoTimes.forEach(({horas:h,titulo}) => {
      const k=norm(titulo); if(!k||k.length<3) return;
      if(!parteMap[k]) parteMap[k]={name:k,times:[],freq:0};
      parteMap[k].times.push(h); parteMap[k].freq++;
    });
    const partesSorted = Object.values(parteMap).map(p=>({...p,avgH:avg(p.times)||0})).sort((a,b)=>b.avgH-a.avgH);

    // Familias
    const familias = {};
    FAMILIAS_DEF.forEach(f=>{familias[f.key]={label:f.label,ops:0,revenue:0,utilidad:0,times:[]};});
    familias["otros"]={label:"Otros",ops:0,revenue:0,utilidad:0,times:[]};
    active.filter(t=>OPERADO_SET.has(t.status)).forEach(t=>{
      const fk = classifyFamilia(t.titulo);
      if(!familias[fk]) familias[fk]={label:fk,ops:0,revenue:0,utilidad:0,times:[]};
      familias[fk].ops++;
      familias[fk].revenue+=safeNumber(t.snap?.precioConIVA);
      familias[fk].utilidad+=safeNumber(t.snap?.uNeta);
      const st=sourceoTimes.find(s=>s.id===t.id);
      if(st) familias[fk].times.push(st.horas);
    });
    const familiasArr = Object.entries(familias).map(([k,v])=>({...v,key:k,avgSourcH:avg(v.times)})).filter(f=>f.ops>0).sort((a,b)=>b.revenue-a.revenue);

    return {
      promedio:avg(horas), mediana:med(horas), mejor:horas.length?Math.min(...horas):null,
      peor:horas.length?Math.max(...horas):null, n:horas.length,
      fmtH, partesDificiles:partesSorted.slice(0,10), familias:familiasArr,
      masResueltas: Object.values(parteMap).sort((a,b)=>b.freq-a.freq).slice(0,10),
    };
  }, [tickets]);

  // ── PANEL 12: Oportunidad Perdida ─────────────────────────────────────────
  const cancelData = useMemo(() => {
    const cancelled = tickets.filter(t=>!t._deleted && t.status==="cancelado");
    const byMotivo = {};
    cancelled.forEach(t => {
      const m = t.cancelReason || "sin motivo";
      if(!byMotivo[m]) byMotivo[m]={motivo:m,count:0,revenue:0};
      byMotivo[m].count++;
      byMotivo[m].revenue+=safeNumber(t.snap?.precioConIVA);
    });
    const sorted = Object.values(byMotivo).sort((a,b)=>b.revenue-a.revenue);
    const totalRevLost = cancelled.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
    return {cancelled, sorted, total:cancelled.length, totalRevLost};
  }, [tickets]);

  // ── Dinero: posición financiera agregada ─────────────────────────────────
  const dineroData = useMemo(() => {
    const active = tickets.filter(t=>!t._deleted);
    const operados = active.filter(t=>OPERADO_SET.has(t.status));
    const carteraTkts = active.filter(t=>CARTERA_SET.has(t.status));
    const forecastTkts = active.filter(t=>FORECAST_SET.has(t.status));
    const pipelineTkts = active.filter(t=>PIPELINE_SET.has(t.status));
    const from30 = new Date(now); from30.setDate(now.getDate()-30);
    const from90 = new Date(now); from90.setDate(now.getDate()-90);
    const ops30 = operados.filter(t=>{const d=parseDate(t.date);return d&&d>=from30;});
    const ops90 = operados.filter(t=>{const d=parseDate(t.date);return d&&d>=from90;});
    const sum = (arr,f) => arr.reduce((s,t)=>s+safeNumber(t.snap?.[f]),0);
    const avgM = arr => arr.length>0 ? arr.reduce((s,t)=>{
      const p=safeNumber(t.snap?.precioConIVA),u=safeNumber(t.snap?.uNeta);
      return s+(p>0?(u/p)*100:0);
    },0)/arr.length : 0;
    return {
      totalRevenue: sum(operados,'precioConIVA'), totalUtilidad: sum(operados,'uNeta'),
      avgMargen: avgM(operados),
      rev30: sum(ops30,'precioConIVA'), util30: sum(ops30,'uNeta'), avgMargen30: avgM(ops30),
      rev90: sum(ops90,'precioConIVA'), util90: sum(ops90,'uNeta'),
      cartera: sum(carteraTkts,'precioConIVA'), carteraCount: carteraTkts.length,
      flujoForecast: sum(forecastTkts,'precioConIVA'), flujoForecastCount: forecastTkts.length,
      costoEnProceso: sum(pipelineTkts,'costoTotal'),
    };
  }, [tickets, now]);

  // ── Operación: tickets activos con SLA ───────────────────────────────────
  const operacionData = useMemo(() => {
    const parseTS = ts=>{try{return new Date(ts);}catch{return null;}};
    const nowMs = now.getTime();
    const active = tickets.filter(t=>!t._deleted && !["cancelado","cerrado","cobrado"].includes(t.status));
    return active.map(t=>{
      const tl = t.timeline||[];
      const lastEv = tl.length>0 ? parseTS(tl[tl.length-1].ts) : null;
      const ref = lastEv || parseDate(t.date) || now;
      const horasSinMovimiento = (nowMs - ref.getTime())/3600000;
      const diasSinMovimiento = horasSinMovimiento/24;
      const cl = clients.find(c=>c.id===t.clientId);
      return {t, cl, rev:safeNumber(t.snap?.precioConIVA), util:safeNumber(t.snap?.uNeta),
        horasSinMovimiento, diasSinMovimiento, stalled:horasSinMovimiento>72};
    }).sort((a,b)=>b.horasSinMovimiento-a.horasSinMovimiento);
  }, [tickets, clients, now]);

  // ── Global KPIs ───────────────────────────────────────────────────────────
  const gKpi_concretadas = useMemo(()=>tickets.filter(t=>!t._deleted&&OPERADO_SET.has(t.status)).length,[tickets]);
  const gKpi_total       = useMemo(()=>tickets.filter(t=>!t._deleted).length,[tickets]);
  const gKpi_resolucion  = gKpi_total>0 ? (gKpi_concretadas/gKpi_total)*100 : 0;
  const gKpi_primeraResp = useMemo(()=>{
    const parseTS = ts=>{try{return new Date(ts);}catch{return null;}};
    const times=[];
    tickets.filter(t=>!t._deleted).forEach(t=>{
      const tl=t.timeline||[];
      if(tl.length<2) return;
      const t0=parseTS(tl[0].ts);
      const t1=parseTS(tl[1].ts);
      if(t0&&t1&&t1>t0){const h=(t1-t0)/3600000;if(h<168)times.push(h);}
    });
    if(!times.length) return null;
    return times.reduce((s,v)=>s+v,0)/times.length;
  },[tickets]);
  const fmtH_global = h=>h===null?"—":h<48?`${h.toFixed(1)}h`:`${(h/24).toFixed(1)}d`;

  // ── AI payload — enriched with panel context ──────────────────────────────
  const aiPayload = useMemo(() => {
    const active = tickets.filter(t=>!t._deleted);
    const now2 = new Date();
    const from30 = new Date(now2); from30.setDate(now2.getDate()-30);
    const ops30 = active.filter(t=>{
      const d=parseDate(t.date);
      return OPERADO_SET.has(t.status)&&d&&d>=from30&&d<=now2;
    });
    const totalRevenue = ops30.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
    const utilNeta     = ops30.reduce((s,t)=>s+safeNumber(t.snap?.uNeta),0);
    const avgMargin    = ops30.length>0
      ? ops30.reduce((s,t)=>{
          const p=safeNumber(t.snap?.precioConIVA),u=safeNumber(t.snap?.uNeta);
          return s+(p>0?(u/p)*100:0);
        },0)/ops30.length
      : 0;
    const statusBreakdown={};
    active.forEach(t=>{ statusBreakdown[t.status]=(statusBreakdown[t.status]||0)+1; });
    const clientRevMap={};
    ops30.forEach(t=>{
      if(!t.clientId) return;
      if(!clientRevMap[t.clientId]) clientRevMap[t.clientId]={revenue:0,ticketCount:0};
      clientRevMap[t.clientId].revenue+=safeNumber(t.snap?.precioConIVA);
      clientRevMap[t.clientId].ticketCount+=1;
    });
    const topClients=Object.entries(clientRevMap)
      .map(([id,d])=>({empresa:clients.find(c=>c.id===id)?.empresa||id,...d}))
      .sort((a,b)=>b.revenue-a.revenue).slice(0,3);
    const carteraTkts=active.filter(t=>CARTERA_SET.has(t.status));
    const carteraTotal=carteraTkts.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);

    // Enrichment from panels
    const topUnit = unidadesData[0];
    const topClient = clientesData.sort((a,b)=>b.revenue-a.revenue)[0];
    const bottleneck = pipelineData.opStages.find(s=>s.isBottleneck);
    const partInventorySuggestions = partesData.sugeridas.slice(0,3).map(p=>p.name);
    const cartVencida = alertasData.filter(a=>a.title==="Cartera vencida")[0];
    const clientConc = topClients[0] && totalRevenue>0 ? (topClients[0].revenue/totalRevenue)*100 : 0;
    const deliveryKpi = kpisOpData.find(k=>k.key==="entrega");

    const questions = [
      "1. ¿Qué categoría de refacciones/familias dominamos mejor?",
      "2. ¿Qué proveedor es estratégico y no podemos perder?",
      "3. ¿Qué proveedor deberíamos reemplazar o reducir dependencia?",
      "4. ¿Qué cliente tiene el mayor potencial de crecimiento?",
      "5. ¿Qué causa más pérdida de operaciones (revenue perdido)?",
      "6. ¿Qué componente deberíamos almacenar en inventario permanente?",
      "7. ¿Qué componente es el más difícil de conseguir y qué hacer?",
      "8. ¿Dónde estamos perdiendo más tiempo en el proceso?",
      "9. ¿Cuál es nuestra verdadera ventaja competitiva operativa?",
    ];

    return {
      period:"Últimos 30 días",
      kpis:{totalRevenue,utilNeta,avgMargin,ticketCount:ops30.length},
      statusBreakdown,
      topClients,
      cartera:{total:carteraTotal,count:carteraTkts.length},
      context:{
        topUnit: topUnit ? `${topUnit.unit.economico} ${topUnit.unit.marca} — gasto ${mxn(topUnit.gastoAcum)}` : null,
        topClient: topClient ? `${topClient.cl.empresa} — revenue ${mxn(topClient.revenue)}` : null,
        bottleneck: bottleneck ? `Etapa "${bottleneck.label}" (${fpct(bottleneck.convPct)} conversión)` : null,
        partInventorySuggestions,
        cartVencida: cartVencida ? cartVencida.desc : null,
        clientConcentration: fpct(clientConc),
        avgTimeToDeliver: deliveryKpi ? deliveryKpi.fmt : null,
      },
      analysisQuestions: questions,
      resolucionOperativa: `${gKpi_resolucion.toFixed(0)}%`,
      timeraPrimeraRespuesta: fmtH_global(gKpi_primeraResp),
      sourceoPromedio: sourceoData ? sourceoData.fmtH(sourceoData.promedio) : null,
      familiaDominante: sourceoData?.familias?.[0]?.label || null,
      cancelaciones: cancelData.total,
      principalMotivoCancelacion: cancelData.sorted?.[0]?.motivo || null,
    };
  }, [tickets, clients, unidadesData, clientesData, pipelineData, partesData, alertasData, kpisOpData, sourceoData, cancelData, gKpi_resolucion, gKpi_primeraResp]);

  // ── Streaming AI call ─────────────────────────────────────────────────────
  const runAnalysis = async () => {
    setLoading(true); setResult(null); setError(null);
    setProgress({chars:0,thinkingChars:0}); setPhase("thinking");
    try {
      const resp = await fetch("/api/ai/insights",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({payload:aiPayload}),
      });
      if(!resp.ok) {
        if(resp.status===503) setError("El módulo de IA no está habilitado en este entorno.");
        else { const j=await resp.json().catch(()=>({})); setError(j.error||`Error ${resp.status}`); }
        setPhase("error"); setLoading(false); return;
      }
      const reader=resp.body.getReader(); const dec=new TextDecoder(); let buf="";
      while(true) {
        const {done,value}=await reader.read(); if(done) break;
        buf+=dec.decode(value,{stream:true});
        const lines=buf.split("\n"); buf=lines.pop();
        for(const line of lines) {
          if(!line.startsWith("data: ")) continue;
          try {
            const ev=JSON.parse(line.slice(6));
            if(ev.type==="thinking"){setPhase("thinking");setProgress({chars:ev.chars||0,thinkingChars:ev.thinkingChars||0});}
            else if(ev.type==="progress"){setPhase("generating");setProgress({chars:ev.chars||0,thinkingChars:ev.thinkingChars||0});}
            else if(ev.type==="result"&&ev.done){setResult(ev.result);setPhase("done");}
            else if(ev.type==="error"){setError(ev.error||"Error desconocido");setPhase("error");}
          } catch(_) {}
        }
      }
    } catch(e){setError(String(e));setPhase("error");}
    setLoading(false);
  };

  // ── Shared styles helpers ─────────────────────────────────────────────────
  const cardStyle = {background:A.card,backdropFilter:A.blur,WebkitBackdropFilter:A.blur,
    border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px",boxShadow:A.shadowSm};
  const label10 = {fontSize:10,color:C.t3,letterSpacing:"0.12em",textTransform:"uppercase",fontWeight:600};
  const scoreColor = s => ({A:C.green,B:C.blue,C:C.yellow,D:C.red}[s]||C.t3);

  // ── Inner tab pills ─────────────────────────────────────────────────────
  const ITABS = [
    {id:"unidades",       label:"Unidades"},
    {id:"proveedores",    label:"Proveedores"},
    {id:"clientes",       label:"Clientes"},
    {id:"pipeline",       label:"Pipeline"},
    {id:"partes",         label:"Partes"},
    {id:"sourceabilidad", label:"Sourcing"},
    {id:"oportunidad",    label:"Oportunidad"},
    {id:"kpis",           label:"KPIs"},
    {id:"alertas",        label:"Alertas"},
    {id:"ia",             label:"Resumen"},
  ];

  const categoriaColor = cat => ({financiero:C.blue,operativo:C.cyan,cliente:C.yellow,crecimiento:C.green,riesgo:C.red}[cat]||C.t3);
  const urgenciaColor  = u   => ({inmediata:C.red,alta:C.yellow,media:C.cyan,baja:C.t3}[u]||C.t3);
  const impactoColor   = i   => ({alto:C.green,medio:C.yellow,bajo:C.t3}[i]||C.t3);
  const saludColor     = n   => n>=75?C.green:n>=50?C.yellow:C.red;

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{padding:"12px 16px 32px",minHeight:"100vh"}}>

      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
          <span style={{fontSize:20,lineHeight:1}}>✦</span>
          <h2 style={{margin:0,fontSize:19,fontWeight:700,color:C.t1,letterSpacing:"-0.02em"}}>
            Inteligencia Operativa
          </h2>
        </div>
        <p style={{margin:"0 0 12px",fontSize:11,color:C.t3}}>V7 · Capacidad de resolución operativa</p>
        {/* Global KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px"}}>
            <div style={{fontSize:8,fontWeight:700,color:C.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>Resolución Operativa</div>
            <div style={{fontSize:24,fontWeight:800,color:gKpi_resolucion>=70?C.green:gKpi_resolucion>=50?C.yellow:C.red,lineHeight:1.1}}>{gKpi_resolucion.toFixed(0)}%</div>
            <div style={{fontSize:9,color:C.t3,marginTop:2}}>{gKpi_concretadas} de {gKpi_total} solicitudes</div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px"}}>
            <div style={{fontSize:8,fontWeight:700,color:C.t3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:4}}>1ª Respuesta</div>
            <div style={{fontSize:24,fontWeight:800,color:C.blue,lineHeight:1.1}}>{fmtH_global(gKpi_primeraResp)}</div>
            <div style={{fontSize:9,color:C.t3,marginTop:2}}>tiempo promedio</div>
          </div>
        </div>
      </div>

      {/* Inner tab navigation */}
      <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",marginBottom:20,
        scrollbarWidth:"none",msOverflowStyle:"none"}}>
        <div style={{display:"flex",gap:6,paddingBottom:4,width:"max-content"}}>
          {ITABS.map(t=>(
            <button key={t.id} onClick={()=>setITab(t.id)}
              style={{
                padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:600,
                cursor:"pointer",whiteSpace:"nowrap",border:"none",
                touchAction:"manipulation",WebkitTapHighlightColor:"transparent",
                background: iTab===t.id ? A.pillBg : "transparent",
                color:       iTab===t.id ? A.pillColor : C.t3,
                boxShadow:   iTab===t.id ? A.pillShadow : "none",
                outline:     iTab===t.id ? `1.5px solid ${A.pillBorder}` : `1px solid ${A.pillBorderInactive}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── PANEL 1: Unidades ───────────────────────────────────────────────── */}
      {iTab==="unidades" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...label10,marginBottom:4}}>Rendimiento por Unidad · solo operaciones concretadas</div>
          {unidadesData.length===0 && <div style={{color:C.t3,fontSize:13}}>Sin unidades registradas.</div>}
          {unidadesData.map(({unit,cl,ticketCount,gastoAcum,desembolsoAcum,utilidadGen,incidentes90d,avgDaysBetween,alert,ops})=>{
            const isOpen = selectedUnitId === unit.id;
            return (
              <div key={unit.id}>
                <div
                  onClick={()=>setSelectedUnitId(isOpen ? null : unit.id)}
                  style={{
                    ...cardStyle,
                    border:`1.5px solid ${alert?C.red:isOpen?C.blue:C.border}`,
                    cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",
                  }}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:13,fontWeight:700,color:C.t1}}>{unit.economico}</span>
                        <span style={{fontSize:11,color:C.t3}}>{unit.marca} {unit.modelo}</span>
                        {alert && <span style={{fontSize:9,fontWeight:700,color:C.red,background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:6,padding:"2px 6px"}}>ALERTA</span>}
                      </div>
                      <div style={{fontSize:11,color:C.t3,marginTop:2}}>{cl?.empresa||"Sin cliente"} · {unit.anio||"—"}</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{ticketCount} ops</div>
                        <div style={{fontSize:10,color:C.t3}}>{incidentes90d} en 90d</div>
                      </div>
                      <span style={{fontSize:14,color:C.t3,transform:isOpen?"rotate(180deg)":"none",transition:"transform 0.2s",display:"inline-block"}}>▾</span>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
                    <div>
                      <div style={{...label10,fontSize:9}}>Costo Op. <span style={{color:C.t3,fontSize:8}}>(s/IVA)</span></div>
                      <div style={{fontSize:12,fontWeight:700,color:C.red,marginTop:2}}>{mxn(gastoAcum)}</div>
                    </div>
                    <div>
                      <div style={{...label10,fontSize:9,color:C.yellow}}>Desembolso</div>
                      <div style={{fontSize:12,fontWeight:700,color:C.yellow,marginTop:2}}>{mxn(desembolsoAcum)}</div>
                    </div>
                    <div>
                      <div style={{...label10,fontSize:9,color:C.green}}>Utilidad</div>
                      <div style={{fontSize:12,fontWeight:700,color:C.green,marginTop:2}}>{mxn(utilidadGen)}</div>
                    </div>
                    <div>
                      <div style={{...label10,fontSize:9}}>Frec.</div>
                      <div style={{fontSize:12,fontWeight:700,color:C.t2,marginTop:2}}>
                        {avgDaysBetween!==null ? `${avgDaysBetween.toFixed(0)}d` : "—"}
                      </div>
                    </div>
                  </div>
                </div>
                {isOpen && (
                  <div style={{marginTop:6,marginLeft:8,display:"flex",flexDirection:"column",gap:6}}>
                    {ops.length===0 && (
                      <div style={{color:C.t3,fontSize:12,padding:"10px 14px",background:C.card,borderRadius:10,border:`1px solid ${C.border}`}}>
                        Sin operaciones concretadas para esta unidad.
                      </div>
                    )}
                    {ops.map(t=>{
                      const folio = mkFolio(t,"OP");
                      const precio = safeNumber(t.snap?.precioConIVA);
                      const uNeta = safeNumber(t.snap?.uNeta);
                      const margen = precio>0 ? (uNeta/precio)*100 : 0;
                      const meta = TICKET_META[t.status]||{};
                      return (
                        <div key={t.id} style={{
                          background:C.card,borderRadius:10,padding:"10px 14px",
                          border:`1px solid ${C.border}`,
                        }}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:9,color:C.t3,fontFamily:"'Courier New',monospace",letterSpacing:"0.04em",marginBottom:2}}>
                                {folio}
                              </div>
                              <div style={{fontSize:12,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                {t.titulo||"Sin título"}
                              </div>
                              <div style={{fontSize:10,color:C.t3,marginTop:2}}>{t.date||"—"}</div>
                            </div>
                            <div style={{textAlign:"right",flexShrink:0}}>
                              <div style={{fontSize:12,fontWeight:700,color:C.t1}}>{mxn(precio)}</div>
                              <div style={{fontSize:10,color:margen>=20?C.green:C.yellow,marginTop:1}}>
                                {fpct(margen)} margen
                              </div>
                              <div style={{
                                marginTop:3,fontSize:8,fontWeight:700,
                                color:meta.dot||C.t3,
                                background:meta.color||`${C.t3}18`,
                                border:`1px solid ${meta.dot||C.t3}44`,
                                borderRadius:5,padding:"1px 5px",display:"inline-block",
                              }}>
                                {meta.label||t.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PANEL 2: Proveedores ────────────────────────────────────────────── */}
      {iTab==="proveedores" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...label10,marginBottom:4}}>Ranking de Proveedores</div>
          {proveedoresData.length===0 && <div style={{color:C.t3,fontSize:13}}>Sin datos de proveedores.</div>}
          {proveedoresData.map(({supplier,ticketCount,concretadosCount,revenue,utilidad,tasaExito},idx)=>{
            const score = tasaExito>=85&&revenue>10000?"A":tasaExito>=70?"B":tasaExito>=50?"C":"D";
            return (
            <div key={supplier.id} style={cardStyle}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:28,height:28,borderRadius:14,background:`${C.blue}18`,border:`1px solid ${C.blue}33`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.blue,flexShrink:0}}>
                  {idx+1}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {supplier.nombre||supplier.id}
                  </div>
                  <div style={{fontSize:11,color:C.t3}}>{ticketCount} asignados · {concretadosCount} concretados</div>
                </div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",
                  width:32,height:32,borderRadius:16,flexShrink:0,
                  background:`${scoreColor(score)}18`,border:`1.5px solid ${scoreColor(score)}`,
                  fontSize:13,fontWeight:800,color:scoreColor(score)}}>
                  {score}
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                <div>
                  <div style={{...label10,fontSize:8}}>Revenue <span style={{color:C.t3,fontSize:7,textTransform:"none",letterSpacing:0}}>(concretadas)</span></div>
                  <div style={{fontSize:12,fontWeight:700,color:C.t1,marginTop:2}}>{mxn(revenue)}</div>
                </div>
                <div>
                  <div style={{...label10,fontSize:9}}>Utilidad</div>
                  <div style={{fontSize:12,fontWeight:700,color:C.green,marginTop:2}}>{mxn(utilidad)}</div>
                </div>
                <div>
                  <div style={{...label10,fontSize:8}}>Tasa éxito</div>
                  <div style={{fontSize:13,fontWeight:800,color:tasaExito>=80?C.green:tasaExito>=60?C.yellow:C.red,marginTop:1}}>{tasaExito.toFixed(0)}%</div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* ── PANEL 3: Clientes ───────────────────────────────────────────────── */}
      {iTab==="clientes" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Score V2 */}
          <div style={{marginBottom:16}}>
            <div style={{...label10,marginBottom:8}}>Score V2 · Revenue + Utilidad + Frecuencia + Pago</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {[...clientesData].sort((a,b)=>{
                const scoreV2 = d => {
                  const revS = Math.min(d.revenue/1000,40);
                  const utilS = Math.min(d.utilidad/200,30);
                  const freqS = Math.min(d.ticketCount*3,20);
                  return revS+utilS+freqS;
                };
                return scoreV2(b)-scoreV2(a);
              }).slice(0,5).map(({cl,revenue,utilidad,ticketCount,cartPending})=>{
                const revS = Math.min(revenue/1000,40);
                const utilS = Math.min(utilidad/200,30);
                const freqS = Math.min(ticketCount*3,20);
                const total = revS+utilS+freqS;
                const scoreV2 = total>=75?"A":total>=50?"B":total>=25?"C":"D";
                // Tasa de cierre
                const solics = tickets.filter(t=>!t._deleted&&t.clientId===cl.id).length;
                const autorizados = tickets.filter(t=>!t._deleted&&t.clientId===cl.id&&new Set(["autorizado","comprado","transito","entregado","facturado","cobrado","cerrado"]).has(t.status)).length;
                const tasaCierre = solics>0?(autorizados/solics)*100:0;
                return (
                  <div key={cl.id} style={{...cardStyle,padding:"10px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <div style={{width:28,height:28,borderRadius:14,flexShrink:0,
                        background:`${scoreColor(scoreV2)}18`,border:`1.5px solid ${scoreColor(scoreV2)}`,
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:scoreColor(scoreV2)}}>
                        {scoreV2}
                      </div>
                      <span style={{fontSize:13,fontWeight:700,color:C.t1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {cl.empresa||cl.id}
                      </span>
                      <span style={{fontSize:10,color:C.t3,flexShrink:0}}>{ticketCount} ops</span>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                      <div><div style={{...label10,fontSize:8}}>Revenue</div><div style={{fontSize:11,fontWeight:700,color:C.t1,marginTop:1}}>{mxn(revenue)}</div></div>
                      <div><div style={{...label10,fontSize:8}}>Utilidad</div><div style={{fontSize:11,fontWeight:700,color:C.green,marginTop:1}}>{mxn(utilidad)}</div></div>
                      <div><div style={{...label10,fontSize:8}}>T. cierre</div><div style={{fontSize:11,fontWeight:700,color:tasaCierre>=60?C.green:C.yellow,marginTop:1}}>{tasaCierre.toFixed(0)}%</div></div>
                    </div>
                    {cartPending>0&&<div style={{marginTop:6,fontSize:10,color:C.yellow}}>Cartera: {mxn(cartPending)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          {[
            {title:"Por Revenue", sorted:[...clientesData].sort((a,b)=>b.revenue-a.revenue), valKey:"revenue", valFmt:mxn, color:C.blue},
            {title:"Por Utilidad", sorted:[...clientesData].sort((a,b)=>b.utilidad-a.utilidad), valKey:"utilidad", valFmt:mxn, color:C.green},
            {title:"Cartera Pendiente", sorted:[...clientesData].sort((a,b)=>b.cartPending-a.cartPending).filter(d=>d.cartPending>0), valKey:"cartPending", valFmt:mxn, color:C.yellow},
            {title:"Ticket Promedio", sorted:[...clientesData].sort((a,b)=>b.ticketPromedio-a.ticketPromedio), valKey:"ticketPromedio", valFmt:mxn, color:C.cyan},
          ].map(({title,sorted,valKey,valFmt,color})=>(
            <div key={title}>
              <div style={{...label10,marginBottom:8}}>{title}</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {sorted.slice(0,5).map(({cl,score,...rest},idx)=>(
                  <div key={cl.id} style={{...cardStyle,padding:"10px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:11,color:C.t3,width:16,flexShrink:0}}>#{idx+1}</span>
                      <span style={{
                        fontSize:9,fontWeight:700,color:scoreColor(score),
                        background:`${scoreColor(score)}18`,border:`1px solid ${scoreColor(score)}44`,
                        borderRadius:6,padding:"2px 5px",flexShrink:0,
                      }}>{score}</span>
                      <span style={{fontSize:12,fontWeight:700,color:C.t1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {cl.empresa||cl.id}
                      </span>
                      <span style={{fontSize:13,fontWeight:700,color,flexShrink:0}}>{valFmt(rest[valKey])}</span>
                    </div>
                  </div>
                ))}
                {sorted.length===0 && <div style={{color:C.t3,fontSize:12}}>Sin datos.</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PANEL 4: Dos Embudos ─────────────────────────────────────────────── */}
      {iTab==="pipeline" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>

          {/* Alerta tickets detenidos */}
          {operacionData.filter(d=>d.stalled).length>0&&(
            <div style={{background:`${C.red}0a`,border:`1.5px solid ${C.red}44`,borderRadius:14,padding:"12px 14px"}}>
              <div style={{...label10,color:C.red,marginBottom:8}}>
                {operacionData.filter(d=>d.stalled).length} ticket(s) sin movimiento +72h
              </div>
              {operacionData.filter(d=>d.stalled).slice(0,3).map(d=>(
                <div key={d.t.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:11,fontWeight:800,color:C.red,flexShrink:0,minWidth:28}}>{Math.round(d.diasSinMovimiento)}d</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.t.titulo||"Sin título"}</div>
                    <div style={{fontSize:10,color:C.t3}}>{d.cl?.empresa||"—"} · {d.t.status}</div>
                  </div>
                  {d.rev>0&&<div style={{fontSize:11,fontWeight:600,color:C.t3,flexShrink:0}}>{mxn(d.rev)}</div>}
                </div>
              ))}
            </div>
          )}

          {/* ════ EMBUDO OPERATIVO ════ */}
          <div style={{...cardStyle,padding:"14px 16px"}}>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:C.t1,marginBottom:2}}>Embudo Operativo</div>
              <div style={{fontSize:10,color:C.t3}}>¿Qué tan bien resolvemos problemas? · {pipelineData.opTotal} tickets (sin cancelados)</div>
            </div>

            {/* Funnel bars */}
            {pipelineData.opStages.map((s,i)=>{
              const maxC=pipelineData.opStages[0].count||1;
              const barW=maxC>0?(s.count/maxC)*100:0;
              const isKnowledge=["validando","sourcing","cotizado"].includes(s.key);
              const barColor=s.isBottleneck?C.red:isKnowledge?C.cyan:C.blue;
              return(
                <div key={s.key} style={{marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontSize:11,fontWeight:700,color:s.isBottleneck?C.red:isKnowledge?C.cyan:C.t1,width:110,flexShrink:0}}>{s.label}</span>
                    {s.isBottleneck&&<span style={{fontSize:8,fontWeight:700,color:C.red,background:`${C.red}18`,border:`1px solid ${C.red}44`,borderRadius:5,padding:"1px 6px",flexShrink:0}}>CUELLO</span>}
                    {isKnowledge&&!s.isBottleneck&&<span style={{fontSize:8,color:C.cyan,background:`${C.cyan}12`,borderRadius:5,padding:"1px 6px",flexShrink:0}}>CONOCIMIENTO</span>}
                    <div style={{flex:1}}/>
                    <span style={{fontSize:12,fontWeight:800,color:s.isBottleneck?C.red:C.t1,flexShrink:0,minWidth:24,textAlign:"right"}}>{s.count}</span>
                    {i>0&&<span style={{fontSize:10,color:s.isBottleneck?C.red:s.convPct>=70?C.green:s.convPct>=40?C.yellow:C.red,flexShrink:0,minWidth:38,textAlign:"right"}}>{fpct(s.convPct)}</span>}
                  </div>
                  <div style={{height:7,borderRadius:4,background:C.border,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:4,width:`${barW}%`,background:barColor,transition:"width .5s ease"}}/>
                  </div>
                  {i>0&&s.lost>0&&(
                    <div style={{fontSize:9,color:C.t3,marginTop:2}}>
                      {s.lost} ticket{s.lost>1?"s":""} perdido{s.lost>1?"s":""} aquí
                      {s.lostRev>0&&<span style={{color:C.red}}> · {mxn(s.lostRev)} revenue perdido</span>}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Cancelados */}
            {pipelineData.cancelCount>0&&(
              <div style={{marginTop:6,padding:"7px 10px",background:`${C.red}09`,border:`1px solid ${C.red}33`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:10,color:C.red,fontWeight:600}}>Cancelados: {pipelineData.cancelCount} tickets</span>
                <span style={{fontSize:10,color:C.red,fontWeight:700}}>{mxn(pipelineData.cancelRevenue)} perdidos</span>
              </div>
            )}

            {/* Tiempos por etapa */}
            <div style={{height:1,background:C.border,margin:"12px 0 10px"}}/>
            <div style={{fontSize:11,fontWeight:700,color:C.t2,marginBottom:8}}>Tiempos promedio por etapa</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {pipelineData.stageTimings.map((st,i)=>{
                const isKnowledge=st.hot;
                const isTotal=i===pipelineData.stageTimings.length-1;
                return(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:6,background:isTotal?C.bg3:isKnowledge?`${C.cyan}09`:"transparent",border:isTotal?`1px solid ${C.border}`:"none"}}>
                    {isKnowledge&&<span style={{fontSize:9,color:C.cyan,flexShrink:0}}>★</span>}
                    <span style={{flex:1,fontSize:10,color:isTotal?C.t1:isKnowledge?C.cyan:C.t2,fontWeight:isTotal?700:400}}>{st.label}</span>
                    <span style={{fontSize:11,fontWeight:700,color:isTotal?C.cyan:C.t1,fontFamily:"'Courier New',monospace",flexShrink:0}}>{st.fmt}</span>
                    {st.n>0&&<span style={{fontSize:9,color:C.t3,flexShrink:0}}>({st.n})</span>}
                  </div>
                );
              })}
            </div>
            <div style={{fontSize:9,color:C.t3,marginTop:8}}>★ Etapas de conocimiento — diferenciador de LogiSolve</div>
          </div>

          {/* ════ EMBUDO DE COBRANZA ════ */}
          <div style={{...cardStyle,padding:"14px 16px"}}>
            <div style={{marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:C.t1,marginBottom:2}}>Embudo de Cobranza</div>
              <div style={{fontSize:10,color:C.t3}}>¿Qué tan rápido recuperamos el dinero? · {pipelineData.cobTotal} tickets entregados</div>
            </div>

            {/* 3-step funnel */}
            {pipelineData.cobStages.map((s,i)=>{
              const maxC=pipelineData.cobStages[0].count||1;
              const barW=maxC>0?(s.count/maxC)*100:0;
              const colors=["#7AA0E0","#A78BFA","#50D070"];
              return(
                <div key={s.key} style={{marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                    <span style={{fontSize:11,fontWeight:700,color:colors[i],width:90,flexShrink:0}}>{s.label}</span>
                    <div style={{flex:1}}/>
                    <span style={{fontSize:12,fontWeight:800,color:C.t1,flexShrink:0,minWidth:24,textAlign:"right"}}>{s.count}</span>
                    {i>0&&<span style={{fontSize:10,color:s.convPct>=70?C.green:s.convPct>=40?C.yellow:C.red,flexShrink:0,minWidth:38,textAlign:"right"}}>{fpct(s.convPct)}</span>}
                  </div>
                  <div style={{height:7,borderRadius:4,background:C.border,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:4,width:`${barW}%`,background:colors[i],transition:"width .5s ease"}}/>
                  </div>
                  {i>0&&s.pendingRev>0&&(
                    <div style={{fontSize:9,color:C.t3,marginTop:2}}>
                      {mxn(s.pendingRev)} aún por cobrar desde esta etapa
                    </div>
                  )}
                </div>
              );
            })}

            {/* KPIs de cobranza */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:12,marginBottom:12}}>
              <div style={{background:C.bg3,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:9,color:C.t3,marginBottom:3}}>POR COBRAR</div>
                <div style={{fontSize:14,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(pipelineData.carteraTotal)}</div>
              </div>
              <div style={{background:pipelineData.carteraVencida>0?`${C.red}0c`:C.bg3,borderRadius:8,padding:"10px 12px",border:`1px solid ${pipelineData.carteraVencida>0?C.red+"44":C.border}`}}>
                <div style={{fontSize:9,color:pipelineData.carteraVencida>0?C.red:C.t3,marginBottom:3}}>VENCIDA</div>
                <div style={{fontSize:14,fontWeight:800,color:pipelineData.carteraVencida>0?C.red:C.t2,fontFamily:"'Courier New',monospace"}}>{mxn(pipelineData.carteraVencida)}</div>
              </div>
              <div style={{background:C.bg3,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:9,color:C.t3,marginBottom:3}}>DÍAS PROM. COBRO</div>
                <div style={{fontSize:14,fontWeight:800,color:C.t1,fontFamily:"'Courier New',monospace"}}>
                  {pipelineData.avgCobDays!==null ? pipelineData.avgCobDays.toFixed(1)+"d" : "—"}
                </div>
              </div>
            </div>

            {/* Top deudores */}
            {pipelineData.topDeudores.length>0&&(
              <>
                <div style={{fontSize:11,fontWeight:700,color:C.t2,marginBottom:6}}>Clientes con mayor saldo pendiente</div>
                {pipelineData.topDeudores.map((d,i)=>{
                  const cl=clients.find(c=>c.id===d.clientId);
                  return(
                    <div key={d.clientId||i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:i<pipelineData.topDeudores.length-1?`1px solid ${C.border}`:"none"}}>
                      <span style={{fontSize:10,fontWeight:600,color:C.t1,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cl?.empresa||"Sin cliente"}</span>
                      <span style={{fontSize:10,color:C.t3,flexShrink:0}}>{d.count} tkt{d.count>1?"s":""}</span>
                      <span style={{fontSize:11,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace",flexShrink:0}}>{mxn(d.total)}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── PANEL 5 & 6: Partes ─────────────────────────────────────────────── */}
      {iTab==="partes" && (
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {/* Top 15 */}
          <div>
            <div style={{...label10,marginBottom:8}}>Top Partes por Frecuencia</div>
            <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
              {partesData.top15.map((p,i)=>(
                <div key={p.name} style={{
                  display:"grid",gridTemplateColumns:"24px 1fr auto auto",
                  gap:8,alignItems:"center",
                  padding:"9px 14px",
                  borderBottom: i<partesData.top15.length-1?`1px solid ${C.border}`:"none",
                }}>
                  <span style={{fontSize:10,color:C.t3,fontWeight:700}}>#{i+1}</span>
                  <span style={{fontSize:12,color:C.t1,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                    {p.name}
                  </span>
                  <span style={{fontSize:11,color:C.cyan,fontWeight:700,flexShrink:0}}>{p.freq}x</span>
                  <span style={{fontSize:11,color:C.green,fontWeight:700,flexShrink:0,textAlign:"right"}}>{mxn(p.revenue)}</span>
                </div>
              ))}
              {partesData.top15.length===0 && (
                <div style={{padding:"16px",color:C.t3,fontSize:12}}>Sin datos de partes.</div>
              )}
            </div>
          </div>

          {/* Inventario sugerido */}
          <div>
            <div style={{...label10,marginBottom:8}}>Inventario Sugerido (≥3 solicitudes en 90 días)</div>
            {partesData.sugeridas.length===0 && (
              <div style={{color:C.t3,fontSize:12}}>Ninguna pieza cumple los criterios aún.</div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {partesData.sugeridas.map(p=>(
                <div key={p.name} style={{
                  ...cardStyle,
                  background:`${C.green}08`,border:`1px solid ${C.green}33`,
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <span style={{fontSize:14}}>📦</span>
                    <span style={{fontSize:13,fontWeight:700,color:C.t1,flex:1}}>{p.name}</span>
                    <span style={{fontSize:11,fontWeight:700,color:C.green,flexShrink:0}}>{p.freq}x</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    <div>
                      <div style={{...label10,fontSize:9}}>Últ. solicitud</div>
                      <div style={{fontSize:11,color:C.t2,marginTop:1}}>
                        {p.lastDate ? p.lastDate.toLocaleDateString("es-MX") : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{...label10,fontSize:9}}>Ingreso prom/tkt</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.green,marginTop:1}}>{mxn(p.avgRevPerTicket)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL 9: Sourceabilidad ─────────────────────────────────────────── */}
      {iTab==="sourceabilidad" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* KPIs globales de sourceo */}
          <div>
            <div style={{...label10,marginBottom:8}}>Tiempo de Sourceo · ticket creado → proveedor identificado</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              {[
                {l:"Promedio",h:sourceoData.promedio},
                {l:"Mediana",h:sourceoData.mediana},
                {l:"Mejor",h:sourceoData.mejor},
                {l:"Peor",h:sourceoData.peor},
              ].map(({l,h})=>(
                <div key={l} style={{...cardStyle,textAlign:"center",padding:"12px 10px"}}>
                  <div style={{fontSize:20,fontWeight:800,color:h===null?C.t3:h<2?C.green:h<6?C.yellow:C.red,lineHeight:1.1}}>
                    {sourceoData.fmtH(h)}
                  </div>
                  <div style={{fontSize:10,color:C.t3,marginTop:3}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:10,color:C.t3,textAlign:"center"}}>
              Basado en {sourceoData.n} operaciones con proveedor identificado
            </div>
          </div>

          {/* Componentes más difíciles */}
          <div>
            <div style={{...label10,marginBottom:8}}>Componentes más difíciles de sourcear</div>
            <div style={{...cardStyle,padding:0,overflow:"hidden"}}>
              {sourceoData.partesDificiles.length===0 && (
                <div style={{padding:14,color:C.t3,fontSize:12}}>Sin datos suficientes.</div>
              )}
              {sourceoData.partesDificiles.map((p,i)=>(
                <div key={p.name} style={{display:"grid",gridTemplateColumns:"20px 1fr auto auto",gap:8,alignItems:"center",
                  padding:"9px 14px",borderBottom:i<sourceoData.partesDificiles.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:9,color:C.t3,fontWeight:700}}>#{i+1}</span>
                  <span style={{fontSize:12,color:C.t1,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</span>
                  <span style={{fontSize:10,color:C.t3,flexShrink:0}}>{p.freq}x</span>
                  <span style={{fontSize:12,fontWeight:700,color:p.avgH<2?C.green:p.avgH<6?C.yellow:C.red,flexShrink:0}}>
                    {sourceoData.fmtH(p.avgH)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Familias dominadas */}
          <div>
            <div style={{...label10,marginBottom:8}}>Familias Dominadas</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {sourceoData.familias.map((f,i)=>(
                <div key={f.key} style={{...cardStyle}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <div style={{width:24,height:24,borderRadius:12,background:`${C.blue}18`,border:`1px solid ${C.blue}33`,
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.blue,flexShrink:0}}>
                      {i+1}
                    </div>
                    <span style={{fontSize:13,fontWeight:700,color:C.t1,flex:1}}>{f.label}</span>
                    <span style={{fontSize:11,color:C.t3}}>{f.ops} ops</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    <div>
                      <div style={{...label10,fontSize:8}}>Revenue</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.t1,marginTop:1}}>{mxn(f.revenue)}</div>
                    </div>
                    <div>
                      <div style={{...label10,fontSize:8}}>Utilidad</div>
                      <div style={{fontSize:11,fontWeight:700,color:C.green,marginTop:1}}>{mxn(f.utilidad)}</div>
                    </div>
                    <div>
                      <div style={{...label10,fontSize:8}}>T. Sourceo</div>
                      <div style={{fontSize:11,fontWeight:700,color:f.avgSourcH===null?C.t3:f.avgSourcH<2?C.green:C.yellow,marginTop:1}}>
                        {f.avgSourcH===null?"—":sourceoData.fmtH(f.avgSourcH)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {sourceoData.familias.length===0 && <div style={{color:C.t3,fontSize:12}}>Sin datos de familias.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── PANEL 12: Oportunidad Perdida ───────────────────────────────────── */}
      {iTab==="oportunidad" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Resumen */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{...cardStyle,textAlign:"center"}}>
              <div style={{fontSize:24,fontWeight:800,color:C.red,lineHeight:1.1}}>{cancelData.total}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:3}}>ops canceladas</div>
            </div>
            <div style={{...cardStyle,textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:800,color:C.red,lineHeight:1.1}}>{mxn(cancelData.totalRevLost)}</div>
              <div style={{fontSize:10,color:C.t3,marginTop:3}}>revenue perdido</div>
            </div>
          </div>

          {/* Por motivo */}
          <div>
            <div style={{...label10,marginBottom:8}}>Revenue Perdido por Motivo</div>
            {cancelData.sorted.length===0 && (
              <div style={{...cardStyle,color:C.t3,fontSize:12}}>
                Sin cancelaciones registradas. Los motivos se capturan al cambiar el estado a "Cancelado".
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {cancelData.sorted.map((d,i)=>{
                const pct = cancelData.totalRevLost>0 ? (d.revenue/cancelData.totalRevLost)*100 : 0;
                return (
                  <div key={d.motivo} style={{...cardStyle,padding:"10px 14px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontSize:12,fontWeight:700,color:C.t1,flex:1}}>{d.motivo}</span>
                      <span style={{fontSize:11,color:C.t3}}>{d.count} ops</span>
                      <span style={{fontSize:12,fontWeight:700,color:C.red,flexShrink:0}}>{mxn(d.revenue)}</span>
                    </div>
                    <div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:C.red,borderRadius:2}}/>
                    </div>
                    <div style={{fontSize:9,color:C.t3,marginTop:3,textAlign:"right"}}>{pct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {cancelData.sorted.length>0 && cancelData.sorted.find(d=>d.motivo==="sin motivo") && (
            <div style={{...cardStyle,background:`${C.yellow}08`,border:`1px solid ${C.yellow}33`}}>
              <div style={{fontSize:11,color:C.yellow,fontWeight:700,marginBottom:4}}>Sin motivo registrado</div>
              <div style={{fontSize:11,color:C.t2}}>
                Hay cancelaciones sin motivo capturado. Los nuevos tickets cancelados pedirán el motivo automáticamente.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PANEL 7: KPIs Operativos ─────────────────────────────────────────── */}
      {iTab==="kpis" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...label10,marginBottom:4}}>Tiempos Operativos Promedio</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {kpisOpData.map(k=>(
              <div key={k.key} style={{...cardStyle,textAlign:"center"}}>
                <div style={{fontSize:28,fontWeight:800,color:k.hrs===null?C.t3:C.blue,lineHeight:1.2,marginBottom:4}}>
                  {k.fmt}
                </div>
                <div style={{fontSize:12,fontWeight:700,color:C.t1,marginBottom:2}}>T. {k.label}</div>
                <div style={{fontSize:10,color:C.t3}}>{k.n} tickets</div>
              </div>
            ))}
          </div>
          <div style={{...cardStyle,marginTop:4}}>
            <div style={{...label10,marginBottom:8}}>Desglose de tiempos</div>
            {kpisOpData.map(k=>(
              <div key={k.key} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:600,color:C.t1,marginBottom:3}}>{k.label}</div>
                  <div style={{height:4,borderRadius:2,background:C.border,overflow:"hidden"}}>
                    {k.hrs!==null && (
                      <div style={{height:"100%",borderRadius:2,
                        width:`${Math.min(100,(k.hrs/720)*100)}%`,
                        background:`linear-gradient(90deg,${C.blue},${C.cyan})`,transition:"width 0.6s"}}/>
                    )}
                  </div>
                </div>
                <div style={{fontSize:14,fontWeight:700,color:C.blue,flexShrink:0,width:48,textAlign:"right"}}>{k.fmt}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PANEL 8: Alertas Estratégicas ───────────────────────────────────── */}
      {iTab==="alertas" && (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{...label10,marginBottom:4}}>Alertas Estratégicas · {alertasData.length} activas</div>
          {alertasData.length===0 && (
            <div style={{...cardStyle,textAlign:"center",padding:"24px",color:C.green}}>
              <div style={{fontSize:28,marginBottom:8}}>✓</div>
              <div style={{fontSize:13,fontWeight:700}}>Sin alertas activas</div>
              <div style={{fontSize:11,color:C.t3,marginTop:4}}>Todos los indicadores dentro de parámetros normales.</div>
            </div>
          )}
          {alertasData.map((a,i)=>{
            const sevColor = a.sev==="red" ? C.red : C.yellow;
            return (
              <div key={i} style={{
                background:`${sevColor}0a`,border:`1.5px solid ${sevColor}44`,
                borderRadius:14,padding:"14px 16px",
              }}>
                <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:6}}>
                  <span style={{fontSize:16,flexShrink:0,lineHeight:1.3}}>{a.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700,color:sevColor,marginBottom:4}}>{a.title}</div>
                    <div style={{fontSize:12,color:C.t2,lineHeight:1.55,marginBottom:8}}>{a.desc}</div>
                    <div style={{background:`${C.blue}10`,border:`1px solid ${C.blue}28`,borderRadius:8,
                      padding:"7px 10px",display:"flex",alignItems:"flex-start",gap:6}}>
                      <span style={{fontSize:11,color:C.blue,flexShrink:0}}>→</span>
                      <span style={{fontSize:11,color:C.blue,lineHeight:1.5}}>{a.action}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PANEL 9: Resumen Ejecutivo ───────────────────────────────────────── */}
      {iTab==="ia" && (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...label10,marginBottom:4}}>Resumen Ejecutivo · datos en tiempo real</div>

          {/* Posición financiera */}
          <div style={{...cardStyle,border:`1.5px solid ${C.blue}44`}}>
            <div style={{...label10,color:C.blue,marginBottom:10}}>Posición Financiera</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:10}}>
              <div>
                <div style={{fontSize:9,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>Vendido 30d</div>
                <div style={{fontSize:20,fontWeight:800,color:C.t1,lineHeight:1}}>{mxn(dineroData.rev30)}</div>
                <div style={{fontSize:10,color:dineroData.avgMargen30>=15?C.green:dineroData.avgMargen30>=8?C.yellow:C.red,marginTop:2}}>{dineroData.avgMargen30.toFixed(1)}% margen neto</div>
              </div>
              <div>
                <div style={{fontSize:9,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:3}}>Cartera pendiente</div>
                <div style={{fontSize:20,fontWeight:800,color:dineroData.cartera>0?C.yellow:C.green,lineHeight:1}}>{mxn(dineroData.cartera)}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:2}}>{dineroData.carteraCount} ticket(s)</div>
              </div>
            </div>
            <div style={{height:1,background:C.border,marginBottom:8}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:C.t3}}>Pipeline activo</span>
                <span style={{fontSize:12,fontWeight:700,color:C.cyan}}>{mxn(dineroData.flujoForecast)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:C.t3}}>Util. 30d</span>
                <span style={{fontSize:12,fontWeight:700,color:C.green}}>{mxn(dineroData.util30)}</span>
              </div>
            </div>
          </div>

          {/* Tiempos operativos */}
          <div style={cardStyle}>
            <div style={{...label10,marginBottom:10}}>Tiempos Operativos Promedio</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {kpisOpData.map(k=>(
                <div key={k.key} style={{background:C.bg2,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:9,color:C.t3,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:4}}>{k.label}</div>
                  <div style={{fontSize:18,fontWeight:800,color:k.hrs===null?C.t3:k.hrs<24?C.green:k.hrs<72?C.yellow:C.red,lineHeight:1}}>{k.fmt}</div>
                  <div style={{fontSize:9,color:C.t3,marginTop:2}}>n={k.n}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Atención requerida */}
          {operacionData.filter(d=>d.stalled).length > 0 && (
            <div style={{background:`${C.red}0a`,border:`1.5px solid ${C.red}44`,borderRadius:14,padding:"12px 14px"}}>
              <div style={{...label10,color:C.red,marginBottom:8}}>Requieren atención inmediata</div>
              {operacionData.filter(d=>d.stalled).slice(0,5).map(d=>(
                <div key={d.t.id} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:11,fontWeight:800,color:C.red,flexShrink:0,minWidth:28}}>{Math.round(d.diasSinMovimiento)}d</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.t.titulo||"Sin título"}</div>
                    <div style={{fontSize:10,color:C.t3}}>{d.cl?.empresa||"—"} · {d.t.status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alertas activas */}
          {alertasData.length > 0 && (
            <div style={cardStyle}>
              <div style={{...label10,marginBottom:8}}>Alertas Estratégicas · {alertasData.length}</div>
              {alertasData.slice(0,3).map((a,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:i<Math.min(alertasData.length,3)-1?10:0}}>
                  <span style={{fontSize:14,flexShrink:0,lineHeight:1.3}}>{a.icon}</span>
                  <div>
                    <div style={{fontSize:12,fontWeight:700,color:a.sev==="red"?C.red:C.yellow}}>{a.title}</div>
                    <div style={{fontSize:11,color:C.t3,lineHeight:1.4,marginTop:1}}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Revenue perdido */}
          {cancelData.total > 0 && (
            <div style={cardStyle}>
              <div style={{...label10,marginBottom:8}}>Oportunidad Perdida · cancelaciones</div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:20,fontWeight:800,color:C.red}}>{mxn(cancelData.totalRevLost)}</div>
                <div style={{fontSize:11,color:C.t3,textAlign:"right"}}>{cancelData.total} cancelaciones<br/>revenue potencial perdido</div>
              </div>
              {cancelData.sorted.slice(0,3).map((m,i)=>(
                <div key={m.motivo} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:11,color:C.t2}}>{m.motivo}</span>
                  <span style={{fontSize:11,fontWeight:600,color:C.t3}}>{m.count}x · {mxn(m.revenue)}</span>
                </div>
              ))}
            </div>
          )}

          {/* IA no disponible */}
          {phase==="idle" && (
            <div style={{...cardStyle,textAlign:"center",padding:"20px",opacity:0.6}}>
              <div style={{fontSize:11,color:C.t3}}>Análisis IA extendido no disponible en este entorno.</div>
              <div style={{fontSize:10,color:C.t3,marginTop:4}}>El resumen de arriba contiene los datos clave de tu operación.</div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div style={{...cardStyle,display:"flex",flexDirection:"column",alignItems:"center",gap:16,padding:"24px 20px"}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={{fontSize:24,animation:"spin 2s linear infinite",display:"inline-block"}}>✦</span>
                <div>
                  <div style={{fontSize:14,fontWeight:600,color:C.t1}}>
                    {phase==="thinking"?"Claude está pensando…":"Generando análisis…"}
                  </div>
                  <div style={{fontSize:11,color:C.t3,marginTop:2}}>
                    {phase==="thinking"
                      ?`${progress.thinkingChars.toLocaleString()} chars de razonamiento`
                      :`${progress.chars.toLocaleString()} chars generados`}
                  </div>
                </div>
              </div>
              {[100,75,90,60,80].map((w,i)=>(
                <div key={i} style={{width:`${w}%`,height:10,borderRadius:6,background:C.border,
                  animation:`pulse 1.5s ease-in-out ${i*0.15}s infinite`}}/>
              ))}
            </div>
          )}

          {/* Error state */}
          {phase==="error" && error && (
            <div style={{background:`${C.red}12`,border:`1px solid ${C.red}44`,borderRadius:16,padding:"16px 18px"}}>
              <div style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:6}}>Error al generar análisis</div>
              <div style={{fontSize:12,color:C.t2}}>{error}</div>
              <button onClick={runAnalysis} style={{marginTop:14,padding:"10px 20px",background:C.bg2,
                border:`1px solid ${C.border}`,borderRadius:10,color:C.t1,fontSize:13,cursor:"pointer",fontWeight:600}}>
                Reintentar
              </button>
            </div>
          )}

          {/* Results */}
          {result && phase==="done" && (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {/* Resumen ejecutivo */}
              <div style={{background:`linear-gradient(135deg,${C.blue}14 0%,${C.cyan}0a 100%)`,
                border:`1.5px solid ${C.blueHi}`,borderRadius:18,padding:"18px"}}>
                <div style={{...label10,color:C.blue,marginBottom:10}}>Resumen Ejecutivo</div>
                <p style={{margin:0,fontSize:14,color:C.t1,lineHeight:1.65,fontWeight:500}}>{result.resumenEjecutivo}</p>
                {result.alertas?.length>0 && (
                  <div style={{marginTop:14,display:"flex",flexDirection:"column",gap:6}}>
                    {result.alertas.map((al,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,background:`${C.red}12`,
                        border:`1px solid ${C.red}33`,borderRadius:10,padding:"8px 12px"}}>
                        <span style={{color:C.red,flexShrink:0,marginTop:1}}>⚠</span>
                        <span style={{fontSize:12,color:C.red,fontWeight:600}}>{al}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Salud financiera */}
              {result.saludFinanciera && (
                <div style={cardStyle}>
                  <div style={{...label10,marginBottom:12}}>Salud Financiera</div>
                  <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:14}}>
                    <div style={{width:52,height:52,borderRadius:26,background:`${saludColor(result.saludFinanciera.score)}22`,
                      border:`2px solid ${saludColor(result.saludFinanciera.score)}`,
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:17,fontWeight:800,color:saludColor(result.saludFinanciera.score)}}>{result.saludFinanciera.score}</span>
                    </div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:saludColor(result.saludFinanciera.score),textTransform:"capitalize"}}>
                        {result.saludFinanciera.nivel}
                      </div>
                      <div style={{fontSize:11,color:C.t3,marginTop:2}}>Índice de salud (0–100)</div>
                    </div>
                  </div>
                  <div style={{height:5,borderRadius:3,background:C.border,marginBottom:12,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:3,width:`${result.saludFinanciera.score}%`,
                      background:`linear-gradient(90deg,${saludColor(result.saludFinanciera.score)},${saludColor(result.saludFinanciera.score)}aa)`,transition:"width 1s"}}/>
                  </div>
                  {result.saludFinanciera.factores?.map((f,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}}>
                      <span style={{color:C.t3,flexShrink:0,fontSize:12}}>·</span>
                      <span style={{fontSize:12,color:C.t2,lineHeight:1.5}}>{f}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Insights */}
              {result.insights?.length>0 && (
                <div>
                  <div style={{...label10,marginBottom:10}}>Insights Estratégicos</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {result.insights.map((ins,i)=>(
                      <div key={i} style={cardStyle}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{width:8,height:8,borderRadius:4,flexShrink:0,background:categoriaColor(ins.categoria),boxShadow:`0 0 6px ${categoriaColor(ins.categoria)}66`}}/>
                          <span style={{fontSize:10,color:categoriaColor(ins.categoria),fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em"}}>{ins.categoria}</span>
                          <span style={{marginLeft:"auto",fontSize:9,fontWeight:700,color:impactoColor(ins.impacto),
                            background:`${impactoColor(ins.impacto)}18`,border:`1px solid ${impactoColor(ins.impacto)}44`,
                            borderRadius:6,padding:"2px 7px",textTransform:"uppercase",letterSpacing:"0.06em"}}>{ins.impacto}</span>
                        </div>
                        <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:5}}>{ins.titulo}</div>
                        <div style={{fontSize:12,color:C.t2,lineHeight:1.55,marginBottom:10}}>{ins.descripcion}</div>
                        <div style={{background:`${C.blue}10`,border:`1px solid ${C.blue}28`,borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"flex-start",gap:8}}>
                          <span style={{fontSize:11,color:C.blue,flexShrink:0,marginTop:1}}>→</span>
                          <span style={{fontSize:11,color:C.blue,lineHeight:1.5}}>{ins.accion}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Riesgos */}
              {result.riesgos?.length>0 && (
                <div>
                  <div style={{...label10,marginBottom:10}}>Riesgos Identificados</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {result.riesgos.map((r,i)=>(
                      <div key={i} style={{background:`${C.red}08`,border:`1px solid ${urgenciaColor(r.urgencia)}44`,borderRadius:14,padding:"14px 16px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:urgenciaColor(r.urgencia),flex:1}}>{r.titulo}</span>
                          <span style={{fontSize:9,fontWeight:700,color:urgenciaColor(r.urgencia),background:`${urgenciaColor(r.urgencia)}18`,
                            border:`1px solid ${urgenciaColor(r.urgencia)}44`,borderRadius:6,padding:"2px 7px",textTransform:"uppercase",letterSpacing:"0.06em",flexShrink:0}}>{r.urgencia}</span>
                        </div>
                        <div style={{fontSize:12,color:C.t2,lineHeight:1.55}}>{r.descripcion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Oportunidades */}
              {result.oportunidades?.length>0 && (
                <div>
                  <div style={{...label10,marginBottom:10}}>Oportunidades</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {result.oportunidades.map((o,i)=>(
                      <div key={i} style={{background:`${C.green}08`,border:`1px solid ${C.green}33`,borderRadius:14,padding:"14px 16px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:12,fontWeight:700,color:C.green,flex:1}}>{o.titulo}</span>
                          <span style={{fontSize:10,fontWeight:700,color:C.green,background:`${C.green}18`,
                            border:`1px solid ${C.green}44`,borderRadius:6,padding:"3px 8px",flexShrink:0}}>+{mxn(o.potencialMXN)}</span>
                        </div>
                        <div style={{fontSize:12,color:C.t2,lineHeight:1.55}}>{o.descripcion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Estrategia de escala */}
              {result.estrategiaEscala && (
                <div style={cardStyle}>
                  <div style={{...label10,marginBottom:12}}>Estrategia de Escala</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1,marginBottom:14,lineHeight:1.5}}>{result.estrategiaEscala.objetivo}</div>
                  {result.estrategiaEscala.pasos?.map((p,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:10}}>
                      <div style={{width:22,height:22,borderRadius:11,background:`${C.blue}22`,border:`1.5px solid ${C.blue}`,
                        display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:10,fontWeight:700,color:C.blue}}>{i+1}</div>
                      <span style={{fontSize:12,color:C.t2,lineHeight:1.5,paddingTop:3}}>{p}</span>
                    </div>
                  ))}
                  {result.estrategiaEscala.kpisObjetivo?.length>0 && (
                    <div style={{marginTop:16}}>
                      <div style={{...label10,marginBottom:10}}>KPIs Objetivo</div>
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {result.estrategiaEscala.kpisObjetivo.map((k,i)=>(
                          <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:8,alignItems:"center",
                            borderBottom:`1px solid ${C.border}`,paddingBottom:8}}>
                            <span style={{fontSize:11,color:C.t2,fontWeight:600}}>{k.kpi}</span>
                            <span style={{fontSize:11,color:C.t3}}>Actual: <span style={{color:C.t1}}>{k.actual}</span></span>
                            <span style={{fontSize:11,color:C.green}}>→ {k.objetivo}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* Regenerate */}
              <button onClick={runAnalysis} style={{width:"100%",padding:"13px",background:"transparent",
                border:`1px solid ${C.border}`,borderRadius:14,cursor:"pointer",
                color:C.t3,fontSize:13,fontWeight:600,touchAction:"manipulation",WebkitTapHighlightColor:"transparent",marginTop:4}}>
                ↻ Actualizar análisis
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── MasSheet — bottom sheet del menú "Más" ───────────────────────────────────

// ── MasSheet — bottom sheet del menú "Más" ───────────────────────────────────
function MasSheet({open,onClose,tab,setTab}) {
  const C = React.useContext(ThemeCtx);
  if(!open) return null;
  const items=[
    {id:"chat",        label:"Chat IA",     icon:"💬", desc:"Asistente IA"},
    {id:"sourcing",    label:"Sourcing",   icon:"⚡", desc:"AI Copilot"},
    {id:"cotizador",  label:"Cotizador",  icon:"🧾", desc:"Nueva cotización"},
    {id:"cartera",    label:"Cartera",    icon:"💳", desc:"Por cobrar"},
    {id:"flota",      label:"Flota",      icon:"🚛", desc:"Control flota"},
    {id:"unidades",   label:"Flotilla",   icon:"🚚", desc:"Vehículos"},
    {id:"catalogo",   label:"Catálogo",   icon:"📦", desc:"Inventario"},
    {id:"clientes",   label:"Clientes",   icon:"🏢", desc:"Directorio"},
    {id:"proveedores",label:"Proveedores",icon:"🔧", desc:"Suppliers"},
    {id:"ajustes",    label:"Ajustes",    icon:"⚙",  desc:"Config"},
  ];
  return (
    <>
      <div onClick={onClose} className="fade-enter" style={{position:"fixed",inset:0,zIndex:150,background:C._dark?"rgba(0,0,0,0.55)":"rgba(0,0,0,0.25)"}}/>
      <div className="sheet-enter" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:155,
        background:C._dark?"rgba(14,16,20,0.90)":"rgba(248,247,244,0.94)",backdropFilter:"blur(32px) saturate(1.8)",WebkitBackdropFilter:"blur(32px) saturate(1.8)",
        borderRadius:"28px 28px 0 0",
        borderTop:`1px solid ${C.borderHi}`,
        padding:`0 16px calc(20px + env(safe-area-inset-bottom,0px))`,
        boxShadow:C._dark?"0 -12px 60px rgba(0,0,0,0.6)":"0 -12px 60px rgba(0,0,0,0.12)"}}>

        <div style={{display:"flex",justifyContent:"center",padding:"14px 0 8px"}}>
          <div style={{width:36,height:4,borderRadius:2,background:C.border}}/>
        </div>
        <div style={{fontSize:10,color:C.t3,letterSpacing:"0.16em",marginBottom:16,
          textAlign:"center",textTransform:"uppercase",fontWeight:600}}>Más módulos</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
          {items.map(item=>(
            <button key={item.id} onClick={()=>{setTab(item.id);onClose();}}
              style={{padding:"18px 10px",
                background:tab===item.id?C.blueDim:C.bg1,
                backdropFilter:C.glass,WebkitBackdropFilter:C.glass,
                border:`1.5px solid ${tab===item.id?C.blueHi:C.border}`,
                borderRadius:22,cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",gap:8,
                transition:"all 150ms ease",touchAction:"manipulation",
                WebkitTapHighlightColor:"transparent"}}>
              <span style={{fontSize:28,lineHeight:1}}>{item.icon}</span>
              <span style={{fontSize:12,fontWeight:700,color:tab===item.id?C.blue:C.t1,lineHeight:1}}>{item.label}</span>
              <span style={{fontSize:10,color:C.t3,lineHeight:1}}>{item.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function MCobranza({state, dispatch, toast}) {
  const C = React.useContext(ThemeCtx);
  const A = makeA(C);
  const {tickets, clients} = state;
  const [tab, setTab] = React.useState("por_cobrar"); // "por_cobrar" | "cobrado"

  const active = React.useMemo(() =>
    tickets.filter(t => !t._deleted), [tickets]);

  const cartera = React.useMemo(() =>
    active.filter(t => CARTERA_SET.has(t.status))
      .sort((a,b) => (b.snap?.precioConIVA||0) - (a.snap?.precioConIVA||0)),
    [active]);

  const cobrados = React.useMemo(() =>
    active.filter(t => PAID_SET.has(t.status))
      .sort((a,b) => {
        const toS = d => { const p=(d||"").split("/"); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; };
        return toS(b.date).localeCompare(toS(a.date));
      })
      .slice(0, 40),
    [active]);

  const pendiente = cartera.reduce((s,t)=>s+(t.snap?.precioConIVA||0),0);
  const porFacturar = cartera.filter(t=>t.status==="entregado");
  const porCobrar   = cartera.filter(t=>t.status==="facturado");

  const mxn = n => safeNumber(n).toLocaleString("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:2});
  const daysSince = dateStr => {
    if(!dateStr) return null;
    const p=dateStr.split("/"); if(p.length!==3) return null;
    const d=new Date(`${p[2]}-${p[1]}-${p[0]}`);
    return Math.floor((Date.now()-d.getTime())/(1000*60*60*24));
  };

  const mkAdvance = (tkt, nextStatus) => () => {
    dispatch({type:"TKT_UPDATE", id:tkt.id, patch:{status:nextStatus,
      timeline:[...tkt.timeline,{ts:new Date().toISOString(),evento:`Marcado como ${nextStatus}`,actor:"Operador"}],
    }});
    toast(`${nextStatus === "facturado" ? "Facturado" : "Cobrado"} ✓`, "success");
  };

  const mkCobrar = (tkt) => () => {
    dispatch({type:"TKT_COBRADO", id:tkt.id});
    toast("Cobrado ✓", "success");
  };

  const listItems = tab === "por_cobrar" ? cartera : cobrados;

  return (
    <div style={{minHeight:"100vh",background:"transparent",paddingBottom:40}}>
      <div style={{padding:"18px 14px 0"}}>
        <div style={{fontSize:22,fontWeight:900,color:A.t1,letterSpacing:"-0.02em",marginBottom:2}}>
          Cobranza
        </div>

        {/* Summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,margin:"14px 0"}}>
          {[
            {label:"Por cobrar",value:mxn(pendiente),color:cartera.length>0?A.red:A.t3},
            {label:"Por facturar",value:porFacturar.length,suffix:" ops",color:A.amber||"#F59E0B"},
            {label:"Facturado",value:porCobrar.length,suffix:" ops",color:A.cyan},
          ].map(card=>(
            <div key={card.label} style={{background:C.bg1,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"10px 12px"}}>
              <div style={{fontSize:8,color:C.t3,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:4}}>{card.label}</div>
              <div style={{fontSize:card.value&&typeof card.value==="string"&&card.value.length>8?13:16,
                fontWeight:800,color:card.color,letterSpacing:"-0.01em"}}>
                {card.value}{card.suffix||""}
              </div>
            </div>
          ))}
        </div>

        {/* Tab selector */}
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[["por_cobrar","Por cobrar"],["cobrado","Ya cobrado"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)}
              style={{padding:"6px 12px",borderRadius:20,fontSize:10,fontWeight:700,
                cursor:"pointer",border:`1px solid ${tab===id?C.blueHi:C.border}`,
                background:tab===id?C.blueDim:"transparent",
                color:tab===id?C.cyan:C.t3}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"0 14px"}}>
        {listItems.length === 0 && (
          <div style={{textAlign:"center",padding:"48px 0",color:C.t3,fontSize:13}}>
            {tab==="por_cobrar" ? "🎉 No hay pendientes de cobro" : "Sin operaciones cobradas"}
          </div>
        )}

        {tab==="por_cobrar" && listItems.length > 0 && (
          <>
            {porFacturar.length > 0 && (
              <div style={{fontSize:9,color:C.t3,letterSpacing:"0.12em",textTransform:"uppercase",
                marginBottom:8,fontWeight:700}}>
                Por facturar ({porFacturar.length})
              </div>
            )}
            {porFacturar.map(t => <CobranzaCard key={t.id} t={t} clients={clients} C={C} A={A}
              mxn={mxn} daysSince={daysSince}
              action={<button onClick={mkAdvance(t,"facturado")}
                style={{padding:"6px 12px",borderRadius:8,background:`${A.amber||"#F59E0B"}18`,
                  border:`1px solid ${A.amber||"#F59E0B"}44`,color:A.amber||"#F59E0B",
                  fontSize:10,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>
                Facturar ↗
              </button>}
              dispatch={dispatch} toast={toast}
            />)}

            {porCobrar.length > 0 && (
              <div style={{fontSize:9,color:C.t3,letterSpacing:"0.12em",textTransform:"uppercase",
                margin:`${porFacturar.length>0?"16px":0} 0 8px`,fontWeight:700}}>
                Por cobrar ({porCobrar.length})
              </div>
            )}
            {porCobrar.map(t => <CobranzaCard key={t.id} t={t} clients={clients} C={C} A={A}
              mxn={mxn} daysSince={daysSince}
              action={<button onClick={mkCobrar(t)}
                style={{padding:"6px 12px",borderRadius:8,background:`${A.mint||"#3CCFAA"}18`,
                  border:`1px solid ${A.mint||"#3CCFAA"}44`,color:A.mint||"#3CCFAA",
                  fontSize:10,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>
                Cobrar ✓
              </button>}
              dispatch={dispatch} toast={toast}
            />)}
          </>
        )}

        {tab==="cobrado" && listItems.map(t => <CobranzaCard key={t.id} t={t} clients={clients}
          C={C} A={A} mxn={mxn} daysSince={daysSince} action={null}
          dispatch={dispatch} toast={toast}
        />)}
      </div>
    </div>
  );
}

function CobranzaCard({t, clients, C, A, mxn, daysSince, action, dispatch, toast}) {
  const [showAtt, setShowAtt] = React.useState(false);
  const cl = clients.find(c=>c.id===t.clientId);
  const days = daysSince(t.date);
  const meta = TICKET_META[t.status] || {};
  const price = t.snap?.precioConIVA || 0;

  return (
    <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:14,
      marginBottom:10,overflow:"hidden"}}>
      <div style={{padding:"12px 14px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:6}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:800,color:A.t1,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>
              {t.titulo}
            </div>
            <div style={{fontSize:10,color:A.t3}}>
              {cl?.empresa || "Sin cliente"} · {t.date}
              {days!=null&&<span style={{color:days>30?A.red:days>14?A.amber||"#F59E0B":A.t3,
                marginLeft:6}}>({days}d)</span>}
            </div>
          </div>
          <div style={{textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:16,fontWeight:800,color:A.t1}}>{mxn(price)}</div>
            <span style={{fontSize:9,padding:"2px 7px",borderRadius:10,
              background:`${meta.dot||C.border}18`,color:meta.dot||C.t3,fontWeight:700}}>
              {meta.label||t.status}
            </span>
          </div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={()=>setShowAtt(v=>!v)}
            style={{fontSize:10,color:C.t3,background:"transparent",border:"none",
              cursor:"pointer",padding:"4px 0"}}>
            📎 {(t.attachments||[]).length} adjunto{(t.attachments||[]).length!==1?"s":""}
          </button>
          {action}
        </div>
      </div>
      {showAtt && (
        <MAttachments ticket={t} dispatch={dispatch} toast={toast}/>
      )}
    </div>
  );
}

const TABS = [
  {id:"ops",          label:"Centro Ops"},
  {id:"tickets",      label:"Pipeline"},
  {id:"historial",    label:"Historial"},
  {id:"cotizador",    label:"Cotizador"},
  {id:"refacciones",  label:"Refacciones"},
  {id:"chat",         label:"💬 Chat IA"},
  {id:"sourcing",     label:"⚡ Sourcing"},
  {id:"flota",        label:"Flota"},
  {id:"unidades",     label:"Unidades"},
  {id:"catalogo",     label:"Catalogo"},
  {id:"proveedores",  label:"Proveedores"},
  {id:"clientes",     label:"Clientes"},
  {id:"cartera",      label:"Cartera"},
  {id:"ajustes",      label:"Ajustes"},
];

// ── ErrorBoundary — catches any render crash, shows recovery screen instead of blank ──
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={error:null}; }
  static getDerivedStateFromError(e){ return {error:e}; }
  componentDidCatch(e,info){ console.error("[ErrorBoundary]",e,info); }
  render(){
    if(!this.state.error) return this.props.children;
    const msg = this.state.error?.message||String(this.state.error);
    return (
      <div style={{minHeight:"100vh",background:"#0D0F12",color:"#F5F5F7",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24,fontFamily:"'Trebuchet MS',sans-serif"}}>
        <div style={{fontSize:28,color:"#F5F5F7"}}>⚠</div>
        <div style={{fontSize:13,fontWeight:700,color:"#F5F5F7",textAlign:"center"}}>Algo salió mal</div>
        <div style={{fontSize:10,color:"#4A5568",fontFamily:"monospace",background:"#EEF1F5",padding:"8px 14px",borderRadius:4,maxWidth:320,wordBreak:"break-all",textAlign:"center"}}>{msg}</div>
        <button onClick={()=>window.location.reload()}
          style={{marginTop:8,padding:"9px 22px",background:"#F3F4F6",border:"none",borderRadius:4,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:"0.05em"}}>
          REINICIAR APP
        </button>
      </div>
    );
  }
}

// ── useSyncStatus — estado del sync Supabase ─────────────────────────────────
function useSyncStatus() {
  const [status, setStatus] = useState("idle"); // "idle"|"saving"|"saved"|"offline"|"error"
  const timerRef = useRef(null);
  const resetToIdle = useCallback((delay=3000) => {
    if(timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(()=>setStatus("idle"), delay);
  }, []);
  const setSaving  = useCallback(()=>{ setStatus("saving");  if(timerRef.current) clearTimeout(timerRef.current); }, []);
  const setSaved   = useCallback(()=>{ setStatus("saved");   resetToIdle(3000); }, [resetToIdle]);
  const setOffline = useCallback(()=>{ setStatus("offline"); resetToIdle(8000); }, [resetToIdle]);
  const setError   = useCallback(()=>{ setStatus("error");   resetToIdle(6000); }, [resetToIdle]);
  useEffect(()=>()=>{ if(timerRef.current) clearTimeout(timerRef.current); },[]);
  return { status, setSaving, setSaved, setOffline, setError };
}

export default function AppRoot(){
  return <ErrorBoundary><App/></ErrorBoundary>;
}

function App() {
  const [state,dispatch]=useReducer(reducer,initialState);
  const {toasts,push:toast}=useToasts();
  const { insights, dismiss: dismissInsight, triggerMargin } = useStateEvents(state);
  const [tab,setTab]=useState("ops");
  const [search,setSearch]=useState(false);
  const [loading,setLoading]=useState(true);
  const [mobileView,setMobileView]=useState(()=>window.innerWidth<1024);
  const [quickOpen,setQuickOpen]=useState(false); // scroll-lock compat
  const [masOpen,setMasOpen]=useState(false);
  const [darkMode,setDarkMode]=useState(()=>{
    try { return localStorage.getItem("logisolve_theme")!=="light"; } catch{ return true; }
  });
  const C = darkMode ? C_DARK : C_LIGHT; // local C shadows module-level alias
  const { status: syncStatus, setSaving, setSaved, setOffline, setError: setSyncError } = useSyncStatus();

  // Double-click / concurrent save protection
  const savingRef = useRef(false);
  // Safe soft-delete timers — keyed by ticket ID to allow cancel on restore/undo
  const deleteTimersRef = useRef({});

  const scheduleHardDelete = useCallback((id) => {
    // Cancel any existing timer for this ID first
    if (deleteTimersRef.current[id]) clearTimeout(deleteTimersRef.current[id]);
    deleteTimersRef.current[id] = setTimeout(() => {
      delete deleteTimersRef.current[id];
      dispatch({type:"TKT_DELETE", id});
    }, 8000);
  }, []);

  const cancelHardDelete = useCallback((id) => {
    if (deleteTimersRef.current[id]) {
      clearTimeout(deleteTimersRef.current[id]);
      delete deleteTimersRef.current[id];
    }
  }, []);

  // Cancel all pending hard deletes on unmount
  useEffect(() => {
    return () => {
      Object.values(deleteTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  // Soft-delete trash (restore within session)
  const [trash, setTrash] = useState([]);
  const softDelete = useCallback((item, type) => {
    setTrash(p=>[...p, {item, type, deletedAt: Date.now()}]);
  }, []);

  // Track deleted IDs so sync can remove them from Supabase
  const deletedRef = useRef({tickets:new Set(),clients:new Set(),suppliers:new Set(),units:new Set(),parts:new Set()});

  const dispatchWithDelete = useCallback((action)=>{
    if(action.type==="TKT_DELETE")    { deletedRef.current.tickets.add(action.id); }
    if(action.type==="CLI_DELETE")    { deletedRef.current.clients.add(action.id); }
    if(action.type==="SUP_DELETE")    { deletedRef.current.suppliers.add(action.id); }
    if(action.type==="UNIT_DELETE")   { deletedRef.current.units.add(action.id); }
    if(action.type==="PART_DELETE")   { deletedRef.current.parts.add(action.id); }
    opLog.push(action.type, {id: action.id||action.c?.id||action.u?.id||""});
    dispatch(action);
  },[]);

  // Load from Supabase on mount
  useEffect(()=>{
    (async()=>{
      const bumpSeq = (tickets=[]) => {
        // One-time migration: rename TKT-YYYYMMDD-NNN → OP-XXXX (globally unique sequential)
        const oldFmt = tickets.filter(t=>/^TKT-\d{8}-/.test(t.id));
        if(oldFmt.length > 0) {
          const sortKey = t => {
            const p=(t.date||"").split("/");
            const dk=p.length===3?`${p[2]}${p[1]}${p[0]}`:t.id;
            const sq=parseInt((t.id||"").split("-").pop())||0;
            return `${dk}-${String(sq).padStart(3,"0")}`;
          };
          oldFmt.sort((a,b)=>sortKey(a).localeCompare(sortKey(b)));
          let ctr=0;
          const renameMap=oldFmt.map(t=>{ctr++;return{oldId:t.id,newId:`OP-${String(ctr).padStart(4,"0")}`};});
          dispatch({type:"TKT_BULK_RENAME",map:renameMap});
          renameMap.forEach(({oldId})=>deletedRef.current.tickets.add(oldId));
          if(ctr>_seq){_seq=ctr;try{localStorage.setItem("logisolve_seq",String(_seq));}catch{}}
        } else {
          const maxSeq=tickets.reduce((m,t)=>{
            const n=parseInt((t.id||"").replace(/^(?:LS|OP)-/,""))||0;return Math.max(m,n);
          },0);
          if(maxSeq>=_seq){_seq=maxSeq+1;try{localStorage.setItem("logisolve_seq",String(_seq));}catch{}}
        }
      };
      try {
        await seedIfEmpty();
        const data = await loadAllFromSupabase();
        if(data) { dispatch({type:"IMPORT",data}); bumpSeq(data.tickets); opLog.push("LOAD_OK"); }
        else {
          const stored = loadFromStorage();
          if(stored) { dispatch({type:"IMPORT", data:stored}); bumpSeq(stored.tickets); }
          toast("Sin datos Supabase — usando datos locales del dispositivo","info");
          opLog.push("LOAD_LOCAL_FALLBACK");
        }
      } catch(e){
        opLog.push("LOAD_ERROR", {error: e?.message});
        console.warn("Supabase load error:",e);
        const stored = loadFromStorage();
        if(stored) { dispatch({type:"IMPORT", data:stored}); bumpSeq(stored.tickets); }
        toast("Error Supabase: "+e?.message+" — datos locales cargados","error");
      }
      finally { setLoading(false); }
    })();
  },[]);

  // Sync to Supabase — debounced 1200ms, with status indicator and offline queue
  const syncRef = useRef(null);
  useEffect(()=>{
    if(loading) return;
    saveToStorage(state);
    clearTimeout(syncRef.current);
    syncRef.current = setTimeout(async ()=>{
      if(savingRef.current) return; // prevent concurrent saves
      savingRef.current = true;
      setSaving();
      try {
        const online = navigator.onLine !== false;
        if(!online) {
          pendingQueue.push({type:"full_sync", ts: Date.now()});
          setOffline();
          opLog.push("SYNC_DEFERRED", {reason:"offline"});
          return;
        }
        // Flush any pending queue first
        pendingQueue.flush();
        // Upsert current rows
        await Promise.all([
          ...state.tickets.map(t=>upsertRow("tickets",t.id,t)),
          ...state.clients.map(c=>upsertRow("clients",c.id,c)),
          ...state.suppliers.map(s=>upsertRow("suppliers",s.id,s)),
          ...state.units.map(u=>upsertRow("units",u.id,u)),
          ...state.parts.map(p=>upsertRow("parts",p.id,p)),
        ]);
        // Delete removed rows
        deletedRef.current.tickets.forEach(id=>{ deleteRow("tickets",id); deletedRef.current.tickets.delete(id); });
        deletedRef.current.clients.forEach(id=>{ deleteRow("clients",id); deletedRef.current.clients.delete(id); });
        deletedRef.current.suppliers.forEach(id=>{ deleteRow("suppliers",id); deletedRef.current.suppliers.delete(id); });
        deletedRef.current.units.forEach(id=>{ deleteRow("units",id); deletedRef.current.units.delete(id); });
        deletedRef.current.parts.forEach(id=>{ deleteRow("parts",id); deletedRef.current.parts.delete(id); });
        setSaved();
        opLog.push("SYNC_OK");
      } catch(e) {
        setSyncError();
        opLog.push("SYNC_ERROR", {error: e?.message});
        pendingQueue.push({type:"full_sync", ts: Date.now()});
      } finally {
        savingRef.current = false;
      }
    },1200);
  },[state,loading]);

  // Retry pending when back online
  useEffect(()=>{
    const onOnline = () => {
      if(pendingQueue.peek().length > 0) {
        opLog.push("RETRY_SYNC", {pending: pendingQueue.peek().length});
        dispatch({type:"NOOP"}); // trigger re-sync
      }
    };
    window.addEventListener("online", onOnline);
    return ()=>window.removeEventListener("online", onOnline);
  },[]);

  useEffect(()=>{
    const h=e=>{if((e.ctrlKey||e.metaKey)&&e.key==="k"){e.preventDefault();setSearch(s=>!s);}};
    window.addEventListener("keydown",h);
    return()=>window.removeEventListener("keydown",h);
  },[]);

  useEffect(()=>{
    const h=()=>setMobileView(window.innerWidth<1024);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);

  // Body scroll lock when a bottom sheet is open on mobile — prevents scroll into empty space on iPhone
  useEffect(()=>{
    if(!mobileView||(!quickOpen&&!masOpen)) {
      document.body.style.overflow="";
      document.body.style.position="";
      document.body.style.width="";
      return;
    }
    const y=window.scrollY;
    document.body.style.overflow="hidden";
    document.body.style.position="fixed";
    document.body.style.top=`-${y}px`;
    document.body.style.width="100%";
    return()=>{
      document.body.style.overflow="";
      document.body.style.position="";
      document.body.style.top="";
      document.body.style.width="";
      window.scrollTo(0,y);
    };
  },[mobileView,quickOpen,masOpen]);

  const p1Active  = useMemo(()=>state.tickets.filter(t=>t.priority==="P1"&&!CLOSED_SET.has(t.status)).length,[state.tickets]);
  const vencidos  = useMemo(()=>state.tickets.filter(t=>{if(!t.promesaPago||t.cobrado||t.status==="cancelado")return false;const d=parseDateMX(t.promesaPago);return d&&new Date()>d;}).length,[state.tickets]);
  const abiertas  = useMemo(()=>state.tickets.filter(t=>!CLOSED_SET.has(t.status)).length,[state.tickets]);

  // Sync status display config
  const syncDisplay = {
    idle:    { label:"",            color:"transparent",  dot:"transparent" },
    saving:  { label:"Guardando…",  color:C.t3,           dot:C.yellow      },
    saved:   { label:"Guardado",    color:C.green,        dot:C.green       },
    offline: { label:"Sin conexión",color:C.yellow,       dot:C.yellow      },
    error:   { label:"Error sync",  color:C.red,          dot:C.red         },
  };
  const sd = syncDisplay[syncStatus] || syncDisplay.idle;

  if(loading) return (
    <ThemeCtx.Provider value={C}>
      <div style={{minHeight:"100vh",background:darkMode?"#0D0F12":"linear-gradient(180deg,#F7F6F3 0%,#ECE9E4 100%)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
        <Logo/>
        <div style={{fontSize:10,color:C.t3,fontFamily:"'Courier New',monospace",letterSpacing:"0.2em",marginTop:8}}>CARGANDO DATOS...</div>
      </div>
    </ThemeCtx.Provider>
  );

  return (
    <ThemeCtx.Provider value={C}>
    <div data-theme={darkMode?"dark":"light"} style={{minHeight:"100vh",
      background: darkMode
        ? "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(143,227,190,0.07) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 85% 80%,rgba(143,227,190,0.04) 0%,transparent 50%),#0D0F12"
        : "radial-gradient(ellipse 60% 50% at 15% 20%,rgba(159,224,190,0.28) 0%,transparent 55%),radial-gradient(ellipse 50% 45% at 88% 60%,rgba(185,215,255,0.20) 0%,transparent 50%),radial-gradient(ellipse 45% 40% at 55% 90%,rgba(220,200,255,0.14) 0%,transparent 50%),radial-gradient(ellipse 35% 30% at 75% 10%,rgba(255,220,180,0.12) 0%,transparent 45%),linear-gradient(160deg,#F5F4F0 0%,#E8E3DB 100%)",
      color:C.t1,fontFamily:"'Trebuchet MS',sans-serif",fontSize:13,
      transition:"background 350ms ease"}}>
      {search&&<SearchPalette state={state} onNavigate={t=>{setTab(t);}} onClose={()=>setSearch(false)}/>}

      {/* NAV */}
      <div style={{background:darkMode?"rgba(13,15,18,0.85)":"rgba(255,255,255,0.88)",backdropFilter:"blur(44px) saturate(2.8) brightness(1.01)",WebkitBackdropFilter:"blur(44px) saturate(2.8) brightness(1.01)",borderBottom:`1px solid ${darkMode?C.borderHi:"rgba(0,0,0,0.08)"}`,padding:"6px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,flexWrap:"wrap",gap:4,boxShadow:darkMode?"none":"0 2px 16px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,1) inset"}}>
        <Logo/>
        <div style={{display:"flex",gap:2,alignItems:"center",flexWrap:"wrap"}}>
          {/* Desktop tabs — hidden on mobile view */}
          {!mobileView && TABS.map(t=>{
            const badge=t.id==="cartera"&&vencidos>0?vencidos:t.id==="tickets"&&abiertas>0?abiertas:t.id==="ops"&&p1Active>0?p1Active:0;
            const isP1Tab=t.id==="ops"&&p1Active>0;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"3px 9px",borderRadius:6,cursor:"pointer",fontSize:10,fontWeight:600,
                  background:tab===t.id?C.blueDim:"transparent",
                  border:`1px solid ${tab===t.id?C.blueHi:C.border}`,
                  color:tab===t.id?C.blue:C.t2,position:"relative",letterSpacing:"0.04em"}}>
                {t.label}
                {badge>0&&<span style={{position:"absolute",top:-4,right:-4,width:13,height:13,borderRadius:"50%",background:isP1Tab?C.p1dot:t.id==="cartera"?C.red:C.yellow,fontSize:7,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",color:"#0D0F12"}}>{badge}</span>}
              </button>
            );
          })}
          <div style={{width:1,height:12,background:C.border,margin:"0 3px"}}/>
          {!mobileView&&<button onClick={()=>setSearch(true)} style={{padding:"3px 8px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,color:C.t2,fontSize:10,cursor:"pointer",touchAction:"manipulation"}}>
            &#9906; <span style={{fontSize:7,color:C.t3}}>Ctrl+K</span>
          </button>}
          {/* Sync status indicator */}
          {syncStatus!=="idle"&&(
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:6,border:`1px solid ${C.border}`}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:sd.dot,flexShrink:0,
                animation:syncStatus==="saving"?"pulse 1s infinite":"none"}}/>
              <span style={{fontSize:8,color:sd.color,letterSpacing:"0.06em"}}>{sd.label}</span>
            </div>
          )}
          {/* Mobile/Desktop toggle */}
          <button onClick={()=>setMobileView(v=>!v)}
            style={{padding:"3px 9px",background:mobileView?C.blueDim:"transparent",border:`1px solid ${mobileView?C.blueHi:C.border}`,borderRadius:6,color:mobileView?C.blue:C.t3,fontSize:10,cursor:"pointer",letterSpacing:"0.04em",touchAction:"manipulation"}}>
            {mobileView?"[ ] Escritorio":"[=] Movil"}
          </button>
          {/* Theme toggle */}
          <button onClick={()=>{ const v=!darkMode; setDarkMode(v); try{localStorage.setItem("logisolve_theme",v?"dark":"light");}catch{} }}
            style={{padding:"3px 9px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:6,color:C.blue,fontSize:11,cursor:"pointer",letterSpacing:"0.02em",touchAction:"manipulation",minWidth:36}}>
            {darkMode?"☀":"🌙"}
          </button>
        </div>
      </div>

      {/* ── Nav móvil nativa — 4 tabs + FAB ── */}
      {mobileView&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:150,
          paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
          <div style={{
            margin:"0 auto 10px",maxWidth:660,padding:"0 12px",boxSizing:"border-box"}}>
          <div style={{
            background: darkMode ? "rgba(15,17,22,0.78)" : "rgba(255,255,255,0.92)",
            backdropFilter:"blur(44px) saturate(2.8) brightness(1.01)",WebkitBackdropFilter:"blur(44px) saturate(2.8) brightness(1.01)",
            border: darkMode ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(0,0,0,0.10)",
            borderRadius:28,
            display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1fr",
            boxShadow: darkMode
              ? "0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset"
              : "0 4px 24px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,1) inset"}}>
          {[
            {id:"ops",        label:"Centro",   icon:"⊙"},
            {id:"tickets",    label:"Pipeline", icon:"◈"},
            {id:"historial",  label:"Historial",icon:"☰"},
            {id:"ia",         label:"Resumen",   icon:"✦"},
            {id:"cobranza",   label:"Cobros",   icon:"$"},
            {id:"__mas__",    label:"Más",      icon:"···"},
          ].map(t=>{
            const isMore = t.id==="__mas__";
            const badge = t.id==="tickets"&&abiertas>0?abiertas : t.id==="ops"&&p1Active>0?p1Active : isMore&&vencidos>0?vencidos : 0;
            const moreActive = ["unidades","catalogo","proveedores","clientes","ajustes","cartera","cotizador","refacciones","sourcing","chat"].includes(tab);
            const active = isMore ? (moreActive||masOpen) : tab===t.id;
            return (
              <button key={t.id}
                onClick={()=>{ if(isMore){setMasOpen(v=>!v);}else{setTab(t.id);setMasOpen(false);} }}
                style={{padding:"10px 4px",
                  border:"none",cursor:"pointer",
                  background:"transparent",
                  borderTop:`2px solid ${active?(darkMode?C.blue:"#2A9768"):"transparent"}`,
                  position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                  minHeight:52,touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}}>
                <span style={{fontSize:20,lineHeight:1,color:active?(darkMode?C.blue:"#2A9768"):C.t3,
                  fontWeight:active?700:400}}>{t.icon}</span>
                <span style={{fontSize:10,color:active?(darkMode?C.blue:"#2A9768"):C.t3,
                  letterSpacing:"0.03em",fontWeight:active?600:400}}>{t.label}</span>
                {badge>0&&<span style={{position:"absolute",top:8,right:"calc(50% - 18px)",
                  minWidth:16,height:16,borderRadius:8,padding:"0 3px",
                  background:t.id==="ops"?C.p1dot:isMore?C.p1dot:C.p2dot,
                  fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",color:darkMode?"#0D0F12":"#fff"}}>{badge}</span>}
              </button>
            );
          })}
          </div>
          </div>
        </div>
      )}

      {/* Theme toggle — mobile floating button */}
      {mobileView&&(
        <button onClick={()=>{ const v=!darkMode; setDarkMode(v); try{localStorage.setItem("logisolve_theme",v?"dark":"light");}catch{} }}
          style={{position:"fixed",
            left:20,bottom:`calc(76px + env(safe-area-inset-bottom,0px) + 10px)`,
            zIndex:160,width:42,height:42,borderRadius:21,
            background:C._dark?"rgba(255,255,255,0.10)":"rgba(255,255,255,0.90)",
            border:C._dark?`1px solid ${C.border}`:"1px solid rgba(0,0,0,0.12)",
            backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
            boxShadow:C._dark?"0 4px 16px rgba(0,0,0,0.4)":"0 4px 16px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,1) inset",
            display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",fontSize:18,
            touchAction:"manipulation",WebkitTapHighlightColor:"transparent"}}>
          {darkMode?"☀":"🌙"}
        </button>
      )}

      {/* FAB — Nueva cotización */}
      {mobileView&&tab!=="cotizador"&&(
        <button className="fab-liquid"
          onClick={()=>setTab("cotizador")}
          style={{position:"fixed",
            right:20,bottom:`calc(76px + env(safe-area-inset-bottom,0px) + 10px)`,
            zIndex:160}}>
          +
        </button>
      )}

      {/* MasSheet — bottom sheet for "Más" modules */}
      {mobileView&&<MasSheet open={masOpen} onClose={()=>setMasOpen(false)} tab={tab} setTab={t=>{setTab(t);setMasOpen(false);}}/>}

      {/* Content */}
      <div style={{paddingBottom:mobileView?"calc(90px + env(safe-area-inset-bottom,0px))":0,
        WebkitOverflowScrolling:"touch",
        maxWidth:mobileView?680:undefined,margin:mobileView?"0 auto":undefined}}>
        {tab==="ops"        &&(mobileView?<MOps       state={state} setTab={setTab} triggerMargin={triggerMargin}/>      :<CentroOps   state={state}/>)}
        {tab==="tickets"    &&(mobileView?<MPipeline  state={state} dispatch={dispatchWithDelete} toast={toast}/>         :<Tickets     state={state} dispatch={dispatchWithDelete} toast={toast} scheduleHardDelete={scheduleHardDelete}/>)}
        {tab==="historial"  &&(mobileView?<MHistorial state={state} dispatch={dispatchWithDelete} toast={toast} scheduleHardDelete={scheduleHardDelete} cancelHardDelete={cancelHardDelete}/>:<Historial   state={state} dispatch={dispatchWithDelete} toast={toast} scheduleHardDelete={scheduleHardDelete} cancelHardDelete={cancelHardDelete}/>)}
        {tab==="cotizador"  &&(mobileView?<MCotizador state={state} dispatch={dispatchWithDelete} toast={toast}/>:<Cotizador state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="refacciones"&&(mobileView?<MCotizador state={state} dispatch={dispatchWithDelete} toast={toast}/>:<CotizadorRefacciones state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="cartera"    &&(mobileView?<MCartera   state={state} dispatch={dispatchWithDelete} toast={toast}/>         :<Cartera     state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="unidades"   &&(mobileView?<MUnidades   state={state} dispatch={dispatchWithDelete} toast={toast}/>:<Unidades    state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="catalogo"   &&(mobileView?<MCatalogo   state={state} dispatch={dispatchWithDelete} toast={toast}/>:<Catalogo    state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="proveedores"&&(mobileView?<MProveedores state={state} dispatch={dispatchWithDelete} toast={toast}/>:<Proveedores state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="clientes"   &&(mobileView?<MClientes   state={state} dispatch={dispatchWithDelete} toast={toast}/>:<Clientes    state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="ajustes"    &&(mobileView?<MAjustes state={state} dispatch={dispatchWithDelete} toast={toast}/>:<Ajustes state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="ia"         &&<MInteligencia state={state}/>}
        {tab==="cobranza"   &&<MCobranza state={state} dispatch={dispatchWithDelete} toast={toast}/>}
        {tab==="chat"       &&<MChat state={state} dispatch={dispatchWithDelete} C={C} toast={toast}/>}
        {tab==="sourcing"   &&<SourcingCopilot state={state} dispatch={dispatchWithDelete} C={C} toast={toast}/>}
        {tab==="flota"      &&<FlotaModule darkMode={darkMode}/>}
      </div>

      <Toasts items={toasts}/>

      <style>{`
        :root{color-scheme:${darkMode?"dark":"light"}}
        html{background:${darkMode?"#0D0F12":"#E8E3DB"};transition:background 350ms ease}
        html,body{overscroll-behavior:none;overflow-x:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;touch-action:pan-y;}
        body{background:${darkMode
          ? "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(143,227,190,0.07) 0%,transparent 60%),radial-gradient(ellipse 50% 40% at 85% 80%,rgba(143,227,190,0.04) 0%,transparent 50%),#0D0F12"
          : "linear-gradient(180deg,#F7F6F3 0%,#ECE9E4 100%)"
        };color:${C.t1};min-height:100vh;transition:background 350ms ease}
        .scroll-touch{-webkit-overflow-scrolling:touch;overflow-y:auto}
        input[type=number]::-webkit-inner-spin-button{opacity:.3}
        input::placeholder,textarea::placeholder{color:${C.t4}}
        select option{background:${C.bgSolid};color:${C.t1}}
        *{box-sizing:border-box}
        button{transition:opacity 120ms ease,background 120ms ease,border-color 120ms ease;-webkit-tap-highlight-color:transparent}
        button:active{opacity:.8;}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:${darkMode?"rgba(255,255,255,0.10)":"rgba(0,0,0,0.12)"};border-radius:4px}
        textarea{color:${C.t2};resize:vertical;font-family:'Courier New',monospace}
        input,select,textarea{transition:border-color 150ms ease}
        @media(max-width:640px){
          .ref-grid{grid-template-columns:1fr!important}
          .ref-hdr-grid{grid-template-columns:1fr 1fr!important}
          .ref-half-grid{grid-template-columns:1fr!important}
          .ref-line-row1{grid-template-columns:1fr 1fr!important}
          .ref-line-row2{grid-template-columns:80px 1fr!important}
        }
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .sheet-enter{animation:slideUp 280ms cubic-bezier(.22,.8,.22,1) both}
        .fade-enter{animation:fadeIn 200ms ease both}
      `}</style>

      {/* ── AutoInsight — insights IA automáticos (WhatsApp, margen) ─────────────── */}
      <AutoInsight insights={insights} onDismiss={dismissInsight} C={C} />

    </div>
    </ThemeCtx.Provider>
  );
}
