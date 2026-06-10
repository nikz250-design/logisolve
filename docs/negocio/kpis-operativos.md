---
tipo: negocio
area: metricas
actualizado: 2026-06-06
tags: [kpis, ops, financiero, metricas]
---

# KPIs del Centro de Operaciones

← [[../00-MOC|MOC]]

---

## KPIs financieros (4 capas)

| KPI | Fórmula | Qué mide |
|-----|---------|----------|
| **Revenue operado** | Σ precioConIVA ∈ OPERADO_SET | Todo el trabajo ya ejecutado |
| **Cartera activa** | Σ precioConIVA ∈ CARTERA_SET | Entregado/facturado sin cobrar |
| **Cash recibido** | Σ precioConIVA ∈ CASH_SET | Dinero efectivamente en caja |
| **Forecast** | Σ precioConIVA ∈ FORECAST_SET | Pipeline probable (no contamina revenue) |

→ Ver [[../tecnico/estados-pipeline#Conjuntos financieros]] para las definiciones de sets.

---

## KPIs de utilidad

| KPI | Fórmula |
|-----|---------|
| Utilidad operativa bruta | Σ uBruta ∈ OPERADO_SET |
| Utilidad operativa neta | Σ uNeta ∈ OPERADO_SET |
| Margen promedio | promedio(margenNetoPrecio) ∈ OPERADO_SET |
| Utilidad cash | Σ uNeta ∈ CASH_SET |

---

## KPIs operativos

| KPI | Descripción |
|-----|-------------|
| **Tickets activos** | Count de tickets ∉ CLOSED_SET |
| **P1 activos** | Count de tickets priority=P1 y status activo |
| **Cartera vencida** | Count de tickets ∈ CARTERA_SET con promesaPago < hoy |
| **Tasa de cierre** | Cobrados / (Cobrados + Cancelados) × 100 |
| **Ticket más reciente** | Último ticket con costo > 0, ordenado por fecha |

---

## KPIs de velocidad (7 segmentos)

→ Ver [[../tecnico/metricas-tiempo]] para detalle completo.

| Segmento | Benchmark objetivo |
|----------|--------------------|
| Respuesta inicial | < 2 horas |
| Sourcing | < 4 horas |
| Compra | < 24 horas |
| Logístico | < 48 horas |
| **Operativo total** | **< 72 horas** |
| Administrativo | < 48 horas |
| Cobranza | < días de crédito otorgados |

---

## Mapa de calor mensual

- Grid de días del mes actual
- Color por intensidad de actividad (tickets creados ese día)
- Permite identificar picos y valles operativos

---

## Alertas del Centro Ops

| Alerta | Trigger | Acción sugerida |
|--------|---------|----------------|
| 🔴 P1 activo | priority=P1 AND status activo | Atender inmediatamente |
| 🟡 Cartera vencida | promesaPago expirada | Seguimiento de cobranza |
| 🟠 Sin movimiento | Ticket sin actualizar > 24h | Verificar con operador |
