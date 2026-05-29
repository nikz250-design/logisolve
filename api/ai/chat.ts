// ============================================================
// Logisolve AI — /api/ai/chat  (v2 — agentic with search tools)
//
// Architecture:
//   Frontend sends the FULL app state (all units, parts, etc.)
//   Claude does NOT receive it all as context — instead it has
//   tools to SEARCH the data on demand. This scales to any fleet size.
//
// Tools:
//   buscar_unidad      → search fleet by eco/marca/modelo/placa
//   buscar_pieza       → search parts catalog
//   buscar_tickets     → search ticket history
//   sugerir_cotizacion → structured quote output
//
// Flow: up to 4 rounds of tool use, then stream final text response
// ============================================================

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

// ── Tools ─────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "buscar_unidad",
    description: "Busca una o más unidades en la flota completa por número económico, marca, modelo, placa o año. Úsalo siempre que el usuario mencione una unidad específica.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Ej: '1594', 'freightliner m2', 'placa 24AU2T'" } },
      required: ["query"],
    },
  },
  {
    name: "buscar_pieza",
    description: "Busca refacciones en el catálogo por nombre, número OEM o aftermarket.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Ej: 'carter', 'clutch', 'A0009900300'" } },
      required: ["query"],
    },
  },
  {
    name: "buscar_tickets",
    description: "Busca en el historial de tickets por descripción, unidad o estado.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "calcular_precio",
    description: "Calcula el precio de venta correcto usando la lógica exacta del cotizador de la app. SIEMPRE llama esta herramienta antes de sugerir_cotizacion para obtener precios reales.",
    input_schema: {
      type: "object",
      properties: {
        costoConIVA:   { type: "number",  description: "Costo de compra incluyendo IVA (precio de proveedor)" },
        otrosGastos:   { type: "number",  description: "Otros gastos adicionales (flete, gestión, etc.). Default 0" },
        tipoOp:        { type: "string",  enum: ["consumable","general","tech","heavy","logistics","rescue"], description: "Tipo de operación" },
        prioridad:     { type: "string",  enum: ["P1","P2","P3","P4"], description: "Prioridad del ticket" },
        modificadores: { type: "array",   items: { type: "string", enum: ["urgency","offhours","rare"] }, description: "Modificadores activos" },
      },
      required: ["costoConIVA","tipoOp","prioridad","modificadores"],
    },
  },
  {
    name: "sugerir_cotizacion",
    description: "Genera una cotización estructurada lista para crear como ticket. Llama calcular_precio primero para cada pieza, luego llama esta herramienta con los precios calculados.",
    input_schema: {
      type: "object",
      properties: {
        titulo:          { type: "string" },
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
  },
];

// ── System prompt ─────────────────────────────────────────────

const SYSTEM = `Eres un asistente de operaciones para flotillas de transporte de carga en México. Español, práctico, directo.

Tienes acceso a la app completa mediante herramientas:
- buscar_unidad: flota completa
- buscar_pieza: catálogo de refacciones
- buscar_tickets: historial de trabajos
- calcular_precio: calcula precio de venta usando el cotizador real de la app
- sugerir_cotizacion: genera la cotización estructurada final

COTIZADOR — LÓGICA EXACTA:
El precio se calcula así:
  costoBase = costoConIVA / 1.16
  costoTotal = costoBase + otrosGastos
  margenEfectivo = margenBase(tipoOp) + bonusPrioridad + suma(modificadores)
  precioSinIVA = costoTotal × (1 + margenEfectivo/100)
  precioConIVA = precioSinIVA × 1.16
  utilidadBruta = precioSinIVA - costoTotal
  ISR (20%) se descuenta de la utilidad bruta

Tipos de operación y márgenes base (promedio):
  consumable=27%, general=32%, tech=47%, heavy=52%, logistics=22%, rescue=105%

Bonus por prioridad: P1=+40%, P2=+20%, P3/P4=0%
Modificadores: urgency=+20%, offhours=+20%, rare=+25%

FLUJO PARA COTIZACIONES:
1. buscar_pieza (obtener costo de referencia del catálogo)
2. calcular_precio (por cada pieza, con tipoOp/prioridad/mods apropiados)
3. sugerir_cotizacion (con los precios ya calculados)

REGLAS:
- Nunca inventes precios sin usar calcular_precio
- Números solos como "1594" son números económicos de unidades — usa buscar_unidad
- Respuestas cortas. Sin preamble.
- Puedes hacer múltiples búsquedas en secuencia`;

// ── Search implementations ────────────────────────────────────

function searchUnits(units: any[], query: string): any[] {
  const q = query.toLowerCase().trim();
  const results = units.filter(u => {
    const eco    = String(u.eco ?? u.economico ?? "").toLowerCase();
    const marca  = (u.marca  ?? "").toLowerCase();
    const modelo = (u.modelo ?? "").toLowerCase();
    const placa  = (u.placa  ?? "").toLowerCase();
    const anio   = String(u.anio ?? "");
    return eco.includes(q) || marca.includes(q) || modelo.includes(q) ||
           placa.includes(q) || anio.includes(q) ||
           `${marca} ${modelo}`.includes(q);
  });
  return results.slice(0, 15).map(u => ({
    eco: u.eco ?? u.economico, id: u.id,
    marca: u.marca, modelo: u.modelo, anio: u.anio,
    placa: u.placa, km: u.km, statusOp: u.statusOp,
  }));
}

function searchParts(parts: any[], query: string): any[] {
  const q = query.toLowerCase().trim();
  return parts.filter(p => {
    const nombre = (p.nombre ?? "").toLowerCase();
    const oem    = (p.oem    ?? "").toLowerCase();
    const am     = (p.aftermarket ?? "").toLowerCase();
    const notas  = (p.notas  ?? "").toLowerCase();
    return nombre.includes(q) || oem.includes(q) || am.includes(q) || notas.includes(q);
  }).slice(0, 20);
}

function searchTickets(tickets: any[], query: string): any[] {
  const q = query.toLowerCase().trim();
  return tickets.filter(t => {
    const titulo = (t.titulo ?? "").toLowerCase();
    const notes  = (t.notes  ?? "").toLowerCase();
    const status = (t.status ?? "").toLowerCase();
    return titulo.includes(q) || notes.includes(q) || status.includes(q);
  }).slice(0, 10).map(t => ({
    titulo: t.titulo, status: t.status, date: t.date,
    precio: t.snap?.precioConIVA, unitId: t.unitId,
  }));
}

function calcularPrecio(input: any): string {
  const OPS: Record<string, { baseMin: number; baseMax: number }> = {
    consumable: { baseMin:20,  baseMax:35  },
    general:    { baseMin:25,  baseMax:40  },
    tech:       { baseMin:35,  baseMax:60  },
    heavy:      { baseMin:35,  baseMax:70  },
    logistics:  { baseMin:15,  baseMax:30  },
    rescue:     { baseMin:60,  baseMax:150 },
  };
  const PRIORITY_BONUS: Record<string, number> = { P1:40, P2:20, P3:0, P4:0 };
  const MOD_PCT: Record<string, number> = { urgency:20, offhours:20, rare:25 };

  const costoConIVA  = Number(input.costoConIVA) || 0;
  const otrosGastos  = Number(input.otrosGastos) || 0;
  const tipoOp       = input.tipoOp ?? "general";
  const prioridad    = input.prioridad ?? "P3";
  const mods: string[] = input.modificadores ?? [];

  const ivaR = 0.16, isrR = 0.20;
  const costoBase  = costoConIVA / (1 + ivaR);
  const costoTotal = costoBase + otrosGastos;

  const op  = OPS[tipoOp] ?? OPS.general;
  const baseMargen = Math.round((op.baseMin + op.baseMax) / 2);
  const bonusPrioridad = PRIORITY_BONUS[prioridad] ?? 0;
  const bonusMods = mods.reduce((s, id) => s + (MOD_PCT[id] ?? 0), 0);
  const margenEfectivo = baseMargen + bonusPrioridad + bonusMods;

  const precioSinIVA = costoTotal * (1 + margenEfectivo / 100);
  const precioConIVA = precioSinIVA * (1 + ivaR);
  const uBruta       = precioSinIVA - costoTotal;
  const isr          = Math.max(uBruta * isrR, 0);
  const uNeta        = uBruta - isr;
  const margenNeto   = precioSinIVA > 0 ? (uNeta / precioSinIVA) * 100 : 0;

  const fmt = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
  return [
    `Costo c/IVA: ${fmt(costoConIVA)} → costoBase: ${fmt(costoBase)} + gastos: ${fmt(otrosGastos)} = costoTotal: ${fmt(costoTotal)}`,
    `Margen: ${baseMargen}% base + ${bonusPrioridad}% prioridad + ${bonusMods}% mods = ${margenEfectivo}% efectivo`,
    `Precio s/IVA: ${fmt(precioSinIVA)} | Precio c/IVA: ${fmt(precioConIVA)}`,
    `Utilidad bruta: ${fmt(uBruta)} | ISR: ${fmt(isr)} | Utilidad neta: ${fmt(uNeta)} (${margenNeto.toFixed(1)}% margen neto)`,
    `→ costoEstimado: ${Math.round(costoConIVA)} | precioSugerido: ${Math.round(precioConIVA)}`,
  ].join("\n");
}

function executeTool(name: string, input: any, ctx: any): string {
  if (name === "buscar_unidad") {
    const results = searchUnits(ctx.units ?? [], input.query);
    if (!results.length) return `Sin resultados para "${input.query}" en la flota (${(ctx.units ?? []).length} unidades total)`;
    return `Encontradas ${results.length} unidad(es):\n` +
      results.map((u: any) => `• eco:${u.eco ?? "-"} ${u.marca} ${u.modelo} ${u.anio ?? ""} placa:${u.placa ?? "-"} km:${u.km ?? "?"} [${u.id}]`).join("\n");
  }
  if (name === "buscar_pieza") {
    const results = searchParts(ctx.parts ?? [], input.query);
    if (!results.length) return `Sin refacciones para "${input.query}" en el catálogo`;
    return `${results.length} pieza(s):\n` +
      results.map((p: any) => `• ${p.nombre} OEM:${p.oem || "-"} AM:${p.aftermarket || "-"} $${p.ultimoPrecio || "?"}`).join("\n");
  }
  if (name === "calcular_precio") {
    return calcularPrecio(input);
  }
  if (name === "buscar_tickets") {
    const results = searchTickets(ctx.tickets ?? [], input.query);
    if (!results.length) return `Sin tickets para "${input.query}"`;
    return results.map((t: any) => `• ${t.titulo} [${t.status}] ${t.date ?? ""} $${t.precio ?? "?"}`).join("\n");
  }
  return "Herramienta desconocida";
}

// ── Handler ───────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")   return res.status(405).json({ ok: false, error: "Method not allowed" });

  const apiKey = (process.env.ANTHROPIC_API_KEY ?? "").trim();
  if (!apiKey) return res.status(503).json({ ok: false, error: "ANTHROPIC_API_KEY missing" });

  const { messages, fullContext } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ ok: false, error: "messages required" });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const anthropic = new Anthropic({ apiKey });

  try {
    let msgs: Anthropic.MessageParam[] = messages.slice(-20).map((m: any) => ({
      role:    m.role === "user" ? "user" : "assistant",
      content: String(m.content),
    }));

    const MAX_ROUNDS = 4;

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const stream = anthropic.messages.stream({
        model:       "claude-haiku-4-5",
        max_tokens:  1024,
        system:      SYSTEM,
        tools:       TOOLS,
        tool_choice: round === 0 ? { type: "auto" } : { type: "auto" },
        messages:    msgs,
      });

      const contentBlocks: any[] = [];
      let   currentBlock:  any   = null;
      let   hasText             = false;

      for await (const event of stream) {
        if (event.type === "content_block_start") {
          currentBlock = { ...event.content_block, inputJson: "" };
          contentBlocks.push(currentBlock);
        }
        if (event.type === "content_block_delta") {
          if (event.delta.type === "text_delta" && currentBlock?.type === "text") {
            currentBlock.text = (currentBlock.text ?? "") + event.delta.text;
            hasText = true;
            send({ type: "text", delta: event.delta.text });
          }
          if (event.delta.type === "input_json_delta" && currentBlock?.type === "tool_use") {
            currentBlock.inputJson += event.delta.partial_json;
          }
        }
      }

      const finalMsg = await stream.finalMessage();

      // Parse tool inputs
      for (const b of contentBlocks) {
        if (b.type === "tool_use" && b.inputJson) {
          try { b.input = JSON.parse(b.inputJson); } catch { b.input = {}; }
        }
      }

      // Done? No more tool calls
      const toolUses = contentBlocks.filter(b => b.type === "tool_use");
      if (toolUses.length === 0 || finalMsg.stop_reason === "end_turn") {
        // Check for quote tool in final message blocks
        const quoteBlock = finalMsg.content.find(
          (c): c is Anthropic.ToolUseBlock =>
            c.type === "tool_use" && c.name === "sugerir_cotizacion"
        );
        if (quoteBlock) {
          send({ type: "quote", data: quoteBlock.input });
        }
        break;
      }

      // Execute tools
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const t of toolUses) {
        if (t.name === "sugerir_cotizacion") {
          // Quote — send to frontend and stop loop
          try { t.input = JSON.parse(t.inputJson); } catch { /* already parsed */ }
          send({ type: "quote", data: t.input });
          send({ type: "done" });
          res.end();
          return;
        }
        const resultText = executeTool(t.name, t.input ?? {}, fullContext ?? {});
        const toolLabel  = t.name === "buscar_unidad"   ? `🔍 Buscando unidad "${t.input?.query}"…`
                         : t.name === "buscar_pieza"   ? `🔍 Buscando pieza "${t.input?.query}"…`
                         : t.name === "calcular_precio" ? `🧮 Calculando precio (${t.input?.tipoOp}, ${t.input?.prioridad})…`
                         : `🔍 ${t.name}…`;
        send({ type: "searching", text: toolLabel });
        toolResults.push({ type: "tool_result", tool_use_id: t.id, content: resultText });
      }

      // Add assistant turn + tool results and loop
      msgs = [
        ...msgs,
        { role: "assistant", content: finalMsg.content },
        { role: "user",      content: toolResults },
      ];
    }

    send({ type: "done" });

  } catch (err: unknown) {
    const isApi = err instanceof Anthropic.APIError;
    send({ type: "error", error: isApi ? err.message : String(err) });
  }

  res.end();
}
