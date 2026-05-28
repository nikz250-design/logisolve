// ============================================================
// Logisolve AI — /api/ai/test
// Usa @anthropic-ai/sdk (ESM-compatible).
// GET → prompt default; POST → prompt del body.
// Loggea request y response para debugging.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-haiku-4-5-20251001";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
    if (!apiKey) {
      return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY missing" });
    }

    const prompt: string =
      req.method === "POST" && typeof req.body?.prompt === "string"
        ? req.body.prompt.slice(0, 500)
        : "Di exactamente: 'Logisolve AI operativo ✓' y nada más.";

    const payload = {
      model: MODEL as "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user" as const, content: prompt }],
    };

    // Capture raw request/response for debugging
    let capturedReqBody: unknown = null;
    let capturedReqHeaders: Record<string, string> = {};
    let capturedResStatus: number = 0;
    let capturedResBody: string = "";

    const client = new Anthropic({
      apiKey,
      fetch: async (url: string | URL, init?: RequestInit) => {
        // Capture outgoing request
        capturedReqBody = init?.body ? JSON.parse(init.body as string) : null;
        // init.headers may be a Headers object or a plain object
        const rawHeaders = init?.headers;
        const headerEntries: [string, string][] = rawHeaders instanceof Headers
          ? [...rawHeaders.entries()]
          : Object.entries((rawHeaders as Record<string, string>) ?? {});
        capturedReqHeaders = Object.fromEntries(
          headerEntries.map(([k, v]) =>
            [k, k.toLowerCase() === "x-api-key" ? `sk-ant-...${v.slice(-4)} (len=${v.length})` : v]
          )
        );

        const response = await globalThis.fetch(url, init);

        // Capture raw response body (clone so SDK can still read it)
        const cloned = response.clone();
        capturedResStatus = response.status;
        capturedResBody = await cloned.text();

        return response;
      },
    });

    const t0 = Date.now();

    try {
      const message = await client.messages.create(payload);

      const text = message.content?.find((c) => c.type === "text" && "text" in c)
        ? (message.content.find((c) => c.type === "text") as { text: string }).text
        : "";

      return res.status(200).json({
        ok: true,
        response: text,
        model: message.model,
        usage: message.usage,
        duration_ms: Date.now() - t0,
        key_hint: `sk-ant-...${apiKey.slice(-4)}`,
      });
    } catch (sdkErr: unknown) {
      // SDK-level error (Anthropic API returned non-2xx)
      const isApiError = sdkErr instanceof Anthropic.APIError;
      return res.status(isApiError ? sdkErr.status : 500).json({
        ok: false,
        error: isApiError ? sdkErr.message : String(sdkErr),
        debug: {
          anthropic_status: capturedResStatus,
          anthropic_response: (() => {
            try { return JSON.parse(capturedResBody); } catch { return capturedResBody; }
          })(),
          outgoing_request: {
            url: "https://api.anthropic.com/v1/messages",
            body: capturedReqBody,
            headers: capturedReqHeaders,
          },
          model: MODEL,
          payload,
          key_hint: `sk-ant-...${apiKey.slice(-4)}`,
          key_length: apiKey.length,
          key_starts_with: apiKey.slice(0, 12),
        },
      });
    }
  } catch (outerErr: unknown) {
    // Unexpected error (env var, JSON parse, etc.)
    return res.status(500).json({
      ok: false,
      error: outerErr instanceof Error ? outerErr.message : String(outerErr),
      stage: "outer_handler",
    });
  }
}
