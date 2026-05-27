// ============================================================
// Logisolve AI Middleware — Usage Tracker
// Tracks tokens, daily limits, and logs to Supabase ai_requests.
// ============================================================

export interface UsageRecord {
  userId: string;
  action: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  status: "success" | "error" | "cancelled";
  model: string;
  provider: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

/** Daily token limit per user (soft cap) */
const DAILY_TOKEN_LIMIT = Number(process.env.AI_DAILY_TOKEN_LIMIT ?? 200_000);

/**
 * Log a request to Supabase ai_requests table.
 * Non-blocking — fires and forgets. Failures are logged but not thrown.
 */
export async function logUsage(record: UsageRecord): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Graceful degradation: log to console if Supabase not configured
    if (process.env.NODE_ENV !== "production") {
      console.log("[AI:USAGE]", record);
    }
    return;
  }

  try {
    await fetch(`${supabaseUrl}/rest/v1/ai_requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        user_id: record.userId,
        action: record.action,
        provider: record.provider,
        model: record.model,
        input_tokens: record.inputTokens,
        output_tokens: record.outputTokens,
        duration_ms: record.durationMs,
        status: record.status,
        error_message: record.errorMessage,
        metadata: record.metadata,
      }),
    });
  } catch {
    // Non-critical — don't crash the main request
  }
}

/**
 * Check if user has exceeded daily token limit.
 * Queries Supabase ai_requests for today's total.
 */
export async function checkDailyLimit(userId: string): Promise<{
  limitReached: boolean;
  tokensUsed: number;
  tokensRemaining: number;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { limitReached: false, tokensUsed: 0, tokensRemaining: DAILY_TOKEN_LIMIT };
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(
      `${supabaseUrl}/rest/v1/ai_requests?select=input_tokens,output_tokens&user_id=eq.${userId}&created_at=gte.${today}&status=eq.success`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );
    const rows = (await res.json()) as Array<{
      input_tokens: number;
      output_tokens: number;
    }>;
    const tokensUsed = rows.reduce(
      (sum, r) => sum + r.input_tokens + r.output_tokens,
      0
    );
    return {
      limitReached: tokensUsed >= DAILY_TOKEN_LIMIT,
      tokensUsed,
      tokensRemaining: Math.max(0, DAILY_TOKEN_LIMIT - tokensUsed),
    };
  } catch {
    return { limitReached: false, tokensUsed: 0, tokensRemaining: DAILY_TOKEN_LIMIT };
  }
}
