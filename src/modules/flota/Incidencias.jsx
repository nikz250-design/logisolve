import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, CheckCircle2, Wrench, Search, LayoutGrid, List } from "lucide-react";
import { INCIDENCIAS } from "./mockData";

const PRIORIDAD = {
  critica: { color: "#FF5555", label: "Crítica" },
  alta:    { color: "#FFB830", label: "Alta" },
  media:   { color: "#4DA3FF", label: "Media" },
  baja:    { color: "#8A9BB0", label: "Baja" },
};

const STATUS_INC = {
  pendiente:   { label: "Pendiente",   color: "#FFB830", icon: Clock },
  diagnostico: { label: "Diagnóstico", color: "#4DA3FF", icon: Search },
  reparacion:  { label: "Reparación",  color: "#9B8DD0", icon: Wrench },
  cerrado:     { label: "Cerrado",     color: "#3DFFC0", icon: CheckCircle2 },
};

const KANBAN_COLS = ["pendiente", "diagnostico", "reparacion", "cerrado"];

function IncCard({ inc, T, darkMode }) {
  const prio = PRIORIDAD[inc.prioridad] || PRIORIDAD.baja;
  const st = STATUS_INC[inc.status] || STATUS_INC.pendiente;
  const StIcon = st.icon;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${prio.color}`,
        borderRadius: 12,
        padding: "14px",
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.text, flex: 1, marginRight: 8 }}>{inc.titulo}</div>
        <div style={{
          padding: "2px 8px", borderRadius: 99, flexShrink: 0,
          background: prio.color + "22",
          color: prio.color, fontSize: 9, fontWeight: 700,
        }}>
          {prio.label}
        </div>
      </div>
      <div style={{ fontSize: 11, color: T.textSec, marginBottom: 8, lineHeight: 1.5 }}>
        {inc.descripcion.slice(0, 80)}…
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: T.textTer }}>Eco. {inc.eco}</span>
        <span style={{ fontSize: 10, color: T.textTer }}>·</span>
        <span style={{ fontSize: 10, color: T.textTer }}>{inc.fecha}</span>
        {inc.tecnico !== "Sin asignar" && (
          <>
            <span style={{ fontSize: 10, color: T.textTer }}>·</span>
            <span style={{ fontSize: 10, color: T.textSec }}>{inc.tecnico.replace("Ing. ", "")}</span>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {inc.tags.map(tag => (
          <span key={tag} style={{
            padding: "2px 8px", borderRadius: 99,
            background: T.border,
            color: T.textSec, fontSize: 9, fontWeight: 600,
          }}>
            {tag}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

export function FlotaIncidencias({ T, darkMode }) {
  const [vista, setVista] = useState("kanban");
  const [search, setSearch] = useState("");

  const filtered = INCIDENCIAS.filter(i =>
    !search ||
    i.titulo.toLowerCase().includes(search.toLowerCase()) ||
    i.eco.includes(search) ||
    i.prioridad.includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Incidencias</div>
          <div style={{ fontSize: 12, color: T.textSec }}>{filtered.length} registros activos</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ position: "relative" }}>
            <Search size={13} color={T.textTer} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar incidencia…"
              style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 10px 8px 30px", fontSize: 12, color: T.text, outline: "none", width: 200 }}
            />
          </div>
          {[["kanban", LayoutGrid], ["lista", List]].map(([v, Icon]) => (
            <button key={v} onClick={() => setVista(v)} style={{
              padding: "8px 10px", borderRadius: 10, cursor: "pointer",
              background: vista === v ? T.accentDim : T.surface,
              border: `1px solid ${vista === v ? T.accent + "55" : T.border}`,
              color: vista === v ? T.accent : T.textSec,
            }}>
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {vista === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {KANBAN_COLS.map(col => {
            const st = STATUS_INC[col];
            const StIcon = st.icon;
            const items = filtered.filter(i => i.status === col);
            return (
              <div key={col}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: st.color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{st.label}</span>
                  <span style={{
                    marginLeft: "auto",
                    fontSize: 10, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 99,
                    background: st.color + "22", color: st.color,
                  }}>{items.length}</span>
                </div>
                <AnimatePresence>
                  {items.map(inc => <IncCard key={inc.id} inc={inc} T={T} darkMode={darkMode} />)}
                </AnimatePresence>
                {items.length === 0 && (
                  <div style={{
                    border: `1px dashed ${T.border}`, borderRadius: 12,
                    padding: "24px 12px", textAlign: "center",
                    color: T.textTer, fontSize: 11,
                  }}>Sin registros</div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          {filtered.map((inc, i) => {
            const prio = PRIORIDAD[inc.prioridad] || PRIORIDAD.baja;
            const st = STATUS_INC[inc.status] || STATUS_INC.pendiente;
            return (
              <div key={inc.id} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                marginBottom: 8,
                backdropFilter: T.blur,
              }}>
                <div style={{ width: 4, alignSelf: "stretch", borderRadius: 99, background: prio.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{inc.titulo}</div>
                  <div style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>Eco. {inc.eco} · {inc.fecha} · {inc.tecnico}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 99, background: prio.color + "22", color: prio.color, fontSize: 10, fontWeight: 700 }}>{prio.label}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 99, background: st.color + "22", color: st.color, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
