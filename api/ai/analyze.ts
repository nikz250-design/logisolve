// ============================================================
// Logisolve AI — /api/ai/analyze
// Vercel Serverless Function (Node.js runtime)
// POST: runs operational analysis, returns JSON
// ANTHROPIC_API_KEY is NEVER accessible from the frontend.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAnthropicService } from "../../src/ai/services/AnthropicService";
import {
  buildLogisticsAnalysisPrompt,
} from "../../src/ai/prompts/logistics-analysis.prompt";
import { validateAuth } from "../../src/ai/middleware/auth";
import { logUsage, checkDailyLimit } from "../../src/ai/middleware/usageTracker";
import { analysisCache, CacheService } from "../../src/ai/services/CacheService";
import type { OperationalAnalysisInput, OperationalAnalysisOutput } from "../../src/ai/context/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── CORS ─────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", process.env.VERCEL_URL ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Logisolve-Sandbox");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Sandbox gate ──────────────────────────────────────────
  if (process.env.ENABLE_AI_EXPERIMENTAL !== "true") {
    return res.status(503).json({ error: "AI experimental features are disabled" });
  }

  // ── Auth ──────────────────────────────────────────────────
  const auth = validateAuth(req as any);
  if (!auth.ok) return res.status(401).json({ error: auth.error });
  const userId = auth.userId ?? "anonymous";

  // ── Daily limit ───────────────────────────────────────────
  const usage = await checkDailyLimit(userId);
  if (usage.limitReached) {
    return res.status(429).json({
      error: "Daily token limit reached",
      tokensUsed: usage.tokensUsed,
    });
  }

  // ── Parse body ────────────────────────────────────────────
  const { input } = req.body as { input: OperationalAnalysisInput };
  if (!input) return res.status(400).json({ error: "Missing input" });

  // ── Cache check ───────────────────────────────────────────
  const cacheKey = CacheService.keyFor("ops-analysis", input);
  const cached = analysisCache.get(cacheKey) as OperationalAnalysisOutput | null;
  if (cached) {
    res.setHeader("X-Cache", "HIT");
    return res.status(200).json({ result: cached, cached: true });
  }

  // ── AI call ───────────────────────────────────────────────
  const t0 = Date.now();
  let status: "success" | "error" = "error";
  let errorMessage: string | undefined;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const service = getAnthropicService();
    const messages = buildLogisticsAnalysisPrompt(input);
    const response = await service.complete(messages, {
      userId,
      maxTokens: 1024,
    });

    // Parse JSON from Claude's response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid AI response format");
    const result = JSON.parse(jsonMatch[0]) as OperationalAnalysisOutput;

    inputTokens = response.usage.inputTokens;
    outputTokens = response.usage.outputTokens;
    status = "success";

    // Cache result
    analysisCache.set(cacheKey, result);

    res.setHeader("X-Cache", "MISS");
    res.setHeader("X-Duration-Ms", String(Date.now() - t0));
    return res.status(200).json({ result });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: errorMessage });
  } finally {
    // Non-blocking log
    logUsage({
      userId,
      action: "operational_analysis",
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      inputTokens,
      outputTokens,
      durationMs: Date.now() - t0,
      status,
      errorMessage,
    }).catch(() => {});
  }
}
