---
tipo: tecnico
modulo: pipeline
actualizado: 2026-06-06
tags: [estados, pipeline, transiciones]
---

# Estados del Pipeline

← [[../00-MOC|MOC]]

---

## Los 12 estados

| Estado | Label | Color dot | Grupo |
|--------|-------|-----------|-------|
| `recibido` | Recibido | `#6B9EC8` azul | Backlog |
| `validando` | Validando | `#C8C050` amarillo | Backlog |
| `sourcing` | Sourcing | `#7AA0E0` azul claro | Backlog |
| `cotizado` | Cotizado | `#8FC855` verde lima | Backlog / Forecast |
| `autorizado` | Autorizado | `#50C878` verde | Backlog / Forecast |
| `comprado` | Comprado | `#50A888` verde azulado | Backlog |
| `transito` | En Tránsito | `#90C848` verde amarillo | Backlog |
| `entregado` | Entregado | `#8FE3BE` mint | Cartera |
| `facturado` | Facturado | `#A78BFA` morado | Cartera |
| `cobrado` | Cobrado | `#50D070` verde brillante | Cash / Cerrado |
| `cerrado` | Cerrado | `#8A9AA4` gris | Cerrado |
| `cancelado` | Cancelado | `#FF7A7A` rojo | Cerrado |

---

## Transiciones permitidas

```
recibido  →  validando, sourcing, cancelado
validando →  sourcing, cotizado, cancelado
sourcing  →  cotizado, cancelado
cotizado  →  autorizado, cancelado
autorizado → comprado, cancelado
comprado  →  transito, cancelado
transito  →  entregado, cancelado
entregado →  facturado, cancelado
facturado →  cobrado, cancelado
cobrado   →  cerrado
cerrado   →  (terminal)
cancelado →  (terminal)
```

---

## Conjuntos financieros (sets)

```javascript
BACKLOG_SET  = { recibido, validando, sourcing, cotizado, autorizado, comprado, transito }
FORECAST_SET = { cotizado, autorizado }          // pipeline probable
PIPELINE_SET = { recibido, validando, sourcing, comprado, transito }  // en proceso
OPERADO_SET  = { entregado, facturado, cobrado, cerrado }  // trabajo ejecutado
CARTERA_SET  = { entregado, facturado }          // entregado pero no cobrado
CASH_SET     = { cobrado, cerrado }              // dinero recibido
CLOSED_SET   = { cerrado, cancelado, cobrado }   // tickets terminados
TICKET_ALL   = [ ...TICKET_PIPELINE, "cancelado" ]  // todos los 12
```

---

## Arquitectura de 4 capas (finanzas)

```
Capa 1 OPERADO  → trabajo ya ejecutado (genera utilidad operativa)
Capa 2 CARTERA  → entregado/facturado pero NO cobrado
Capa 3 CASH     → dinero ya en caja
Capa 4 FORECAST → pipeline probable, no contamina revenue
```

---

## Segmentos de tiempo por estado

Cada cambio de estado genera un evento en `ticket.timeline[]`.  
Los segmentos miden el tiempo entre hitos clave:

| Segmento | Desde → Hasta | Color |
|----------|--------------|-------|
| Respuesta inicial | Recibido → Validando | `#6B9EC8` azul |
| Tiempo de sourcing | Validando → Stock confirmado | `#7AA0E0` azul claro |
| Tiempo de compra | Stock confirmado → Comprado | naranja |
| Tiempo logístico | Comprado → Entregado | `#90C848` |
| **Tiempo operativo** | Recibido → Entregado | `#8FE3BE` mint (bold) |
| Tiempo administrativo | Entregado → Facturado | `#F5C842` ámbar |
| Tiempo de cobranza | Facturado → Cobrado | `#A78BFA` morado |

→ Ver [[metricas-tiempo]]
