// AutoInsight — floating card that surfaces AI insights automatically.
// Appears when the system detects an operational event (ticket delivered,
// ticket saved). No user click required to trigger it.

import React, { useState, useEffect, useCallback } from "react";

const MXN = n =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n ?? 0);

// ─── WhatsApp insight card ────────────────────────────────────

function WhatsAppCard({ insight, onDismiss, C, accent }) {
  const [copied, setCopied] = useState(false);
  const msg = insight.result?.mensaje ?? insight.result?.raw ?? "";

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [msg]);

  return (
    <div style={cardStyle(accent, C)}>
      <Header
        icon="💬"
        title="Mensaje WhatsApp listo"
        sub={insight.ticket?.titulo}
        onDismiss={onDismiss}
        C={C}
        accent={accent}
      />

      {insight.status === "loading" && <LoadingRow C={C} accent={accent} text="Redactando mensaje…" />}

      {insight.status === "error" && <ErrorRow error={insight.error} C={C} />}

      {insight.status === "ok" && msg && (
        <div style={{ padding: "0 12px 12px" }}>
          <div style={{
            padding: "8px 10px", borderRadius: 7,
            background: C._dark ? "rgba(37,211,102,0.07)" : "rgba(37,211,102,0.06)",
            border: "1px solid rgba(37,211,102,0.2)",
            fontSize: 11, color: C.t1, lineHeight: 1.6,
            whiteSpace: "pre-wrap", marginBottom: 8,
            fontFamily: "inherit",
          }}>
            {msg}
          </div>
          <button
            onClick={copy}
            style={{
              width: "100%", padding: "7px 0", borderRadius: 6,
              background: copied ? "rgba(37,211,102,0.15)" : accent,
              color: copied ? "rgba(37,211,102,0.9)" : "#071209",
              fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {copied ? "✓ Copiado" : "Copiar mensaje"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Margin insight card ──────────────────────────────────────

function MarginCard({ insight, onDismiss, C, accent }) {
  const r = insight.result;
  const suggested   = r?.margenSugerido;
  const current     = insight.ticket?.snap?.margenNetoPrecio ?? 0;
  const delta       = suggested ? (suggested - current).toFixed(1) : null;
  const priceSugg   = r?.precioSugeridoConIVA;
  const currentPrice = insight.ticket?.snap?.precioConIVA ?? 0;
  const priceDelta  = priceSugg && currentPrice ? priceSugg - currentPrice : null;

  const isUnder = delta && parseFloat(delta) > 0;

  return (
    <div style={cardStyle(accent, C)}>
      <Header
        icon="💰"
        title="Sugerencia de margen"
        sub={insight.ticket?.titulo}
        onDismiss={onDismiss}
        C={C}
        accent={accent}
      />

      {insight.status === "loading" && <LoadingRow C={C} accent={accent} text="Calculando margen óptimo…" />}

      {insight.status === "error" && <ErrorRow error={insight.error} C={C} />}

      {insight.status === "ok" && r && (
        <div style={{ padding: "0 12px 12px" }}>
          {/* Main numbers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div style={metaBox(C)}>
              <div style={{ fontSize: 8, color: C.t3, marginBottom: 2, letterSpacing: 0.4 }}>MARGEN ACTUAL</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: current < 20 ? "#FF6B6B" : C.t2 }}>
                {current.toFixed(1)}%
              </div>
            </div>
            <div style={metaBox(accent + "15")}>
              <div style={{ fontSize: 8, color: accent, marginBottom: 2, letterSpacing: 0.4 }}>SUGERIDO</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: accent }}>
                {suggested?.toFixed(1) ?? "—"}%
              </div>
            </div>
          </div>

          {/* Delta pill */}
          {delta && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 7,
              padding: "3px 8px", borderRadius: 12,
              background: isUnder ? "#FFA50015" : accent + "15",
              fontSize: 10, fontWeight: 700,
              color: isUnder ? "#FFA500" : accent,
            }}>
              {isUnder ? `+${delta}% potencial` : `${delta}% (ya en rango)`}
              {priceDelta && priceDelta > 0 && ` · +${MXN(priceDelta)} MXN`}
            </div>
          )}

          {/* Justification */}
          {r.justificacion && (
            <div style={{ fontSize: 10, color: C.t2, lineHeight: 1.5, marginBottom: 6 }}>
              {r.justificacion}
            </div>
          )}

          {/* Range */}
          {r.rangoMin != null && r.rangoMax != null && (
            <div style={{ fontSize: 9, color: C.t3 }}>
              Rango: {r.rangoMin}%–{r.rangoMax}%
            </div>
          )}

          {/* Warning */}
          {r.advertencia && (
            <div style={{
              marginTop: 6, padding: "5px 8px", borderRadius: 5,
              background: "#FFA50011", fontSize: 9, color: "#FFA500", lineHeight: 1.4,
            }}>
              ⚠ {r.advertencia}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────

function Header({ icon, title, sub, onDismiss, C, accent }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      padding: "10px 12px 8px",
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: accent }}>{title}</span>
          <span style={{
            fontSize: 8, padding: "1px 5px", borderRadius: 3,
            background: accent + "18", color: accent,
            fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase",
          }}>
            IA
          </span>
        </div>
        {sub && (
          <div style={{
            fontSize: 9, color: C.t3, paddingLeft: 20,
            maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {sub}
          </div>
        )}
      </div>
      <button
        onClick={onDismiss}
        style={{ background: "none", border: "none", color: C.t3, cursor: "pointer", fontSize: 16, lineHeight: 1, marginTop: -2 }}
      >
        ×
      </button>
    </div>
  );
}

function LoadingRow({ text, accent, C }) {
  return (
    <div style={{ padding: "8px 12px 12px", display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ display: "inline-block", animation: "spin 1s linear infinite", fontSize: 12 }}>⟳</span>
      <span style={{ fontSize: 10, color: C.t2 }}>{text}</span>
    </div>
  );
}

function ErrorRow({ error, C }) {
  return (
    <div style={{ padding: "6px 12px 10px", fontSize: 10, color: "#FF6B6B" }}>
      {error}
    </div>
  );
}

function cardStyle(accent, C) {
  return {
    background: C._dark ? "rgba(6,14,8,0.97)" : "rgba(246,255,249,0.98)",
    border: `1px solid ${accent}30`,
    borderRadius: 12,
    minWidth: 280, maxWidth: 320,
    boxShadow: `0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px ${accent}10`,
    overflow: "hidden",
    backdropFilter: "blur(20px)",
    animation: "slideUp 220ms cubic-bezier(.22,.8,.22,1) both",
  };
}

function metaBox(bg) {
  return {
    padding: "7px 9px", borderRadius: 6,
    background: typeof bg === "string" ? bg : "rgba(255,255,255,0.04)",
  };
}

// ─── Auto-dismiss wrapper ─────────────────────────────────────

function TimedCard({ insight, onDismiss, C, accent }) {
  // Auto-dismiss after 45s for "ok" cards, 15s for errors
  useEffect(() => {
    if (insight.status === "loading") return;
    const delay = insight.status === "ok" ? 45_000 : 15_000;
    const timer = setTimeout(onDismiss, delay);
    return () => clearTimeout(timer);
  }, [insight.status, onDismiss]);

  if (insight.type === "whatsapp") {
    return <WhatsAppCard insight={insight} onDismiss={onDismiss} C={C} accent={accent} />;
  }
  if (insight.type === "margin") {
    return <MarginCard insight={insight} onDismiss={onDismiss} C={C} accent={accent} />;
  }
  return null;
}

// ─── Container — renders all active insights stacked ─────────

export default function AutoInsight({ insights, onDismiss, C }) {
  const accent = C._dark ? "#8FE3BE" : "#5CBF8A";

  if (!insights.length) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 90,
      left: 12,
      zIndex: 9200,
      display: "flex",
      flexDirection: "column-reverse",
      gap: 10,
      pointerEvents: "none",
    }}>
      {insights.map(insight => (
        <div key={insight.id} style={{ pointerEvents: "all" }}>
          <TimedCard
            insight={insight}
            onDismiss={() => onDismiss(insight.id)}
            C={C}
            accent={accent}
          />
        </div>
      ))}
    </div>
  );
}
