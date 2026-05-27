// ============================================================
// Logisolve AI — /api/ai/test
// Vercel Serverless Function (Node.js 20.x)
// GET/POST: smoke test — verifies ANTHROPIC_API_KEY is set
// and Claude responds. Returns JSON. API key is NEVER exposed.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

// claude-sonnet-4-6: listed in SDK @anthropic-ai/sdk@0.99.0 Model type
const MODEL = "claude-sonnet-4-6";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "X-Content-Type-Options": "nosniff",
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS preflight ────────────────────────────────────────
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Guard: API key must exist server-side ─────────────────
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      ok: false,
      error: "ANTHROPIC_API_KEY not configured on this deployment",
    });
  }

  // ── Optional custom prompt from body (POST) ───────────────
  let prompt = "Di exactamente: 'Logisolve AI operativo ✓' y nada más.";
  if (req.method === "POST" && req.body?.prompt) {
    prompt = String(req.body.prompt).slice(0, 500);
  }

  // ── Call Claude ───────────────────────────────────────────
  const t0 = Date.now();
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    return res.status(200).json({
      ok: true,
      response: text,
      model: message.model,
      usage: {
        input_tokens:  message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
      duration_ms: Date.now() - t0,
      key_hint: `sk-ant-...${process.env.ANTHROPIC_API_KEY.slice(-4)}`,
    });
  } catch (err: unknown) {
    // Surface the full Anthropic error for diagnosis
    const isAPIError = err instanceof Anthropic.APIError;
    const errMsg   = err instanceof Error ? err.message : "Unknown error";
    const httpStatus = isAPIError ? (err as InstanceType<typeof Anthropic.APIError>).status : 500;
    return res.status(httpStatus ?? 500).json({
      ok:     false,
      error:  errMsg,
      status: httpStatus,
      type:   isAPIError ? (err as InstanceType<typeof Anthropic.APIError>).name : "Error",
    });
  }
}
