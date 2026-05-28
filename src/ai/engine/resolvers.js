// AIContextEngine — Entity Resolvers
// Each resolver extracts a structured context snapshot from live app state.
// Field names match the SEED_* shapes in app.jsx exactly.

const CLOSED = new Set(["cerrado", "cancelado", "cobrado"]);

function isActive(t)  { return !CLOSED.has(t.status) && !t._deleted; }
function isOverdue(t) {
  if (!t.promesaPago) return false;
  const [d, m, y] = t.promesaPago.split("/");
  return new Date(`${y}-${m}-${d}`) < new Date();
}

function ticketMini(t) {
  return {
    id:           t.id,
    titulo:       t.titulo,
    status:       t.status,
    priority:     t.priority,
    payType:      t.payType,
    promesaPago:  t.promesaPago ?? null,
    precioConIVA: t.snap?.precioConIVA  ?? 0,
    costoTotal:   t.snap?.costoTotal    ?? 0,
    uNeta:        t.snap?.uNeta         ?? 0,
    margen:       t.snap?.margenNetoPrecio ?? 0,
    horasOp:      t.horasOp ?? 0,
    mods:         t.mods    ?? [],
    notes:        t.notes   ?? "",
  };
}

function unitMini(u) {
  return {
    id:       u.id,
    marca:    u.marca,
    modelo:   u.modelo,
    anio:     u.anio,
    statusOp: u.statusOp,   // "operativa" | "preventivo"
    km:       u.km,
    label:    u.placa || u.economico || (u.vin ?? "").slice(-6) || u.id,
  };
}

// ─── resolveTicket ────────────────────────────────────────────
// Returns full context for a single ticket operation.
export function resolveTicket(state, ticketId) {
  const ticket = (state.tickets ?? []).find(t => t.id === ticketId);
  if (!ticket) return null;

  const client = (state.clients ?? []).find(c => c.id === ticket.clientId);
  const unit   = (state.units   ?? []).find(u => u.id === ticket.unitId);

  const clientHistory = (state.tickets ?? [])
    .filter(t => t.clientId === ticket.clientId && t.id !== ticketId)
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 8)
    .map(ticketMini);

  const unitHistory = unit
    ? (state.tickets ?? [])
        .filter(t => t.unitId === unit.id && t.id !== ticketId)
        .slice(0, 5)
        .map(ticketMini)
    : [];

  // Aggregate snap for the chosen ticket
  const snap = ticket.snap ?? {};

  return {
    entityType: "ticket",
    ticket: {
      id:          ticket.id,
      titulo:      ticket.titulo,
      opId:        ticket.opId,
      status:      ticket.status,
      priority:    ticket.priority,
      payType:     ticket.payType,
      promesaPago: ticket.promesaPago ?? null,
      mods:        ticket.mods ?? [],
      notes:       ticket.notes ?? "",
      horasOp:     ticket.horasOp ?? 0,
      snap: {
        costoBase:        snap.costoBase        ?? 0,
        costoTotal:       snap.costoTotal       ?? 0,
        precioSinIVA:     snap.precioSinIVA     ?? 0,
        precioConIVA:     snap.precioConIVA     ?? 0,
        ivaTraslad:       snap.ivaTraslad       ?? 0,
        ivaNeto:          snap.ivaNeto          ?? 0,
        uBruta:           snap.uBruta           ?? 0,
        isr:              snap.isr              ?? 0,
        uNeta:            snap.uNeta            ?? 0,
        markupSobre:      snap.markupSobre      ?? 0,
        margenNetoPrecio: snap.margenNetoPrecio ?? 0,
      },
    },
    client: client ? {
      id:         client.id,
      empresa:    client.empresa,
      creditDays: client.creditDays,
      category:   client.category,
      score:      client.score ?? 0,
    } : null,
    unit: unit ? {
      id:       unit.id,
      marca:    unit.marca,
      modelo:   unit.modelo,
      anio:     unit.anio,
      statusOp: unit.statusOp,
      km:       unit.km,
      label:    unit.placa || unit.economico || (unit.vin ?? "").slice(-6) || unit.id,
    } : null,
    clientHistory,
    unitHistory,
  };
}

// ─── resolveUnit ──────────────────────────────────────────────
export function resolveUnit(state, unitId) {
  const unit = (state.units ?? []).find(u => u.id === unitId);
  if (!unit) return null;

  const client  = (state.clients ?? []).find(c => c.id === unit.clientId);
  const tickets = (state.tickets ?? []).filter(t => t.unitId === unitId);
  const active  = tickets.filter(isActive).map(ticketMini);
  const history = tickets.filter(t => !isActive(t)).slice(-8).map(ticketMini);

  return {
    entityType: "unit",
    unit: {
      id:          unit.id,
      marca:       unit.marca,
      modelo:      unit.modelo,
      anio:        unit.anio,
      motor:       unit.motor,
      transmision: unit.transmision,
      statusOp:    unit.statusOp,
      km:          unit.km,
      notas:       unit.notas ?? "",
      label:       unit.placa || unit.economico || (unit.vin ?? "").slice(-6) || unit.id,
    },
    client:        client ? { empresa: client.empresa } : null,
    activeTickets: active,
    history,
  };
}

// ─── resolveGlobal ────────────────────────────────────────────
// Full operational snapshot — used by fleet/ops/financial modules.
export function resolveGlobal(state) {
  const tickets = state.tickets  ?? [];
  const units   = state.units    ?? [];
  const clients = state.clients  ?? [];
  const parts   = state.parts    ?? [];

  const active   = tickets.filter(isActive);
  const p1       = active.filter(t => t.priority === "P1");
  const overdue  = active.filter(isOverdue);
  const cobrados = tickets.filter(t => t.status === "cobrado");
  const cartera  = active.filter(t => ["entregado", "facturado"].includes(t.status));

  const detained = units.filter(u => u.statusOp !== "operativa");

  const sum = (arr, field) =>
    arr.reduce((s, t) => s + (t.snap?.[field] ?? 0), 0);

  return {
    entityType: "global",
    snapshot: {
      fecha:                 new Date().toISOString(),
      totalTickets:          tickets.length,
      ticketsActivos:        active.length,
      ticketsP1:             p1.length,
      ticketsVencidos:       overdue.length,
      ticketsVencidosMonto:  sum(overdue,  "precioConIVA"),
      totalUnidades:         units.length,
      unidadesDetenidas:     detained.length,
      unidadesOperativas:    units.length - detained.length,
      totalClientes:         clients.length,
      revenueTotal:          sum(cobrados, "precioConIVA"),
      carteraTotal:          sum(cartera,  "precioConIVA"),
      utilidadNeta:          sum(cobrados, "uNeta"),
    },
    p1Tickets:      p1.map(ticketMini),
    activeTickets:  active.map(ticketMini),
    overdueTickets: overdue.map(ticketMini),
    detainedUnits:  detained.map(unitMini),
    units:          units.map(unitMini),
    clients: clients.map(c => ({
      id:         c.id,
      empresa:    c.empresa,
      category:   c.category,
      score:      c.score ?? 0,
      creditDays: c.creditDays,
    })),
    inventory: parts.map(p => ({
      id:           p.id,
      nombre:       p.nombre,
      aplicacion:   p.aplicacion,
      ultimoPrecio: p.ultimoPrecio,
      proveedor:    p.proveedor,
    })),
  };
}

// ─── autoResolve ──────────────────────────────────────────────
// Picks the best entity ref for a module when none is supplied.
const TICKET_MODULES = new Set([
  "cotizacion-analisis", "resumen-ejecutivo",
  "whatsapp-cliente",    "upsell-crosssell",
]);

export function autoResolve(state, moduleId) {
  if (TICKET_MODULES.has(moduleId)) {
    const active = (state.tickets ?? []).filter(isActive);
    const p1     = active.filter(t => t.priority === "P1");
    const best   = p1[0] ?? active[0];
    if (best) return { type: "ticket", id: best.id };
  }
  return { type: "global" };
}

// ─── dispatch ─────────────────────────────────────────────────
export function resolveEntity(state, entityRef) {
  switch (entityRef.type) {
    case "ticket": return resolveTicket(state, entityRef.id);
    case "unit":   return resolveUnit(state,   entityRef.id);
    default:       return resolveGlobal(state);
  }
}
