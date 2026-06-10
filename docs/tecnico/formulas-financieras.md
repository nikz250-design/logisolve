---
tipo: tecnico
modulo: financiero
actualizado: 2026-06-06
tags: [finanzas, precios, margen, IVA, ISR]
---

# Fórmulas financieras

← [[../00-MOC|MOC]]

---

## Tasas fiscales (México)

| Concepto | Tasa |
|----------|------|
| IVA trasladado | 16% |
| ISR estimado | 30% sobre utilidad bruta |

---

## Cálculo de precio a partir de costo

```
precioSinIVA  = costoTotal × (1 + margen%)
precioConIVA  = precioSinIVA × 1.16
ivaTraslad    = precioConIVA − precioSinIVA
uBruta        = precioSinIVA − costoTotal
isr           = uBruta × 0.30
ivaNeto       = ivaTraslad − (costoTotal × 0.16)   // IVA a pagar al SAT
uNeta         = uBruta − isr
```

---

## Margen y ROI

```
margenNetoPrecio = uNeta / precioConIVA × 100     (% sobre precio)
margenBruto      = uBruta / precioConIVA × 100
roi              = uNeta / costoTotal × 100
markup           = (precioSinIVA / costoTotal − 1) × 100
```

### Semáforo de margen

| Rango | Color | Estado |
|-------|-------|--------|
| ≥ 25% | Verde | Saludable |
| 15–25% | Amarillo | Aceptable |
| 5–15% | Naranja | Bajo |
| < 5% | Rojo | Crítico |

---

## Rangos de margen por tipo de operación

| Tipo | ID | Margen base | Cap máximo |
|------|----|------------|------------|
| Consumible | `consumable` | 20–35% | 80% |
| Ref. General | `general` | 25–40% | 100% |
| Serv. Técnico | `tech` | 35–60% | 120% |
| Ref. Pesada | `heavy` | 35–70% | 140% |
| Logística | `logistics` | 15–30% | 60% |
| Rescate | `rescue` | 60–150% | 220% |

---

## Modificadores de precio

Se suman **en cascada** al margen base:

| Modificador | ID | Incremento |
|-------------|-----|-----------|
| Urgencia / entrega inmediata | `urgency` | +20% |
| Fuera de horario | `offhours` | +20% |
| Pieza difícil / rara | `rare` | +25% |
| Crédito | `credit` | +10% |

```
margenFinal = margenBase + Σ(modificadores activos)
```

---

## Bonus de margen por prioridad

| Prioridad | Bonus |
|-----------|-------|
| P1 — Unidad detenida | +40% |
| P2 — Operación comprometida | +20% |
| P3 / P4 | 0% |

---

## Resolución de líneas (Fase 2 vs Legacy)

```
Fase 2 (lineas[]):  usa unitPrice + qty → lineTotal
Legacy (snap):      snap.precioConIVA siempre es precio unitario (qty era 1)
```

La función `resolveLineFinancials(ml, fallbackSnap, qty)` maneja ambos casos.

---

## KPIs financieros agregados

```
Revenue operado = Σ precioConIVA donde status ∈ OPERADO_SET
Cartera activa  = Σ precioConIVA donde status ∈ CARTERA_SET
Cash recibido   = Σ precioConIVA donde status ∈ CASH_SET
Forecast        = Σ precioConIVA donde status ∈ FORECAST_SET
```

→ Ver [[../negocio/kpis-operativos]]
