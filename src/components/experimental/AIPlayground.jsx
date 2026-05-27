// ============================================================
// Logisolve — AI Playground (Experimental)
// Sandbox panel. NOT integrated in main app flow.
// Only renders when VITE_ENABLE_AI_EXPERIMENTAL=true
// ============================================================

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Sample inputs for quick testing
const SAMPLE_INPUTS = {
  ticket: {
    id: "T-001",
    titulo: "Motor recalentamiento Eco-12",
    descripcion: "Unidad reporta temperatura elevada en motor, posible fuga de refrigerante",
    status: "abierto",
    prioridad: "alta",
    fechaCreacion: new Date().toISOString(),
  },
  cliente: {
    nombre: "Transportes ACME S.A. de C.V.",
    rfc: "TAC900101ABC",
    saldo: 45000,
    diasCredito: 30,
  },
  unidad: {
    eco: "ECO-12",
    modelo: "Kenworth T680 2021",
    km: 128500,
    status: "taller",
  },
  historial: [
    { tipo: "Mantenimiento", descripcion: "Cambio de aceite completo", fecha: "2024-10-15" },
    { tipo: "Incidencia", descripcion: "Frenado de emergencia en carretera", fecha: "2024-11-02" },
  ],
  prioridad: "alta",
  margen: 22,
  operacion: "Ruta Guadalajara-CDMX, carga refrigerada urgente",
};

export function AIPlayground({ T, darkMode }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [error, setError] = useState(null);
  const [input, setInput] = useState(JSON.stringify(SAMPLE_INPUTS, null, 2));
  const [tab, setTab] = useState("playground"); // playground | logs | feedback
  const [logs, setLogs] = useState([]);
  const abortRef = useRef(null);

  const addLog = (entry) => {
    setLogs((prev) => [
      { ...entry, ts: new Date().toLocaleTimeString("es-MX"), id: Date.now() },
      ...prev.slice(0, 19),
    ]);
  };

  // ── Non-streaming analysis ─────────────────────────────────
  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const t0 = Date.now();
    try {
      const parsedInput = JSON.parse(input);
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: parsedInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setResult(data.result);
      addLog({
        type: "success",
        action: "analyze",
        duration: `${Date.now() - t0}ms`,
        cached: data.cached,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
      addLog({ type: "error", action: "analyze", error: msg });
    } finally {
      setLoading(false);
    }
  };

  // ── Streaming analysis ────────────────────────────────────
  const runStream = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming(true);
    setStreamText("");
    setError(null);
    setResult(null);
    const t0 = Date.now();
    try {
      const parsedInput = JSON.parse(input);
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: parsedInput }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Error ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const chunk = JSON.parse(payload);
            if (chunk.delta) {
              fullText += chunk.delta;
              setStreamText(fullText);
            }
          } catch { /* skip */ }
        }
      }
      addLog({ type: "success", action: "stream", duration: `${Date.now() - t0}ms` });
    } catch (err) {
      if (!ctrl.signal.aborted) {
        const msg = err instanceof Error ? err.message : "Error de stream";
        setError(msg);
        addLog({ type: "error", action: "stream", error: msg });
      }
    } finally {
      setStreaming(false);
    }
  };

  const cancelStream = () => {
    abortRef.current?.abort();
    setStreaming(false);
    addLog({ type: "info", action: "cancelled" });
  };

  const isEnabled = import.meta.env.VITE_ENABLE_AI_EXPERIMENTAL === "true";

  return (
    <div style={{
      maxWidth: 900,
      margin: "0 auto",
      padding: "0 16px 40px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div style={{
          background: "linear-gradient(135deg, #8FFFD1, #6B9FFF)",
          borderRadius: 12,
          padding: "8px 10px",
          fontSize: 20,
        }}>🧪</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T?.text ?? "#fff" }}>
            AI Playground
          </div>
          <div style={{ fontSize: 12, color: T?.textSec ?? "#aaa" }}>
            Entorno experimental — aislado del flujo principal
          </div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <StatusBadge enabled={isEnabled} T={T} />
        </div>
      </div>

      {!isEnabled && (
        <DisabledBanner T={T} />
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["playground", "logs", "feedback"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              border: `1px solid ${tab === t ? (T?.accent ?? "#8FFFD1") : (T?.border ?? "#333")}`,
              background: tab === t ? `${T?.accent ?? "#8FFFD1"}22` : "transparent",
              color: tab === t ? (T?.accent ?? "#8FFFD1") : (T?.textSec ?? "#aaa"),
              cursor: "pointer",
              fontSize: 12,
              fontWeight: tab === t ? 700 : 400,
              fontFamily: "inherit",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "playground" && (
          <motion.div
            key="playground"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <PlaygroundTab
              T={T}
              input={input}
              setInput={setInput}
              result={result}
              streamText={streamText}
              loading={loading}
              streaming={streaming}
              error={error}
              onAnalyze={runAnalysis}
              onStream={runStream}
              onCancel={cancelStream}
              enabled={isEnabled}
            />
          </motion.div>
        )}
        {tab === "logs" && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <LogsTab T={T} logs={logs} onClear={() => setLogs([])} />
          </motion.div>
        )}
        {tab === "feedback" && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <FeedbackTab T={T} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatusBadge({ enabled, T }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "4px 12px",
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      background: enabled ? "#8FFFD122" : "#ff444422",
      border: `1px solid ${enabled ? "#8FFFD144" : "#ff444444"}`,
      color: enabled ? "#8FFFD1" : "#ff6666",
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: enabled ? "#8FFFD1" : "#ff4444",
        boxShadow: enabled ? "0 0 6px #8FFFD1" : "none",
      }} />
      {enabled ? "SANDBOX ACTIVO" : "DESACTIVADO"}
    </div>
  );
}

function DisabledBanner({ T }) {
  return (
    <div style={{
      padding: 16,
      borderRadius: 12,
      background: "#ff444411",
      border: "1px solid #ff444433",
      marginBottom: 20,
      fontSize: 13,
      color: "#ff8888",
    }}>
      ⚠️ Agrega <code style={{ background: "#ffffff11", padding: "2px 6px", borderRadius: 4 }}>VITE_ENABLE_AI_EXPERIMENTAL=true</code> al archivo <code>.env.local</code> para activar el sandbox.
    </div>
  );
}

function PlaygroundTab({
  T, input, setInput, result, streamText,
  loading, streaming, error, onAnalyze, onStream, onCancel, enabled,
}) {
  const panelBg = T?.surface ?? "rgba(255,255,255,0.04)";
  const border = T?.border ?? "rgba(255,255,255,0.08)";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Input */}
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, color: T?.textSec ?? "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Input (JSON)
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!enabled}
          style={{
            width: "100%", boxSizing: "border-box",
            height: 340,
            background: panelBg,
            border: `1px solid ${border}`,
            borderRadius: 12,
            padding: 12,
            fontSize: 11,
            fontFamily: "monospace",
            color: T?.text ?? "#fff",
            resize: "vertical",
            outline: "none",
            opacity: enabled ? 1 : 0.4,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            onClick={onAnalyze}
            disabled={!enabled || loading || streaming}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: enabled && !loading && !streaming
                ? "linear-gradient(135deg, #8FFFD1, #6B9FFF)"
                : "#333",
              color: enabled && !loading && !streaming ? "#0A1A12" : "#666",
              fontSize: 12,
              fontWeight: 700,
              cursor: enabled && !loading && !streaming ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {loading ? "⏳ Analizando…" : "▶ Analizar"}
          </button>
          {streaming ? (
            <button
              onClick={onCancel}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: "1px solid #ff444444",
                background: "#ff444411",
                color: "#ff8888",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              ⏹ Cancelar
            </button>
          ) : (
            <button
              onClick={onStream}
              disabled={!enabled || loading || streaming}
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                border: `1px solid ${border}`,
                background: "transparent",
                color: enabled ? (T?.textSec ?? "#aaa") : "#333",
                fontSize: 12,
                cursor: enabled && !loading ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              📡 Stream
            </button>
          )}
        </div>
      </div>

      {/* Output */}
      <div>
        <label style={{ fontSize: 10, fontWeight: 700, color: T?.textSec ?? "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
          Resultado
        </label>
        <div style={{
          height: 340,
          background: panelBg,
          border: `1px solid ${border}`,
          borderRadius: 12,
          padding: 12,
          overflowY: "auto",
          fontSize: 12,
          fontFamily: "monospace",
          color: T?.text ?? "#fff",
        }}>
          {error && (
            <div style={{ color: "#ff8888", padding: 8, background: "#ff000011", borderRadius: 8, marginBottom: 8 }}>
              ❌ {error}
            </div>
          )}
          {loading && (
            <div style={{ color: T?.textSec ?? "#aaa", textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🧠</div>
              Procesando análisis…
            </div>
          )}
          {streaming && (
            <div style={{ color: T?.text ?? "#fff", whiteSpace: "pre-wrap" }}>
              {streamText}
              <span style={{ animation: "blink 1s infinite", opacity: 0.7 }}>▋</span>
            </div>
          )}
          {result && !loading && !streaming && (
            <ResultView result={result} T={T} />
          )}
          {!result && !loading && !streaming && !error && !streamText && (
            <div style={{ color: T?.textSec ?? "#666", textAlign: "center", paddingTop: 60, fontSize: 13 }}>
              Ejecuta un análisis para ver el resultado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultView({ result, T }) {
  if (!result) return null;
  const urgenciaColor = {
    inmediata: "#ff4444",
    alta: "#ff8800",
    media: "#ffcc00",
    baja: "#8FFFD1",
  }[result.urgencia] ?? "#aaa";

  return (
    <div style={{ fontFamily: "inherit", fontSize: 12 }}>
      {/* Urgencia badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "3px 10px", borderRadius: 20,
        background: `${urgenciaColor}22`,
        border: `1px solid ${urgenciaColor}44`,
        color: urgenciaColor, fontWeight: 700, fontSize: 11,
        marginBottom: 12,
      }}>
        Urgencia: {result.urgencia?.toUpperCase()}
      </div>

      {/* Resumen ejecutivo */}
      <div style={{ marginBottom: 12, padding: 10, background: "rgba(255,255,255,0.04)", borderRadius: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T?.textSec ?? "#aaa", marginBottom: 4, textTransform: "uppercase" }}>Resumen Ejecutivo</div>
        <div style={{ color: T?.text ?? "#fff", lineHeight: 1.5 }}>{result.resumenEjecutivo}</div>
      </div>

      {/* Análisis */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T?.textSec ?? "#aaa", marginBottom: 4, textTransform: "uppercase" }}>Análisis</div>
        <div style={{ color: T?.text ?? "#fff", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{result.analisis}</div>
      </div>

      {/* Riesgos */}
      {result.riesgos?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#ff8888", marginBottom: 6, textTransform: "uppercase" }}>⚠ Riesgos</div>
          {result.riesgos.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <span style={{ color: "#ff8888" }}>•</span>
              <span style={{ color: T?.text ?? "#fff" }}>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recomendaciones */}
      {result.recomendaciones?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#8FFFD1", marginBottom: 6, textTransform: "uppercase" }}>✓ Recomendaciones</div>
          {result.recomendaciones.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
              <span style={{ color: "#8FFFD1" }}>→</span>
              <span style={{ color: T?.text ?? "#fff" }}>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Confianza */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
        <span style={{ fontSize: 10, color: T?.textSec ?? "#aaa" }}>Confianza</span>
        <div style={{ flex: 1, height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
          <div style={{
            width: `${result.confianza ?? 0}%`,
            height: "100%",
            borderRadius: 2,
            background: "linear-gradient(90deg, #8FFFD1, #6B9FFF)",
          }} />
        </div>
        <span style={{ fontSize: 11, color: T?.text ?? "#fff", fontWeight: 700 }}>{result.confianza}%</span>
      </div>
    </div>
  );
}

function LogsTab({ T, logs, onClear }) {
  const border = T?.border ?? "rgba(255,255,255,0.08)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T?.text ?? "#fff" }}>
          Logs de actividad ({logs.length})
        </div>
        <button
          onClick={onClear}
          style={{ fontSize: 11, color: T?.textSec ?? "#aaa", background: "none", border: "none", cursor: "pointer" }}
        >
          Limpiar
        </button>
      </div>
      {logs.length === 0 ? (
        <div style={{ color: T?.textSec ?? "#666", textAlign: "center", padding: 40, fontSize: 13 }}>
          Sin actividad registrada
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {logs.map((log) => (
            <div key={log.id} style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: T?.surface ?? "rgba(255,255,255,0.04)",
              border: `1px solid ${border}`,
              display: "flex", gap: 12, alignItems: "center", fontSize: 12,
            }}>
              <span style={{
                color: log.type === "error" ? "#ff8888" : log.type === "success" ? "#8FFFD1" : "#ffcc00",
              }}>
                {log.type === "error" ? "❌" : log.type === "success" ? "✓" : "ℹ"}
              </span>
              <span style={{ color: T?.textSec ?? "#aaa" }}>{log.ts}</span>
              <span style={{ color: T?.text ?? "#fff", fontWeight: 600 }}>{log.action}</span>
              {log.duration && <span style={{ color: T?.textSec ?? "#aaa" }}>{log.duration}</span>}
              {log.cached && <span style={{ color: "#ffcc00", fontSize: 10 }}>CACHED</span>}
              {log.error && <span style={{ color: "#ff8888" }}>{log.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackTab({ T }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async () => {
    // In production: POST to /api/ai/feedback → Supabase ai_feedback
    setSent(true);
  };

  return (
    <div style={{ maxWidth: 500 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: T?.text ?? "#fff", marginBottom: 20 }}>
        Evalúa la calidad del análisis de IA
      </div>
      {sent ? (
        <div style={{ color: "#8FFFD1", textAlign: "center", padding: 40 }}>
          ✓ Gracias por tu feedback
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                style={{
                  width: 44, height: 44,
                  borderRadius: 8,
                  border: `1px solid ${n <= rating ? "#8FFFD1" : (T?.border ?? "#333")}`,
                  background: n <= rating ? "#8FFFD122" : "transparent",
                  color: n <= rating ? "#8FFFD1" : (T?.textSec ?? "#aaa"),
                  fontSize: 18,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ★
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario opcional…"
            rows={3}
            style={{
              width: "100%", boxSizing: "border-box",
              background: T?.surface ?? "rgba(255,255,255,0.04)",
              border: `1px solid ${T?.border ?? "#333"}`,
              borderRadius: 8, padding: 10, fontSize: 13,
              color: T?.text ?? "#fff", fontFamily: "inherit", resize: "vertical",
              outline: "none", marginBottom: 12,
            }}
          />
          <button
            onClick={submit}
            disabled={rating === 0}
            style={{
              padding: "9px 24px", borderRadius: 10,
              border: "none",
              background: rating > 0 ? "linear-gradient(135deg, #8FFFD1, #6B9FFF)" : "#333",
              color: rating > 0 ? "#0A1A12" : "#666",
              fontSize: 12, fontWeight: 700, cursor: rating > 0 ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            Enviar feedback
          </button>
        </>
      )}
    </div>
  );
}
