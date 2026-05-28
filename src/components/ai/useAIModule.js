// ============================================================
// useAIModule — hook para llamar /api/ai/modules
// Maneja loading, error, resultado y cache por sesión.
// ============================================================

import { useState, useRef, useCallback } from "react";

const SESSION_CACHE = new Map(); // key = moduleId+JSON(context) → result

export function useAIModule() {
  const [status, setStatus]   = useState("idle"); // idle|loading|ok|error
  const [result, setResult]   = useState(null);
  const [error,  setError]    = useState(null);
  const [meta,   setMeta]     = useState(null);   // { duration_ms, model, usage }
  const abortRef = useRef(null);

  const run = useCallback(async (moduleId, context = {}) => {
    // Deduplicate in-flight calls
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Cache hit
    const cacheKey = moduleId + JSON.stringify(context);
    if (SESSION_CACHE.has(cacheKey)) {
      const cached = SESSION_CACHE.get(cacheKey);
      setResult(cached.result);
      setMeta(cached.meta);
      setStatus("ok");
      setError(null);
      return;
    }

    setStatus("loading");
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: moduleId, context }),
        signal: ctrl.signal,
      });

      const data = await res.json();

      if (!data.ok) {
        setStatus("error");
        setError(data.error ?? "Error desconocido");
        return;
      }

      const metaInfo = {
        duration_ms: data.duration_ms,
        model:       data.model,
        usage:       data.usage,
      };

      SESSION_CACHE.set(cacheKey, { result: data.result, meta: metaInfo });
      setResult(data.result);
      setMeta(metaInfo);
      setStatus("ok");
      setError(null);

    } catch (e) {
      if (e.name === "AbortError") return;
      setStatus("error");
      setError(e.message ?? "Error de red");
    } finally {
      abortRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setStatus("idle");
    setResult(null);
    setError(null);
    setMeta(null);
  }, []);

  return { status, result, error, meta, run, reset };
}
