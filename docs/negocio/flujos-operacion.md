---
tipo: negocio
area: operaciones
actualizado: 2026-06-06
tags: [flujo, proceso, operacion, ciclo-vida]
---

# Flujos de operación

← [[../00-MOC|MOC]]

---

## Ciclo de vida completo de una solicitud

```
CLIENTE solicita refacción / servicio
         ↓
[Recibido] ← se crea el ticket en el Cotizador
         ↓
[Validando] — se verifica la solicitud, se identifica la pieza
         ↓
[Sourcing] — se busca el proveedor, se consulta disponibilidad
         ↓
[Cotizado] — se envía cotización al cliente
         ↓
[Autorizado] — cliente aprueba el precio
         ↓
[Comprado] — se realiza la compra al proveedor
         ↓
[En Tránsito] — la pieza está en camino
         ↓
[Entregado] ← CIERRE OPERATIVO — se entrega al cliente
         ↓
[Facturado] — se emite factura
         ↓
[Cobrado] ← CIERRE FINANCIERO — se recibe el pago
         ↓
[Cerrado] — ticket archivado
```

En cualquier punto → `[Cancelado]` (terminal)

---

## Roles en el proceso

| Rol | Responsabilidad |
|-----|----------------|
| **Operador** | Recepción, validación, sourcing, compra, entrega |
| **Administración** | Facturación, seguimiento de cobro |
| **Cliente** | Autorización, pago |
| **Proveedor** | Surtido, entrega de mercancía |

---

## Tipos de operación

→ Ver [[tipos-operacion]] para rangos de margen y bonos de precio.

| Tipo | Ejemplos típicos | Tiempo estimado |
|------|-----------------|-----------------|
| Consumible | Filtros, aceite, líquidos | 1–4 h |
| Ref. General | Frenos, clutch, bandas | 4–24 h |
| Serv. Técnico | Diagnóstico, mano de obra | 2–48 h |
| Ref. Pesada | Motor, transmisión, diferencial | 24–72 h |
| Logística | Traslado, grúa, maniobras | 1–8 h |
| Rescate | Unidad varada en ruta, emergencia | 2–12 h |

---

## Pasos en el Cotizador

1. **Seleccionar cliente** → asocia la unidad y condiciones de crédito
2. **Seleccionar unidad** → vincula historial de la unidad
3. **Elegir tipo de operación** → define rango de margen base
4. **Agregar líneas**:
   - Desde catálogo de refacciones (llena precio automático)
   - Manual (se ingresa precio o se solicita cotización IA)
5. **Aplicar modificadores** (urgencia, horario, crédito, etc.)
6. **Revisar resumen** — precio con IVA, margen neto, ISR
7. **Acción final**:
   - `Generar PDF` → descarga cotización
   - `Convertir a ticket` → crea ticket en Pipeline con estado `recibido`

---

## Alertas operativas

| Alerta | Condición | Módulo |
|--------|-----------|--------|
| **P1 activo** | Ticket P1 sin resolver | Centro Ops (badge rojo) |
| **Cartera vencida** | promesaPago < hoy AND status ∈ CARTERA_SET | Centro Ops + Cartera |
| **Timeline en curso** | Último evento + tiempo transcurrido | Pipeline (dot pulsante) |
