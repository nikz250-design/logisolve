// ── Logisolve v2 — Greenfield ─────────────────────────────────────────────────
// Entidad principal: OPERACIÓN (no ticket, no cotización)
// Modelo: resolución de necesidades operativas de flotilla
// Aislado de producción — storage: LOGI_V2_EXP
// ─────────────────────────────────────────────────────────────────────────────
import React, {
  useState, useReducer, useCallback, useMemo, useEffect, useRef, useContext,
  createContext,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "LOGI_V2_EXP";
const APP_VERSION = "2.0.0-greenfield";

const URGENCIA = {
  critica: { label: "Crítica",  color: "#FF3B30", dim: "rgba(255,59,48,0.15)",  sla_hrs: 4,   orden: 0 },
  alta:    { label: "Alta",     color: "#FF9500", dim: "rgba(255,149,0,0.15)",  sla_hrs: 24,  orden: 1 },
  media:   { label: "Media",    color: "#FFD60A", dim: "rgba(255,214,10,0.12)", sla_hrs: 72,  orden: 2 },
  normal:  { label: "Normal",   color: "#30D158", dim: "rgba(48,209,88,0.12)",  sla_hrs: 168, orden: 3 },
};

const TIPO_OP = {
  emergencia:  { label: "Emergencia",  icon: "🚨", color: "#FF3B30" },
  preventivo:  { label: "Preventivo",  icon: "🔧", color: "#30D158" },
  programado:  { label: "Programado",  icon: "📅", color: "#0A84FF" },
  servicio:    { label: "Servicio",    icon: "⚙️", color: "#BF5AF2" },
};

const ESTADOS = [
  "nuevo","diagnostico","sourcing","cotizado",
  "autorizado","preparando","en_ruta","resuelto","cobrado","cerrado",
];
const TERMINAL = new Set(["cobrado","cerrado","cancelado"]);
const ACTIVOS   = new Set(["nuevo","diagnostico","sourcing","cotizado","autorizado","preparando","en_ruta"]);
const RESUELTOS = new Set(["resuelto","cobrado","cerrado"]);
const COBRABLES = new Set(["resuelto"]);

const ESTADO_META = {
  nuevo:       { label: "Nuevo",       dot: "#6B9EC8", paso: 0 },
  diagnostico: { label: "Diagnóstico", dot: "#C8C050", paso: 1 },
  sourcing:    { label: "Sourcing",    dot: "#7AA0E0", paso: 2 },
  cotizado:    { label: "Cotizado",    dot: "#8FC855", paso: 3 },
  autorizado:  { label: "Autorizado",  dot: "#50C878", paso: 4 },
  preparando:  { label: "Preparando",  dot: "#34C759", paso: 5 },
  en_ruta:     { label: "En ruta",     dot: "#0A84FF", paso: 6 },
  resuelto:    { label: "Resuelto",    dot: "#30D158", paso: 7 },
  cobrado:     { label: "Cobrado",     dot: "#32D74B", paso: 8 },
  cerrado:     { label: "Cerrado",     dot: "#636366", paso: 9 },
  cancelado:   { label: "Cancelado",   dot: "#FF3B30", paso: -1 },
};

const SISTEMAS = {
  motor: "Motor", transmision: "Transmisión", frenos: "Frenos",
  suspension: "Suspensión", electrico: "Eléctrico", neumatico: "Neumático",
  carroceria: "Carrocería", hidraulico: "Hidráulico", enfriamiento: "Enfriamiento", otro: "Otro",
};

const TIPO_LINEA = {
  refaccion:   { label: "Refacción",    icon: "🔩" },
  servicio:    { label: "Servicio",     icon: "🔧" },
  mano_obra:   { label: "Mano de obra", icon: "👷" },
  consumible:  { label: "Consumible",   icon: "🧴" },
};

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────

const ThemeCtx = createContext(null);

const THEME = {
  bg0:   "#070909",
  bg1:   "rgba(255,255,255,0.04)",
  bg2:   "rgba(255,255,255,0.07)",
  border:"rgba(255,255,255,0.09)",
  glass: "blur(20px) saturate(1.8)",
  t1:    "#F0F4F8",
  t2:    "#8A9AA8",
  t3:    "#4A5A68",
  blue:  "#0A84FF",
  lime:  "#2BB5A0",
  amber: "#FFD60A",
  red:   "#FF3B30",
  green: "#30D158",
  r:     12,
  shadow:"0 4px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

const genId = (prefix = "OP") => `${prefix}-${Date.now().toString(36).toUpperCase()}`;
const nowISO = () => new Date().toISOString();
const safeN = (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; };
const mxn = v => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(safeN(v));
const pct  = v => `${safeN(v).toFixed(1)}%`;

function slaStatus(op) {
  if (!op.sla_inicio || TERMINAL.has(op.estado)) return null;
  const u = URGENCIA[op.urgencia] || URGENCIA.normal;
  const inicio = new Date(op.sla_inicio);
  const limite = new Date(inicio.getTime() + u.sla_hrs * 3600000);
  const now = new Date();
  const restMs = limite - now;
  const totalMs = u.sla_hrs * 3600000;
  const pctUsado = Math.min(100, ((totalMs - restMs) / totalMs) * 100);
  const restHrs = restMs / 3600000;
  const vencido = restMs < 0;
  return { limite, restHrs, pctUsado, vencido, totalHrs: u.sla_hrs };
}

function fmtSLA(restHrs) {
  if (restHrs < 0) return `${Math.abs(restHrs).toFixed(1)}h vencida`;
  if (restHrs < 1) return `${Math.round(restHrs * 60)}min`;
  if (restHrs < 24) return `${restHrs.toFixed(1)}h`;
  return `${Math.ceil(restHrs / 24)}d`;
}

function snapOp(lineas, iva = 16, isr = 20) {
  const ivaR = iva / 100; const isrR = isr / 100;
  let costo = 0, precio_sin_iva = 0;
  (lineas || []).forEach(l => {
    const qty = safeN(l.cantidad, 1);
    const c = safeN(l.costo_unitario);
    const p = safeN(l.precio_unitario);
    const costoBase = l.costo_con_iva ? c / (1 + ivaR) : c;
    costo += costoBase * qty;
    precio_sin_iva += p * qty;
  });
  const precio_con_iva = precio_sin_iva * (1 + ivaR);
  const u_bruta = precio_sin_iva - costo;
  const isr_amt = u_bruta > 0 ? u_bruta * isrR : 0;
  const u_neta = u_bruta - isr_amt;
  const margen = precio_sin_iva > 0 ? (u_neta / precio_sin_iva) * 100 : 0;
  return { costo, precio_sin_iva, precio_con_iva, u_bruta, u_neta, margen, iva, isr };
}

function opCodigo(id, date) {
  const d = date ? new Date(date) : new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  const seq = id.slice(-4).toUpperCase();
  return `OP-${yy}${mm}${dd}-${seq}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────

const now = nowISO();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const twoDaysAgo = new Date(Date.now() - 172800000).toISOString();

const SEED_CLIENTES = [
  { id: "CLI-001", empresa: "Logis Express SAPI", contacto: "Ing. Ramírez", tel: "+52 55 1234 5678", rfc: "LEX010101AAA", credito_dias: 30, categoria: "A" },
  { id: "CLI-002", empresa: "Transportes Norteño SA", contacto: "Luis Herrera", tel: "+52 55 9876 5432", rfc: "TNS020202BBB", credito_dias: 15, categoria: "B" },
];

const SEED_UNIDADES = [
  { id: "UNI-001", economico: "45", marca: "Freightliner", modelo: "M2 106", anio: 2019, vin: "3ALACWDT4KDBK1234", placa: "XYZ-123", km: 187500, clienteId: "CLI-001", estado_op: "detenida" },
  { id: "UNI-002", economico: "12", marca: "Kenworth",     modelo: "T370",   anio: 2021, vin: "2NKHHM7X4MM123456", placa: "ABC-789", km: 95200,  clienteId: "CLI-001", estado_op: "operativa" },
  { id: "UNI-003", economico: "8",  marca: "Ford",         modelo: "F-350",  anio: 2020, vin: "1FT8W3BT1LEA45678", placa: "DEF-456", km: 142800, clienteId: "CLI-002", estado_op: "preventivo" },
  { id: "UNI-004", economico: "31", marca: "International",modelo: "LT",     anio: 2022, vin: "3HSDJAPR9NN789012", placa: "GHI-012", km: 68300,  clienteId: "CLI-002", estado_op: "operativa" },
];

const SEED_PROVEEDORES = [
  { id: "PRV-001", nombre: "El Cerrito Refacciones", especialidad: "Motor/Transmisión", entrega_hrs: 2, score: 92, tel: "+52 55 5555 0001" },
  { id: "PRV-002", nombre: "Autopartes Casillas",    especialidad: "Suspensión/Frenos", entrega_hrs: 4, score: 87, tel: "+52 55 5555 0002" },
  { id: "PRV-003", nombre: "Refacciones del Norte",  especialidad: "Eléctrico/General", entrega_hrs: 3, score: 79, tel: "+52 55 5555 0003" },
];

const SEED_OPS = [
  {
    id: genId(), estado: "sourcing", urgencia: "critica", tipo: "emergencia",
    titulo: "Falla de distribución — Freightliner Eco. 45",
    diagnostico: {
      falla_reportada: "Motor no arranca, posible falla en cadena de distribución",
      sistema_afectado: "motor", causa_probable: "Cadena de distribución desgastada, tensor hidráulico fallido",
      confianza: 0.88,
    },
    clienteId: "CLI-001", unidadId: "UNI-001", proveedorId: null,
    lineas: [
      { id: genId("L"), descripcion: "Cadena de distribución", tipo: "refaccion", oem: "N/A", cantidad: 1, costo_unitario: 2800, precio_unitario: 3780, costo_con_iva: true, estado: "buscando" },
      { id: genId("L"), descripcion: "Tensor hidráulico", tipo: "refaccion", oem: "N/A", cantidad: 1, costo_unitario: 750, precio_unitario: 1050, costo_con_iva: true, estado: "buscando" },
    ],
    sla_inicio: new Date(Date.now() - 7200000).toISOString(),
    pago: { tipo: "credito", promesa: null, cobrado: false },
    notas: "Unidad varada en carretera Cuautitlán-Huehuetoca. Cliente reporta sonido metálico antes de la falla.",
    eventos: [{ ts: new Date(Date.now() - 7200000).toISOString(), tipo: "creado", actor: "Sistema", detalle: "Operación registrada" }],
    ai_sugerencia: "Proveedor recomendado: El Cerrito. Tiene stock confirmado de cadena compatible M2 106. Tiempo estimado: 2-3 hrs.",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    _deleted: false,
  },
  {
    id: genId(), estado: "cotizado", urgencia: "alta", tipo: "preventivo",
    titulo: "Balatas y discos delantera — Ford F-350 Eco. 8",
    diagnostico: {
      falla_reportada: "Balatas desgastadas al límite, ruido al frenar",
      sistema_afectado: "frenos", causa_probable: "Desgaste normal por kilometraje. Requiere cambio preventivo.",
      confianza: 0.95,
    },
    clienteId: "CLI-002", unidadId: "UNI-003", proveedorId: "PRV-002",
    lineas: [
      { id: genId("L"), descripcion: "Balatas delanteras (juego)", tipo: "refaccion", oem: "FMSI D1421", cantidad: 1, costo_unitario: 1200, precio_unitario: 1680, costo_con_iva: true, estado: "confirmado" },
      { id: genId("L"), descripcion: "Discos delanteros (par)", tipo: "refaccion", oem: "Motorcraft BRR-64", cantidad: 1, costo_unitario: 2100, precio_unitario: 2940, costo_con_iva: true, estado: "confirmado" },
      { id: genId("L"), descripcion: "Mano de obra instalación", tipo: "mano_obra", oem: null, cantidad: 1, costo_unitario: 800, precio_unitario: 1100, costo_con_iva: false, estado: "confirmado" },
    ],
    sla_inicio: yesterday,
    pago: { tipo: "contado", promesa: null, cobrado: false },
    notas: "Preventivo programado. Cliente pide entrega mañana por la mañana.",
    eventos: [
      { ts: yesterday, tipo: "creado", actor: "Sistema", detalle: "Operación registrada" },
      { ts: new Date(Date.now() - 3600000).toISOString(), tipo: "estado", actor: "Operador", detalle: "Cotización enviada al cliente" },
    ],
    ai_sugerencia: "Margen efectivo 39%. Autopartes Casillas confirma entrega en 4 hrs. Cotización lista para enviar.",
    createdAt: yesterday,
    _deleted: false,
  },
  {
    id: genId(), estado: "resuelto", urgencia: "normal", tipo: "programado",
    titulo: "Cambio de aceite motor + filtros — Kenworth T370 Eco. 12",
    diagnostico: {
      falla_reportada: "Servicio programado por kilometraje",
      sistema_afectado: "motor", causa_probable: "Mantenimiento preventivo por km",
      confianza: 1.0,
    },
    clienteId: "CLI-001", unidadId: "UNI-002", proveedorId: "PRV-001",
    lineas: [
      { id: genId("L"), descripcion: "Aceite 15W-40 (10 lts)", tipo: "consumible", oem: null, cantidad: 10, costo_unitario: 85, precio_unitario: 115, costo_con_iva: true, estado: "entregado" },
      { id: genId("L"), descripcion: "Filtro aceite",          tipo: "refaccion",  oem: null, cantidad: 1,  costo_unitario: 280, precio_unitario: 390, costo_con_iva: true, estado: "entregado" },
      { id: genId("L"), descripcion: "Filtro combustible",     tipo: "refaccion",  oem: null, cantidad: 1,  costo_unitario: 320, precio_unitario: 445, costo_con_iva: true, estado: "entregado" },
    ],
    sla_inicio: twoDaysAgo,
    pago: { tipo: "credito", promesa: new Date(Date.now() + 864000000).toISOString().slice(0,10), cobrado: false },
    notas: "",
    eventos: [
      { ts: twoDaysAgo, tipo: "creado", actor: "Sistema", detalle: "Operación registrada" },
      { ts: new Date(Date.now() - 86400000).toISOString(), tipo: "estado", actor: "Operador", detalle: "Resuelto — piezas instaladas" },
    ],
    ai_sugerencia: null,
    createdAt: twoDaysAgo,
    _deleted: false,
  },
];

const INITIAL_STATE = {
  operaciones: SEED_OPS,
  clientes: SEED_CLIENTES,
  unidades: SEED_UNIDADES,
  proveedores: SEED_PROVEEDORES,
  version: APP_VERSION,
};

// ─────────────────────────────────────────────────────────────────────────────
// REDUCER
// ─────────────────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    case "OP_CREATE": {
      const op = { ...action.op, id: genId(), createdAt: nowISO(), _deleted: false };
      if (!op.sla_inicio) op.sla_inicio = nowISO();
      op.eventos = [{ ts: nowISO(), tipo: "creado", actor: "Operador", detalle: "Operación registrada" }];
      return { ...state, operaciones: [...state.operaciones, op] };
    }

    case "OP_UPDATE": {
      return {
        ...state,
        operaciones: state.operaciones.map(op =>
          op.id !== action.id ? op : { ...op, ...action.patch }
        ),
      };
    }

    case "OP_AVANZAR": {
      const op = state.operaciones.find(o => o.id === action.id);
      if (!op) return state;
      const idx = ESTADOS.indexOf(op.estado);
      const nextEstado = ESTADOS[idx + 1];
      if (!nextEstado) return state;
      const evento = { ts: nowISO(), tipo: "estado", actor: "Operador", detalle: `→ ${ESTADO_META[nextEstado].label}` };
      return {
        ...state,
        operaciones: state.operaciones.map(o =>
          o.id !== action.id ? o : { ...o, estado: nextEstado, eventos: [...(o.eventos || []), evento] }
        ),
      };
    }

    case "OP_CANCELAR": {
      const ev = { ts: nowISO(), tipo: "cancelado", actor: "Operador", detalle: action.motivo || "Cancelada" };
      return {
        ...state,
        operaciones: state.operaciones.map(o =>
          o.id !== action.id ? o : { ...o, estado: "cancelado", eventos: [...(o.eventos || []), ev] }
        ),
      };
    }

    case "OP_COBRAR": {
      const ev = { ts: nowISO(), tipo: "cobrado", actor: "Operador", detalle: "Pago recibido" };
      return {
        ...state,
        operaciones: state.operaciones.map(o =>
          o.id !== action.id ? o : {
            ...o, estado: "cobrado",
            pago: { ...o.pago, cobrado: true, fecha_cobro: nowISO() },
            eventos: [...(o.eventos || []), ev],
          }
        ),
      };
    }

    case "OP_ADD_LINEA": {
      return {
        ...state,
        operaciones: state.operaciones.map(o =>
          o.id !== action.id ? o : { ...o, lineas: [...(o.lineas || []), { ...action.linea, id: genId("L") }] }
        ),
      };
    }

    case "OP_UPDATE_LINEA": {
      return {
        ...state,
        operaciones: state.operaciones.map(o =>
          o.id !== action.opId ? o : {
            ...o,
            lineas: (o.lineas || []).map(l => l.id !== action.lineaId ? l : { ...l, ...action.patch }),
          }
        ),
      };
    }

    case "OP_DELETE_LINEA": {
      return {
        ...state,
        operaciones: state.operaciones.map(o =>
          o.id !== action.opId ? o : { ...o, lineas: (o.lineas || []).filter(l => l.id !== action.lineaId) }
        ),
      };
    }

    case "OP_DELETE": {
      return { ...state, operaciones: state.operaciones.filter(o => o.id !== action.id) };
    }

    case "CLI_ADD":    return { ...state, clientes: [...state.clientes, action.c] };
    case "CLI_UPDATE": return { ...state, clientes: state.clientes.map(c => c.id !== action.id ? c : { ...c, ...action.patch }) };

    case "UNI_ADD":    return { ...state, unidades: [...state.unidades, action.u] };
    case "UNI_UPDATE": return { ...state, unidades: state.unidades.map(u => u.id !== action.id ? u : { ...u, ...action.patch }) };

    case "PRV_ADD":    return { ...state, proveedores: [...state.proveedores, action.p] };
    case "PRV_UPDATE": return { ...state, proveedores: state.proveedores.map(p => p.id !== action.id ? p : { ...p, ...action.patch }) };

    default: return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (d.version !== APP_VERSION) return null;
    return d.data || null;
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: APP_VERSION, ts: nowISO(), data: state }));
  } catch (e) { console.warn("storage:", e); }
}

// ─────────────────────────────────────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

const C = THEME;

function Pill({ label, color, dim, small }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: small ? "2px 7px" : "3px 9px",
      borderRadius: 20, fontSize: small ? 9 : 10, fontWeight: 700,
      background: dim || `${color}18`, color: color,
      letterSpacing: "0.04em",
    }}>{label}</span>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: C.bg1, border: `1px solid ${C.border}`,
      borderRadius: C.r, padding: "14px 16px",
      boxShadow: C.shadow, cursor: onClick ? "pointer" : undefined,
      ...style,
    }}>{children}</div>
  );
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 8, color: C.t3, letterSpacing: "0.14em",
      textTransform: "uppercase", marginBottom: 5, fontWeight: 700,
    }}>{children}</div>
  );
}

function Btn({ label, onClick, variant = "default", full, small, disabled, icon }) {
  const variants = {
    default:  { bg: C.bg2,  border: C.border,         color: C.t2  },
    primary:  { bg: `${C.lime}18`, border: `${C.lime}44`, color: C.lime },
    danger:   { bg: `${C.red}12`,  border: `${C.red}33`,  color: C.red  },
    ghost:    { bg: "transparent", border: "transparent",  color: C.t3  },
    blue:     { bg: `${C.blue}18`, border: `${C.blue}44`, color: C.blue },
  };
  const v = variants[variant] || variants.default;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      width: full ? "100%" : undefined,
      padding: small ? "6px 12px" : "10px 16px",
      background: v.bg, border: `1px solid ${v.border}`,
      borderRadius: 10, color: v.color,
      fontSize: small ? 11 : 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1, letterSpacing: "0.02em",
      fontFamily: "inherit",
    }}>{icon && <span>{icon}</span>}{label}</button>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", rows, prefix }) {
  const baseStyle = {
    width: "100%", boxSizing: "border-box",
    background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
    borderRadius: 10, padding: "10px 12px", color: C.t1,
    fontSize: 14, outline: "none", fontFamily: "inherit", resize: "vertical",
  };
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <Label>{label}</Label>}
      {rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder} rows={rows} style={baseStyle} />
      ) : (
        <div style={{ position: "relative" }}>
          {prefix && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: C.t3, fontSize: 13 }}>{prefix}</span>}
          <input type={type} value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{ ...baseStyle, paddingLeft: prefix ? 28 : 12 }} />
        </div>
      )}
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <Label>{label}</Label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", boxSizing: "border-box",
        background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "10px 12px", color: C.t1,
        fontSize: 14, outline: "none", fontFamily: "inherit",
      }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: "#1a2030" }}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SLABar({ op }) {
  const sla = slaStatus(op);
  if (!sla) return null;
  const u = URGENCIA[op.urgencia];
  const barColor = sla.vencido ? C.red : sla.pctUsado > 80 ? C.amber : u?.color || C.lime;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: sla.vencido ? C.red : C.t3, fontWeight: sla.vencido ? 700 : 400 }}>
          {sla.vencido ? "⚠ SLA VENCIDO" : "SLA"}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: barColor, fontVariantNumeric: "tabular-nums" }}>
          {fmtSLA(sla.restHrs)}
        </span>
      </div>
      <div style={{ height: 3, background: C.bg2, borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${Math.min(100, sla.pctUsado)}%`,
          background: barColor, borderRadius: 2,
          transition: "width 1s linear",
        }} />
      </div>
    </div>
  );
}

function Toast({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: "10px 18px", borderRadius: 10,
          background: t.type === "error" ? "rgba(255,59,48,0.9)" : t.type === "success" ? "rgba(48,209,88,0.9)" : "rgba(30,40,55,0.95)",
          color: "#fff", fontSize: 13, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          backdropFilter: "blur(20px)", border: `1px solid rgba(255,255,255,0.1)`,
          whiteSpace: "nowrap",
        }}>{t.msg}</div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, toast };
}

// ─────────────────────────────────────────────────────────────────────────────
// ESTADÍSTICA KPI
// ─────────────────────────────────────────────────────────────────────────────

function useKPIs(operaciones) {
  return useMemo(() => {
    const activas = operaciones.filter(o => !o._deleted && ACTIVOS.has(o.estado));
    const resueltas = operaciones.filter(o => !o._deleted && RESUELTOS.has(o.estado));
    const criticas = activas.filter(o => o.urgencia === "critica");
    const sla_vencidas = activas.filter(o => {
      const s = slaStatus(o);
      return s && s.vencido;
    });
    const pendiente_cobro = resueltas
      .filter(o => !o.pago?.cobrado && o.estado !== "cerrado")
      .reduce((s, o) => s + safeN(snapOp(o.lineas).precio_con_iva), 0);
    const cobrado_mes = operaciones
      .filter(o => o.pago?.cobrado && o.pago?.fecha_cobro && new Date(o.pago.fecha_cobro) > new Date(Date.now() - 30 * 86400000))
      .reduce((s, o) => s + safeN(snapOp(o.lineas).u_neta), 0);
    return { activas: activas.length, criticas: criticas.length, sla_vencidas: sla_vencidas.length, pendiente_cobro, cobrado_mes, resueltas: resueltas.length };
  }, [operaciones]);
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTRO — Command Center
// ─────────────────────────────────────────────────────────────────────────────

function Centro({ state, dispatch, toast, onVer, onNueva }) {
  const { operaciones, clientes, unidades } = state;
  const kpi = useKPIs(operaciones);

  const activas = useMemo(() =>
    operaciones
      .filter(o => !o._deleted && ACTIVOS.has(o.estado))
      .sort((a, b) => {
        const ua = URGENCIA[a.urgencia]?.orden ?? 99;
        const ub = URGENCIA[b.urgencia]?.orden ?? 99;
        if (ua !== ub) return ua - ub;
        return new Date(a.createdAt) - new Date(b.createdAt);
      }), [operaciones]);

  const porCobrar = useMemo(() =>
    operaciones.filter(o => !o._deleted && o.estado === "resuelto" && !o.pago?.cobrado),
    [operaciones]);

  const cliente = id => clientes.find(c => c.id === id);
  const unidad  = id => unidades.find(u => u.id === id);

  return (
    <div style={{ minHeight: "100vh", background: C.bg0, paddingBottom: 80 }}>

      {/* Header */}
      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: C.t3, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>Logisolve v2</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.t1 }}>Centro Ops</div>
          </div>
          <button onClick={onNueva} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 18px", background: `${C.lime}18`, border: `1px solid ${C.lime}55`,
            borderRadius: 12, color: C.lime, fontSize: 14, fontWeight: 800, cursor: "pointer",
            fontFamily: "inherit",
          }}>+ Nueva</button>
        </div>

        {/* Alert bar */}
        {(kpi.criticas > 0 || kpi.sla_vencidas > 0) && (
          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 10,
            background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 14 }}>⚠</span>
            <div style={{ fontSize: 12, color: C.red, fontWeight: 600, lineHeight: 1.4 }}>
              {kpi.criticas > 0 && <span>{kpi.criticas} operación{kpi.criticas > 1 ? "es" : ""} crítica{kpi.criticas > 1 ? "s" : ""}</span>}
              {kpi.criticas > 0 && kpi.sla_vencidas > 0 && " · "}
              {kpi.sla_vencidas > 0 && <span>{kpi.sla_vencidas} SLA vencido{kpi.sla_vencidas > 1 ? "s" : ""}</span>}
            </div>
          </div>
        )}

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16, marginBottom: 4 }}>
          {[
            { l: "Activas", v: kpi.activas, c: C.t1 },
            { l: "Por cobrar", v: mxn(kpi.pendiente_cobro), c: kpi.pendiente_cobro > 0 ? C.amber : C.t3 },
            { l: "Util. mes", v: mxn(kpi.cobrado_mes), c: C.lime },
          ].map(({ l, v, c }) => (
            <div key={l} style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 8, color: C.t3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* Operaciones activas */}
        {activas.length > 0 ? (
          <>
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>
              En proceso · {activas.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activas.map(op => {
                const u = URGENCIA[op.urgencia];
                const cli = cliente(op.clienteId);
                const uni = unidad(op.unidadId);
                const snap = snapOp(op.lineas);
                return (
                  <div key={op.id} onClick={() => onVer(op.id)}
                    style={{
                      background: C.bg1, border: `1px solid ${C.border}`,
                      borderLeft: `3px solid ${u?.color || C.t3}`,
                      borderRadius: C.r, padding: "14px 16px", cursor: "pointer",
                      boxShadow: C.shadow,
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Pill label={u?.label || op.urgencia} color={u?.color} dim={u?.dim} small />
                        <Pill label={ESTADO_META[op.estado]?.label || op.estado} color={ESTADO_META[op.estado]?.dot} small />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.t2, fontVariantNumeric: "tabular-nums" }}>
                        {snap.precio_con_iva > 0 ? mxn(snap.precio_con_iva) : "—"}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, lineHeight: 1.3, marginBottom: 4 }}>
                      {op.titulo}
                    </div>
                    {(cli || uni) && (
                      <div style={{ fontSize: 10, color: C.t3, marginBottom: 6 }}>
                        {cli && <span style={{ color: C.t2 }}>{cli.empresa}</span>}
                        {cli && uni && " · "}
                        {uni && <span>Eco. {uni.economico || uni.id.slice(-3)}</span>}
                      </div>
                    )}
                    <SLABar op={op} />
                    {op.ai_sugerencia && (
                      <div style={{
                        marginTop: 8, padding: "6px 10px", borderRadius: 8,
                        background: "rgba(10,132,255,0.07)", border: `1px solid ${C.blue}22`,
                        fontSize: 10, color: C.blue, lineHeight: 1.4,
                      }}>
                        🤖 {op.ai_sugerencia}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.t2, marginBottom: 4 }}>Sin operaciones activas</div>
            <div style={{ fontSize: 12, color: C.t3 }}>Todo al día</div>
          </div>
        )}

        {/* Por cobrar */}
        {porCobrar.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>
              Pendiente cobro · {porCobrar.length}
            </div>
            {porCobrar.map(op => {
              const cli = cliente(op.clienteId);
              const snap = snapOp(op.lineas);
              return (
                <div key={op.id} onClick={() => onVer(op.id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px", background: C.bg1, border: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${C.amber}`,
                    borderRadius: 10, marginBottom: 8, cursor: "pointer",
                  }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{op.titulo}</div>
                    {cli && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{cli.empresa}</div>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.amber, fontVariantNumeric: "tabular-nums" }}>
                      {mxn(snap.precio_con_iva)}
                    </div>
                    {op.pago?.promesa && (
                      <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>
                        Promesa: {op.pago.promesa}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NUEVA OPERACIÓN — AI intake
// ─────────────────────────────────────────────────────────────────────────────

function NuevaOperacion({ state, dispatch, toast, onBack, onCreated }) {
  const { clientes, unidades } = state;
  const [fase, setFase] = useState("intake"); // intake | confirmacion | creando
  const [texto, setTexto] = useState("");
  const [analizando, setAnalizando] = useState(false);
  const [propuesta, setPropuesta] = useState(null);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    titulo: "", urgencia: "normal", tipo: "emergencia",
    clienteId: "", unidadId: "", notas: "",
    pago_tipo: "contado", sla_inicio: nowISO(),
  });

  const sf = k => v => setForm(p => ({ ...p, [k]: v }));

  async function analizar() {
    if (!texto.trim()) return;
    setAnalizando(true); setError(null);
    try {
      const res = await fetch("/api/ai/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto,
          unidades: unidades.map(u => ({ id: u.id, economico: u.economico, marca: u.marca, modelo: u.modelo, placa: u.placa })),
          clientes: clientes.map(c => ({ id: c.id, empresa: c.empresa })),
        }),
      });
      if (!res.ok) throw new Error("Error en análisis");
      const data = await res.json();
      setPropuesta(data);
      setForm(p => ({
        ...p,
        titulo: data.titulo || p.titulo,
        urgencia: data.urgencia || p.urgencia,
        tipo: data.tipo || p.tipo,
        clienteId: data.clienteId || p.clienteId,
        unidadId: data.unidadId || p.unidadId,
      }));
      setFase("confirmacion");
    } catch (e) {
      setError("No se pudo analizar. Puedes continuar manualmente.");
      setFase("confirmacion");
    } finally {
      setAnalizando(false);
    }
  }

  function crear() {
    setFase("creando");
    const lineas_sugeridas = (propuesta?.lineas_sugeridas || []).map(l => ({
      id: genId("L"),
      descripcion: l.descripcion,
      tipo: l.tipo || "refaccion",
      oem: l.oem_probable || null,
      cantidad: l.cantidad || 1,
      costo_unitario: l.precio_estimado ? Math.round(l.precio_estimado * 0.7) : 0,
      precio_unitario: l.precio_estimado || 0,
      costo_con_iva: true,
      estado: "buscando",
    }));

    const op = {
      ...form,
      diagnostico: propuesta?.diagnostico || { falla_reportada: texto, sistema_afectado: "otro", causa_probable: "", confianza: 0 },
      lineas: lineas_sugeridas,
      ai_sugerencia: propuesta?.notas_ia || null,
      pago: { tipo: form.pago_tipo, promesa: null, cobrado: false },
      eventos: [],
      _deleted: false,
    };
    dispatch({ type: "OP_CREATE", op });
    toast("Operación creada", "success");
    onCreated();
  }

  if (fase === "intake") return (
    <div style={{ minHeight: "100vh", background: C.bg0, padding: "24px 16px 80px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.t3, fontSize: 14, cursor: "pointer", padding: "0 0 20px", fontFamily: "inherit" }}>← Volver</button>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, marginBottom: 6 }}>Nueva Operación</div>
      <div style={{ fontSize: 13, color: C.t3, marginBottom: 24 }}>Describe la necesidad operativa. La IA extrae el resto.</div>

      <textarea
        value={texto}
        onChange={e => setTexto(e.target.value)}
        placeholder={"Ej: Unidad 45 Freightliner varada en carretera, no arranca. Posible falla en motor. Cliente Logis Express necesita solución urgente."}
        rows={6}
        autoFocus
        style={{
          width: "100%", boxSizing: "border-box",
          background: "rgba(255,255,255,0.05)", border: `1px solid ${C.lime}44`,
          borderRadius: 14, padding: "14px 16px", color: C.t1,
          fontSize: 15, outline: "none", fontFamily: "inherit", resize: "none",
          lineHeight: 1.5, marginBottom: 16,
        }}
      />

      <Btn
        label={analizando ? "Analizando..." : "Analizar con IA →"}
        onClick={analizar}
        variant="primary"
        full
        disabled={analizando || !texto.trim()}
        icon={analizando ? "⟳" : "🤖"}
      />
      <div style={{ marginTop: 10, textAlign: "center" }}>
        <button onClick={() => setFase("confirmacion")} style={{ background: "none", border: "none", color: C.t3, fontSize: 12, cursor: "pointer" }}>
          Continuar manualmente sin IA
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg0, padding: "24px 16px 80px" }}>
      <button onClick={() => setFase("intake")} style={{ background: "none", border: "none", color: C.t3, fontSize: 14, cursor: "pointer", padding: "0 0 20px", fontFamily: "inherit" }}>← Atrás</button>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.t1, marginBottom: 4 }}>Confirmar operación</div>
      <div style={{ fontSize: 12, color: C.t3, marginBottom: 20 }}>Revisa y ajusta lo que detectó la IA</div>

      {propuesta && (
        <div style={{ marginBottom: 20, padding: "12px 14px", background: "rgba(10,132,255,0.07)", border: `1px solid ${C.blue}22`, borderRadius: 12 }}>
          <div style={{ fontSize: 10, color: C.blue, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, fontWeight: 700 }}>🤖 IA detectó</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { l: "Urgencia", v: URGENCIA[propuesta.urgencia]?.label || propuesta.urgencia },
              { l: "Tipo", v: TIPO_OP[propuesta.tipo]?.label || propuesta.tipo },
              { l: "Sistema", v: SISTEMAS[propuesta.diagnostico?.sistema_afectado] || propuesta.diagnostico?.sistema_afectado },
              { l: "Confianza", v: propuesta.diagnostico?.confianza ? pct(propuesta.diagnostico.confianza * 100) : "—" },
            ].map(({ l, v }) => (
              <div key={l}>
                <div style={{ fontSize: 8, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 12, color: C.t1, fontWeight: 600 }}>{v || "—"}</div>
              </div>
            ))}
          </div>
          {propuesta.diagnostico?.causa_probable && (
            <div style={{ marginTop: 10, fontSize: 11, color: C.t2, lineHeight: 1.4, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
              {propuesta.diagnostico.causa_probable}
            </div>
          )}
          {propuesta.notas_ia && (
            <div style={{ marginTop: 6, fontSize: 11, color: C.blue, lineHeight: 1.4 }}>
              {propuesta.notas_ia}
            </div>
          )}
        </div>
      )}

      {error && <div style={{ marginBottom: 16, fontSize: 12, color: C.amber }}>{error}</div>}

      <Input label="Título" value={form.titulo} onChange={sf("titulo")} placeholder="Título de la operación" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Sel label="Urgencia" value={form.urgencia} onChange={sf("urgencia")}
          options={Object.entries(URGENCIA).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Sel label="Tipo" value={form.tipo} onChange={sf("tipo")}
          options={Object.entries(TIPO_OP).map(([k, v]) => ({ value: k, label: v.label }))} />
      </div>

      <Sel label="Cliente" value={form.clienteId} onChange={sf("clienteId")}
        options={[{ value: "", label: "— Sin cliente —" }, ...clientes.map(c => ({ value: c.id, label: c.empresa }))]} />

      <Sel label="Unidad" value={form.unidadId} onChange={sf("unidadId")}
        options={[{ value: "", label: "— Sin unidad —" }, ...unidades.map(u => ({ value: u.id, label: `Eco. ${u.economico} · ${u.marca} ${u.modelo}` }))]} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Sel label="Forma de pago" value={form.pago_tipo} onChange={sf("pago_tipo")}
          options={[{ value: "contado", label: "Contado" }, { value: "credito", label: "Crédito" }]} />
      </div>

      <Input label="Notas" value={form.notas} onChange={sf("notas")} placeholder="Notas adicionales..." rows={2} />

      {propuesta?.lineas_sugeridas?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Label>Piezas sugeridas por IA (se agregarán a la operación)</Label>
          {propuesta.lineas_sugeridas.map((l, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", padding: "8px 12px",
              background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 5,
            }}>
              <span style={{ fontSize: 12, color: C.t1 }}>{l.descripcion}</span>
              {l.precio_estimado > 0 && <span style={{ fontSize: 11, color: C.t3, fontVariantNumeric: "tabular-nums" }}>~{mxn(l.precio_estimado)}</span>}
            </div>
          ))}
        </div>
      )}

      <Btn label={fase === "creando" ? "Creando..." : "Crear operación"} onClick={crear} variant="primary" full disabled={fase === "creando" || !form.titulo.trim()} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERACIÓN DETAIL
// ─────────────────────────────────────────────────────────────────────────────

function PipelineSteps({ estado }) {
  const idx = ESTADOS.indexOf(estado);
  if (estado === "cancelado") return (
    <div style={{ padding: "8px 0", fontSize: 11, color: C.red, fontWeight: 700 }}>● Cancelada</div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: 4, scrollbarWidth: "none" }}>
      {ESTADOS.map((e, i) => {
        const meta = ESTADO_META[e];
        const done = i < idx;
        const current = i === idx;
        return (
          <React.Fragment key={e}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: done || current ? meta.dot : C.t3,
                boxShadow: current ? `0 0 8px ${meta.dot}88` : "none",
                border: current ? `2px solid ${meta.dot}` : "none",
              }} />
              <div style={{ fontSize: 7, color: current ? meta.dot : C.t3, marginTop: 3, whiteSpace: "nowrap", fontWeight: current ? 700 : 400 }}>
                {meta.label}
              </div>
            </div>
            {i < ESTADOS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: i < idx ? C.t3 : C.border, margin: "0 3px", marginBottom: 14, minWidth: 12 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function LineaRow({ l, opId, dispatch, editable }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...l });
  const sf = k => v => setForm(p => ({ ...p, [k]: v }));
  const tipoMeta = TIPO_LINEA[l.tipo] || TIPO_LINEA.refaccion;

  if (editing) return (
    <div style={{ padding: "12px", background: "rgba(255,255,255,0.04)", border: `1px solid ${C.blue}33`, borderRadius: 10, marginBottom: 8 }}>
      <Input label="Descripción" value={form.descripcion} onChange={sf("descripcion")} placeholder="Nombre de la pieza o servicio" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Input label="Costo s/IVA" value={String(form.costo_unitario)} onChange={v => sf("costo_unitario")(safeN(v))} type="number" prefix="$" />
        <Input label="Precio s/IVA" value={String(form.precio_unitario)} onChange={v => sf("precio_unitario")(safeN(v))} type="number" prefix="$" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Input label="Cantidad" value={String(form.cantidad)} onChange={v => sf("cantidad")(safeN(v, 1))} type="number" />
        <Sel label="Tipo" value={form.tipo} onChange={sf("tipo")} options={Object.entries(TIPO_LINEA).map(([k, v]) => ({ value: k, label: v.label }))} />
        <Sel label="Estado" value={form.estado} onChange={sf("estado")} options={["buscando","cotizado","confirmado","entregado"].map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
      </div>
      <Input label="OEM / Referencia" value={form.oem || ""} onChange={sf("oem")} placeholder="Número OEM" />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn label="Guardar" onClick={() => { dispatch({ type: "OP_UPDATE_LINEA", opId, lineaId: l.id, patch: form }); setEditing(false); }} variant="primary" small />
        <Btn label="Cancelar" onClick={() => setEditing(false)} variant="ghost" small />
        <Btn label="Eliminar" onClick={() => { dispatch({ type: "OP_DELETE_LINEA", opId, lineaId: l.id }); }} variant="danger" small />
      </div>
    </div>
  );

  const margen = l.precio_unitario > 0 && l.costo_unitario > 0
    ? ((l.precio_unitario - l.costo_unitario) / l.precio_unitario * 100).toFixed(0)
    : null;

  return (
    <div onClick={editable ? () => setEditing(true) : undefined}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 12px", background: C.bg1, border: `1px solid ${C.border}`,
        borderRadius: 10, marginBottom: 6, cursor: editable ? "pointer" : "default",
      }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11 }}>{tipoMeta.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{l.descripcion}</span>
          {l.oem && <span style={{ fontSize: 9, color: C.t3 }}>{l.oem}</span>}
        </div>
        <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>
          {l.cantidad > 1 && <span>{l.cantidad} × </span>}
          Costo {mxn(l.costo_unitario)}
          {margen && <span style={{ color: C.lime, marginLeft: 6 }}>{margen}% margen</span>}
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, fontVariantNumeric: "tabular-nums" }}>
          {mxn(l.precio_unitario * safeN(l.cantidad, 1))}
        </div>
        <div style={{
          fontSize: 8, padding: "2px 6px", borderRadius: 6,
          background: l.estado === "entregado" ? `${C.green}18` : l.estado === "confirmado" ? `${C.lime}18` : C.bg2,
          color: l.estado === "entregado" ? C.green : l.estado === "confirmado" ? C.lime : C.t3,
          marginTop: 2,
        }}>
          {l.estado}
        </div>
      </div>
    </div>
  );
}

function OperacionDetail({ opId, state, dispatch, toast, onBack }) {
  const { operaciones, clientes, unidades, proveedores } = state;
  const op = operaciones.find(o => o.id === opId);
  const [addLinea, setAddLinea] = useState(false);
  const [nuevaLinea, setNuevaLinea] = useState({ descripcion: "", tipo: "refaccion", oem: "", cantidad: 1, costo_unitario: 0, precio_unitario: 0, costo_con_iva: true, estado: "buscando" });
  const nlSf = k => v => setNuevaLinea(p => ({ ...p, [k]: v }));

  if (!op) return (
    <div style={{ padding: 40, textAlign: "center", color: C.t3 }}>
      <p>Operación no encontrada</p>
      <Btn label="← Volver" onClick={onBack} variant="ghost" />
    </div>
  );

  const cli = clientes.find(c => c.id === op.clienteId);
  const uni = unidades.find(u => u.id === op.unidadId);
  const prv = proveedores.find(p => p.id === op.proveedorId);
  const snap = snapOp(op.lineas);
  const u = URGENCIA[op.urgencia] || URGENCIA.normal;
  const estadoMeta = ESTADO_META[op.estado] || {};
  const puedeAvanzar = ACTIVOS.has(op.estado) && op.estado !== "cancelado";
  const puedeCobrar = op.estado === "resuelto" && !op.pago?.cobrado;
  const editable = !TERMINAL.has(op.estado);
  const idx = ESTADOS.indexOf(op.estado);
  const siguiente = ESTADOS[idx + 1];

  function guardarCampo(campo, valor) {
    dispatch({ type: "OP_UPDATE", id: op.id, patch: { [campo]: valor } });
  }

  function agregarLinea() {
    if (!nuevaLinea.descripcion.trim()) return;
    dispatch({ type: "OP_ADD_LINEA", id: op.id, linea: nuevaLinea });
    setNuevaLinea({ descripcion: "", tipo: "refaccion", oem: "", cantidad: 1, costo_unitario: 0, precio_unitario: 0, costo_con_iva: true, estado: "buscando" });
    setAddLinea(false);
    toast("Línea agregada", "success");
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg0, paddingBottom: 100 }}>

      {/* Header */}
      <div style={{ padding: "20px 16px 0", background: `linear-gradient(180deg, ${u.dim} 0%, transparent 100%)` }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: C.t3, fontSize: 14, cursor: "pointer", padding: "0 0 12px", fontFamily: "inherit" }}>← Centro</button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <Pill label={u.label} color={u.color} dim={u.dim} />
              <Pill label={TIPO_OP[op.tipo]?.label || op.tipo} color={C.t3} dim={C.bg2} />
            </div>
            <div style={{ fontSize: 8, color: C.t3, letterSpacing: "0.1em", marginBottom: 4 }}>
              {opCodigo(op.id, op.createdAt)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.t1, fontVariantNumeric: "tabular-nums" }}>
              {snap.precio_con_iva > 0 ? mxn(snap.precio_con_iva) : "—"}
            </div>
            {snap.precio_con_iva > 0 && (
              <div style={{ fontSize: 10, color: snap.u_neta > 0 ? C.lime : C.red }}>
                util {mxn(snap.u_neta)} · {pct(snap.margen)}
              </div>
            )}
          </div>
        </div>

        <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, lineHeight: 1.3, marginBottom: 10 }}>
          {op.titulo}
        </div>

        {(cli || uni) && (
          <div style={{ fontSize: 11, color: C.t2, marginBottom: 12 }}>
            {cli && <span>{cli.empresa}</span>}
            {cli && uni && " · "}
            {uni && <span>Eco. {uni.economico} — {uni.marca} {uni.modelo} {uni.anio}</span>}
          </div>
        )}

        <SLABar op={op} />
      </div>

      <div style={{ padding: "16px" }}>

        {/* Pipeline steps */}
        <Card style={{ marginBottom: 12, padding: "12px 14px" }}>
          <Label>Estado de la operación</Label>
          <PipelineSteps estado={op.estado} />
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {puedeAvanzar && siguiente && (
              <Btn
                label={`→ ${ESTADO_META[siguiente]?.label}`}
                onClick={() => { dispatch({ type: "OP_AVANZAR", id: op.id }); toast(`→ ${ESTADO_META[siguiente]?.label}`, "success"); }}
                variant="primary"
              />
            )}
            {puedeCobrar && (
              <Btn
                label="✓ Cobrado"
                onClick={() => { dispatch({ type: "OP_COBRAR", id: op.id }); toast("Cobrado ✓", "success"); }}
                variant="primary"
              />
            )}
            {editable && (
              <Btn
                label="Cancelar operación"
                onClick={() => { if (confirm("¿Cancelar esta operación?")) { dispatch({ type: "OP_CANCELAR", id: op.id }); onBack(); } }}
                variant="danger"
                small
              />
            )}
          </div>
        </Card>

        {/* AI sugerencia */}
        {op.ai_sugerencia && (
          <div style={{
            marginBottom: 12, padding: "10px 14px", borderRadius: 12,
            background: "rgba(10,132,255,0.07)", border: `1px solid ${C.blue}22`,
          }}>
            <div style={{ fontSize: 9, color: C.blue, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>🤖 Asistente IA</div>
            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{op.ai_sugerencia}</div>
          </div>
        )}

        {/* Diagnóstico técnico */}
        {op.diagnostico && (
          <Card style={{ marginBottom: 12 }}>
            <Label>Diagnóstico técnico</Label>
            {op.diagnostico.falla_reportada && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: C.t3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Falla reportada</div>
                <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.4 }}>{op.diagnostico.falla_reportada}</div>
              </div>
            )}
            {op.diagnostico.causa_probable && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: C.t3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>Diagnóstico</div>
                <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.4 }}>{op.diagnostico.causa_probable}</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              {op.diagnostico.sistema_afectado && (
                <Pill label={SISTEMAS[op.diagnostico.sistema_afectado] || op.diagnostico.sistema_afectado} color={C.t2} dim={C.bg2} small />
              )}
              {op.diagnostico.confianza > 0 && (
                <Pill label={`${pct(op.diagnostico.confianza * 100)} confianza`} color={op.diagnostico.confianza > 0.8 ? C.lime : C.amber} small />
              )}
            </div>
          </Card>
        )}

        {/* Líneas */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Label>Líneas ({op.lineas?.length || 0})</Label>
            {editable && (
              <button onClick={() => setAddLinea(p => !p)} style={{
                background: "none", border: "none", color: C.blue,
                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>+ Agregar</button>
            )}
          </div>

          {addLinea && (
            <div style={{ padding: 12, background: C.bg2, border: `1px solid ${C.blue}33`, borderRadius: 12, marginBottom: 10 }}>
              <Input label="Descripción" value={nuevaLinea.descripcion} onChange={nlSf("descripcion")} placeholder="Nombre de la pieza o servicio" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Input label="Costo s/IVA" value={String(nuevaLinea.costo_unitario)} onChange={v => nlSf("costo_unitario")(safeN(v))} type="number" prefix="$" />
                <Input label="Precio s/IVA" value={String(nuevaLinea.precio_unitario)} onChange={v => nlSf("precio_unitario")(safeN(v))} type="number" prefix="$" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <Input label="Cantidad" value={String(nuevaLinea.cantidad)} onChange={v => nlSf("cantidad")(safeN(v, 1))} type="number" />
                <Sel label="Tipo" value={nuevaLinea.tipo} onChange={nlSf("tipo")} options={Object.entries(TIPO_LINEA).map(([k, v]) => ({ value: k, label: v.label }))} />
              </div>
              <Input label="OEM / Referencia" value={nuevaLinea.oem} onChange={nlSf("oem")} placeholder="Número OEM o referencia" />
              <div style={{ display: "flex", gap: 8 }}>
                <Btn label="Agregar línea" onClick={agregarLinea} variant="primary" small />
                <Btn label="Cancelar" onClick={() => setAddLinea(false)} variant="ghost" small />
              </div>
            </div>
          )}

          {(op.lineas || []).map(l => (
            <LineaRow key={l.id} l={l} opId={op.id} dispatch={dispatch} editable={editable} />
          ))}

          {(op.lineas?.length || 0) === 0 && !addLinea && (
            <div style={{ padding: "20px", textAlign: "center", color: C.t3, fontSize: 12 }}>Sin líneas. Agrega piezas o servicios.</div>
          )}
        </div>

        {/* Financial summary */}
        {snap.precio_con_iva > 0 && (
          <Card style={{ marginBottom: 12 }}>
            <Label>Resumen financiero</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { l: "Precio c/IVA", v: mxn(snap.precio_con_iva), c: C.t1 },
                { l: "Util. neta", v: mxn(snap.u_neta), c: snap.u_neta > 0 ? C.lime : C.red },
                { l: "Margen", v: pct(snap.margen), c: snap.margen > 20 ? C.lime : C.amber },
                { l: "Costo total", v: mxn(snap.costo), c: C.t3 },
                { l: "IVA", v: mxn(snap.precio_con_iva - snap.precio_sin_iva), c: C.t3 },
                { l: "Forma pago", v: op.pago?.tipo === "credito" ? "Crédito" : "Contado", c: C.t2 },
              ].map(({ l, v, c }) => (
                <div key={l}>
                  <div style={{ fontSize: 8, color: C.t3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Proveedor */}
        {(editable || prv) && (
          <Card style={{ marginBottom: 12 }}>
            <Label>Proveedor asignado</Label>
            {editable ? (
              <Sel value={op.proveedorId || ""} onChange={v => dispatch({ type: "OP_UPDATE", id: op.id, patch: { proveedorId: v || null } })}
                options={[{ value: "", label: "— Sin asignar —" }, ...proveedores.map(p => ({ value: p.id, label: `${p.nombre} · ${p.entrega_hrs}h · ${p.score}pts` }))]} />
            ) : prv ? (
              <div style={{ fontSize: 13, color: C.t2 }}>
                {prv.nombre} · {prv.especialidad}
                <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Entrega en {prv.entrega_hrs}h · Score: {prv.score}</div>
              </div>
            ) : null}
          </Card>
        )}

        {/* Timeline */}
        {(op.eventos || []).length > 0 && (
          <Card>
            <Label>Historial</Label>
            {[...(op.eventos || [])].reverse().slice(0, 5).map((ev, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.t3, marginTop: 4, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 11, color: C.t2 }}>{ev.detalle}</div>
                  <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>{new Date(ev.ts).toLocaleString("es-MX")}</div>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OPERACIONES — List view
// ─────────────────────────────────────────────────────────────────────────────

function Operaciones({ state, dispatch, toast, onVer }) {
  const { operaciones, clientes, unidades } = state;
  const [filtro, setFiltro] = useState("activas");
  const [busq, setBusq] = useState("");

  const lista = useMemo(() => {
    let arr = operaciones.filter(o => !o._deleted);
    if (filtro === "activas")  arr = arr.filter(o => ACTIVOS.has(o.estado));
    else if (filtro === "cobrar") arr = arr.filter(o => o.estado === "resuelto" && !o.pago?.cobrado);
    else if (filtro === "cerradas") arr = arr.filter(o => TERMINAL.has(o.estado));
    if (busq.trim()) {
      const q = busq.toLowerCase();
      arr = arr.filter(o =>
        o.titulo?.toLowerCase().includes(q) ||
        clientes.find(c => c.id === o.clienteId)?.empresa?.toLowerCase().includes(q)
      );
    }
    return arr.sort((a, b) => {
      const ua = URGENCIA[a.urgencia]?.orden ?? 99;
      const ub = URGENCIA[b.urgencia]?.orden ?? 99;
      return ua !== ub ? ua - ub : new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [operaciones, filtro, busq, clientes]);

  const chips = [
    { k: "activas", l: "Activas" },
    { k: "cobrar", l: "Por cobrar" },
    { k: "cerradas", l: "Cerradas" },
    { k: "todas", l: "Todas" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg0, paddingBottom: 80 }}>
      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, marginBottom: 16 }}>Operaciones</div>

        <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" }}>
          {chips.map(({ k, l }) => (
            <button key={k} onClick={() => setFiltro(k)} style={{
              flexShrink: 0, padding: "7px 14px", borderRadius: 20,
              background: filtro === k ? `${C.lime}18` : "transparent",
              border: `1px solid ${filtro === k ? C.lime + "55" : C.border}`,
              color: filtro === k ? C.lime : C.t3,
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>{l}</button>
          ))}
        </div>

        <input value={busq} onChange={e => setBusq(e.target.value)}
          placeholder="Buscar por título o cliente..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: C.bg1, border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "10px 14px", color: C.t1,
            fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 14,
          }} />
      </div>

      <div style={{ padding: "0 16px" }}>
        {lista.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.t3, fontSize: 13 }}>
            Sin operaciones en este filtro
          </div>
        )}
        {lista.map(op => {
          const u = URGENCIA[op.urgencia];
          const cli = clientes.find(c => c.id === op.clienteId);
          const snap = snapOp(op.lineas);
          const estadoM = ESTADO_META[op.estado];
          return (
            <div key={op.id} onClick={() => onVer(op.id)}
              style={{
                background: C.bg1, border: `1px solid ${C.border}`,
                borderLeft: `3px solid ${u?.color || C.t3}`,
                borderRadius: C.r, padding: "13px 16px",
                boxShadow: C.shadow, marginBottom: 10, cursor: "pointer",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  <Pill label={u?.label} color={u?.color} dim={u?.dim} small />
                  <Pill label={estadoM?.label} color={estadoM?.dot} small />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.t2, fontVariantNumeric: "tabular-nums" }}>
                  {snap.precio_con_iva > 0 ? mxn(snap.precio_con_iva) : "—"}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginBottom: 3 }}>{op.titulo}</div>
              {cli && <div style={{ fontSize: 10, color: C.t3 }}>{cli.empresa}</div>}
              <SLABar op={op} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CIERRE — Financial overview
// ─────────────────────────────────────────────────────────────────────────────

function Cierre({ state, dispatch, toast, onVer }) {
  const { operaciones, clientes } = state;

  const porCobrar = useMemo(() =>
    operaciones.filter(o => !o._deleted && o.estado === "resuelto" && !o.pago?.cobrado)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
    [operaciones]);

  const cobradas30 = useMemo(() =>
    operaciones.filter(o => !o._deleted && o.pago?.cobrado &&
      o.pago?.fecha_cobro && new Date(o.pago.fecha_cobro) > new Date(Date.now() - 30 * 86400000))
      .sort((a, b) => new Date(b.pago.fecha_cobro) - new Date(a.pago.fecha_cobro)),
    [operaciones]);

  const totalPorCobrar = porCobrar.reduce((s, o) => s + safeN(snapOp(o.lineas).precio_con_iva), 0);
  const totalCobrado30 = cobradas30.reduce((s, o) => s + safeN(snapOp(o.lineas).u_neta), 0);
  const countCritico   = porCobrar.filter(o => {
    if (!o.pago?.promesa) return false;
    return new Date(o.pago.promesa) < new Date();
  }).length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg0, paddingBottom: 80 }}>
      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, marginBottom: 16 }}>Cierre</div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { l: "Por cobrar", v: mxn(totalPorCobrar), c: C.amber, sub: `${porCobrar.length} op.${countCritico > 0 ? ` · ${countCritico} vencidas` : ""}` },
            { l: "Util. 30 días", v: mxn(totalCobrado30), c: C.lime, sub: `${cobradas30.length} cobradas` },
          ].map(({ l, v, c, sub }) => (
            <div key={l} style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ fontSize: 9, color: C.t3, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>{v}</div>
              <div style={{ fontSize: 10, color: C.t3 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Por cobrar */}
        {porCobrar.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>
              Pendiente cobro
            </div>
            {porCobrar.map(op => {
              const cli = clientes.find(c => c.id === op.clienteId);
              const snap = snapOp(op.lineas);
              const vencida = op.pago?.promesa && new Date(op.pago.promesa) < new Date();
              return (
                <div key={op.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 16px", background: C.bg1,
                  border: `1px solid ${vencida ? C.red + "44" : C.border}`,
                  borderLeft: `3px solid ${vencida ? C.red : C.amber}`,
                  borderRadius: 12, marginBottom: 8, cursor: "pointer",
                }} onClick={() => onVer(op.id)}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, marginBottom: 2 }}>{op.titulo}</div>
                    <div style={{ fontSize: 10, color: C.t3 }}>
                      {cli?.empresa}
                      {op.pago?.promesa && <span style={{ color: vencida ? C.red : C.t3, marginLeft: 8 }}>Promesa: {op.pago.promesa}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: vencida ? C.red : C.amber, fontVariantNumeric: "tabular-nums" }}>
                        {mxn(snap.precio_con_iva)}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); dispatch({ type: "OP_COBRAR", id: op.id }); toast("Cobrado ✓", "success"); }}
                      style={{
                        padding: "7px 12px", background: `${C.lime}15`, border: `1px solid ${C.lime}44`,
                        borderRadius: 8, color: C.lime, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      }}>✓</button>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Cobradas recientes */}
        {cobradas30.length > 0 && (
          <>
            <div style={{ fontSize: 10, color: C.t3, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10, fontWeight: 700, marginTop: 20 }}>
              Cobradas — últimos 30 días
            </div>
            {cobradas30.slice(0, 10).map(op => {
              const cli = clientes.find(c => c.id === op.clienteId);
              const snap = snapOp(op.lineas);
              return (
                <div key={op.id} onClick={() => onVer(op.id)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 16px", background: C.bg1, border: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${C.green}`,
                    borderRadius: 10, marginBottom: 6, cursor: "pointer",
                  }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>{op.titulo}</div>
                    <div style={{ fontSize: 9, color: C.t3 }}>{cli?.empresa}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.lime, fontVariantNumeric: "tabular-nums" }}>{mxn(snap.u_neta)}</div>
                    <div style={{ fontSize: 9, color: C.t3 }}>util.</div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {porCobrar.length === 0 && cobradas30.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.t3, fontSize: 13 }}>
            Sin movimientos en el período
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOTA — Knowledge base
// ─────────────────────────────────────────────────────────────────────────────

function Flota({ state, dispatch, toast }) {
  const { clientes, unidades, proveedores, operaciones } = state;
  const [tab, setTab] = useState("unidades");

  const tabs = [
    { k: "unidades", l: "Unidades" },
    { k: "clientes", l: "Clientes" },
    { k: "proveedores", l: "Proveedores" },
  ];

  const opsActivas = id => operaciones.filter(o => !o._deleted && o.unidadId === id && ACTIVOS.has(o.estado)).length;
  const opsCliente = id => operaciones.filter(o => !o._deleted && o.clienteId === id).length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg0, paddingBottom: 80 }}>
      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, marginBottom: 16 }}>Flota</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
          {tabs.map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: "6px 14px", borderRadius: 8,
              background: "none", border: "none",
              color: tab === k ? C.t1 : C.t3,
              fontSize: 13, fontWeight: tab === k ? 700 : 400,
              cursor: "pointer", fontFamily: "inherit",
              borderBottom: tab === k ? `2px solid ${C.lime}` : "2px solid transparent",
            }}>{l}</button>
          ))}
        </div>

        {tab === "unidades" && (
          <div>
            {unidades.map(u => {
              const cli = clientes.find(c => c.id === u.clienteId);
              const activas = opsActivas(u.id);
              const estados = { operativa: C.green, detenida: C.red, preventivo: C.amber, taller: C.amber };
              return (
                <Card key={u.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 9, color: C.t3, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
                        Eco. {u.economico}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.t1 }}>
                        {u.marca} {u.modelo}
                      </div>
                      <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>
                        {u.anio} · {u.placa} · {u.km?.toLocaleString()} km
                      </div>
                      {cli && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{cli.empresa}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 8, background: `${estados[u.estado_op] || C.t3}18`, color: estados[u.estado_op] || C.t3, marginBottom: 4 }}>
                        {u.estado_op || "operativa"}
                      </div>
                      {activas > 0 && (
                        <div style={{ fontSize: 10, color: C.amber }}>{activas} op. activa{activas > 1 ? "s" : ""}</div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "clientes" && (
          <div>
            {clientes.map(c => {
              const ops = opsCliente(c.id);
              const unis = unidades.filter(u => u.clienteId === c.id).length;
              return (
                <Card key={c.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.t1 }}>{c.empresa}</div>
                      <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>{c.contacto}</div>
                      <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{c.tel}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <Pill label={c.categoria || "B"} color={c.categoria === "A" ? C.lime : C.t2} small />
                      <div style={{ fontSize: 10, color: C.t3, marginTop: 6 }}>{unis} unidad{unis !== 1 ? "es" : ""} · {ops} op.</div>
                      <div style={{ fontSize: 10, color: C.t3 }}>Crédito {c.credito_dias}d</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {tab === "proveedores" && (
          <div>
            {proveedores.map(p => (
              <Card key={p.id} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>{p.especialidad}</div>
                    <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{p.tel}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: p.score >= 90 ? C.lime : p.score >= 75 ? C.amber : C.red }}>
                      {p.score}
                    </div>
                    <div style={{ fontSize: 9, color: C.t3 }}>score</div>
                    <div style={{ fontSize: 10, color: C.t3, marginTop: 4 }}>Entrega {p.entrega_hrs}h</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOTTOM NAV
// ─────────────────────────────────────────────────────────────────────────────

function BottomNav({ tab, onChange, kpi }) {
  const items = [
    { k: "centro", icon: "⚡", label: "Centro", badge: kpi.criticas > 0 ? kpi.criticas : null },
    { k: "ops", icon: "📋", label: "Ops", badge: kpi.activas > 0 ? kpi.activas : null },
    { k: "cierre", icon: "💰", label: "Cierre", badge: kpi.pendiente_cobro > 0 ? "·" : null },
    { k: "flota", icon: "🚛", label: "Flota" },
  ];

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
      display: "flex",
      background: "rgba(7,9,9,0.92)", backdropFilter: "blur(20px) saturate(1.8)",
      WebkitBackdropFilter: "blur(20px) saturate(1.8)",
      borderTop: `1px solid ${C.border}`,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {items.map(({ k, icon, label, badge }) => (
        <button key={k} onClick={() => onChange(k)} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          gap: 2, padding: "10px 0",
          background: "none", border: "none",
          color: tab === k ? C.lime : C.t3,
          fontSize: 10, fontWeight: tab === k ? 700 : 400,
          cursor: "pointer", fontFamily: "inherit", position: "relative",
        }}>
          <div style={{ fontSize: 20, lineHeight: 1 }}>{icon}</div>
          {label}
          {badge !== null && badge !== undefined && (
            <div style={{
              position: "absolute", top: 6, right: "calc(50% - 18px)",
              background: C.red, color: "#fff",
              fontSize: 8, fontWeight: 800,
              padding: "1px 4px", borderRadius: 6, minWidth: 14, textAlign: "center",
            }}>{badge}</div>
          )}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const saved = loadState();
  const [state, dispatch] = useReducer(reducer, saved || INITIAL_STATE);
  const [tab, setTab] = useState("centro");
  const [view, setView] = useState(null); // { type: "op", id } | { type: "nueva" }
  const { toasts, toast } = useToast();

  useEffect(() => { saveState(state); }, [state]);

  const kpi = useKPIs(state.operaciones);

  function navigate(type, id) {
    setView(type === null ? null : { type, id });
  }

  // ── View routing ─────────────────────────────────────────────────
  if (view?.type === "nueva") return (
    <>
      <NuevaOperacion
        state={state} dispatch={dispatch} toast={toast}
        onBack={() => setView(null)}
        onCreated={() => { setView(null); setTab("ops"); }}
      />
      <Toast toasts={toasts} />
    </>
  );

  if (view?.type === "op") return (
    <>
      <OperacionDetail
        opId={view.id} state={state} dispatch={dispatch} toast={toast}
        onBack={() => setView(null)}
      />
      <Toast toasts={toasts} />
    </>
  );

  const screenProps = { state, dispatch, toast, onVer: id => navigate("op", id) };

  return (
    <div style={{ background: C.bg0, minHeight: "100vh" }}>
      {tab === "centro" && (
        <Centro {...screenProps} onNueva={() => navigate("nueva")} />
      )}
      {tab === "ops" && (
        <Operaciones {...screenProps} />
      )}
      {tab === "cierre" && (
        <Cierre {...screenProps} />
      )}
      {tab === "flota" && (
        <Flota {...screenProps} />
      )}

      <BottomNav tab={tab} onChange={setTab} kpi={kpi} />
      <Toast toasts={toasts} />
    </div>
  );
}
