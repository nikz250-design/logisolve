---
tipo: tecnico
modulo: timeline
actualizado: 2026-06-06
tags: [tiempo, kpi, velocidad, timeline]
---

# Métricas de tiempo — 7 KPIs de velocidad

← [[../00-MOC|MOC]]

---

## Los 7 segmentos

Cada segmento se calcula escaneando `ticket.timeline[]` en busca de palabras clave en el campo `evento`.

| # | Segmento | Desde | Hasta | Color |
|---|----------|-------|-------|-------|
| 1 | Respuesta inicial | Primer evento | Validando | `#6B9EC8` azul |
| 2 | Tiempo de sourcing | Validando | Stock confirmado (cotizado/autorizado) | `#7AA0E0` azul claro |
| 3 | Tiempo de compra | Stock confirmado | Comprado | `#F97316` naranja |
| 4 | Tiempo logístico | Comprado | Entregado | `#90C848` verde-amarillo |
| **5** | **Tiempo operativo** | **Primer evento** | **Entregado** | **`#8FE3BE` mint (total)** |
| 6 | Tiempo administrativo | Entregado | Facturado | `#F5C842` ámbar |
| 7 | Tiempo de cobranza | Facturado | Cobrado | `#A78BFA` morado |

---

## Detección de hitos por palabra clave

```javascript
// Primer evento del timeline → tsInicio
// Contiene "validando" o "validaci" → tsValidando
// Contiene "cotizado", "autorizado" o "stock" → tsStockConf
// Contiene "comprado" → tsComprado
// Contiene "entregado" → tsEntregado
// Contiene "facturado" → tsFacturado
// Contiene "cobrado" → tsCobrado
```

---

## Fórmulas de segmento

```
segRespuesta = tsValidando  − tsInicio
segSourcing  = tsStockConf  − tsValidando
segCompra    = tsComprado   − tsStockConf
segLogistico = tsEntregado  − tsComprado
segOperativo = tsEntregado  − tsInicio       ← suma de los 4 anteriores
segAdmin     = tsFacturado  − tsEntregado
segCobro     = tsCobrado    − tsFacturado
```

---

## Formato de duración

| Duración | Formato mostrado |
|----------|-----------------|
| < 1 min | `+<1 min` |
| 1–59 min | `+N min` |
| 1–23 h | `+Nh Mmin` |
| ≥ 24 h | `+Xd Yh` |

---

## Visualización en el timeline

1. **Punto de color** — cada evento tiene un dot coloreado según el estado que representa.
2. **Badge inline** — al llegar a un hito (validando, entregado, facturado, etc.) se muestra una píldora con el nombre del segmento y su duración.
3. **Línea de color** — la línea vertical entre eventos cambia de color según el segmento activo.
4. **SegRow** — al pie del timeline, tarjetas resumen de cada segmento disponible, con el tiempo operativo total en negrita.

---

## Línea de tiempo — color de conexión

El color de la línea entre dos eventos se determina por el timestamp del evento anterior:

```
≥ tsFacturado → cobranza (morado)
≥ tsEntregado → administrativo (ámbar)
≥ tsComprado  → logístico
≥ tsStockConf → compra (naranja)
≥ tsValidando → sourcing (azul claro)
default       → respuesta (azul)
```

---

## Por qué importa distinguir los segmentos

Un ticket que tardó 353 horas en total puede tener:
- **2 horas** de tiempo operativo (la pieza llegó rápido)
- **351 horas** de espera administrativa/cobranza

Sin esta distinción, el KPI de "tiempo de entrega" es engañoso y no refleja la eficiencia del equipo operativo.
