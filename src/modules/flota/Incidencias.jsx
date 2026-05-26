import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, CheckCircle2, Wrench, Search, LayoutGrid, List, Plus, Trash2 } from "lucide-react";
import {
  FlotaModal, FlotaInput, FlotaSelect, FlotaTextarea, FlotaRow,
} from "./forms";

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

// Status transitions: current status -> list of possible next statuses
const STATUS_TRANSITIONS = {
  pendiente:   ["diagnostico", "reparacion", "cerrado"],
  diagnostico: ["reparacion", "cerrado"],
  reparacion:  ["cerrado", "pendiente"],
  cerrado:     ["pendiente"],
};

const STATUS_LABELS = {
  pendiente:   "→ Pendiente",
  diagnostico: "→ Diagnóstico",
  reparacion:  "→ Reparación",
  cerrado:     "→ Cerrar",
};

const EMPTY_FORM = {
  titulo: "", descripcion: "",
  prioridad: "media", unidadId: "",
  tecnico: "", tagsRaw: "",
};

function ReportarIncidenciaModal({ T, unidades, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const unidadOptions = [
    { value: "", label: "— Seleccionar unidad —" },
    ...unidades.map(u => ({ value: u.id, label: `${u.eco} — ${u.marca} ${u.modelo}` })),
  ];

  const handleSave = () => {
    if (!form.titulo.trim()) { alert("El título es requerido."); return; }
    if (!form.unidadId) { alert("Selecciona una unidad."); return; }
    onSave({ ...form });
    onClose();
  };

  return (
    <FlotaModal title="+ Reportar Incidencia" onClose={onClose} onSave={handleSave} T={T}>
      <FlotaInput label="Título *" T={T} value={form.titulo} onChange={set("titulo")} placeholder="Ej. Falla en frenos traseros" />
      <FlotaTextarea label="Descripción" T={T} value={form.descripcion} onChange={set("descripcion")} placeholder="Descripción detallada de la incidencia…" rows={3} />
      <FlotaRow>
        <FlotaSelect label="Prioridad" T={T} value={form.prioridad} onChange={set("prioridad")}
          options={[
            { value: "critica", label: "Crítica" },
            { value: "alta",    label: "Alta"    },
            { value: "media",   label: "Media"   },
            { value: "baja",    label: "Baja"    },
          ]}
        />
        <FlotaSelect label="Unidad *" T={T} value={form.unidadId} onChange={set("unidadId")} options={unidadOptions} />
      </FlotaRow>
      <FlotaInput label="Técnico asignado" T={T} value={form.tecnico} onChange={set("tecnico")} placeholder="Nombre del técnico" />
      <FlotaInput label="Tags (separados por coma)" T={T} value={form.tagsRaw} onChange={set("tagsRaw")} placeholder="Frenos, Seguridad, Motor…" />
    </FlotaModal>
  );
}

function StatusButtons({ inc, T, onUpdateStatus, onDelete }) {
  const transitions = STATUS_TRANSITIONS[inc.status] || [];
  return (
    <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
      {transitions.map(nextStatus => {
        const st = STATUS_INC[nextStatus];
        return (
          <button
            key={nextStatus}
            onClick={e => { e.stopPropagation(); onUpdateStatus(inc.id, nextStatus); }}
            style={{
              padding: "3px 8px", borderRadius: 6, cursor: "pointer",
              background: st.color + "20",
              border: `1px solid ${st.color}44`,
              color: st.color, fontSize: 9, fontWeight: 700, fontFamily: "inherit",
            }}
          >
            {STATUS_LABELS[nextStatus]}
          </button>
        );
      })}
      <button
        onClick={e => { e.stopPropagation(); if (window.confirm("¿Eliminar esta incidencia?")) onDelete(inc.id); }}
        style={{
          padding: "3px 6px", borderRadius: 6, cursor: "pointer",
          background: "rgba(255,85,85,0.12)",
          border: "1px solid rgba(255,85,85,0.25)",
          color: "#FF5555", display: "flex", alignItems: "center", fontFamily: "inherit",
        }}
      >
        <Trash2 size={9} />
      </button>
    </div>
  );
}

function IncCard({ inc, T, darkMode, onUpdateStatus, onDelete }) {
  const prio = PRIORIDAD[inc.prioridad] || PRIORIDAD.baja;
  const st = STATUS_INC[inc.status] || STATUS_INC.pendiente;
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
        {(inc.descripcion || "").slice(0, 80)}{inc.descripcion && inc.descripcion.length > 80 ? "…" : ""}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 10, color: T.textTer }}>Eco. {inc.eco}</span>
        <span style={{ fontSize: 10, color: T.textTer }}>·</span>
        <span style={{ fontSize: 10, color: T.textTer }}>{inc.fecha}</span>
        {inc.tecnico && inc.tecnico !== "Sin asignar" && (
          <>
            <span style={{ fontSize: 10, color: T.textTer }}>·</span>
            <span style={{ fontSize: 10, color: T.textSec }}>{inc.tecnico.replace("Ing. ", "")}</span>
          </>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
        {(inc.tags || []).map(tag => (
          <span key={tag} style={{
            padding: "2px 8px", borderRadius: 99,
            background: T.border,
            color: T.textSec, fontSize: 9, fontWeight: 600,
          }}>
            {tag}
          </span>
        ))}
      </div>
      <StatusButtons inc={inc} T={T} onUpdateStatus={onUpdateStatus} onDelete={onDelete} />
    </motion.div>
  );
}

export function FlotaIncidencias({ T, darkMode, incidencias, unidades, onAdd, onUpdateStatus, onDelete }) {
  const [vista, setVista] = useState("kanban");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = incidencias.filter(i =>
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
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={13} color={T.textTer} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar incidencia…"
              style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "8px 10px 8px 30px", fontSize: 12, color: T.text,
                outline: "none", width: 200, fontFamily: "inherit",
              }}
            />
          </div>
          {[["kanban", LayoutGrid], ["lista", List]].map(([v, Icon]) => (
            <button key={v} onClick={() => setVista(v)} style={{
              padding: "8px 10px", borderRadius: 10, cursor: "pointer",
              background: vista === v ? T.accentDim : T.surface,
              border: `1px solid ${vista === v ? T.accent + "55" : T.border}`,
              color: vista === v ? T.accent : T.textSec, fontFamily: "inherit",
            }}>
              <Icon size={14} />
            </button>
          ))}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setShowForm(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 10, cursor: "pointer",
              background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`,
              border: "none", color: "#0A1A12",
              fontSize: 12, fontWeight: 700, fontFamily: "inherit",
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            Reportar Incidencia
          </motion.button>
        </div>
      </div>

      {vista === "kanban" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {KANBAN_COLS.map(col => {
            const st = STATUS_INC[col];
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
                  {items.map(inc => (
                    <IncCard
                      key={inc.id}
                      inc={inc}
                      T={T}
                      darkMode={darkMode}
                      onUpdateStatus={onUpdateStatus}
                      onDelete={onDelete}
                    />
                  ))}
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
          {filtered.map((inc) => {
            const prio = PRIORIDAD[inc.prioridad] || PRIORIDAD.baja;
            const st = STATUS_INC[inc.status] || STATUS_INC.pendiente;
            const transitions = STATUS_TRANSITIONS[inc.status] || [];
            return (
              <div key={inc.id} style={{
                padding: "14px 16px",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                marginBottom: 8,
                backdropFilter: T.blur,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 4, alignSelf: "stretch", borderRadius: 99, background: prio.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{inc.titulo}</div>
                    <div style={{ fontSize: 11, color: T.textSec, marginTop: 2 }}>Eco. {inc.eco} · {inc.fecha} · {inc.tecnico || "Sin asignar"}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 99, background: prio.color + "22", color: prio.color, fontSize: 10, fontWeight: 700 }}>{prio.label}</span>
                    <span style={{ padding: "3px 10px", borderRadius: 99, background: st.color + "22", color: st.color, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                    {transitions.map(nextStatus => {
                      const nst = STATUS_INC[nextStatus];
                      return (
                        <button
                          key={nextStatus}
                          onClick={() => onUpdateStatus(inc.id, nextStatus)}
                          style={{
                            padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                            background: nst.color + "20",
                            border: `1px solid ${nst.color}44`,
                            color: nst.color, fontSize: 9, fontWeight: 700, fontFamily: "inherit",
                          }}
                        >
                          {STATUS_LABELS[nextStatus]}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => { if (window.confirm("¿Eliminar esta incidencia?")) onDelete(inc.id); }}
                      style={{
                        padding: "3px 6px", borderRadius: 6, cursor: "pointer",
                        background: "rgba(255,85,85,0.12)",
                        border: "1px solid rgba(255,85,85,0.25)",
                        color: "#FF5555", display: "flex", alignItems: "center", fontFamily: "inherit",
                      }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: "center", color: T.textTer, fontSize: 13, padding: "48px 0" }}>
              No se encontraron incidencias
            </div>
          )}
        </div>
      )}

      {/* Reportar Incidencia Modal */}
      <AnimatePresence>
        {showForm && (
          <ReportarIncidenciaModal
            T={T}
            unidades={unidades}
            onClose={() => setShowForm(false)}
            onSave={onAdd}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
