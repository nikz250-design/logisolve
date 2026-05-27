// ============================================================
// Logisolve AI — /api/ai/stream
// Vercel Serverless Function — Server-Sent Events streaming
// POST: streams operational analysis tokens in real time
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAnthropicService } from "../../src/ai/services/AnthropicService";
import { buildLogisticsAnalysisPrompt } from "../../src/ai/prompts/logistics-analysis.prompt";
import { validateAuth } from "../../src/ai/middleware/auth";
import { checkDailyLimit, logUsage } from "../../src/ai/middleware/usageTracker";
import type { OperationalAnalysisInput } from "../../src/ai/context/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ──────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", process.env.VERCEL_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Logisolve-Sandbox");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (process.env.ENABLE_AI_EXPERIMENTAL !== "true") {
    return res.status(503).json({ error: "AI experimental features are disabled" });
  }

  const auth = validateAuth(req as any);
  if (!auth.ok) return res.status(401).json({ error: auth.error });
  const userId = auth.userId ?? "anonymous";

  const usage = await checkDailyLimit(userId);
  if (usage.limitReached) {
    return res.status(429).json({ error: "Daily token limit reached" });
  }

  const { input } = req.body as { input: OperationalAnalysisInput };
  if (!input) return res.status(400).json({ error: "Missing input" });

  // ── SSE headers ───────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const t0 = Date.now();
  let inputTokens = 0;
  let outputTokens = 0;
  let status: "success" | "error" | "cancelled" = "error";
  let fullContent = "";

  // Handle client disconnect
  let cancelled = false;
  req.on("close", () => {
    cancelled = true;
  });

  try {
    const service = getAnthropicService();
    const messages = buildLogisticsAnalysisPrompt(input);

    // Send heartbeat
    res.write("data: {\"heartbeat\":true}\n\n");

    for await (const chunk of service.stream(messages, { userId, maxTokens: 1024 })) {
      if (cancelled) {
        status = "cancelled";
        break;
      }
      fullContent += chunk.delta;
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    if (!cancelled) status = "success";
    res.write("data: [DONE]\n\n");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stream error";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  } finally {
    res.end();
    logUsage({
      userId,
      action: "operational_analysis_stream",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - t0,
      status,
    }).catch(() => {});
  }
}
