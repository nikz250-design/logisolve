// ============================================================
// Logisolve AI — /api/ai/modules
// Endpoint unificado para los 10 módulos IA.
// Recibe contexto estructurado del AIContextEngine (frontend).
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
  buildPrompt: (ctx: any) => string;
}

const mxn = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n ?? 0);

const pct = (n: number) => `${(n ?? 0).toFixed(1)}%`;

const MODULES: Record<ModuleId, ModuleDef> = {

  // ── 1. Análisis de cotización ─────────────────────────────────────────────
  "cotizacion-analisis": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 600,
    system: "Eres analista de cotizaciones para empresa de transporte y refacciones en México. Responde ÚNICAMENTE con JSON válido, sin markdown ni texto extra.",
    buildPrompt: (ctx: any) => {
      const t = ctx?.ticket ?? {};
      const c = ctx?.client ?? {};
      const u = ctx?.unit ?? {};
      const s = t.snap ?? {};
      const hist = (ctx?.clientHistory ?? []).slice(0, 5);

      return `Analiza esta cotización real de refacciones automotrices:

TICKET: ${t.titulo ?? "Sin título"}
Operación: ${t.opId ?? "general"} | Prioridad: ${t.priority ?? "N/A"} | Pago: ${t.payType === "credit" ? "Crédito" : "Contado"}
Modificadores: ${t.mods?.length ? t.mods.join(", ") : "ninguno"}
Notas: ${t.notes || "sin notas"}

FINANCIERO:
Costo base: ${mxn(s.costoBase)} | Gastos: ${mxn(s.gastos)} | Costo total: ${mxn(s.costoTotal)}
Precio sin IVA: ${mxn(s.precioSinIVA)} | IVA: ${mxn(s.ivaTraslad)} | Precio c/IVA: ${mxn(s.precioConIVA)}
Markup: ${pct(s.markupSobre)} | Margen neto: ${pct(s.margenNetoPrecio)} | Utilidad neta: ${mxn(s.uNeta)}
ISR estimado: ${mxn(s.isr)}

CLIENTE: ${c.empresa ?? "No especificado"} | Categoría: ${c.category ?? "N/A"} | Score: ${c.score ?? 0}
Días crédito: ${c.creditDays ?? "N/A"}

UNIDAD: ${u.marca ? `${u.marca} ${u.modelo} ${u.anio} — ${u.km?.toLocaleString("es-MX") ?? 0} km | Estado: ${u.statusOp}` : "No especificada"}

HISTORIAL CLIENTE (últimas ${hist.length} ops):
${hist.map((h: any) => `  • ${h.titulo} | ${h.status} | ${mxn(h.precioConIVA)} | margen ${pct(h.margen)}`).join("\n") || "  Sin historial"}

Evalúa rentabilidad, riesgo de cobro y oportunidad de ajuste. Responde con este JSON exacto:
{"viabilidad":"alta|media|baja","score":0-100,"alertas":["..."],"sugerencias":["..."],"resumen":"1-2 oraciones en español"}`;
    },
  },

  // ── 2. Riesgo operativo ───────────────────────────────────────────────────
  "riesgo-operativo": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 650,
    system: "Eres analista de riesgo operativo para flota de transporte en México. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => {
      const s   = ctx?.snapshot ?? {};
      const p1  = (ctx?.p1Tickets      ?? []).slice(0, 8);
      const ov  = (ctx?.overdueTickets ?? []).slice(0, 5);
      const det = (ctx?.detainedUnits  ?? []).slice(0, 6);

      return `Evalúa el riesgo operativo de esta flota de transporte (datos en tiempo real):

KPIs OPERATIVOS:
Tickets activos: ${s.ticketsActivos ?? 0} | P1 críticos: ${s.ticketsP1 ?? 0}
Tickets vencidos sin cobrar: ${s.ticketsVencidos ?? 0} (${mxn(s.ticketsVencidosMonto)})
Unidades detenidas: ${s.unidadesDetenidas ?? 0} / ${s.totalUnidades ?? 0} totales
Cartera pendiente: ${mxn(s.carteraTotal)} | Revenue total: ${mxn(s.revenueTotal)}

TICKETS P1 ACTIVOS:
${p1.map((t: any) => `  • [${t.id}] ${t.titulo} | ${t.status} | ${mxn(t.precioConIVA)} | Vence: ${t.promesaPago ?? "sin fecha"}`).join("\n") || "  Ninguno"}

VENCIDOS SIN COBRAR:
${ov.map((t: any) => `  • [${t.id}] ${t.titulo} | ${mxn(t.precioConIVA)} | Vencía: ${t.promesaPago}`).join("\n") || "  Ninguno"}

UNIDADES DETENIDAS:
${det.map((u: any) => `  • ${u.marca} ${u.modelo} ${u.anio} [${u.label}] | statusOp: ${u.statusOp}`).join("\n") || "  Ninguna"}

Responde con JSON:
{"nivelRiesgo":"critico|alto|medio|bajo","factoresRiesgo":["..."],"accionInmediata":"...","impactoEstimado":"...","recomendaciones":["..."],"score":0-100}`;
    },
  },

  // ── 3. Recomendación de margen ────────────────────────────────────────────
  "recomendacion-margen": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 500,
    system: "Eres consultor de precios y márgenes para refacciones automotrices en México. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => {
      const t    = ctx?.ticket ?? {};
      const c    = ctx?.client ?? {};
      const s    = t.snap ?? {};
      const hist = (ctx?.clientHistory ?? []).filter((h: any) => h.margen > 0).slice(0, 6);
      const avgMargen = hist.length
        ? (hist.reduce((sum: number, h: any) => sum + h.margen, 0) / hist.length).toFixed(1)
        : "sin datos";

      return `Recomienda el margen óptimo para esta operación:

OPERACIÓN: ${t.titulo ?? "Sin título"}
Tipo: ${t.opId ?? "general"} | Prioridad: ${t.priority ?? "P3"}
Modificadores: ${t.mods?.length ? t.mods.join(", ") : "estándar"}

COSTOS REALES:
Costo base: ${mxn(s.costoBase)} | Gastos operativos: ${mxn(s.gastos)} | Costo total: ${mxn(s.costoTotal)}
Precio actual c/IVA: ${mxn(s.precioConIVA)} | Margen neto actual: ${pct(s.margenNetoPrecio)}
Markup sobre costo: ${pct(s.markupSobre)} | ISR: ${mxn(s.isr)} | Utilidad neta: ${mxn(s.uNeta)}

CLIENTE: ${c.empresa ?? "N/A"} | Categoría: ${c.category ?? "regular"} | Score: ${c.score ?? 0}
Días crédito: ${c.creditDays ?? "N/A"} | Margen histórico promedio: ${avgMargen}%

Responde con JSON:
{"margenSugerido":0-100,"justificacion":"...","rangoMin":0-100,"rangoMax":0-100,"advertencia":"...o null","precioSugeridoConIVA":0}`;
    },
  },

  // ── 4. Resumen ejecutivo ──────────────────────────────────────────────────
  "resumen-ejecutivo": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 500,
    system: "Eres redactor de comunicaciones comerciales para empresa de transporte en México. Tono profesional, claro, en español. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => {
      const t = ctx?.ticket ?? {};
      const c = ctx?.client ?? {};
      const u = ctx?.unit   ?? {};
      const s = t.snap      ?? {};

      return `Redacta un resumen ejecutivo para compartir con el cliente:

SERVICIO: ${t.titulo ?? "Servicio de refacciones"}
Estado: ${t.status ?? "en proceso"} | Prioridad: ${t.priority ?? "N/A"}
Promesa de pago: ${t.promesaPago ?? "a confirmar"}
Pago: ${t.payType === "credit" ? "Crédito" : "Contado"}
Notas técnicas: ${t.notes || "ninguna"}

FINANCIERO:
Total con IVA: ${mxn(s.precioConIVA)} | Utilidad neta: ${mxn(s.uNeta)}

CLIENTE: ${c.empresa ?? "Cliente"} | Categoría: ${c.category ?? "N/A"}
UNIDAD: ${u.marca ? `${u.marca} ${u.modelo} ${u.anio}` : "No especificada"}

Responde con JSON:
{"resumen":"2-3 oraciones para el cliente","puntosClave":["..."],"llamadaAccion":"texto de cierre breve","tono":"formal|semiformal"}`;
    },
  },

  // ── 5. Notas → Ticket ─────────────────────────────────────────────────────
  "notas-a-ticket": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 700,
    system: "Eres dispatcher de taller mecánico en México. Conviertes notas técnicas en tickets operativos estructurados. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => {
      const notes = ctx?.userInput ?? ctx?.ticket?.notes ?? "";
      const u     = ctx?.unit      ?? {};

      return `Convierte estas notas técnicas en un ticket operativo estructurado:

NOTAS: "${notes}"
UNIDAD: ${u.marca ? `${u.marca} ${u.modelo} ${u.anio} — ${u.km?.toLocaleString("es-MX") ?? 0} km` : "No especificada"}
Fecha: ${new Date().toLocaleDateString("es-MX")}

Responde con JSON:
{"titulo":"máx 60 chars, claro y técnico","descripcion":"párrafo técnico completo","prioridad":"P1|P2|P3","tipoOp":"consumable|general|tech|heavy|logistics|rescue","piezas":["parte exacta 1","parte exacta 2"],"urgente":true|false,"estimadoHoras":0-72,"alertas":["...si hay"]}`;
    },
  },

  // ── 6. Priorización automática ────────────────────────────────────────────
  "priorizacion": {
    model: "claude-sonnet-4-6",
    maxTokens: 900,
    system: "Eres jefe de operaciones de empresa de transporte en México. Priorizas tickets según impacto financiero, unidades detenidas y urgencia. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => {
      const s   = ctx?.snapshot ?? {};
      const tkts = (ctx?.activeTickets ?? []).slice(0, 15);
      const det  = (ctx?.detainedUnits ?? []).slice(0, 6);

      return `Prioriza los tickets operativos activos de esta flota:

CONTEXTO:
Tickets activos: ${s.ticketsActivos ?? 0} | P1 existentes: ${s.ticketsP1 ?? 0}
Unidades detenidas: ${s.unidadesDetenidas ?? 0} | Cartera: ${mxn(s.carteraTotal)}

TICKETS ACTIVOS:
${tkts.map((t: any, i: number) =>
  `${i + 1}. [${t.id}] "${t.titulo}"
     Status: ${t.status} | Priority actual: ${t.priority} | Pago: ${t.payType}
     Valor: ${mxn(t.precioConIVA)} | Utilidad: ${mxn(t.uNeta)} | Horas: ${t.horasOp}h
     Vence: ${t.promesaPago ?? "sin fecha"} | Mods: ${t.mods?.join(", ") || "ninguno"}`
).join("\n\n") || "  Sin tickets activos"}

UNIDADES DETENIDAS:
${det.map((u: any) => `  • ${u.marca} ${u.modelo} ${u.anio} [${u.label}] | ${u.statusOp}`).join("\n") || "  Ninguna"}

Responde con JSON:
{"priorizacion":[{"id":"...","prioridadSugerida":"P1|P2|P3","razon":"...breve"}],"resumen":"...","accionUrgente":"...o null","ticketsCriticos":0}`;
    },
  },

  // ── 7. Unidades detenidas ─────────────────────────────────────────────────
  "unidades-detenidas": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 700,
    system: "Eres jefe de flotilla de transporte en México. Analizas el estado de unidades y defines acciones para restablecer operación. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => {
      const s    = ctx?.snapshot       ?? {};
      const det  = (ctx?.detainedUnits ?? []).slice(0, 10);
      const p1   = (ctx?.p1Tickets     ?? []).slice(0, 8);
      const all  = (ctx?.units         ?? []).slice(0, 12);

      return `Analiza el estado operativo de la flotilla:

RESUMEN FLOTA:
Total unidades: ${s.totalUnidades ?? 0} | Operativas: ${s.unidadesOperativas ?? 0}
Detenidas/preventivo: ${s.unidadesDetenidas ?? 0}
Tickets P1 activos: ${s.ticketsP1 ?? 0} | Cartera total: ${mxn(s.carteraTotal)}

TODAS LAS UNIDADES:
${all.map((u: any) => `  • ${u.marca} ${u.modelo} ${u.anio} [${u.label}] — km: ${u.km?.toLocaleString("es-MX") ?? 0} — statusOp: ${u.statusOp}`).join("\n") || "  Sin unidades"}

TICKETS P1 ACTIVOS (con unidad asociada):
${p1.map((t: any) => `  • [${t.id}] ${t.titulo} | status: ${t.status} | ${mxn(t.precioConIVA)}`).join("\n") || "  Ninguno"}

Responde con JSON:
{"criticas":[{"label":"...","marca":"...","modelo":"...","riesgo":"critico|alto|medio","motivo":"...","accionRecomendada":"..."}],"resumen":"...","totalDetenidas":0,"impactoEstimado":"..."}`;
    },
  },

  // ── 8. WhatsApp cliente ───────────────────────────────────────────────────
  "whatsapp-cliente": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 500,
    system: "Eres asesor de servicio al cliente para empresa de refacciones y transporte en México. Redactas mensajes de WhatsApp profesionales pero cercanos. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => {
      const t = ctx?.ticket ?? {};
      const c = ctx?.client ?? {};
      const s = t.snap      ?? {};
      const extra = ctx?.userInput ?? "";

      return `Redacta un mensaje de WhatsApp para este cliente:

TICKET: ${t.titulo ?? "Actualización de servicio"}
Estado: ${t.status ?? "en proceso"} | Prioridad: ${t.priority ?? "N/A"}
Promesa de pago: ${t.promesaPago ?? "a confirmar"}
Pago: ${t.payType === "credit" ? "Crédito" : "Contado"}
Monto con IVA: ${mxn(s.precioConIVA)}
Notas: ${t.notes || "ninguna"}
${extra ? `\nInstrucción adicional: "${extra}"` : ""}

CLIENTE: ${c.empresa ?? "Cliente"}

Redacta un mensaje profesional pero humano, listo para copiar en WhatsApp. Responde con JSON:
{"mensaje":"texto listo para WhatsApp","tono":"formal|amigable","emoji":"1-2 emojis apropiados"}`;
    },
  },

  // ── 9. Resumen financiero ─────────────────────────────────────────────────
  "resumen-financiero": {
    model: "claude-sonnet-4-6",
    maxTokens: 900,
    system: "Eres CFO y analista financiero de empresa de transporte y refacciones en México. Generas resúmenes ejecutivos con base en datos reales. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => {
      const s  = ctx?.snapshot       ?? {};
      const ov = (ctx?.overdueTickets ?? []).slice(0, 5);

      return `Genera el resumen financiero operativo (datos reales del sistema):

MÉTRICAS PRINCIPALES:
Revenue total acumulado: ${mxn(s.revenueTotal)}
Cartera pendiente: ${mxn(s.carteraTotal)}
Utilidad neta acumulada: ${mxn(s.utilidadNeta)}
Tickets activos: ${s.ticketsActivos ?? 0} | Tickets P1: ${s.ticketsP1 ?? 0}
Vencidos sin cobrar: ${s.ticketsVencidos ?? 0} (${mxn(s.ticketsVencidosMonto)})
Unidades detenidas: ${s.unidadesDetenidas ?? 0} / ${s.totalUnidades ?? 0}
Clientes activos: ${s.totalClientes ?? 0}
Fecha reporte: ${new Date().toLocaleDateString("es-MX")}

DETALLE VENCIDOS:
${ov.map((t: any) => `  • ${t.titulo} | ${mxn(t.precioConIVA)} | Vencía: ${t.promesaPago}`).join("\n") || "  Sin vencidos — flujo saludable"}

Responde con JSON:
{"resumen":"2-3 oraciones ejecutivas del estado financiero","tendencias":["..."],"alertas":["..."],"recomendaciones":["..."],"headline":"frase impactante de 1 línea","semaforo":"verde|amarillo|rojo"}`;
    },
  },

  // ── 10. Upsell / Cross-sell ───────────────────────────────────────────────
  "upsell-crosssell": {
    model: "claude-haiku-4-5-20251001",
    maxTokens: 600,
    system: "Eres consultor de ventas para empresa de refacciones automotrices en México. Identificas oportunidades de venta adicional con base en historial real. Responde ÚNICAMENTE con JSON válido.",
    buildPrompt: (ctx: any) => {
      const t    = ctx?.ticket ?? {};
      const c    = ctx?.client ?? {};
      const u    = ctx?.unit   ?? {};
      const hist = (ctx?.clientHistory ?? []).slice(0, 6);
      const uhist= (ctx?.unitHistory   ?? []).slice(0, 4);

      return `Identifica oportunidades de venta adicional:

SERVICIO ACTUAL: ${t.titulo ?? "Refacciones"}
Operación: ${t.opId ?? "general"} | Prioridad: ${t.priority ?? "P3"}

UNIDAD: ${u.marca ? `${u.marca} ${u.modelo} ${u.anio} — ${u.km?.toLocaleString("es-MX") ?? 0} km | statusOp: ${u.statusOp}` : "No especificada"}

CLIENTE: ${c.empresa ?? "N/A"} | Categoría: ${c.category ?? "regular"} | Score: ${c.score ?? 0}

HISTORIAL DEL CLIENTE (últimas ops):
${hist.map((h: any) => `  • ${h.titulo} | ${h.status} | ${mxn(h.precioConIVA)}`).join("\n") || "  Cliente nuevo"}

HISTORIAL DE LA UNIDAD:
${uhist.map((h: any) => `  • ${h.titulo} | ${h.status} | ${mxn(h.precioConIVA)}`).join("\n") || "  Sin historial en esta unidad"}

Responde con JSON:
{"sugerencias":[{"tipo":"upsell|crosssell","servicio":"...","razon":"específica al historial","valorEstimado":0,"prioridad":"alta|media|baja"}],"impactoTotal":0,"mensajeVenta":"...","potencial":"alto|medio|bajo"}`;
    },
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
    const t0     = Date.now();

    try {
      const message = await client.messages.create({
        model:      moduleDef.model,
        max_tokens: moduleDef.maxTokens,
        system:     moduleDef.system,
        messages:   [{ role: "user", content: moduleDef.buildPrompt(context) }],
      });

      const rawText = message.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { type: "text"; text: string }).text)
        .join("");

      return res.status(200).json({
        ok:          true,
        module:      moduleId,
        result:      rawText,
        model:       message.model,
        usage:       message.usage,
        duration_ms: Date.now() - t0,
      });

    } catch (sdkErr: unknown) {
      const isApiError = sdkErr instanceof Anthropic.APIError;
      return res.status(isApiError ? sdkErr.status : 500).json({
        ok:     false,
        error:  isApiError ? sdkErr.message : String(sdkErr),
        module: moduleId,
      });
    }

  } catch (outerErr: unknown) {
    return res.status(500).json({
      ok:    false,
      error: outerErr instanceof Error ? outerErr.message : String(outerErr),
      stage: "outer_handler",
    });
  }
}
