---
tipo: tecnico
modulo: datos
actualizado: 2026-06-06
tags: [ticket, modelo, schema]
---

# Modelo de datos — Ticket

← [[../00-MOC|MOC]]

---

## Campos del ticket

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | `TKT-YYYYMMDD-NNN` |
| `titulo` | string | Descripción corta de la operación |
| `opId` | string | Tipo de operación (ver [[../negocio/tipos-operacion]]) |
| `opShort` | string | Abreviatura: `CONS`, `REF-G`, `SERV`, `REF-P`, `LOG`, `RESC` |
| `priority` | string | `P1`–`P4` (ver [[../negocio/prioridades]]) |
| `clientId` | string | ID del cliente (`CLI-NNNNN`) |
| `supplierId` | string | ID del proveedor (`PRV-NNNNN`) |
| `unitId` | string | ID de la unidad (`UNI-NNNNN`) |
| `partRef` | string | Referencia de pieza (OEM o aftermarket) |
| `date` | string | Fecha de creación — formato `DD/MM/YYYY` |
| `status` | string | Estado actual (uno de los 12) |
| `payType` | string | `cash` \| `credit` |
| `promesaPago` | string | Fecha promesa de pago — formato `DD/MM/YYYY` |
| `cobrado` | boolean | `true` cuando el pago fue recibido |
| `mods` | string[] | Modificadores activos (`urgency`, `offhours`, `rare`, `credit`) |
| `prob` | string | Probabilidad estimada: `high` \| `medium` \| `low` |
| `horasOp` | number | Horas estimadas de la operación |
| `notes` | string | Notas libres |
| `snap` | object | Snapshot financiero (ver abajo) |
| `lineas` | array | Líneas del cotizador (Fase 2) |
| `timeline` | array | Historial de eventos (ver abajo) |
| `history` | array | Log de cambios de estado |

---

## Objeto `snap` (snapshot financiero)

| Campo | Descripción |
|-------|-------------|
| `costoBase` | Costo de la pieza sin markup |
| `costoTotal` | Costo total incluyendo proveedor |
| `precioSinIVA` | Precio de venta sin IVA |
| `precioConIVA` | Precio de venta con IVA (lo que ve el cliente) |
| `ivaTraslad` | Monto de IVA (16%) |
| `uBruta` | Utilidad bruta = precioSinIVA − costoTotal |
| `uNeta` | Utilidad neta = uBruta − ISR |
| `margenNetoPrecio` | Margen neto sobre precio (%) |
| `isr` | ISR estimado |
| `ivaNeto` | IVA neto a pagar |
| `margenBruto` | Margen bruto (%) |
| `roi` | ROI sobre costo (%) |

---

## Objeto `linea` (líneas del cotizador — Fase 2)

| Campo | Descripción |
|-------|-------------|
| `key` | UUID de la línea |
| `partId` | ID de pieza del catálogo (o vacío si es manual) |
| `nombre` | Nombre de la pieza |
| `partRef` | Referencia OEM / aftermarket |
| `qty` | Cantidad |
| `unitPrice` | Precio unitario con IVA |
| `unitSinIVA` | Precio unitario sin IVA |
| `lineTotal` | Total de la línea (unitPrice × qty) |
| `manualPrice` | Precio manual (si el usuario lo sobreescribió) |
| `customMgn` | `true` si tiene margen personalizado |
| `customVal` | Valor del margen personalizado (%) |
| `snap` | Snapshot financiero de la línea |

---

## Eventos del timeline

Cada evento en `ticket.timeline[]`:

```json
{
  "ts": "2026-05-13T09:00:00Z",
  "evento": "Solicitud recibida",
  "actor": "Logis Express"
}
```

| Campo | Descripción |
|-------|-------------|
| `ts` | Timestamp ISO 8601 |
| `evento` | Descripción del evento |
| `actor` | Quién generó el evento |

Los eventos se detectan por **palabras clave** en `evento`:
`cobrado`, `facturado`, `entregado`, `transito/tránsito`, `comprado`, `autorizado`, `cotizado`, `sourcing`, `validaci/validando`, `cancelado`, `cerrado`.
