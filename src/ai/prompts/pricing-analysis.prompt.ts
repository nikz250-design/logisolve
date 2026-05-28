// ============================================================
// Logisolve AI Prompts — Pricing Analysis
// ============================================================

import type { AIMessage } from "../context/types";

export const PRICING_ANALYSIS_SYSTEM = `Eres un experto en análisis de costos y estrategia de precios para empresas
de logística y transporte en México. Tu objetivo es maximizar el margen operativo manteniendo
competitividad de mercado.

Responde EXCLUSIVAMENTE en JSON válido:
{
  "precioSugerido": number,
  "margenProyectado": number,
  "justificacion": "string",
  "riesgosPrecio": ["riesgo 1", "..."],
  "estrategia": "string",
  "sensibilidadMercado": "alta|media|baja",
  "resumen": "string"
}`;

export interface PricingAnalysisInput {
  servicio: string;
  costoBase: number;
  costoOperativo: number;
  distanciaKm?: number;
  tipoCarga?: string;
  clienteSegmento?: "premium" | "estandar" | "basico";
  competidoresReferencia?: number[];
  margenObjetivo?: number;
  condicionesEspeciales?: string;
}

export function buildPricingAnalysisPrompt(
  input: PricingAnalysisInput
): AIMessage[] {
  const userContent = `Analiza la estrategia de precios para este servicio de logística:

Servicio: ${input.servicio}
Costo base: $${input.costoBase.toLocaleString("es-MX")} MXN
Costo operativo: $${input.costoOperativo.toLocaleString("es-MX")} MXN
${input.distanciaKm ? `Distancia: ${input.distanciaKm} km` : ""}
${input.tipoCarga ? `Tipo de carga: ${input.tipoCarga}` : ""}
${input.clienteSegmento ? `Segmento cliente: ${input.clienteSegmento}` : ""}
${input.margenObjetivo ? `Margen objetivo: ${input.margenObjetivo}%` : ""}
${input.competidoresReferencia?.length ? `Precios referencia competencia: $${input.competidoresReferencia.join(", $")} MXN` : ""}
${input.condicionesEspeciales ? `Condiciones especiales: ${input.condicionesEspeciales}` : ""}

Genera recomendación de precio y estrategia.`;

  return [
    { role: "system", content: PRICING_ANALYSIS_SYSTEM },
    { role: "user", content: userContent },
  ];
}
