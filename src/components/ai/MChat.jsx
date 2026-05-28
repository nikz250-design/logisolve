// MChat — conversational AI assistant, mobile-first
// Supports text streaming + quote generation

import React, { useState, useRef, useEffect, useCallback } from "react";

const MXN = n => n == null ? "—" :
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);

// ── QuoteCard — renders a structured quote + create button ────
function QuoteCard({ data, onCreateTicket, C, accent }) {
  return (
    <div style={{
      borderRadius: 12, overflow: "hidden",
      border: `1px solid ${accent}30`,
      background: C._dark ? "rgba(143,227,190,0.05)" : "rgba(143,227,190,0.08)",
      marginTop: 6,
    }}>
      <div style={{
        padding: "10px 14px",
        background: accent + "15",
        borderBottom: `1px solid ${accent}20`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: accent }}>Cotización sugerida</span>
        <span style={{
          fontSize: 8, padding: "2px 6px", borderRadius: 4,
          background: accent + "20", color: accent, fontWeight: 700, letterSpacing: 0.5,
        }}>
          {data.urgencia?.toUpperCase()}
        </span>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.t1, marginBottom: 8 }}>{data.titulo}</div>
        {data.partes?.map((p, i) => (
          <div key={i} style={{
            padding: "7px 0",
            borderTop: i > 0 ? `1px solid ${C._dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` : "none",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: C.t1 }}>{p.nombre}</div>
                {p.oem && <div style={{ fontSize: 9, color: C.t3, fontFamily: "monospace" }}>OEM {p.oem}</div>}
                {p.notas && <div style={{ fontSize: 9, color: "#FFA500", marginTop: 2 }}>{p.notas}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: accent }}>{MXN(p.precioSugerido)}</div>
                <div style={{ fontSize: 9, color: C.t3 }}>{MXN(p.costoEstimado)} costo</div>
              </div>
            </div>
          </div>
        ))}
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: `1px solid ${accent}20`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 9, color: C.t3 }}>Total venta</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.t1 }}>{MXN(data.precioTotal)}</div>
          </div>
          <button
            onClick={() => onCreateTicket(data)}
            style={{
              padding: "9px 16px", borderRadius: 10,
              background: accent, color: "#071209",
              fontSize: 11, fontWeight: 800, border: "none", cursor: "pointer",
              letterSpacing: 0.3,
            }}
          >
            + Crear ticket
          </button>
        </div>
        {data.notas && (
          <div style={{ fontSize: 9, color: C.t3, marginTop: 8, lineHeight: 1.5 }}>{data.notas}</div>
        )}
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────
function Bubble({ msg, onCreateTicket, C, accent }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 10,
      padding: "0 16px",
    }}>
      <div style={{ maxWidth: "82%" }}>
        <div style={{
          padding: "9px 13px", borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          background: isUser
            ? (C._dark ? "rgba(143,227,190,0.18)" : "rgba(92,191,138,0.15)")
            : (C._dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)"),
          border: `1px solid ${isUser ? accent + "30" : C._dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
        }}>
          <div style={{
            fontSize: 13, color: C.t1, lineHeight: 1.55,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {msg.content}
            {msg.streaming && (
              <span style={{ display: "inline-block", width: 6, height: 12, marginLeft: 2,
                background: accent, borderRadius: 1, animation: "pulse 0.8s ease infinite", verticalAlign: "text-bottom" }}/>
            )}
          </div>
        </div>
        {msg.quote && (
          <QuoteCard data={msg.quote} onCreateTicket={onCreateTicket} C={C} accent={accent} />
        )}
      </div>
    </div>
  );
}

// ── Quick prompts ─────────────────────────────────────────────
const QUICK = [
  "¿Qué piezas son compatibles con M2 106?",
  "Cotiza clutch completo Freightliner M2",
  "¿Cuánto cuesta un diferencial Kenworth?",
  "Busca filtro de aceite para Cummins ISB 6.7",
];

// ── Main component ────────────────────────────────────────────
export default function MChat({ state, dispatch, C, toast }) {
  const accent    = C._dark ? "#8FE3BE" : "#5CBF8A";
  const units     = state.units     ?? [];
  const parts     = state.parts     ?? [];
  const suppliers = state.suppliers ?? [];
  const clients   = state.clients   ?? [];
  const tickets   = state.tickets   ?? [];

  const [messages,    setMessages]    = useState([]);
  const [input,       setInput]       = useState("");
  const [loading,     setLoading]     = useState(false);
  const abortRef  = useRef(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const buildContext = () => ({
    units:     units.slice(0, 10).map(u => ({ id:u.id, marca:u.marca, modelo:u.modelo, anio:u.anio, km:u.km, economico:u.economico })),
    parts:     parts.slice(0, 15).map(p => ({ nombre:p.nombre, oem:p.oem, aftermarket:p.aftermarket, ultimoPrecio:p.ultimoPrecio })),
    suppliers: suppliers.slice(0, 6).map(s => ({ nombre:s.nombre, especialidad:s.especialidad, contacto:s.contacto })),
    tickets:   tickets.slice(0, 5).map(t => ({ titulo:t.titulo, status:t.status, snap: t.snap ? { precioConIVA:t.snap.precioConIVA } : null })),
  });

  const send = useCallback(async (text) => {
    const userMsg = text.trim();
    if (!userMsg || loading) return;

    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const userEntry = { role: "user", content: userMsg };
    const aiId = Date.now();
    const aiEntry = { id: aiId, role: "assistant", content: "", streaming: true, quote: null };

    setMessages(prev => [...prev, userEntry, aiEntry]);
    setInput("");
    setLoading(true);

    const history = [...messages, userEntry].map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, context: buildContext() }),
        signal: ctrl.signal,
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("text/event-stream")) {
        const txt = ct.includes("json") ? (await res.json()).error : `Error ${res.status}`;
        setMessages(prev => prev.map(m => m.id === aiId
          ? { ...m, content: txt ?? "Error del servidor", streaming: false }
          : m
        ));
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (ctrl.signal.aborted) { reader.cancel(); return; }

        buf += decoder.decode(value, { stream: true });
        const chunks = buf.split("\n\n");
        buf = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          let evt;
          try { evt = JSON.parse(chunk.slice(6).trim()); } catch { continue; }

          if (evt.type === "text") {
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, content: m.content + evt.delta } : m
            ));
          } else if (evt.type === "quote") {
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, quote: evt.data } : m
            ));
          } else if (evt.type === "done" || evt.type === "error") {
            setMessages(prev => prev.map(m =>
              m.id === aiId ? { ...m, streaming: false,
                content: evt.type === "error" && !m.content ? (evt.error ?? "Error") : m.content,
              } : m
            ));
          }
        }
      }

      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, streaming: false } : m));

    } catch (e) {
      if (e.name === "AbortError") return;
      setMessages(prev => prev.map(m =>
        m.id === aiId ? { ...m, content: e.message ?? "Error de red", streaming: false } : m
      ));
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [messages, loading, units, parts, suppliers, tickets]);

  const createTicket = useCallback((quoteData) => {
    const now    = new Date();
    const nowStr = now.toLocaleDateString("es-MX", { day:"2-digit", month:"2-digit", year:"numeric" });
    const id     = `TKT-${now.toISOString().replace(/\D/g,"").slice(0,12)}-CHAT`;

    // Match client/unit by name suggestion
    const client  = clients.find(c => c.empresa === quoteData.clienteSugerido) ?? null;
    const unit    = units.find(u =>
      `${u.marca} ${u.modelo}`.toLowerCase().includes((quoteData.unidadSugerida ?? "").toLowerCase())
    ) ?? null;

    dispatch({
      type: "TKT_ADD",
      t: {
        id,
        titulo:      quoteData.titulo,
        opId:        "general", opShort: "REF-G",
        priority:    quoteData.urgencia === "critica" ? "P1" : quoteData.urgencia === "alta" ? "P2" : "P3",
        clientId:    client?.id ?? "",
        supplierId:  "",
        unitId:      unit?.id ?? "",
        partRef:     quoteData.partes?.[0]?.oem ?? "",
        date:        nowStr,
        status:      "recibido",
        payType:     "credit",
        promesaPago: "", cobrado: false, mods: [], prob: "medium", horasOp: 0,
        notes:       quoteData.notas ?? "",
        snap:        null,
        history:     [],
        _fromChat:   true,
      },
    });
    toast?.("✓ Ticket creado desde Chat IA");
  }, [dispatch, clients, units, toast]);

  const inputBg = C._dark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.8)";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "transparent" }}>

      {/* Header */}
      <div style={{
        padding: "16px 16px 12px", flexShrink: 0,
        borderBottom: `1px solid ${C._dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
        background: C._dark ? "rgba(7,9,9,0.85)" : "rgba(248,247,244,0.85)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, background: accent + "18",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
          }}>💬</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: accent }}>Asistente IA</div>
            <div style={{ fontSize: 9, color: C.t3 }}>Piezas · Precios · Cotizaciones</div>
          </div>
          {loading && (
            <span style={{ marginLeft: "auto", fontSize: 9, color: C.t3, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
              Pensando…
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", paddingTop: 12, paddingBottom: 6 }}>

        {/* Empty state */}
        {messages.length === 0 && (
          <div style={{ padding: "20px 16px" }}>
            <div style={{ fontSize: 11, color: C.t3, marginBottom: 12, textAlign: "center" }}>
              Pregúntame sobre piezas, precios o solicita una cotización
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {QUICK.map((q, i) => (
                <button key={i} onClick={() => send(q)} style={{
                  padding: "10px 14px", borderRadius: 10, textAlign: "left",
                  background: C._dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${C._dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                  color: C.t2, fontSize: 12, cursor: "pointer",
                }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Bubble
            key={msg.id ?? i}
            msg={msg}
            onCreateTicket={createTicket}
            C={C} accent={accent}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        flexShrink: 0,
        padding: `10px 12px calc(10px + env(safe-area-inset-bottom, 0px))`,
        borderTop: `1px solid ${C._dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
        background: C._dark ? "rgba(7,9,9,0.9)" : "rgba(248,247,244,0.9)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        display: "flex", gap: 8, alignItems: "flex-end",
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); send(input); }
          }}
          placeholder="Pregunta sobre piezas, cotizaciones…"
          rows={1}
          style={{
            flex: 1, resize: "none", padding: "10px 13px",
            borderRadius: 20, fontSize: 13, lineHeight: 1.45,
            background: inputBg,
            border: `1px solid ${input ? accent + "40" : C.border}`,
            color: C.t1, outline: "none", fontFamily: "inherit",
            transition: "border-color 0.15s", maxHeight: 100, overflowY: "auto",
          }}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 40, height: 40, borderRadius: 20, flexShrink: 0,
            background: !input.trim() || loading ? accent + "22" : accent,
            border: "none", color: !input.trim() || loading ? C.t3 : "#071209",
            fontSize: 16, cursor: !input.trim() || loading ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
