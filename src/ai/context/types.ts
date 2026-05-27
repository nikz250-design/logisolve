// ============================================================
// Logisolve AI Layer — Core Types
// Provider-agnostic. Swap Claude ↔ OpenAI without touching UI.
// ============================================================

// ── Request / Response shapes ────────────────────────────────

export interface AIMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AIRequestOptions {
  /** Max tokens to generate */
  maxTokens?: number;
  /** Request timeout in ms (default: 30_000) */
  timeoutMs?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Enable streaming */
  stream?: boolean;
  /** User/session ID for tracking */
  userId?: string;
  /** Arbitrary metadata saved to ai_requests table */
  metadata?: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  durationMs: number;
  requestId?: string;
}

export interface AIStreamChunk {
  delta: string;
  done: boolean;
}

// ── Provider interface (swap-safe) ───────────────────────────

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  complete(
    messages: AIMessage[],
    opts?: AIRequestOptions
  ): Promise<AIResponse>;
  stream(
    messages: AIMessage[],
    opts?: AIRequestOptions
  ): AsyncGenerator<AIStreamChunk>;
}

// ── Operational Analysis ─────────────────────────────────────

export interface OperationalAnalysisInput {
  ticket?: {
    id?: string;
    titulo?: string;
    descripcion?: string;
    status?: string;
    prioridad?: string;
    fechaCreacion?: string;
  };
  cliente?: {
    nombre?: string;
    rfc?: string;
    saldo?: number;
    diasCredito?: number;
  };
  unidad?: {
    eco?: string;
    modelo?: string;
    km?: number;
    status?: string;
  };
  historial?: Array<{
    tipo: string;
    descripcion: string;
    fecha: string;
  }>;
  prioridad?: "critica" | "alta" | "media" | "baja";
  margen?: number;
  operacion?: string;
}

export interface OperationalAnalysisOutput {
  analisis: string;
  riesgos: string[];
  recomendaciones: string[];
  urgencia: "inmediata" | "alta" | "media" | "baja";
  oportunidades: string[];
  resumenEjecutivo: string;
  confianza: number; // 0-100
}

// ── Supabase log shapes ──────────────────────────────────────

export interface AIRequestLog {
  id?: string;
  created_at?: string;
  user_id?: string;
  provider: string;
  model: string;
  action: string;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number;
  status: "success" | "error" | "cancelled";
  error_message?: string;
  metadata?: Record<string, unknown>;
}

export interface AIFeedback {
  id?: string;
  request_id: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  created_at?: string;
}

// ── Context value ─────────────────────────────────────────────

export interface AIContextValue {
  /** Whether the AI sandbox is enabled */
  enabled: boolean;
  /** Currently active provider */
  provider: AIProvider | null;
  /** Run operational analysis */
  generateOperationalAnalysis: (
    input: OperationalAnalysisInput
  ) => Promise<OperationalAnalysisOutput>;
  /** Stream any prompt */
  streamPrompt: (
    messages: AIMessage[],
    opts?: AIRequestOptions
  ) => AsyncGenerator<AIStreamChunk>;
  /** Loading state */
  loading: boolean;
  /** Last error */
  error: string | null;
  /** Daily usage */
  dailyUsage: { tokens: number; requests: number; limitReached: boolean };
}
