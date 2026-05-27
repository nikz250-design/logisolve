// ============================================================
// Logisolve AI Layer — AnthropicService
// Server-side only. Never import this in frontend components.
// Called exclusively from /api/ai/* Vercel serverless functions.
// ============================================================

import Anthropic from "@anthropic-ai/sdk";
import { BaseAIProvider } from "./AIProviderInterface";
import type {
  AIMessage,
  AIRequestOptions,
  AIResponse,
  AIStreamChunk,
} from "../context/types";

// ── Config ───────────────────────────────────────────────────

const CONFIG = {
  model: "claude-sonnet-4-6" as const,
  maxTokens: 2048,
  maxInputTokens: 50_000, // auto-truncate above this
  timeoutMs: 30_000,
  maxRetries: 3,
  retryBaseMs: 500,

  // Rate limiting (per instance — augment with Supabase for distributed)
  rateLimitWindowMs: 60_000,
  rateLimitMaxRequests: 20,

  // Cost guard: daily token limit per user (soft cap, logged)
  dailyTokenLimit: 200_000,
} as const;

// ── Rate limiter ─────────────────────────────────────────────

class RateLimiter {
  private windows = new Map<string, number[]>();

  check(key: string): { allowed: boolean; retryAfterMs?: number } {
    const now = Date.now();
    const window = this.windows.get(key) ?? [];
    const recent = window.filter(
      (t) => now - t < CONFIG.rateLimitWindowMs
    );
    if (recent.length >= CONFIG.rateLimitMaxRequests) {
      const oldest = recent[0];
      return {
        allowed: false,
        retryAfterMs: CONFIG.rateLimitWindowMs - (now - oldest),
      };
    }
    recent.push(now);
    this.windows.set(key, recent);
    return { allowed: true };
  }
}

// ── Logger ───────────────────────────────────────────────────

export interface LogEntry {
  ts: string;
  level: "info" | "warn" | "error";
  action: string;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
  userId?: string;
  requestId?: string;
}

class ServiceLogger {
  private logs: LogEntry[] = [];

  log(entry: Omit<LogEntry, "ts">) {
    const line = { ...entry, ts: new Date().toISOString() };
    this.logs.push(line);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[AI:${line.level.toUpperCase()}] ${line.action}`, {
        duration: line.durationMs,
        tokens: line.inputTokens ? `${line.inputTokens}+${line.outputTokens}` : undefined,
        error: line.error,
      });
    }
  }

  getLogs() {
    return [...this.logs];
  }
}

// ── AnthropicService ─────────────────────────────────────────

export class AnthropicService extends BaseAIProvider {
  readonly name = "anthropic";
  readonly model = CONFIG.model;

  private client: Anthropic;
  private rateLimiter = new RateLimiter();
  private logger = new ServiceLogger();

  constructor() {
    super();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    this.client = new Anthropic({
      apiKey,
      maxRetries: CONFIG.maxRetries,
      timeout: CONFIG.timeoutMs,
    });
  }

  // ── Complete (non-streaming) ──────────────────────────────

  async complete(
    messages: AIMessage[],
    opts: AIRequestOptions = {}
  ): Promise<AIResponse> {
    const userId = opts.userId ?? "anonymous";
    const rl = this.rateLimiter.check(userId);
    if (!rl.allowed) {
      throw new Error(
        `Rate limit exceeded. Retry after ${Math.ceil((rl.retryAfterMs ?? 0) / 1000)}s`
      );
    }

    const truncated = this.truncateMessages(
      messages,
      CONFIG.maxInputTokens
    );

    const t0 = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < CONFIG.maxRetries) {
      try {
        const [systemMsg, userMessages] = this._splitMessages(truncated);
        const response = await this.client.messages.create(
          {
            model: CONFIG.model,
            max_tokens: opts.maxTokens ?? CONFIG.maxTokens,
            system: systemMsg,
            messages: userMessages,
          },
          { signal: opts.signal }
        );

        const durationMs = Date.now() - t0;
        const content = response.content
          .filter((b) => b.type === "text")
          .map((b) => (b as Anthropic.TextBlock).text)
          .join("");

        const usage: AIResponse["usage"] = {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens:
            response.usage.input_tokens + response.usage.output_tokens,
        };

        this.logger.log({
          level: "info",
          action: "complete",
          durationMs,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          userId,
          requestId: response.id,
        });

        return { content, model: response.model, usage, durationMs, requestId: response.id };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Abort immediately on client-side cancellation or auth errors
        if (
          opts.signal?.aborted ||
          err instanceof Anthropic.AuthenticationError ||
          err instanceof Anthropic.BadRequestError
        ) {
          break;
        }

        // Retry on rate limit / overload with exponential back-off
        if (
          err instanceof Anthropic.RateLimitError ||
          err instanceof Anthropic.OverloadedError
        ) {
          const delay = CONFIG.retryBaseMs * Math.pow(2, attempt);
          this.logger.log({
            level: "warn",
            action: "retry",
            error: lastError.message,
            userId,
          });
          await sleep(delay);
          attempt++;
          continue;
        }

        break; // Non-retriable
      }
    }

    this.logger.log({
      level: "error",
      action: "complete_failed",
      error: lastError?.message,
      userId,
      durationMs: Date.now() - t0,
    });

    throw lastError ?? new Error("Unknown AI error");
  }

  // ── Stream ────────────────────────────────────────────────

  async *stream(
    messages: AIMessage[],
    opts: AIRequestOptions = {}
  ): AsyncGenerator<AIStreamChunk> {
    const userId = opts.userId ?? "anonymous";
    const rl = this.rateLimiter.check(userId);
    if (!rl.allowed) {
      throw new Error("Rate limit exceeded");
    }

    const truncated = this.truncateMessages(messages, CONFIG.maxInputTokens);
    const [systemMsg, userMessages] = this._splitMessages(truncated);
    const t0 = Date.now();

    try {
      const stream = this.client.messages.stream({
        model: CONFIG.model,
        max_tokens: opts.maxTokens ?? CONFIG.maxTokens,
        system: systemMsg,
        messages: userMessages,
      });

      for await (const event of stream) {
        if (opts.signal?.aborted) {
          stream.controller.abort();
          break;
        }
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield { delta: event.delta.text, done: false };
        }
      }

      const final = await stream.finalMessage();
      const durationMs = Date.now() - t0;
      this.logger.log({
        level: "info",
        action: "stream_complete",
        durationMs,
        inputTokens: final.usage.input_tokens,
        outputTokens: final.usage.output_tokens,
        userId,
      });

      yield { delta: "", done: true };
    } catch (err) {
      this.logger.log({
        level: "error",
        action: "stream_failed",
        error: err instanceof Error ? err.message : String(err),
        userId,
        durationMs: Date.now() - t0,
      });
      throw err;
    }
  }

  // ── Private helpers ───────────────────────────────────────

  private _splitMessages(
    messages: AIMessage[]
  ): [string | undefined, Anthropic.MessageParam[]] {
    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n") || undefined;

    const rest = messages
      .filter((m) => m.role !== "system")
      .map(
        (m): Anthropic.MessageParam => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })
      );

    return [system, rest];
  }
}

// ── Singleton ─────────────────────────────────────────────────
// Shared instance for serverless functions (re-used across warm invocations)

let _instance: AnthropicService | null = null;

export function getAnthropicService(): AnthropicService {
  if (!_instance) _instance = new AnthropicService();
  return _instance;
}

// ── Utilities ─────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
