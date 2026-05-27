// ============================================================
// Logisolve AI — /api/ai/test  (debug + working)
// Loggea request exacto enviado a Anthropic + respuesta completa.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const MODEL   = "claude-haiku-4-5-20251001"; // dated model — confirmed in SDK types
const API_URL = "https://api.anthropic.com/v1/messages";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY missing" });
  }

  const rawBodyPrompt =
    req.method === "POST" && typeof req.body?.prompt === "string"
      ? req.body.prompt.slice(0, 500)
      : null;

  const prompt = rawBodyPrompt ?? "Di exactamente: 'Logisolve AI operativo ✓' y nada más.";

  // ── Captured request/response for debugging ─────────────────
  let capturedReqBody  = "";
  let capturedReqHdrs: Record<string, string> = {};
  let capturedResStatus = 0;
  let capturedResBody   = "";

  const interceptedFetch: typeof fetch = async (input, init) => {
    // Capture outbound request
    capturedReqBody  = String(init?.body ?? "");
    const h = init?.headers;
    capturedReqHdrs  =
      h instanceof Headers
        ? Object.fromEntries(h.entries())
        : (h as Record<string, string>) ?? {};

    // Make real call
    const r = await fetch(input, init);

    // Clone and capture response
    capturedResStatus = r.status;
    const clone = r.clone();
    capturedResBody   = await clone.text();
    return r;
  };

  const t0 = Date.now();

  try {
    const client = new Anthropic({ apiKey, fetch: interceptedFetch });

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    return res.status(200).json({
      ok: true,
      response: text,
      model: message.model,
      usage: message.usage,
      duration_ms: Date.now() - t0,
      key_hint: `sk-ant-...${apiKey.slice(-4)}`,
      debug: {
        endpoint:     API_URL,
        model_used:   MODEL,
        req_body:     JSON.parse(capturedReqBody),
        req_headers:  { ...capturedReqHdrs, "x-api-key": "[REDACTED]" },
        res_status:   capturedResStatus,
      },
    });

  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const stack  = err instanceof Error ? err.stack  : undefined;
    const isAPI  = err instanceof Anthropic.APIError;

    return res.status(isAPI ? ((err as InstanceType<typeof Anthropic.APIError>).status ?? 500) : 500).json({
      ok: false,
      error: errMsg,
      debug: {
        endpoint:     API_URL,
        model_used:   MODEL,
        req_body:     capturedReqBody ? JSON.parse(capturedReqBody) : null,
        req_headers:  { ...capturedReqHdrs, "x-api-key": "[REDACTED]" },
        res_status:   capturedResStatus,
        res_body:     (() => { try { return JSON.parse(capturedResBody); } catch { return capturedResBody; } })(),
        stack,
        anthropic_api_error: isAPI ? {
          status:  (err as InstanceType<typeof Anthropic.APIError>).status,
          name:    (err as InstanceType<typeof Anthropic.APIError>).name,
          message: errMsg,
        } : null,
        received_prompt: prompt,
        req_method:      req.method,
        req_body_raw:    req.body,
      },
    });
  }
}
