// ============================================================
// Logisolve AI — /api/ai/test
// Usa https nativo de Node.js — sin SDK, sin fetch, cero deps extra.
// Loggea todo: request, response, error exacto de Anthropic.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import https from "https";

const MODEL   = "claude-haiku-4-5-20251001";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// Raw HTTPS call to Anthropic — no SDK, no fetch polyfill issues
function callAnthropic(apiKey: string, payload: object): Promise<{ status: number; body: unknown; rawBody: string }> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload);
    const options = {
      hostname: "api.anthropic.com",
      path:     "/v1/messages",
      method:   "POST",
      headers: {
        "Content-Type":      "application/json",
        "Content-Length":    Buffer.byteLength(bodyStr),
        "x-api-key":         apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        let parsed: unknown;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode ?? 0, body: parsed, rawBody: data });
      });
    });

    req.on("error", reject);
    req.setTimeout(28_000, () => { req.destroy(new Error("Request timeout")); });
    req.write(bodyStr);
    req.end();
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY missing" });
  }

  const prompt: string =
    req.method === "POST" && typeof req.body?.prompt === "string"
      ? req.body.prompt.slice(0, 500)
      : "Di exactamente: 'Logisolve AI operativo ✓' y nada más.";

  const payload = {
    model:      MODEL,
    max_tokens: 256,
    messages:   [{ role: "user", content: prompt }],
  };

  const t0 = Date.now();

  try {
    const { status, body, rawBody } = await callAnthropic(apiKey, payload);

    if (status !== 200) {
      // Return FULL Anthropic error so we can see exactly what failed
      return res.status(status).json({
        ok:    false,
        error: (body as { error?: { message?: string } })?.error?.message ?? rawBody,
        debug: {
          anthropic_status:   status,
          anthropic_response: body,
          model:              MODEL,
          payload,
          key_hint:           `sk-ant-...${apiKey.slice(-4)}`,
          key_length:         apiKey.length,
          key_starts_with:    apiKey.slice(0, 12),
        },
      });
    }

    const b = body as {
      content: Array<{ type: string; text?: string }>;
      model: string;
      usage: { input_tokens: number; output_tokens: number };
    };
    const text = b.content?.find(c => c.type === "text")?.text ?? "";

    return res.status(200).json({
      ok:          true,
      response:    text,
      model:       b.model,
      usage:       b.usage,
      duration_ms: Date.now() - t0,
      key_hint:    `sk-ant-...${apiKey.slice(-4)}`,
    });

  } catch (err: unknown) {
    return res.status(500).json({
      ok:    false,
      error: err instanceof Error ? err.message : String(err),
      debug: {
        model:       MODEL,
        payload,
        key_hint:    `sk-ant-...${apiKey.slice(-4)}`,
        key_length:  apiKey.length,
        key_starts:  apiKey.slice(0, 12),
      },
    });
  }
}
