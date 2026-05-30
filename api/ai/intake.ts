import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const config = { maxDuration: 30 };

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();

  const { texto, unidades = [], clientes = [] } = req.body || {};
  if (!texto?.trim()) return res.status(400).json({ error: "texto requerido" });

  const unidadesCtx = unidades
    .slice(0, 60)
    .map((u: any) => `${u.economico ? "Eco." + u.economico : u.id}: ${u.marca} ${u.modelo} ${u.anio || ""} (${u.placa || "sin placa"})`)
    .join("\n");

  const clientesCtx = clientes
    .slice(0, 30)
    .map((c: any) => `${c.id}: ${c.empresa}`)
    .join("\n");

  const systemPrompt = `Eres el sistema de intake inteligente de Logisolve, empresa de resolución operativa para flotillas.
Tu tarea: analizar la descripción de una necesidad operativa y extraer información estructurada.

UNIDADES DISPONIBLES:
${unidadesCtx || "(ninguna registrada)"}

CLIENTES DISPONIBLES:
${clientesCtx || "(ninguno registrado)"}

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{
  "titulo": "título conciso de la operación (máx 60 chars)",
  "urgencia": "critica|alta|media|normal",
  "tipo": "emergencia|preventivo|programado|servicio",
  "unidadId": "ID si puedes identificarla, null si no",
  "clienteId": "ID si puedes identificarlo, null si no",
  "diagnostico": {
    "falla_reportada": "descripción técnica de la falla",
    "sistema_afectado": "motor|transmision|frenos|suspension|electrico|neumatico|carroceria|hidraulico|enfriamiento|otro",
    "causa_probable": "hipótesis técnica breve",
    "confianza": 0.0-1.0
  },
  "sla_hrs": 4,
  "lineas_sugeridas": [
    {
      "descripcion": "nombre de la pieza o servicio",
      "tipo": "refaccion|servicio|mano_obra|consumible",
      "oem_probable": "número OEM si conoces, null si no",
      "cantidad": 1,
      "precio_estimado": 0
    }
  ],
  "notas_ia": "observación técnica relevante para el operador"
}

Reglas para urgencia:
- critica: unidad detenida, impacto inmediato en operación
- alta: operación comprometida en <24hrs
- media: preventivo urgente, puede esperar 2-3 días
- normal: programado, puede esperar 1+ semana

Reglas para sla_hrs:
- critica: 4
- alta: 24
- media: 72
- normal: 168`;

  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-7",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      messages: [{ role: "user", content: texto }],
    });

    const raw = msg.content.find((b: any) => b.type === "text")?.text || "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: "parse error" });

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);
  } catch (e: any) {
    console.error("intake error:", e);
    return res.status(500).json({ error: e.message });
  }
}
