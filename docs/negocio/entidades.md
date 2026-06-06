---
tipo: negocio
area: directorio
actualizado: 2026-06-06
tags: [clientes, unidades, proveedores, piezas]
---

# Entidades del sistema

← [[../00-MOC|MOC]]

---

## Clientes (`CLI-NNNNN`)

| Campo | Descripción |
|-------|-------------|
| `id` | `CLI-NNNNN` |
| `empresa` | Razón social |
| `contacto` | Nombre del contacto |
| `tel` / `correo` | Datos de contacto |
| `rfc` | RFC para facturación |
| `direccion` / `ciudad` / `estado` | Ubicación |
| `creditDays` | Días de crédito otorgados |
| `category` | Categoría del cliente: `A`, `B`, `C` |
| `score` | Score de pago (0–100) |
| `unidades` | Array de IDs de unidades asignadas |

### Cliente semilla
- **CLI-00001** — Logis Express · Cuautitlán Izcalli, EdoMex · 15 días crédito · Score 80

---

## Unidades (`UNI-NNNNN`)

| Campo | Descripción |
|-------|-------------|
| `id` | `UNI-NNNNN` |
| `vin` | VIN del vehículo |
| `marca` / `modelo` / `anio` | Identificación del vehículo |
| `motor` | Tipo de motor |
| `transmision` | Tipo de transmisión |
| `config` | Configuración (e.g. `6x2`, `4x2`) |
| `clientId` | Cliente al que pertenece |
| `statusOp` | `operativa` \| `preventivo` \| `taller` |
| `km` | Kilometraje actual |
| `notas` | Observaciones técnicas |
| `placa` / `economico` | Identificación operativa |

### Unidades semilla (todas de CLI-00001)

| ID | Vehículo | Motor | KM | Status |
|----|----------|-------|----|--------|
| UNI-00001 | Freightliner M2 106 2019 | Detroit DD5 | 284,000 | operativa |
| UNI-00002 | Ford F-350 2014 | 6.7L Power Stroke | 198,000 | operativa |
| UNI-00003 | Ford F-350 2012 | 6.7L Power Stroke | 312,000 | preventivo |
| UNI-00004 | Ford F-350 2016 | 6.7L Power Stroke | 156,000 | operativa |

---

## Proveedores (`PRV-NNNNN`)

| Campo | Descripción |
|-------|-------------|
| `id` | `PRV-NNNNN` |
| `nombre` | Nombre del proveedor |
| `categoria` | Categoría de piezas |
| `especialidad` | Marcas / tipos de piezas que maneja |
| `entregaDias` | Días promedio de entrega |
| `confiabilidad` | Score de confiabilidad (0–100) |
| `contacto` | Teléfonos |
| `cobertura` | Zona geográfica de cobertura |
| `scoreOp` | Score operativo (0–100) |
| `incidencias` | Número de incidencias registradas |

### Proveedor semilla

- **PRV-00001** — Refaccionaria Diesel El Cerrito · Tepotzotlán, Edomex  
  Especialidad: Diesel, clutch, motor, transmisión  
  Confiabilidad: 87 · Entrega: 1 día · Tel: 55 4327 4660

- **PRV-00002** — Autopartes La Palma · Arcos del Sitio  
  Especialidad: Multimarca — Ford, VW, Chevrolet, Hyundai, Nissan, Audi, Toyota, Mercedes, Honda  
  Confiabilidad: 82 · Entrega: 1 día · Tel: 55 4327 4660

---

## Piezas del catálogo (`PRT-NNNNN`)

| Campo | Descripción |
|-------|-------------|
| `id` | `PRT-NNNNN` |
| `nombre` | Nombre de la pieza |
| `oem` | Número OEM del fabricante |
| `aftermarket` | Número aftermarket |
| `aplicacion` | Vehículos en los que aplica |
| `notas` | Observaciones de compatibilidad |
| `proveedor` | Proveedor habitual |
| `ultimoPrecio` | Último precio de compra (MXN) |
| `ultimaFecha` | Fecha de la última compra |

### Ejemplo
- **PRT-00001** — Horquilla de clutch  
  OEM: A0002500370 · Aftermarket: FTE MHK0504  
  Aplicación: Freightliner M2 106 / DD5 / Detroit  
  Último precio: $2,720 MXN (12/05/2026)
