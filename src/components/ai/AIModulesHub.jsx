// ============================================================
// AIModulesHub — Panel flotante con los 10 módulos IA de Logisolve
// Mobile-first · Glassmorphism · Carga y errores reales
// ============================================================

import React, { useState, useCallback, useMemo } from "react";
import { useAIModule } from "./useAIModule.js";
import AIResultCard from "./AIResultCard.jsx";

// ── Definición de los 10 módulos ────────────────────────────
const MODULE_DEFS = [
  {
    id:       "cotizacion-analisis",
    icon:     "📋",
    label:    "Análisis de cotización",
    desc:     "Viabilidad, alertas y sugerencias para la cotización activa",
    tabs:     ["cotizador", "refacciones"],
    category: "cotizacion",
    getCtx:   (state, extra) => ({
      partes:   (extra?.partes ?? []).map(p => ({ nombre: p.nombre ?? p.desc, precioUnitario: p.precio ?? p.pu, cantidad: p.qty ?? p.cantidad, margen: p.margen })),
      cliente:  extra?.cliente ?? state.clients?.[0]?.empresa ?? "Sin cliente",
      total:    extra?.total ?? 0,
      margen:   extra?.margen ?? 0,
      unidad:   extra?.unidad ?? "",
    }),
  },
  {
    id:       "riesgo-operativo",
    icon:     "⚠️",
    label:    "Riesgo operativo",
    desc:     "Detecta señales de riesgo en el pipeline actual",
    tabs:     ["ops", "tickets"],
    category: "ops",
    getCtx:   (state) => {
      const active = (state.tickets ?? []).filter(t => !t._deleted);
      const p1 = active.filter(t => t.priority === "P1" && !["cerrado","cancelado","cobrado"].includes(t.status));
      const detenidas = (state.units ?? []).filter(u => u.status === "taller" || u.status === "critico");
      const vencidos = active.filter(t => t.status === "facturado" && t.fechaFactura && (Date.now() - new Date(t.fechaFactura)) > 30 * 86400000);
      const valorRiesgo = p1.reduce((s, t) => s + (t.snap?.precioConIVA ?? 0), 0);
      const diasProm = active.length > 0 ? Math.round(active.reduce((s, t) => {
        const d = t.date ? (Date.now() - new Date(t.date)) / 86400000 : 0;
        return s + d;
      }, 0) / active.length) : 0;
      return { p1Count: p1.length, unidadesDetenidas: detenidas.length, diasPromedio: diasProm, valorRiesgo, vencidos: vencidos.length, clientesMora: 0 };
    },
  },
  {
    id:       "recomendacion-margen",
    icon:     "📈",
    label:    "Recomendar margen",
    desc:     "Margen óptimo basado en costos, cliente y mercado",
    tabs:     ["cotizador", "refacciones"],
    category: "cotizacion",
    getCtx:   (state, extra) => ({
      costoTotal:       extra?.costoTotal ?? 0,
      tipoOp:           extra?.tipoOp ?? "general",
      categoriaCliente: extra?.categoriaCliente ?? "regular",
      historialMargen:  extra?.historialMargen ?? null,
      margenActual:     extra?.margen ?? 0,
      numPartes:        extra?.numPartes ?? 1,
      urgencia:         extra?.urgencia ?? "normal",
    }),
  },
  {
    id:       "resumen-ejecutivo",
    icon:     "📄",
    label:    "Resumen para cliente",
    desc:     "Texto profesional listo para enviar al cliente",
    tabs:     ["cotizador", "refacciones", "tickets"],
    category: "cotizacion",
    getCtx:   (state, extra) => ({
      servicio:     extra?.servicio ?? "Refacciones y partes",
      partes:       (extra?.partes ?? []).slice(0, 5).map(p => p.nombre ?? p.desc ?? p),
      totalConIva:  extra?.totalConIva ?? extra?.total ?? 0,
      cliente:      extra?.cliente ?? state.clients?.[0]?.empresa ?? "Cliente",
      unidad:       extra?.unidad ?? "",
      condiciones:  extra?.condiciones ?? "Garantía estándar de fábrica",
    }),
  },
  {
    id:       "notas-a-ticket",
    icon:     "🗒️",
    label:    "Notas → Ticket",
    desc:     "Convierte texto libre en un ticket operativo estructurado",
    tabs:     ["tickets", "ops"],
    category: "ops",
    getCtx:   (state, extra) => ({
      notas:    extra?.notas ?? "",
      unidad:   extra?.unidad ?? "",
      fecha:    new Date().toLocaleDateString("es-MX"),
      operador: extra?.operador ?? "Operador",
    }),
  },
  {
    id:       "priorizacion",
    icon:     "🎯",
    label:    "Priorizar tickets",
    desc:     "Ordena el backlog actual por impacto y urgencia",
    tabs:     ["tickets", "ops"],
    category: "ops",
    getCtx:   (state) => {
      const active = (state.tickets ?? []).filter(t => !t._deleted && !["cerrado","cancelado","cobrado"].includes(t.status));
      return {
        tickets: active.slice(0, 15).map(t => ({
          id:           t.id,
          titulo:       t.titulo,
          status:       t.status,
          dias:         t.date ? Math.round((Date.now() - new Date(t.date)) / 86400000) : 0,
          valor:        t.snap?.precioConIVA ?? 0,
          unidadStatus: (state.units ?? []).find(u => u.id === t.unitId)?.status ?? "activa",
        })),
      };
    },
  },
  {
    id:       "unidades-detenidas",
    icon:     "🚛",
    label:    "Unidades críticas",
    desc:     "Detecta unidades detenidas con mayor impacto operativo",
    tabs:     ["ops", "unidades"],
    category: "flota",
    getCtx:   (state) => {
      const detenidas = (state.units ?? []).filter(u => u.status === "taller" || u.status === "critico");
      const ticketsPorUnidad = (state.tickets ?? []).filter(t => !t._deleted && !["cerrado","cancelado"].includes(t.status));
      const perdidaPorDia = detenidas.reduce((s, u) => s + 1500, 0); // Estimado $1500/día por unidad detenida
      return {
        unidades: detenidas.map(u => ({
          eco:        u.eco,
          marca:      u.marca,
          modelo:     u.modelo,
          status:     u.status,
          km:         u.km,
          diasDetenida: u.diasDetenida ?? 0,
          ultimoSvc:  u.ultimoSvc ?? "Sin datos",
        })),
        ticketsRelacionados: ticketsPorUnidad.filter(t => detenidas.some(u => u.id === t.unitId)).length,
        perdidaEstimada: perdidaPorDia,
      };
    },
  },
  {
    id:       "whatsapp-cliente",
    icon:     "💬",
    label:    "WhatsApp cliente",
    desc:     "Redacta el mensaje perfecto para actualizar al cliente",
    tabs:     ["tickets", "ops", "cotizador"],
    category: "cliente",
    getCtx:   (state, extra) => ({
      cliente: extra?.cliente ?? state.clients?.[0]?.empresa ?? "Cliente",
      asunto:  extra?.titulo ?? extra?.asunto ?? "Su servicio",
      status:  extra?.status ?? "en proceso",
      servicio:extra?.servicio ?? "",
      eta:     extra?.eta ?? "hoy o mañana",
      monto:   extra?.monto ?? null,
      asesor:  extra?.asesor ?? "Logisolve",
    }),
  },
  {
    id:       "resumen-financiero",
    icon:     "💰",
    label:    "Resumen financiero",
    desc:     "Panorama financiero semanal con alertas y tendencias",
    tabs:     ["ops"],
    category: "finanzas",
    getCtx:   (state) => {
      const tickets = state.tickets ?? [];
      const operados = tickets.filter(t => !t._deleted && ["facturado","cobrado","cerrado"].includes(t.status));
      const abiertos = tickets.filter(t => !t._deleted && !["cerrado","cancelado","cobrado"].includes(t.status));
      const facturado = operados.reduce((s, t) => s + (t.snap?.precioConIVA ?? 0), 0);
      const cobrado = tickets.filter(t => !t._deleted && ["cobrado","cerrado"].includes(t.status)).reduce((s, t) => s + (t.snap?.precioConIVA ?? 0), 0);
      const margenProm = operados.length > 0 ? operados.reduce((s, t) => s + (t.snap?.margenPct ?? 0), 0) / operados.length : 0;
      const vencidos = abiertos.filter(t => t.status === "facturado");
      const detenidas = (state.units ?? []).filter(u => u.status === "taller" || u.status === "critico");
      return {
        facturado:        Math.round(facturado),
        cobrado:          Math.round(cobrado),
        margenProm:       Math.round(margenProm),
        ticketsCerrados:  operados.length,
        ticketsAbiertos:  abiertos.length,
        carteraVencida:   vencidos.reduce((s, t) => s + (t.snap?.precioConIVA ?? 0), 0),
        unidadesDetenidas:detenidas.length,
        topOp:            "Refacciones",
        vsAnterior:       "sin datos",
      };
    },
  },
  {
    id:       "upsell-crosssell",
    icon:     "✨",
    label:    "Upsell / Cross-sell",
    desc:     "Oportunidades de venta adicional en la operación actual",
    tabs:     ["cotizador", "refacciones", "tickets"],
    category: "ventas",
    getCtx:   (state, extra) => ({
      servicio: extra?.servicio ?? "Refacciones",
      partes:   (extra?.partes ?? []).slice(0, 8).map(p => ({ nombre: p.nombre ?? p.desc ?? p })),
      unidad:   extra?.unidad ?? "",
      km:       extra?.km ?? 0,
      historial: extra?.historial ?? "cliente regular",
      total:    extra?.total ?? 0,
    }),
  },
];

const CATEGORY_LABELS = {
  cotizacion: "Cotizaciones",
  ops:        "Operaciones",
  flota:      "Flota",
  cliente:    "Clientes",
  finanzas:   "Finanzas",
  ventas:     "Ventas",
};

// ── ModuleCard — tarjeta individual de un módulo ─────────────
function ModuleCard({ def, state, extra, C }) {
  const { status, result, error, meta, run, reset } = useAIModule();
  const [expanded, setExpanded] = useState(false);

  const handleRun = useCallback(() => {
    const ctx = def.getCtx(state, extra);
    setExpanded(true);
    run(def.id, ctx);
  }, [def, state, extra, run]);

  const accent = C._dark ? "#8FE3BE" : "#5CBF8A";

  return (
    <div style={{
      background:        C._dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.60)",
      backdropFilter:    C.glass,
      WebkitBackdropFilter: C.glass,
      border:            `1px solid ${C.border}`,
      borderRadius:      16,
      overflow:          "hidden",
      transition:        "border-color 200ms",
    }}>
      {/* Header */}
      <div
        style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        onClick={() => { if (status !== "idle") setExpanded(e => !e); }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>{def.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, lineHeight: 1.2 }}>{def.label}</div>
          <div style={{ fontSize: 10, color: C.t3, marginTop: 2, lineHeight: 1.3 }}>{def.desc}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {status === "ok" && (
            <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 999, background: `${accent}20`, color: accent, fontWeight: 700 }}>✓</span>
          )}
          {status !== "idle" && (
            <button
              onClick={(e) => { e.stopPropagation(); reset(); setExpanded(false); }}
              style={{ padding: "2px 6px", borderRadius: 6, background: "transparent", border: `1px solid ${C.border}`, color: C.t3, fontSize: 9, cursor: "pointer" }}
            >✕</button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleRun(); }}
            disabled={status === "loading"}
            style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: status === "loading" ? "wait" : "pointer",
              background: status === "loading" ? C.bg3 : `${accent}20`,
              border: `1px solid ${status === "loading" ? C.border : `${accent}50`}`,
              color: status === "loading" ? C.t3 : accent,
              transition: "all 180ms",
            }}
          >
            {status === "loading" ? "..." : "Ejecutar"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {status === "loading" && (
        <div style={{ padding: "10px 14px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 16, height: 16, border: `2px solid ${accent}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: C.t3 }}>Consultando Claude IA…</span>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div style={{ padding: "0 14px 12px" }}>
          <div style={{ background: C.redDim, border: `1px solid ${C.p1}30`, borderRadius: 10, padding: "8px 12px", fontSize: 11, color: C.red }}>
            ✕ {error}
            <button onClick={handleRun} style={{ marginLeft: 10, fontSize: 10, color: accent, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Reintentar</button>
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
export default function AIModulesHub({ state, tab, C, extra }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");

  const accent = C._dark ? "#8FE3BE" : "#5CBF8A";

  // Modules relevantes para el tab actual (o todos si no hay filtro específico)
  const relevantModules = useMemo(() => {
    if (filter === "tab") return MODULE_DEFS.filter(m => m.tabs.includes(tab));
    if (filter !== "all") return MODULE_DEFS.filter(m => m.category === filter);
    return MODULE_DEFS;
  }, [filter, tab]);

  const tabModuleCount = useMemo(() => MODULE_DEFS.filter(m => m.tabs.includes(tab)).length, [tab]);

  return (
    <>
      {/* ── FAB Button ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 340, right: 16,
          zIndex: 9050,
          height: 40, borderRadius: 999,
          padding: "0 14px 0 10px",
          background: C._dark ? "rgba(22,24,28,0.90)" : "rgba(255,255,255,0.90)",
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

      {/* ── Backdrop ───────────────────────────────────────── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 9100, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        />
      )}

      {/* ── Bottom Sheet ───────────────────────────────────── */}
      {open && (
        <div
          className="sheet-enter"
          style={{
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
          }}
        >
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
            <div style={{ width: 36, height: 4, borderRadius: 999, background: C.border }} />
          </div>

          {/* Header */}
          <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✦</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, letterSpacing: "0.02em" }}>Logisolve IA</div>
              <div style={{ fontSize: 10, color: C.t3 }}>10 módulos inteligentes · preview</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ width: 28, height: 28, borderRadius: "50%", background: C.bg3, border: `1px solid ${C.border}`, color: C.t2, fontSize: 12, cursor: "pointer" }}
            >✕</button>
          </div>

          {/* Filter chips */}
          <div style={{ padding: "0 16px 12px", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0 }}>
            {[
              { id: "all",  label: "Todos (10)" },
              { id: "tab",  label: `Esta pantalla (${tabModuleCount})` },
              { id: "ops",  label: "Operaciones" },
              { id: "cotizacion", label: "Cotización" },
              { id: "flota", label: "Flota" },
              { id: "finanzas", label: "Finanzas" },
              { id: "ventas",   label: "Ventas" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  flexShrink: 0, padding: "5px 12px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                  background: filter === f.id ? `${accent}20` : C.bg3,
                  border: `1px solid ${filter === f.id ? `${accent}50` : C.border}`,
                  color: filter === f.id ? accent : C.t3,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >{f.label}</button>
            ))}
          </div>

          {/* Module list */}
          <div style={{ padding: "0 14px 32px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
            {relevantModules.length === 0 && (
              <div style={{ textAlign: "center", padding: "24px 0", color: C.t3, fontSize: 12 }}>
                No hay módulos para esta vista
              </div>
            )}
            {relevantModules.map(def => (
              <ModuleCard key={def.id} def={def} state={state} extra={extra} C={C} />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes aiPulse {
          0%, 100% { box-shadow: 0 4px 20px ${accent}30, 0 0 0 0 ${accent}40; }
          50%       { box-shadow: 0 4px 24px ${accent}50, 0 0 0 8px ${accent}00; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
