// ============================================================
// Logisolve AI — /api/ai/modules
// Endpoint unificado para los 10 módulos IA.
// Recibe { module, context } → devuelve JSON estructurado por módulo.
// Server-side only — ANTHROPIC_API_KEY nunca llega al frontend.
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

type ModuleId =
  | "cotizacion-analisis"
  | "riesgo-operativo"
  | "recomendacion-margen"
  | "resumen-ejecutivo"
  | "notas-a-ticket"
  | "priorizacion"
  | "unidades-detenidas"
  | "whatsapp-cliente"
  | "resumen-financiero"
  | "upsell-crosssell";

interface ModuleDef {
  model: "claude-haiku-4-5-20251001" | "claude-sonnet-4-6";
  maxTokens: number;
  system: string;
  buildPrompt: (ctx: unknown) => string;
}

const MODULES: Record<ModuleId, ModuleDef> = {

  "cotizacion-analisis": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 600,
    system: "Eres analista de cotizaciones para una empresa de transporte y refacciones en México. Responde ÚNICAMENTE con JSON válido, sin markdown, sin texto extra.",
    buildPrompt: (ctx: any) => `Analiza esta cotización de refacciones:
Partes: ${JSON.stringify(ctx?.partes?.slice(0,10) ?? [])}
Cliente: ${ctx?.cliente ?? "No especificado"}
Total: $${ctx?.total ?? 0} MXN
Margen global: ${ctx?.margen ?? 0}%
Unidad: ${ctx?.unidad ?? "No especificada"}

Responde con este JSON exacto:
{"viabilidad":"alta|media|baja","score":0-100,"alertas":["..."],"sugerencias":["..."],"resumen":"1-2 oraciones en español"}`,
  },

  "riesgo-operativo": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 600,
    system: "Eres analista de riesgo operativo para flota de transporte en México. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => `Detecta riesgos en esta operación logística:
Tickets activos P1: ${ctx?.p1Count ?? 0}
Unidades detenidas: ${ctx?.unidadesDetenidas ?? 0}
Días promedio sin cerrar: ${ctx?.diasPromedio ?? 0}
Valor en riesgo: $${ctx?.valorRiesgo ?? 0} MXN
Tickets vencidos sin cobrar: ${ctx?.vencidos ?? 0}
Clientes con mora: ${ctx?.clientesMora ?? 0}

Responde con JSON:
{"nivelRiesgo":"critico|alto|medio|bajo","factoresRiesgo":["..."],"accionInmediata":"...","impactoEstimado":"...","recomendaciones":["..."],"score":0-100}`,
  },

  "recomendacion-margen": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 500,
    system: "Eres consultor de precios y márgenes para refacciones automotrices en México. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => `Recomienda margen óptimo para esta cotización:
Costo total partes: $${ctx?.costoTotal ?? 0} MXN
Tipo de operación: ${ctx?.tipoOp ?? "general"}
Categoría cliente: ${ctx?.categoriaCliente ?? "regular"}
Historial margen con este cliente: ${ctx?.historialMargen ?? "sin datos"}%
Margen actual propuesto: ${ctx?.margenActual ?? 0}%
Número de partes: ${ctx?.numPartes ?? 1}
Urgencia: ${ctx?.urgencia ?? "normal"}

Responde con JSON:
{"margenSugerido":0-100,"justificacion":"...","rangoMin":0-100,"rangoMax":0-100,"advertencia":"...o null","diferenciaMXN":0}`,
  },

  "resumen-ejecutivo": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 500,
    system: "Eres redactor de comunicaciones comerciales para empresa de transporte en México. Tono: profesional, claro, en español. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => `Redacta un resumen ejecutivo para el cliente:
Servicio: ${ctx?.servicio ?? "Refacciones"}
Partes cotizadas: ${(ctx?.partes ?? []).slice(0,5).map((p:any)=>p?.nombre ?? p).join(", ")}
Total con IVA: $${ctx?.totalConIva ?? 0} MXN
Cliente: ${ctx?.cliente ?? "Cliente"}
Unidad: ${ctx?.unidad ?? ""}
Garantía/condiciones: ${ctx?.condiciones ?? "Estándar"}

Responde con JSON:
{"resumen":"2-3 oraciones para el cliente","puntosClave":["..."],"llamadaAccion":"texto de cierre breve","tono":"formal|semiformal"}`,
  },

  "notas-a-ticket": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 700,
    system: "Eres dispatcher de taller mecánico en México. Conviertes notas técnicas en tickets operativos estructurados. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => `Convierte estas notas técnicas en un ticket operativo:
Notas: "${ctx?.notas ?? ""}"
Unidad: ${ctx?.unidad ?? "No especificada"}
Fecha: ${ctx?.fecha ?? new Date().toLocaleDateString("es-MX")}
Operador: ${ctx?.operador ?? ""}

Responde con JSON:
{"titulo":"máx 60 chars","descripcion":"párrafo claro y técnico","prioridad":"P1|P2|P3","tipoOp":"consumable|general|tech|heavy|logistics|rescue","piezas":["parte1","parte2"],"urgente":true|false,"estimadoHoras":0-72}`,
  },

  "priorizacion": {
    model: "claude-sonnet-4-6",
    maxTokens: 800,
    system: "Eres jefe de operaciones de una empresa de transporte en México. Priorizas tickets según impacto financiero, unidades detenidas y urgencia del cliente. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => `Prioriza estos tickets operativos:
${(ctx?.tickets ?? []).slice(0,15).map((t:any,i:number)=>`${i+1}. ID:${t.id} | "${t.titulo}" | Estado:${t.status} | Días abierto:${t.dias} | Valor:$${t.valor} | Unidad:${t.unidadStatus ?? "activa"}`).join("\n")}

Responde con JSON:
{"priorizacion":[{"id":"...","prioridad":"P1|P2|P3","razon":"...breve"}],"resumen":"...","accionUrgente":"...o null"}`,
  },

  "unidades-detenidas": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 700,
    system: "Eres jefe de flotilla de transporte en México. Analizas el estado de unidades detenidas y defines acciones críticas. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => `Analiza estas unidades de la flotilla:
${(ctx?.unidades ?? []).slice(0,12).map((u:any)=>`ECO:${u.eco} | ${u.marca} ${u.modelo} | Estado:${u.status} | Km:${u.km} | Días detenida:${u.diasDetenida ?? 0} | Último servicio:${u.ultimoSvc}`).join("\n")}

Tickets activos relacionados: ${ctx?.ticketsRelacionados ?? 0}
Pérdida estimada por parada: $${ctx?.perdidaEstimada ?? 0} MXN/día

Responde con JSON:
{"criticas":[{"eco":"...","riesgo":"critico|alto|medio","accion":"...","impacto":"..."}],"resumen":"...","totalEnRiesgo":0,"prioridadAccion":"..."}`,
  },

  "whatsapp-cliente": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 500,
    system: "Eres asesor de servicio al cliente para empresa de refacciones y transporte en México. Redactas mensajes de WhatsApp profesionales pero amigables. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => `Redacta un mensaje de WhatsApp para el cliente:
Cliente: ${ctx?.cliente ?? "Cliente"}
Asunto: ${ctx?.asunto ?? ctx?.titulo ?? "Actualización de su servicio"}
Estado actual: ${ctx?.status ?? "en proceso"}
Piezas/servicio: ${ctx?.servicio ?? ""}
ETA estimado: ${ctx?.eta ?? "en breve"}
Monto: ${ctx?.monto ? `$${ctx.monto} MXN` : "por confirmar"}
Nombre asesor: ${ctx?.asesor ?? "Equipo Logisolve"}

Responde con JSON:
{"mensaje":"texto listo para copiar y pegar en WhatsApp","emoji":"1-2 emojis apropiados","tono":"formal|amigable","longitud":"corto|medio"}`,
  },

  "resumen-financiero": {
    model: "claude-sonnet-4-6",
    maxTokens: 900,
    system: "Eres CFO y analista financiero de empresa de transporte y refacciones en México. Generas resúmenes ejecutivos semanales. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => `Genera el resumen financiero semanal:
Facturado semana: $${ctx?.facturado ?? 0} MXN
Cobrado semana: $${ctx?.cobrado ?? 0} MXN
Margen promedio: ${ctx?.margenProm ?? 0}%
Tickets cerrados: ${ctx?.ticketsCerrados ?? 0}
Tickets abiertos: ${ctx?.ticketsAbiertos ?? 0}
Cartera vencida: $${ctx?.carteraVencida ?? 0} MXN
Unidades detenidas: ${ctx?.unidadesDetenidas ?? 0}
Top operación: ${ctx?.topOp ?? "N/A"}
Vs semana anterior: ${ctx?.vsAnterior ?? "sin datos"}

Responde con JSON:
{"resumen":"2-3 oraciones ejecutivas","tendencias":["..."],"alertas":["..."],"recomendaciones":["..."],"headline":"frase impactante de 1 línea","semaforo":"verde|amarillo|rojo"}`,
  },

  "upsell-crosssell": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 600,
    system: "Eres consultor de ventas para empresa de refacciones automotrices y logística en México. Identificas oportunidades de upsell y cross-sell. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => `Identifica oportunidades de venta adicional para este cliente/ticket:
Servicio actual: ${ctx?.servicio ?? "Refacciones"}
Partes cotizadas: ${(ctx?.partes ?? []).slice(0,8).map((p:any)=>p?.nombre ?? p).join(", ")}
Marca/modelo unidad: ${ctx?.unidad ?? ""}
Km unidad: ${ctx?.km ?? 0}
Historial cliente: ${ctx?.historial ?? "cliente nuevo"}
Total actual: $${ctx?.total ?? 0} MXN

Responde con JSON:
{"sugerencias":[{"tipo":"upsell|crosssell","servicio":"...","razon":"...","valorEstimado":0,"prioridad":"alta|media|baja"}],"impactoTotal":0,"mensajeVenta":"...","potencial":"alto|medio|bajo"}`,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
    if (!apiKey) return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY missing" });

    const { module: moduleId, context } = req.body ?? {};
    if (!moduleId) return res.status(400).json({ ok: false, error: "module is required" });

    const moduleDef = MODULES[moduleId as ModuleId];
    if (!moduleDef) {
      return res.status(400).json({
        ok: false,
        error: `Unknown module: ${moduleId}`,
        validModules: Object.keys(MODULES),
      });
    }

    const client = new Anthropic({ apiKey });
    const t0 = Date.now();

    try {
      const message = await client.messages.create({
        model: moduleDef.model,
        max_tokens: moduleDef.maxTokens,
        system: moduleDef.system,
        messages: [{ role: "user", content: moduleDef.buildPrompt(context) }],
      });

      const rawText = message.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { type: "text"; text: string }).text)
        .join("");

      // Parse JSON — LLM should return only JSON, but strip markdown fences if present
      let parsed: unknown;
      try {
        const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { rawText };
      }

      return res.status(200).json({
        ok: true,
        module: moduleId,
        result: parsed,
        model: message.model,
        usage: message.usage,
        duration_ms: Date.now() - t0,
      });

    } catch (sdkErr: unknown) {
      const isApiError = sdkErr instanceof Anthropic.APIError;
      return res.status(isApiError ? sdkErr.status : 500).json({
        ok: false,
        error: isApiError ? sdkErr.message : String(sdkErr),
        module: moduleId,
      });
    }

  } catch (outerErr: unknown) {
    return res.status(500).json({
      ok: false,
      error: outerErr instanceof Error ? outerErr.message : String(outerErr),
      stage: "outer_handler",
    });
  }
}
