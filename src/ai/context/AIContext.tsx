// ============================================================
// Logisolve AI Layer — React Context
// Provides AI capabilities to experimental UI components.
// NOT connected to the main app flow — sandbox only.
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  generateOperationalAnalysis,
  streamOperationalAnalysis,
} from "../actions/generateOperationalAnalysis";
import type {
  AIContextValue,
  AIMessage,
  AIRequestOptions,
  AIStreamChunk,
  OperationalAnalysisInput,
  OperationalAnalysisOutput,
} from "./types";

// ── Context ───────────────────────────────────────────────────

const AIContext = createContext<AIContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────

export function AIProvider({ children }: { children: React.ReactNode }) {
  const enabled = import.meta.env.VITE_ENABLE_AI_EXPERIMENTAL === "true";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailyUsage, setDailyUsage] = useState({
    tokens: 0,
    requests: 0,
    limitReached: false,
  });

  // Track in localStorage for client-side display
  useEffect(() => {
    if (!enabled) return;
    const key = `ai_usage_${new Date().toISOString().split("T")[0]}`;
    const stored = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      tokens?: number;
      requests?: number;
    };
    setDailyUsage({
      tokens: stored.tokens ?? 0,
      requests: stored.requests ?? 0,
      limitReached: (stored.tokens ?? 0) >= 200_000,
    });
  }, [enabled]);

  const trackUsage = useCallback(
    (tokens: number) => {
      if (!enabled) return;
      const key = `ai_usage_${new Date().toISOString().split("T")[0]}`;
      const stored = JSON.parse(localStorage.getItem(key) ?? "{}") as {
        tokens?: number;
        requests?: number;
      };
      const updated = {
        tokens: (stored.tokens ?? 0) + tokens,
        requests: (stored.requests ?? 0) + 1,
      };
      localStorage.setItem(key, JSON.stringify(updated));
      setDailyUsage({
        ...updated,
        limitReached: updated.tokens >= 200_000,
      });
    },
    [enabled]
  );

  const _generateAnalysis = useCallback(
    async (
      input: OperationalAnalysisInput
    ): Promise<OperationalAnalysisOutput> => {
      if (!enabled) throw new Error("AI experimental features are disabled");
      setLoading(true);
      setError(null);
      try {
        const result = await generateOperationalAnalysis(input, {
          useCache: true,
        });
        trackUsage(500); // rough estimate
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error de IA";
        setError(msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [enabled, trackUsage]
  );

  async function* _streamPrompt(
    messages: AIMessage[],
    opts?: AIRequestOptions
  ): AsyncGenerator<AIStreamChunk> {
    if (!enabled) throw new Error("AI experimental features are disabled");
    yield* streamOperationalAnalysis({} as OperationalAnalysisInput, opts);
  }

  const value: AIContextValue = {
    enabled,
    provider: null, // resolved server-side
    generateOperationalAnalysis: _generateAnalysis,
    streamPrompt: _streamPrompt,
    loading,
    error,
    dailyUsage,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────

export function useAI(): AIContextValue {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAI must be used inside <AIProvider>");
  return ctx;
}

// ── Streaming hook ────────────────────────────────────────────

export function useAIStream() {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (input: OperationalAnalysisInput) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setText("");
      setDone(false);
      setError(null);
      setStreaming(true);
      try {
        for await (const chunk of streamOperationalAnalysis(input, {
          signal: ctrl.signal,
        })) {
          if (ctrl.signal.aborted) break;
          if (chunk.done) {
            setDone(true);
          } else {
            setText((prev) => prev + chunk.delta);
          }
        }
      } catch (err) {
        if (!ctrl.signal.aborted) {
          setError(err instanceof Error ? err.message : "Error en streaming");
        }
      } finally {
        setStreaming(false);
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { text, streaming, done, error, start, cancel };
}
