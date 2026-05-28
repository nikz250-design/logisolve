// ============================================================
// Logisolve AI — /api/ai/sourcing
// Sourcing Copilot: interpreta necesidades operativas y
// devuelve contexto de sourcing estructurado y accionable.
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

Flotas en las que eres experto: Freightliner (M2 106, Cascadia, Century), Kenworth (T680, T800, W900), International (LT, MV, HV), Peterbilt (389, 579), Ford (F-350, F-450, Super Duty, Transit), Mercedes-Benz Actros, Scania R, Volvo FH, Hino 700.

Sistemas que conoces a fondo: motor, transmisión, clutch/embrague, diferencial, sistema eléctrico, frenos, suspensión, dirección, enfriamiento, escape, neumáticos, hidráulico, carrocería.

Tu rol en cada análisis:
1. Identificar la falla probable con precisión técnica
2. Nombrar las piezas exactas (con OEM y aftermarket cuando los conoces)
3. Sugerir proveedores basándote en el historial real del cliente
4. Estimar costos SOLO cuando tienes base — siempre indica la fuente y confianza
5. Detectar piezas relacionadas que suelen fallar en conjunto
6. Priorizar operatividad de la unidad sobre ahorro

REGLAS DE TRANSPARENCIA:
- Si no puedes confirmar la unidad exacta, lo dices explícitamente
- Los rangos de costo son ESTIMACIONES — jamás datos definitivos
- Las suposiciones (assumptions) se listan siempre que las haces
- Si el historial no tiene datos relevantes, lo dices: "sin datos históricos"
- Confidence entre 0 y 1, basado en qué tan específica es la necesidad y el historial disponible

Responde ÚNICAMENTE con JSON válido. Sin markdown, sin texto fuera del JSON.`;

function buildPrompt(needText: string, ctx: any): string {
  const units     = (ctx?.units     ?? []).slice(0, 12);
  const parts     = (ctx?.parts     ?? []).slice(0, 15);
  const suppliers = (ctx?.suppliers ?? []).slice(0, 8);
  const tickets   = (ctx?.recentTickets ?? []).slice(0, 8);
  const client    = ctx?.client ?? null;

  const unitLines = units.map((u: any) =>
    `  • [${u.id}] ${u.marca} ${u.modelo} ${u.anio} — km: ${u.km?.toLocaleString("es-MX") ?? "?"} | statusOp: ${u.statusOp} | notas: ${u.notas || "sin notas"}`
  ).join("\n") || "  Sin unidades registradas";

  const partLines = parts.map((p: any) =>
    `  • ${p.nombre} | OEM: ${p.oem || "N/A"} | Aftermarket: ${p.aftermarket || "N/A"} | App: ${p.aplicacion} | Último precio: ${p.ultimoPrecio ? `$${p.ultimoPrecio}` : "sin precio"} | Proveedor: ${p.proveedor || "N/A"}`
  ).join("\n") || "  Catálogo vacío";

  const supplierLines = suppliers.map((s: any) =>
    `  • ${s.nombre} | Especialidad: ${s.especialidad} | Confiabilidad: ${s.confiabilidad ?? "?"}% | Contacto: ${s.contacto} | Horario: ${s.horario || "N/A"}`
  ).join("\n") || "  Sin proveedores registrados";

  const ticketLines = tickets.map((t: any) =>
    `  • ${t.titulo} | Status: ${t.status} | Precio: $${t.snap?.precioConIVA ?? 0} | Piezas: ${t.partRef || "N/A"} | Notas: ${t.notes || "sin notas"}`
  ).join("\n") || "  Sin historial reciente";

  const clientLine = client
    ? `${client.empresa} | Categoría: ${client.category} | Score: ${client.score} | Crédito: ${client.creditDays} días`
    : "No especificado";

  return `NECESIDAD OPERATIVA: "${needText}"

FLOTA ACTIVA (todas las unidades):
${unitLines}

CLIENTE: ${clientLine}

CATÁLOGO DE PIEZAS (historial de refacciones manejadas):
${partLines}

PROVEEDORES DISPONIBLES:
${supplierLines}

HISTORIAL DE TICKETS RECIENTES:
${ticketLines}

Devuelve ÚNICAMENTE este objeto JSON, sin texto adicional:
{
  "interpretation": {
    "unitDetected": { "confirmed": boolean, "marca": string, "modelo": string, "unitId": "id del array o null", "confidence": number },
    "system": string,
    "subsystem": string,
    "faultProbable": string,
    "symptoms": [string],
    "urgency": "critica|alta|media|baja",
    "criticality": "P1|P2|P3",
    "assumptions": [string]
  },
  "partsNeeded": [{ "nombre": string, "oem": "string o null", "aftermarket": "string o null", "aplicacion": string, "urgente": boolean, "notas": string }],
  "sourcing": {
    "keywordsSearch": [string],
    "supplierPriority": [{ "nombre": string, "razon": string, "contacto": string }],
    "alternativas": [string],
    "piezasRelacionadas": [{ "nombre": string, "razon": string }]
  },
  "costEstimate": { "min": number, "max": number, "confidence": "alta|media|baja|sin-datos", "basis": string, "includeInstall": boolean },
  "nextSteps": [string],
  "riesgos": [{ "descripcion": string, "nivel": "critico|alto|medio" }],
  "confidence": number
}`;
}

// Robust JSON extractor — tries multiple strategies before giving up.
function extractJSON(text: string): unknown | null {
  // 1. Strip markdown fences and try direct parse
  const stripped = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(stripped); } catch { /* continue */ }

  // 2. Find outermost { ... } block
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* continue */ }
  }

  // 3. Extract from code block content
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

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
    if (!apiKey) return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY missing" });

    const { needText, context } = req.body ?? {};
    if (!needText?.trim()) {
      return res.status(400).json({ ok: false, error: "needText is required" });
    }

    const client = new Anthropic({ apiKey });
    const t0     = Date.now();

    const userPrompt = buildPrompt(needText.trim(), context ?? {});

    const message = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 3000,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: "user", content: userPrompt }],
    });

    const rawText = message.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join("");

    const parsed = extractJSON(rawText);
    if (!parsed) {
      return res.status(200).json({
        ok:          false,
        error:       "El modelo no devolvió JSON válido",
        rawText,
        duration_ms: Date.now() - t0,
      });
    }

    return res.status(200).json({
      ok:          true,
      result:      parsed,
      model:       message.model,
      usage:       message.usage,
      duration_ms: Date.now() - t0,
    });

  } catch (err: unknown) {
    const isApiError = err instanceof Anthropic.APIError;
    return res.status(isApiError ? err.status : 500).json({
      ok:    false,
      error: isApiError ? err.message : String(err),
    });
  }
}
