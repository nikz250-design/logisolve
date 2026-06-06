---
tipo: tecnico
modulo: core
actualizado: 2026-06-06
tags: [arquitectura, stack, frontend]
---

# Arquitectura

← [[../00-MOC|MOC]]

---

## Stack

| Capa | Tecnología |
|------|-----------|
| UI | React 19 + Vite 8 |
| Animaciones | Framer Motion 12 |
| Iconos | Lucide React |
| Gráficas | Recharts 2 |
| IA | `@anthropic-ai/sdk` (Claude Opus 4.7) |
| Backend API | Vercel Serverless Functions (`/api/*.mjs`) |
| Persistencia | `localStorage` + Supabase (sync opcional) |
| Deploy | Vercel — rama `principal` = producción |

---

## Estructura de archivos

```
logisolve/
├── src/
│   ├── app.jsx          ← App completa (~15 000 líneas, single-file)
│   └── modules/
│       └── flota/       ← Módulo de flota separado
├── api/
│   ├── cotizar.mjs      ← Endpoint de cotización IA (Claude)
│   ├── sync-*.mjs       ← Endpoints de sincronización Supabase
│   └── ...
├── public/
└── docs/                ← Esta base de conocimiento
```

---

## Patrón de datos

```
localStorage (fuente de verdad local)
        ↕  sync cada ~5 min
    Supabase (respaldo en nube)
```

- El estado vive en un **`useReducer`** en el componente raíz `App`.
- Persiste en `localStorage` bajo claves fijas (`tickets`, `clients`, `units`, etc.).
- Supabase se sincroniza en segundo plano; si falla, la app sigue funcionando.

---

## Temas visuales

La app soporta **modo oscuro** (`C_DARK`) y **modo claro** (`C_LIGHT`).

- `ThemeCtx` — React Context que provee la paleta activa a todos los componentes.
- `makeA(C)` — función que deriva la paleta móvil/accent a partir del tema activo.
- Tokens de diseño definidos en `L1 — DESIGN TOKENS` al inicio de `app.jsx`.

---

## API de IA

- Todos los llamados a Claude van por **`/api/cotizar.mjs`** (serverless).
- `ANTHROPIC_API_KEY` es **server-side only** — nunca en variables `VITE_*`.
- Modelo usado: `claude-opus-4-7` con `thinking: {type: "adaptive"}`.

---

## Módulos relacionados

- [[modulos-app]] — descripción de cada tab
- [[estados-pipeline]] — estados del ticket
- [[formulas-financieras]] — lógica financiera
