// Module Registry — metadata, validation rules, and response parsers.
// Prompt building lives server-side (api/ai/modules.ts).
// The registry defines what context each module needs and how to parse the AI response.

export const MODULE_REGISTRY = {

  "cotizacion-analisis": {
    label:       "Análisis de Cotización",
    description: "Rentabilidad, riesgo de cobro y ajuste de precio",
    icon:        "📋",
    entityTypes: ["ticket"],
    // Dot-paths into the resolved context object that must be non-empty
    required:    ["ticket.titulo", "ticket.snap.precioConIVA"],
    parse(text) {
      try {
        const clean = text.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(clean);
      } catch { return { raw: text }; }
    },
  },

  "riesgo-operativo": {
    label:       "Riesgo Operativo",
    description: "Alertas críticas por P1, unidades detenidas y cartera vencida",
    icon:        "⚠️",
    entityTypes: ["global"],
    required:    ["snapshot.totalTickets"],
    parse(text) {
      try {
        const clean = text.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(clean);
      } catch { return { raw: text }; }
    },
  },

  "recomendacion-margen": {
    label:       "Recomendación de Margen",
    description: "Margen óptimo considerando historial del cliente y costo real",
    icon:        "💰",
    entityTypes: ["ticket"],
    required:    ["ticket.snap.costoTotal"],
    parse(text) {
      try {
        const clean = text.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(clean);
      } catch { return { raw: text }; }
    },
  },

  "resumen-ejecutivo": {
    label:       "Resumen Ejecutivo",
    description: "Resumen de un ticket para compartir con el cliente",
    icon:        "📄",
    entityTypes: ["ticket"],
    required:    ["ticket.titulo"],
    parse(text) { return { texto: text.trim() }; },
  },

  "notas-a-ticket": {
    label:       "Notas → Ticket Estructurado",
    description: "Convierte notas técnicas en campo de ticket con prioridad",
    icon:        "📝",
    entityTypes: ["global", "ticket"],
    required:    [],
    parse(text) {
      try {
        const clean = text.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(clean);
      } catch { return { texto: text.trim() }; }
    },
  },

  "priorizacion": {
    label:       "Priorización Automática",
    description: "Ordena tickets activos por impacto operativo real",
    icon:        "🔢",
    entityTypes: ["global"],
    required:    ["snapshot.ticketsActivos"],
    parse(text) {
      try {
        const clean = text.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(clean);
      } catch { return { raw: text }; }
    },
  },

  "unidades-detenidas": {
    label:       "Unidades Detenidas",
    description: "Diagnóstico de flota con mayor tiempo fuera de operación",
    icon:        "🚛",
    entityTypes: ["global"],
    required:    ["snapshot.totalUnidades"],
    parse(text) {
      try {
        const clean = text.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(clean);
      } catch { return { raw: text }; }
    },
  },

  "whatsapp-cliente": {
    label:       "Mensaje WhatsApp",
    description: "Redacta un mensaje profesional para enviar al cliente",
    icon:        "💬",
    entityTypes: ["ticket"],
    required:    ["ticket.titulo"],
    parse(text) { return { mensaje: text.trim() }; },
  },

  "resumen-financiero": {
    label:       "Resumen Financiero",
    description: "KPIs financieros de la semana: revenue, cartera, utilidad",
    icon:        "📊",
    entityTypes: ["global"],
    required:    ["snapshot.revenueTotal"],
    parse(text) {
      try {
        const clean = text.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(clean);
      } catch { return { raw: text }; }
    },
  },

  "upsell-crosssell": {
    label:       "Upsell / Cross-sell",
    description: "Oportunidades adicionales basadas en historial del cliente",
    icon:        "⬆️",
    entityTypes: ["ticket"],
    required:    ["ticket.titulo"],
    parse(text) {
      try {
        const clean = text.replace(/```json\n?|\n?```/g, "").trim();
        return JSON.parse(clean);
      } catch { return { raw: text }; }
    },
  },
};

// ─── Context validation ───────────────────────────────────────
// Returns { valid, missing[] } given a resolved context object.
export function validateContext(moduleId, ctx) {
  const def = MODULE_REGISTRY[moduleId];
  if (!def) return { valid: false, missing: [`unknown module: ${moduleId}`] };

  const missing = [];
  for (const path of def.required) {
    const val = path.split(".").reduce((o, k) => o?.[k], ctx);
    const empty =
      val === undefined || val === null || val === "" ||
      (Array.isArray(val) && val.length === 0) ||
      (typeof val === "number" && val === 0 && path.includes("precio"));
    if (empty) missing.push(path);
  }
  return { valid: missing.length === 0, missing };
}
