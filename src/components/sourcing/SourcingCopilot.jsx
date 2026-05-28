// SourcingCopilot — AI comprador técnico, layout limpio single-column.

import React, { useState, useRef, useCallback, useEffect } from "react";

// ─── Formatters ───────────────────────────────────────────────

const MXN = n => n == null ? "—" :
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

const urgencyColor = { critica: "#FF4444", alta: "#FF8800", media: "#FFA500", baja: null };

// ─── Unit searcher ────────────────────────────────────────────

function UnitSearcher({ units, value, onChange, C, accent, inputBg }) {
  const [query,  setQuery]  = useState("");
  const [open,   setOpen]   = useState(false);
  const wrapRef             = useRef(null);

  const selected = units.find(u => u.id === value) ?? null;

  const label = u =>
    [u.economico ? `Eco.${u.economico}` : null, u.marca, u.modelo, u.anio]
      .filter(Boolean).join(" ");

  const matches = query.trim()
    ? units.filter(u => {
        const q = query.toLowerCase();
        return (
          (u.economico ?? "").toLowerCase().includes(q) ||
          (u.marca     ?? "").toLowerCase().includes(q) ||
          (u.modelo    ?? "").toLowerCase().includes(q) ||
          (u.placa     ?? "").toLowerCase().includes(q) ||
          String(u.anio ?? "").includes(q)
        );
      }).slice(0, 8)
    : units.slice(0, 8);

  useEffect(() => {
    const handler = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = u => {
    onChange(u ? u.id : "");
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div style={{ fontSize: 8, color: C.t3, marginBottom: 3, letterSpacing: 0.4 }}>UNIDAD</div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 4,
          background: inputBg, border: `1px solid ${open ? accent + "55" : C.border}`,
          borderRadius: 6, padding: "4px 7px", cursor: "text",
          transition: "border-color 0.15s",
        }}
        onClick={() => { setOpen(true); }}
      >
        {selected && !open ? (
          <>
            <span style={{ flex: 1, fontSize: 10, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {label(selected)}
            </span>
            <button
              onClick={e => { e.stopPropagation(); select(null); }}
              style={{ background: "none", border: "none", color: C.t3, fontSize: 11, cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
            >×</button>
          </>
        ) : (
          <input
            autoFocus={open}
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={selected ? label(selected) : "Buscar eco, marca, modelo…"}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              fontSize: 10, color: C.t1, fontFamily: "inherit",
              padding: 0, minWidth: 0,
            }}
          />
        )}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, zIndex: 300,
          background: C._dark ? "rgba(14,16,20,0.97)" : "#fff",
          border: `1px solid ${accent}30`, borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
          overflow: "hidden",
        }}>
          {/* Auto-detect option */}
          <div
            onClick={() => select(null)}
            style={{
              padding: "8px 10px", fontSize: 10, cursor: "pointer",
              color: !value ? accent : C.t3,
              background: !value ? accent + "12" : "transparent",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            Auto-detectar
          </div>
          {matches.length === 0 ? (
            <div style={{ padding: "8px 10px", fontSize: 10, color: C.t3 }}>Sin resultados</div>
          ) : (
            matches.map(u => (
              <div
                key={u.id}
                onClick={() => select(u)}
                style={{
                  padding: "8px 10px", cursor: "pointer",
                  background: u.id === value ? accent + "14" : "transparent",
                  borderBottom: `1px solid ${C.border}44`,
                }}
              >
                <div style={{ fontSize: 10, fontWeight: 600, color: u.id === value ? accent : C.t1 }}>
                  {u.economico ? <span style={{ color: accent, marginRight: 5 }}>Eco.{u.economico}</span> : null}
                  {u.marca} {u.modelo} {u.anio ?? ""}
                </div>
                {(u.placa || u.km) && (
                  <div style={{ fontSize: 8, color: C.t3, marginTop: 1 }}>
                    {u.placa ? `Placa ${u.placa}` : ""}{u.placa && u.km ? " · " : ""}{u.km ? `${Number(u.km).toLocaleString()} km` : ""}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Micro components ─────────────────────────────────────────

function Tag({ label, color, C }) {
  const col = color ?? C.t3;
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 700,
      padding: "2px 6px", borderRadius: 4, letterSpacing: 0.4,
      textTransform: "uppercase", background: col + "20", color: col,
    }}>
      {label}
    </span>
  );
}

function SectionHeader({ title, C, accent }) {
  return (
    <div style={{
      fontSize: 8, fontWeight: 700, color: accent,
      letterSpacing: 0.8, textTransform: "uppercase",
      marginBottom: 8,
    }}>
      {title}
    </div>
  );
}

// ─── Result sections ──────────────────────────────────────────

function FaultCard({ data, C, accent }) {
  const { interpretation } = data;
  const unit = interpretation?.unitDetected;
  const uc   = urgencyColor[interpretation?.urgency] ?? accent;
  const pct  = Math.round((data.confidence ?? 0) * 100);

  return (
    <div style={card(C, accent)}>
      {/* Fault */}
      <div style={{ fontSize: 14, fontWeight: 800, color: C.t1, lineHeight: 1.35, marginBottom: 10 }}>
        {interpretation?.faultProbable ?? "—"}
      </div>

      {/* Tags row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
        {unit?.confirmed && (
          <Tag label={`${unit.marca} ${unit.modelo}`} color={accent} C={C} />
        )}
        {interpretation?.urgency && (
          <Tag label={interpretation.urgency} color={uc} C={C} />
        )}
        {interpretation?.criticality && (
          <Tag
            label={interpretation.criticality}
            color={interpretation.criticality === "P1" ? "#FF4444" : interpretation.criticality === "P2" ? "#FFA500" : accent}
            C={C}
          />
        )}
        {interpretation?.system && <Tag label={interpretation.system} C={C} />}
        {interpretation?.subsystem && <Tag label={interpretation.subsystem} C={C} />}
      </div>

      {/* Confidence bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: interpretation?.assumptions?.length ? 10 : 0 }}>
        <span style={{ fontSize: 8, color: C.t3, letterSpacing: 0.4, whiteSpace: "nowrap" }}>CONFIANZA</span>
        <div style={{ flex: 1, height: 4, borderRadius: 2, background: accent + "18" }}>
          <div style={{
            width: `${pct}%`, height: "100%", borderRadius: 2,
            background: pct >= 80 ? accent : pct >= 55 ? "#FFA500" : "#FF6B6B",
            transition: "width 0.6s ease",
          }} />
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: pct >= 80 ? accent : pct >= 55 ? "#FFA500" : "#FF6B6B", minWidth: 28 }}>
          {pct}%
        </span>
      </div>

      {/* Assumptions */}
      {interpretation?.assumptions?.length > 0 && (
        <div style={{
          marginTop: 10, padding: "6px 9px", borderRadius: 5,
          background: "#FFA50011", border: "1px solid #FFA50033",
          fontSize: 9, color: "#FFA500", lineHeight: 1.5,
        }}>
          <strong>Suposiciones:</strong> {interpretation.assumptions.join(" · ")}
        </div>
      )}
    </div>
  );
}

function PartsCard({ parts, C, accent }) {
  if (!parts?.length) return null;
  return (
    <div style={card(C, accent)}>
      <SectionHeader title={`Piezas necesarias · ${parts.length}`} C={C} accent={accent} />
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {parts.map((p, i) => (
          <div key={i} style={{
            padding: "8px 10px", borderRadius: 7,
            background: p.urgente
              ? (C._dark ? "rgba(255,68,68,0.08)" : "rgba(255,68,68,0.05)")
              : (C._dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"),
            border: `1px solid ${p.urgente ? "#FF444420" : accent + "14"}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.t1, flex: 1 }}>{p.nombre}</span>
              {p.urgente && <Tag label="urgente" color="#FF4444" C={C} />}
            </div>
            {(p.oem || p.aftermarket) && (
              <div style={{ display: "flex", gap: 12, marginBottom: p.notas ? 4 : 0 }}>
                {p.oem && (
                  <span style={{ fontSize: 9, color: C.t3 }}>
                    OEM <span style={{ color: C.t2, fontFamily: "monospace" }}>{p.oem}</span>
                  </span>
                )}
                {p.aftermarket && (
                  <span style={{ fontSize: 9, color: C.t3 }}>
                    AM <span style={{ color: C.t2, fontFamily: "monospace" }}>{p.aftermarket}</span>
                  </span>
                )}
              </div>
            )}
            {p.aplicacion && <div style={{ fontSize: 8, color: C.t3 }}>{p.aplicacion}</div>}
            {p.notas && (
              <div style={{ fontSize: 9, color: "#FFA500", marginTop: 4, lineHeight: 1.4 }}>⚠ {p.notas}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SourcingCard({ sourcing, C, accent }) {
  if (!sourcing) return null;
  const { supplierPriority, keywordsSearch, piezasRelacionadas, alternativas } = sourcing;

  return (
    <div style={card(C, accent)}>
      {/* Suppliers */}
      {supplierPriority?.length > 0 && (
        <>
          <SectionHeader title="Proveedores sugeridos" C={C} accent={accent} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {supplierPriority.map((s, i) => (
              <div key={i} style={{
                padding: "8px 10px", borderRadius: 7,
                background: i === 0 ? accent + "0e" : (C._dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
                border: `1px solid ${i === 0 ? accent + "25" : accent + "0a"}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.t1 }}>{s.nombre}</span>
                  {i === 0 && <Tag label="1ª opción" color={accent} C={C} />}
                </div>
                {s.razon && <div style={{ fontSize: 9, color: C.t2, lineHeight: 1.4 }}>{s.razon}</div>}
                {s.contacto && (
                  <div style={{ fontSize: 9, color: accent, marginTop: 3, fontFamily: "monospace" }}>
                    📞 {s.contacto}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Keywords */}
      {keywordsSearch?.length > 0 && (
        <>
          <SectionHeader title="Búsqueda rápida" C={C} accent={accent} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: piezasRelacionadas?.length ? 12 : 0 }}>
            {keywordsSearch.map((kw, i) => (
              <span key={i} style={{
                fontSize: 9, padding: "3px 8px", borderRadius: 4,
                background: C._dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                color: C.t2, fontFamily: "monospace", userSelect: "all", cursor: "pointer",
              }}>
                {kw}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Related parts */}
      {piezasRelacionadas?.length > 0 && (
        <>
          <SectionHeader title="Revisar también" C={C} accent={accent} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {piezasRelacionadas.map((p, i) => (
              <div key={i}>
                <span style={{ fontSize: 10, color: C.t1 }}>• {p.nombre}</span>
                {p.razon && <span style={{ fontSize: 9, color: C.t3 }}> — {p.razon}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Alternatives */}
      {alternativas?.length > 0 && (
        <>
          <SectionHeader title="Alternativas" C={C} accent={accent} />
          {alternativas.map((a, i) => (
            <div key={i} style={{ fontSize: 9, color: C.t2, marginBottom: 3 }}>• {a}</div>
          ))}
        </>
      )}
    </div>
  );
}

function CostCard({ costEstimate, C, accent }) {
  if (!costEstimate) return null;
  return (
    <div style={{ ...card(C, accent), background: C._dark ? "rgba(255,165,0,0.05)" : "rgba(255,165,0,0.04)", borderColor: "#FFA50025" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.t1 }}>
          {MXN(costEstimate.min)} – {MXN(costEstimate.max)}
        </div>
        <Tag label={`confianza ${costEstimate.confidence}`} color="#FFA500" C={C} />
        {costEstimate.includeInstall && <Tag label="incl. M.O." C={C} />}
      </div>
      {costEstimate.basis && (
        <div style={{ fontSize: 9, color: C.t3, lineHeight: 1.5 }}>{costEstimate.basis}</div>
      )}
    </div>
  );
}

function RisksCard({ riesgos, nextSteps, C, accent }) {
  const riskColor = { critico: "#FF4444", alto: "#FF8800", medio: "#FFA500" };
  if (!riesgos?.length && !nextSteps?.length) return null;

  return (
    <div style={card(C, accent)}>
      {riesgos?.length > 0 && (
        <>
          <SectionHeader title="Riesgos" C={C} accent={accent} />
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: nextSteps?.length ? 12 : 0 }}>
            {riesgos.map((r, i) => (
              <div key={i} style={{
                display: "flex", gap: 7, alignItems: "flex-start",
                padding: "6px 8px", borderRadius: 5,
                background: (riskColor[r.nivel] ?? C.t3) + "10",
              }}>
                <span style={{ fontSize: 10, color: riskColor[r.nivel] ?? C.t3 }}>⚠</span>
                <span style={{ fontSize: 9, color: C.t1, lineHeight: 1.45, flex: 1 }}>{r.descripcion}</span>
                <Tag label={r.nivel} color={riskColor[r.nivel]} C={C} />
              </div>
            ))}
          </div>
        </>
      )}

      {nextSteps?.length > 0 && (
        <>
          <SectionHeader title="Próximos pasos" C={C} accent={accent} />
          {nextSteps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: accent, fontWeight: 700, minWidth: 16 }}>{i + 1}.</span>
              <span style={{ fontSize: 10, color: C.t1, lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Create ticket button ─────────────────────────────────────

function CreateTicketBtn({ result, selectedUnit, selectedClient, dispatch, toast, C, accent }) {
  const create = () => {
    const interp = result.interpretation;
    const part   = result.partsNeeded?.[0];
    const now    = new Date();
    const nowStr = now.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
    const id     = `TKT-${now.toISOString().replace(/\D/g, "").slice(0, 12)}-AI`;

    const titulo = part?.nombre
      ? `${part.nombre} — ${interp?.unitDetected?.marca ?? ""} ${interp?.unitDetected?.modelo ?? ""}`.trim()
      : interp?.faultProbable ?? "Refacción sin especificar";

    dispatch({
      type: "TKT_ADD",
      t: {
        id, titulo,
        opId: "general", opShort: "REF-G",
        priority:    interp?.criticality ?? "P2",
        clientId:    selectedClient ?? "",
        supplierId:  "",
        unitId:      selectedUnit ?? interp?.unitDetected?.unitId ?? "",
        partRef:     part?.oem ?? "",
        date:        nowStr,
        status:      "recibido",
        payType:     "credit",
        promesaPago: "", cobrado: false,
        mods:        ["critica", "alta"].includes(interp?.urgency) ? ["urgency"] : [],
        prob:        "medium", horasOp: 0,
        notes: [
          interp?.faultProbable,
          part?.notas,
          result.riesgos?.[0]?.descripcion,
          `[Copilot ${Math.round((result.confidence ?? 0) * 100)}%]`,
        ].filter(Boolean).join(" | "),
        snap: null,
        timeline: [{ ts: now.toISOString(), evento: "Creado desde Sourcing Copilot", actor: "IA" }],
        history: [], _fromCopilot: true,
      },
    });
    toast?.("✓ Ticket creado desde Sourcing Copilot");
  };

  return (
    <button
      onClick={create}
      style={{
        width: "100%", padding: "11px 0", borderRadius: 8,
        background: accent, color: "#071209",
        fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer",
        letterSpacing: 0.2,
      }}
    >
      + Crear ticket desde este análisis
    </button>
  );
}

// ─── Shared card style ────────────────────────────────────────

function card(C, accent) {
  return {
    padding: "14px 16px",
    borderRadius: 10,
    background: C._dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.65)",
    border: `1px solid ${accent}14`,
    marginBottom: 8,
  };
}

// ─── Examples ────────────────────────────────────────────────

const EXAMPLES = [
  "M2 106 clutch duro posible horquilla",
  "F-350 diferencial trasero ruido",
  "Kenworth T680 falla tablero eléctrico",
  "Scania R suspensión delantera golpe",
  "Cascadia frenos ABS luz encendida",
];

// ─── Main component ───────────────────────────────────────────

export default function SourcingCopilot({ state, dispatch, C, toast }) {
  const [needText,       setNeedText]       = useState("");
  const [selectedUnit,   setSelectedUnit]   = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [status,         setStatus]         = useState("idle");
  const [result,         setResult]         = useState(null);
  const [error,          setError]          = useState(null);
  const [meta,           setMeta]           = useState(null);
  const [streamChars,    setStreamChars]    = useState(0);

  const abortRef  = useRef(null);
  const resultRef = useRef(null);
  const accent    = C._dark ? "#8FE3BE" : "#5CBF8A";
  const units     = state.units   ?? [];
  const clients   = state.clients ?? [];

  const analyze = useCallback(async () => {
    if (!needText.trim()) return;
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus("loading");
    setResult(null);
    setError(null);
    setStreamChars(0);

    const client       = clients.find(c => c.id === selectedClient) ?? null;
    const recentTickets = (state.tickets ?? [])
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 5);

    const context = {
      selectedUnitId: selectedUnit || undefined,
      units: units.slice(0, 8).map(u => ({
        id: u.id, marca: u.marca, modelo: u.modelo, anio: u.anio,
        km: u.km, statusOp: u.statusOp, notas: u.notas,
      })),
      parts:         (state.parts     ?? []).slice(0, 10),
      suppliers:     (state.suppliers ?? []).slice(0, 6),
      recentTickets: recentTickets.map(t => ({
        titulo: t.titulo, status: t.status, partRef: t.partRef, notes: t.notes,
        snap: t.snap ? { precioConIVA: t.snap.precioConIVA } : null,
      })),
      client: client ? {
        empresa: client.empresa, category: client.category,
        score: client.score, creditDays: client.creditDays,
      } : null,
    };

    try {
      const res = await fetch("/api/ai/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needText: needText.trim(), context }),
        signal: ctrl.signal,
      });

      const ct = res.headers.get("content-type") ?? "";

      // ── SSE streaming ─────────────────────────────────────────
      if (ct.includes("text/event-stream")) {
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (ctrl.signal.aborted) { reader.cancel(); return; }

          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.startsWith("data: ")) continue;
            let evt;
            try { evt = JSON.parse(part.slice(6).trim()); } catch { continue; }

            if (evt.type === "progress") {
              setStreamChars(evt.chars);
            } else if (evt.type === "result") {
              setResult(evt.result);
              setMeta({ duration_ms: evt.duration_ms, model: evt.model, usage: evt.usage });
              setStatus("ok");
              setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
            } else if (evt.type === "error") {
              setError(evt.error ?? "Error del servidor");
              setStatus("error");
            }
          }
        }
        return;
      }

      // ── Plain JSON (fallback / error pre-stream) ──────────────
      if (!ct.includes("json")) {
        setError(
          res.status === 404
            ? "API no disponible — ejecuta `npm run dev:ai` (vercel dev) o despliega en Vercel con ANTHROPIC_API_KEY configurada."
            : `Error ${res.status}: el servidor no devolvió JSON ni SSE.`
        );
        setStatus("error");
        return;
      }

      const data = await res.json();
      if (ctrl.signal.aborted) return;
      if (data.ok && data.result) {
        setResult(data.result);
        setMeta({ duration_ms: data.duration_ms, model: data.model, usage: data.usage });
        setStatus("ok");
      } else {
        setError(data.error ?? "Error desconocido");
        setStatus("error");
      }

    } catch (e) {
      if (e.name === "AbortError") return;
      setError(
        e.message === "Failed to fetch" || e.message?.includes("NetworkError") || e.message?.includes("pattern")
          ? "Sin conexión al servidor — ¿está corriendo `npm run dev:ai`?"
          : (e.message ?? "Error de red")
      );
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
    setStreamChars(0);
  };

  const inputBg = C._dark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.7)";

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px 80px" }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: accent + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>⚡</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: accent }}>Sourcing Copilot</div>
          <div style={{ fontSize: 9, color: C.t3 }}>Comprador técnico · Flotilla México</div>
        </div>
        <span style={{
          marginLeft: "auto", fontSize: 8, padding: "2px 7px", borderRadius: 4,
          background: accent + "18", color: accent, fontWeight: 700, letterSpacing: 0.6,
        }}>IA</span>
      </div>

      {/* ── Input card ──────────────────────────────────────────── */}
      <div style={{
        padding: "14px 16px", borderRadius: 12,
        background: C._dark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.55)",
        border: `1px solid ${needText ? accent + "44" : accent + "16"}`,
        marginBottom: 10,
        transition: "border-color 0.15s",
      }}>
        <textarea
          value={needText}
          onChange={e => setNeedText(e.target.value)}
          onKeyDown={e => (e.metaKey || e.ctrlKey) && e.key === "Enter" && analyze()}
          placeholder={"Describe la falla o necesidad\nEj: M2 106 clutch duro posible horquilla"}
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box",
            resize: "none", fontSize: 13, lineHeight: 1.55,
            padding: "8px 10px", borderRadius: 7,
            background: inputBg,
            border: `1px solid ${C.border}`,
            color: C.t1, outline: "none", fontFamily: "inherit",
          }}
        />

        {/* Examples */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
          {EXAMPLES.map((ex, i) => (
            <button key={i} onClick={() => setNeedText(ex)} style={{
              fontSize: 9, padding: "3px 7px", borderRadius: 4,
              background: needText === ex ? accent + "22" : (C._dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"),
              color: needText === ex ? accent : C.t3,
              border: `1px solid ${needText === ex ? accent + "44" : "transparent"}`,
              cursor: "pointer",
            }}>
              {ex}
            </button>
          ))}
        </div>

        {/* Selectors */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
          <UnitSearcher
            units={units}
            value={selectedUnit}
            onChange={setSelectedUnit}
            C={C} accent={accent} inputBg={inputBg}
          />
          <div>
            <div style={{ fontSize: 8, color: C.t3, marginBottom: 3, letterSpacing: 0.4 }}>CLIENTE</div>
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} style={{
              width: "100%", fontSize: 10, padding: "5px 8px", borderRadius: 6,
              background: inputBg, border: `1px solid ${C.border}`,
              color: C.t1, outline: "none",
            }}>
              <option value="">Todos</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.empresa}</option>)}
            </select>
          </div>
        </div>

        {/* Context chips + action */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {[
            [units.length, "unidad"],
            [(state.suppliers ?? []).length, "proveedor"],
            [(state.parts ?? []).length, "pieza"],
          ].filter(([n]) => n > 0).map(([n, label]) => (
            <span key={label} style={{
              fontSize: 8, padding: "2px 6px", borderRadius: 3,
              background: accent + "12", color: accent, fontWeight: 600,
            }}>
              {n} {label}{n !== 1 ? "s" : ""}
            </span>
          ))}

          <div style={{ flex: 1 }} />

          {result && (
            <button onClick={reset} style={{
              fontSize: 10, padding: "5px 10px", borderRadius: 6,
              background: "transparent", border: `1px solid ${C.border}`,
              color: C.t3, cursor: "pointer",
            }}>
              ↺ Nueva consulta
            </button>
          )}

          <button
            onClick={analyze}
            disabled={!needText.trim() || status === "loading"}
            style={{
              padding: "7px 18px", borderRadius: 7,
              background: !needText.trim() || status === "loading" ? accent + "22" : accent,
              color: !needText.trim() || status === "loading" ? C.t3 : "#071209",
              fontSize: 11, fontWeight: 700, border: "none",
              cursor: !needText.trim() || status === "loading" ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {status === "loading" ? (
              <>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                {streamChars > 0 ? `${streamChars} chars…` : "Analizando…"}
              </>
            ) : "▶ Analizar"}
          </button>
        </div>

        {/* Meta */}
        {meta && status === "ok" && (
          <div style={{ fontSize: 8, color: C.t3, marginTop: 6, textAlign: "right" }}>
            {meta.duration_ms}ms · {(meta.model ?? "").replace("claude-","").split("-").slice(0,2).join("-")} · {meta.usage?.input_tokens ?? 0}↑ {meta.usage?.output_tokens ?? 0}↓ tok
          </div>
        )}
      </div>

      {/* ── Loading ──────────────────────────────────────────────── */}
      {status === "loading" && (
        <div style={{
          padding: "32px 20px", textAlign: "center",
          background: C._dark ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.4)",
          borderRadius: 12, border: `1px solid ${accent}12`,
        }}>
          <div style={{ fontSize: 28, marginBottom: 10, animation: "pulse 1.5s ease infinite" }}>⚡</div>
          <div style={{ fontSize: 12, color: accent, fontWeight: 600, marginBottom: 4 }}>
            {streamChars > 0 ? "Recibiendo análisis…" : "Consultando al Copilot…"}
          </div>
          {streamChars > 0 && (
            <div style={{ fontSize: 10, color: C.t2 }}>
              {streamChars.toLocaleString("es-MX")} caracteres recibidos
            </div>
          )}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────── */}
      {status === "error" && (
        <div style={{
          padding: "14px 16px", borderRadius: 10,
          background: "#FF444410", border: "1px solid #FF444430",
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#FF6B6B", marginBottom: 5 }}>
            Error al analizar
          </div>
          <div style={{ fontSize: 10, color: "#FF8888", lineHeight: 1.55 }}>{error}</div>
        </div>
      )}

      {/* ── Results ──────────────────────────────────────────────── */}
      {status === "ok" && result && (
        <div ref={resultRef}>
          <FaultCard    data={result}                            C={C} accent={accent} />
          <PartsCard    parts={result.partsNeeded}               C={C} accent={accent} />
          <SourcingCard sourcing={result.sourcing}               C={C} accent={accent} />
          <CostCard     costEstimate={result.costEstimate}       C={C} accent={accent} />
          <RisksCard    riesgos={result.riesgos}
                        nextSteps={result.nextSteps}             C={C} accent={accent} />

          <CreateTicketBtn
            result={result}
            selectedUnit={selectedUnit}
            selectedClient={selectedClient}
            dispatch={dispatch}
            toast={toast}
            C={C}
            accent={accent}
          />
        </div>
      )}
    </div>
  );
}
