---
tipo: referencia
actualizado: 2026-06-06
tags: [colores, estados, diseño, tokens]
---

# Colores por estado

← [[../00-MOC|MOC]]

---

## Estados del pipeline

| Estado | Dot color | Hex |
|--------|-----------|-----|
| Recibido | 🔵 | `#6B9EC8` |
| Validando | 🟡 | `#C8C050` |
| Sourcing | 🔷 | `#7AA0E0` |
| Cotizado | 🟢 | `#8FC855` |
| Autorizado | 🟢 | `#50C878` |
| Comprado | 🟢 | `#50A888` |
| En Tránsito | 🟩 | `#90C848` |
| Entregado | 🩵 | `#8FE3BE` |
| Facturado | 🟣 | `#A78BFA` |
| Cobrado | 💚 | `#50D070` |
| Cerrado | ⚫ | `#8A9AA4` |
| Cancelado | 🔴 | `#FF7A7A` |

---

## Prioridades

| Nivel | Color | Hex |
|-------|-------|-----|
| P1 | 🔴 | `#FF7A7A` |
| P2 | 🟡 | `#F5C842` |
| P3 | 🩵 | `#8FE3BE` |
| P4 | ⚫ | `#7E848E` |

---

## Segmentos de tiempo

| Segmento | Color | Hex |
|----------|-------|-----|
| Respuesta inicial | 🔵 | `#6B9EC8` |
| Sourcing | 🔷 | `#7AA0E0` |
| Compra | 🟠 | `#F97316` |
| Logístico | 🟩 | `#90C848` |
| Operativo (total) | 🩵 | `#8FE3BE` |
| Administrativo | 🟡 | `#F5C842` |
| Cobranza | 🟣 | `#A78BFA` |

---

## Tokens del tema oscuro (principales)

| Token | Valor | Uso |
|-------|-------|-----|
| `bg0` | `#0D0F12` | Fondo base |
| `bg1` | `rgba(22,24,28,0.62)` | Cards |
| `t1` | `#F5F5F7` | Texto principal |
| `t2` | `#B6BBC4` | Texto secundario |
| `t3` | `#7E848E` | Texto terciario |
| `green` | `#8FE3BE` | Acento principal (mint) |
| `yellow` | `#F5C842` | Ámbar |
| `red` | `#FF7A7A` | Error / cancelado |
| `purple` | `#A78BFA` | Facturado / cobranza |
| `orange` | `#F97316` | Compra |
