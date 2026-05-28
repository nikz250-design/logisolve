// ============================================================
// Logisolve — AI Test Panel (Experimental)
// Minimal smoke-test UI for /api/ai/test
// Only rendered when VITE_ENABLE_AI_EXPERIMENTAL=true
// NOT integrated in main app flow. Remove after validation.
// ============================================================

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL = "/api/ai/test";

const STATUS_COLOR = {
  idle:    "#6b7280",
  loading: "#f59e0b",
  ok:      "#10b981",
  error:   "#ef4444",
};

export default function AITestPanel() {
  const [prompt, setPrompt]     = useState("¿Cuál es la capital de México?");
  const [result, setResult]     = useState(null);
  const [status, setStatus]     = useState("idle"); // idle | loading | ok | error
  const [errorMsg, setErrorMsg] = useState("");

  async function runTest(e) {
    e.preventDefault();
    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("error");
        // Show full debug JSON so we can see the exact Anthropic error
        setErrorMsg(JSON.stringify(data, null, 2));
      } else {
        setStatus("ok");
        setResult(data);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message ?? "Network error");
    }
  }

  async function runGET() {
    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    try {
      const res  = await fetch(API_URL);
      const data = await res.json();
      if (!res.ok || !data.ok) { setStatus("error"); setErrorMsg(JSON.stringify(data, null, 2)); }
      else { setStatus("ok"); setResult(data); }
    } catch (err) { setStatus("error"); setErrorMsg(err.message); }
  }

  const dot = (
    <span style={{
      display: "inline-block", width: 10, height: 10,
      borderRadius: "50%", background: STATUS_COLOR[status],
      marginRight: 6,
      animation: status === "loading" ? "pulse 1s infinite" : "none",
    }} />
  );

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9000,
      width: 420, background: "#111827",
      border: "1px solid #374151", borderRadius: 12,
      boxShadow: "0 25px 50px rgba(0,0,0,0.6)",
      fontFamily: "monospace", fontSize: 13,
      color: "#f3f4f6",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid #374151",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {dot}
        <span style={{ fontWeight: 700, letterSpacing: 1, color: "#a78bfa" }}>
          AI TEST PANEL
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#6b7280" }}>
          EXPERIMENTAL · no afecta producción
        </span>
      </div>

      {/* Form */}
      <form onSubmit={runTest} style={{ padding: 16 }}>
        <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>
          PROMPT (máx 500 chars)
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          rows={3}
          maxLength={500}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#1f2937", border: "1px solid #374151",
            borderRadius: 6, color: "#f3f4f6", padding: "8px 10px",
            resize: "vertical", fontSize: 13, fontFamily: "monospace",
          }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button
            type="submit"
            disabled={status === "loading"}
            style={{
              flex: 1, padding: "8px 0",
              background: status === "loading" ? "#374151" : "#7c3aed",
              color: "#fff", border: "none", borderRadius: 6,
              cursor: status === "loading" ? "not-allowed" : "pointer",
              fontWeight: 700, letterSpacing: 0.5,
            }}
          >
            {status === "loading" ? "⏳ Enviando…" : "▶ POST /api/ai/test"}
          </button>

          <button
            type="button"
            onClick={runGET}
            disabled={status === "loading"}
            style={{
              padding: "8px 14px",
              background: "#064e3b", color: "#6ee7b7",
              border: "1px solid #065f46", borderRadius: 6,
              cursor: status === "loading" ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            GET
          </button>
        </div>
      </form>

      {/* Result */}
      <AnimatePresence>
        {(status === "ok" || status === "error") && (
          <motion.div
            key="result"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ borderTop: "1px solid #374151", overflow: "hidden" }}
          >
            <div style={{ padding: 16 }}>
              {status === "error" ? (
                <div style={{ color: "#ef4444" }}>
                  <span style={{ fontWeight: 700 }}>✗ ERROR</span>
                  <pre style={{ margin: "6px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {errorMsg}
                  </pre>
                </div>
              ) : (
                <div>
                  <div style={{ color: "#10b981", fontWeight: 700, marginBottom: 8 }}>
                    ✓ OK · {result.duration_ms}ms · {result.model}
                  </div>

                  <div style={{
                    background: "#1f2937", borderRadius: 6,
                    padding: "10px 12px", marginBottom: 10,
                    color: "#e5e7eb", lineHeight: 1.5,
                    whiteSpace: "pre-wrap", wordBreak: "break-word",
                  }}>
                    {result.response}
                  </div>

                  <div style={{
                    display: "flex", gap: 12,
                    fontSize: 11, color: "#9ca3af",
                  }}>
                    <span>📥 {result.usage?.input_tokens} tokens in</span>
                    <span>📤 {result.usage?.output_tokens} tokens out</span>
                    <span>🔑 {result.key_hint}</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS pulse keyframe injected once */}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
    </div>
  );
}
