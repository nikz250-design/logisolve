// ============================================================
// Logisolve AI Actions — generateOperationalAnalysis
// The primary AI action. Calls the backend proxy; never calls
// Anthropic directly from the frontend.
// ============================================================

import { CacheService } from "../services/CacheService";
import type {
  OperationalAnalysisInput,
  OperationalAnalysisOutput,
  AIStreamChunk,
} from "../context/types";

const cache = new CacheService<OperationalAnalysisOutput>({
  maxEntries: 30,
  ttlMs: 10 * 60 * 1000, // 10 min
});

// ── Non-streaming version ─────────────────────────────────────

export async function generateOperationalAnalysis(
  input: OperationalAnalysisInput,
  opts: {
    signal?: AbortSignal;
    userId?: string;
    useCache?: boolean;
  } = {}
): Promise<OperationalAnalysisOutput> {
  const cacheKey = CacheService.keyFor("ops-analysis", input);

  if (opts.useCache !== false) {
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  const response = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, userId: opts.userId }),
    signal: opts.signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `AI API error ${response.status}`);
  }

  const data = (await response.json()) as { result: OperationalAnalysisOutput };
  cache.set(cacheKey, data.result);
  return data.result;
}

// ── Streaming version ─────────────────────────────────────────

export async function* streamOperationalAnalysis(
  input: OperationalAnalysisInput,
  opts: {
    signal?: AbortSignal;
    userId?: string;
  } = {}
): AsyncGenerator<AIStreamChunk> {
  const response = await fetch("/api/ai/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, userId: opts.userId }),
    signal: opts.signal,
  });

  if (!response.ok || !response.body) {
    const err = await response.json().catch(() => ({ error: "Stream error" }));
    throw new Error(err.error ?? `AI stream error ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") {
          yield { delta: "", done: true };
          return;
        }
        try {
          const chunk = JSON.parse(payload) as AIStreamChunk;
          yield chunk;
        } catch {
          // Skip malformed chunks
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
