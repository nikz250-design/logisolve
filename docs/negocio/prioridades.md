---
tipo: negocio
area: operaciones
actualizado: 2026-06-06
tags: [prioridades, P1, P2, urgencia]
---

# Prioridades operativas

← [[../00-MOC|MOC]]

---

## Los 4 niveles

| Nivel | Label | Color | Bonus margen | Descripción |
|-------|-------|-------|-------------|-------------|
| **P1** | Unidad detenida | `#FF7A7A` rojo | +40% | La unidad NO puede operar. Impacto económico inmediato para el cliente. Atención en minutos. |
| **P2** | Operación comprometida | `#F5C842` amarillo | +20% | La unidad puede operar pero con limitación. Riesgo de detenerse pronto. |
| **P3** | Preventivo urgente | `#8FE3BE` mint | 0% | Mantenimiento preventivo que no puede postergarse más. |
| **P4** | Solicitud normal | gris | 0% | Sin urgencia. Puede programarse con anticipación. |

---

## Impacto del P1 en la app

- **Badge rojo** en el tab Centro Ops con conteo de P1 activos
- **Sorting prioritario** en Pipeline (P1 aparece primero)
- **Bonus de margen +40%** se aplica automáticamente en el Cotizador

---

## Cuándo asignar cada nivel

### P1 — Unidad detenida
- Camión en ruta no puede continuar
- Unidad en taller sin piezas para arrancar
- Falla que impide el uso completo del vehículo

### P2 — Operación comprometida
- La unidad funciona pero hay una falla que puede agravarse
- El cliente tiene una entrega comprometida próxima
- Pieza desgastada que requiere cambio esta semana

### P3 — Preventivo urgente
- El mantenimiento estaba programado y se aproxima el límite
- KM cerca del intervalo de cambio
- Fuga menor que no afecta operación pero debe atenderse

### P4 — Normal
- Todo lo demás: consultas, cotizaciones de proyecto, programaciones futuras
