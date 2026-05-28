// AIModulesHub — Context-aware AI panel.
// Architecture: AIContextEngine resolves live state → validates → calls API → traces.
// UI is intentionally minimal: entity header, module list, trace viewer.

import React, { useState } from "react";
import { useAIEngine }     from "../../ai/engine/useAIEngine.js";
import { MODULE_REGISTRY } from "../../ai/engine/registry.js";
import { autoResolve }     from "../../ai/engine/resolvers.js";

// ─── Small presentational pieces ─────────────────────────────

function Badge({ children, color }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 3,
      background: color + "22", color, letterSpacing: 0.4, textTransform: "uppercase",
    }}>
      {children}
    </span>
  );
}

function TraceRow({ step, accent }) {
  const [open, setOpen] = useState(false);
  const hasData = step.data && Object.keys(step.data).length > 0;
  return (
    <div style={{ marginBottom: 3 }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 5,
          cursor: hasData ? "pointer" : "default", fontSize: 10, color: accent,
        }}
        onClick={() => hasData && setOpen(v => !v)}
      >
        <span style={{ opacity: 0.5, fontVariantNumeric: "tabular-nums", minWidth: 30 }}>
          {step.elapsed}ms
        </span>
        <span style={{ opacity: 0.55 }}>›</span>
        <span>{step.label}</span>
        {hasData && <span style={{ opacity: 0.4, fontSize: 8 }}>{open ? "▲" : "▼"}</span>}
      </div>
      {open && hasData && (
        <pre style={{
          margin: "3px 0 0 35px", fontSize: 9, color: accent, opacity: 0.65,
          whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 140, overflowY: "auto",
        }}>
          {JSON.stringify(step.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ResultView({ result, C, accent }) {
  if (!result) return null;

  if (result.raw) {
    return (
      <div style={{ fontSize: 10, color: C.t1, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
        {result.raw}
      </div>
    );
  }

  if (result.texto || result.mensaje) {
    const text = result.texto || result.mensaje;
    return (
      <div style={{ fontSize: 10, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {text}
      </div>
    );
  }

  // Generic key→value renderer for JSON results
  return (
    <div>
      {Object.entries(result).map(([k, v]) => {
        if (v === null || v === undefined) return null;
        const isArr = Array.isArray(v);
        return (
          <div key={k} style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 9, color: C.t3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>
              {k}
            </div>
            {isArr ? (
              <ul style={{ margin: 0, paddingLeft: 14 }}>
                {v.map((item, i) => (
                  <li key={i} style={{ fontSize: 10, color: C.t1, lineHeight: 1.5 }}>
                    {typeof item === "object" ? JSON.stringify(item) : String(item)}
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{
                fontSize: 11, fontWeight: typeof v === "number" ? 700 : 400,
                color: typeof v === "number" ? accent : C.t1,
              }}>
                {String(v)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Individual module row ─────────────────────────────────────

function ModuleRow({ id, def, state, engine, C, activeRef }) {
  const [status,     setStatus]     = useState("idle");
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState(null);
  const [trace,      setTrace]      = useState(null);
  const [meta,       setMeta]       = useState(null);
  const [expanded,   setExpanded]   = useState(false);
  const [showTrace,  setShowTrace]  = useState(false);
  const [userInput,  setUserInput]  = useState("");

  const accent     = C._dark ? "#8FE3BE" : "#5CBF8A";
  const needsInput = id === "notas-a-ticket" || id === "whatsapp-cliente";

  // Which entity type will be used
  const entityType = (activeRef?.type === "ticket" && def.entityTypes.includes("ticket"))
    ? "ticket"
    : def.entityTypes[0];

  const run = async () => {
    setStatus("loading");
    setResult(null);
    setError(null);
    setTrace(null);
    setExpanded(true);

    const ref = activeRef ?? autoResolve(state, id);
    const out = await engine.execute(id, ref, needsInput ? userInput : undefined);

    setTrace(out.trace);
    if (out.ok) {
      setResult(out.result);
      setMeta(out.meta);
      setStatus("ok");
    } else {
      setError(out.error);
      setStatus("error");
    }
  };

  return (
    <div style={{
      borderRadius: 8, marginBottom: 5,
      background: expanded
        ? (C._dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)")
        : "transparent",
      border: expanded ? `1px solid ${accent}1a` : "1px solid transparent",
      transition: "all 0.12s",
    }}>
      {/* Module header */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 9px", cursor: "pointer" }}
        onClick={() => setExpanded(v => !v)}
      >
        <span style={{ fontSize: 13 }}>{def.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.t1, lineHeight: 1.2 }}>
            {def.label}
          </div>
          <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>
            {def.description}
          </div>
        </div>
        <Badge color={entityType === "global" ? "#4A90E2" : accent}>
          {entityType}
        </Badge>
        <span style={{ fontSize: 9, color: C.t3, marginLeft: 2 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: "0 9px 9px" }}>

          {/* Optional text input */}
          {needsInput && (
            <textarea
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              placeholder={
                id === "notas-a-ticket"
                  ? "Pega las notas técnicas aquí…"
                  : "Instrucción adicional para el mensaje…"
              }
              rows={2}
              style={{
                width: "100%", boxSizing: "border-box", resize: "vertical",
                fontSize: 10, padding: "5px 7px", borderRadius: 5, marginBottom: 6,
                background: C._dark ? "#111a13" : "#f3f7f4",
                border: `1px solid ${C.border ?? "#2a3d2e"}`,
                color: C.t1, outline: "none", fontFamily: "inherit",
              }}
            />
          )}

          {/* Action bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <button
              onClick={run}
              disabled={status === "loading"}
              style={{
                fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 5,
                background: status === "loading" ? (C._dark ? "#333" : "#ccc") : accent,
                color: "#071209", border: "none",
                cursor: status === "loading" ? "default" : "pointer",
                transition: "background 0.12s",
              }}
            >
              {status === "loading" ? "Ejecutando…" : "Ejecutar"}
            </button>

            {trace && (
              <button
                onClick={() => setShowTrace(v => !v)}
                style={{
                  fontSize: 9, padding: "3px 7px", borderRadius: 4,
                  background: "transparent",
                  border: `1px solid ${C.border ?? "#2a3d2e"}`,
                  color: C.t2, cursor: "pointer",
                }}
              >
                {showTrace ? "Ocultar trace" : "Trace"}
              </button>
            )}

            {meta && (
              <span style={{ fontSize: 9, color: C.t3, marginLeft: "auto" }}>
                {meta.duration_ms}ms ·{" "}
                {(meta.model ?? "").replace("claude-", "").replace("-20251001", "")}
              </span>
            )}
          </div>

          {/* Trace panel */}
          {showTrace && trace && (
            <div style={{
              padding: "6px 7px", borderRadius: 5, marginBottom: 6,
              background: C._dark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.04)",
              border: `1px solid ${accent}18`,
            }}>
              <div style={{
                fontSize: 9, color: accent, fontWeight: 700, marginBottom: 4,
                letterSpacing: 0.5, textTransform: "uppercase",
              }}>
                Trace — {trace.duration}ms
              </div>
              {trace.steps.map((step, i) => (
                <TraceRow key={i} step={step} accent={accent} />
              ))}
            </div>
          )}

          {/* Error */}
          {status === "error" && error && (
            <div style={{
              fontSize: 10, color: "#FF6B6B", padding: "5px 8px",
              borderRadius: 5, background: "#FF6B6B0d", lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          {/* Result */}
          {status === "ok" && result && (
            <div style={{
              padding: "7px 9px", borderRadius: 6,
              background: accent + "0d",
              border: `1px solid ${accent}20`,
            }}>
              <div style={{
                fontSize: 9, color: accent, fontWeight: 700, marginBottom: 5,
                letterSpacing: 0.5, textTransform: "uppercase",
              }}>
                Resultado
              </div>
              <ResultView result={result} C={C} accent={accent} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Entity header strip ──────────────────────────────────────

function EntityHeader({ state, activeRef, C }) {
  const accent  = C._dark ? "#8FE3BE" : "#5CBF8A";
  const tickets = state.tickets ?? [];
  const CLOSED  = new Set(["cerrado", "cancelado", "cobrado"]);
  const active  = tickets.filter(t => !CLOSED.has(t.status) && !t._deleted);

  if (activeRef?.type === "ticket") {
    const t = tickets.find(tk => tk.id === activeRef.id);
    const mxn = n => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n ?? 0);
    return (
      <div style={{ padding: "7px 12px", borderBottom: `1px solid ${accent}15` }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 2 }}>
          <span style={{ fontSize: 9, color: C.t3, letterSpacing: 0.4 }}>TICKET ACTIVO</span>
          {t?.priority && (
            <Badge color={t.priority === "P1" ? "#FF6B6B" : t.priority === "P2" ? "#FFA500" : C.t3}>
              {t.priority}
            </Badge>
          )}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.t1, lineHeight: 1.3 }}>
          {t?.titulo ?? activeRef.id}
        </div>
        <div style={{ fontSize: 9, color: accent, marginTop: 1 }}>
          {t?.status} · {mxn(t?.snap?.precioConIVA)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "7px 12px", borderBottom: `1px solid ${accent}15` }}>
      <div style={{ fontSize: 9, color: C.t3, letterSpacing: 0.4, marginBottom: 2 }}>
        CONTEXTO GLOBAL
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.t1 }}>
        {tickets.length} tickets · {(state.units ?? []).length} unidades · {(state.clients ?? []).length} clientes
      </div>
      <div style={{ fontSize: 9, color: C.t2, marginTop: 1 }}>
        {active.length} activos
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────

export default function AIModulesHub({ state, tab, C }) {
  const [open,   setOpen]   = useState(false);
  const [filter, setFilter] = useState("all");

  const engine = useAIEngine(state);
  const accent = C._dark ? "#8FE3BE" : "#5CBF8A";

  // Resolve active entity from current tab context
  const CLOSED = new Set(["cerrado", "cancelado", "cobrado"]);
  const activeRef = (tab === "cotizador" || tab === "tickets")
    ? (() => {
        const active = (state.tickets ?? []).filter(t => !CLOSED.has(t.status) && !t._deleted);
        const p1     = active.filter(t => t.priority === "P1");
        const best   = p1[0] ?? active[0];
        return best ? { type: "ticket", id: best.id } : null;
      })()
    : null;

  const modules = Object.entries(MODULE_REGISTRY).filter(([, def]) => {
    if (filter === "ticket") return def.entityTypes.includes("ticket");
    if (filter === "global") return def.entityTypes.includes("global");
    return true;
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom: 340, right: 16, zIndex: 9050,
          background: C._dark ? "rgba(10,26,16,0.92)" : "rgba(232,245,237,0.95)",
          border: `1px solid ${accent}44`,
          borderRadius: 20, padding: "7px 13px",
          color: accent, fontSize: 11, fontWeight: 700, cursor: "pointer",
          boxShadow: `0 2px 12px ${accent}1a`,
          display: "flex", alignItems: "center", gap: 5,
          backdropFilter: "blur(8px)",
        }}
      >
        <span>✦ IA</span>
        <span style={{ opacity: 0.55, fontSize: 9 }}>{Object.keys(MODULE_REGISTRY).length}</span>
      </button>
    );
  }

  return (
    <div style={{
      position: "fixed", bottom: 80, right: 12, zIndex: 9050,
      width: 320, maxHeight: "76vh",
      background: C._dark ? "rgba(8,18,10,0.97)" : "rgba(248,255,251,0.98)",
      border: `1px solid ${accent}28`,
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 8px 36px rgba(0,0,0,0.38)",
      backdropFilter: "blur(18px)",
      display: "flex", flexDirection: "column",
    }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 12px", borderBottom: `1px solid ${accent}18`,
        background: accent + "0b",
      }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: accent }}>✦ Logisolve IA</span>
          <span style={{ fontSize: 9, color: C.t3, marginLeft: 6 }}>Context Engine v2</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 15, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {/* Entity context strip */}
      <EntityHeader state={state} activeRef={activeRef} C={C} />

      {/* Filter bar */}
      <div style={{
        display: "flex", gap: 4, padding: "5px 9px",
        borderBottom: `1px solid ${accent}12`,
      }}>
        {[["all", "Todos"], ["ticket", "Ticket"], ["global", "Global"]].map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 10,
              background: filter === k ? accent : "transparent",
              color: filter === k ? "#071209" : C.t3,
              border: `1px solid ${filter === k ? accent : (C.border ?? "#1e3022")}`,
              cursor: "pointer", fontWeight: filter === k ? 700 : 400,
              transition: "all 0.1s",
            }}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Module list */}
      <div style={{ overflowY: "auto", flex: 1, padding: "5px 7px" }}>
        {modules.map(([id, def]) => (
          <ModuleRow
            key={id}
            id={id}
            def={def}
            state={state}
            engine={engine}
            C={C}
            activeRef={activeRef}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        padding: "4px 12px", borderTop: `1px solid ${accent}12`,
        fontSize: 8, color: C.t3, letterSpacing: 0.4,
      }}>
        {activeRef
          ? `Contexto: ${activeRef.type} · ${activeRef.id}`
          : "Contexto: global · todos los tickets y unidades"}
      </div>
    </div>
  );
}
