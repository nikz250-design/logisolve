// ============================================================
// Logisolve AI Prompts — Operational Risk Assessment
// ============================================================

import type { AIMessage } from "../context/types";

export const OPERATIONAL_RISK_SYSTEM = `Eres un especialista en gestión de riesgos operativos para empresas
de logística y transporte. Evalúas riesgos de manera sistemática usando metodología de impacto × probabilidad.

Responde EXCLUSIVAMENTE en JSON válido:
{
  "nivelRiesgoGlobal": "critico|alto|medio|bajo",
  "score": 0-100,
  "riesgosIdentificados": [
    {
      "categoria": "string",
      "descripcion": "string",
      "probabilidad": "alta|media|baja",
      "impacto": "alto|medio|bajo",
      "mitigacion": "string"
    }
  ],
  "planAccion": ["accion prioritaria 1", "..."],
  "tiempoRespuesta": "string",
  "alertas": ["alerta critica si la hay"],
  "resumen": "string"
}`;

export interface OperationalRiskInput {
  area: string;
  incidenciasRecientes?: Array<{
    tipo: string;
    fecha: string;
    impacto: string;
  }>;
  kpis?: Record<string, number | string>;
  factoresExternos?: string[];
  historialIncidentes?: number; // count last 30 days
  unidadesEnRiesgo?: number;
}

export function buildOperationalRiskPrompt(
  input: OperationalRiskInput
): AIMessage[] {
  const kpisStr = input.kpis
    ? Object.entries(input.kpis)
        .map(([k, v]) => `  - ${k}: ${v}`)
        .join("\n")
    : "No disponibles";

  const incidenciasStr = input.incidenciasRecientes?.length
    ? input.incidenciasRecientes
        .map((i) => `  • [${i.fecha}] ${i.tipo}: ${i.impacto}`)
        .join("\n")
    : "Ninguna registrada";

  const userContent = `Evalúa los riesgos operativos para el área de ${input.area}:

KPIs actuales:
${kpisStr}

Incidencias recientes:
${incidenciasStr}

${input.historialIncidentes !== undefined ? `Incidentes últimos 30 días: ${input.historialIncidentes}` : ""}
${input.unidadesEnRiesgo !== undefined ? `Unidades en condición de riesgo: ${input.unidadesEnRiesgo}` : ""}
${input.factoresExternos?.length ? `Factores externos: ${input.factoresExternos.join(", ")}` : ""}

Genera evaluación de riesgo completa.`;

  return [
    { role: "system", content: OPERATIONAL_RISK_SYSTEM },
    { role: "user", content: userContent },
  ];
}
