---
tipo: referencia
actualizado: 2026-06-06
tags: [seed, datos, demo]
---

# Datos semilla (demo)

← [[../00-MOC|MOC]]

---

> Estos son los datos de demostración que se cargan en una instalación nueva.  
> Se pueden reemplazar desde **Ajustes → Reiniciar datos**.

---

## Cliente

| ID | Empresa | Ciudad | Crédito | Score |
|----|---------|--------|---------|-------|
| CLI-00001 | Logis Express | Cuautitlán Izcalli, EdoMex | 15 días | 80 |

---

## Unidades

| ID | Vehículo | Motor | KM | Status |
|----|----------|-------|----|--------|
| UNI-00001 | Freightliner M2 106 2019 | Detroit DD5 | 284,000 | operativa |
| UNI-00002 | Ford F-350 Super Duty 2014 | 6.7L Power Stroke V8 | 198,000 | operativa |
| UNI-00003 | Ford F-350 Super Duty 2012 | 6.7L Power Stroke V8 | 312,000 | preventivo |
| UNI-00004 | Ford F-350 Super Duty 2016 | 6.7L Power Stroke V8 | 156,000 | operativa |

---

## Proveedores

| ID | Nombre | Zona | Especialidad | Confiabilidad |
|----|--------|------|-------------|---------------|
| PRV-00001 | Refaccionaria Diesel El Cerrito | Tepotzotlán, Edomex | Diesel, clutch, motor, transmisión | 87% |
| PRV-00002 | Autopartes La Palma | Arcos del Sitio | Multimarca Ford/VW/Chevrolet/Nissan/Hyundai/Audi/Toyota/Mercedes/Honda | 82% |

---

## Piezas del catálogo

| ID | Nombre | OEM | Aftermarket | Aplicación | Precio |
|----|--------|-----|-------------|-----------|--------|
| PRT-00001 | Horquilla de clutch | A0002500370 | FTE MHK0504 | Freightliner M2 106 / DD5 | $2,720 |

---

## Notas sobre los datos semilla

- Los tickets semilla incluyen ejemplos de todos los tipos de operación y prioridades.
- Las timelines semilla tienen timestamps reales para que los KPIs de tiempo funcionen correctamente.
- Los datos se guardan en `localStorage` y se sincronizan a Supabase si está configurado.
