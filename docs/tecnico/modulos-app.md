---
tipo: tecnico
modulo: navegacion
actualizado: 2026-06-06
tags: [modulos, tabs, navegacion]
---

# Módulos de la app

← [[../00-MOC|MOC]]

---

La app tiene **10 tabs** accesibles desde la barra de navegación.

| Tab ID | Nombre | Componente | Función principal |
|--------|--------|-----------|------------------|
| `ops` | Centro Ops | `MOps` / `DOps` | KPIs, alertas P1, cartera, forecast |
| `tickets` | Pipeline | `MPipeline` / `DPipeline` | Gestión de tickets activos |
| `historial` | Historial | `MHistorial` / Desktop | Tickets cobrados/cerrados/cancelados |
| `cotizador` | Cotizador de Refacciones | `MCotizador` / `DCotizador` | Crear cotizaciones + generar tickets |
| `refacciones` | Refacciones | `MRefacciones` | Catálogo de piezas |
| `flota` | Flota | `FlotaModule` | Control de unidades |
| `proveedores` | Proveedores | — | Directorio de suppliers |
| `clientes` | Clientes | — | Directorio de clientes |
| `cartera` | Cartera | `MCartera` / `DCartera` | Cuentas por cobrar, vencidos |
| `ajustes` | Ajustes | `MAjustes` | Config, sync Supabase, tema |

---

## Patrón M/D (Mobile / Desktop)

Cada módulo tiene dos variantes:
- **`M`** → vista móvil (320–768 px)
- **`D`** → vista desktop (> 768 px)

La app detecta el breakpoint con `useMediaQuery` y renderiza la variante correcta.

---

## Flujo principal entre módulos

```
[Cotizador]
    ↓  "Convertir a ticket"
[Pipeline]
    ↓  cambios de estado
[Centro Ops]  ←→  [Cartera]
    ↓  estado = cobrado / cerrado / cancelado
[Historial]
```

---

## Centro Ops (`ops`)

Panel de control en tiempo real:

- **Distribución de estados** — strip scrollable con conteo por estado
- **KPIs financieros** — Revenue operado, Cartera activa, Cash, Forecast
- **Alertas P1** — tickets con prioridad P1 activos
- **Ticket más reciente** — última operación con costos
- **Mapa de calor mensual** — actividad por día

→ Ver [[../negocio/kpis-operativos]]

---

## Pipeline (`tickets`)

- Distribución de estados igual que Ops (strip scrollable)
- Filtro por estado + sort (prioridad / fecha / estado / cartera)
- Card de ticket expandible con timeline completo
- Cambio de estado inline con confirmación
- Default: muestra **todos** los estados

---

## Cotizador (`cotizador`)

1. Seleccionar cliente, unidad, tipo de operación
2. Agregar líneas (pieza de catálogo o manual)
3. Calcular precios con IA o manual
4. Ver margen, IVA, ISR en tiempo real
5. Generar PDF o convertir a ticket

→ Ver [[formulas-financieras]]
