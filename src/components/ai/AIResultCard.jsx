// ============================================================
// AIResultCard — tarjeta glassmorphism para mostrar resultados IA
// ============================================================

import React from "react";

const NIVEL_COLOR = {
  critico: "#FF7A7A", alto: "#F97316", medio: "#F5C842",
  bajo: "#8FE3BE", verde: "#8FE3BE", amarillo: "#F5C842",
  rojo: "#FF7A7A", alta: "#FF7A7A", media: "#F5C842", baja: "#8FE3BE",
};

function Chip({ label, color, C }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 999,
      background: `${color}18`, border: `1px solid ${color}40`,
      color, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      textTransform: "uppercase",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

function BulletList({ items, color, C }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
      {items.slice(0, 5).map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 8, fontSize: 11, color: C.t2, lineHeight: 1.45 }}>
          <span style={{ color, flexShrink: 0, marginTop: 1 }}>›</span>
          <span>{String(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AIResultCard({ moduleId, result, meta, C }) {
  if (!result) return null;

  const accent = C._dark ? "#8FE3BE" : "#5CBF8A";
  const cardStyle = {
    background: C._dark ? "rgba(22,24,28,0.80)" : "rgba(255,255,255,0.80)",
    backdropFilter: C.glass,
    WebkitBackdropFilter: C.glass,
    border: `1px solid ${C.border}`,
    borderRadius: 18,
    padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 10,
  };

  const labelStyle = { fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: C.t3, textTransform: "uppercase" };
  const valueStyle = { fontSize: 13, fontWeight: 600, color: C.t1, lineHeight: 1.4 };

  // ── Module-specific renderers ──────────────────────────────

  if (moduleId === "cotizacion-analisis") {
    const nivelColor = NIVEL_COLOR[result.viabilidad] ?? accent;
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Chip label={`Viabilidad ${result.viabilidad}`} color={nivelColor} C={C} />
          <span style={{ fontSize: 22, fontWeight: 800, color: nivelColor }}>{result.score}</span>
        </div>
        <p style={{ ...valueStyle, fontSize: 12, color: C.t2, margin: 0 }}>{result.resumen}</p>
        {result.alertas?.length > 0 && (
          <div>
            <div style={labelStyle}>⚠ Alertas</div>
            <BulletList items={result.alertas} color={C.yellow} C={C} />
          </div>
        )}
        {result.sugerencias?.length > 0 && (
          <div>
            <div style={labelStyle}>✦ Sugerencias</div>
            <BulletList items={result.sugerencias} color={accent} C={C} />
          </div>
        )}
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  if (moduleId === "riesgo-operativo") {
    const nivelColor = NIVEL_COLOR[result.nivelRiesgo] ?? accent;
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Chip label={`Riesgo ${result.nivelRiesgo}`} color={nivelColor} C={C} />
          <span style={{ fontSize: 22, fontWeight: 800, color: nivelColor }}>{result.score ?? ""}</span>
        </div>
        {result.accionInmediata && (
          <div style={{ background: `${nivelColor}14`, border: `1px solid ${nivelColor}30`, borderRadius: 10, padding: "8px 12px" }}>
            <div style={labelStyle}>Acción inmediata</div>
            <div style={{ ...valueStyle, fontSize: 12 }}>{result.accionInmediata}</div>
          </div>
        )}
        {result.impactoEstimado && (
          <div>
            <div style={labelStyle}>Impacto estimado</div>
            <div style={{ fontSize: 12, color: C.t2 }}>{result.impactoEstimado}</div>
          </div>
        )}
        {result.factoresRiesgo?.length > 0 && (
          <div>
            <div style={labelStyle}>Factores de riesgo</div>
            <BulletList items={result.factoresRiesgo} color={nivelColor} C={C} />
          </div>
        )}
        {result.recomendaciones?.length > 0 && (
          <div>
            <div style={labelStyle}>Recomendaciones</div>
            <BulletList items={result.recomendaciones} color={accent} C={C} />
          </div>
        )}
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  if (moduleId === "recomendacion-margen") {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={labelStyle}>Margen sugerido</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: accent, lineHeight: 1 }}>{result.margenSugerido}%</div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontSize: 10, color: C.t3 }}>Rango: {result.rangoMin}% – {result.rangoMax}%</div>
            {result.diferenciaMXN !== 0 && (
              <div style={{ fontSize: 10, color: result.diferenciaMXN > 0 ? accent : C.red }}>
                {result.diferenciaMXN > 0 ? "+" : ""}${Number(result.diferenciaMXN).toLocaleString("es-MX")} vs actual
              </div>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: C.t2, margin: 0, lineHeight: 1.45 }}>{result.justificacion}</p>
        {result.advertencia && (
          <div style={{ fontSize: 11, color: C.yellow, background: C.yellowDim, borderRadius: 8, padding: "6px 10px" }}>
            ⚠ {result.advertencia}
          </div>
        )}
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  if (moduleId === "resumen-ejecutivo") {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 13, color: C.t1, lineHeight: 1.6, fontStyle: "italic" }}>
          "{result.resumen}"
        </div>
        {result.puntosClave?.length > 0 && (
          <div>
            <div style={labelStyle}>Puntos clave</div>
            <BulletList items={result.puntosClave} color={accent} C={C} />
          </div>
        )}
        {result.llamadaAccion && (
          <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>→ {result.llamadaAccion}</div>
        )}
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  if (moduleId === "notas-a-ticket") {
    const priColor = { P1: C.p1, P2: C.p2, P3: C.p3 }[result.prioridad] ?? accent;
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Chip label={result.prioridad ?? "P2"} color={priColor} C={C} />
          {result.urgente && <Chip label="URGENTE" color={C.red} C={C} />}
        </div>
        <div>
          <div style={labelStyle}>Título</div>
          <div style={valueStyle}>{result.titulo}</div>
        </div>
        <div>
          <div style={labelStyle}>Descripción</div>
          <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.45 }}>{result.descripcion}</div>
        </div>
        {result.piezas?.length > 0 && (
          <div>
            <div style={labelStyle}>Piezas identificadas</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {result.piezas.map((p, i) => (
                <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: C.bg3, border: `1px solid ${C.border}`, color: C.t2 }}>{p}</span>
              ))}
            </div>
          </div>
        )}
        {result.estimadoHoras && (
          <div style={{ fontSize: 11, color: C.t3 }}>⏱ Estimado: {result.estimadoHoras}h</div>
        )}
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  if (moduleId === "priorizacion") {
    const priColor = { P1: C.p1, P2: C.p2, P3: C.p3 };
    return (
      <div style={cardStyle}>
        {result.accionUrgente && (
          <div style={{ background: C.redDim, border: `1px solid ${C.p1}30`, borderRadius: 10, padding: "8px 12px" }}>
            <div style={labelStyle}>⚡ Acción urgente</div>
            <div style={{ fontSize: 12, color: C.t1 }}>{result.accionUrgente}</div>
          </div>
        )}
        <div>
          <div style={labelStyle}>Orden de prioridades</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 6 }}>
            {(result.priorizacion ?? []).slice(0, 8).map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                <span style={{ minWidth: 16, fontSize: 10, color: C.t3, marginTop: 2 }}>{i + 1}.</span>
                <Chip label={t.prioridad} color={priColor[t.prioridad] ?? accent} C={C} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: C.t3, fontFamily: "monospace" }}>{t.id}</div>
                  <div style={{ fontSize: 11, color: C.t2 }}>{t.razon}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {result.resumen && <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>{result.resumen}</p>}
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  if (moduleId === "unidades-detenidas") {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 12 }}>
          <div>
            <div style={labelStyle}>En riesgo</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.red, lineHeight: 1 }}>{result.totalEnRiesgo ?? (result.criticas?.length ?? 0)}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={labelStyle}>Prioridad</div>
            <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.4 }}>{result.prioridadAccion}</div>
          </div>
        </div>
        {(result.criticas ?? []).slice(0, 5).map((u, i) => {
          const rc = NIVEL_COLOR[u.riesgo] ?? accent;
          return (
            <div key={i} style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 10, background: `${rc}10`, border: `1px solid ${rc}25` }}>
              <Chip label={`ECO ${u.eco}`} color={rc} C={C} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.t1 }}>{u.accion}</div>
                <div style={{ fontSize: 10, color: C.t3 }}>{u.impacto}</div>
              </div>
            </div>
          );
        })}
        <p style={{ fontSize: 12, color: C.t2, margin: 0 }}>{result.resumen}</p>
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  if (moduleId === "whatsapp-cliente") {
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Chip label={result.tono ?? "amigable"} color={accent} C={C} />
          <span style={{ fontSize: 14 }}>{result.emoji}</span>
        </div>
        <div style={{
          background: C._dark ? "rgba(37,211,102,0.08)" : "rgba(37,211,102,0.12)",
          border: "1px solid rgba(37,211,102,0.25)",
          borderRadius: 14, padding: "12px 14px",
          fontSize: 13, color: C.t1, lineHeight: 1.6, whiteSpace: "pre-wrap",
        }}>
          {result.mensaje}
        </div>
        <button
          onClick={() => { try { navigator.clipboard.writeText(result.mensaje); } catch {} }}
          style={{
            alignSelf: "flex-start", padding: "6px 14px", borderRadius: 999,
            background: "rgba(37,211,102,0.15)", border: "1px solid rgba(37,211,102,0.35)",
            color: "#25D366", fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}
        >
          📋 Copiar mensaje
        </button>
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  if (moduleId === "resumen-financiero") {
    const semaforoColor = { verde: "#8FE3BE", amarillo: "#F5C842", rojo: "#FF7A7A" }[result.semaforo] ?? accent;
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Chip label={`Semáforo ${result.semaforo}`} color={semaforoColor} C={C} />
        </div>
        {result.headline && (
          <div style={{ fontSize: 15, fontWeight: 700, color: C.t1, lineHeight: 1.3 }}>{result.headline}</div>
        )}
        <p style={{ fontSize: 12, color: C.t2, margin: 0, lineHeight: 1.5 }}>{result.resumen}</p>
        {result.alertas?.length > 0 && (
          <div>
            <div style={labelStyle}>⚠ Alertas</div>
            <BulletList items={result.alertas} color={C.red} C={C} />
          </div>
        )}
        {result.tendencias?.length > 0 && (
          <div>
            <div style={labelStyle}>Tendencias</div>
            <BulletList items={result.tendencias} color={C.yellow} C={C} />
          </div>
        )}
        {result.recomendaciones?.length > 0 && (
          <div>
            <div style={labelStyle}>Recomendaciones</div>
            <BulletList items={result.recomendaciones} color={accent} C={C} />
          </div>
        )}
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  if (moduleId === "upsell-crosssell") {
    const potencialColor = { alto: "#8FE3BE", medio: "#F5C842", bajo: "#7E848E" }[result.potencial] ?? accent;
    return (
      <div style={cardStyle}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
          <Chip label={`Potencial ${result.potencial}`} color={potencialColor} C={C} />
          {result.impactoTotal > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: potencialColor }}>
              +${Number(result.impactoTotal).toLocaleString("es-MX")} MXN
            </span>
          )}
        </div>
        {(result.sugerencias ?? []).slice(0, 4).map((s, i) => {
          const tc = s.tipo === "upsell" ? accent : C.purple;
          return (
            <div key={i} style={{ padding: "8px 10px", borderRadius: 10, background: `${tc}0F`, border: `1px solid ${tc}25` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 3 }}>
                <Chip label={s.tipo} color={tc} C={C} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{s.servicio}</span>
                {s.valorEstimado > 0 && (
                  <span style={{ marginLeft: "auto", fontSize: 11, color: tc, fontWeight: 700 }}>
                    ${Number(s.valorEstimado).toLocaleString("es-MX")}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: C.t2 }}>{s.razon}</div>
            </div>
          );
        })}
        {result.mensajeVenta && (
          <div style={{ fontSize: 12, color: C.t2, borderTop: `1px solid ${C.border}`, paddingTop: 8, fontStyle: "italic" }}>
            "{result.mensajeVenta}"
          </div>
        )}
        {meta && <MetaRow meta={meta} C={C} />}
      </div>
    );
  }

  // Generic fallback for any module
  return (
    <div style={cardStyle}>
      <pre style={{ fontSize: 10, color: C.t2, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>
        {JSON.stringify(result, null, 2)}
      </pre>
      {meta && <MetaRow meta={meta} C={C} />}
    </div>
  );
}

function MetaRow({ meta, C }) {
  return (
    <div style={{ display: "flex", gap: 10, fontSize: 9, color: C.t4, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
      <span>{meta.model?.split("-").slice(1, 3).join("-")}</span>
      <span>{meta.duration_ms}ms</span>
      <span>{meta.usage?.input_tokens}↑ {meta.usage?.output_tokens}↓ tokens</span>
    </div>
  );
}
