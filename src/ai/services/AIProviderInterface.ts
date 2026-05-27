// ============================================================
// Logisolve AI Layer — Abstract Provider Interface
// Implement this to add Claude, OpenAI, Gemini, etc.
// ============================================================

import type {
  AIMessage,
  AIProvider,
  AIRequestOptions,
  AIResponse,
  AIStreamChunk,
} from "../context/types";

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly model: string;

  abstract complete(
    messages: AIMessage[],
    opts?: AIRequestOptions
  ): Promise<AIResponse>;

  abstract stream(
    messages: AIMessage[],
    opts?: AIRequestOptions
  ): AsyncGenerator<AIStreamChunk>;

  /** Estimate tokens (rough: ~4 chars/token) */
  protected estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /** Truncate messages to fit token budget */
  protected truncateMessages(
    messages: AIMessage[],
    maxInputTokens: number
  ): AIMessage[] {
    let totalChars = 0;
    const maxChars = maxInputTokens * 4; // rough estimate
    const result: AIMessage[] = [];

    // Always keep system message
    const systemMessages = messages.filter((m) => m.role === "system");
    const nonSystem = messages.filter((m) => m.role !== "system");

    for (const msg of systemMessages) {
      totalChars += msg.content.length;
      result.push(msg);
    }

    // Add non-system messages from newest to oldest, then reverse
    const trimmed: AIMessage[] = [];
    for (let i = nonSystem.length - 1; i >= 0; i--) {
      const msg = nonSystem[i];
      if (totalChars + msg.content.length > maxChars) break;
      totalChars += msg.content.length;
      trimmed.unshift(msg);
    }

    return [...result, ...trimmed];
  }
}
