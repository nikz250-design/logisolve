// logisolve-constants.js
// Design tokens, domain constants, seed data
// ─────────────────────────────────────────────────────
// L1 — DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════════
export const C = {
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

export const PRIORITY = {
  P1: { id:"P1", label:"Unidad detenida",         short:"P1", color:C.p1, dim:C.p1dim, dot:C.p1dot, marginBonus:40 },
  P2: { id:"P2", label:"Operacion comprometida",  short:"P2", color:C.p2, dim:C.p2dim, dot:C.p2dot, marginBonus:20 },
  P3: { id:"P3", label:"Preventivo urgente",      short:"P3", color:C.p3, dim:C.p3dim, dot:C.p3dot, marginBonus:0  },
  P4: { id:"P4", label:"Solicitud normal",        short:"P4", color:C.p4, dim:C.p4dim, dot:C.p4dot, marginBonus:0  },
};

export const OP_TYPES = [
  { id:"consumable", label:"Consumible",    short:"CONS",  baseMin:20, baseMax:35,  cap:80  },
  { id:"general",    label:"Ref. General",  short:"REF-G", baseMin:25, baseMax:40,  cap:100 },
  { id:"tech",       label:"Serv. Tecnico", short:"SERV",  baseMin:35, baseMax:60,  cap:120 },
  { id:"heavy",      label:"Ref. Pesada",   short:"REF-P", baseMin:35, baseMax:70,  cap:140 },
  { id:"logistics",  label:"Logistica",     short:"LOG",   baseMin:15, baseMax:30,  cap:60  },
  { id:"rescue",     label:"Rescate",       short:"RESC",  baseMin:60, baseMax:150, cap:220 },
];

export const MODIFIERS = [
  { id:"urgency",  label:"Urgencia / ent. inmediata", pct:20 },
  { id:"offhours", label:"Fuera de horario",           pct:20 },
  { id:"rare",     label:"Pieza dificil / rara",       pct:25 },
  { id:"credit",   label:"Credito",                    pct:10 },
];

// Ticket pipeline — operational states
export const TICKET_PIPELINE = [
  "recibido","validando","sourcing","cotizado","autorizado",
  "comprado","transito","entregado","facturado","cobrado","cerrado",
];
export const TICKET_META = {
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
export const TICKET_ALL = [...TICKET_PIPELINE, "cancelado"];

export const TICKET_TRANSITIONS = {
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

export const FORECAST_SET  = new Set(["recibido","validando","sourcing","cotizado","autorizado","comprado","transito"]);
export const CLOSED_SET    = new Set(["cerrado","cancelado","cobrado"]);
export const PAID_SET      = new Set(["cobrado","cerrado"]);
export const CARTERA_SET   = new Set(["entregado","facturado"]);

export const PROB = [
  { id:"high",   label:"Alta",  pct:90 },
  { id:"medium", label:"Media", pct:60 },
  { id:"low",    label:"Baja",  pct:30 },
];

// Unit operational status
export const UNIT_STATUS = {
  operativa:  { label:"Operativa",  color:C.green, dot:"#30C060" },
  detenida:   { label:"Detenida",   color:C.red,   dot:"#C03030" },
  preventivo: { label:"Preventivo", color:C.yellow,dot:"#C09020" },
  taller:     { label:"En taller",  color:C.orange,dot:"#C07020" },
};

export const STORAGE_KEY = "logisolve_v5";
export const STORAGE_VER = 6;

// ═══════════════════════════════════════════════════════════════════════════════