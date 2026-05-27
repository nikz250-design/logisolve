// ============================================================
// Logisolve AI — /api/ai/debug
// Muestra el request/response RAW de Anthropic.
// Útil para diagnosticar errores de API key, modelo, etc.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();

    const payload = {
      model: "claude-haiku-4-5-20251001" as const,
      max_tokens: 64,
      messages: [{ role: "user" as const, content: "say hi" }],
    };

    let capturedUrl: string = "";
    let capturedReqBody: unknown = null;
    let capturedReqHeaders: Record<string, string> = {};
    let capturedResStatus: number = 0;
    let capturedResHeaders: Record<string, string> = {};
    let capturedResBody: string = "";

    const client = new Anthropic({
      apiKey,
      fetch: async (url: string | URL, init?: RequestInit) => {
        capturedUrl = String(url);
        capturedReqBody = init?.body ? JSON.parse(init.body as string) : null;
        // init.headers may be a Headers object or a plain object
        const rawHeaders = init?.headers;
        capturedReqHeaders = rawHeaders instanceof Headers
          ? Object.fromEntries([...rawHeaders.entries()])
          : Object.fromEntries(Object.entries((rawHeaders as Record<string, string>) ?? {}));

        const response = await globalThis.fetch(url, init);
        const cloned = response.clone();
        capturedResStatus = response.status;
        capturedResHeaders = Object.fromEntries(response.headers.entries());
        capturedResBody = await cloned.text();

        return response;
      },
    });

    let sdkResult: unknown = null;
    let sdkError: unknown = null;

    try {
      sdkResult = await client.messages.create(payload);
    } catch (e) {
      sdkError = e instanceof Error
        ? { message: e.message, name: e.name, stack: e.stack?.split("\n").slice(0, 5) }
        : String(e);
    }

    let parsedResBody: unknown;
    try { parsedResBody = JSON.parse(capturedResBody); } catch { parsedResBody = capturedResBody; }

    return res.status(200).json({
      // Raw Anthropic exchange
      anthropic_status: capturedResStatus,
      anthropic_url: capturedUrl,
      anthropic_request_body: capturedReqBody,
      anthropic_request_headers: {
        ...capturedReqHeaders,
        // Redact key value but show diagnostics
        "x-api-key": capturedReqHeaders["x-api-key"]
          ? `[len=${capturedReqHeaders["x-api-key"].length}] prefix=${capturedReqHeaders["x-api-key"].slice(0, 16)} suffix=...${capturedReqHeaders["x-api-key"].slice(-4)}`
          : "(not sent)",
      },
      anthropic_response_headers: capturedResHeaders,
      anthropic_response_body: parsedResBody,
      // SDK layer
      sdk_result: sdkResult,
      sdk_error: sdkError,
      // Key diagnostics (from env, before SDK)
      env_key_length: apiKey.length,
      env_key_prefix: apiKey.slice(0, 16),
      env_key_suffix: apiKey.slice(-4),
      env_key_has_quotes: apiKey.startsWith('"') || apiKey.startsWith("'"),
      env_key_has_spaces: apiKey !== apiKey.trim(),
    });
  } catch (outerErr: unknown) {
    return res.status(500).json({
      ok: false,
      error: outerErr instanceof Error ? outerErr.message : String(outerErr),
      stack: outerErr instanceof Error ? outerErr.stack?.split("\n").slice(0, 8) : undefined,
      stage: "outer_handler",
    });
  }
}
