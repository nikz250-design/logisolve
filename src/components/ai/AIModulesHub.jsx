// ============================================================
// AIModulesHub — Panel flotante con los 10 módulos IA de Logisolve
// Mobile-first · Glassmorphism · Carga y errores reales
// v2 — correcciones de contexto y módulos con input de usuario
// ============================================================

import React, { useState, useCallback, useMemo } from "react";
import { useAIModule } from "./useAIModule.js";
import AIResultCard from "./AIResultCard.jsx";

// Helpers
const CLOSED = new Set(["cerrado","cancelado","cobrado"]);
const prom = (arr, fn) => arr.length ? arr.reduce((s,x) => s + fn(x), 0) / arr.length : 0;

// ── Definición de los 10 módulos ────────────────────────────
// inputFields: campos que el usuario rellena antes de ejecutar
// getCtx(state, userInput): construye el contexto para la API
const MODULE_DEFS = [
  {
    id:       "cotizacion-analisis",
    icon:     "📋",
    label:    "Análisis de cotización",
    desc:     "Viabilidad, alertas y sugerencias",
    tabs:     ["cotizador","refacciones"],
    category: "cotizacion",
    inputFields: [
      { key:"desc",  label:"¿Qué refacciones se están cotizando?", type:"textarea", placeholder:"Ej: horquilla clutch Freightliner M2, 2 baleros 6206, retén diferencial Ford F-350..." },
      { key:"total", label:"Total aproximado ($MXN)", type:"number", placeholder:"12500" },
      { key:"margen",label:"Margen propuesto (%)", type:"number", placeholder:"35" },
    ],
    getCtx: (state, inp) => ({
      partes:  [{ nombre: inp.desc || "Refacciones varias" }],
      cliente: state.clients?.[0]?.empresa ?? "Cliente",
      total:   Number(inp.total) || 0,
      margen:  Number(inp.margen) || 0,
      unidad:  state.units?.[0] ? `${state.units[0].marca} ${state.units[0].modelo}` : "No especificada",
    }),
  },
  {
    id:       "riesgo-operativo",
    icon:     "⚠️",
    label:    "Riesgo operativo",
    desc:     "Detecta señales de riesgo en el pipeline actual",
    tabs:     ["ops","tickets"],
    category: "ops",
    inputFields: [],
    getCtx: (state) => {
      const tickets = state.tickets ?? [];
      const active  = tickets.filter(t => !t._deleted);
      const p1      = active.filter(t => t.priority === "P1" && !CLOSED.has(t.status));
      // "detenidas" = unidades con tickets P1 activos (proxy correcto)
      const unitIds = new Set(p1.map(t => t.unitId).filter(Boolean));
      const vencidos = active.filter(t => t.status === "facturado" && t.promesaPago && new Date(t.promesaPago) < new Date());
      const valorRiesgo = p1.reduce((s, t) => s + (t.snap?.precioConIVA ?? 0), 0);
      const diasProm = active.length > 0
        ? Math.round(prom(active, t => t.date ? (Date.now() - new Date(t.date)) / 86400000 : 0))
        : 0;
      return {
        p1Count:           p1.length,
        unidadesDetenidas: unitIds.size,
        diasPromedio:      diasProm,
        valorRiesgo:       Math.round(valorRiesgo),
        vencidos:          vencidos.length,
        clientesMora:      vencidos.length > 0 ? 1 : 0,
        totalTickets:      active.length,
        // Include titles for richer analysis
        p1Titulos:         p1.slice(0,3).map(t => t.titulo),
        vencidosTitulos:   vencidos.slice(0,3).map(t => t.titulo),
      };
    },
  },
  {
    id:       "recomendacion-margen",
    icon:     "📈",
    label:    "Recomendar margen",
    desc:     "Margen óptimo basado en costos y mercado",
    tabs:     ["cotizador","refacciones"],
    category: "cotizacion",
    inputFields: [
      { key:"costoTotal", label:"Costo total de partes ($MXN)", type:"number", placeholder:"8000" },
      { key:"tipoOp",     label:"Tipo de operación", type:"select", options:["general","consumable","tech","heavy","rescue","logistics"] },
      { key:"urgencia",   label:"Urgencia del cliente", type:"select", options:["normal","urgente","critico"] },
    ],
    getCtx: (state, inp) => ({
      costoTotal:       Number(inp.costoTotal) || 0,
      tipoOp:           inp.tipoOp || "general",
      categoriaCliente: state.clients?.length > 3 ? "frecuente" : "regular",
      historialMargen:  null,
      margenActual:     0,
      numPartes:        1,
      urgencia:         inp.urgencia || "normal",
    }),
  },
  {
    id:       "resumen-ejecutivo",
    icon:     "📄",
    label:    "Resumen para cliente",
    desc:     "Texto profesional listo para enviar al cliente",
    tabs:     ["cotizador","refacciones","tickets"],
    category: "cotizacion",
    inputFields: [
      { key:"servicio", label:"¿Qué servicio o piezas incluye?", type:"textarea", placeholder:"Ej: horquilla de clutch + mano de obra, 2 baleros + retén..." },
      { key:"total",    label:"Total con IVA ($MXN)", type:"number", placeholder:"15080" },
      { key:"eta",      label:"Tiempo de entrega estimado", type:"text", placeholder:"Ej: 24-48 hrs, hoy mismo" },
    ],
    getCtx: (state, inp) => ({
      servicio:    inp.servicio || "Refacciones y partes automotrices",
      partes:      [{ nombre: inp.servicio || "servicio" }],
      totalConIva: Number(inp.total) || 0,
      cliente:     state.clients?.[0]?.empresa ?? "Cliente",
      unidad:      state.units?.[0] ? `${state.units[0].marca} ${state.units[0].modelo}` : "",
      condiciones: `Entrega: ${inp.eta || "a confirmar"}. Garantía estándar de fábrica.`,
    }),
  },
  {
    id:       "notas-a-ticket",
    icon:     "🗒️",
    label:    "Notas → Ticket",
    desc:     "Convierte texto libre en ticket operativo estructurado",
    tabs:     ["tickets","ops"],
    category: "ops",
    inputFields: [
      { key:"notas",  label:"Pega o escribe las notas técnicas", type:"textarea", placeholder:"Ej: unidad 1407 varada en autopista, falla en clutch, operador reporta que no entra ninguna velocidad, ya tiene 2 días detenida..." },
      { key:"unidad", label:"Unidad (opcional)", type:"text", placeholder:"Ej: ECO 1407, Freightliner M2" },
    ],
    getCtx: (state, inp) => ({
      notas:    inp.notas || "",
      unidad:   inp.unidad || "",
      fecha:    new Date().toLocaleDateString("es-MX"),
      operador: "Operador",
    }),
  },
  {
    id:       "priorizacion",
    icon:     "🎯",
    label:    "Priorizar tickets",
    desc:     "Ordena el backlog por impacto y urgencia real",
    tabs:     ["tickets","ops"],
    category: "ops",
    inputFields: [],
    getCtx: (state) => {
      const tickets = state.tickets ?? [];
      const active  = tickets.filter(t => !t._deleted && !CLOSED.has(t.status));
      const units   = state.units ?? [];
      return {
        tickets: active.slice(0, 15).map(t => {
          const u = units.find(u => u.id === t.unitId);
          return {
            id:           t.id,
            titulo:       t.titulo,
            status:       t.status,
            prioridad:    t.priority,
            dias:         t.date ? Math.round((Date.now() - new Date(t.date)) / 86400000) : 0,
            valor:        Math.round(t.snap?.precioConIVA ?? 0),
            unidadStatus: u?.statusOp ?? "activa",
            vencido:      t.promesaPago ? new Date(t.promesaPago) < new Date() : false,
          };
        }),
        totalAbiertos:  active.length,
        valorTotal:     Math.round(active.reduce((s,t) => s + (t.snap?.precioConIVA ?? 0), 0)),
      };
    },
  },
  {
    id:       "unidades-detenidas",
    icon:     "🚛",
    label:    "Unidades críticas",
    desc:     "Detecta unidades detenidas con mayor impacto",
    tabs:     ["ops","unidades"],
    category: "flota",
    inputFields: [],
    getCtx: (state) => {
      const tickets = state.tickets ?? [];
      const units   = state.units ?? [];
      const active  = tickets.filter(t => !t._deleted && !CLOSED.has(t.status));
      const p1      = active.filter(t => t.priority === "P1");

      // Build unit data from state (field is statusOp, not status)
      const unitMap = Object.fromEntries(units.map(u => [u.id, u]));
      const p1Units = p1.map(t => {
        const u = unitMap[t.unitId] ?? {};
        return {
          eco:         u.economico || u.eco || t.unitId || "N/A",
          marca:       `${u.marca ?? ""} ${u.modelo ?? ""}`.trim() || "Vehículo",
          modelo:      u.modelo ?? "",
          status:      u.statusOp ?? "critico",
          km:          u.km ?? 0,
          diasDetenida:t.date ? Math.round((Date.now() - new Date(t.date)) / 86400000) : 0,
          ultimoSvc:   "Ver ticket",
          ticket:      t.titulo,
        };
      });

      // Also include preventivo units
      const preventivo = units.filter(u => u.statusOp === "preventivo");

      return {
        unidades:           [...p1Units, ...preventivo.map(u => ({
          eco:         u.economico || u.eco || u.id,
          marca:       `${u.marca} ${u.modelo}`,
          status:      "preventivo",
          km:          u.km,
          diasDetenida:0,
          ultimoSvc:   u.notas?.slice(0,50) || "Sin datos",
        }))].slice(0, 8),
        ticketsRelacionados: p1.length,
        perdidaEstimada:     p1Units.length * 1500,
        totalFlotilla:       units.length,
      };
    },
  },
  {
    id:       "whatsapp-cliente",
    icon:     "💬",
    label:    "WhatsApp cliente",
    desc:     "Mensaje listo para copiar y enviar",
    tabs:     ["tickets","ops","cotizador"],
    category: "cliente",
    inputFields: [
      { key:"cliente",  label:"Nombre del cliente o empresa", type:"text", placeholder:"Ej: Logis Express / Carlos García" },
      { key:"servicio", label:"¿De qué se trata el servicio?", type:"textarea", placeholder:"Ej: horquilla de clutch Freightliner, ya entregada, pendiente de cobro..." },
      { key:"status",   label:"Estado actual", type:"select", options:["en proceso","entregado","pendiente de cobro","cotizado","en camino","listo para recoger"] },
      { key:"eta",      label:"ETA o fecha estimada", type:"text", placeholder:"Ej: hoy a las 4pm, mañana por la mañana" },
    ],
    getCtx: (state, inp) => ({
      cliente:  inp.cliente || state.clients?.[0]?.empresa || "Cliente",
      asunto:   inp.servicio || "Su servicio",
      status:   inp.status || "en proceso",
      servicio: inp.servicio || "",
      eta:      inp.eta || "próximamente",
      monto:    null,
      asesor:   "Logisolve",
    }),
  },
  {
    id:       "resumen-financiero",
    icon:     "💰",
    label:    "Resumen financiero",
    desc:     "Panorama semanal con semáforo y alertas",
    tabs:     ["ops"],
    category: "finanzas",
    inputFields: [],
    getCtx: (state) => {
      const tickets  = state.tickets ?? [];
      const operados = tickets.filter(t => !t._deleted && ["facturado","cobrado","cerrado","entregado"].includes(t.status));
      const abiertos = tickets.filter(t => !t._deleted && !CLOSED.has(t.status));
      const cobrados = tickets.filter(t => !t._deleted && ["cobrado","cerrado"].includes(t.status));
      const facturado = operados.reduce((s, t) => s + (t.snap?.precioConIVA ?? 0), 0);
      const cobrado   = cobrados.reduce((s, t) => s + (t.snap?.precioConIVA ?? 0), 0);
      const margenVals = operados.filter(t => t.snap?.margenPct > 0);
      const margenProm = margenVals.length ? prom(margenVals, t => t.snap.margenPct) : 0;
      const vencidos   = abiertos.filter(t => t.promesaPago && new Date(t.promesaPago) < new Date());
      // Detained = P1 units
      const p1Count  = abiertos.filter(t => t.priority === "P1").length;
      return {
        facturado:         Math.round(facturado),
        cobrado:           Math.round(cobrado),
        margenProm:        Math.round(margenProm),
        ticketsCerrados:   operados.length,
        ticketsAbiertos:   abiertos.length,
        carteraVencida:    Math.round(vencidos.reduce((s,t) => s + (t.snap?.precioConIVA ?? 0), 0)),
        unidadesDetenidas: p1Count,
        pendienteCobrar:   Math.round(abiertos.filter(t => ["facturado","entregado"].includes(t.status)).reduce((s,t) => s + (t.snap?.precioConIVA ?? 0), 0)),
        topOp:             "Refacciones y rescate",
        vsAnterior:        "sin datos históricos",
      };
    },
  },
  {
    id:       "upsell-crosssell",
    icon:     "✨",
    label:    "Upsell / Cross-sell",
    desc:     "Oportunidades de venta adicional",
    tabs:     ["cotizador","refacciones","tickets"],
    category: "ventas",
    inputFields: [
      { key:"servicio", label:"Servicio o piezas de la operación actual", type:"textarea", placeholder:"Ej: horquilla clutch + diagnóstico, marca Freightliner M2 con 284,000 km..." },
      { key:"km",       label:"Kilometraje de la unidad (opcional)", type:"number", placeholder:"284000" },
    ],
    getCtx: (state, inp) => ({
      servicio:  inp.servicio || "Refacciones automotrices",
      partes:    [{ nombre: inp.servicio || "servicio actual" }],
      unidad:    state.units?.[0] ? `${state.units[0].marca} ${state.units[0].modelo}` : "",
      km:        Number(inp.km) || (state.units?.[0]?.km ?? 0),
      historial: state.tickets?.filter(t => !t._deleted && CLOSED.has(t.status)).length > 3 ? "cliente frecuente" : "cliente regular",
      total:     0,
    }),
  },
];

// ── ModuleCard — tarjeta individual con input opcional ──────
function ModuleCard({ def, state, C }) {
  const { status, result, error, meta, run, reset } = useAIModule();
  const [expanded,  setExpanded]  = useState(false);
  const [userInput, setUserInput] = useState({});

  const hasInputFields = def.inputFields.length > 0;

  const handleRun = useCallback(() => {
    const ctx = def.getCtx(state, userInput);
    setExpanded(true);
    run(def.id, ctx);
  }, [def, state, userInput, run]);

  const accent = C._dark ? "#8FE3BE" : "#5CBF8A";

  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    background: C._dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
    border: `1px solid ${C.border}`,
    borderRadius: 10, color: C.t1,
    padding: "8px 10px", fontSize: 12, fontFamily: "inherit",
    resize: "vertical", outline: "none",
  };

  return (
    <div style={{
      background:           C._dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.60)",
      backdropFilter:       C.glass,
      WebkitBackdropFilter: C.glass,
      border:               `1px solid ${C.border}`,
      borderRadius:         16,
      overflow:             "hidden",
    }}>
      {/* Header row */}
      <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{def.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{def.label}</div>
          <div style={{ fontSize: 10, color: C.t3, marginTop: 1 }}>{def.desc}</div>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
          {status === "ok" && (
            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 999, background: `${accent}20`, color: accent, fontWeight: 700 }}>✓</span>
          )}
          {status !== "idle" && (
            <button onClick={() => { reset(); setExpanded(false); setUserInput({}); }}
              style={{ padding: "2px 7px", borderRadius: 6, background: "transparent", border: `1px solid ${C.border}`, color: C.t3, fontSize: 9, cursor: "pointer" }}>✕</button>
          )}
          <button
            onClick={handleRun}
            disabled={status === "loading"}
            style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700,
              cursor: status === "loading" ? "wait" : "pointer",
              background: status === "loading" ? C.bg3 : `${accent}20`,
              border: `1px solid ${status === "loading" ? C.border : `${accent}50`}`,
              color: status === "loading" ? C.t3 : accent,
            }}
          >{status === "loading" ? "…" : "Ejecutar"}</button>
        </div>
      </div>

      {/* Input fields — show when module needs user context */}
      {hasInputFields && status === "idle" && (
        <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {def.inputFields.map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 9, fontWeight: 700, color: C.t3, letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                {f.label}
              </label>
              {f.type === "textarea" ? (
                <textarea rows={2} placeholder={f.placeholder} value={userInput[f.key] ?? ""}
                  onChange={e => setUserInput(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...inputStyle, minHeight: 54 }} />
              ) : f.type === "select" ? (
                <select value={userInput[f.key] ?? ""} onChange={e => setUserInput(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...inputStyle, height: 34 }}>
                  <option value="">Seleccionar…</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type} placeholder={f.placeholder} value={userInput[f.key] ?? ""}
                  onChange={e => setUserInput(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ ...inputStyle, height: 34 }} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {status === "loading" && (
        <div style={{ padding: "10px 14px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 15, height: 15, border: `2px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.t3 }}>Consultando Claude IA…</span>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{ padding: "0 14px 12px" }}>
          <div style={{ background: C.redDim, border: `1px solid ${C.p1}30`, borderRadius: 10, padding: "8px 12px", fontSize: 11, color: C.red }}>
            ✕ {error}
            <button onClick={handleRun} style={{ marginLeft: 8, fontSize: 10, color: accent, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Reintentar</button>
          </div>
        </div>
      )}

      {/* Result */}
      {status === "ok" && expanded && result && (
        <div style={{ padding: "0 12px 12px" }}>
          <AIResultCard moduleId={def.id} result={result} meta={meta} C={C} />
        </div>
      )}
    </div>
  );
}

// ── AIModulesHub — componente principal ──────────────────────
export default function AIModulesHub({ state, tab, C }) {
  const [open,   setOpen]   = useState(false);
  const [filter, setFilter] = useState("all");

  const accent = C._dark ? "#8FE3BE" : "#5CBF8A";

  const relevantModules = useMemo(() => {
    if (filter === "tab")  return MODULE_DEFS.filter(m => m.tabs.includes(tab));
    if (filter !== "all")  return MODULE_DEFS.filter(m => m.category === filter);
    return MODULE_DEFS;
  }, [filter, tab]);

  const tabCount = useMemo(() => MODULE_DEFS.filter(m => m.tabs.includes(tab)).length, [tab]);

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 340, right: 16,
          zIndex: 9050,
          height: 40, borderRadius: 999,
          padding: "0 14px 0 10px",
          background: C._dark ? "rgba(22,24,28,0.92)" : "rgba(255,255,255,0.92)",
          backdropFilter: C.glass,
          WebkitBackdropFilter: C.glass,
          border: `1px solid ${accent}60`,
          boxShadow: `0 4px 20px ${accent}30`,
          display: "flex", alignItems: "center", gap: 6,
          cursor: "pointer",
          animation: "aiPulse 3s ease-in-out infinite",
        }}
      >
        <span style={{ fontSize: 14, color: accent }}>✦</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: C.t1, letterSpacing: "0.04em", fontFamily: "monospace" }}>IA</span>
        <span style={{ fontSize: 9, color: C.t3, background: C.bg3, borderRadius: 999, padding: "1px 6px", border: `1px solid ${C.border}` }}>10</span>
      </button>

      {/* ── Backdrop ─────────────────────────────────────────── */}
      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9100, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />
      )}

      {/* ── Bottom Sheet ─────────────────────────────────────── */}
      {open && (
        <div className="sheet-enter" style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9200,
          maxHeight: "90vh",
          background: C._dark ? "rgba(13,15,18,0.97)" : "rgba(245,244,240,0.97)",
          backdropFilter: "blur(40px) saturate(1.8)",
          WebkitBackdropFilter: "blur(40px) saturate(1.8)",
          border: `1px solid ${C.border}`,
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}>
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: C.border }} />
          </div>

          {/* Header */}
          <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.t1 }}>Logisolve IA</div>
              <div style={{ fontSize: 10, color: C.t3 }}>10 módulos inteligentes · preview</div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ width: 28, height: 28, borderRadius: "50%", background: C.bg3, border: `1px solid ${C.border}`, color: C.t2, fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>

          {/* Filter chips */}
          <div style={{ padding: "0 16px 12px", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0 }}>
            {[
              { id:"all",        label:"Todos (10)" },
              { id:"tab",        label:`Esta pantalla (${tabCount})` },
              { id:"ops",        label:"Operaciones" },
              { id:"cotizacion", label:"Cotización" },
              { id:"finanzas",   label:"Finanzas" },
              { id:"ventas",     label:"Ventas" },
            ].map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                flexShrink: 0, padding: "5px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                background: filter === f.id ? `${accent}20` : C.bg3,
                border: `1px solid ${filter === f.id ? `${accent}50` : C.border}`,
                color: filter === f.id ? accent : C.t3,
                cursor: "pointer", whiteSpace: "nowrap",
              }}>{f.label}</button>
            ))}
          </div>

          {/* Modules */}
          <div style={{ padding: "0 14px 48px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
            {relevantModules.map(def => (
              <ModuleCard key={def.id} def={def} state={state} C={C} />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes aiPulse {
          0%,100% { box-shadow: 0 4px 20px ${accent}30; }
          50%      { box-shadow: 0 6px 28px ${accent}55; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
