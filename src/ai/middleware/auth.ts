// ============================================================
// Logisolve AI Middleware — Auth
// Vercel edge/serverless middleware helpers.
// ============================================================

import type { IncomingMessage } from "http";

export interface AuthResult {
  ok: boolean;
  userId?: string;
  error?: string;
}

/**
 * Validates the request is from an authenticated Logisolve session.
 * In sandbox/experimental mode, accepts a simple shared secret header.
 * In production, integrate with Supabase JWT here.
 */
export function validateAuth(req: IncomingMessage & { headers: Record<string, string | string[] | undefined> }): AuthResult {
  // Sandbox mode: accept X-Logisolve-Sandbox header
  const sandboxKey = process.env.AI_SANDBOX_SECRET;
  const requestKey = getHeader(req, "x-logisolve-sandbox");

  if (sandboxKey && requestKey === sandboxKey) {
    return { ok: true, userId: "sandbox-user" };
  }

  // Check experimental mode is enabled
  if (process.env.ENABLE_AI_EXPERIMENTAL !== "true") {
    return { ok: false, error: "AI experimental features are disabled" };
  }

  // Future: Validate Supabase JWT from Authorization header
  // const token = getHeader(req, "authorization")?.replace("Bearer ", "");
  // const { data, error } = await supabase.auth.getUser(token);
  // if (error) return { ok: false, error: "Invalid session" };
  // return { ok: true, userId: data.user.id };

  // For now in sandbox mode, pass through with anonymous ID
  return { ok: true, userId: "anonymous" };
}

function getHeader(
  req: { headers: Record<string, string | string[] | undefined> },
  name: string
): string | undefined {
  const val = req.headers[name];
  return Array.isArray(val) ? val[0] : val;
}
