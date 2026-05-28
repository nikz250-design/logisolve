// useStateEvents — watches app state for operational transitions and
// fires AI calls on demand or for real-time events.
//
// Manual:   triggerMargin(ticket) — call from UI button
// Auto:     ticket → "entregado" → WhatsApp draft for client

import { useEffect, useRef, useCallback, useState } from "react";
import { resolveTicket } from "./resolvers.js";

// ─── Calls the modules endpoint ──────────────────────────────
async function callModule(moduleId, context) {
  const res = await fetch("/api/ai/modules", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ module: moduleId, context }),
  });
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("json")) {
    return { ok: false, error: `API no disponible (${res.status})` };
  }
  return res.json();
}

function parseResult(data, fallback) {
  if (!data.ok) return { ok: false, result: null, error: data.error };
  const parsed = typeof data.result === "string"
    ? (() => { try { return JSON.parse(data.result.replace(/```json\n?|\n?```/g, "")); } catch { return fallback(data.result); } })()
    : data.result;
  return { ok: true, result: parsed };
}

// ─── Hook ─────────────────────────────────────────────────────
export function useStateEvents(state) {
  // Each insight: { id, type, ticket, status, result, error }
  const [insights, setInsights] = useState([]);
  const prevStatusRef = useRef(null); // null = not yet initialized

  const dismiss = useCallback((id) => {
    setInsights(prev => prev.filter(i => i.id !== id));
  }, []);

  const pushLoading = useCallback((id, type, ticket) => {
    setInsights(prev => [
      ...prev.filter(i => i.id !== id),
      { id, type, ticket, status: "loading", result: null, error: null },
    ]);
  }, []);

  const pushResult = useCallback((id, result, error) => {
    setInsights(prev => prev.map(i =>
      i.id === id
        ? { ...i, status: error ? "error" : "ok", result, error }
        : i
    ));
  }, []);

  // ── Manual trigger: margin suggestion ────────────────────────
  const triggerMargin = useCallback((ticket) => {
    if (!ticket || !ticket.snap?.costoTotal) return;
    const id  = `margin-${ticket.id}-${Date.now()}`;
    const ctx = resolveTicket(state, ticket.id);

    pushLoading(id, "margin", ticket);

    callModule("recomendacion-margen", ctx)
      .then(data => {
        const { ok, result, error } = parseResult(data, raw => ({ raw }));
        pushResult(id, ok ? result : null, ok ? null : error);
      })
      .catch(e => pushResult(id, null, e.message));
  }, [state, pushLoading, pushResult]);

  // ── Auto: detect ticket → "entregado" (WhatsApp draft) ───────
  useEffect(() => {
    const tickets = state.tickets ?? [];

    // Initialize on first run — skip triggers, just record state
    if (prevStatusRef.current === null) {
      const map = {};
      tickets.forEach(t => { map[t.id] = t.status; });
      prevStatusRef.current = map;
      return;
    }

    const prevMap = prevStatusRef.current;

    tickets.forEach(ticket => {
      const prev = prevMap[ticket.id];
      if (prev && prev !== "entregado" && ticket.status === "entregado") {
        const id  = `whatsapp-${ticket.id}`;
        const ctx = resolveTicket(state, ticket.id);

        pushLoading(id, "whatsapp", ticket);

        callModule("whatsapp-cliente", ctx)
          .then(data => {
            const { ok, result, error } = parseResult(data, raw => ({ mensaje: raw }));
            pushResult(id, ok ? result : null, ok ? null : error);
          })
          .catch(e => pushResult(id, null, e.message));
      }
    });

    // Update refs
    const newMap = {};
    tickets.forEach(t => { newMap[t.id] = t.status; });
    prevStatusRef.current = newMap;

  }, [state.tickets]); // eslint-disable-line

  return { insights, dismiss, triggerMargin };
}
