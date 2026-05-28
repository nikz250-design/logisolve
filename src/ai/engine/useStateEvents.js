// useStateEvents — watches app state for operational transitions and
// fires AI calls automatically. No user interaction required.
//
// Detected events:
//   "ticket_delivered"  → WhatsApp message for client
//   "ticket_saved"      → Margin suggestion on new ticket

import { useEffect, useRef, useCallback, useState } from "react";
import { resolveTicket } from "./resolvers.js";

const CLOSED = new Set(["cerrado", "cancelado", "cobrado"]);

// ─── Calls the modules endpoint ──────────────────────────────
async function callModule(moduleId, context) {
  const res  = await fetch("/api/ai/modules", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ module: moduleId, context }),
  });
  return res.json();
}

// ─── Hook ─────────────────────────────────────────────────────
export function useStateEvents(state) {
  // Each insight: { id, type, ticket, status, result, error }
  const [insights, setInsights] = useState([]);
  const prevStatusRef = useRef({});   // ticketId → status
  const prevCountRef  = useRef(0);    // total tickets count

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

  useEffect(() => {
    const tickets  = state.tickets ?? [];
    const prevMap  = prevStatusRef.current;
    const prevCount = prevCountRef.current;

    // ── Detect new ticket saved ────────────────────────────────
    if (tickets.length > prevCount) {
      const newest = tickets[0]; // TKT_ADD prepends
      if (newest && newest.snap?.costoTotal > 0) {
        const id  = `margin-${newest.id}`;
        const ctx = resolveTicket(state, newest.id);

        pushLoading(id, "margin", newest);

        callModule("recomendacion-margen", ctx)
          .then(data => {
            if (data.ok) {
              const parsed = typeof data.result === "string"
                ? (() => { try { return JSON.parse(data.result.replace(/```json\n?|\n?```/g, "")); } catch { return { raw: data.result }; } })()
                : data.result;
              pushResult(id, parsed, null);
            } else {
              pushResult(id, null, data.error);
            }
          })
          .catch(e => pushResult(id, null, e.message));
      }
    }

    // ── Detect ticket → "entregado" ───────────────────────────
    tickets.forEach(ticket => {
      const prev = prevMap[ticket.id];
      if (prev && prev !== "entregado" && ticket.status === "entregado") {
        const id  = `whatsapp-${ticket.id}`;
        const ctx = resolveTicket(state, ticket.id);

        pushLoading(id, "whatsapp", ticket);

        callModule("whatsapp-cliente", ctx)
          .then(data => {
            if (data.ok) {
              const parsed = typeof data.result === "string"
                ? (() => { try { return JSON.parse(data.result.replace(/```json\n?|\n?```/g, "")); } catch { return { mensaje: data.result }; } })()
                : data.result;
              pushResult(id, parsed, null);
            } else {
              pushResult(id, null, data.error);
            }
          })
          .catch(e => pushResult(id, null, e.message));
      }
    });

    // Update refs
    const newMap = {};
    tickets.forEach(t => { newMap[t.id] = t.status; });
    prevStatusRef.current = newMap;
    prevCountRef.current  = tickets.length;

  }, [state.tickets]); // eslint-disable-line

  return { insights, dismiss };
}
