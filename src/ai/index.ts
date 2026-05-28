// ============================================================
// Logisolve AI Layer — Public API
// Import from here, not from deep paths.
// ============================================================

// Context & hooks (frontend-safe)
export { AIProvider, useAI, useAIStream } from "./context/AIContext";

// Types (frontend-safe)
export type {
  AIMessage,
  AIRequestOptions,
  AIResponse,
  AIStreamChunk,
  AIContextValue,
  AIProvider as AIProviderType,
  OperationalAnalysisInput,
  OperationalAnalysisOutput,
} from "./context/types";

// Actions (frontend-safe — call the proxy, never Anthropic directly)
export {
  generateOperationalAnalysis,
  streamOperationalAnalysis,
} from "./actions/generateOperationalAnalysis";

// Prompts (can be imported on server or for testing)
export * from "./prompts/index";

// NOTE: AnthropicService and middleware are SERVER-SIDE ONLY.
// Never import them in React components or client-side code.
