// SourcingCopilot — AI-powered sourcing assistant integrated into the operational flow.
// NOT a generic chatbot. NOT isolated prompts.
// Reads live app state (units, clients, suppliers, parts, tickets) and acts as a
// senior buyer / technical advisor for fleet spare parts in Mexico.

import React, { useState, useRef, useCallback, useMemo } from "react";

// ─── Utility ─────────────────────────────────────────────────

function mxn(n) {
  if (!n && n !== 0) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency", currency: "MXN", maximumFractionDigits: 0,
  }).format(n);
}

function confColor(v, accent, C) {
  if (v >= 0.8) return accent;
  if (v >= 0.55) return "#FFA500";
  return "#FF6B6B";
}

// ─── Chip ────────────────────────────────────────────────────

function Chip({ children, color, small }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: small ? 8 : 9, fontWeight: 700,
      padding: small ? "1px 4px" : "2px 6px",
      borderRadius: 3, letterSpacing: 0.4, textTransform: "uppercase",
      background: color + "22", color,
    }}>
      {children}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────

function Section({ title, badge, badgeColor, children, C, accent }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${accent}12` }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 7,
        fontSize: 9, fontWeight: 700, color: accent,
        letterSpacing: 0.7, textTransform: "uppercase",
      }}>
        {title}
        {badge && <Chip color={badgeColor ?? accent} small>{badge}</Chip>}
      </div>
      {children}
    </div>
  );
}

// ─── Confidence bar ───────────────────────────────────────────

function ConfBar({ value, C, accent }) {
  const pct = Math.round((value ?? 0) * 100);
  const col = confColor(value, accent, C);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 2, background: accent + "18" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: col, transition: "width 0.4s" }} />
      </div>
      <span style={{ fontSize: 9, color: col, fontWeight: 700, minWidth: 28, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

// ─── Interpretation panel ─────────────────────────────────────

function InterpretationPanel({ data, C, accent }) {
  const { interpretation, partsNeeded } = data;
  const unit = interpretation?.unitDetected;
  const urgColor = {
    critica: "#FF4444", alta: "#FF8800", media: "#FFA500", baja: accent
  }[interpretation?.urgency] ?? C.t2;

  return (
    <>
      <Section title="Interpretación" badge={`${Math.round((data.confidence ?? 0) * 100)}% confianza`} badgeColor={confColor(data.confidence, accent, C)} C={C} accent={accent}>
        {/* Unit */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 13 }}>🚛</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>
              {unit?.confirmed
                ? `${unit.marca} ${unit.modelo}`
                : <span style={{ color: "#FFA500" }}>Unidad no confirmada</span>
              }
            </span>
            {unit?.confirmed && (
              <Chip color={accent} small>{Math.round((unit.confidence ?? 0) * 100)}% ID</Chip>
            )}
          </div>
          <ConfBar value={unit?.confidence ?? 0} C={C} accent={accent} />
        </div>

        {/* System + fault */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 8, color: C.t3, marginBottom: 2, letterSpacing: 0.4 }}>SISTEMA</div>
            <div style={{ fontSize: 10, color: C.t1 }}>{interpretation?.system ?? "—"}</div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: C.t3, marginBottom: 2, letterSpacing: 0.4 }}>SUBSISTEMA</div>
            <div style={{ fontSize: 10, color: C.t1 }}>{interpretation?.subsystem ?? "—"}</div>
          </div>
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 8, color: C.t3, marginBottom: 3, letterSpacing: 0.4 }}>FALLA PROBABLE</div>
          <div style={{ fontSize: 11, color: C.t1, fontWeight: 600, lineHeight: 1.4 }}>
            {interpretation?.faultProbable ?? "—"}
          </div>
        </div>

        {/* Urgency + criticality */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          <Chip color={urgColor}>{interpretation?.urgency ?? "?"}</Chip>
          <Chip color={interpretation?.criticality === "P1" ? "#FF4444" : interpretation?.criticality === "P2" ? "#FFA500" : accent}>
            {interpretation?.criticality ?? "P?"}
          </Chip>
          {interpretation?.symptoms?.map((s, i) => (
            <Chip key={i} color={C.t3} small>{s}</Chip>
          ))}
        </div>

        {/* Assumptions */}
        {interpretation?.assumptions?.length > 0 && (
          <div style={{
            padding: "5px 7px", borderRadius: 4,
            background: "#FFA50011", border: "1px solid #FFA50033",
            fontSize: 9, color: "#FFA500", lineHeight: 1.5,
          }}>
            <strong>Suposiciones:</strong>{" "}
            {interpretation.assumptions.join(" · ")}
          </div>
        )}
      </Section>

      {/* Parts needed */}
      {partsNeeded?.length > 0 && (
        <Section title="Piezas necesarias" C={C} accent={accent}>
          {partsNeeded.map((p, i) => (
            <div key={i} style={{
              padding: "7px 8px", borderRadius: 6, marginBottom: 5,
              background: p.urgente
                ? (C._dark ? "rgba(255,68,68,0.08)" : "rgba(255,68,68,0.05)")
                : (C._dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
              border: `1px solid ${p.urgente ? "#FF444422" : accent + "15"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.t1 }}>{p.nombre}</span>
                {p.urgente && <Chip color="#FF4444" small>urgente</Chip>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, marginBottom: p.notas ? 4 : 0 }}>
                {p.oem && (
                  <div>
                    <span style={{ fontSize: 8, color: C.t3 }}>OEM </span>
                    <span style={{ fontSize: 9, color: C.t2, fontFamily: "monospace" }}>{p.oem}</span>
                  </div>
                )}
                {p.aftermarket && (
                  <div>
                    <span style={{ fontSize: 8, color: C.t3 }}>AM </span>
                    <span style={{ fontSize: 9, color: C.t2, fontFamily: "monospace" }}>{p.aftermarket}</span>
                  </div>
                )}
              </div>
              {p.aplicacion && (
                <div style={{ fontSize: 8, color: C.t3 }}>{p.aplicacion}</div>
              )}
              {p.notas && (
                <div style={{ fontSize: 9, color: "#FFA500", marginTop: 3, lineHeight: 1.4 }}>
                  ⚠ {p.notas}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}
    </>
  );
}

// ─── Sourcing panel ───────────────────────────────────────────

function SourcingPanel({ data, C, accent }) {
  const { sourcing, costEstimate } = data;

  return (
    <>
      {/* Suppliers */}
      {sourcing?.supplierPriority?.length > 0 && (
        <Section title="Proveedores sugeridos" C={C} accent={accent}>
          {sourcing.supplierPriority.map((s, i) => (
            <div key={i} style={{
              padding: "6px 8px", borderRadius: 5, marginBottom: 4,
              background: i === 0
                ? (accent + "0f")
                : (C._dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
              border: `1px solid ${i === 0 ? accent + "25" : accent + "0d"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                <span style={{ fontSize: 9, color: C.t3, minWidth: 14 }}>{i + 1}.</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.t1 }}>{s.nombre}</span>
                {i === 0 && <Chip color={accent} small>primera opción</Chip>}
              </div>
              <div style={{ fontSize: 9, color: C.t2, marginLeft: 19, lineHeight: 1.4 }}>{s.razon}</div>
              {s.contacto && (
                <div style={{ fontSize: 9, color: accent, marginLeft: 19, marginTop: 2, fontFamily: "monospace" }}>
                  📞 {s.contacto}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Keywords */}
      {sourcing?.keywordsSearch?.length > 0 && (
        <Section title="Keywords de búsqueda" C={C} accent={accent}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {sourcing.keywordsSearch.map((kw, i) => (
              <span key={i} style={{
                fontSize: 9, padding: "3px 7px", borderRadius: 4,
                background: C._dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                color: C.t1, fontFamily: "monospace",
                cursor: "pointer",
                userSelect: "all",
              }}>
                {kw}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Related parts */}
      {sourcing?.piezasRelacionadas?.length > 0 && (
        <Section title="Piezas relacionadas (revisar)" C={C} accent={accent}>
          {sourcing.piezasRelacionadas.map((p, i) => (
            <div key={i} style={{ marginBottom: 4, paddingLeft: 8 }}>
              <span style={{ fontSize: 10, color: C.t1 }}>• {p.nombre}</span>
              {p.razon && (
                <div style={{ fontSize: 9, color: C.t3, marginTop: 1 }}>{p.razon}</div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Alternatives */}
      {sourcing?.alternativas?.length > 0 && (
        <Section title="Alternativas" C={C} accent={accent}>
          {sourcing.alternativas.map((a, i) => (
            <div key={i} style={{ fontSize: 9, color: C.t2, marginBottom: 3, paddingLeft: 8 }}>
              • {a}
            </div>
          ))}
        </Section>
      )}

      {/* Cost estimate */}
      {costEstimate && (
        <Section
          title="Estimación de costo"
          badge="⚠ estimado"
          badgeColor="#FFA500"
          C={C}
          accent={accent}
        >
          <div style={{
            padding: "8px 10px", borderRadius: 6,
            background: "#FFA50010", border: "1px solid #FFA50028",
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.t1, marginBottom: 3 }}>
              {mxn(costEstimate.min)} – {mxn(costEstimate.max)}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              <Chip color="#FFA500">confianza {costEstimate.confidence}</Chip>
              {costEstimate.includeInstall && <Chip color={C.t3} small>incluye mano de obra</Chip>}
            </div>
            <div style={{ fontSize: 9, color: C.t3, lineHeight: 1.4 }}>
              {costEstimate.basis}
            </div>
          </div>
        </Section>
      )}
    </>
  );
}

// ─── Risks + next steps ───────────────────────────────────────

function RisksPanel({ data, C, accent }) {
  const riskColor = { critico: "#FF4444", alto: "#FF8800", medio: "#FFA500" };

  return (
    <>
      {data.riesgos?.length > 0 && (
        <Section title="Riesgos detectados" C={C} accent={accent}>
          {data.riesgos.map((r, i) => (
            <div key={i} style={{
              display: "flex", gap: 6, alignItems: "flex-start",
              padding: "4px 6px", marginBottom: 3, borderRadius: 4,
              background: (riskColor[r.nivel] ?? C.t3) + "10",
            }}>
              <span style={{ fontSize: 10, color: riskColor[r.nivel] ?? C.t3, marginTop: 1 }}>⚠</span>
              <span style={{ fontSize: 9, color: C.t1, lineHeight: 1.4, flex: 1 }}>{r.descripcion}</span>
              <Chip color={riskColor[r.nivel] ?? C.t3} small>{r.nivel}</Chip>
            </div>
          ))}
        </Section>
      )}

      {data.nextSteps?.length > 0 && (
        <Section title="Próximos pasos" C={C} accent={accent}>
          {data.nextSteps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 7, marginBottom: 5, alignItems: "flex-start" }}>
              <span style={{ fontSize: 9, color: accent, fontWeight: 700, minWidth: 14 }}>{i + 1}.</span>
              <span style={{ fontSize: 10, color: C.t1, lineHeight: 1.45 }}>{step}</span>
            </div>
          ))}
        </Section>
      )}
    </>
  );
}

// ─── Create ticket from case ──────────────────────────────────

function CreateTicketButton({ analysisResult, selectedUnit, selectedClient, dispatch, toast, C, accent }) {
  const [creating, setCreating] = useState(false);

  const create = () => {
    if (!analysisResult) return;
    const interp = analysisResult.interpretation;
    const part   = analysisResult.partsNeeded?.[0];

    const nowStr = new Date().toLocaleDateString("es-MX", {
      day: "2-digit", month: "2-digit", year: "numeric",
    }).replace(/\//g, "/");

    const titulo = part?.nombre
      ? `${part.nombre} — ${interp?.unitDetected?.marca ?? ""} ${interp?.unitDetected?.modelo ?? ""}`.trim()
      : interp?.faultProbable ?? "Refacción sin especificar";

    const id = `TKT-${new Date().toISOString().replace(/\D/g, "").slice(0, 12)}-AI`;

    dispatch({
      type: "TKT_ADD",
      t: {
        id,
        titulo,
        opId:        "general",
        opShort:     "REF-G",
        priority:    interp?.criticality ?? "P2",
        clientId:    selectedClient ?? "",
        supplierId:  "",
        unitId:      selectedUnit ?? interp?.unitDetected?.unitId ?? "",
        partRef:     part?.oem ?? "",
        date:        nowStr,
        status:      "recibido",
        payType:     "credit",
        promesaPago: "",
        cobrado:     false,
        mods:        interp?.urgency === "critica" || interp?.urgency === "alta" ? ["urgency"] : [],
        prob:        "medium",
        horasOp:     0,
        notes:       [
          interp?.faultProbable,
          part?.notas,
          analysisResult.riesgos?.[0]?.descripcion,
          `[Generado por Sourcing Copilot — confianza ${Math.round((analysisResult.confidence ?? 0) * 100)}%]`,
        ].filter(Boolean).join(" | "),
        snap:        null,
        timeline:    [{ ts: new Date().toISOString(), evento: "Caso creado desde Sourcing Copilot", actor: "IA" }],
        history:     [],
        _fromCopilot: true,
      },
    });

    setCreating(false);
    toast?.("✓ Ticket creado desde Sourcing Copilot");
  };

  return (
    <div style={{ padding: "10px 0 4px" }}>
      <button
        onClick={create}
        disabled={creating}
        style={{
          width: "100%", padding: "9px 0", borderRadius: 7,
          background: accent, color: "#071209",
          fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
          letterSpacing: 0.3,
        }}
      >
        + Crear ticket desde este análisis
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function SourcingCopilot({ state, dispatch, C, toast }) {
  const [needText,       setNeedText]       = useState("");
  const [selectedUnit,   setSelectedUnit]   = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [status,         setStatus]         = useState("idle"); // idle|loading|ok|error
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState(null);
  const [meta,           setMeta]           = useState(null);
  const [activeTab,      setActiveTab]      = useState("interpretation"); // interpretation|sourcing|risks

  const abortRef = useRef(null);
  const accent   = C._dark ? "#8FE3BE" : "#5CBF8A";

  // Pre-select the first client and unit if only one exists
  const units   = state.units    ?? [];
  const clients = state.clients  ?? [];

  const analyze = useCallback(async () => {
    if (!needText.trim()) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus("loading");
    setResult(null);
    setError(null);

    // Build context snapshot (only what the AI needs)
    const client = clients.find(c => c.id === selectedClient) ?? clients[0] ?? null;
    const recentTickets = (state.tickets ?? [])
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 8);

    const context = {
      units:         units.map(u => ({
        id: u.id, marca: u.marca, modelo: u.modelo, anio: u.anio,
        km: u.km, statusOp: u.statusOp, notas: u.notas,
        label: u.placa || u.economico || (u.vin ?? "").slice(-6) || u.id,
      })),
      parts:         (state.parts     ?? []).slice(0, 15),
      suppliers:     (state.suppliers ?? []).slice(0, 8),
      recentTickets: recentTickets.map(t => ({
        titulo:  t.titulo,
        status:  t.status,
        partRef: t.partRef,
        notes:   t.notes,
        snap:    t.snap ? { precioConIVA: t.snap.precioConIVA } : null,
      })),
      client: client ? {
        empresa: client.empresa, category: client.category,
        score: client.score, creditDays: client.creditDays,
      } : null,
    };

    try {
      const res  = await fetch("/api/ai/sourcing", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ needText: needText.trim(), context }),
        signal:  ctrl.signal,
      });
      const data = await res.json();

      if (ctrl.signal.aborted) return;

      if (data.ok && data.result) {
        setResult(data.result);
        setMeta({ duration_ms: data.duration_ms, model: data.model, usage: data.usage });
        setStatus("ok");
        setActiveTab("interpretation");
      } else {
        setError(data.error ?? data.rawText ?? "Error desconocido");
        setStatus("error");
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      setError(e.message ?? "Error de red");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }, [needText, selectedUnit, selectedClient, state, units, clients]);

  const reset = () => {
    setStatus("idle");
    setResult(null);
    setError(null);
    setNeedText("");
  };

  // ── Page layout (lives in a tab, not a floating overlay) ────
  return (
    <div style={{
      maxWidth: 560, margin: "0 auto",
      padding: "16px 14px",
      display: "flex", flexDirection: "column",
      minHeight: "calc(100vh - 120px)",
    }}>

      {/* ── Header ────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 18 }}>⚡</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: accent }}>Sourcing Copilot</span>
        </div>
        <div style={{ fontSize: 10, color: C.t3, paddingLeft: 26 }}>
          Comprador técnico senior · Refacciones flotilla México
        </div>
      </div>

      {/* ── Input area ────────────────────────────────────────── */}
      <div style={{
        padding: "12px 14px",
        borderBottom: `1px solid ${accent}12`,
        flexShrink: 0,
        background: C._dark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.02)",
      }}>
        <div style={{ fontSize: 9, color: C.t3, marginBottom: 5, letterSpacing: 0.4 }}>
          DESCRIBE LA NECESIDAD OPERATIVA
        </div>
        <textarea
          value={needText}
          onChange={e => setNeedText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && e.metaKey && analyze()}
          placeholder={"Ej: M2 106 clutch duro posible horquilla\n     Ford F-350 diferencial trasero golpe ruido\n     Kenworth T680 falla eléctrica tablero"}
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box",
            resize: "none", fontSize: 11, lineHeight: 1.5,
            padding: "8px 10px", borderRadius: 7,
            background: C._dark ? "#0c1a0f" : "#f0f7f2",
            border: `1px solid ${needText ? accent + "44" : (C.border ?? "#1e3022")}`,
            color: C.t1, outline: "none", fontFamily: "inherit",
            transition: "border-color 0.15s",
          }}
        />

        {/* Selectors */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 7 }}>
          <div>
            <div style={{ fontSize: 8, color: C.t3, marginBottom: 3, letterSpacing: 0.4 }}>UNIDAD</div>
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              style={{
                width: "100%", fontSize: 10, padding: "4px 7px", borderRadius: 5,
                background: C._dark ? "#0c1a0f" : "#f0f7f2",
                border: `1px solid ${C.border ?? "#1e3022"}`,
                color: C.t1, outline: "none",
              }}
            >
              <option value="">Auto-detectar</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>
                  {u.marca} {u.modelo} {u.anio}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 8, color: C.t3, marginBottom: 3, letterSpacing: 0.4 }}>CLIENTE</div>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              style={{
                width: "100%", fontSize: 10, padding: "4px 7px", borderRadius: 5,
                background: C._dark ? "#0c1a0f" : "#f0f7f2",
                border: `1px solid ${C.border ?? "#1e3022"}`,
                color: C.t1, outline: "none",
              }}
            >
              <option value="">Todos</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.empresa}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Analyze button */}
        <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
          <button
            onClick={analyze}
            disabled={!needText.trim() || status === "loading"}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 7,
              background: !needText.trim() || status === "loading"
                ? (C._dark ? "#1a2a1e" : "#d4e9d9")
                : accent,
              color: !needText.trim() || status === "loading" ? C.t3 : "#071209",
              fontSize: 11, fontWeight: 700, border: "none",
              cursor: !needText.trim() || status === "loading" ? "default" : "pointer",
              transition: "all 0.12s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {status === "loading" ? (
              <>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                Analizando…
              </>
            ) : "▶ Analizar"}
          </button>
          {result && (
            <button
              onClick={reset}
              style={{
                padding: "8px 12px", borderRadius: 7,
                background: "transparent",
                border: `1px solid ${C.border ?? "#1e3022"}`,
                color: C.t3, fontSize: 10, cursor: "pointer",
              }}
            >
              ↺ Nueva
            </button>
          )}
        </div>

        {/* Meta */}
        {meta && status === "ok" && (
          <div style={{ fontSize: 8, color: C.t3, marginTop: 5, textAlign: "right" }}>
            {meta.duration_ms}ms · {(meta.model ?? "").replace("claude-", "").split("-").slice(0, 2).join("-")} · {meta.usage?.input_tokens ?? 0}↑ {meta.usage?.output_tokens ?? 0}↓ tokens
          </div>
        )}
      </div>

      {/* ── Loading state ──────────────────────────────────────── */}
      {status === "loading" && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 10, color: C.t3,
        }}>
          <div style={{ fontSize: 28, animation: "pulse 1.5s ease infinite" }}>⚡</div>
          <div style={{ fontSize: 11, color: accent }}>Analizando necesidad operativa…</div>
          <div style={{ fontSize: 9, color: C.t3 }}>Revisando historial, piezas y proveedores</div>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {status === "error" && error && (
        <div style={{ padding: 14 }}>
          <div style={{
            padding: "10px 12px", borderRadius: 7,
            background: "#FF444411", border: "1px solid #FF444433",
            fontSize: 10, color: "#FF6B6B", lineHeight: 1.5,
          }}>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* ── Results ───────────────────────────────────────────── */}
      {status === "ok" && result && (
        <>
          {/* Tab bar */}
          <div style={{
            display: "flex", borderBottom: `1px solid ${accent}12`,
            background: C._dark ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.02)",
            flexShrink: 0,
          }}>
            {[
              ["interpretation", "Interpretación"],
              ["sourcing",       "Sourcing"],
              ["risks",          "Riesgos"],
            ].map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setActiveTab(k)}
                style={{
                  flex: 1, padding: "7px 0", fontSize: 9, fontWeight: 700,
                  background: "transparent", border: "none",
                  color: activeTab === k ? accent : C.t3,
                  borderBottom: activeTab === k ? `2px solid ${accent}` : "2px solid transparent",
                  cursor: "pointer", transition: "all 0.1s",
                  letterSpacing: 0.3,
                }}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 14px" }}>
            {activeTab === "interpretation" && (
              <InterpretationPanel data={result} C={C} accent={accent} />
            )}
            {activeTab === "sourcing" && (
              <SourcingPanel data={result} C={C} accent={accent} />
            )}
            {activeTab === "risks" && (
              <RisksPanel data={result} C={C} accent={accent} />
            )}

            {/* Create ticket — always visible in scrollable area */}
            <CreateTicketButton
              analysisResult={result}
              selectedUnit={selectedUnit}
              selectedClient={selectedClient}
              dispatch={dispatch}
              toast={toast}
              C={C}
              accent={accent}
            />
          </div>
        </>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {status === "idle" && (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 8, padding: 20, textAlign: "center",
        }}>
          <div style={{ fontSize: 32, opacity: 0.3 }}>⚡</div>
          <div style={{ fontSize: 11, color: C.t2, lineHeight: 1.6 }}>
            Describe la necesidad en lenguaje natural.<br />
            El Copilot identifica la falla, las piezas y sugiere proveedores.
          </div>
          <div style={{ fontSize: 9, color: C.t3, lineHeight: 1.6 }}>
            "M2 106 clutch duro posible horquilla"<br />
            "F-350 diferencial ruido recurrente"<br />
            "Scania R falla tablero eléctrico"
          </div>
        </div>
      )}
    </div>
  );
}
