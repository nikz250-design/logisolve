import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Truck, AlertTriangle, Wrench,
  BarChart3, FileText, X, ChevronRight,
  Activity, Zap, Shield, Clock
} from "lucide-react";
import { FlotaDashboard } from "./Dashboard";
import { FlotaUnidades } from "./Unidades";
import { FlotaIncidencias } from "./Incidencias";
import { FlotaMantenimiento } from "./Mantenimiento";
import { FlotaCostos } from "./Costos";
import { FlotaDocumentacion } from "./Documentacion";

// ── Theme colors (glassmorphism dark + light aware) ──────────────────────────
const FLOTA_DARK = {
  bg: "#070D14",
  surface: "rgba(14,22,34,0.72)",
  surfaceHi: "rgba(20,30,46,0.85)",
  border: "rgba(255,255,255,0.08)",
  borderHi: "rgba(255,255,255,0.14)",
  text: "#F0F4F8",
  textSec: "#8A9BB0",
  textTer: "#546070",
  accent: "#3DFFC0",
  accentDim: "rgba(61,255,192,0.12)",
  accentStrong: "rgba(61,255,192,0.24)",
  blue: "#4DA3FF",
  blueDim: "rgba(77,163,255,0.14)",
  red: "#FF5555",
  redDim: "rgba(255,85,85,0.14)",
  amber: "#FFB830",
  amberDim: "rgba(255,184,48,0.14)",
  purple: "#9B8DD0",
  purpleDim: "rgba(155,141,208,0.14)",
  blur: "blur(32px) saturate(1.8)",
};

const FLOTA_LIGHT = {
  bg: "#F0F2F5",
  surface: "rgba(255,255,255,0.70)",
  surfaceHi: "rgba(255,255,255,0.90)",
  border: "rgba(0,0,0,0.07)",
  borderHi: "rgba(0,0,0,0.12)",
  text: "#0F1923",
  textSec: "#4A5A6A",
  textTer: "#8A9BB0",
  accent: "#00A87A",
  accentDim: "rgba(0,168,122,0.10)",
  accentStrong: "rgba(0,168,122,0.18)",
  blue: "#0066CC",
  blueDim: "rgba(0,102,204,0.10)",
  red: "#CC3333",
  redDim: "rgba(204,51,51,0.10)",
  amber: "#CC8800",
  amberDim: "rgba(204,136,0,0.10)",
  purple: "#6650A4",
  purpleDim: "rgba(102,80,164,0.10)",
  blur: "blur(24px) saturate(1.4)",
};

export const FlotaCtx = React.createContext(FLOTA_DARK);

const SECCIONES = [
  { id:"dashboard",     label:"Dashboard",     icon: LayoutDashboard },
  { id:"unidades",      label:"Unidades",       icon: Truck            },
  { id:"incidencias",   label:"Incidencias",    icon: AlertTriangle    },
  { id:"mantenimiento", label:"Mantenimiento",  icon: Wrench           },
  { id:"costos",        label:"Costos",         icon: BarChart3        },
  { id:"documentacion", label:"Documentación",  icon: FileText         },
];

export default function FlotaModule({ darkMode }) {
  const T = darkMode ? FLOTA_DARK : FLOTA_LIGHT;
  const [seccion, setSeccion] = useState("dashboard");

  return (
    <FlotaCtx.Provider value={T}>
      <div style={{
        minHeight:"100vh",
        background: darkMode
          ? "radial-gradient(ellipse 80% 60% at 10% -10%, rgba(61,255,192,0.05) 0%, transparent 55%), radial-gradient(ellipse 50% 50% at 90% 80%, rgba(77,163,255,0.05) 0%, transparent 50%), #070D14"
          : "radial-gradient(ellipse 60% 50% at 20% 10%, rgba(0,168,122,0.08) 0%, transparent 50%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(0,102,204,0.06) 0%, transparent 50%), #EEF1F5",
        fontFamily:"'Trebuchet MS', system-ui, sans-serif",
        color: T.text,
      }}>
        {/* ── Sidebar / Top nav ── */}
        <FlotaNav T={T} darkMode={darkMode} seccion={seccion} setSeccion={setSeccion}/>

        {/* ── Content ── */}
        <div style={{ paddingTop: 64 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={seccion}
              initial={{ opacity:0, y:12 }}
              animate={{ opacity:1, y:0 }}
              exit={{ opacity:0, y:-8 }}
              transition={{ duration:0.22, ease:"easeOut" }}
            >
              {seccion === "dashboard"     && <FlotaDashboard T={T} darkMode={darkMode}/>}
              {seccion === "unidades"      && <FlotaUnidades T={T} darkMode={darkMode}/>}
              {seccion === "incidencias"   && <FlotaIncidencias T={T} darkMode={darkMode}/>}
              {seccion === "mantenimiento" && <FlotaMantenimiento T={T} darkMode={darkMode}/>}
              {seccion === "costos"        && <FlotaCostos T={T} darkMode={darkMode}/>}
              {seccion === "documentacion" && <FlotaDocumentacion T={T} darkMode={darkMode}/>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </FlotaCtx.Provider>
  );
}

function FlotaNav({ T, darkMode, seccion, setSeccion }) {
  return (
    <div style={{
      position:"fixed", top:0, left:0, right:0, zIndex:200,
      background: darkMode ? "rgba(7,13,20,0.88)" : "rgba(240,242,245,0.88)",
      backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
      borderBottom:`1px solid ${T.borderHi}`,
      padding:"0 20px",
      display:"flex", alignItems:"center", gap:8,
      height:64,
      boxShadow: darkMode
        ? "0 2px 24px rgba(0,0,0,0.5)"
        : "0 2px 16px rgba(0,0,0,0.06)",
    }}>
      {/* Brand */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginRight:24, flexShrink:0 }}>
        <div style={{
          width:36, height:36, borderRadius:10,
          background:"linear-gradient(135deg, #3DFFC0, #4DA3FF)",
          display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 4px 16px rgba(61,255,192,0.30)",
        }}>
          <Truck size={20} color="#070D14" strokeWidth={2.5}/>
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:T.text, letterSpacing:"-0.01em" }}>Control de Flota</div>
          <div style={{ fontSize:9, color:T.textTer, letterSpacing:"0.1em", textTransform:"uppercase" }}>Logisolve Fleet</div>
        </div>
      </div>

      {/* Tabs — scrollable */}
      <div style={{ display:"flex", gap:4, overflowX:"auto", scrollbarWidth:"none", flex:1 }}>
        {SECCIONES.map(s => {
          const Icon = s.icon;
          const active = seccion === s.id;
          return (
            <motion.button
              key={s.id}
              onClick={() => setSeccion(s.id)}
              whileTap={{ scale:0.95 }}
              style={{
                flexShrink:0,
                display:"flex", alignItems:"center", gap:6,
                padding:"7px 14px", borderRadius:10,
                background: active ? T.accentDim : "transparent",
                border:`1px solid ${active ? T.accent + "44" : "transparent"}`,
                color: active ? T.accent : T.textSec,
                fontSize:12, fontWeight: active ? 700 : 500,
                cursor:"pointer", transition:"all 0.18s",
                whiteSpace:"nowrap",
              }}
            >
              <Icon size={14} strokeWidth={active ? 2.5 : 2}/>
              {s.label}
            </motion.button>
          );
        })}
      </div>

      {/* Live indicator */}
      <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background:T.accent, boxShadow:`0 0 8px ${T.accent}` }}/>
        <span style={{ fontSize:10, color:T.textSec, fontWeight:600 }}>EN VIVO</span>
      </div>
    </div>
  );
}
