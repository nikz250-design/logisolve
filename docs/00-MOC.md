---
tipo: moc
actualizado: 2026-06-06
tags: [moc, logisolve]
---

# Logisolve — Mapa de Conocimiento

> Sistema de gestión operativa para refacciones y logística de flota pesada.

---

## 🗂 Técnico

| Nota | Descripción |
|------|-------------|
| [[tecnico/arquitectura]] | Stack, estructura de archivos, flujo de datos |
| [[tecnico/modulos-app]] | Los 10 módulos/tabs de la app |
| [[tecnico/estados-pipeline]] | Los 12 estados del ticket y sus transiciones |
| [[tecnico/modelo-datos-ticket]] | Todos los campos del objeto ticket |
| [[tecnico/formulas-financieras]] | Cálculos de precio, margen, IVA, ISR |
| [[tecnico/metricas-tiempo]] | Los 7 KPIs de velocidad operativa |

---

## 💼 Negocio

| Nota | Descripción |
|------|-------------|
| [[negocio/flujos-operacion]] | Ciclo de vida completo de una solicitud |
| [[negocio/tipos-operacion]] | 6 tipos de op + 4 modificadores de precio |
| [[negocio/entidades]] | Clientes, unidades, proveedores, piezas |
| [[negocio/kpis-operativos]] | KPIs del Centro de Operaciones |
| [[negocio/prioridades]] | P1–P4: impacto, color, bonus de margen |

---

## 📖 Referencia rápida

| Nota | Descripción |
|------|-------------|
| [[referencia/colores-estados]] | Paleta de colores por estado |
| [[referencia/glosario]] | Términos clave del dominio |
| [[referencia/seed-data]] | Datos semilla — clientes, unidades, proveedores |

---

## Estructura del sistema

```
Solicitud → Cotizador → Ticket en Pipeline → Centro Ops → Historial
                ↓                  ↓
           PDF / Ticket       Timeline + KPIs
```

- **Cotizador de Refacciones** → crea tickets con líneas, calcula precios
- **Pipeline** → gestión visual del estado de cada ticket
- **Centro Ops** → KPIs, alertas P1, cartera vencida
- **Historial** → tickets cerrados/cobrados con timeline completo
