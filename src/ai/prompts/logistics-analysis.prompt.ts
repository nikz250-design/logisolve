// ============================================================
// Logisolve AI Prompts — Logistics Analysis
// Reusable prompt builder. No hardcoded instructions in UI components.
// ============================================================

import type { AIMessage, OperationalAnalysisInput } from "../context/types";

export const LOGISTICS_ANALYSIS_SYSTEM = `Eres un experto en logística y operaciones de transporte en México.
Analizas datos operativos de flotas vehiculares, tickets de servicio y clientes para proporcionar
insights accionables y precisos.

Tu análisis debe ser:
- Conciso pero completo
- Orientado a decisiones inmediatas
- Basado exclusivamente en los datos proporcionados
- En español, con terminología logística mexicana

Responde EXCLUSIVAMENTE en formato JSON válido con la siguiente estructura:
{
  "analisis": "string — análisis narrativo completo (2-4 párrafos)",
  "riesgos": ["riesgo 1", "riesgo 2", "..."],
  "recomendaciones": ["acción 1", "acción 2", "..."],
  "urgencia": "inmediata|alta|media|baja",
  "oportunidades": ["oportunidad 1", "..."],
  "resumenEjecutivo": "string — 1-2 oraciones para dashboard",
  "confianza": 0-100
}`;

export function buildLogisticsAnalysisPrompt(
  input: OperationalAnalysisInput
): AIMessage[] {
  const sections: string[] = [];

  if (input.ticket) {
    sections.push(`## Ticket de Servicio
ID: ${input.ticket.id ?? "N/A"}
Título: ${input.ticket.titulo ?? "Sin título"}
Descripción: ${input.ticket.descripcion ?? "Sin descripción"}
Status: ${input.ticket.status ?? "desconocido"}
Prioridad: ${input.ticket.prioridad ?? "no definida"}
Fecha: ${input.ticket.fechaCreacion ?? "desconocida"}`);
  }

  if (input.cliente) {
    sections.push(`## Cliente
Nombre: ${input.cliente.nombre ?? "Sin nombre"}
RFC: ${input.cliente.rfc ?? "N/A"}
Saldo pendiente: $${(input.cliente.saldo ?? 0).toLocaleString("es-MX")} MXN
Días de crédito: ${input.cliente.diasCredito ?? 0}`);
  }

  if (input.unidad) {
    sections.push(`## Unidad Vehicular
Eco: ${input.unidad.eco ?? "N/A"}
Modelo: ${input.unidad.modelo ?? "N/A"}
Kilometraje: ${(input.unidad.km ?? 0).toLocaleString("es-MX")} km
Status: ${input.unidad.status ?? "desconocido"}`);
  }

  if (input.historial && input.historial.length > 0) {
    const items = input.historial
      .slice(-5) // Last 5 events
      .map((h) => `• [${h.fecha}] ${h.tipo}: ${h.descripcion}`)
      .join("\n");
    sections.push(`## Historial Reciente\n${items}`);
  }

  if (input.operacion) {
    sections.push(`## Contexto de Operación\n${input.operacion}`);
  }

  if (input.prioridad) {
    sections.push(`## Nivel de Prioridad\n${input.prioridad.toUpperCase()}`);
  }

  if (input.margen !== undefined) {
    sections.push(`## Margen de la Operación\n${input.margen}%`);
  }

  const userContent = `Realiza un análisis operacional completo de la siguiente situación:\n\n${sections.join(
    "\n\n"
  )}\n\nGenera el JSON de análisis según el formato del sistema.`;

  return [
    { role: "system", content: LOGISTICS_ANALYSIS_SYSTEM },
    { role: "user", content: userContent },
  ];
}
