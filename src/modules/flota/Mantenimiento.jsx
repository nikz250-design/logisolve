import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wrench, Clock, CheckCircle2, AlertTriangle, Calendar, Plus, Trash2 } from "lucide-react";
import {
  FlotaModal, FlotaInput, FlotaSelect, FlotaTextarea, FlotaRow,
  fromInputDate,
} from "./forms";

const STATUS_MNT = {
  programado:  { label: "Programado",  color: "#4DA3FF" },
  en_progreso: { label: "En progreso", color: "#9B8DD0" },
  vencido:     { label: "Vencido",     color: "#FF5555" },
  completado:  { label: "Completado",  color: "#3DFFC0" },
};

const TIPO = {
  preventivo: { label: "Preventivo", color: "#3DFFC0" },
  correctivo: { label: "Correctivo", color: "#FFB830" },
};

function urgencySort(a, b) {
  const order = { vencido: 0, en_progreso: 1, programado: 2, completado: 3 };
  const oa = order[a.status] ?? 4;
  const ob = order[b.status] ?? 4;
  if (oa !== ob) return oa - ob;
  return a.diasRestantes - b.diasRestantes;
}

const EMPTY_FORM = {
  tipo: "preventivo", titulo: "", unidadId: "",
  kmProg: "", fecha: "",
  costo: "", tecnico: "", piezasRaw: "",
};

function ProgramarMantenimientoModal({ T, unidades, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const unidadOptions = [
    { value: "", label: "— Seleccionar unidad —" },
    ...unidades.map(u => ({ value: u.id, label: `${u.eco} — ${u.marca} ${u.modelo}` })),
  ];

  const handleSave = () => {
    if (!form.titulo.trim()) { alert("El título es requerido."); return; }
    if (!form.unidadId) { alert("Selecciona una unidad."); return; }
    if (!form.fecha) { alert("La fecha es requerida."); return; }
    onSave({
      ...form,
      kmProg: Number(form.kmProg) || 0,
      costo: Number(form.costo) || 0,
      fecha: fromInputDate(form.fecha),
    });
    onClose();
  };

  return (
    <FlotaModal title="+ Programar Mantenimiento" onClose={onClose} onSave={handleSave} T={T}>
      <FlotaRow>
        <FlotaSelect label="Tipo" T={T} value={form.tipo} onChange={set("tipo")}
          options={[
            { value: "preventivo", label: "Preventivo" },
            { value: "correctivo", label: "Correctivo" },
          ]}
        />
        <FlotaSelect label="Unidad *" T={T} value={form.unidadId} onChange={set("unidadId")} options={unidadOptions} />
      </FlotaRow>
      <FlotaInput label="Título *" T={T} value={form.titulo} onChange={set("titulo")} placeholder="Ej. Cambio de aceite y filtros" />
      <FlotaRow>
        <FlotaInput label="Km programado" T={T} type="number" value={form.kmProg} onChange={set("kmProg")} placeholder="0" />
        <FlotaInput label="Fecha *" T={T} type="date" value={form.fecha} onChange={set("fecha")} />
      </FlotaRow>
      <FlotaRow>
        <FlotaInput label="Costo estimado (MXN)" T={T} type="number" value={form.costo} onChange={set("costo")} placeholder="0" />
        <FlotaInput label="Técnico / Taller" T={T} value={form.tecnico} onChange={set("tecnico")} placeholder="Nombre del técnico" />
      </FlotaRow>
      <FlotaTextarea
        label="Piezas / Refacciones (una por línea)"
        T={T} value={form.piezasRaw} onChange={set("piezasRaw")}
        placeholder={"Aceite 10W-40 20L\nFiltro de aceite\nFiltro de combustible"}
        rows={4}
      />
    </FlotaModal>
  );
}

export function FlotaMantenimiento({ T, darkMode, mantenimientos, unidades, onAdd, onDelete }) {
  const [filtro, setFiltro] = useState("todos");
  const [showForm, setShowForm] = useState(false);

  const lista = [...mantenimientos]
    .filter(m => filtro === "todos" || m.status === filtro || m.tipo === filtro)
    .sort(urgencySort);

  const kpis = {
    total: mantenimientos.length,
    vencidos: mantenimientos.filter(m => m.status === "vencido").length,
    en_progreso: mantenimientos.filter(m => m.status === "en_progreso").length,
    programados: mantenimientos.filter(m => m.status === "programado").length,
    costoEstimado: mantenimientos.reduce((a, m) => a + (m.costo || 0), 0),
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Mantenimiento</div>
          <div style={{ fontSize: 12, color: T.textSec }}>Control de servicios preventivos y correctivos</div>
        </div>
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
          Programar Mantenimiento
        </motion.button>
      </div>

      {/* KPI summary */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {[
          { label: "Total registros", val: kpis.total,       color: T.blue,   icon: Wrench        },
          { label: "Vencidos",        val: kpis.vencidos,    color: T.red,    icon: AlertTriangle  },
          { label: "En progreso",     val: kpis.en_progreso, color: T.purple, icon: Clock         },
          { label: "Programados",     val: kpis.programados, color: T.accent, icon: Calendar      },
        ].map(k => (
          <div key={k.label} style={{
            flex: "1 1 160px",
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: "16px 18px", backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <k.icon size={15} color={k.color} />
              <span style={{ fontSize: 10, color: T.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.label}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
        <div style={{
          flex: "1 1 160px",
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
          padding: "16px 18px", backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
        }}>
          <div style={{ fontSize: 10, color: T.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Costo estimado</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.amber }}>
            ${kpis.costoEstimado.toLocaleString("es-MX")}
          </div>
          <div style={{ fontSize: 10, color: T.textTer }}>MXN total</div>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        {[
          ["todos", "Todos"],
          ["vencido", "Vencidos"],
          ["en_progreso", "En progreso"],
          ["programado", "Programados"],
          ["preventivo", "Preventivo"],
          ["correctivo", "Correctivo"],
        ].map(([key, lbl]) => (
          <button key={key} onClick={() => setFiltro(key)} style={{
            padding: "6px 14px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: filtro === key ? T.accentDim : T.surface,
            border: `1px solid ${filtro === key ? T.accent + "55" : T.border}`,
            color: filtro === key ? T.accent : T.textSec,
            transition: "all 0.15s", fontFamily: "inherit",
          }}>{lbl}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lista.map(m => {
          const st = STATUS_MNT[m.status] || STATUS_MNT.programado;
          const tp = TIPO[m.tipo] || TIPO.preventivo;
          const urgente = m.status === "vencido" || (m.diasRestantes >= 0 && m.diasRestantes < 7);
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: T.surface,
                border: `1px solid ${urgente ? T.red + "55" : T.border}`,
                borderLeft: `3px solid ${st.color}`,
                borderRadius: 14,
                padding: "16px",
                backdropFilter: T.blur,
                WebkitBackdropFilter: T.blur,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{m.titulo}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 99, background: tp.color + "22", color: tp.color, fontSize: 9, fontWeight: 700 }}>{tp.label}</span>
                  </div>
                  <div style={{ fontSize: 11, color: T.textSec }}>Eco. {m.eco} · {m.tecnico || "Sin asignar"}</div>
                  <div style={{ fontSize: 10, color: T.textTer, marginTop: 4 }}>
                    Km programado: {(m.kmProg || 0).toLocaleString("es-MX")} km · Km actual: {(m.km || 0).toLocaleString("es-MX")} km
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {(m.piezas || []).slice(0, 3).map((p, i) => (
                      <span key={i} style={{ padding: "2px 8px", borderRadius: 99, background: T.border, color: T.textSec, fontSize: 9 }}>{p}</span>
                    ))}
                    {(m.piezas || []).length > 3 && (
                      <span style={{ padding: "2px 8px", borderRadius: 99, background: T.border, color: T.textTer, fontSize: 9 }}>+{m.piezas.length - 3} más</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                  <span style={{ padding: "3px 12px", borderRadius: 99, background: st.color + "22", color: st.color, fontSize: 10, fontWeight: 700 }}>{st.label}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: T.textSec }}>Fecha</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{m.fecha}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: T.textSec }}>Días</div>
                    <div style={{
                      fontSize: 16, fontWeight: 800,
                      color: m.diasRestantes < 0 ? T.red : m.diasRestantes < 14 ? T.amber : T.accent,
                    }}>
                      {m.diasRestantes < 0 ? `${Math.abs(m.diasRestantes)}d atrás` : `${m.diasRestantes}d`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: T.textSec }}>Costo est.</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>${(m.costo || 0).toLocaleString("es-MX")}</div>
                  </div>
                  <button
                    onClick={() => { if (window.confirm(`¿Eliminar "${m.titulo}"?`)) onDelete(m.id); }}
                    style={{
                      padding: "4px 8px", borderRadius: 8, cursor: "pointer",
                      background: T.redDim,
                      border: `1px solid ${T.red}33`,
                      color: T.red, display: "flex", alignItems: "center", gap: 4,
                      fontSize: 10, fontFamily: "inherit",
                    }}
                  >
                    <Trash2 size={11} /> Eliminar
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        {lista.length === 0 && (
          <div style={{ textAlign: "center", color: T.textTer, fontSize: 13, padding: "48px 0" }}>
            No hay registros de mantenimiento
          </div>
        )}
      </div>

      {/* Programar Mantenimiento Modal */}
      <AnimatePresence>
        {showForm && (
          <ProgramarMantenimientoModal
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
