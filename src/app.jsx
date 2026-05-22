import React, { useState, useReducer, useEffect, useRef, useCallback, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════════════
// L1 — DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
  bg0:"#070909", bg1:"#0C0F11", bg2:"#101415", bg3:"#151A1C", bg4:"#1A2022",
  border:"#222A2E", borderHi:"#2E3C42",
  blue:"#1A4D72", blueHi:"#215E8C", blueDim:"#0A2438",
  cyan:"#267A90", cyanDim:"#16505E",
  green:"#246845", greenDim:"#122E1E",
  red:"#7A2828", redDim:"#321010",
  yellow:"#866018", yellowDim:"#322408",
  orange:"#7A4E14",
  amber:"#8A5A10",
  t1:"#BEC5CA", t2:"#4E5C65", t3:"#283238", t4:"#181E22",
  p1:"#8A2020", p1dim:"#2E0A0A", p1dot:"#C84040",   // P1 CRITICO
  p2:"#7A5010", p2dim:"#2E1C04", p2dot:"#C08020",   // P2 URGENTE
  p3:"#1A5A4A", p3dim:"#082418", p3dot:"#30A080",   // P3 NORMAL
  p4:"#243A4A", p4dim:"#0C1820", p4dot:"#4A7A9A",   // P4 PREVENTIVO
};

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
  recibido:   { label:"Recibido",        color:"#2A3A4A", dot:"#4A6A8A" },
  validando:  { label:"Validando",       color:"#3A3A2A", dot:"#8A8A30" },
  sourcing:   { label:"Sourcing",        color:"#2A3A5A", dot:"#4A70C0" },
  cotizado:   { label:"Cotizado",        color:"#3A4A2A", dot:"#70A040" },
  autorizado: { label:"Autorizado",      color:"#1A4A2A", dot:"#30A050" },
  comprado:   { label:"Comprado",        color:"#1A3A2A", dot:"#30805A" },
  transito:   { label:"En Transito",     color:"#2A3A1A", dot:"#70A030" },
  entregado:  { label:"Entregado",       color:"#1A4A3A", dot:"#30C080" },
  facturado:  { label:"Facturado",       color:"#2A2A5A", dot:"#5050C0" },
  cobrado:    { label:"Cobrado",         color:"#1A5A1A", dot:"#30C030" },
  cerrado:    { label:"Cerrado",         color:"#2A3A2A", dot:"#507050" },
  cancelado:  { label:"Cancelado",       color:"#5A1A1A", dot:"#C03030" },
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

async function loadTable(table) {
  const rows = await sbFetch(`/${table}?select=id,data&order=created_at.asc`);
  return Array.isArray(rows) && rows.length>0 ? rows.map(r=>r.data) : null;
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

    // Defensive validation
    if (qty <= 0) opLog.push("WARN_QTY_INVALID", {id: ticket.id, qty});

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

let _seq=8;
function mkTicketId(dateStr) {
  const p=(dateStr||"").replace(/\//g,"-").split("-");
  let y,m,d;
  if(p.length===3){p[0].length===4?([y,m,d]=p):([d,m,y]=p);}
  else{const n=new Date();y=n.getFullYear();m=String(n.getMonth()+1).padStart(2,"0");d=String(n.getDate()).padStart(2,"0");}
  return `TKT-${y}${String(m).padStart(2,"0")}${String(d).padStart(2,"0")}-${String(_seq++).padStart(3,"0")}`;
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
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify({version:STORAGE_VER,savedAt:nowISO(),data:{tickets:s.tickets,clients:s.clients,suppliers:s.suppliers,units:s.units,parts:s.parts}})); }
  catch(e){ console.warn("storage:",e); }
}

function reducer(state,action) {
  switch(action.type) {
    // TICKETS
    case "TKT_ADD":    return {...state,tickets:[action.t,...state.tickets]};
    case "TKT_UPDATE": return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,...action.patch,history:[...(t.history||[]),mkEvent("edited",{fields:Object.keys(action.patch)})]})};
    case "TKT_STATUS": {
      const {id,to}=action;
      return {...state,tickets:state.tickets.map(t=>{
        if(t.id!==id) return t;
        if(!canTransition(t.status,to)) return t;
        const tlEvent = {ts:nowISO(),evento:"Estado: "+TICKET_META[to].label,actor:"Operador"};
        return {...t,status:to,cobrado:PAID_SET.has(to),timeline:[...(t.timeline||[]),tlEvent],history:[...(t.history||[]),mkEvent("status_changed",{from:t.status,to})]};
      })};
    }
    case "TKT_DELETE":   return {...state,tickets:state.tickets.filter(t=>t.id!==action.id)};
    case "TKT_SOFT_DEL": return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,_deleted:true,_deletedAt:nowISO()})};
    case "TKT_RESTORE":  return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,_deleted:false,_deletedAt:null})};
    case "TKT_COBRADO": return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,cobrado:true,status:"cobrado",timeline:[...(t.timeline||[]),{ts:nowISO(),evento:"Cobrado",actor:"Operador"}],history:[...(t.history||[]),mkEvent("cobrado")]})};
    case "TKT_TIMELINE": return {...state,tickets:state.tickets.map(t=>t.id!==action.id?t:{...t,timeline:[...(t.timeline||[]),{ts:nowISO(),evento:action.evento,actor:action.actor||"Operador"}]})};
    // CLIENTS
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
      opLog.push("UNITS_REPLACE", {count: deduped.length, raw: incoming.length});
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
  const folio  = tkt.id.replace("TKT","COT");
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
  const conceptos = tkt.lineas&&tkt.lineas.length>0
    ? tkt.lineas
    : [{titulo:tkt.titulo,partRef:tkt.partRef||"",snap:tkt.snap,qty:1,descripcionPDF:""}];
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
      <div style={{background:C.bg1,borderBottom:`1px solid ${C.border}`,
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
  const folio = tkt.id.replace("TKT", "COT");

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

  const conceptos =
    tkt.lineas && tkt.lineas.length > 0
      ? tkt.lineas
      : [{ titulo:tkt.titulo, partRef:tkt.partRef||"", snap:tkt.snap, qty:1, descripcionPDF:"" }];

  const filas = conceptos.map((c,i) => {
    const ml      = migrateLinea(c, tkt.snap);
    const qty     = safeNumber(ml.qty, 1) || 1;
    const fin     = resolveLineFinancials(ml, tkt.snap, qty);
    const desc    = ml.descripcionPDF ||
      "Atenci\u00f3n correctiva para continuidad operativa de unidad en CEDIS SMO. Incluye integraci\u00f3n de componente compatible, validaci\u00f3n operativa y seguimiento log\u00edstico.";
    const unTag   = unidadStr && i === 0 ? `<br><br><strong>Unidad:</strong> ${unidadStr}` : "";
    const refTag  = ml.partRef ? `<br><br><strong>Clave:</strong> ${ml.partRef}` : "";
    return `<tr>
      <td>${String(i+1).padStart(2,"0")}</td>
      <td>${ml.titulo||"Sin descripcion"}</td>
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
      .page{width:794px;background:#fff;padding:50px;font-family:Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.5}
      .top-header{border:1px solid #dcdcdc;padding:20px;display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0}
      .brand h1{font-size:28px;font-weight:800;margin:0}
      .brand p{font-size:10px;color:#666;font-weight:700;margin-top:4px}
      .issuer{text-align:right;font-size:11px;line-height:1.6}
      .hero{background:#000;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:20px;margin-top:14px}
      .hero-title{font-size:22px;font-weight:800}
      .hero-meta{text-align:right}
      .hero-meta .folio{font-size:18px;font-weight:800}
      .hero-meta .date{font-size:13px;font-weight:700}
      .meta-table{width:100%;border-collapse:collapse;margin-top:14px}
      .meta-table td{border:1px solid #e3e3e3;padding:10px 12px;font-size:11px}
      .meta-table td:first-child{width:100px;background:#fafafa;font-weight:700}
      .section-title{margin-top:22px;margin-bottom:10px;font-size:13px;font-weight:800}
      .detail-table{width:100%;border-collapse:collapse}
      .detail-table th{background:#000;color:#fff;padding:10px 12px;text-align:left;font-size:10px}
      .detail-table td{border:1px solid #e5e5e5;padding:12px;vertical-align:top;font-size:11px;line-height:1.6}
      .money{text-align:right;white-space:nowrap;font-weight:700}
      .totals{width:300px;margin-left:auto;margin-top:16px;border-collapse:collapse}
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
        <div class="brand">
          <h1>LOGISOLVE</h1>
          <p>Logistics &middot; Supply &middot; Solutions</p>
        </div>
        <div class="issuer">
          <strong>Alejandro Saucedo</strong><br>
          RFC: SAME9612277T9<br>
          Tel. 5562321807<br>
          contacto@logisolve.mx
        </div>
      </div>
      <div class="hero">
        <div class="hero-title">COTIZACI&Oacute;N</div>
        <div class="hero-meta">
          <div>No.</div>
          <div class="folio">${folio}</div>
          <div class="date">Fecha: ${tkt.date.replace(/\//g," / ")}</div>
        </div>
      </div>
      <table class="meta-table">
        <tr><td>Cliente</td><td>${clLine}</td></tr>
        <tr><td>Vigencia</td><td>3 d&iacute;as naturales</td></tr>
        <tr><td>Atenci&oacute;n</td><td>&Aacute;rea de Compras / Operaciones</td></tr>
      </table>
      <div class="section-title">DETALLE DEL CONCEPTO</div>
      <table class="detail-table">
        <thead><tr>
          <th style="width:36px">No.</th>
          <th style="width:160px">Concepto</th>
          <th>Descripci&oacute;n t&eacute;cnica / operativa</th>
          <th style="width:110px;text-align:right">Importe</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td>${fmtMXN(totals.subtotal)} MXN</td></tr>
        <tr><td>IVA (${totals.ivaPct}%)</td><td>${fmtMXN(totals.ivaAmt)} MXN</td></tr>
        <tr class="grand-total"><td>TOTAL &middot; IVA INCLUIDO</td><td>${fmtMXN(totals.total)} MXN</td></tr>
      </table>
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
          ${notaLine}
        </ul>
      </div>
      <div class="block">
        <h3>OBSERVACIONES</h3>
        <ul>
          <li>Tiempo estimado de entrega: ${entrega}, sujeto a disponibilidad.</li>
          <li>La validaci&oacute;n t&eacute;cnica final de compatibilidad corresponde al cliente.</li>
          <li>La garant&iacute;a aplica conforme a pol&iacute;ticas del fabricante o proveedor.</li>
        </ul>
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
      .from(container.firstElementChild)
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
// Modal de confirmacion PDF
function PDFConfirm({tkt,cl,un,supp,onClose}) {
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
  return (
    <div style={{display:"flex",alignItems:"center",gap:10}}>
      <svg width="22" height="22" viewBox="0 0 28 28">
        <line x1="2" y1="14" x2="26" y2="14" stroke={C.cyan} strokeWidth="1.5"/>
        <line x1="8" y1="14" x2="8" y2="8"   stroke={C.cyanDim} strokeWidth="1"/>
        <line x1="8" y1="8"  x2="17" y2="8"  stroke={C.cyanDim} strokeWidth="1"/>
        <line x1="17" y1="14" x2="17" y2="20" stroke={C.cyanDim} strokeWidth="1"/>
        <line x1="8"  y1="20" x2="17" y2="20" stroke={C.cyanDim} strokeWidth="1"/>
        <circle cx="2"  cy="14" r="2"   fill={C.cyan}/>
        <circle cx="8"  cy="14" r="1.4" fill={C.cyan}/>
        <circle cx="17" cy="14" r="1.4" fill={C.cyan}/>
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
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 10px",background:C.bg3,borderBottom:`1px solid ${C.border}`}}>
      <div style={{fontSize:7,color:C.t3,letterSpacing:"0.2em",fontWeight:700}}>{title}</div>
      {right&&<div style={{fontSize:9,color:C.t2}}>{right}</div>}
    </div>
  );
})

const MiniBar = React.memo(function MiniBar({value,max,color}) {
  return (
    <div style={{height:3,background:C.bg4,borderRadius:2,overflow:"hidden",marginTop:3}}>
      <div style={{height:"100%",width:`${clamp((value/Math.max(max,1))*100,0,100)}%`,background:color||C.cyan}}/>
    </div>
  );
})

const EmptyState = React.memo(function EmptyState({icon,title,sub}) {
  return (
    <div style={{textAlign:"center",padding:"32px 16px",color:C.t3}}>
      <div style={{fontSize:24,marginBottom:6,opacity:.4}}>{icon}</div>
      <div style={{fontSize:11,color:C.t2,marginBottom:3}}>{title}</div>
      {sub&&<div style={{fontSize:9,color:C.t3}}>{sub}</div>}
    </div>
  );
})

const Confirm = React.memo(function Confirm({msg,onConfirm,onCancel}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:5,padding:18,maxWidth:320,width:"90%"}}>
        <div style={{fontSize:11,color:C.t1,marginBottom:14,lineHeight:1.5}}>{msg}</div>
        <div style={{display:"flex",gap:7,justifyContent:"flex-end"}}>
          <button onClick={onCancel}  style={{padding:"4px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:10,cursor:"pointer"}}>Cancelar</button>
          <button onClick={onConfirm} style={{padding:"4px 12px",background:C.red,border:"none",borderRadius:3,color:C.t1,fontSize:10,fontWeight:700,cursor:"pointer"}}>Confirmar</button>
        </div>
      </div>
    </div>
  );
})

const Toasts = React.memo(function Toasts({items}) {
  if(!items.length) return null;
  const s=t=>t==="success"?{border:`1px solid ${C.green}55`,color:C.green,background:"#0d1a0d"}:t==="error"?{border:`1px solid ${C.red}55`,color:C.red,background:"#1a0d0d"}:{border:`1px solid ${C.border}`,color:C.t2,background:C.bg3};
  return (
    <div style={{position:"fixed",bottom:"calc(72px + env(safe-area-inset-bottom,0px) + 8px)",right:12,zIndex:999,display:"flex",flexDirection:"column",gap:5,maxWidth:"calc(100vw - 24px)"}}>
      {items.map(t=>(
        <div key={t.id} style={{borderRadius:10,padding:"9px 14px",fontSize:11,fontFamily:"'Courier New',monospace",maxWidth:300,...s(t.type),boxShadow:"0 4px 20px rgba(0,0,0,.4)"}}>
          {t.msg}
        </div>
      ))}
    </div>
  );
})

function SearchPalette({state,onNavigate,onClose}) {
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.8)",zIndex:600,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:70}} onClick={onClose}>
      <div style={{width:"90%",maxWidth:520,background:C.bg2,border:`1px solid ${C.borderHi}`,borderRadius:5,overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
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

// ── UNIT PICKER (búsqueda por económico, placa, marca, modelo) ──────────────
function UnitPicker({units, value, onChange, placeholder="Buscar por eco, placa, marca...", mobile=false}) {
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
    return () => document.removeEventListener("mousedown", h);
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
const Timeline = React.memo(function Timeline({events}) {
  if(!events||!events.length) return <div style={{padding:"8px 12px",fontSize:9,color:C.t3}}>Sin eventos registrados.</div>;
  return (
    <div style={{padding:"6px 12px"}}>
      {events.map((ev,i)=>(
        <div key={i} style={{display:"flex",gap:10,marginBottom:i<events.length-1?8:0}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:C.cyan,border:`1px solid ${C.cyanDim}`,flexShrink:0,marginTop:2}}/>
            {i<events.length-1&&<div style={{width:1,flex:1,background:C.border,minHeight:12,marginTop:2}}/>}
          </div>
          <div style={{paddingBottom:i<events.length-1?8:0,minWidth:0}}>
            <div style={{fontSize:8,color:C.t3,fontFamily:"'Courier New',monospace",marginBottom:1}}>{fmtTS(ev.ts)}</div>
            <div style={{fontSize:10,color:C.t1,lineHeight:1.3}}>{ev.evento}</div>
            {ev.actor&&<div style={{fontSize:8,color:C.t2,marginTop:1}}>{ev.actor}</div>}
          </div>
        </div>
      ))}
    </div>
  );
})

// ═══════════════════════════════════════════════════════════════════════════════
// L9 — MODULES
// ═══════════════════════════════════════════════════════════════════════════════

// ── CENTRO DE OPERACIONES (Dashboard) ────────────────────────────────────────
function CentroOps({state}) {
  const {tickets,clients,suppliers,units} = state;
  const active = useMemo(()=>tickets.filter(t=>!t._deleted&&t.status!=="cancelado"),[tickets]);

  // ── LAYER 1: OPERADO — entregado+facturado+cobrado+cerrado ─────────────────
  const operados = useMemo(()=>active.filter(t=>OPERADO_SET.has(t.status)),[active]);
  const revenueOp   = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),[operados]);
  const utilidadOp  = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.uNeta),0),[operados]);
  const uBrutaOp    = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.uBruta),0),[operados]);
  const costoOp        = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.costoTotal),0),[operados]);
  const costoProducto  = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.costoBase)*(1+safeNumber(t.snap.params?.iva,16)/100),0),[operados]);
  const gastosOp       = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.gastos),0),[operados]);
  const totalInv       = costoProducto;
  const ivaNetoOp   = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.ivaNeto),0),[operados]);
  const isrOp       = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.isr),0),[operados]);
  const cargaFiscal = ivaNetoOp + isrOp;
  const margenOp    = revenueOp>0?(utilidadOp/revenueOp)*100:0;
  const eficienciaFiscal = uBrutaOp>0?(utilidadOp/uBrutaOp)*100:0;
  const roi         = totalInv>0?(utilidadOp/totalInv)*100:0;
  const markupProm  = useMemo(()=>{const v=operados.filter(t=>safeNumber(t.snap.costoTotal)>0);return v.length>0?v.reduce((s,t)=>s+calcMarkup(t.snap.precioSinIVA,t.snap.costoTotal),0)/v.length:0;},[operados]);

  // ── LAYER 2: CASH — solo cobrado/cerrado ───────────────────────────────────
  const cobrados    = useMemo(()=>active.filter(t=>CASH_SET.has(t.status)),[active]);
  const cashTotal   = useMemo(()=>cobrados.reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),[cobrados]);
  const cashNeta    = useMemo(()=>cobrados.reduce((s,t)=>s+safeNumber(t.snap.uNeta),0),[cobrados]);

  // ── LAYER 3: CARTERA — entregado+facturado no cobrado ──────────────────────
  const cartera     = useMemo(()=>active.filter(t=>CARTERA_SET.has(t.status)&&!t.cobrado),[active]);
  const carteraMonto= useMemo(()=>cartera.reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),[cartera]);
  const cxp         = useMemo(()=>active.filter(t=>OPERADO_SET.has(t.status)&&!t.pagadoProveedor).reduce((s,t)=>s+safeNumber(t.snap.costoTotal),0),[active]);
  const flujoOp     = carteraMonto - cargaFiscal - cxp;
  const vencidos    = useMemo(()=>cartera.filter(t=>{if(!t.promesaPago)return false;const d=parseDateMX(t.promesaPago);return d&&new Date()>d;}),[cartera]);

  // ── LAYER 4: FORECAST — cotizado+autorizado ────────────────────────────────
  const forecastTkts= useMemo(()=>active.filter(t=>FORECAST_SET.has(t.status)),[active]);
  const forecastMonto=useMemo(()=>forecastTkts.reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),[forecastTkts]);
  const forecastUtil= useMemo(()=>forecastTkts.reduce((s,t)=>s+utilidadPonderada(safeNumber(t.snap.uNeta),t.prob),0),[forecastTkts]);
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
    return{label:op.label,short:op.short,count:sub.length,neta:sub.reduce((s,t)=>s+safeNumber(t.snap.uNeta),0),fact:sub.reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0)};
  }).sort((a,b)=>b.neta-a.neta),[operados]);
  const maxByOp = Math.max(...byOp.map(o=>o.neta),1);

  // Top clientes — only operados
  const topClients = useMemo(()=>clients.map(c=>{
    const co=operados.filter(t=>t.clientId===c.id);
    return{label:c.empresa,neta:co.reduce((s,t)=>s+safeNumber(t.snap.uNeta),0),fact:co.reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),count:co.length};
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

  // Aging cartera
  const aging = useMemo(()=>{
    const pend=tickets.filter(t=>t.payType==="credit"&&!t.cobrado&&t.status!=="cancelado"&&t.promesaPago);
    const bucket=(mn,mx)=>pend.filter(t=>{const d=parseDateMX(t.promesaPago);if(!d)return false;const ms=Date.now()-d.getTime();return ms>=mn*86400000&&(mx==null||ms<mx*86400000);}).reduce((s,t)=>s+t.snap.precioConIVA,0);
    return{a30:bucket(0,30),a60:bucket(30,60),mas60:bucket(60,null)};
  },[tickets]);

  // Top proveedores
  const topSupp = useMemo(()=>suppliers.map(s=>{
    const so=tickets.filter(t=>t.supplierId===s.id);
    return{label:s.nombre,neta:so.reduce((s,t)=>s+t.snap.uNeta,0),count:so.length};
  }).filter(s=>s.count>0).sort((a,b)=>b.neta-a.neta).slice(0,4),[tickets,suppliers]);

  // Eficiencia
  const eficientes = useMemo(()=>tickets.filter(t=>t.horasOp>0).map(t=>({titulo:t.titulo,uPH:t.snap.uNeta/t.horasOp,uNeta:t.snap.uNeta,horas:t.horasOp})).sort((a,b)=>b.uPH-a.uPH).slice(0,4),[tickets]);

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
              <span style={{fontSize:9,color:"#C04040",fontWeight:700}}>CARTERA VENCIDA — {vencidos.length} op. / {mxn(vencidos.reduce((s,t)=>s+t.snap.precioConIVA,0))}</span>
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
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
      <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",marginBottom:7}}>
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
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,padding:10}}>
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
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,padding:10}}>
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
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,padding:10}}>
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
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,padding:10}}>
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
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",minWidth:220}}>
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
          style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 8px",color:C.t1,fontSize:10,outline:"none",width:180,fontFamily:"'Courier New',monospace"}}/>
        <select value={fPrio} onChange={e=>setFPrio(e.target.value)} style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t1,fontSize:10,outline:"none",cursor:"pointer"}}>
          <option value="all">Todas las prioridades</option>
          {Object.values(PRIORITY).map(p=><option key={p.id} value={p.id} style={{background:C.bg1}}>{p.id} — {p.label}</option>)}
        </select>
        <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t1,fontSize:10,outline:"none",cursor:"pointer"}}>
          <option value="all">Todos los estados</option>
          {TICKET_ALL.map(id=><option key={id} value={id} style={{background:C.bg1}}>{TICKET_META[id].label}</option>)}
        </select>
        <span style={{fontSize:8,color:C.t3}}>{filtered.length} resultado{filtered.length!==1?"s":""}</span>
      </div>

      <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
                <div style={{fontSize:9,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{mxn(t.snap.precioConIVA)}</div>
                <div style={{fontSize:9,fontWeight:700,color:t.snap.uNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{mxn(t.snap.uNeta)}</div>
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
                      <SHdr title="TIMELINE OPERATIVO"/>
                      <Timeline events={t.timeline||[]}/>
                      {/* Agregar evento */}
                      <div style={{padding:"6px 10px",borderTop:`1px solid ${C.border}`,display:"flex",gap:5}}>
                        <input value={tlInput.evento} onChange={e=>setTlInput(p=>({...p,evento:e.target.value}))} placeholder="Nuevo evento..."
                          style={{flex:1,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t1,fontSize:9,outline:"none",fontFamily:"inherit"}}/>
                        <input value={tlInput.actor} onChange={e=>setTlInput(p=>({...p,actor:e.target.value}))} placeholder="Actor"
                          style={{width:80,background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t2,fontSize:9,outline:"none",fontFamily:"inherit"}}/>
                        <button onClick={()=>addTlEvent(t.id)} style={{padding:"4px 9px",background:C.blue,border:"none",borderRadius:3,color:C.t1,fontSize:9,cursor:"pointer",fontWeight:600}}>+</button>
                      </div>
                    </div>
                    {/* Detalles + acciones */}
                    <div>
                      <SHdr title="DETALLE FINANCIERO"/>
                      <div style={{padding:"6px 10px"}}>
                        {[["Costo total",mxn(t.snap.costoTotal),C.t1],["Markup",fpct(calcMarkup(t.snap.precioSinIVA,t.snap.costoTotal)),C.blueHi],["Precio c/IVA",mxn(t.snap.precioConIVA),C.cyan],["IVA neto SAT",mxn(t.snap.ivaNeto),C.yellow],["Util. bruta",mxn(t.snap.uBruta),C.t1],["ISR",mxn(t.snap.isr),C.yellow],["Util. neta",mxn(t.snap.uNeta),t.snap.uNeta>=0?C.green:C.red],["Margen neto",fpct(t.snap.margenNetoPrecio),margenColor(t.snap.margenNetoPrecio)]].map(([lbl,val,col],j)=>(
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
          <div style={{background:C.bg1,border:`1px solid ${C.borderHi}`,borderRadius:5,width:"90%",maxWidth:520,overflow:"hidden"}}
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
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
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 9px",background:C.bg3,borderBottom:`1px solid ${C.border}`}}>
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
                            style={{width:"100%",background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.t1,fontSize:10,outline:"none",fontFamily:"inherit"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>NUM. PARTE</div>
                          <input value={l.partRef} onChange={e=>updateLinea(i,{partRef:e.target.value})} placeholder="OEM / ref."
                            style={{width:"100%",background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.t2,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace"}}/>
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
                          <div style={{display:"flex",alignItems:"center",background:C.bg1,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden"}}>
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
                            <div style={{display:"flex",alignItems:"center",background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,overflow:"hidden"}}>
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
                                style={{width:55,background:C.bg1,border:`1px solid ${C.blueHi}`,borderRadius:3,padding:"3px 5px",color:C.cyan,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace",textAlign:"right"}}/>
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
                            <div style={{display:"flex",alignItems:"center",background:C.bg1,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden",flex:1}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:6,overflow:"hidden"}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:5,overflow:"hidden"}}>
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
            <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",marginBottom:5}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,padding:8}}>
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
      }).from(container.firstElementChild).save().finally(()=>{container.remove();});
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
          <div style={{background:C.bg1,border:`1px solid ${C.borderHi}`,borderRadius:5,width:"90%",maxWidth:520,overflow:"hidden"}}
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
            <SHdr title="DATOS DE LA COTIZACIÓN"/>
            <div style={{padding:9}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5,marginBottom:5}}>
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
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:5}}>
                <Sel label="Cliente" value={clientId} onChange={setClientId}
                  options={[{value:"",label:"-- Sin cliente --"},...clients.map(c=>({value:c.id,label:c.empresa}))]}/>
                <Sel label="Proveedor" value={supplierId} onChange={setSupplierId}
                  options={[{value:"",label:"-- Sin proveedor --"},...suppliers.map(s=>({value:s.id,label:s.nombre}))]}/>
              </div>
              <UnitPicker units={units} value={unitId} onChange={setUnitId}/>
              {selectedUnit&&(
                <div style={{background:C.bg3,border:`1px solid ${C.borderHi}`,borderRadius:3,padding:"6px 9px",marginTop:4,marginBottom:4}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
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
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 9px",background:C.bg3,borderBottom:`1px solid ${C.border}`}}>
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
                      <div style={{display:"grid",gridTemplateColumns:"1fr 120px 120px auto",gap:5,marginBottom:6}}>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>DESCRIPCIÓN</div>
                          <input value={l.descripcion} onChange={e=>updateLinea(i,{descripcion:e.target.value})}
                            placeholder={`Refacción ${i+1}`}
                            style={{width:"100%",background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.t1,fontSize:10,outline:"none",fontFamily:"inherit"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>NUM. OEM</div>
                          <input value={l.oem} onChange={e=>updateLinea(i,{oem:e.target.value})} placeholder="A0012345..."
                            style={{width:"100%",background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.cyan,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace"}}/>
                        </div>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>AFTERMARKET</div>
                          <input value={l.aftermarket} onChange={e=>updateLinea(i,{aftermarket:e.target.value})} placeholder="Alt. compatible"
                            style={{width:"100%",background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 6px",color:C.t2,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace"}}/>
                        </div>
                        <div style={{display:"flex",alignItems:"flex-end"}}>
                          <button onClick={()=>setCatalogSearch(i)}
                            style={{padding:"4px 8px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:3,color:C.cyan,fontSize:8,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                            Catálogo
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Qty + Cost + Mode + Price */}
                      <div style={{display:"grid",gridTemplateColumns:"80px 1fr auto",gap:5,alignItems:"end"}}>
                        <div>
                          <div style={{fontSize:7,color:C.t3,marginBottom:2}}>CANT.</div>
                          <div style={{display:"flex",alignItems:"center",background:C.bg1,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden"}}>
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
                          <div style={{display:"flex",alignItems:"center",background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,overflow:"hidden"}}>
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
                                  style={{width:52,background:C.bg1,border:`1px solid ${C.blueHi}`,borderRadius:3,padding:"3px 5px",color:C.cyan,fontSize:9,outline:"none",fontFamily:"'Courier New',monospace",textAlign:"right"}}/>
                              )}
                              <span style={{fontSize:8,color:C.t3}}>→</span>
                              <span style={{fontSize:9,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{mxn(unitPriceConIVA)}/pz</span>
                            </div>
                          ):(
                            <div style={{display:"flex",alignItems:"center",gap:5}}>
                              <span style={{fontSize:7,color:C.t3,flexShrink:0}}>Precio c/IVA:</span>
                              <div style={{display:"flex",alignItems:"center",background:C.bg1,border:`1px solid ${C.blueHi}`,borderRadius:3,overflow:"hidden"}}>
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
                        placeholder="Aplicación, compatibilidad, notas internas..."
                        style={{width:"100%",background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,outline:"none",color:C.t3,fontSize:8,padding:"5px 0",marginTop:6,fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tax params */}
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:6,overflow:"hidden"}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:5,overflow:"hidden"}}>
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
            <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden",marginBottom:5}}>
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
          <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,padding:8}}>
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
        <div style={{background:C.bg1,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:4,padding:11,marginBottom:8}}>
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
            style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 8px",color:C.t1,fontSize:10,outline:"none",width:220,fontFamily:"'Courier New',monospace"}}/>
          <select value={fStatus} onChange={e=>setFStatus(e.target.value)} style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 7px",color:C.t1,fontSize:10,outline:"none",cursor:"pointer"}}>
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
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
        <div style={{background:C.bg1,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:4,padding:11,marginBottom:8}}>
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
          style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:3,padding:"4px 9px",color:C.t1,fontSize:10,outline:"none",width:320,fontFamily:"'Courier New',monospace"}}/>
      </div>

      {parts.length===0&&!showForm&&<EmptyState icon="&#128295;" title="Sin partes registradas" sub='Agrega la primera con "+ Nueva parte"'/>}

      {filtered.length>0&&(
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
    return{total:so.length,neta:so.reduce((s,t)=>s+t.snap.uNeta,0),inv:so.reduce((s,t)=>s+t.snap.costoBase*(1+(t.snap.params.iva||16)/100),0)};
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
        <div style={{background:C.bg1,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:4,padding:11,marginBottom:8}}>
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
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
    return{total:co.length,fact:co.reduce((s,t)=>s+t.snap.precioConIVA,0),neta:co.reduce((s,t)=>s+t.snap.uNeta,0),pend:co.filter(t=>t.payType==="credit"&&!t.cobrado).reduce((s,t)=>s+t.snap.precioConIVA,0)};
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
        <div style={{background:C.bg1,border:`1px solid ${editId?C.blueHi:C.border}`,borderRadius:4,padding:11,marginBottom:8}}>
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
        <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
                        <span style={{color:t.snap.uNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace",flexShrink:0}}>{mxn(t.snap.uNeta)}</span>
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
  const {tickets,clients}=state;
  const now=useMemo(()=>new Date(),[]);
  const creditOps  = useMemo(()=>tickets.filter(t=>t.payType==="credit"&&t.status!=="cancelado"),[tickets]);
  const pendientes = useMemo(()=>creditOps.filter(t=>!t.cobrado),[creditOps]);
  const cobrados   = useMemo(()=>creditOps.filter(t=>t.cobrado),[creditOps]);
  const vencidos   = useMemo(()=>pendientes.filter(t=>{const d=parseDateMX(t.promesaPago);return d&&now>d;}),[pendientes,now]);

  return (
    <div style={{padding:"10px 13px",maxWidth:950,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:8}}>
        <KPI label="Cartera pendiente" value={mxn(pendientes.reduce((s,t)=>s+t.snap.precioConIVA,0))} color={C.yellow} accent sub={pendientes.length+" tickets"}/>
        <KPI label="Vencidas"          value={mxn(vencidos.reduce((s,t)=>s+t.snap.precioConIVA,0))}   color={C.red}    alert={vencidos.length>0} sub={vencidos.length+" vencidas"}/>
        <KPI label="Cobrado (credito)" value={mxn(cobrados.reduce((s,t)=>s+t.snap.precioConIVA,0))}   color={C.green}  sub={cobrados.length+" cobradas"}/>
        <KPI label="Emision total"     value={mxn(creditOps.reduce((s,t)=>s+t.snap.precioConIVA,0))}  color={C.t1}     sub="credito emitido"/>
      </div>
      {vencidos.length>0&&(
        <div style={{background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:3,padding:"6px 10px",marginBottom:7}}>
          <div style={{fontSize:8,color:C.red,fontWeight:700,marginBottom:3}}>CARTERA VENCIDA — {vencidos.length} operaciones</div>
          {vencidos.map(t=>{const cl=clients.find(c=>c.id===t.clientId);return(
            <div key={t.id} style={{fontSize:8,color:C.t2,marginBottom:2,fontFamily:"'Courier New',monospace"}}>{t.id} · {cl?.empresa||"---"} · {mxn(t.snap.precioConIVA)} · Vto: {t.promesaPago}</div>
          );})}
        </div>
      )}
      <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
              <div style={{fontSize:10,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(t.snap.precioConIVA)}</div>
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
                      <div style={{marginTop:8,padding:"8px",background:C.bg1,borderRadius:3,border:`1px solid ${C.border}`}}>
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
        <div key={sec.title} style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,marginBottom:7,overflow:"hidden"}}>
          <SHdr title={sec.title}/>
          {sec.content}
        </div>
      ))}
    </div>
  );
}

// ── HISTORIAL ─────────────────────────────────────────────────────────────────
function Historial({state,dispatch,toast,scheduleHardDelete,cancelHardDelete}) {
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
      case "total_desc": return arr.sort((a,b)=>safeNumber(b.snap.precioConIVA)-safeNumber(a.snap.precioConIVA));
      case "uneta_desc": return arr.sort((a,b)=>safeNumber(b.snap.uNeta)-safeNumber(a.snap.uNeta));
      case "priority":   return arr.sort((a,b)=>a.priority.localeCompare(b.priority));
      default:           return arr.sort((a,b)=>toSortable(b.date).localeCompare(toSortable(a.date)));
    }
  },[activeTickets,sortBy]);

  const realizados = useMemo(()=>activeTickets.filter(t=>REVENUE_SET.has(t.status)),[activeTickets]);
  const totalFact = useMemo(()=>realizados.reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),[realizados]);
  const totalNeta = useMemo(()=>realizados.reduce((s,t)=>s+safeNumber(t.snap.uNeta),0),[realizados]);
  const totalInv  = useMemo(()=>realizados.reduce((s,t)=>s+safeNumber(t.snap.costoBase)*(1+(safeNumber(t.snap.params?.iva,16))/100),0),[realizados]);
  const pctN      = totalFact>0?(totalNeta/totalFact)*100:0;

  const days = useMemo(()=>{
    const d={};
    activeTickets.forEach(t=>{if(!d[t.date])d[t.date]={v:0,n:0,c:0};d[t.date].v+=safeNumber(t.snap.precioConIVA);d[t.date].n+=safeNumber(t.snap.uNeta);d[t.date].c++;});
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
    const iva = t.snap.params?.iva||16;
    const ivaR = iva/100;
    // costoBase en snap es sin IVA; el cotizador trabaja con costo CON IVA
    const toConIVA = (snap) => (snap?.costoBase||0)*(1+ivaR);
    let lineas;
    if(t.lineas&&t.lineas.length>0) {
      lineas = t.lineas.map(l=>({
        titulo:l.titulo||"", partRef:l.partRef||"",
        qty:l.qty||1, costoUnit:toConIVA(l.snap),
        gasolina:l.snap?.gastos||0, otros:0,
        mode:"manual", manualPrice:(l.snap?.precioConIVA||0).toFixed(2),
        customMgn:false, customVal:27,
        descripcionPDF:l.descripcionPDF||"",
      }));
    } else {
      const parts=(t.titulo||"").split(" / ").filter(Boolean);
      if(parts.length>1) {
        const pxLinea=(t.snap.precioConIVA/parts.length).toFixed(2);
        const costoXLinea=toConIVA(t.snap)/parts.length;
        lineas=parts.map(p=>({titulo:p.trim(),partRef:"",qty:1,costoUnit:costoXLinea,gasolina:0,otros:0,mode:"manual",manualPrice:pxLinea,customMgn:false,customVal:27,descripcionPDF:""}));
      } else {
        lineas=[{titulo:t.titulo||"",partRef:t.partRef||"",qty:1,costoUnit:toConIVA(t.snap),gasolina:t.snap?.gastos||0,otros:0,mode:"manual",manualPrice:(t.snap.precioConIVA||0).toFixed(2),customMgn:false,customVal:27,descripcionPDF:""}];
      }
    }
    setEditLineas(lineas);
    setEf({
      date:t.date, clientId:t.clientId||"", supplierId:t.supplierId||"", unitId:t.unitId||"",
      status:t.status, payType:t.payType, promesaPago:t.promesaPago||"",
      prob:t.prob||"high", horasOp:t.horasOp||0, notes:t.notes||"",
      iva, isr:t.snap.params?.isr||20,
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
      date:ef.date, clientId:ef.clientId, supplierId:ef.supplierId, unitId:ef.unitId||"",
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

      <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:4,overflow:"hidden"}}>
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
                <div style={{fontSize:9,color:C.blueHi,fontFamily:"'Courier New',monospace"}}>{hide?"---":fpct(calcMarkup(t.snap.precioSinIVA,t.snap.costoTotal))}</div>
                <div style={{fontSize:9,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{mxn(t.snap.precioConIVA)}</div>
                <div style={{fontSize:9,fontWeight:700,color:t.snap.uNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{hide?"---":mxn(t.snap.uNeta)}</div>
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
                      <UnitPicker units={units} value={ef.unitId||""} onChange={sfn("unitId")}/>
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
                        <div key={idx} style={{background:C.bg1,border:`1px solid ${C.borderHi}`,borderRadius:3,padding:"7px 9px",marginBottom:5}}>
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
                        <div style={{background:C.bg3,borderRadius:3,border:`1px solid ${C.borderHi}`,padding:"6px 9px",marginBottom:6,display:"flex",gap:16,alignItems:"center"}}>
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
                          <div style={{display:"flex",justifyContent:"space-between",padding:"5px 11px",background:C.bg3,borderBottom:`1px solid ${C.border}`}}>
                            <span style={{fontSize:9,fontWeight:700,color:C.t1}}>TOTAL</span>
                            <span style={{fontSize:10,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(t.snap.precioConIVA)}</span>
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
                        <span>IVA {t.snap.params.iva}%</span>
                        <span>ISR {t.snap.params.isr}%</span>
                        {cl&&<span>Cliente: {cl.empresa}</span>}
                        {t.mods&&t.mods.length>0&&<span>Mods: {t.mods.join(", ")}</span>}
                        {t.horasOp>0&&<span>Util/h: {mxn(t.snap.uNeta/t.horasOp)}</span>}
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
            <div key={t.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 9px",background:C.bg1,borderBottom:`1px solid ${C.border}`,opacity:0.6}}>
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
  return <div style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:16,marginBottom:10,overflow:"hidden",...style}}>{children}</div>;
}
function MRow({label,value,color,bold}) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 14px",borderBottom:`1px solid ${C.border}`}}>
      <span style={{fontSize:12,color:C.t2}}>{label}</span>
      <span style={{fontSize:bold?16:13,fontWeight:bold?800:600,color:color||C.t1,fontFamily:"'Courier New',monospace"}}>{value}</span>
    </div>
  );
}
function MBtn({label,color,bg,border,onClick,full,small}) {
  return (
    <button onClick={onClick} style={{
      width:full?"100%":"auto",
      padding:small?"10px 16px":"15px 20px",
      background:bg||C.blue,
      border:`1px solid ${border||C.blueHi}`,
      borderRadius:10,cursor:"pointer",
      fontSize:small?12:14,fontWeight:700,
      color:color||C.t1,letterSpacing:"0.04em",
      minHeight:small?40:48,
    }}>{label}</button>
  );
}
function MField({label,value,onChange,type="text",placeholder,suffix,color}) {
  return (
    <div style={{marginBottom:10}}>
      {label&&<div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5,textTransform:"uppercase"}}>{label}</div>}
      <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
        <input type={type} value={value} placeholder={placeholder||""} onChange={e=>onChange(e.target.value)}
          style={{flex:1,background:"transparent",border:"none",outline:"none",color:color||C.t1,fontSize:15,padding:"12px 14px",fontFamily:"'Courier New',monospace"}}/>
        {suffix&&<span style={{padding:"0 12px",color:C.t3,fontSize:12}}>{suffix}</span>}
      </div>
    </div>
  );
}
function MSel({label,value,onChange,options}) {
  return (
    <div style={{marginBottom:10}}>
      {label&&<div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5,textTransform:"uppercase"}}>{label}</div>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",color:C.t1,fontSize:14,outline:"none",fontFamily:"'Courier New',monospace",minHeight:46}}>
        {options.map(o=><option key={o.value} value={o.value} style={{background:C.bg1}}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── MOps — Dashboard móvil ───────────────────────────────────────────────────
function MOps({state,setTab}) {
  const {tickets,clients,suppliers,units} = state;
  const [showDeep,setShowDeep]=useState(false);
  const active   = useMemo(()=>tickets.filter(t=>!t._deleted&&t.status!=="cancelado"),[tickets]);
  const p1       = useMemo(()=>active.filter(t=>t.priority==="P1"&&!CLOSED_SET.has(t.status)),[active]);
  const p2       = useMemo(()=>active.filter(t=>t.priority==="P2"&&!CLOSED_SET.has(t.status)),[active]);
  const abiertos = useMemo(()=>active.filter(t=>!CLOSED_SET.has(t.status)),[active]);
  const vencidos = useMemo(()=>active.filter(t=>{if(!t.promesaPago||t.cobrado)return false;const d=parseDateMX(t.promesaPago);return d&&new Date()>d;}),[active]);
  // Layer 1: Operado
  const operados  = useMemo(()=>active.filter(t=>OPERADO_SET.has(t.status)),[active]);
  const totalFact = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),[operados]);
  const totalNeta = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.uNeta),0),[operados]);
  const totalInv  = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.costoBase)*(1+safeNumber(t.snap.params?.iva,16)/100),0),[operados]);
  const costoProducto = totalInv;
  const gastosOp  = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.gastos),0),[operados]);
  const pctNeta   = totalFact>0?(totalNeta/totalFact)*100:0;
  const ivaNetoTotal = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.ivaNeto),0),[operados]);
  const isrTotal     = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.isr),0),[operados]);
  const cargaFiscalTotal = ivaNetoTotal + isrTotal;
  const rentabilidadProm = totalFact>0?(totalNeta/totalFact)*100:0;
  const markupProm = useMemo(()=>{const v=operados.filter(t=>safeNumber(t.snap.costoTotal)>0);return v.length>0?v.reduce((s,t)=>s+calcMarkup(t.snap.precioSinIVA,t.snap.costoTotal),0)/v.length:0;},[operados]);
  const uBrutaTotal = useMemo(()=>operados.reduce((s,t)=>s+safeNumber(t.snap.uBruta),0),[operados]);
  const eficienciaFiscalGlobal = uBrutaTotal>0?(totalNeta/uBrutaTotal)*100:0;
  const roi = totalInv>0?(totalNeta/totalInv)*100:0;
  // Layer 2: Cash
  const cashTotal = useMemo(()=>active.filter(t=>CASH_SET.has(t.status)).reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),[active]);
  // Layer 3: Cartera
  const carteraMonto = useMemo(()=>active.filter(t=>CARTERA_SET.has(t.status)&&!t.cobrado).reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),[active]);
  const cxp = useMemo(()=>active.filter(t=>OPERADO_SET.has(t.status)&&!t.pagadoProveedor).reduce((s,t)=>s+safeNumber(t.snap.costoTotal),0),[active]);
  const cartera = carteraMonto; // alias for UI compatibility
  const flujoOp = carteraMonto - cargaFiscalTotal - cxp;
  // Layer 4: Forecast
  const forecast  = useMemo(()=>active.filter(t=>FORECAST_SET.has(t.status)).reduce((s,t)=>s+utilidadPonderada(safeNumber(t.snap.uNeta),t.prob),0),[active]);
  const forecastMonto = useMemo(()=>active.filter(t=>FORECAST_SET.has(t.status)).reduce((s,t)=>s+safeNumber(t.snap.precioConIVA),0),[active]);
  const totalHoras= useMemo(()=>active.reduce((s,t)=>s+safeNumber(t.horasOp),0),[active]);
  const uPH       = totalHoras>0?totalNeta/totalHoras:0;

  // Aging cartera
  const aging = useMemo(()=>{
    const pend=tickets.filter(t=>t.payType==="credit"&&!t.cobrado&&t.status!=="cancelado"&&t.promesaPago);
    const bucket=(mn,mx)=>pend.filter(t=>{const d=parseDateMX(t.promesaPago);if(!d)return false;const ms=Date.now()-d.getTime();return ms>=mn*86400000&&(mx==null||ms<mx*86400000);}).reduce((s,t)=>s+t.snap.precioConIVA,0);
    return{a30:bucket(0,30),a60:bucket(30,60),mas60:bucket(60,null)};
  },[tickets]);

  // Por categoria
  const byOp = useMemo(()=>OP_TYPES.map(op=>{
    const sub=operados.filter(t=>t.opId===op.id);
    return{label:op.label,count:sub.length,neta:sub.reduce((s,t)=>s+safeNumber(t.snap.uNeta),0)};
  }).filter(o=>o.count>0).sort((a,b)=>b.neta-a.neta),[operados]);
  const maxByOp=Math.max(...byOp.map(o=>o.neta),1);

  // Top clientes
  const topClients=useMemo(()=>clients.map(c=>{
    const co=tickets.filter(t=>t.clientId===c.id);
    return{label:c.empresa,neta:co.reduce((s,t)=>s+t.snap.uNeta,0),count:co.length};
  }).filter(c=>c.count>0).sort((a,b)=>b.neta-a.neta).slice(0,4),[tickets,clients]);
  const maxClient=Math.max(...topClients.map(c=>c.neta),1);

  // Top proveedores
  const topSupp=useMemo(()=>suppliers.map(s=>{
    const so=tickets.filter(t=>t.supplierId===s.id);
    return{label:s.nombre,neta:so.reduce((s,t)=>s+t.snap.uNeta,0),count:so.length};
  }).filter(s=>s.count>0).sort((a,b)=>b.neta-a.neta).slice(0,3),[tickets,suppliers]);

  // Prioridades
  const byPriority=useMemo(()=>Object.values(PRIORITY).map(pr=>({
    pr,count:tickets.filter(t=>t.priority===pr.id).length,
    open:tickets.filter(t=>t.priority===pr.id&&!CLOSED_SET.has(t.status)).length,
  })),[tickets]);

  const lastTkts = useMemo(()=>tickets.filter(t=>!t._deleted).slice(-5).reverse(),[tickets]);

  const now=new Date();
  const hour=now.getHours();
  const greeting=hour<12?"Buenos días":hour<19?"Buenas tardes":"Buenas noches";
  const dayLabel=now.toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"short"});

  return (
    <div style={{padding:"14px 16px"}}>

      {/* Header saludo */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,color:C.t4,letterSpacing:"0.08em",textTransform:"capitalize",marginBottom:2}}>{dayLabel}</div>
        <div style={{fontSize:18,fontWeight:700,color:C.t1,lineHeight:1.2}}>{greeting}</div>
        {(p1.length>0||vencidos.length>0)&&(
          <div style={{fontSize:11,color:C.red,marginTop:4,fontWeight:600}}>
            {p1.length>0?`${p1.length} P1 activ${p1.length>1?"os":"o"}`:""}
            {p1.length>0&&vencidos.length>0?" · ":""}
            {vencidos.length>0?`${vencidos.length} crédit${vencidos.length>1?"os":"o"} vencid${vencidos.length>1?"os":"o"}`:""}
          </div>
        )}
      </div>

      {/* Acciones rápidas */}
      <div style={{display:"flex",gap:8,marginBottom:14,overflowX:"auto",paddingBottom:2}}>
        {[
          {label:"+ Cotizar",   id:"cotizador",  bg:C.blue,   bdr:C.blueHi, col:C.t1},
          {label:"Pipeline",    id:"tickets",    bg:C.bg2,    bdr:C.border,  col:C.t2},
          {label:"Cartera",     id:"cartera",    bg:C.bg2,    bdr:C.border,  col:C.t2},
          {label:"Historial",   id:"historial",  bg:C.bg2,    bdr:C.border,  col:C.t2},
        ].map(({label,id,bg,bdr,col})=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{padding:"10px 18px",borderRadius:20,flexShrink:0,
              background:bg,border:`1px solid ${bdr}`,color:col,
              fontSize:13,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap",minHeight:40}}>
            {label}
          </button>
        ))}
      </div>

      {/* Alertas críticas */}
      {p1.length>0&&(
        <div style={{background:C.p1dim,border:`1px solid ${C.p1dot}55`,borderRadius:14,padding:"14px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:8,height:8,borderRadius:4,background:C.p1dot,flexShrink:0,boxShadow:`0 0 8px ${C.p1dot}`}}/>
          <div>
            <div style={{fontSize:13,fontWeight:800,color:C.p1dot,lineHeight:1.2}}>P1 — {p1.length} unidad{p1.length>1?"es":""} detenida{p1.length>1?"s":""}</div>
            <div style={{fontSize:11,color:C.t2,marginTop:2,fontFamily:"'Courier New',monospace"}}>{p1.slice(0,2).map(t=>t.id).join(" · ")}</div>
          </div>
        </div>
      )}
      {vencidos.length>0&&(
        <div style={{background:C.redDim,border:`1px solid ${C.red}55`,borderRadius:14,padding:"12px 16px",marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:8,height:8,borderRadius:4,background:"#C04040",flexShrink:0}}/>
          <div style={{fontSize:13,fontWeight:800,color:"#C04040"}}>Cartera vencida · {vencidos.length} op. · {mxn(vencidos.reduce((s,t)=>s+t.snap.precioConIVA,0))}</div>
        </div>
      )}

      {/* 5 KPIs principales */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        {[
          {l:"Realizado",     v:mxn(totalFact),          c:C.cyan,    sub:`${operados.length} ops`},
          {l:"Utilidad neta", v:mxn(totalNeta),           c:totalNeta>=0?C.green:C.red, sub:fpct(pctNeta)},
          {l:"Cartera pend.", v:mxn(carteraMonto),        c:C.yellow,  sub:`${vencidos.length} vencidas`},
          {l:"Forecast",      v:mxn(forecast),            c:C.cyan,    sub:"ponderado"},
        ].map(({l,v,c,sub})=>(
          <div key={l} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px"}}>
            <div style={{fontSize:10,color:C.t3,letterSpacing:"0.14em",marginBottom:6,textTransform:"uppercase"}}>{l}</div>
            <div style={{fontSize:20,fontWeight:800,color:c,fontFamily:"'Courier New',monospace",lineHeight:1,marginBottom:4}}>{v}</div>
            <div style={{fontSize:10,color:C.t3}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Fila inferior: 3 métricas secundarias */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
        {[
          {l:"Abiertos",    v:String(abiertos.length), c:C.t1},
          {l:"Rentabilidad",v:fpct(pctNeta),           c:margenColor(pctNeta)},
          {l:"Util/hora",   v:totalHoras>0?mxn(uPH):"—", c:C.cyan},
        ].map(({l,v,c})=>(
          <div key={l} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:9,color:C.t3,letterSpacing:"0.12em",marginBottom:6,textTransform:"uppercase"}}>{l}</div>
            <div style={{fontSize:17,fontWeight:800,color:c,fontFamily:"'Courier New',monospace",lineHeight:1}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Pipeline widget — barras por estatus */}
      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:10,color:C.t3,letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700}}>Pipeline</div>
          <div style={{fontSize:11,color:C.cyan,fontFamily:"'Courier New',monospace",fontWeight:700}}>{abiertos.length} activos</div>
        </div>
        {(()=>{
          const pipeStatuses = TICKET_PIPELINE.slice(0,8);
          const counts = pipeStatuses.map(sid=>({sid,s:TICKET_META[sid],n:tickets.filter(t=>t.status===sid).length}));
          const maxN = Math.max(...counts.map(c=>c.n),1);
          return counts.filter(c=>c.n>0||true).map(({sid,s,n})=>(
            <div key={sid} style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
              <div style={{fontSize:10,color:n>0?C.t2:C.t4,minWidth:64,lineHeight:1.2}}>{s.label}</div>
              <div style={{flex:1,height:6,background:C.bg0,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",background:n>0?s.dot:C.border,borderRadius:3,
                  width:`${(n/maxN)*100}%`,transition:"width 300ms ease"}}/>
              </div>
              <div style={{fontSize:11,fontWeight:700,color:n>0?s.dot:C.t4,
                fontFamily:"'Courier New',monospace",minWidth:16,textAlign:"right"}}>{n}</div>
            </div>
          ));
        })()}
      </div>

      {/* Últimas operaciones */}
      {lastTkts.length>0&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:10,color:C.t3,letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700}}>Últimas operaciones</div>
            <div style={{fontSize:11,color:C.t3}}>{lastTkts.length} de {tickets.filter(t=>!t._deleted).length}</div>
          </div>
          {lastTkts.map(t=>{
            const cl=clients.find(c=>c.id===t.clientId); const pr=PRIORITY[t.priority]||PRIORITY.P4;
            return (
              <div key={t.id} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8,borderLeft:`4px solid ${pr.dot}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{fontSize:10,color:C.t3,fontFamily:"'Courier New',monospace",marginBottom:2}}>{t.id}</div>
                  <div style={{fontSize:13,fontWeight:700,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</div>
                  {cl&&<div style={{fontSize:11,color:C.t3,marginTop:1}}>{cl.empresa.split(" ").slice(0,2).join(" ")}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                  <div style={{fontSize:14,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(t.snap?.precioConIVA||0)}</div>
                  <StatusBadge sid={t.status} meta={TICKET_META} small/>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toggle análisis financiero */}
      {tickets.length>0&&(
        <button onClick={()=>setShowDeep(v=>!v)}
          style={{width:"100%",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,
            padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",
            alignItems:"center",marginBottom:showDeep?0:12}}>
          <span style={{fontSize:10,color:C.t3,letterSpacing:"0.14em",textTransform:"uppercase",fontWeight:700}}>Análisis financiero</span>
          <span style={{fontSize:13,color:C.cyan,fontWeight:700}}>{showDeep?"▲ Ocultar":"▼ Ver detalle"}</span>
        </button>
      )}

      {showDeep&&tickets.length>0&&(
        <div style={{marginBottom:12}}>

          {/* Métricas financieras secundarias */}
          <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
            <div style={{fontSize:10,color:C.t3,letterSpacing:"0.14em",marginBottom:10,textTransform:"uppercase"}}>Rentabilidad operativa</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {l:"Markup prom",  v:fpct(markupProm),          c:margenColor(markupProm)},
                {l:"Ef. fiscal",   v:fpct(eficienciaFiscalGlobal),c:margenColor(eficienciaFiscalGlobal)},
                {l:"ROI",          v:fpct(roi),                  c:margenColor(roi)},
              ].map(({l,v,c})=>(
                <div key={l} style={{background:C.bg0,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:C.t3,letterSpacing:"0.10em",marginBottom:5,textTransform:"uppercase"}}>{l}</div>
                  <div style={{fontSize:15,fontWeight:800,color:c,fontFamily:"'Courier New',monospace",lineHeight:1}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:8}}>
              {[
                {l:"Carga fiscal", v:mxn(cargaFiscalTotal), c:C.red},
                {l:"Flujo neto",   v:mxn(flujoOp),          c:flujoOp>=0?C.green:C.red},
              ].map(({l,v,c})=>(
                <div key={l} style={{background:C.bg0,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px"}}>
                  <div style={{fontSize:9,color:C.t3,letterSpacing:"0.10em",marginBottom:4,textTransform:"uppercase"}}>{l}</div>
                  <div style={{fontSize:14,fontWeight:800,color:c,fontFamily:"'Courier New',monospace",lineHeight:1}}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Aging cartera */}
          {(aging.a30>0||aging.a60>0||aging.mas60>0)&&(
            <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
              <div style={{fontSize:10,color:C.t3,letterSpacing:"0.14em",marginBottom:10,textTransform:"uppercase"}}>Aging cartera crédito</div>
              {[["0-30 días",aging.a30,C.green],["30-60 días",aging.a60,C.yellow],["> 60 días",aging.mas60,C.red]].map(([lbl,val,col])=>(
                <div key={lbl} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div style={{fontSize:11,color:C.t2}}>{lbl}</div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flex:1,marginLeft:12}}>
                    <div style={{flex:1,height:4,background:C.bg0,borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",background:col,borderRadius:2,width:`${Math.min(100,(val/(aging.a30+aging.a60+aging.mas60||1))*100)}%`}}/>
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:col,fontFamily:"'Courier New',monospace",minWidth:70,textAlign:"right"}}>{mxn(val)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top clientes */}
          {topClients.length>0&&(
            <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
              <div style={{fontSize:10,color:C.t3,letterSpacing:"0.14em",marginBottom:10,textTransform:"uppercase"}}>Top clientes</div>
              {topClients.map((c,i)=>(
                <div key={c.label} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <div style={{fontSize:11,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"60%"}}>{c.label}</div>
                    <div style={{fontSize:11,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(c.neta)}</div>
                  </div>
                  <div style={{height:4,background:C.bg0,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",background:C.cyan,borderRadius:2,width:`${(c.neta/maxClient)*100}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Top proveedores */}
          {topSupp.length>0&&(
            <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
              <div style={{fontSize:10,color:C.t3,letterSpacing:"0.14em",marginBottom:10,textTransform:"uppercase"}}>Top proveedores</div>
              {topSupp.map((s,i)=>(
                <div key={s.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,padding:"8px 12px",background:C.bg0,borderRadius:8}}>
                  <div style={{fontSize:11,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{s.label}</div>
                  <div style={{display:"flex",gap:12,flexShrink:0,marginLeft:8}}>
                    <div style={{fontSize:10,color:C.t3}}>{s.count} ops</div>
                    <div style={{fontSize:12,fontWeight:700,color:C.green,fontFamily:"'Courier New',monospace"}}>{mxn(s.neta)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Utilidad por categoría */}
          {byOp.length>0&&(
            <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",marginBottom:10}}>
              <div style={{fontSize:10,color:C.t3,letterSpacing:"0.14em",marginBottom:10,textTransform:"uppercase"}}>Utilidad por categoría</div>
              {byOp.map(o=>(
                <div key={o.label} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <div style={{fontSize:11,color:C.t2}}>{o.label} <span style={{color:C.t4,fontSize:10}}>({o.count})</span></div>
                    <div style={{fontSize:11,fontWeight:700,color:o.neta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(o.neta)}</div>
                  </div>
                  <div style={{height:4,background:C.bg0,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",background:o.neta>=0?C.green:C.red,borderRadius:2,width:`${(Math.abs(o.neta)/Math.max(maxByOp,1))*100}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {tickets.length===0&&(
        <div style={{textAlign:"center",padding:"60px 0",color:C.t3}}>
          <div style={{fontSize:32,marginBottom:12}}>📦</div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>Sin operaciones</div>
          <div style={{fontSize:12}}>Crea tu primera cotización con el botón +</div>
        </div>
      )}
    </div>
  );
}

function StatusFlowSheet({tkt,dispatch,toast,onClose}) {
  const allowed=TICKET_TRANSITIONS[tkt.status]||[];
  const pr=PRIORITY[tkt.priority]||PRIORITY.P4;
  return (<>
    <div onClick={onClose} className="fade-enter" style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.5)"}}/>
    <div className="sheet-enter" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:201,
      background:C.bg1,borderRadius:"18px 18px 0 0",borderTop:`1px solid ${C.borderHi}`,
      padding:`0 16px calc(20px + env(safe-area-inset-bottom,0px))`,
      boxShadow:"0 -12px 48px rgba(0,0,0,.5)"}}>
      <div style={{display:"flex",justifyContent:"center",padding:"12px 0 6px"}}>
        <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,padding:"0 2px"}}>
        <div style={{width:10,height:10,borderRadius:5,background:pr.dot,flexShrink:0}}/>
        <div>
          <div style={{fontSize:10,color:C.t3,fontFamily:"'Courier New',monospace"}}>{tkt.id}</div>
          <div style={{fontSize:14,fontWeight:700,color:C.t1,lineHeight:1.3}}>{(tkt.titulo||"").substring(0,40)}</div>
        </div>
        <StatusBadge sid={tkt.status} meta={TICKET_META} small style={{marginLeft:"auto",flexShrink:0}}/>
      </div>
      {allowed.length===0
        ? <div style={{padding:"20px 0",textAlign:"center",color:C.t3,fontSize:13}}>Sin transiciones disponibles</div>
        : allowed.map(to=>{
            const s=TICKET_META[to];
            const isCancelado=to==="cancelado";
            return (
              <button key={to} onClick={()=>{dispatch({type:"TKT_STATUS",id:tkt.id,to});toast(s.label,"info");onClose();}}
                style={{width:"100%",padding:"15px 16px",marginBottom:8,
                  background:isCancelado?C.redDim:C.bg2,
                  border:`1px solid ${isCancelado?C.red+"55":s.dot+"44"}`,
                  borderRadius:12,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:10,height:10,borderRadius:5,background:s.dot,flexShrink:0}}/>
                <span style={{fontSize:15,fontWeight:700,color:isCancelado?C.red:s.dot}}>{s.label}</span>
                <span style={{fontSize:11,color:C.t3,marginLeft:"auto"}}>{isCancelado?"Cancelar operación":"→"}</span>
              </button>
            );
          })
      }
      <button onClick={onClose} style={{width:"100%",padding:"14px",background:"transparent",
        border:`1px solid ${C.border}`,borderRadius:12,color:C.t2,fontSize:14,cursor:"pointer",marginTop:4}}>
        Cerrar
      </button>
    </div>
  </>);
}

// ── MPipeline — Pipeline móvil ───────────────────────────────────────────────
function MPipeline({state,dispatch,toast}) {
  const {tickets,clients,units} = state;
  const [expId,setExpId] = useState(null);
  const [fPrio,setFPrio] = useState("all");
  const [pdfPreview,setPdfPreview] = useState(null);
  const abiertos = useMemo(()=>tickets.filter(t=>!CLOSED_SET.has(t.status))
    .filter(t=>fPrio==="all"||t.priority===fPrio)
    .sort((a,b)=>a.priority.localeCompare(b.priority)),[tickets,fPrio]);

  const [statusFlow,setStatusFlow]=useState(null); // tkt o null

  return (
    <div style={{padding:"14px 16px"}}>
      {pdfPreview&&<PDFPreviewModal {...pdfPreview} onClose={()=>setPdfPreview(null)}/>}
      {statusFlow&&<StatusFlowSheet tkt={statusFlow} dispatch={dispatch} toast={toast} onClose={()=>setStatusFlow(null)}/>}

      {/* Filtro prioridad */}
      <div style={{display:"flex",gap:8,marginBottom:14,overflowX:"auto",paddingBottom:4}}>
        {[["all","Todos"],["P1","●P1"],["P2","●P2"],["P3","●P3"],["P4","●P4"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFPrio(v)}
            style={{padding:"8px 16px",borderRadius:20,flexShrink:0,
              border:`1px solid ${fPrio===v?C.cyan:C.border}`,
              background:fPrio===v?C.blueDim:"transparent",
              color:fPrio===v?C.cyan:C.t3,
              fontSize:12,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap",minHeight:36}}>
            {l}
          </button>
        ))}
      </div>

      {abiertos.length===0&&(
        <div style={{textAlign:"center",padding:"60px 0",color:C.t4}}>
          <div style={{fontSize:32,marginBottom:10}}>✓</div>
          <div style={{fontSize:14,fontWeight:700,color:C.green,marginBottom:4}}>
            {fPrio==="all"?"Pipeline limpio":"Sin "+fPrio+" activos"}
          </div>
          <div style={{fontSize:11,color:C.t4}}>
            {fPrio==="all"?"No hay tickets en curso":"Cambia el filtro para ver otros tickets"}
          </div>
        </div>
      )}

      {abiertos.map(t=>{
        const cl=clients.find(c=>c.id===t.clientId);
        const un=units.find(u=>u.id===t.unitId);
        const pr=PRIORITY[t.priority]||PRIORITY.P4;
        const venc=t.promesaPago&&!t.cobrado&&parseDateMX(t.promesaPago)&&new Date()>parseDateMX(t.promesaPago);
        const allowed=TICKET_TRANSITIONS[t.status]||[];
        return (
          <div key={t.id} style={{background:C.bg1,border:`1px solid ${C.border}`,borderRadius:16,marginBottom:10,overflow:"hidden"}}>
            {/* Card principal — tap para StatusFlow */}
            <div onClick={()=>setStatusFlow(t)}
              style={{padding:"16px",borderLeft:`5px solid ${pr.dot}`,cursor:"pointer",
                display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <span style={{fontSize:10,color:pr.dot,fontWeight:700,fontFamily:"'Courier New',monospace"}}>{t.priority}</span>
                  <StatusBadge sid={t.status} meta={TICKET_META} small/>
                </div>
                <div style={{fontSize:15,fontWeight:700,color:C.t1,lineHeight:1.3,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.titulo}</div>
                <div style={{fontSize:11,color:C.t3}}>{cl?cl.empresa.split(" ").slice(0,2).join(" "):"—"}{un?` · Eco.${un.economico||"?"}`:""}</div>
                {venc&&<div style={{marginTop:5,fontSize:10,color:C.red,fontWeight:700}}>⚠ CRÉDITO VENCIDO</div>}
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:18,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(t.snap?.precioConIVA||0)}</div>
                <div style={{fontSize:10,color:C.t3,marginTop:2}}>{t.date}</div>
                {allowed.length>0&&<div style={{marginTop:6,fontSize:10,color:C.t4,background:C.bg2,borderRadius:6,padding:"3px 8px",display:"inline-block"}}>→ {TICKET_META[allowed[0]]?.label||"?"}</div>}
              </div>
            </div>
            {/* Acciones rápidas */}
            <div style={{display:"flex",borderTop:`1px solid ${C.border}`}}>
              {t.payType==="credit"&&!t.cobrado&&(
                <button onClick={()=>{dispatch({type:"TKT_COBRADO",id:t.id});toast("Cobrado","success");}}
                  style={{flex:1,padding:"12px 8px",background:"transparent",border:"none",borderRight:`1px solid ${C.border}`,
                    cursor:"pointer",fontSize:12,fontWeight:700,color:C.green}}>
                  ✓ Cobrado
                </button>
              )}
              <button onClick={()=>{const cl2=state.clients.find(c=>c.id===t.clientId);const un2=state.units?.find(u=>u.id===t.unitId);const su2=state.suppliers?.find(s=>s.id===t.supplierId);setPdfPreview({tkt:t,cl:cl2,un:un2,supp:su2});}}
                style={{flex:1,padding:"12px 8px",background:"transparent",border:"none",
                  cursor:"pointer",fontSize:12,fontWeight:700,color:C.cyan}}>
                ↗ PDF
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── QuickQuoteSheet — Cotización rápida <20s ──────────────────────────────────
function QuickQuoteSheet({state,dispatch,toast,open,onClose,onFull}) {
  const {clients,units} = state;
  const [desc,     setDesc]     = useState("");
  const [costRaw,  setCostRaw]  = useState("");
  const [clientId, setClientId] = useState("");
  const [unitId,   setUnitId]   = useState("");
  const [clientQ,  setClientQ]  = useState("");
  const [unitQ,    setUnitQ]    = useState("");
  const descRef = useRef(null);

  useEffect(()=>{
    if(open){ setDesc("");setCostRaw("");setClientId("");setUnitId("");setClientQ("");setUnitQ("");
      setTimeout(()=>descRef.current?.focus(),320); }
  },[open]);

  const recentClients = useMemo(()=>{
    const freq={};
    state.tickets.slice(-30).forEach(t=>{ if(t.clientId&&!t._deleted) freq[t.clientId]=(freq[t.clientId]||0)+1; });
    return Object.entries(freq).sort(([,a],[,b])=>b-a).slice(0,3)
      .map(([id])=>clients.find(c=>c.id===id)).filter(Boolean);
  },[state.tickets,clients]);

  const filteredClients = useMemo(()=>{
    if(!clientQ.trim()) return recentClients;
    const q=clientQ.toLowerCase();
    return clients.filter(c=>c.empresa.toLowerCase().includes(q)||(c.rfc||"").toLowerCase().includes(q)).slice(0,8);
  },[clients,clientQ,recentClients]);

  const recentUnits = useMemo(()=>{
    const freq={};
    state.tickets.slice(-30).forEach(t=>{ if(t.unitId&&!t._deleted) freq[t.unitId]=(freq[t.unitId]||0)+1; });
    return Object.entries(freq).sort(([,a],[,b])=>b-a).slice(0,3)
      .map(([id])=>units.find(u=>u.id===id)).filter(Boolean);
  },[state.tickets,units]);

  const filteredUnits = useMemo(()=>{
    if(!unitQ.trim()) return recentUnits;
    const q=unitQ.toLowerCase();
    return units.filter(u=>
      (u.economico||"").toLowerCase().includes(q)||
      (u.marca||"").toLowerCase().includes(q)||
      (u.modelo||"").toLowerCase().includes(q)||
      (u.placa||"").toLowerCase().includes(q)
    ).slice(0,8);
  },[units,unitQ,recentUnits]);

  const cost = safeNumber(costRaw);
  const snap = useMemo(()=>computeSnap({costo:cost,gasolina:0,otros:0,iva:16,isr:20,
    compraConIVA:true,ventaConIVA:true,mode:"auto",margin:28}),[cost]);

  const save = ()=>{
    if(!desc.trim()) return;
    const fecha = todayMX();
    const tkt = {
      id:mkTicketId(fecha), titulo:desc.trim(),
      opId:"consumable", opShort:"CONS", priority:"P3",
      clientId, supplierId:"", unitId,
      partRef:"", date:fecha, status:"recibido",
      payType:"contado", promesaPago:null, cobrado:false,
      mods:[], prob:"high", horasOp:0, notes:"", mode:"multilinea",
      lineas:[{titulo:desc.trim(),partRef:"",snap,qty:1}], snap,
      timeline:[{ts:nowISO(),evento:"Ticket creado (acceso rápido)",actor:"Operador"}],
      history:[mkEvent("created",{titulo:desc.trim(),status:"recibido",priority:"P3"})],
    };
    dispatch({type:"TKT_ADD",t:tkt});
    toast("Ticket "+tkt.id+" creado","success");
    onClose();
  };

  if(!open) return null;
  const cl=clients.find(c=>c.id===clientId);
  const un=units.find(u=>u.id===unitId);

  const Chip = ({label,active,onClick})=>(
    <button onClick={onClick} style={{padding:"10px 16px",background:active?C.blueDim:C.bg0,
      border:`1px solid ${active?C.blueHi:C.border}`,borderRadius:20,
      color:active?C.cyan:C.t2,fontSize:14,cursor:"pointer",fontWeight:active?700:400,
      whiteSpace:"nowrap",flexShrink:0}}>
      {label}
    </button>
  );

  return (<>
    <div onClick={onClose} className="fade-enter" style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.6)"}}/>
    <div className="sheet-enter" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:201,
      background:C.bg1,borderRadius:"18px 18px 0 0",
      borderTop:`1px solid ${C.borderHi}`,
      padding:`0 16px calc(20px + env(safe-area-inset-bottom, 0px))`,
      maxHeight:"88vh",overflowY:"auto",
      boxShadow:"0 -12px 48px rgba(0,0,0,.6)"}}>

      {/* Drag handle */}
      <div style={{display:"flex",justifyContent:"center",padding:"12px 0 6px"}}>
        <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
      </div>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.2em",fontWeight:700}}>COTIZACIÓN RÁPIDA</div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:C.t2,
          fontSize:22,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>×</button>
      </div>

      {/* Descripción */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.12em",marginBottom:7,textTransform:"uppercase"}}>Descripción</div>
        <input ref={descRef} value={desc} onChange={e=>setDesc(e.target.value)}
          placeholder="Balatas delanteras, filtro aceite..."
          style={{width:"100%",background:C.bg0,border:`1px solid ${desc?C.blueHi:C.border}`,
            borderRadius:12,padding:"15px 16px",color:C.t1,fontSize:16,outline:"none",
            boxSizing:"border-box",fontFamily:"'Trebuchet MS',sans-serif"}}/>
      </div>

      {/* Costo */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.12em",marginBottom:7,textTransform:"uppercase"}}>Costo unitario (c/IVA)</div>
        <div style={{display:"flex",alignItems:"center",background:C.bg0,
          border:`1px solid ${costRaw?C.blueHi:C.border}`,borderRadius:12,overflow:"hidden"}}>
          <span style={{padding:"0 4px 0 16px",color:C.t3,fontSize:18}}>$</span>
          <input type="text" inputMode="decimal" value={costRaw} onChange={e=>setCostRaw(e.target.value)}
            placeholder="0"
            style={{flex:1,background:"transparent",border:"none",outline:"none",
              color:C.t1,fontSize:24,fontWeight:800,padding:"12px 16px",
              fontFamily:"'Courier New',monospace"}}/>
        </div>
      </div>

      {/* Cliente */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.12em",marginBottom:7,textTransform:"uppercase"}}>
          Cliente
        </div>
        {cl ? (
          <div style={{background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:12,
            padding:"12px 14px",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.cyan,lineHeight:1.3}}>{cl.empresa}</div>
              {cl.rfc&&<div style={{fontSize:10,color:C.t3,fontFamily:"'Courier New',monospace",marginTop:2}}>{cl.rfc}</div>}
            </div>
            <button onClick={()=>{setClientId("");setClientQ("");}}
              style={{background:"transparent",border:"none",color:C.t3,fontSize:20,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>×</button>
          </div>
        ) : (
          <>
            <div style={{position:"relative",marginBottom:8}}>
              <input value={clientQ} onChange={e=>setClientQ(e.target.value)}
                placeholder={recentClients.length>0?"Recientes · o buscar...":"Buscar cliente..."}
                style={{width:"100%",background:C.bg0,border:`1px solid ${clientQ?C.blueHi:C.border}`,
                  borderRadius:12,padding:"12px 40px 12px 16px",color:C.t1,fontSize:14,
                  outline:"none",boxSizing:"border-box"}}/>
              {clientQ&&<button onClick={()=>setClientQ("")}
                style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                  background:"transparent",border:"none",color:C.t3,fontSize:16,cursor:"pointer",padding:4}}>×</button>}
            </div>
            {filteredClients.length>0
              ? <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {filteredClients.map(c=>(
                    <Chip key={c.id}
                      label={clientQ?c.empresa.substring(0,24):c.empresa.split(" ").slice(0,2).join(" ")}
                      active={false} onClick={()=>{setClientId(c.id);setClientQ("");}}/>
                  ))}
                </div>
              : clientQ
                ? <div style={{fontSize:12,color:C.t3,padding:"6px 4px"}}>Sin resultados para "{clientQ}"</div>
                : <div style={{fontSize:12,color:C.t3,padding:"6px 4px"}}>Sin clientes registrados</div>
            }
          </>
        )}
      </div>

      {/* Unidad */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.12em",marginBottom:7,textTransform:"uppercase"}}>
          Unidad
        </div>
        {un ? (
          <div style={{background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:12,
            padding:"12px 14px",marginBottom:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:13,fontWeight:700,color:C.cyan,lineHeight:1.3}}>
                {un.economico?"Eco. "+un.economico+" — ":""}{un.marca} {un.modelo}
              </div>
              {un.placa&&<div style={{fontSize:10,color:C.t3,fontFamily:"'Courier New',monospace",marginTop:2}}>{un.placa}</div>}
            </div>
            <button onClick={()=>{setUnitId("");setUnitQ("");}}
              style={{background:"transparent",border:"none",color:C.t3,fontSize:20,cursor:"pointer",padding:"4px 8px",lineHeight:1}}>×</button>
          </div>
        ) : (
          <>
            <div style={{position:"relative",marginBottom:8}}>
              <input value={unitQ} onChange={e=>setUnitQ(e.target.value)}
                placeholder={recentUnits.length>0?"Recientes · o buscar eco/marca...":"Buscar unidad..."}
                style={{width:"100%",background:C.bg0,border:`1px solid ${unitQ?C.blueHi:C.border}`,
                  borderRadius:12,padding:"12px 40px 12px 16px",color:C.t1,fontSize:14,
                  outline:"none",boxSizing:"border-box"}}/>
              {unitQ&&<button onClick={()=>setUnitQ("")}
                style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",
                  background:"transparent",border:"none",color:C.t3,fontSize:16,cursor:"pointer",padding:4}}>×</button>}
            </div>
            {filteredUnits.length>0
              ? <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {filteredUnits.map(u=>(
                    <Chip key={u.id}
                      label={unitQ
                        ? (u.economico?"Eco."+u.economico+" ":"")+u.marca.split(" ")[0]+" "+u.modelo.split(" ")[0]
                        : u.economico?"Eco."+u.economico:u.marca.split(" ")[0]+" "+u.modelo.split(" ")[0]}
                      active={false} onClick={()=>{setUnitId(u.id);setUnitQ("");}}/>
                  ))}
                </div>
              : unitQ
                ? <div style={{fontSize:12,color:C.t3,padding:"6px 4px"}}>Sin resultados para "{unitQ}"</div>
                : <div style={{fontSize:12,color:C.t3,padding:"6px 4px"}}>Sin unidades registradas</div>
            }
          </>
        )}
      </div>

      {/* Preview precio en tiempo real */}
      {cost>0&&(
        <div style={{background:C.bg0,border:`1px solid ${C.border}`,borderRadius:12,
          padding:"14px 16px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:10,color:C.t3,letterSpacing:"0.1em",marginBottom:4}}>P3 · CONSUMIBLE · 28%</div>
            <div style={{fontSize:22,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(snap.precioConIVA)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,color:C.t3,marginBottom:4}}>UTIL. NETA</div>
            <div style={{fontSize:17,fontWeight:700,fontFamily:"'Courier New',monospace",
              color:snap.uNeta>=0?C.green:C.red}}>{mxn(snap.uNeta)}</div>
          </div>
        </div>
      )}

      {/* CTA principal */}
      <button onClick={save} disabled={!desc.trim()}
        style={{width:"100%",padding:"18px 24px",
          background:desc.trim()?C.blue:C.bg2,
          border:`1px solid ${desc.trim()?C.blueHi:C.border}`,
          borderRadius:14,color:desc.trim()?C.t1:C.t3,
          fontSize:17,fontWeight:700,cursor:desc.trim()?"pointer":"default",
          letterSpacing:"0.06em",marginBottom:10,
          opacity:desc.trim()?1:0.5}}>
        CREAR TICKET →
      </button>

      {/* Acceso al cotizador completo */}
      <button onClick={()=>{onClose();onFull();}}
        style={{width:"100%",padding:"14px 24px",background:"transparent",
          border:`1px solid ${C.border}`,borderRadius:14,
          color:C.t2,fontSize:14,cursor:"pointer",letterSpacing:"0.04em"}}>
        Más opciones · tipo · prioridad · líneas múltiples
      </button>
    </div>
  </>);
}

// ── MCotizador — Cotizador móvil simplificado ─────────────────────────────────
function MCotizador({state,dispatch,toast}) {
  const {clients,suppliers,units} = state;
  const [step,     setStep]     = useState(0); // 0=tipo, 1=lineas, 2=datos
  const [priority, setPriority] = useState("P3");
  const [opType,   setOpType]   = useState("consumable");
  const [clientId, setClientId] = useState("");
  const [unitId,   setUnitId]   = useState("");
  const [supplierId,setSupplierId]=useState("");
  const [payType,  setPayType]  = useState("contado");
  const [promesa,  setPromesa]  = useState("");
  const [fecha,    setFecha]    = useState(todayMX());
  const [notes,    setNotes]    = useState("");
  const [iva,      setIva]      = useState(16);
  const [isr,      setIsr]      = useState(20);
  const [lineas,   setLineas]   = useState([emptyLine("consumable","P3",[])]);
  const [catalogSearch, setCatalogSearch] = useState(null);
  const [catalogQ,      setCatalogQ]      = useState("");
  const [activeMods,    setActiveMods]    = useState([]);
  const [pdfPending,    setPdfPending]    = useState(null);
  const sharedMargin = useMemo(()=>effectiveMargin(opType,priority,activeMods,false,27),[opType,priority,activeMods]);
  const lineSnaps = useMemo(()=>lineas.map(l=>{
    const mg   = l.customMgn?Math.min(l.customVal,100):sharedMargin;
    const costo= (l.costoUnit||0)*(l.qty||1);
    return computeSnap({costo,gasolina:l.gasolina||0,otros:l.otros||0,iva,isr,compraConIVA:true,ventaConIVA:true,mode:l.mode||"auto",margin:mg,manualPrice:l.manualPrice||"0"});
  }),[lineas,sharedMargin,iva,isr]);
  const totalPrecio = lineSnaps.reduce((s,sn)=>s+sn.precioConIVA,0);
  const totalNeta   = lineSnaps.reduce((s,sn)=>s+sn.uNeta,0);
  const aggMargen   = lineSnaps.reduce((s,sn)=>s+sn.precioSinIVA,0)>0?(totalNeta/lineSnaps.reduce((s,sn)=>s+sn.precioSinIVA,0))*100:0;

  const upd = (i,patch)=>setLineas(p=>p.map((l,j)=>j===i?{...l,...patch}:l));
  const addLinea = ()=>setLineas(p=>[...p,emptyLine(opType,priority,[])]);

  const save = ()=>{
    const titulo = lineas.map(l=>l.titulo.trim()||"Sin descripcion").join(" / ");
    const cl   = clients.find(c=>c.id===clientId);
    const un   = units.find(u=>u.id===unitId);
    const supp = suppliers.find(s=>s.id===supplierId);
    const lineasConSnap = lineas.map((l,i)=>({titulo:l.titulo||"Sin descripcion",partRef:l.partRef||"",snap:lineSnaps[i]}));
    const totalSnap = {
      precioConIVA:totalPrecio,precioSinIVA:lineSnaps.reduce((s,sn)=>s+sn.precioSinIVA,0),
      costoTotal:lineSnaps.reduce((s,sn)=>s+sn.costoTotal,0),costoBase:lineSnaps.reduce((s,sn)=>s+sn.costoBase,0),
      gastos:lineSnaps.reduce((s,sn)=>s+sn.gastos,0),uNeta:totalNeta,uBruta:lineSnaps.reduce((s,sn)=>s+sn.uBruta,0),
      isr:lineSnaps.reduce((s,sn)=>s+sn.isr,0),ivaTraslad:lineSnaps.reduce((s,sn)=>s+sn.ivaTraslad,0),
      ivaAcred:lineSnaps.reduce((s,sn)=>s+sn.ivaAcred,0),ivaNeto:lineSnaps.reduce((s,sn)=>s+sn.ivaNeto,0),
      markupSobre:0,margenNetoPrecio:aggMargen,params:{iva,isr},
    };
    const tkt={
      id:mkTicketId(fecha),titulo,opId:opType,opShort:(OP_TYPES.find(o=>o.id===opType)||OP_TYPES[0]).short,priority,
      clientId,supplierId,unitId,partRef:lineas.map(l=>l.partRef).filter(Boolean).join(", "),
      date:fecha,status:"recibido",payType,promesaPago:payType==="credit"?promesa:null,cobrado:false,
      mods:[...activeMods],prob:"high",horasOp:0,notes,mode:"multilinea",lineas:lineasConSnap,snap:totalSnap,
      timeline:[{ts:nowISO(),evento:"Ticket creado",actor:"Operador"}],
      history:[mkEvent("created",{titulo,status:"recibido",priority})],
    };
    dispatch({type:"TKT_ADD",t:tkt});
    toast("Ticket: "+tkt.id,"success");
    setPdfPending({tkt,cl,un,supp});
    setLineas([emptyLine(opType,priority,[])]);setNotes("");setStep(0);
    setClientId("");setUnitId("");setSupplierId("");setPayType("contado");setPromesa("");
  };

  const catalogResults = useMemo(()=>{
    if(catalogSearch===null) return [];
    const q=(catalogQ||"").toLowerCase().trim();
    if(!q) return state.parts.slice(0,12);
    return state.parts.filter(p=>
      p.nombre.toLowerCase().includes(q)||
      (p.oem||"").toLowerCase().includes(q)||
      (p.aplicacion||"").toLowerCase().includes(q)
    ).slice(0,12);
  },[catalogQ,catalogSearch,state.parts]);

  const selectFromCatalog = (p)=>{
    const idx=catalogSearch;
    upd(idx,{titulo:p.nombre,partRef:p.oem||p.aftermarket||"",costoUnit:p.ultimoPrecio||0,manualPrice:String(p.ultimoPrecio||0)});
    setCatalogSearch(null); setCatalogQ("");
  };

  const pr=PRIORITY[priority]||PRIORITY.P4;
  const stepNames=["Tipo","Líneas","Datos"];
  const StepBar=()=>(
    <div style={{display:"flex",alignItems:"center",padding:"14px 0 10px",gap:0}}>
      {stepNames.map((name,i)=>{
        const done=i<step; const curr=i===step;
        return (
          <React.Fragment key={i}>
            {i>0&&<div style={{flex:1,height:2,background:done?C.cyan:C.border,borderRadius:1,margin:"0 4px"}}/>}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,minWidth:0}}>
              <div style={{width:26,height:26,borderRadius:13,
                background:done?C.green:curr?C.cyan:C.bg2,
                border:`2px solid ${done?C.green:curr?C.cyan:C.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:11,fontWeight:800,
                color:done?"#0a0a0a":curr?C.bg0:C.t4,flexShrink:0}}>
                {done?"✓":i+1}
              </div>
              <div style={{fontSize:9,color:curr?C.cyan:done?C.green:C.t4,fontWeight:curr?700:400,
                letterSpacing:"0.08em",textTransform:"uppercase",lineHeight:1}}>
                {name}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );

  if(step===0) return (
    <div style={{padding:"14px"}}>
      {pdfPending&&<PDFConfirm {...pdfPending} onClose={()=>setPdfPending(null)}/>}
      <StepBar/>
      <div style={{fontSize:11,color:C.t3,letterSpacing:"0.14em",marginBottom:12}}>PRIORIDAD OPERATIVA</div>
      {Object.values(PRIORITY).map(p=>(
        <div key={p.id} onClick={()=>setPriority(p.id)}
          style={{padding:"14px",borderRadius:8,marginBottom:8,cursor:"pointer",background:priority===p.id?p.dim:C.bg1,border:`2px solid ${priority===p.id?p.dot:C.border}`,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:priority===p.id?p.dot:C.t3,flexShrink:0}}/>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:priority===p.id?p.dot:C.t2,fontFamily:"'Courier New',monospace"}}>{p.id}</div>
            <div style={{fontSize:12,color:priority===p.id?C.t1:C.t3}}>{p.label}</div>
          </div>
          {priority===p.id&&p.marginBonus>0&&<span style={{marginLeft:"auto",fontSize:11,color:p.dot,fontWeight:700}}>+{p.marginBonus}% margen</span>}
        </div>
      ))}
      <div style={{height:1,background:C.border,margin:"14px 0"}}/>
      <div style={{fontSize:11,color:C.t3,letterSpacing:"0.14em",marginBottom:12}}>TIPO DE OPERACION</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
        {OP_TYPES.map(op=>(
          <div key={op.id} onClick={()=>setOpType(op.id)}
            style={{padding:"12px",borderRadius:8,cursor:"pointer",background:opType===op.id?C.blueDim:C.bg1,border:`1px solid ${opType===op.id?C.blueHi:C.border}`}}>
            <div style={{fontSize:13,fontWeight:700,color:opType===op.id?C.t1:C.t2}}>{op.label}</div>
            <div style={{fontSize:10,color:C.t3,marginTop:2}}>{op.baseMin}--{op.baseMax}%</div>
          </div>
        ))}
      </div>
      <div style={{height:1,background:C.border,margin:"14px 0"}}/>
      <div style={{fontSize:11,color:C.t3,letterSpacing:"0.14em",marginBottom:12}}>MODIFICADORES</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
        {MODIFIERS.map(mod=>{
          const active=activeMods.includes(mod.id);
          return (
            <div key={mod.id} onClick={()=>setActiveMods(p=>p.includes(mod.id)?p.filter(x=>x!==mod.id):[...p,mod.id])}
              style={{padding:"12px 14px",borderRadius:8,cursor:"pointer",background:active?C.blueDim:C.bg1,border:`2px solid ${active?C.blueHi:C.border}`,display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:active?C.cyan:C.t3,flexShrink:0}}/>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:active?C.t1:C.t2}}>{mod.label}</div>
                <div style={{fontSize:11,color:active?C.cyan:C.t3}}>+{mod.pct}% margen</div>
              </div>
            </div>
          );
        })}
      </div>
      {activeMods.length>0&&(
        <div style={{background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:8,padding:"10px 14px",marginBottom:14}}>
          <div style={{fontSize:11,color:C.t3,marginBottom:2}}>Margen efectivo con modificadores</div>
          <div style={{fontSize:20,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{fpct(sharedMargin)}</div>
        </div>
      )}
      <MBtn label="Siguiente: Lineas de cotizacion" full onClick={()=>setStep(1)}/>
    </div>
  );

  if(step===1) return (
    <div style={{padding:"14px"}}>
      <StepBar/>
      {/* Modal catalogo */}
      {catalogSearch!==null&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:500,display:"flex",flexDirection:"column"}}
          onClick={()=>{setCatalogSearch(null);setCatalogQ("");}}>
          <div style={{background:C.bg1,borderBottom:`1px solid ${C.border}`,padding:"12px 14px",display:"flex",gap:8,alignItems:"center"}}
            onClick={e=>e.stopPropagation()}>
            <input autoFocus value={catalogQ} onChange={e=>setCatalogQ(e.target.value)}
              placeholder="Buscar en catalogo..."
              style={{flex:1,background:C.bg0,border:`1px solid ${C.border}`,borderRadius:8,padding:"11px 14px",color:C.t1,fontSize:15,outline:"none",fontFamily:"'Courier New',monospace"}}/>
            <button onClick={()=>{setCatalogSearch(null);setCatalogQ("");}}
              style={{padding:"10px 16px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:8,color:C.red,fontSize:14,cursor:"pointer",fontWeight:700,flexShrink:0}}>x</button>
          </div>
          <div style={{flex:1,overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
            {state.parts.length===0&&(
              <div style={{padding:"32px",textAlign:"center",color:C.t3,fontSize:13}}>Sin partes en el catalogo.</div>
            )}
            {catalogResults.map((p,i)=>(
              <div key={p.id} onClick={()=>selectFromCatalog(p)}
                style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 16px",borderBottom:`1px solid ${C.border}`,background:i%2===0?C.bg1:C.bg0,cursor:"pointer"}}>
                <div style={{flex:1,minWidth:0,marginRight:12}}>
                  <div style={{fontSize:14,fontWeight:700,color:C.t1,marginBottom:4}}>{p.nombre}</div>
                  <div style={{fontSize:11,color:C.t3,fontFamily:"'Courier New',monospace"}}>
                    {p.oem&&<span style={{color:C.cyan}}>{p.oem}</span>}
                    {p.oem&&p.aplicacion&&" · "}
                    {p.aplicacion}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  {p.ultimoPrecio>0&&<div style={{fontSize:15,fontWeight:800,color:C.yellow,fontFamily:"'Courier New',monospace"}}>{mxn(p.ultimoPrecio)}</div>}
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>Toca para agregar</div>
                </div>
              </div>
            ))}
            {catalogResults.length===0&&catalogQ&&(
              <div style={{padding:"32px",textAlign:"center",color:C.t3,fontSize:13}}>Sin resultados para "{catalogQ}"</div>
            )}
          </div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <div style={{fontSize:11,color:C.t3,letterSpacing:"0.14em"}}>LINEAS DE COTIZACION</div>
          <div style={{fontSize:10,color:pr.dot,marginTop:2}}>{pr.id} · {pr.label} · Margen {fpct(sharedMargin)}</div>
        </div>
        <button onClick={()=>setStep(0)} style={{fontSize:11,color:C.t3,background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",cursor:"pointer"}}>Atras</button>
      </div>

      {lineas.map((l,i)=>(
        <MCard key={l.key}>
          <div style={{padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{fontSize:10,color:C.cyan,fontWeight:700,fontFamily:"'Courier New',monospace"}}>LINEA {String(i+1).padStart(2,"0")}</span>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <span style={{fontSize:14,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(lineSnaps[i]?.precioConIVA||0)}</span>
                {lineas.length>1&&<button onClick={()=>setLineas(p=>p.filter((_,j)=>j!==i))} style={{padding:"5px 10px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:5,color:C.red,fontSize:12,cursor:"pointer",fontWeight:700}}>x</button>}
              </div>
            </div>

            {/* Descripcion */}
            <MField label="Descripcion" value={l.titulo} onChange={v=>upd(i,{titulo:v})} placeholder={"Pieza o servicio "+(i+1)}/>

            {/* Num parte + boton catalogo */}
            <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginBottom:10}}>
              <div>
                <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>NUM. PARTE / OEM</div>
                <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                  <input value={l.partRef||""} onChange={e=>upd(i,{partRef:e.target.value})} placeholder="OEM / referencia"
                    style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t2,fontSize:14,padding:"12px 14px",fontFamily:"'Courier New',monospace"}}/>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"flex-end"}}>
                <button onClick={()=>setCatalogSearch(i)}
                  style={{padding:"12px 14px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:6,color:C.cyan,fontSize:12,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap",minHeight:46}}>
                  Catalogo
                </button>
              </div>
            </div>

            {/* Cantidad + Costo unitario */}
            <div style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:8,marginBottom:8}}>
              <div>
                <div style={{fontSize:10,color:C.t3,marginBottom:5,letterSpacing:"0.12em"}}>CANTIDAD</div>
                <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.blueHi}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                  <input type="text" inputMode="numeric"
                    value={l._qtyRaw!==undefined?l._qtyRaw:String(l.qty||1)}
                    onChange={e=>upd(i,{_qtyRaw:e.target.value})}
                    onBlur={()=>{const n=parseInt(l._qtyRaw);upd(i,{qty:isFinite(n)&&n>=1?n:1,_qtyRaw:undefined});}}
                    style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:20,fontWeight:800,padding:"10px 0 10px 12px",fontFamily:"'Courier New',monospace"}}/>
                  <span style={{padding:"0 10px",color:C.t3,fontSize:11}}>pz</span>
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:C.t3,marginBottom:5,letterSpacing:"0.12em"}}>COSTO UNIT. (c/IVA)</div>
                <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                  <span style={{padding:"0 10px",color:C.t3,fontSize:14,fontFamily:"'Courier New',monospace"}}>$</span>
                  <input type="text" inputMode="decimal" value={l._costoRaw!==undefined?l._costoRaw:String(l.costoUnit||0)}
                    onChange={e=>upd(i,{_costoRaw:e.target.value})}
                    onBlur={()=>{const n=safeNumber(l._costoRaw);upd(i,{costoUnit:n,_costoRaw:undefined});}}
                    style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:16,padding:"10px 0",fontFamily:"'Courier New',monospace"}}/>
                </div>
              </div>
            </div>

            {(l.qty||1)>1&&(
              <div style={{fontSize:12,color:C.t3,fontFamily:"'Courier New',monospace",marginBottom:8}}>
                {l.qty} × {mxn(safeNumber(l.costoUnit))} = <span style={{color:C.t2,fontWeight:700}}>{mxn(safeNumber(l.costoUnit)*safeNumber(l.qty,1))}</span>
              </div>
            )}

            {/* Gasolina y otros */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              <div>
                <div style={{fontSize:10,color:C.t3,marginBottom:5,letterSpacing:"0.12em"}}>GASOLINA</div>
                <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                  <span style={{padding:"0 10px",color:C.t3,fontSize:14,fontFamily:"'Courier New',monospace"}}>$</span>
                  <input type="text" inputMode="decimal"
                    value={l._gasolinaRaw!==undefined?l._gasolinaRaw:String(l.gasolina||0)}
                    onChange={e=>upd(i,{_gasolinaRaw:e.target.value})}
                    onBlur={()=>upd(i,{gasolina:safeNumber(l._gasolinaRaw),_gasolinaRaw:undefined})}
                    style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:16,padding:"10px 0",fontFamily:"'Courier New',monospace"}}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:10,color:C.t3,marginBottom:5,letterSpacing:"0.12em"}}>OTROS</div>
                <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                  <span style={{padding:"0 10px",color:C.t3,fontSize:14,fontFamily:"'Courier New',monospace"}}>$</span>
                  <input type="text" inputMode="decimal"
                    value={l._otrosRaw!==undefined?l._otrosRaw:String(l.otros||0)}
                    onChange={e=>upd(i,{_otrosRaw:e.target.value})}
                    onBlur={()=>upd(i,{otros:safeNumber(l._otrosRaw),_otrosRaw:undefined})}
                    style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:16,padding:"10px 0",fontFamily:"'Courier New',monospace"}}/>
                </div>
              </div>
            </div>

            {/* Modo precio */}
            <div style={{display:"flex",gap:6,marginBottom:8}}>
              {[["auto","Auto"],["manual","Manual"]].map(([id,lbl])=>(
                <button key={id} onClick={()=>upd(i,{mode:id})}
                  style={{flex:1,padding:"10px",borderRadius:6,border:`1px solid ${l.mode===id?C.blueHi:C.border}`,background:l.mode===id?C.blue:"transparent",color:l.mode===id?C.t1:C.t2,fontSize:13,fontWeight:700,cursor:"pointer"}}>
                  {lbl}
                </button>
              ))}
            </div>
            {l.mode==="manual"&&(
              <div style={{marginBottom:6}}>
                <div style={{fontSize:10,color:C.t3,marginBottom:5,letterSpacing:"0.12em"}}>PRECIO VENTA C/IVA</div>
                <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.blueHi}`,borderRadius:6,overflow:"hidden",minHeight:50}}>
                  <span style={{padding:"0 12px",color:C.cyan,fontSize:18,fontFamily:"'Courier New',monospace"}}>$</span>
                  <input type="number" min={0} step={0.01} value={l.manualPrice} onChange={e=>upd(i,{manualPrice:e.target.value})}
                    style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:20,fontWeight:800,padding:"12px 0",fontFamily:"'Courier New',monospace"}}/>
                </div>
              </div>
            )}
            <div style={{fontSize:12,color:C.t3,fontFamily:"'Courier New',monospace",marginTop:4}}>
              Precio: <span style={{color:C.cyan,fontWeight:700}}>{mxn(lineSnaps[i]?.precioConIVA||0)}</span>
              {"  ·  "}Util: <span style={{color:(lineSnaps[i]?.uNeta||0)>=0?C.green:C.red,fontWeight:700}}>{mxn(lineSnaps[i]?.uNeta||0)}</span>
              {"  ·  "}Margen: <span style={{color:margenColor(lineSnaps[i]?.margenNetoPrecio||0),fontWeight:700}}>{fpct(lineSnaps[i]?.margenNetoPrecio||0)}</span>
            </div>
          </div>
        </MCard>
      ))}

      <button onClick={addLinea} style={{width:"100%",padding:"12px",background:"transparent",border:`1px dashed ${C.blueHi}`,borderRadius:8,color:C.cyan,fontSize:13,fontWeight:700,cursor:"pointer",marginBottom:12}}>
        + Agregar linea
      </button>

      {/* Total */}
      <MCard>
        <MRow label="Total c/IVA" value={mxn(totalPrecio)} color={C.cyan} bold/>
        <MRow label="Util. neta"  value={mxn(totalNeta)}   color={totalNeta>=0?C.green:C.red} bold/>
        <MRow label="Rentabilidad neta" value={fpct(aggMargen)}  color={margenColor(aggMargen)}/>
      </MCard>

      <MBtn label="Siguiente: Datos del ticket" full onClick={()=>setStep(2)}/>
    </div>
  );

  return (
    <div style={{padding:"14px"}}>
      <StepBar/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:C.t3,letterSpacing:"0.14em"}}>DATOS DEL TICKET</div>
        <button onClick={()=>setStep(1)} style={{fontSize:11,color:C.t3,background:"transparent",border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",cursor:"pointer"}}>Atras</button>
      </div>

      <MCard>
        <div style={{padding:"12px 14px"}}>
          <div style={{fontSize:10,color:C.t3,marginBottom:4}}>FECHA</div>
          <input value={fecha} onChange={e=>setFecha(e.target.value)} placeholder="DD/MM/AAAA"
            style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",color:C.t1,fontSize:15,outline:"none",boxSizing:"border-box",fontFamily:"'Courier New',monospace",marginBottom:10}}/>
          <MSel label="Cliente"   value={clientId}   onChange={setClientId}   options={[{value:"",label:"-- Sin cliente --"},...clients.map(c=>({value:c.id,label:c.empresa}))]}/>
          <UnitPicker units={units} value={unitId} onChange={setUnitId} placeholder="Buscar por eco., placa, marca..." mobile/>
          <MSel label="Proveedor" value={supplierId} onChange={setSupplierId} options={[{value:"",label:"-- Sin proveedor --"},...suppliers.map(s=>({value:s.id,label:s.nombre}))]}/>
          <MSel label="Pago"      value={payType}    onChange={setPayType}    options={[{value:"contado",label:"Contado"},{value:"credit",label:"Credito"}]}/>
          {payType==="credit"&&<MField label="Promesa de pago" value={promesa} onChange={setPromesa} placeholder="DD/MM/AAAA" color={C.yellow}/>}
          <div>
            <div style={{fontSize:10,color:C.t3,marginBottom:5,letterSpacing:"0.12em"}}>NOTAS</div>
            <textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Diagnostico, observaciones..."
              style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",color:C.t2,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
          </div>
        </div>
      </MCard>

      {/* Resumen final */}
      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden",marginBottom:14}}>
        <div style={{padding:"12px 16px",borderBottom:`1px solid ${C.border}`}}>
          <div style={{fontSize:9,color:C.t3,letterSpacing:"0.14em",marginBottom:8,textTransform:"uppercase"}}>Resumen de cotización</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
            <div>
              <div style={{fontSize:11,color:C.t3,marginBottom:2}}>Total c/IVA</div>
              <div style={{fontSize:28,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace",lineHeight:1}}>{mxn(totalPrecio)}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:11,color:C.t3,marginBottom:2}}>Util. neta</div>
              <div style={{fontSize:20,fontWeight:800,color:totalNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace",lineHeight:1}}>{mxn(totalNeta)}</div>
              <div style={{fontSize:11,color:margenColor(aggMargen),marginTop:3,fontFamily:"'Courier New',monospace"}}>{fpct(aggMargen)}</div>
            </div>
          </div>
        </div>
        <div style={{padding:"10px 16px"}}>
          <MRow label={`${lineas.length} línea${lineas.length>1?"s":""}`} value={clients.find(c=>c.id===clientId)?.empresa||"Sin cliente"} color={C.t2}/>
          {unitId&&<MRow label="Unidad" value={(()=>{const u=units.find(u=>u.id===unitId);return u?(u.economico?"Eco."+u.economico+" · ":"")+u.marca+" "+u.modelo:"---";})() } color={C.cyan}/>}
          <MRow label="Pago" value={payType==="credit"?"Crédito"+(promesa?" · "+promesa:""):"Contado"} color={payType==="credit"?C.yellow:C.green}/>
        </div>
      </div>

      <MBtn label="Registrar ticket + PDF →" full onClick={save}/>
    </div>
  );
}

// ── MCartera — Cartera móvil ──────────────────────────────────────────────────
function MCartera({state,dispatch,toast}) {
  const {tickets,clients} = state;
  const pendientes = useMemo(()=>tickets.filter(t=>t.payType==="credit"&&!t.cobrado&&t.status!=="cancelado"),[tickets]);
  const totalPend  = pendientes.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
  const venc       = pendientes.filter(t=>{const d=parseDateMX(t.promesaPago);return d&&new Date()>d;});
  const totalVenc  = venc.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0);
  const proximos   = pendientes.filter(t=>{const d=parseDateMX(t.promesaPago);if(!d)return false;const diff=(d-new Date())/(1000*60*60*24);return diff>=0&&diff<=7;});
  const agingBuckets=[
    {label:"0–30d",  count:pendientes.filter(t=>{const d=parseDateMX(t.promesaPago);if(!d)return false;const diff=(new Date()-d)/(86400000);return diff>=0&&diff<30;}).length},
    {label:"30–60d", count:pendientes.filter(t=>{const d=parseDateMX(t.promesaPago);if(!d)return false;const diff=(new Date()-d)/(86400000);return diff>=30&&diff<60;}).length},
    {label:">60d",   count:pendientes.filter(t=>{const d=parseDateMX(t.promesaPago);if(!d)return false;const diff=(new Date()-d)/(86400000);return diff>=60;}).length},
  ];

  return (
    <div style={{padding:"14px"}}>
      {/* KPI strip */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:9,color:C.t4,letterSpacing:"0.14em",marginBottom:6}}>POR COBRAR</div>
          <div style={{fontSize:20,fontWeight:800,color:C.yellow,fontFamily:"'Courier New',monospace",lineHeight:1}}>{mxn(totalPend)}</div>
          <div style={{fontSize:10,color:C.t3,marginTop:4}}>{pendientes.length} {pendientes.length===1?"operación":"operaciones"}</div>
        </div>
        <div style={{background:venc.length>0?C.redDim:C.bg2,border:`1px solid ${venc.length>0?C.red+"55":C.border}`,borderRadius:12,padding:"14px 16px"}}>
          <div style={{fontSize:9,color:venc.length>0?C.red:C.t4,letterSpacing:"0.14em",marginBottom:6}}>VENCIDAS</div>
          <div style={{fontSize:20,fontWeight:800,color:venc.length>0?C.red:C.t4,fontFamily:"'Courier New',monospace",lineHeight:1}}>{mxn(totalVenc)}</div>
          <div style={{fontSize:10,color:C.t3,marginTop:4}}>{venc.length} {venc.length===1?"cuenta":"cuentas"}</div>
        </div>
      </div>

      {/* Próximos vencimientos */}
      {proximos.length>0&&(
        <div style={{background:C.bg2,border:`1px solid ${C.yellow}44`,borderRadius:12,padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>⏱</span>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:C.yellow}}>{proximos.length} venc. en los próximos 7 días</div>
            <div style={{fontSize:10,color:C.t3}}>{mxn(proximos.reduce((s,t)=>s+safeNumber(t.snap?.precioConIVA),0))} en riesgo</div>
          </div>
        </div>
      )}

      {/* Aging buckets */}
      {venc.length>0&&(
        <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
          <div style={{fontSize:9,color:C.t4,letterSpacing:"0.14em",marginBottom:10}}>ANTIGÜEDAD DE CARTERA VENCIDA</div>
          <div style={{display:"flex",gap:6}}>
            {agingBuckets.map(b=>(
              <div key={b.label} style={{flex:1,textAlign:"center",background:C.bg3,borderRadius:8,padding:"8px 4px"}}>
                <div style={{fontSize:16,fontWeight:800,color:b.count>0?C.red:C.t4,fontFamily:"'Courier New',monospace"}}>{b.count}</div>
                <div style={{fontSize:9,color:C.t4,marginTop:2}}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendientes.length===0&&(
        <div style={{textAlign:"center",padding:"48px 0",color:C.t4}}>
          <div style={{fontSize:28,marginBottom:8}}>✓</div>
          <div style={{fontSize:13,fontWeight:600,color:C.green}}>Cartera al corriente</div>
          <div style={{fontSize:11,color:C.t4,marginTop:4}}>Sin créditos pendientes</div>
        </div>
      )}

      {pendientes.map(t=>{
        const cl=clients.find(c=>c.id===t.clientId);
        const dias=daysFromNow(t.promesaPago);
        const esVenc=dias!=null&&dias>0;
        const daysLeft=t.promesaPago?(()=>{const d=parseDateMX(t.promesaPago);return d?Math.round((d-new Date())/(86400000)):null;})():null;
        const pronto=!esVenc&&daysLeft!=null&&daysLeft<=7&&daysLeft>=0;
        const accentColor = esVenc?C.red:pronto?C.yellow:C.cyan;
        return (
          <MCard key={t.id}>
            <div style={{padding:"14px 16px",borderLeft:`4px solid ${accentColor}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{flex:1,minWidth:0,marginRight:8}}>
                  <div style={{fontSize:9,color:C.t4,fontFamily:"'Courier New',monospace",marginBottom:3}}>{t.id}</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.t1,lineHeight:1.3,marginBottom:4}}>{t.titulo}</div>
                  <div style={{fontSize:11,color:C.t3}}>{cl?cl.empresa:"Sin cliente"}</div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:800,color:accentColor,fontFamily:"'Courier New',monospace"}}>{mxn(safeNumber(t.snap?.precioConIVA))}</div>
                  <StatusBadge sid={t.status} meta={TICKET_META} small/>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8}}>
                <div style={{fontSize:11,color:esVenc?C.red:accentColor,fontWeight:600}}>
                  {t.promesaPago||"Sin fecha"}{esVenc?` · VENCIDA ${dias}d`:pronto?` · vence en ${daysLeft}d`:""}
                </div>
                <MBtn label="Cobrado ✓" small bg={C.greenDim} border={C.green+"44"} color={C.green}
                  onClick={()=>{dispatch({type:"TKT_COBRADO",id:t.id});toast("Cobrado","success");}}/>
              </div>
            </div>
          </MCard>
        );
      })}
    </div>
  );
}

// ── DEBOUNCE HOOK ─────────────────────────────────────────────────────────────
function useDebounce(value, delay=250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(()=>{
    const t = setTimeout(()=>setDebounced(value), delay);
    return ()=>clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── OPERATIONAL LOG ───────────────────────────────────────────────────────────
const opLog = {
  _logs: [],
  push(action, detail={}) {
    const entry = { ts: new Date().toISOString(), action, ...detail };
    this._logs.push(entry);
    if (this._logs.length > 200) this._logs.shift();
    if (detail.error) console.warn("[LogiSolve]", action, detail);
  },
  get() { return [...this._logs]; },
};

// ── SAVING STATE HOOK ─────────────────────────────────────────────────────────
function useSyncStatus() {
  const [status, setStatus] = useState("idle"); // idle | saving | saved | offline | error
  const timerRef = useRef(null);
  const setSaving  = ()=>setStatus("saving");
  const setSaved   = ()=>{ setStatus("saved"); clearTimeout(timerRef.current); timerRef.current=setTimeout(()=>setStatus("idle"),2500); };
  const setOffline = ()=>setStatus("offline");
  const setError   = ()=>{ setStatus("error"); clearTimeout(timerRef.current); timerRef.current=setTimeout(()=>setStatus("idle"),4000); };
  return { status, setSaving, setSaved, setOffline, setError };
}

// ── PENDING CHANGES QUEUE (offline support) ───────────────────────────────────
const pendingQueue = {
  _q: [],
  push(op) { this._q.push({ ...op, ts: Date.now() }); this._persist(); },
  flush() { const q=[...this._q]; this._q=[]; this._persist(); return q; },
  peek() { return [...this._q]; },
  _persist() { try { localStorage.setItem("lgs_pending", JSON.stringify(this._q)); } catch(_e) {} },
  _restore() { try { const s=localStorage.getItem("lgs_pending"); if(s) this._q=JSON.parse(s)||[]; } catch(_e) {} },
};
pendingQueue._restore();


function MHistorial({state,dispatch,toast,scheduleHardDelete,cancelHardDelete}) {
  const {tickets,clients,units,suppliers} = state;
  const realizados = useMemo(()=>tickets.filter(t=>!t._deleted&&REVENUE_SET.has(t.status)),[tickets]);
  const totalFact  = useMemo(()=>realizados.reduce((s,t)=>s+t.snap.precioConIVA,0),[realizados]);
  const totalNeta  = useMemo(()=>realizados.reduce((s,t)=>s+t.snap.uNeta,0),[realizados]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [expId,     setExpId]     = useState(null);
  const [editId,    setEditId]    = useState(null);
  const [ef,        setEf]        = useState({});
  const [editLineas,setEditLineas]= useState([]);
  const [pdfPending,setPdfPending]= useState(null);
  const [pdfPreview,setPdfPreview]= useState(null);
  const [confirm,   setConfirm]   = useState(null);
  const sfn = k => v => setEf(p=>({...p,[k]:v}));

  // Body scroll lock when editing on mobile
  useEffect(()=>{
    if(!editId){ document.body.style.overflow=""; document.body.style.position=""; document.body.style.width=""; return; }
    const y=window.scrollY;
    document.body.style.overflow="hidden"; document.body.style.position="fixed";
    document.body.style.top=`-${y}px`; document.body.style.width="100%";
    return()=>{ document.body.style.overflow=""; document.body.style.position=""; document.body.style.top=""; document.body.style.width=""; window.scrollTo(0,y); };
  },[editId]);

  const updLinea = (idx,patch) => setEditLineas(p=>p.map((l,i)=>i===idx?{...l,...patch}:l));
  const delLinea = idx => setEditLineas(p=>p.filter((_,i)=>i!==idx));
  const addLinea = () => setEditLineas(p=>[...p,{titulo:"",partRef:"",costoUnit:0,gasolina:0,otros:0,qty:1,mode:"manual",manualPrice:"0",customMgn:false,customVal:27}]);

  // Snap igual que cotizador — usa safeNumber y qty
  const liveSnap = useMemo(()=>{
    if(!editId||!editLineas.length) return null;
    const iva=safeNumber(ef.iva,16); const isr=safeNumber(ef.isr,20);
    const opType=ef.opType||"consumable"; const priority=ef.priority||"P3";
    const activeMods=safeArr(ef.activeMods);
    const sharedMgn=effectiveMargin(opType,priority,activeMods,false,27);
    const snaps=editLineas.map(l=>{
      const mg=l.customMgn?Math.min(safeNumber(l.customVal),99):sharedMgn;
      const qty=safeNumber(l.qty,1)||1;
      const costo=safeNumber(l.costoUnit)*qty;
      return computeSnap({costo,gasolina:safeNumber(l.gasolina),otros:safeNumber(l.otros),iva,isr,
        compraConIVA:ef.cIVA!==false,ventaConIVA:ef.vIVA!==false,
        mode:l.mode||"manual",margin:mg,manualPrice:l.manualPrice||"0"});
    });
    const sum=k=>snaps.reduce((s,sn)=>s+safeNumber(sn[k]),0);
    const precioSinIVA=sum("precioSinIVA"); const uNeta=sum("uNeta");
    return {
      precioConIVA:sum("precioConIVA"),precioSinIVA,
      ivaTraslad:sum("ivaTraslad"),ivaAcred:sum("ivaAcred"),ivaNeto:sum("ivaNeto"),
      costoTotal:sum("costoTotal"),costoBase:sum("costoBase"),gastos:sum("gastos"),
      uNeta,uBruta:sum("uBruta"),isr:sum("isr"),
      markupSobre:sum("costoTotal")>0?((precioSinIVA-sum("costoTotal"))/sum("costoTotal"))*100:0,
      margenNetoPrecio:precioSinIVA>0?(uNeta/precioSinIVA)*100:0,
      params:{iva,isr},
    };
  },[editId,editLineas,ef]);

  const startEdit = (t) => {
    setEditId(t.id);
    setExpId(t.id);
    const iva = t.snap.params?.iva||16;
    const ivaR = iva/100;
    const toConIVA = (snap) => (snap?.costoBase||0)*(1+ivaR);
    let lineas;
    if(t.lineas&&t.lineas.length>0) {
      lineas=t.lineas.map(l=>({
        titulo:l.titulo||"",partRef:l.partRef||"",
        qty:l.qty||1,costoUnit:toConIVA(l.snap),
        gasolina:l.snap?.gastos||0,otros:0,
        mode:"manual",manualPrice:(l.snap?.precioConIVA||0).toFixed(2),
        customMgn:false,customVal:27,
      }));
    } else {
      const parts=(t.titulo||"").split(" / ").filter(Boolean);
      if(parts.length>1) {
        const pxLinea=(t.snap.precioConIVA/parts.length).toFixed(2);
        const costoXLinea=toConIVA(t.snap)/parts.length;
        lineas=parts.map(p=>({titulo:p.trim(),partRef:"",qty:1,costoUnit:costoXLinea,gasolina:0,otros:0,mode:"manual",manualPrice:pxLinea,customMgn:false,customVal:27}));
      } else {
        lineas=[{titulo:t.titulo||"",partRef:t.partRef||"",qty:1,costoUnit:toConIVA(t.snap),gasolina:t.snap?.gastos||0,otros:0,mode:"manual",manualPrice:(t.snap.precioConIVA||0).toFixed(2),customMgn:false,customVal:27}];
      }
    }
    setEditLineas(lineas);
    setEf({
      date:t.date, clientId:t.clientId||"", supplierId:t.supplierId||"", unitId:t.unitId||"",
      status:t.status, payType:t.payType, promesaPago:t.promesaPago||"",
      prob:t.prob||"high", horasOp:t.horasOp||0, notes:t.notes||"",
      iva, isr:t.snap.params?.isr||20,
      cIVA:true, vIVA:true,
      opType:t.opId||"consumable", activeMods:[...(t.mods||[])], priority:t.priority||"P3",
    });
  };

  const cancelEdit = () => { setEditId(null); setEf({}); setEditLineas([]); };

  const saveEdit = (id) => {
    if(!liveSnap) return;
    const opType=ef.opType||"consumable"; const priority=ef.priority||"P3";
    const activeMods=ef.activeMods||[];
    const sharedMgn=effectiveMargin(opType,priority,activeMods,false,27);
    const opMeta=OP_TYPES.find(o=>o.id===opType)||OP_TYPES[0];
    const titulo=editLineas.map(l=>l.titulo.trim()||"Sin descripcion").join(" / ");
    const lineasConSnap=editLineas.map(l=>{
      const mg=l.customMgn?Math.min(l.customVal,99):sharedMgn;
      const costo=(l.costoUnit||0)*(l.qty||1);
      const snap=computeSnap({costo,gasolina:l.gasolina||0,otros:l.otros||0,
        iva:parseFloat(ef.iva)||16,isr:parseFloat(ef.isr)||20,
        compraConIVA:ef.cIVA!==false,ventaConIVA:ef.vIVA!==false,
        mode:l.mode||"manual",margin:mg,manualPrice:l.manualPrice||"0"});
      return {titulo:l.titulo||"Sin descripcion",partRef:l.partRef||"",snap,qty:l.qty||1};
    });
    const patch={
      titulo, lineas:lineasConSnap,
      opId:opType, opShort:opMeta.short, priority, mods:[...activeMods],
      date:ef.date, clientId:ef.clientId, supplierId:ef.supplierId, unitId:ef.unitId||"",
      status:ef.status, payType:ef.payType,
      promesaPago:ef.payType==="credit"?ef.promesaPago:null,
      cobrado:PAID_SET.has(ef.status), prob:ef.prob,
      horasOp:parseFloat(ef.horasOp)||0, notes:ef.notes,
      snap:liveSnap, mode:editLineas.length>1?"multilinea":"auto",
      partRef:editLineas.map(l=>l.partRef).filter(Boolean).join(", "),
    };
    dispatch({type:"TKT_UPDATE",id,patch});
    toast("Ticket actualizado","success");
    cancelEdit();
  };

  const MSel2 = ({label,value,onChange,options}) => (
    <div style={{marginBottom:10}}>
      {label&&<div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5,textTransform:"uppercase"}}>{label}</div>}
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",color:C.t1,fontSize:14,outline:"none",fontFamily:"'Courier New',monospace"}}>
        {options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{padding:"14px"}}>
      {pdfPending&&<PDFConfirm {...pdfPending} onClose={()=>setPdfPending(null)}/>}
      {pdfPreview&&<PDFPreviewModal {...pdfPreview} onClose={()=>setPdfPreview(null)}/>}
      {confirm&&<Confirm msg={"Eliminar: "+confirm.titulo+"?"} onConfirm={()=>{
        const id=confirm.id;
        dispatch({type:"TKT_SOFT_DEL",id});
        scheduleHardDelete(id);
        toast("Ticket eliminado","info");
        setConfirm(null);setExpId(null);
      }} onCancel={()=>setConfirm(null)}/>}

      {/* Papelera — tickets soft-deleted con opción de restaurar */}
      {tickets.filter(t=>t._deleted).length>0&&(
        <div style={{background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:12,padding:"10px 14px",marginBottom:12}}>
          <div style={{fontSize:10,color:C.red,fontWeight:700,marginBottom:6}}>🗑 Papelera ({tickets.filter(t=>t._deleted).length})</div>
          {tickets.filter(t=>t._deleted).map(t=>(
            <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:11,color:C.t2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,marginRight:8}}>{t.titulo}</div>
              <button onClick={()=>{dispatch({type:"TKT_RESTORE",id:t.id});cancelHardDelete(t.id);toast("Restaurado","success");}}
                style={{padding:"5px 12px",background:C.greenDim,border:`1px solid ${C.green}44`,borderRadius:8,color:C.green,fontSize:11,cursor:"pointer",fontWeight:700,flexShrink:0}}>
                Restaurar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* KPI resumen del historial */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        {[
          {l:"Total facturado",v:mxn(totalFact),c:C.cyan,sub:`${realizados.length} ops cerradas`},
          {l:"Utilidad neta",  v:mxn(totalNeta),c:totalNeta>=0?C.green:C.red,sub:totalFact>0?fpct((totalNeta/totalFact)*100):"—"},
        ].map(({l,v,c,sub})=>(
          <div key={l} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px"}}>
            <div style={{fontSize:9,color:C.t3,letterSpacing:"0.14em",marginBottom:6,textTransform:"uppercase"}}>{l}</div>
            <div style={{fontSize:18,fontWeight:800,color:c,fontFamily:"'Courier New',monospace",lineHeight:1,marginBottom:4}}>{v}</div>
            <div style={{fontSize:10,color:C.t3}}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Filtros de estado */}
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4,marginBottom:12}}>
        {[["all","Todos"],["cerrado","Cerrado"],["cobrado","Cobrado"],["cancelado","Cancelado"]].map(([v,l])=>{
          const cnt=v==="all"?tickets.filter(t=>!t._deleted).length:tickets.filter(t=>!t._deleted&&t.status===v).length;
          return (
          <button key={v} onClick={()=>setFilterStatus(v)}
            style={{padding:"7px 14px",borderRadius:20,flexShrink:0,
              border:`1px solid ${filterStatus===v?C.cyan:C.border}`,
              background:filterStatus===v?C.blueDim:"transparent",
              color:filterStatus===v?C.cyan:C.t3,
              fontSize:12,cursor:"pointer",fontWeight:filterStatus===v?700:400,whiteSpace:"nowrap",minHeight:34}}>
            {l}{cnt>0&&<span style={{marginLeft:5,fontSize:10,opacity:0.7}}>{cnt}</span>}
          </button>
        );
        })}
      </div>

      {(()=>{const filtered2=tickets.filter(t=>!t._deleted&&(filterStatus==="all"||t.status===filterStatus));if(filtered2.length===0)return(<div style={{textAlign:"center",padding:"48px 0",color:C.t4}}><div style={{fontSize:28,marginBottom:8}}>📋</div><div style={{fontSize:13,fontWeight:600,color:C.t3}}>{filterStatus==="all"?"Sin registros":"Sin tickets "+filterStatus+"s"}</div></div>);})()}
      {tickets.filter(t=>!t._deleted&&(filterStatus==="all"||t.status===filterStatus)).map(t=>{
        const cl=clients.find(c=>c.id===t.clientId);
        const un=units.find(u=>u.id===t.unitId);
        const exp=expId===t.id;
        const editing=editId===t.id;
        const pr=PRIORITY[t.priority]||PRIORITY.P4;
        const meta=TICKET_META[t.status]||TICKET_META.recibido;
        return (
          <MCard key={t.id}>
            {/* Header feed card */}
            <div onClick={()=>{if(!editing)setExpId(exp?null:t.id);}} style={{padding:"14px 16px",cursor:"pointer",borderLeft:`3px solid ${pr.dot}`}}>
              {/* Row 1: status dot + ID + date + status badge */}
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:meta.dot,flexShrink:0}}/>
                <span style={{fontSize:9,color:C.t3,fontFamily:"'Courier New',monospace",flex:1}}>{t.id} · {t.date}</span>
                <StatusBadge sid={t.status} meta={TICKET_META} small/>
              </div>
              {/* Row 2: titulo */}
              {t.lineas&&t.lineas.length>1 ? (
                <div style={{marginBottom:10}}>
                  {t.lineas.map((l,j)=>(
                    <div key={j} style={{fontSize:13,color:C.t1,lineHeight:1.5,opacity:j===0?1:0.7}}>
                      {j===0?"":"· "}{l.titulo}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{fontSize:14,fontWeight:700,color:C.t1,marginBottom:10,lineHeight:1.4}}>{t.titulo}</div>
              )}
              {/* Row 3: client/unit left — price right */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                <div style={{minWidth:0,flex:1,marginRight:12}}>
                  <div style={{fontSize:12,color:C.t2,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cl?cl.empresa:"Sin cliente"}</div>
                  {un&&<div style={{fontSize:10,color:C.t3,marginTop:2,fontFamily:"'Courier New',monospace"}}>{un.economico?"Eco."+un.economico+" · ":""}{un.marca} {un.modelo}</div>}
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace",lineHeight:1}}>{mxn(t.snap?.precioConIVA||0)}</div>
                  <div style={{fontSize:11,color:(t.snap?.uNeta||0)>=0?C.green:C.red,fontFamily:"'Courier New',monospace",marginTop:3}}>{mxn(t.snap?.uNeta||0)} neto</div>
                </div>
              </div>
            </div>

            {/* Expandido */}
            {exp&&(
              <div style={{borderTop:`1px solid ${C.border}`}}>
                {editing ? (
                  <>
                    {/* Backdrop overlay */}
                    <div onClick={cancelEdit} className="fade-enter" style={{position:"fixed",inset:0,zIndex:299,background:"rgba(0,0,0,.65)"}}/>
                    {/* Bottom sheet */}
                    <div className="sheet-enter" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:300,
                      background:C.bg1,borderRadius:"18px 18px 0 0",
                      borderTop:`1px solid ${C.borderHi}`,
                      maxHeight:"92vh",overflowY:"auto",
                      WebkitOverflowScrolling:"touch",
                      boxShadow:"0 -16px 60px rgba(0,0,0,.65)"}}>
                      {/* Drag handle */}
                      <div style={{display:"flex",justifyContent:"center",padding:"12px 0 4px",position:"sticky",top:0,background:C.bg1,zIndex:1}}>
                        <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
                      </div>
                    <div style={{padding:`0 16px calc(24px + env(safe-area-inset-bottom,0px))`}}>
                    {/* Sticky header con acciones — Save/Cancel siempre visibles */}
                    <div style={{position:"sticky",top:28,zIndex:10,background:C.bg1,
                      paddingBottom:10,marginBottom:12,
                      borderBottom:`1px solid ${C.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{fontSize:10,color:C.cyan,letterSpacing:"0.14em",fontWeight:700,fontFamily:"'Courier New',monospace"}}>{t.id} · EDITANDO</div>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={cancelEdit}
                            style={{padding:"8px 14px",background:"transparent",border:`1px solid ${C.border}`,
                              borderRadius:8,color:C.t2,fontSize:12,cursor:"pointer",fontWeight:600}}>
                            Cancelar
                          </button>
                          <button onClick={()=>saveEdit(t.id)}
                            style={{padding:"8px 18px",background:C.blue,border:`1px solid ${C.blueHi}`,
                              borderRadius:8,color:C.t1,fontSize:12,cursor:"pointer",fontWeight:700}}>
                            Guardar ✓
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Datos generales */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:4}}>
                      <div>
                        <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>FECHA</div>
                        <input value={ef.date} onChange={e=>sfn("date")(e.target.value)} placeholder="DD/MM/AAAA"
                          style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"'Courier New',monospace"}}/>
                      </div>
                      <MSel2 label="Estado" value={ef.status} onChange={sfn("status")} options={TICKET_ALL.map(id=>({value:id,label:TICKET_META[id].label}))}/>
                    </div>

                    {/* Prioridad */}
                    <div style={{marginBottom:10}}>
                      <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:6}}>PRIORIDAD</div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                        {Object.values(PRIORITY).map(p=>(
                          <div key={p.id} onClick={()=>sfn("priority")(p.id)}
                            style={{padding:"10px 12px",borderRadius:6,cursor:"pointer",background:(ef.priority||t.priority)===p.id?p.dim:C.bg2,border:`2px solid ${(ef.priority||t.priority)===p.id?p.dot:C.border}`,display:"flex",alignItems:"center",gap:8}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:(ef.priority||t.priority)===p.id?p.dot:C.t3,flexShrink:0}}/>
                            <div>
                              <div style={{fontSize:10,fontWeight:700,color:(ef.priority||t.priority)===p.id?p.dot:C.t2}}>{p.id}</div>
                              <div style={{fontSize:9,color:C.t3}}>{p.label}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <MSel2 label="Cliente"   value={ef.clientId}   onChange={sfn("clientId")}   options={[{value:"",label:"-- Sin cliente --"},...clients.map(c=>({value:c.id,label:c.empresa}))]}/>
                    <MSel2 label="Proveedor" value={ef.supplierId} onChange={sfn("supplierId")} options={[{value:"",label:"-- Sin proveedor --"},...suppliers.map(s=>({value:s.id,label:s.nombre}))]}/>
                    <UnitPicker units={units} value={ef.unitId||""} onChange={sfn("unitId")} mobile/>

                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <MSel2 label="Pago" value={ef.payType} onChange={sfn("payType")} options={[{value:"contado",label:"Contado"},{value:"credit",label:"Credito"}]}/>
                      <MSel2 label="Prob." value={ef.prob} onChange={sfn("prob")} options={PROB.map(p=>({value:p.id,label:p.label+" ("+p.pct+"%)"}))}/> 
                    </div>
                    {ef.payType==="credit"&&(
                      <div style={{marginBottom:10}}>
                        <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>PROMESA DE PAGO</div>
                        <input value={ef.promesaPago} onChange={e=>sfn("promesaPago")(e.target.value)} placeholder="DD/MM/AAAA"
                          style={{width:"100%",background:C.bg0,border:`1px solid ${C.yellow}55`,borderRadius:6,padding:"12px 14px",color:C.yellow,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"'Courier New',monospace"}}/>
                      </div>
                    )}

                    <MSel2 label="Tipo de operación" value={ef.opType||"consumable"} onChange={sfn("opType")} options={OP_TYPES.map(o=>({value:o.id,label:o.label+" ("+o.baseMin+"-"+o.baseMax+"%)"}))}/>

                    {/* Fiscales */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                      <div>
                        <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>IVA %</div>
                        <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                          <input type="text" inputMode="decimal" value={ef.iva} onChange={e=>sfn("iva")(e.target.value)}
                            style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:15,padding:"10px 14px",fontFamily:"'Courier New',monospace"}}/>
                          <span style={{padding:"0 12px",color:C.t3,fontSize:13}}>%</span>
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>ISR %</div>
                        <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                          <input type="text" inputMode="decimal" value={ef.isr} onChange={e=>sfn("isr")(e.target.value)}
                            style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:15,padding:"10px 14px",fontFamily:"'Courier New',monospace"}}/>
                          <span style={{padding:"0 12px",color:C.t3,fontSize:13}}>%</span>
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:12,marginBottom:10}}>
                      <Toggle label="Compra c/IVA" value={ef.cIVA!==false} onChange={v=>sfn("cIVA")(v)}/>
                      <Toggle label="Venta c/IVA"  value={ef.vIVA!==false} onChange={v=>sfn("vIVA")(v)}/>
                    </div>

                    {/* ── LÍNEAS ── */}
                    <div style={{height:1,background:C.border,margin:"4px 0 12px"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em"}}>PRODUCTOS / SERVICIOS ({editLineas.length})</div>
                      <button onClick={addLinea}
                        style={{padding:"7px 14px",background:C.blueDim,border:`1px solid ${C.blueHi}`,borderRadius:6,color:C.cyan,fontSize:12,cursor:"pointer",fontWeight:700}}>
                        + Agregar
                      </button>
                    </div>

                    {editLineas.map((l,idx)=>{
                      const mg=l.customMgn?Math.min(l.customVal,99):effectiveMargin(ef.opType||"consumable",ef.priority||"P3",ef.activeMods||[],false,27);
                      const costo=(l.costoUnit||0)*(l.qty||1);
                      const lsnap=computeSnap({costo,gasolina:l.gasolina||0,otros:l.otros||0,iva:parseFloat(ef.iva)||16,isr:parseFloat(ef.isr)||20,compraConIVA:ef.cIVA!==false,ventaConIVA:ef.vIVA!==false,mode:l.mode||"manual",margin:mg,manualPrice:l.manualPrice||"0"});
                      return (
                      <div key={idx} style={{background:C.bg1,border:`1px solid ${C.borderHi}`,borderRadius:8,padding:"12px 14px",marginBottom:10}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                          <div>
                            <span style={{fontSize:10,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>Línea {String(idx+1).padStart(2,"0")}</span>
                            <span style={{fontSize:10,color:margenColor(lsnap.margenNetoPrecio),fontFamily:"'Courier New',monospace",marginLeft:8}}>{mxn(lsnap.precioConIVA)} · {fpct(lsnap.margenNetoPrecio)}</span>
                          </div>
                          {editLineas.length>1&&(
                            <button onClick={()=>delLinea(idx)}
                              style={{padding:"6px 12px",background:C.redDim,border:`1px solid ${C.red}44`,borderRadius:6,color:C.red,fontSize:12,cursor:"pointer",fontWeight:700}}>
                              × Eliminar
                            </button>
                          )}
                        </div>
                        {/* Descripción */}
                        <div style={{marginBottom:10}}>
                          <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>DESCRIPCIÓN</div>
                          <input value={l.titulo} onChange={e=>updLinea(idx,{titulo:e.target.value})} placeholder="Producto o servicio..."
                            style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",color:C.t1,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
                        </div>
                        {/* Descripción PDF */}
                        <div style={{marginBottom:10}}>
                          <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>DESCRIPCIÓN EN COTIZACIÓN PDF</div>
                          <textarea value={l.descripcionPDF||""} onChange={e=>updLinea(idx,{descripcionPDF:e.target.value})} rows={3}
                            placeholder="Dejar vacío para texto por defecto..."
                            style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",color:C.t2,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
                        </div>
                        {/* Ref */}
                        <div style={{marginBottom:10}}>
                          <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>REF. / OEM</div>
                          <input value={l.partRef||""} onChange={e=>updLinea(idx,{partRef:e.target.value})} placeholder="Número de parte..."
                            style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",color:C.t2,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"'Courier New',monospace"}}/>
                        </div>
                        {/* Cant + Costo en 2 col */}
                        <div style={{display:"grid",gridTemplateColumns:"90px 1fr",gap:8,marginBottom:8}}>
                          <div>
                            <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>CANT.</div>
                            <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.blueHi}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                              <input type="text" inputMode="numeric"
                                value={l._qtyRaw!==undefined?l._qtyRaw:String(l.qty||1)}
                                onChange={e=>updLinea(idx,{_qtyRaw:e.target.value})}
                                onBlur={()=>{const n=parseInt(l._qtyRaw);updLinea(idx,{qty:isFinite(n)&&n>=1?n:1,_qtyRaw:undefined});}}
                                style={{flex:1,minWidth:0,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:16,fontWeight:700,padding:"10px 10px",fontFamily:"'Courier New',monospace"}}/>
                              <span style={{padding:"0 8px",color:C.t3,fontSize:11,flexShrink:0}}>pz</span>
                            </div>
                          </div>
                          <div>
                            <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>COSTO UNIT. C/IVA</div>
                            <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                              <span style={{padding:"0 8px",color:C.t3,fontSize:13,fontFamily:"'Courier New',monospace",flexShrink:0}}>$</span>
                              <input type="text" inputMode="decimal"
                                value={l._costoRaw!==undefined?l._costoRaw:String(l.costoUnit||0)}
                                onChange={e=>updLinea(idx,{_costoRaw:e.target.value})}
                                onBlur={()=>updLinea(idx,{costoUnit:safeNumber(l._costoRaw),_costoRaw:undefined})}
                                style={{flex:1,minWidth:0,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:14,padding:"10px 8px 10px 0",fontFamily:"'Courier New',monospace"}}/>
                            </div>
                          </div>
                        </div>
                        {/* Gasolina + Otros en 2 col */}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                          {[["GASOLINA","gasolina"],["OTROS","otros"]].map(([lbl,k])=>(
                            <div key={k}>
                              <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>{lbl}</div>
                              <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",minHeight:46}}>
                                <span style={{padding:"0 8px",color:C.t3,fontSize:13,fontFamily:"'Courier New',monospace",flexShrink:0}}>$</span>
                                <input type="text" inputMode="decimal"
                                  value={l[`_${k}Raw`]!==undefined?l[`_${k}Raw`]:String(l[k]||0)}
                                  onChange={e=>updLinea(idx,{[`_${k}Raw`]:e.target.value})}
                                  onBlur={()=>updLinea(idx,{[k]:safeNumber(l[`_${k}Raw`]),[`_${k}Raw`]:undefined})}
                                  style={{flex:1,minWidth:0,background:"transparent",border:"none",outline:"none",color:C.t1,fontSize:14,padding:"10px 8px 10px 0",fontFamily:"'Courier New',monospace"}}/>
                              </div>
                            </div>
                          ))}
                        </div>
                        {(safeNumber(l.qty,1))>1&&<div style={{fontSize:11,color:C.t3,fontFamily:"'Courier New',monospace",marginBottom:8}}>{l.qty} × {mxn(safeNumber(l.costoUnit))} = {mxn(safeNumber(l.costoUnit)*safeNumber(l.qty,1))}</div>}
                        {/* Modo */}
                        <div style={{marginBottom:8}}>
                          <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:6}}>MODO PRECIO</div>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <div style={{display:"flex",borderRadius:6,overflow:"hidden",border:`1px solid ${C.border}`}}>
                              {[["auto","Auto"],["manual","Manual"]].map(([id,lbl])=>(
                                <button key={id} onClick={()=>updLinea(idx,{mode:id})}
                                  style={{padding:"10px 18px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:l.mode===id?C.blue:C.bg2,color:l.mode===id?C.t1:C.t2}}>{lbl}</button>
                              ))}
                            </div>
                            {l.mode==="auto"&&(
                              <div style={{flex:1,textAlign:"right"}}>
                                <span style={{fontSize:13,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>Margen: {fpct(mg)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Precio manual */}
                        {l.mode==="manual"&&(
                          <div>
                            <div style={{fontSize:10,color:C.cyan,letterSpacing:"0.12em",marginBottom:5}}>PRECIO VENTA C/IVA</div>
                            <div style={{display:"flex",alignItems:"center",background:C.bg0,border:`1px solid ${C.blueHi}`,borderRadius:6,overflow:"hidden",minHeight:50}}>
                              <span style={{padding:"0 10px",color:C.cyan,fontSize:16,fontFamily:"'Courier New',monospace",flexShrink:0}}>$</span>
                              <input type="text" inputMode="decimal" value={l.manualPrice} onChange={e=>updLinea(idx,{manualPrice:e.target.value})}
                                style={{flex:1,minWidth:0,background:"transparent",border:"none",outline:"none",color:C.cyan,fontSize:18,fontWeight:800,padding:"10px 8px 10px 0",fontFamily:"'Courier New',monospace"}}/>
                            </div>
                          </div>
                        )}
                      </div>
                      );
                    })}

                    {/* Preview total */}
                    {liveSnap&&(
                      <div style={{background:C.bg3,border:`1px solid ${C.borderHi}`,borderRadius:8,padding:"12px 14px",marginBottom:12}}>
                        <div style={{fontSize:9,color:C.t3,marginBottom:6}}>TOTAL ({editLineas.length} línea{editLineas.length>1?"s":""})</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:17,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(liveSnap.precioConIVA)}</div>
                            <div style={{fontSize:11,color:C.t3,marginTop:2}}>c/IVA incluido</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:15,fontWeight:700,color:liveSnap.uNeta>=0?C.green:C.red,fontFamily:"'Courier New',monospace"}}>{mxn(liveSnap.uNeta)}</div>
                            <div style={{fontSize:11,color:C.t3,marginTop:2}}>util. neta</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notas */}
                    <div style={{marginBottom:14}}>
                      <div style={{fontSize:10,color:C.t3,letterSpacing:"0.12em",marginBottom:5}}>NOTAS</div>
                      <textarea rows={3} value={ef.notes} onChange={e=>sfn("notes")(e.target.value)} placeholder="Diagnostico, observaciones..."
                        style={{width:"100%",background:C.bg0,border:`1px solid ${C.border}`,borderRadius:6,padding:"12px 14px",color:C.t2,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit",resize:"vertical"}}/>
                    </div>

                    {/* Acciones — también disponibles en el header sticky arriba */}
                    <div style={{display:"flex",gap:8,paddingTop:8}}>
                      <MBtn label="Guardar ✓" full onClick={()=>saveEdit(t.id)}/>
                      <MBtn label="Cancelar" bg="transparent" border={C.border} color={C.t2} small onClick={cancelEdit}/>
                    </div>
                    </div>{/* /padding inner */}
                    </div>{/* /sheet */}
                  </>
                ) : (
                  /* ── VISTA DETALLE ── */
                  <div style={{padding:"12px 14px"}}>

                    {/* Líneas individuales si existen */}
                    {t.lineas&&t.lineas.length>0&&(
                      <div style={{marginBottom:12}}>
                        <div style={{fontSize:9,color:C.t3,letterSpacing:"0.14em",marginBottom:6}}>PRODUCTOS / SERVICIOS</div>
                        {t.lineas.map((l,j)=>(
                          <div key={j} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                            <div style={{flex:1,minWidth:0,marginRight:12}}>
                              <div style={{fontSize:13,fontWeight:600,color:C.t1}}>{l.titulo}</div>
                              {l.partRef&&<div style={{fontSize:10,color:C.t3,fontFamily:"'Courier New',monospace",marginTop:2}}>{l.partRef}</div>}
                            </div>
                            <div style={{textAlign:"right",flexShrink:0}}>
                              <div style={{fontSize:14,fontWeight:700,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(l.snap?.precioConIVA||0)}</div>
                              <div style={{fontSize:10,color:C.t3}}>c/IVA</div>
                            </div>
                          </div>
                        ))}
                        <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0"}}>
                          <span style={{fontSize:13,fontWeight:700,color:C.t1}}>TOTAL</span>
                          <span style={{fontSize:15,fontWeight:800,color:C.cyan,fontFamily:"'Courier New',monospace"}}>{mxn(t.snap.precioConIVA)}</span>
                        </div>
                        <div style={{height:1,background:C.border,marginBottom:12}}/>
                      </div>
                    )}

                    {/* Desglose financiero completo */}
                    <div style={{fontSize:9,color:C.cyan,letterSpacing:"0.14em",marginBottom:8,fontWeight:700}}>DESGLOSE COMPLETO</div>
                    {(()=>{
                      const s=t.snap||{};
                      const carga=safeNumber(s.cargaFiscal,safeNumber(s.ivaNeto)+safeNumber(s.isr));
                      const efic=safeNumber(s.eficienciaFiscal,safeNumber(s.uBruta)>0?(safeNumber(s.uNeta)/safeNumber(s.uBruta))*100:0);
                      return [
                        ["Costo producto (c/IVA)", mxn(safeNumber(s.costoBase)*(1+safeNumber(s.params?.iva,16)/100)), C.t2,   false],
                        ["IVA acreditable",          mxn(s.ivaAcred),               C.blueHi,false],
                        ["Gastos operativos",        mxn(s.gastos),                 C.t2,    false],
                        ["Costo operativo total",    mxn(s.costoTotal),             C.t1,    true ],
                        ["Markup s/costo",           fpct(calcMarkup(s.precioSinIVA,s.costoTotal)),           C.blueHi,false],
                        ["Precio sin IVA",           mxn(s.precioSinIVA),           C.cyan,  false],
                        ["IVA trasladado",           mxn(s.ivaTraslad),             C.cyan,  false],
                        ["Precio con IVA",           mxn(s.precioConIVA),           C.cyan,  true ],
                        ["IVA neto SAT",             mxn(s.ivaNeto),                C.yellow,false],
                        ["Utilidad bruta",           mxn(s.uBruta),                 C.t2,    false],
                        ["ISR estimado SAT",         mxn(s.isr),                    C.yellow,false],
                        ["Carga fiscal total",       mxn(carga),                    C.red,   false],
                        ["Utilidad neta",            mxn(s.uNeta),                  safeNumber(s.uNeta)>=0?C.green:C.red, true],
                        ["Rentabilidad neta",        fpct(s.margenNetoPrecio),      margenColor(safeNumber(s.margenNetoPrecio)),false],
                        ["Eficiencia fiscal",        fpct(efic),                    efic>=75?C.green:efic>=60?C.yellow:C.red,false],
                      ];
                    })().map(([lbl,val,col,bold],j)=>(
                      <div key={j} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.border}`,background:bold?C.bg3:"transparent"}}>
                        <span style={{fontSize:13,color:bold?C.t1:C.t2,fontWeight:bold?700:400,paddingLeft:bold?4:0}}>{lbl}</span>
                        <span style={{fontSize:bold?15:13,fontWeight:bold?800:600,color:col,fontFamily:"'Courier New',monospace"}}>{val}</span>
                      </div>
                    ))}

                    {/* Datos adicionales */}
                    <div style={{marginTop:12,paddingTop:4}}>
                      {un&&<MRow label="Unidad" value={(un.economico?"Eco."+un.economico+" · ":"")+un.marca+" "+un.modelo} color={C.cyan}/>}
                      {t.payType==="credit"&&<MRow label="Promesa pago" value={t.promesaPago||"---"} color={C.yellow}/>}
                      {t.notes&&<div style={{padding:"8px 0",fontSize:11,color:C.t3,fontStyle:"italic",borderBottom:`1px solid ${C.border}`}}>"{t.notes}"</div>}
                    </div>

                    {/* Timeline */}
                    {t.timeline&&t.timeline.length>0&&(
                      <div style={{marginTop:10,paddingTop:8,borderTop:`1px solid ${C.border}`}}>
                        <div style={{fontSize:9,color:C.t3,letterSpacing:"0.12em",marginBottom:6}}>ÚLTIMOS EVENTOS</div>
                        {t.timeline.slice(-3).map((ev,j)=>(
                          <div key={j} style={{fontSize:10,color:C.t3,fontFamily:"'Courier New',monospace",marginBottom:4}}>{fmtTS(ev.ts)} — {ev.evento}</div>
                        ))}
                      </div>
                    )}

                    <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
                      <MBtn label="Editar" small bg={C.blueDim} border={C.blueHi} color={C.cyan} onClick={()=>startEdit(t)}/>
                      <MBtn label="PDF" small bg={C.bg2} border={C.border} color={C.t2}
                        onClick={()=>{const cl=state.clients.find(c=>c.id===t.clientId);const un=state.units?.find(u=>u.id===t.unitId);const su=state.suppliers?.find(s=>s.id===t.supplierId);setPdfPreview({tkt:t,cl,un,supp:su});}}/>
                      <MBtn label="Eliminar" small bg={C.redDim} border={C.red+"44"} color={C.red} onClick={()=>setConfirm(t)}/>
                    </div>
                  </div>
                )}
              </div>
            )}
          </MCard>
        );
      })}
    </div>
  );
}
// ── MasSheet — bottom sheet del menú "Más" ───────────────────────────────────
function MasSheet({open,onClose,tab,setTab}) {
  if(!open) return null;
  const items=[
    {id:"cotizador",  label:"Cotizador",  icon:"🧾", desc:"Multi-línea"},
    {id:"refacciones",label:"Refacciones",icon:"🔩", desc:"Cotiza partes"},
    {id:"cartera",    label:"Cartera",    icon:"💳", desc:"Por cobrar"},
    {id:"unidades",   label:"Flotilla",   icon:"🚛", desc:"Vehículos"},
    {id:"catalogo",   label:"Catálogo",   icon:"📦", desc:"Inventario"},
    {id:"clientes",   label:"Clientes",   icon:"🏢", desc:"Directorio"},
    {id:"proveedores",label:"Proveedores",icon:"🔧", desc:"Suppliers"},
    {id:"ajustes",    label:"Ajustes",    icon:"⚙",  desc:"Config"},
  ];
  return (
    <>
      <div onClick={onClose} className="fade-enter" style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,.55)"}}/>
      <div className="sheet-enter" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:151,
        background:C.bg1,borderRadius:"20px 20px 0 0",
        borderTop:`1px solid ${C.borderHi}`,
        padding:`0 16px calc(16px + env(safe-area-inset-bottom,0px))`,
        boxShadow:"0 -16px 60px rgba(0,0,0,.55)"}}>
        <div style={{display:"flex",justifyContent:"center",padding:"12px 0 6px"}}>
          <div style={{width:40,height:4,borderRadius:2,background:C.border}}/>
        </div>
        <div style={{fontSize:10,color:C.t3,letterSpacing:"0.16em",marginBottom:14,
          textAlign:"center",textTransform:"uppercase",fontWeight:700}}>Más módulos</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
          {items.map(item=>(
            <button key={item.id} onClick={()=>{setTab(item.id);onClose();}}
              style={{padding:"16px 8px",
                background:tab===item.id?C.blueDim:C.bg2,
                border:`1px solid ${tab===item.id?C.blueHi:C.border}`,
                borderRadius:16,cursor:"pointer",
                display:"flex",flexDirection:"column",alignItems:"center",gap:6,
                transition:"background 150ms ease"}}>
              <span style={{fontSize:26,lineHeight:1}}>{item.icon}</span>
              <span style={{fontSize:12,fontWeight:700,color:tab===item.id?C.cyan:C.t1,lineHeight:1}}>{item.label}</span>
              <span style={{fontSize:9,color:C.t3,lineHeight:1}}>{item.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

const TABS = [
  {id:"ops",          label:"Centro Ops"},
  {id:"tickets",      label:"Pipeline"},
  {id:"historial",    label:"Historial"},
  {id:"cotizador",    label:"Cotizador"},
  {id:"refacciones",  label:"Refacciones"},
  {id:"unidades",     label:"Unidades"},
  {id:"catalogo",     label:"Catalogo"},
  {id:"proveedores",  label:"Proveedores"},
  {id:"clientes",     label:"Clientes"},
  {id:"cartera",      label:"Cartera"},
  {id:"ajustes",      label:"Ajustes"},
];

export default function App() {
  const [state,dispatch]=useReducer(reducer,initialState);
  const {toasts,push:toast}=useToasts();
  const [tab,setTab]=useState("ops");
  const [search,setSearch]=useState(false);
  const [loading,setLoading]=useState(true);
  const [mobileView,setMobileView]=useState(()=>window.innerWidth<768);
  const [quickOpen,setQuickOpen]=useState(false);
  const [masOpen,setMasOpen]=useState(false);
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
        const maxSeq = tickets.reduce((m,t)=>{
          const n=parseInt((t.id||'').split('-').pop())||0; return Math.max(m,n);
        }, 7);
        if(maxSeq >= _seq) _seq = maxSeq + 1;
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
    const h=()=>setMobileView(window.innerWidth<768);
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
    <div style={{minHeight:"100vh",background:C.bg0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <Logo/>
      <div style={{fontSize:10,color:C.t3,fontFamily:"'Courier New',monospace",letterSpacing:"0.2em",marginTop:8}}>CARGANDO DATOS...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg0,color:C.t1,fontFamily:"'Trebuchet MS',sans-serif",fontSize:13}}>
      {search&&<SearchPalette state={state} onNavigate={t=>{setTab(t);}} onClose={()=>setSearch(false)}/>}

      {/* NAV */}
      <div style={{background:C.bg1,borderBottom:`1px solid ${C.border}`,padding:"6px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",position:"sticky",top:0,zIndex:100,flexWrap:"wrap",gap:4}}>
        <Logo/>
        <div style={{display:"flex",gap:2,alignItems:"center",flexWrap:"wrap"}}>
          {/* Desktop tabs — hidden on mobile view */}
          {!mobileView && TABS.map(t=>{
            const badge=t.id==="cartera"&&vencidos>0?vencidos:t.id==="tickets"&&abiertas>0?abiertas:t.id==="ops"&&p1Active>0?p1Active:0;
            const isP1Tab=t.id==="ops"&&p1Active>0;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{padding:"3px 9px",borderRadius:3,cursor:"pointer",fontSize:10,fontWeight:600,background:tab===t.id?C.blue:"transparent",border:`1px solid ${tab===t.id?C.blueHi:C.border}`,color:tab===t.id?C.t1:C.t2,position:"relative",letterSpacing:"0.04em"}}>
                {t.label}
                {badge>0&&<span style={{position:"absolute",top:-4,right:-4,width:13,height:13,borderRadius:"50%",background:isP1Tab?C.p1dot:t.id==="cartera"?C.red:C.yellow,fontSize:7,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",color:"#000"}}>{badge}</span>}
              </button>
            );
          })}
          <div style={{width:1,height:12,background:C.border,margin:"0 3px"}}/>
          {!mobileView&&<button onClick={()=>setSearch(true)} style={{padding:"3px 8px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:3,color:C.t2,fontSize:10,cursor:"pointer"}}>
            &#9906; <span style={{fontSize:7,color:C.t3}}>Ctrl+K</span>
          </button>}
          {/* Sync status indicator */}
          {syncStatus!=="idle"&&(
            <div style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:3,border:`1px solid ${C.border}`}}>
              <span style={{width:6,height:6,borderRadius:"50%",background:sd.dot,flexShrink:0,
                animation:syncStatus==="saving"?"pulse 1s infinite":"none"}}/>
              <span style={{fontSize:8,color:sd.color,letterSpacing:"0.06em"}}>{sd.label}</span>
            </div>
          )}
          {/* Mobile/Desktop toggle */}
          <button onClick={()=>setMobileView(v=>!v)}
            style={{padding:"3px 9px",background:mobileView?C.blueDim:"transparent",border:`1px solid ${mobileView?C.blueHi:C.border}`,borderRadius:3,color:mobileView?C.cyan:C.t3,fontSize:10,cursor:"pointer",letterSpacing:"0.04em"}}>
            {mobileView?"[ ] Escritorio":"[=] Movil"}
          </button>
        </div>
      </div>

      {/* ── Nav móvil nativa — 4 tabs + FAB ── */}
      {mobileView&&(
        <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,
          background:C.bg1,borderTop:`1px solid ${C.border}`,
          paddingBottom:"env(safe-area-inset-bottom,0px)",
          display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr"}}>
          {[
            {id:"ops",      label:"Centro",  icon:"●"},
            {id:"tickets",  label:"Pipeline",icon:"▷"},
            {id:"historial",label:"Historial",icon:"≡"},
            {id:"__mas__",  label:"Más",     icon:"⋯"},
          ].map(t=>{
            const badge = t.id==="tickets"&&abiertas>0?abiertas : t.id==="ops"&&p1Active>0?p1Active : isMore&&vencidos>0?vencidos : 0;
            const isMore = t.id==="__mas__";
            const moreActive = ["unidades","catalogo","proveedores","clientes","ajustes","cartera","cotizador","refacciones"].includes(tab);
            const active = isMore ? (moreActive||masOpen) : tab===t.id;
            return (
              <button key={t.id}
                onClick={()=>{ setQuickOpen(false); if(isMore){setMasOpen(v=>!v);}else{setTab(t.id);setMasOpen(false);} }}
                style={{padding:"12px 4px calc(12px + env(safe-area-inset-bottom,0px) * 0)",
                  border:"none",cursor:"pointer",background:active?C.blueDim:"transparent",
                  borderTop:`3px solid ${active?C.cyan:"transparent"}`,
                  position:"relative",display:"flex",flexDirection:"column",alignItems:"center",gap:4,
                  minHeight:56}}>
                <span style={{fontSize:18,fontWeight:800,color:active?C.cyan:C.t3,lineHeight:1}}>{t.icon}</span>
                <span style={{fontSize:10,color:active?C.cyan:C.t3,letterSpacing:"0.04em",fontWeight:active?700:400}}>{t.label}</span>
                {badge>0&&<span style={{position:"absolute",top:8,right:"calc(50% - 18px)",
                  minWidth:16,height:16,borderRadius:8,padding:"0 3px",
                  background:t.id==="ops"?C.p1dot:isMore?C.red:C.yellow,
                  fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",color:"#000"}}>{badge}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* FAB — Cotización rápida */}
      {mobileView&&(
        <button onClick={()=>setQuickOpen(v=>!v)}
          style={{position:"fixed",
            right:16,bottom:`calc(64px + env(safe-area-inset-bottom,0px) + 12px)`,
            zIndex:101,width:56,height:56,borderRadius:28,
            background:quickOpen?C.blueHi:C.blue,
            border:`1px solid ${C.blueHi}`,
            boxShadow:"0 4px 20px rgba(0,0,0,.5)",
            display:"flex",alignItems:"center",justifyContent:"center",
            cursor:"pointer",fontSize:26,color:C.t1,fontWeight:300,
            transition:"transform 200ms ease,background 200ms ease",
            transform:quickOpen?"rotate(45deg)":"rotate(0deg)"}}>
          +
        </button>
      )}

      {/* QuickQuoteSheet */}
      {mobileView&&(
        <QuickQuoteSheet
          state={state} dispatch={dispatchWithDelete} toast={toast}
          open={quickOpen} onClose={()=>setQuickOpen(false)}
          onFull={()=>setTab("cotizador")}/>
      )}

      {/* MasSheet — bottom sheet for "Más" modules */}
      {mobileView&&<MasSheet open={masOpen} onClose={()=>setMasOpen(false)} tab={tab} setTab={t=>{setTab(t);setMasOpen(false);}}/>}

      {/* Content */}
      <div style={{paddingBottom:mobileView?"calc(72px + env(safe-area-inset-bottom,0px))":0}}>
        {tab==="ops"        &&(mobileView?<MOps       state={state} setTab={setTab}/>                                    :<CentroOps   state={state}/>)}
        {tab==="tickets"    &&(mobileView?<MPipeline  state={state} dispatch={dispatchWithDelete} toast={toast}/>         :<Tickets     state={state} dispatch={dispatchWithDelete} toast={toast} scheduleHardDelete={scheduleHardDelete}/>)}
        {tab==="historial"  &&(mobileView?<MHistorial state={state} dispatch={dispatchWithDelete} toast={toast} scheduleHardDelete={scheduleHardDelete} cancelHardDelete={cancelHardDelete}/>:<Historial   state={state} dispatch={dispatchWithDelete} toast={toast} scheduleHardDelete={scheduleHardDelete} cancelHardDelete={cancelHardDelete}/>)}
        {tab==="cotizador"  &&(mobileView?<MCotizador state={state} dispatch={dispatchWithDelete} toast={toast}/>         :<Cotizador              state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="refacciones"&&<CotizadorRefacciones state={state} dispatch={dispatchWithDelete} toast={toast}/>}
        {tab==="cartera"    &&(mobileView?<MCartera   state={state} dispatch={dispatchWithDelete} toast={toast}/>         :<Cartera     state={state} dispatch={dispatchWithDelete} toast={toast}/>)}
        {tab==="unidades"   &&<Unidades    state={state} dispatch={dispatchWithDelete} toast={toast}/>}
        {tab==="catalogo"   &&<Catalogo    state={state} dispatch={dispatchWithDelete} toast={toast}/>}
        {tab==="proveedores"&&<Proveedores state={state} dispatch={dispatchWithDelete} toast={toast}/>}
        {tab==="clientes"   &&<Clientes    state={state} dispatch={dispatchWithDelete} toast={toast}/>}
        {tab==="ajustes"    &&<Ajustes     state={state} dispatch={dispatchWithDelete} toast={toast}/>}
      </div>

      <Toasts items={toasts}/>

      <style>{`
        html,body{overscroll-behavior:none;overflow-x:hidden;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        input[type=number]::-webkit-inner-spin-button{opacity:.2}
        input::placeholder,textarea::placeholder{color:${C.t3}}
        select option{background:${C.bg1};color:${C.t1}}
        *{box-sizing:border-box}
        button{transition:opacity 120ms ease,background 120ms ease,border-color 120ms ease}
        button:active{opacity:.72;transform:scale(.98)}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:${C.bg1}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
        textarea{color:${C.t2};resize:vertical;font-family:'Courier New',monospace}
        input,select,textarea{transition:border-color 150ms ease}
        @media(max-width:640px){.ref-grid{grid-template-columns:1fr!important}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        .sheet-enter{animation:slideUp 260ms cubic-bezier(.22,.8,.22,1) both}
        .fade-enter{animation:fadeIn 180ms ease both}
      `}</style>
    </div>
  );
}
