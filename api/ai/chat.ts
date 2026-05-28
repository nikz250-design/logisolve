// ============================================================
// Logisolve AI — /api/ai/chat
// Conversational assistant with app context.
// SSE streaming. Tool use for structured actions (quotes).
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// ── Quote suggestion tool ─────────────────────────────────────
const QUOTE_TOOL: Anthropic.Tool = {
  name: "sugerir_cotizacion",
  description: "Genera una cotización estructurada lista para crear como ticket en el sistema.",
  input_schema: {
    type: "object",
    properties: {
      titulo:    { type: "string" },
      partes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nombre:         { type: "string" },
            oem:            { type: ["string","null"] },
            costoEstimado:  { type: "number" },
            precioSugerido: { type: "number" },
            notas:          { type: "string" },
          },
          required: ["nombre","oem","costoEstimado","precioSugerido","notas"],
        },
      },
      costoTotal:      { type: "number" },
      precioTotal:     { type: "number" },
      clienteSugerido: { type: ["string","null"] },
      unidadSugerida:  { type: ["string","null"] },
      urgencia:        { type: "string", enum: ["critica","alta","media","baja"] },
      notas:           { type: "string" },
    },
    required: ["titulo","partes","costoTotal","precioTotal","clienteSugerido","unidadSugerida","urgencia","notas"],
  },
};

const SYSTEM = `Eres un asistente de operaciones para flotillas de transporte de carga en México. Hablas español. Eres práctico, directo y conciso.

Tienes acceso al catálogo de refacciones, unidades de la flota, proveedores y tickets recientes del usuario.

CÓMO IDENTIFICAR UNIDADES:
- El campo "eco:" es el NÚMERO ECONÓMICO de la unidad (ej: eco:1594 significa "la unidad 1594")
- Cuando el usuario diga "la 1594", "eco 1594", "unidad 1594" → busca eco:1594 en la flota
- El ID interno (UNI-XXXXX) es solo para el sistema, el usuario usa el número económico
- Si el contexto incluye la unidad, úsala directamente — no digas que no la tienes

Puedes:
- Buscar piezas compatibles según unidad y falla
- Comparar OEM vs aftermarket con números de parte
- Sugerir precios de venta con margen razonable (30-45%)
- Generar cotizaciones estructuradas llamando la herramienta sugerir_cotizacion
- Responder dudas técnicas sobre sistemas de camiones

REGLAS:
- Respuestas cortas. Sin preamble.
- Si el usuario pide una cotización, llama sugerir_cotizacion con datos reales del catálogo
- Usa los datos del contexto (flota, catálogo, proveedores)
- Si no tienes datos suficientes, pide los que necesitas en 1 pregunta`;

function buildContext(ctx: any): string {
  const units     = (ctx?.units     ?? []).slice(0, 10);
  const parts     = (ctx?.parts     ?? []).slice(0, 15);
  const suppliers = (ctx?.suppliers ?? []).slice(0,  6);
  const tickets   = (ctx?.tickets   ?? []).slice(0,  5);

  const uLines = units.map((u: any) =>
    `• eco:${u.economico ?? "-"} [${u.id}] ${u.marca} ${u.modelo} ${u.anio ?? ""} placa:${u.placa ?? "-"} km:${u.km ?? "?"}`
  ).join("\n") || "Sin unidades";

  const pLines = parts.map((p: any) =>
    `• ${p.nombre} OEM:${p.oem || "-"} AM:${p.aftermarket || "-"} $${p.ultimoPrecio || "?"}`
  ).join("\n") || "Catálogo vacío";

  const sLines = suppliers.map((s: any) =>
    `• ${s.nombre} | ${s.especialidad ?? "-"} | ${s.contacto ?? "-"}`
  ).join("\n") || "Sin proveedores";

  const tLines = tickets.map((t: any) =>
    `• ${t.titulo} [${t.status}] $${t.snap?.precioConIVA ?? "?"}`
  ).join("\n") || "Sin historial";

  return `FLOTA:\n${uLines}\n\nCATÁLOGO:\n${pLines}\n\nPROVEEDORES:\n${sLines}\n\nTICKETS RECIENTES:\n${tLines}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ ok: false, error: "Method not allowed" });

  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY missing" });

  const { messages, context } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: "messages required" });
  }

  // Keep last 20 messages to avoid runaway context
  const history: Anthropic.MessageParam[] = messages.slice(-20).map((m: any) => ({
    role:    m.role === "user" ? "user" : "assistant",
    content: String(m.content),
  }));

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const client = new Anthropic({ apiKey });

    const stream = client.messages.stream({
      model:      "claude-haiku-4-5",
      max_tokens: 1024,
      system:     `${SYSTEM}\n\nCONTEXTO DE LA APP:\n${buildContext(context ?? {})}`,
      tools:      [QUOTE_TOOL],
      tool_choice: { type: "auto" },
      messages:   history,
    });

    let textBuffer = "";

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        textBuffer += event.delta.text;
        send({ type: "text", delta: event.delta.text });
      }
    }

    const msg       = await stream.finalMessage();
    const toolBlock = msg.content.find(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
    );

    if (toolBlock?.name === "sugerir_cotizacion") {
      send({ type: "quote", data: toolBlock.input });
    }

    send({ type: "done", usage: msg.usage });

  } catch (err: unknown) {
    const isApi = err instanceof Anthropic.APIError;
    send({ type: "error", error: isApi ? err.message : String(err) });
  }

  res.end();
}
