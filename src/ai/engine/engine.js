// AIContextEngine — central orchestrator.
// Resolves entities → validates context → calls API → parses response.
// Pure class, no React. Wrap with useAIEngine for React integration.

import { AITrace }                          from "./trace.js";
import { resolveEntity, autoResolve }       from "./resolvers.js";
import { MODULE_REGISTRY, validateContext } from "./registry.js";

export class AIContextEngine {
  constructor(state) {
    this.state = state;
  }

  // ── execute ──────────────────────────────────────────────────
  // entityRef: { type: "ticket"|"unit"|"global", id?: string }
  // userInput: optional free text for modules like notas-a-ticket
  async execute(moduleId, entityRef, userInput) {
    const def = MODULE_REGISTRY[moduleId];
    if (!def) {
      return { ok: false, error: `Módulo desconocido: ${moduleId}`, trace: null };
    }

    // Auto-resolve entity if not provided
    const ref = entityRef ?? autoResolve(this.state, moduleId);

    const trace = new AITrace(moduleId, ref);
    trace.step("module_resolved", {
      label:       def.label,
      entityTypes: def.entityTypes,
      ref,
    });

    // Resolve entity context
    const ctx = resolveEntity(this.state, ref);
    if (!ctx) {
      trace.step("resolve_failed", { ref });
      trace.finish(null, `Entidad no encontrada: ${ref.type}/${ref.id}`);
      return { ok: false, error: trace.error, trace };
    }
    trace.step("context_resolved", {
      entityType:  ctx.entityType,
      // Summarise what was resolved (avoid logging full arrays)
      ticketId:    ctx.ticket?.id,
      unitId:      ctx.unit?.id,
      snapshotKeys: ctx.snapshot ? Object.keys(ctx.snapshot) : undefined,
    });

    // Validate required context fields
    const validation = validateContext(moduleId, ctx);
    trace.step("context_validated", validation);

    if (!validation.valid) {
      const msg = `Contexto insuficiente — campos faltantes: ${validation.missing.join(", ")}`;
      trace.finish(null, msg);
      return { ok: false, error: msg, trace };
    }

    // Merge optional user input into context
    const payload = userInput ? { ...ctx, userInput } : ctx;

    trace.step("api_call_start", {
      module:     moduleId,
      contextKeys: Object.keys(payload),
    });

    // Call the backend
    let data;
    try {
      const res = await fetch("/api/ai/modules", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ module: moduleId, context: payload }),
      });
      data = await res.json();
    } catch (networkErr) {
      const msg = networkErr.message ?? "Error de red";
      trace.step("api_error", { error: msg });
      trace.finish(null, msg);
      return { ok: false, error: msg, trace };
    }

    trace.step("api_response", {
      ok:          data.ok,
      duration_ms: data.duration_ms,
      model:       data.model,
      usage:       data.usage,
    });

    if (!data.ok) {
      trace.finish(null, data.error ?? "Error desconocido");
      return { ok: false, error: trace.error, trace };
    }

    // Parse structured response
    const parsed = def.parse(data.result);
    trace.step("response_parsed", {
      hasRaw:  !!parsed?.raw,
      keys:    parsed && typeof parsed === "object" ? Object.keys(parsed) : [],
    });

    trace.finish(parsed);
    return {
      ok:     true,
      result: parsed,
      raw:    data.result,
      meta: {
        duration_ms: data.duration_ms,
        model:       data.model,
        usage:       data.usage,
      },
      entityRef: ref,
      trace,
    };
  }
}
