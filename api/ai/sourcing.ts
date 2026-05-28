// ============================================================
// Logisolve AI — /api/ai/sourcing
// Streaming SSE endpoint — sends progress events + final result.
// Uses claude-haiku-4-5 for speed (5-7x faster than sonnet).
// Server-side only — ANTHROPIC_API_KEY nunca llega al frontend.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const SYSTEM_PROMPT = `Eres un comprador técnico senior con 15 años de experiencia en refacciones y flotillas de transporte de carga en México.

Flotas: Freightliner (M2 106, Cascadia, Century), Kenworth (T680, T800, W900), International (LT, MV, HV), Peterbilt (389, 579), Ford (F-350, F-450, Super Duty, Transit), Mercedes-Benz Actros, Scania R, Volvo FH, Hino 700.

Sistemas: motor, transmisión, clutch/embrague, diferencial, eléctrico, frenos, suspensión, dirección, enfriamiento, escape, neumáticos, hidráulico, carrocería.

REGLAS:
- Si no confirmas la unidad exacta, dilo explícitamente
- Costos son ESTIMACIONES — nunca datos definitivos
- Lista suposiciones cuando las haces
- Confidence entre 0 y 1

Responde ÚNICAMENTE con JSON válido. Sin markdown, sin texto fuera del JSON.`;

function buildPrompt(needText: string, ctx: any): string {
  // Trimmed limits to reduce input tokens and speed up response
  const units     = (ctx?.units        ?? []).slice(0, 8);
  const parts     = (ctx?.parts        ?? []).slice(0, 10);
  const suppliers = (ctx?.suppliers    ?? []).slice(0, 6);
  const tickets   = (ctx?.recentTickets ?? []).slice(0, 5);
  const client    = ctx?.client ?? null;

  const unitLines = units.map((u: any) =>
    `• [${u.id}] ${u.marca} ${u.modelo} ${u.anio} km:${u.km ?? "?"} status:${u.statusOp}`
  ).join("\n") || "Sin unidades";

  const partLines = parts.map((p: any) =>
    `• ${p.nombre} OEM:${p.oem || "-"} AM:${p.aftermarket || "-"} $${p.ultimoPrecio || "?"}`
  ).join("\n") || "Catálogo vacío";

  const supplierLines = suppliers.map((s: any) =>
    `• ${s.nombre} | ${s.especialidad} | ${s.confiabilidad ?? "?"}% | ${s.contacto}`
  ).join("\n") || "Sin proveedores";

  const ticketLines = tickets.map((t: any) =>
    `• ${t.titulo} [${t.status}]`
  ).join("\n") || "Sin historial";

  const clientLine = client
    ? `${client.empresa} cat:${client.category} score:${client.score} crédito:${client.creditDays}d`
    : "No especificado";

  return `NECESIDAD: "${needText}"

FLOTA:
${unitLines}

CLIENTE: ${clientLine}

CATÁLOGO:
${partLines}

PROVEEDORES:
${supplierLines}

HISTORIAL:
${ticketLines}

JSON exacto a devolver (sin texto adicional):
{"interpretation":{"unitDetected":{"confirmed":bool,"marca":"","modelo":"","unitId":null,"confidence":0},"system":"","subsystem":"","faultProbable":"","symptoms":[],"urgency":"alta","criticality":"P2","assumptions":[]},"partsNeeded":[{"nombre":"","oem":null,"aftermarket":null,"aplicacion":"","urgente":bool,"notas":""}],"sourcing":{"keywordsSearch":[],"supplierPriority":[{"nombre":"","razon":"","contacto":""}],"alternativas":[],"piezasRelacionadas":[{"nombre":"","razon":""}]},"costEstimate":{"min":0,"max":0,"confidence":"media","basis":"","includeInstall":bool},"nextSteps":[],"riesgos":[{"descripcion":"","nivel":"medio"}],"confidence":0}`;
}

function extractJSON(text: string): unknown | null {
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch { /* continue */ }

  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* continue */ }
  }

  const fence = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fence?.[1]) {
    try { return JSON.parse(fence[1]); } catch { /* continue */ }
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ ok: false, error: "Method not allowed" });

  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY missing" });

  const { needText, context } = req.body ?? {};
  if (!needText?.trim()) {
    return res.status(400).json({ ok: false, error: "needText is required" });
  }

  // ── SSE streaming response ────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const t0 = Date.now();

  try {
    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model:      "claude-haiku-4-5",
      max_tokens: 1500,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: buildPrompt(needText.trim(), context ?? {}) }],
    });

    let chars = 0;
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        chars += event.delta.text.length;
        send({ type: "progress", chars });
      }
    }

    const msg     = await stream.finalMessage();
    const rawText = msg.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join("");

    const parsed = extractJSON(rawText);
    if (!parsed) {
      send({ type: "error", error: "El modelo no devolvió JSON válido", rawText });
    } else {
      send({
        type:        "result",
        result:      parsed,
        model:       msg.model,
        usage:       msg.usage,
        duration_ms: Date.now() - t0,
      });
    }

  } catch (err: unknown) {
    const isApiError = err instanceof Anthropic.APIError;
    send({
      type:  "error",
      error: isApiError ? err.message : String(err),
    });
  }

  res.end();
}
