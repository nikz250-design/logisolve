---
tipo: negocio
area: precios
actualizado: 2026-06-06
tags: [tipos, operacion, margen, modificadores]
---

# Tipos de operación y modificadores

← [[../00-MOC|MOC]]

---

## 6 tipos de operación

| ID | Nombre | Short | Margen base | Cap máximo |
|----|--------|-------|------------|-----------|
| `consumable` | Consumible | CONS | 20–35% | 80% |
| `general` | Ref. General | REF-G | 25–40% | 100% |
| `tech` | Serv. Técnico | SERV | 35–60% | 120% |
| `heavy` | Ref. Pesada | REF-P | 35–70% | 140% |
| `logistics` | Logística | LOG | 15–30% | 60% |
| `rescue` | Rescate | RESC | 60–150% | 220% |

El **cap** es el máximo margen aplicable incluso con todos los modificadores activos.

---

## 4 modificadores de precio

Se activan/desactivan por checkbox en el Cotizador. Se acumulan sobre el margen base.

| Modificador | ID | +% al margen | Cuándo usar |
|-------------|-----|-------------|------------|
| Urgencia / entrega inmediata | `urgency` | +20% | Cliente necesita la pieza hoy |
| Fuera de horario | `offhours` | +20% | Atención nocturna o fin de semana |
| Pieza difícil / rara | `rare` | +25% | Baja disponibilidad, búsqueda extendida |
| Crédito | `credit` | +10% | Pago a crédito (no al contado) |

### Ejemplo de cálculo

```
Tipo: Ref. Pesada  → margen base: 50%
Modificadores:
  + Urgencia: +20%
  + Crédito:  +10%
────────────────────
Margen final: 80%  (cap = 140%, ok)

Costo pieza: $10,000 MXN
precioSinIVA = $10,000 × 1.80 = $18,000
precioConIVA = $18,000 × 1.16 = $20,880
uBruta       = $8,000
isr          = $2,400
uNeta        = $5,600
margenNeto   = $5,600 / $20,880 = 26.8%
```

---

## Bonus de margen por prioridad

→ Ver [[prioridades]]

| Prioridad | Bonus adicional |
|-----------|----------------|
| P1 — Unidad detenida | +40% |
| P2 — Operación comprometida | +20% |
| P3 / P4 | 0% |

El bonus de prioridad se suma encima de los modificadores.

---

## IA de cotización

Cuando se solicita precio via IA (`/api/cotizar.mjs`):
- Claude recibe el tipo de operación, nombre de la pieza, aplicación vehicular
- Sugiere costo estimado y margen recomendado dentro del rango del tipo
- El usuario puede aceptar, ajustar o ingresar precio manual

→ Ver [[../tecnico/arquitectura#API de IA]]
