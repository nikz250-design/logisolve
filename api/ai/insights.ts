// ============================================================
// Logisolve AI — /api/ai/insights
// Inteligencia Operativa — análisis estratégico SSE
// Usa tool_use para garantizar JSON válido.
// Server-side only — ANTHROPIC_API_KEY nunca llega al frontend.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// ── Tool schema — garantiza output JSON válido y estructurado ──
const INSIGHTS_TOOL: Anthropic.Tool = {
  name: "generar_inteligencia_operativa",
  description: "Genera un análisis estratégico completo de la salud financiera y operativa de una PyME de logística en México, con insights accionables, riesgos, oportunidades y estrategia de escalamiento.",
  input_schema: {
    type: "object",
    properties: {
      resumenEjecutivo: {
        type: "string",
        description: "Resumen ejecutivo en 2-3 oraciones que captura el estado actual del negocio y la oportunidad principal.",
      },
      saludFinanciera: {
        type: "object",
        properties: {
          score: {
            type: "number",
            description: "Puntuación de salud financiera de 0 a 100.",
          },
          nivel: {
            type: "string",
            enum: ["excelente", "buena", "regular", "crítica"],
          },
          factores: {
            type: "array",
            items: { type: "string" },
            description: "Factores clave que determinan la puntuación (máximo 5).",
          },
        },
        required: ["score", "nivel", "factores"],
      },
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            categoria: {
              type: "string",
              enum: ["financiero", "operativo", "cliente", "crecimiento", "riesgo"],
            },
            titulo: { type: "string" },
            descripcion: { type: "string" },
            impacto: {
              type: "string",
              enum: ["alto", "medio", "bajo"],
            },
            accion: {
              type: "string",
              description: "Paso concreto e inmediato que el dueño debe tomar.",
            },
          },
          required: ["categoria", "titulo", "descripcion", "impacto", "accion"],
        },
        description: "Lista de 4 a 7 insights estratégicos accionables.",
      },
      riesgos: {
        type: "array",
        items: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            descripcion: { type: "string" },
            urgencia: {
              type: "string",
              enum: ["inmediata", "alta", "media", "baja"],
            },
          },
          required: ["titulo", "descripcion", "urgencia"],
        },
        description: "Riesgos operativos o financieros identificados (2 a 5).",
      },
      oportunidades: {
        type: "array",
        items: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            descripcion: { type: "string" },
            potencialMXN: {
              type: "number",
              description: "Potencial de ingreso adicional estimado en MXN (número entero).",
            },
          },
          required: ["titulo", "descripcion", "potencialMXN"],
        },
        description: "Oportunidades de crecimiento o mejora con potencial monetario (2 a 4).",
      },
      estrategiaEscala: {
        type: "object",
        properties: {
          objetivo: {
            type: "string",
            description: "Objetivo estratégico principal a 6-12 meses.",
          },
          pasos: {
            type: "array",
            items: { type: "string" },
            description: "Pasos secuenciales para alcanzar el objetivo (3 a 6 pasos).",
          },
          kpisObjetivo: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kpi:     { type: "string" },
                actual:  { type: "string" },
                objetivo: { type: "string" },
              },
              required: ["kpi", "actual", "objetivo"],
            },
            description: "KPIs clave con valor actual y meta (3 a 5 KPIs).",
          },
        },
        required: ["objetivo", "pasos", "kpisObjetivo"],
      },
      alertas: {
        type: "array",
        items: { type: "string" },
        description: "Alertas cortas y urgentes que requieren atención inmediata (0 a 3).",
      },
    },
    required: [
      "resumenEjecutivo",
      "saludFinanciera",
      "insights",
      "riesgos",
      "oportunidades",
      "estrategiaEscala",
      "alertas",
    ],
  },
};

const SYSTEM_PROMPT = `Eres el Director de Inteligencia de Negocios de Logisolve, una plataforma de gestión operativa para PyMEs de logística y transporte en México. Tu rol es analizar los datos de la empresa y generar insights estratégicos de alto valor que ayuden al dueño del negocio a:

1. Entender la salud real de su empresa (no solo el saldo bancario)
2. Identificar riesgos antes de que se conviertan en crisis
3. Descubrir oportunidades de crecimiento concretas y cuantificadas
4. Trazar un camino claro para escalar de PyME a empresa mediana

CONTEXTO DEL MERCADO:
- El transporte y logística en México es un sector de $1.2 billones MXN/año
- Las PyMEs transportistas tienen márgenes netos típicos de 8-18%
- Los mayores riesgos son: morosidad de clientes, costos de combustible, y mantenimiento inesperado
- La clave para escalar es: digitalización, diversificación de clientes, y financiamiento de flota

PRINCIPIOS DE ANÁLISIS:
- Sé directo y específico: usa los números reales del negocio
- Prioriza por impacto económico en MXN, no por gravedad abstracta
- Cada insight debe tener una acción concreta que el dueño pueda ejecutar hoy
- Cuando el margen neto sea < 15%, es señal de alerta crítica
- Una cartera > 30 días promedio es riesgo de flujo de caja
- Concentración > 40% en un solo cliente es riesgo estructural
- Tickets cancelados > 10% del total indican problema operativo

TONO: Profesional pero directo. Como un CFO consultor que habla claro, no como un reporte corporativo.

Analiza todos los datos del negocio que te proporcionen y genera el análisis estratégico completo.`;

function buildPrompt(payload: any): string {
  const {
    kpis,
    statusBreakdown,
    topClients,
    cartera,
    marginAnalysis,
    paymentMix,
    weeklyTrend,
    opCategories,
    recentCancelled,
    period,
  } = payload ?? {};

  const lines: string[] = [];

  lines.push(`=== ANÁLISIS LOGISOLVE — DATOS EMPRESARIALES ===`);
  lines.push(`Período analizado: ${period ?? "Últimos 30 días"}`);
  lines.push(``);

  if (kpis) {
    lines.push(`--- KPIs PRINCIPALES ---`);
    lines.push(`Facturación total: $${(kpis.totalRevenue ?? 0).toLocaleString("es-MX")} MXN`);
    lines.push(`Utilidad neta: $${(kpis.utilNeta ?? 0).toLocaleString("es-MX")} MXN`);
    lines.push(`Margen neto promedio: ${(kpis.avgMargin ?? 0).toFixed(1)}%`);
    lines.push(`Total de operaciones: ${kpis.ticketCount ?? 0}`);
    lines.push(``);
  }

  if (statusBreakdown) {
    lines.push(`--- ESTADO DEL PIPELINE ---`);
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      lines.push(`  ${status}: ${count} operaciones`);
    });
    lines.push(``);
  }

  if (Array.isArray(topClients) && topClients.length > 0) {
    lines.push(`--- TOP CLIENTES POR INGRESOS ---`);
    topClients.forEach((c: any, i: number) => {
      const pct = kpis?.totalRevenue > 0
        ? ((c.revenue / kpis.totalRevenue) * 100).toFixed(1)
        : "0.0";
      lines.push(`  ${i + 1}. ${c.empresa}: $${(c.revenue ?? 0).toLocaleString("es-MX")} MXN (${pct}% del total) — ${c.ticketCount} ops`);
    });
    lines.push(``);
  }

  if (cartera) {
    lines.push(`--- CARTERA (CxC) ---`);
    lines.push(`Total pendiente de cobro: $${(cartera.total ?? 0).toLocaleString("es-MX")} MXN`);
    lines.push(`Operaciones en cartera: ${cartera.count ?? 0}`);
    if (cartera.oldest) lines.push(`Operación más antigua sin cobrar: ${cartera.oldest} días`);
    lines.push(``);
  }

  if (marginAnalysis) {
    lines.push(`--- ANÁLISIS DE MÁRGENES ---`);
    lines.push(`Margen promedio: ${(marginAnalysis.avg ?? 0).toFixed(1)}%`);
    lines.push(`Tickets con margen bajo (<25%): ${marginAnalysis.lowMarginCount ?? 0} (${(marginAnalysis.lowMarginPct ?? 0).toFixed(1)}% del total)`);
    if (Array.isArray(marginAnalysis.lowMarginSample) && marginAnalysis.lowMarginSample.length > 0) {
      lines.push(`Muestra de tickets de bajo margen: ${marginAnalysis.lowMarginSample.join(", ")}`);
    }
    lines.push(``);
  }

  if (paymentMix && Object.keys(paymentMix).length > 0) {
    lines.push(`--- MIX DE TIPOS DE OPERACIÓN ---`);
    Object.entries(paymentMix).forEach(([type, count]) => {
      lines.push(`  ${type}: ${count} operaciones`);
    });
    lines.push(``);
  }

  if (Array.isArray(weeklyTrend) && weeklyTrend.length > 0) {
    lines.push(`--- TENDENCIA SEMANAL (últimas 4 semanas) ---`);
    weeklyTrend.forEach((w: any) => {
      lines.push(`  Semana del ${w.weekLabel}: $${(w.revenue ?? 0).toLocaleString("es-MX")} MXN — ${w.ops} ops`);
    });
    lines.push(``);
  }

  if (opCategories && Object.keys(opCategories).length > 0) {
    lines.push(`--- CATEGORÍAS DE OPERACIONES ---`);
    Object.entries(opCategories).forEach(([cat, data]: [string, any]) => {
      lines.push(`  ${cat}: ${data.count} ops, $${(data.revenue ?? 0).toLocaleString("es-MX")} MXN`);
    });
    lines.push(``);
  }

  if (Array.isArray(recentCancelled) && recentCancelled.length > 0) {
    lines.push(`--- OPERACIONES CANCELADAS RECIENTES ---`);
    recentCancelled.slice(0, 5).forEach((t: any) => {
      lines.push(`  • ${t.titulo ?? "Sin título"} — Cliente: ${t.cliente ?? "N/A"} — Fecha: ${t.date ?? "N/A"}`);
    });
    lines.push(``);
  }

  lines.push(`=== FIN DE DATOS ===`);
  lines.push(`Genera el análisis estratégico completo basándote en estos datos.`);

  return lines.join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ ok: false, error: "Method not allowed" });

  // ── Experimental gate ─────────────────────────────────────────
  if (process.env.ENABLE_AI_EXPERIMENTAL !== "true") {
    return res.status(503).json({ ok: false, error: "AI experimental features are disabled" });
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY missing" });

  const { payload } = req.body ?? {};
  if (!payload) {
    return res.status(400).json({ ok: false, error: "payload is required" });
  }

  // ── SSE headers ───────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const t0   = Date.now();

  try {
    const anthropic = new Anthropic({ apiKey });

    // tool_choice "any" fuerza al modelo a llamar la tool — JSON garantizado
    const stream = anthropic.messages.stream({
      model:       "claude-opus-4-7",
      max_tokens:  8000,
      thinking:    { type: "enabled", budget_tokens: 5000 },
      system:      SYSTEM_PROMPT,
      tools:       [INSIGHTS_TOOL],
      tool_choice: { type: "any" },
      messages:    [{ role: "user", content: buildPrompt(payload) }],
    });

    // Streaming progress — input_json_delta llega mientras el modelo llena el tool input
    let chars = 0;
    let thinkingChars = 0;
    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "input_json_delta") {
          chars += event.delta.partial_json.length;
          send({ type: "progress", chars, thinkingChars });
        } else if (event.delta.type === "thinking_delta") {
          thinkingChars += event.delta.thinking.length;
          send({ type: "thinking", chars, thinkingChars });
        }
      }
    }

    const msg       = await stream.finalMessage();
    const toolBlock = msg.content.find(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
    );

    if (!toolBlock) {
      send({ type: "error", error: "El modelo no llamó la tool de análisis." });
    } else {
      send({
        type:        "result",
        result:      toolBlock.input,
        model:       msg.model,
        usage:       msg.usage,
        duration_ms: Date.now() - t0,
        done:        true,
      });
    }

  } catch (err: unknown) {
    const isApiError = err instanceof Anthropic.APIError;
    send({ type: "error", error: isApiError ? err.message : String(err) });
  }

  res.end();
}
