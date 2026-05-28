// ============================================================
// Logisolve AI — /api/ai/sourcing
// Streaming SSE. Usa tool use para garantizar JSON válido —
// el modelo nunca puede devolver texto libre ni JSON truncado.
// Server-side only — ANTHROPIC_API_KEY nunca llega al frontend.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// ── Tool schema — el SDK garantiza que el output es JSON válido ──
const ANALYSIS_TOOL: Anthropic.Tool = {
  name:        "analizar_necesidad",
  description: "Analiza una necesidad operativa de refacciones para flotilla de transporte en México y devuelve diagnóstico técnico estructurado.",
  input_schema: {
    type: "object",
    properties: {
      interpretation: {
        type: "object",
        properties: {
          unitDetected: {
            type: "object",
            properties: {
              confirmed:  { type: "boolean" },
              marca:      { type: "string" },
              modelo:     { type: "string" },
              unitId:     { type: ["string", "null"] },
              confidence: { type: "number" },
            },
            required: ["confirmed", "marca", "modelo", "unitId", "confidence"],
          },
          system:        { type: "string" },
          subsystem:     { type: "string" },
          faultProbable: { type: "string" },
          symptoms:      { type: "array", items: { type: "string" } },
          urgency:       { type: "string", enum: ["critica", "alta", "media", "baja"] },
          criticality:   { type: "string", enum: ["P1", "P2", "P3"] },
          assumptions:   { type: "array", items: { type: "string" } },
        },
        required: ["unitDetected", "system", "subsystem", "faultProbable", "symptoms", "urgency", "criticality", "assumptions"],
      },
      partsNeeded: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nombre:      { type: "string" },
            oem:         { type: ["string", "null"] },
            aftermarket: { type: ["string", "null"] },
            aplicacion:  { type: "string" },
            urgente:     { type: "boolean" },
            notas:       { type: "string" },
          },
          required: ["nombre", "oem", "aftermarket", "aplicacion", "urgente", "notas"],
        },
      },
      sourcing: {
        type: "object",
        properties: {
          keywordsSearch: { type: "array", items: { type: "string" } },
          supplierPriority: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nombre:   { type: "string" },
                razon:    { type: "string" },
                contacto: { type: "string" },
              },
              required: ["nombre", "razon", "contacto"],
            },
          },
          alternativas:       { type: "array", items: { type: "string" } },
          piezasRelacionadas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nombre: { type: "string" },
                razon:  { type: "string" },
              },
              required: ["nombre", "razon"],
            },
          },
        },
        required: ["keywordsSearch", "supplierPriority", "alternativas", "piezasRelacionadas"],
      },
      costEstimate: {
        type: "object",
        properties: {
          min:            { type: "number" },
          max:            { type: "number" },
          confidence:     { type: "string", enum: ["alta", "media", "baja", "sin-datos"] },
          basis:          { type: "string" },
          includeInstall: { type: "boolean" },
        },
        required: ["min", "max", "confidence", "basis", "includeInstall"],
      },
      nextSteps: { type: "array", items: { type: "string" } },
      riesgos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            descripcion: { type: "string" },
            nivel:       { type: "string", enum: ["critico", "alto", "medio"] },
          },
          required: ["descripcion", "nivel"],
        },
      },
      confidence: { type: "number" },
    },
    required: ["interpretation", "partsNeeded", "sourcing", "costEstimate", "nextSteps", "riesgos", "confidence"],
  },
};

const SYSTEM_PROMPT = `Eres un comprador técnico senior con 15 años de experiencia en refacciones y flotillas de transporte de carga en México.

Flotas: Freightliner (M2 106, Cascadia, Century), Kenworth (T680, T800, W900), International (LT, MV, HV), Peterbilt (389, 579), Ford (F-350, F-450, Super Duty, Transit), Mercedes-Benz Actros, Scania R, Volvo FH, Hino 700.

Sistemas: motor, transmisión, clutch/embrague, diferencial, eléctrico, frenos, suspensión, dirección, enfriamiento, escape, neumáticos, hidráulico, carrocería.

REGLAS DE TRANSPARENCIA:
- Si no puedes confirmar la unidad exacta, confirmed:false y explica en assumptions
- costos son ESTIMACIONES — nunca datos definitivos
- Lista suposiciones cuando las haces
- confidence entre 0 y 1 según especificidad de la necesidad e historial disponible
- Prioriza operatividad sobre ahorro`;

function buildPrompt(needText: string, ctx: any): string {
  const units          = (ctx?.units         ?? []).slice(0, 8);
  const parts          = (ctx?.parts         ?? []).slice(0, 10);
  const suppliers      = (ctx?.suppliers     ?? []).slice(0, 6);
  const tickets        = (ctx?.recentTickets ?? []).slice(0, 5);
  const client         = ctx?.client ?? null;
  const selectedUnitId = ctx?.selectedUnitId ?? null;

  const selectedUnit = selectedUnitId
    ? units.find((u: any) => u.id === selectedUnitId) ?? null
    : null;

  const selectedUnitLine = selectedUnit
    ? `\n⚠ UNIDAD ESPECÍFICA (seleccionada por el operador — usa esta, confirmed:true):
[${selectedUnit.id}] ${selectedUnit.marca} ${selectedUnit.modelo} ${selectedUnit.anio ?? ""} km:${selectedUnit.km ?? "?"} status:${selectedUnit.statusOp ?? "?"}\n`
    : "";

  const unitLines = units.map((u: any) =>
    `• [${u.id}] ${u.marca} ${u.modelo} ${u.anio ?? ""} km:${u.km ?? "?"} status:${u.statusOp ?? "?"}`
  ).join("\n") || "Sin unidades registradas";

  const partLines = parts.map((p: any) =>
    `• ${p.nombre} OEM:${p.oem || "-"} AM:${p.aftermarket || "-"} $${p.ultimoPrecio || "?"}`
  ).join("\n") || "Catálogo vacío";

  const supplierLines = suppliers.map((s: any) =>
    `• ${s.nombre} | ${s.especialidad ?? "-"} | ${s.confiabilidad ?? "?"}% | ${s.contacto ?? "-"}`
  ).join("\n") || "Sin proveedores";

  const ticketLines = tickets.map((t: any) =>
    `• ${t.titulo} [${t.status}]`
  ).join("\n") || "Sin historial";

  const clientLine = client
    ? `${client.empresa} cat:${client.category} score:${client.score} crédito:${client.creditDays}d`
    : "No especificado";

  return `NECESIDAD OPERATIVA: "${needText}"
${selectedUnitLine}
FLOTA ACTIVA:
${unitLines}

CLIENTE: ${clientLine}

CATÁLOGO DE REFACCIONES (historial):
${partLines}

PROVEEDORES DISPONIBLES:
${supplierLines}

HISTORIAL RECIENTE:
${ticketLines}`;
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

  // ── SSE headers ───────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const t0   = Date.now();

  try {
    const client = new Anthropic({ apiKey });

    // tool_choice "any" fuerza al modelo a llamar la tool — JSON garantizado
    const stream = client.messages.stream({
      model:       "claude-haiku-4-5",
      max_tokens:  2000,
      system:      SYSTEM_PROMPT,
      tools:       [ANALYSIS_TOOL],
      tool_choice: { type: "any" },
      messages:    [{ role: "user", content: buildPrompt(needText.trim(), context ?? {}) }],
    });

    // Streaming progress — input_json_delta llega mientras el modelo llena el tool input
    let chars = 0;
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "input_json_delta"
      ) {
        chars += event.delta.partial_json.length;
        send({ type: "progress", chars });
      }
    }

    const msg       = await stream.finalMessage();
    const toolBlock = msg.content.find((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");

    if (!toolBlock) {
      send({ type: "error", error: "El modelo no llamó la tool de análisis." });
    } else {
      // toolBlock.input ya es un objeto JS válido — no hay nada que parsear
      send({
        type:        "result",
        result:      toolBlock.input,
        model:       msg.model,
        usage:       msg.usage,
        duration_ms: Date.now() - t0,
      });
    }

  } catch (err: unknown) {
    const isApiError = err instanceof Anthropic.APIError;
    send({ type: "error", error: isApiError ? err.message : String(err) });
  }

  res.end();
}
