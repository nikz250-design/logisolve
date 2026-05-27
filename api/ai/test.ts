// ============================================================
// Logisolve AI — /api/ai/test
// Vercel Serverless Function (Node.js 20.x)
// GET/POST: smoke test — verifies ANTHROPIC_API_KEY is set
// and Claude responds. Returns JSON. API key is NEVER exposed.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

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
    // Sanitise: max 500 chars, strip any injection attempts
    prompt = String(req.body.prompt).slice(0, 500);
  }

  // ── Call Claude ───────────────────────────────────────────
  const t0 = Date.now();
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY, // server-side only
    });

    const message = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    return res.status(200).json({
      ok: true,
      response: text,
      model: message.model,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
      duration_ms: Date.now() - t0,
      // ⚠️  API key is NEVER included here — only a masked hint
      key_hint: `sk-ant-...${process.env.ANTHROPIC_API_KEY.slice(-4)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      message.includes("401") || message.includes("auth") ? 401 : 500;
    return res.status(status).json({ ok: false, error: message });
  }
}
