// useAIEngine — React hook wrapping AIContextEngine.
// Provides execute(), status, result, trace, and entity-selection helpers.

import { useState, useCallback, useRef, useMemo } from "react";
import { AIContextEngine }                         from "./engine.js";
import { autoResolve }                             from "./resolvers.js";
import { MODULE_REGISTRY }                         from "./registry.js";

export function useAIEngine(state) {
  const [status,    setStatus]    = useState("idle"); // idle|loading|ok|error
  const [result,    setResult]    = useState(null);
  const [error,     setError]     = useState(null);
  const [meta,      setMeta]      = useState(null);
  const [trace,     setTrace]     = useState(null);
  const [entityRef, setEntityRef] = useState(null);  // last resolved entity

  const abortRef = useRef(null);

  // Builds a fresh engine snapshot every time state changes.
  // Engine is cheap to construct (no network, no timers).
  const engine = useMemo(() => new AIContextEngine(state), [state]);

  const execute = useCallback(async (moduleId, ref, userInput) => {
    // Cancel any in-flight execution
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setStatus("loading");
    setResult(null);
    setError(null);
    setTrace(null);
    setMeta(null);

    // Use provided ref or auto-resolve from state
    const resolvedRef = ref ?? autoResolve(state, moduleId);
    setEntityRef(resolvedRef);

    try {
      const out = await engine.execute(moduleId, resolvedRef, userInput);
      if (ctrl.signal.aborted) return;

      setTrace(out.trace);
      if (out.ok) {
        setResult(out.result);
        setMeta(out.meta);
        setStatus("ok");
      } else {
        setError(out.error);
        setStatus("error");
      }
    } catch (e) {
      if (ctrl.signal.aborted || e.name === "AbortError") return;
      setError(e.message ?? "Error inesperado");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }, [engine, state]);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setStatus("idle");
    setResult(null);
    setError(null);
    setTrace(null);
    setMeta(null);
    setEntityRef(null);
  }, []);

  // Convenience: which modules apply to a given entity type
  const modulesFor = useCallback((entityType) =>
    Object.entries(MODULE_REGISTRY)
      .filter(([, def]) =>
        def.entityTypes.includes(entityType) || def.entityTypes.includes("any")
      )
      .map(([id, def]) => ({ id, ...def })),
  []);

  return {
    status,
    result,
    error,
    meta,
    trace,
    entityRef,
    execute,
    reset,
    modulesFor,
    allModules: Object.entries(MODULE_REGISTRY).map(([id, def]) => ({ id, ...def })),
  };
}
