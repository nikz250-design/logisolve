// logisolve-calc.js
// Financial engine — computeSnap, calculateTicketTotals, migrateLinea
// ─────────────────────────────────────────────────────
import { PROB, OP_TYPES, MODIFIERS, PRIORITY } from "./logisolve-constants.js";

// Safe helpers (copied here so calc is self-contained)
export const safeNumber = (v, fallback=0) => {
  const n = typeof v==="string" ? parseFloat(v.replace(/,/g,"")) : Number(v);
  return (isFinite(n) && !isNaN(n)) ? n : fallback;
};
export const safeStr  = (v) => (v==null ? "" : String(v));
export const safeLower = (v) => safeStr(v).toLowerCase();
export const safeArr  = (v) => (Array.isArray(v) ? v : []);
export const genId = (prefix) => {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID().replace(/-/g,"").slice(0,8).toUpperCase()}`;
    }
  } catch {}
  // Fallback for Safari iOS < 15.4
  const rand = () => Math.floor((1+Math.random())*0x10000).toString(16).slice(1).toUpperCase();
  return `${prefix}-${rand()}${rand()}`;
};

// Utility
export const mxn  = n => safeNumber(n).toLocaleString("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:2});
export const fpct = n => safeNumber(n).toFixed(1)+"%";
export const clamp = (n,min,max) => Math.min(Math.max(safeNumber(n),min),max);
export const nowISO = () => new Date().toISOString();
export const fmtTS  = ts => { try { return new Date(ts).toLocaleString("es-MX",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}); } catch { return ts||""; } };
export const parseDateMX = (s) => {
  if(!s) return null;
  const p=s.split("/");
  if(p.length!==3) return null;
  return new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));
};
export const daysFromNow = (s) => { const d=parseDateMX(s); if(!d) return null; return Math.ceil((d-new Date())/(1000*60*60*24)); };
export const margenColor = m => m>=30?"#4ade80":m>=15?"#facc15":"#f87171";

export function computeSnap(p) {
  const { costo=0, gasolina=0, otros=0, iva=16, isr=20,
          compraConIVA=true, ventaConIVA=true, mode="auto", margin=0, manualPrice=0 } = p;
  const ivaR = safeNumber(iva,16)/100, isrR = safeNumber(isr,20)/100;
  const c0 = safeNumber(costo), g0 = safeNumber(gasolina), o0 = safeNumber(otros);
  const costoBase  = compraConIVA ? c0/(1+ivaR) : c0;
  const ivaAcred   = compraConIVA ? c0-costoBase : costoBase*ivaR;
  const gastos     = g0+o0;
  const costoTotal = costoBase+gastos;
  let precioSinIVA, markupSobre;
  if (mode==="manual") {
    const raw = safeNumber(manualPrice);
    precioSinIVA = ventaConIVA ? raw/(1+ivaR) : raw;
    markupSobre  = costoTotal>0 ? ((precioSinIVA-costoTotal)/costoTotal)*100 : 0;
  } else {
    precioSinIVA = costoTotal*(1+safeNumber(margin)/100);
    markupSobre  = safeNumber(margin);
  }
  const ivaTraslad       = precioSinIVA*ivaR;
  const precioConIVA     = ventaConIVA ? precioSinIVA+ivaTraslad : precioSinIVA;
  const ivaNeto          = ivaTraslad-ivaAcred;
  const uBruta           = precioSinIVA-costoTotal;
  const isrAmt           = Math.max(uBruta*isrR,0);
  const uNeta            = uBruta-isrAmt;
  const margenNetoPrecio = precioSinIVA>0 ? (uNeta/precioSinIVA)*100 : 0;
  return { costoBase,ivaAcred,gastos,costoTotal,precioSinIVA,ivaTraslad,precioConIVA,ivaNeto,uBruta,isr:isrAmt,uNeta,markupSobre,margenNetoPrecio,params:{iva,isr} };
}

export function effectiveMargin(opId, priority, mods, custom, customVal) {
  const op  = OP_TYPES.find(o=>o.id===opId)||OP_TYPES[0];
  const pr  = PRIORITY[priority]||PRIORITY.P3;
  const base = Math.round((op.baseMin+op.baseMax)/2) + pr.marginBonus;
  if (custom) return Math.min(customVal, op.cap);
  const modSum = mods.reduce((s,id)=>{ const m=MODIFIERS.find(m=>m.id===id); return s+(m?m.pct:0); },0);
  return Math.min(base+modSum, op.cap);
}

// ── MIGRACIÓN DE LÍNEAS — compatibilidad total con tickets viejos ─────────────
export function migrateLinea(l, fallbackSnap, ivaR=0.16) {
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
export function calculateTicketTotals(ticket) {
  if (!ticket) return null;
  const snap = ticket.snap || {};
  const lineas = safeArr(ticket.lineas);
  const iva = safeNumber(snap.params?.iva, 16);
  const isr = safeNumber(snap.params?.isr, 20);

  if (lineas.length === 0) {
    // Ticket viejo sin lineas — usar snap directamente
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
      markupSobre: safeNumber(snap.markupSobre),
      margenNeto:  safeNumber(snap.margenNetoPrecio),
      ivaPct: iva, isrPct: isr,
    };
  }

  // Agregar totales de todas las líneas
  const ivaR = iva/100;
  let subtotal=0, ivaAmt=0, total=0, costoTotal=0, uNeta=0, uBruta=0, isrAmt=0, ivaNeto=0;
  const lineasCalc = lineas.map(l => {
    const ml = migrateLinea(l, snap, ivaR);
    const qty = safeNumber(ml.qty, 1) || 1;
    const lsnap = ml.snap || {};
    const precioUnit  = safeNumber(lsnap.precioConIVA);
    const precioUnitSinIVA = safeNumber(lsnap.precioSinIVA);
    const lineTotal   = precioUnit * qty;
    const lineTotalSinIVA = precioUnitSinIVA * qty;
    const lineIVA     = safeNumber(lsnap.ivaTraslad) * qty;
    subtotal   += lineTotalSinIVA;
    ivaAmt     += lineIVA;
    total      += lineTotal;
    costoTotal += safeNumber(lsnap.costoTotal) * qty;
    uNeta      += safeNumber(lsnap.uNeta) * qty;
    uBruta     += safeNumber(lsnap.uBruta) * qty;
    isrAmt     += safeNumber(lsnap.isr) * qty;
    ivaNeto    += safeNumber(lsnap.ivaNeto) * qty;
    return { ...ml, precioUnit, precioUnitSinIVA, lineTotal, lineTotalSinIVA, lineIVA };
  });

  const markupSobre = costoTotal>0 ? ((subtotal-costoTotal)/costoTotal)*100 : 0;
  const margenNeto  = subtotal>0 ? (uNeta/subtotal)*100 : 0;

  return {
    lineas: lineasCalc,
    subtotal, ivaAmt, total,
    costoTotal, uNeta, uBruta, isrAmt, ivaNeto,
    markupSobre, margenNeto,
    ivaPct: iva, isrPct: isr,
  };
}

export function utilidadPonderada(uNeta, probId) {
  const p = PROB.find(x=>x.id===probId)||PROB[0];
  return uNeta*(p.pct/100);
}


// ═══════════════════════════════════════════════════════════════════════════════