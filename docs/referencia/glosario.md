---
tipo: referencia
actualizado: 2026-06-06
tags: [glosario, terminos, dominio]
---

# Glosario

← [[../00-MOC|MOC]]

---

| Término | Definición |
|---------|-----------|
| **Ticket** | Unidad de trabajo del sistema. Representa una solicitud de refacción o servicio desde su creación hasta el cobro. |
| **Snap** | Snapshot financiero — objeto con todos los campos de precio, costo, margen en un momento dado. Se guarda en el ticket al crearlo. |
| **Timeline** | Historial cronológico de eventos del ticket. Cada cambio de estado genera un evento. |
| **Cotizador** | Módulo para crear cotizaciones con una o más líneas de piezas/servicios. |
| **Línea** | Una pieza o servicio dentro de una cotización. Tiene precio unitario, cantidad y margen propio. |
| **Pipeline** | El conjunto de tickets activos (no cerrados). Vista de gestión diaria. |
| **Cartera** | Tickets en estado `entregado` o `facturado` — trabajo entregado pero no cobrado. |
| **Cash** | Tickets en estado `cobrado` o `cerrado` — dinero efectivamente recibido. |
| **Forecast** | Tickets en estado `cotizado` o `autorizado` — probabilidad de conversión. No contamina revenue. |
| **OPERADO** | Todo el trabajo ya ejecutado (entregado en adelante). Genera utilidad operativa. |
| **P1–P4** | Niveles de prioridad del ticket. P1 = unidad detenida (máxima urgencia). |
| **OEM** | Original Equipment Manufacturer — número de parte del fabricante original. |
| **Aftermarket** | Número de parte de un fabricante alternativo (no OEM). |
| **Score de cliente** | Métrica de comportamiento de pago del cliente (0–100). |
| **Confiabilidad proveedor** | Métrica de cumplimiento del proveedor en entregas y calidad (0–100). |
| **promesaPago** | Fecha en que el cliente se compromete a pagar. Si vence sin cobrar → cartera vencida. |
| **IVA trasladado** | IVA cobrado al cliente (16%). |
| **IVA neto** | IVA a pagar al SAT = IVA cobrado − IVA pagado al proveedor. |
| **ISR** | Impuesto Sobre la Renta estimado (30% sobre utilidad bruta). |
| **uBruta** | Utilidad bruta = precioSinIVA − costoTotal. |
| **uNeta** | Utilidad neta = uBruta − ISR. |
| **margenNetoPrecio** | Margen neto sobre precio de venta (%). Semáforo ≥25% verde. |
| **ROI** | Retorno sobre inversión = uNeta / costoTotal × 100. |
| **Marca de agua** | Texto superpuesto en PDF de cotización (e.g. "CONFIDENCIAL"). |
| **Supabase** | Base de datos en nube usada como respaldo. Sincronización opcional. |
| **Fase 2** | Versión del cotizador con líneas múltiples y campos explícitos (vs. Legacy de línea única). |
| **Legacy ticket** | Ticket creado antes de Fase 2 — snap como fuente de verdad, sin campo `lineas`. |
| **Tiempo operativo** | Tiempo desde recepción hasta entrega. Mide eficiencia del equipo operativo. |
| **Tiempo administrativo** | Tiempo desde entrega hasta facturación. Mide eficiencia administrativa. |
| **Tiempo de cobranza** | Tiempo desde facturación hasta cobro. Mide eficiencia de cobranza. |
