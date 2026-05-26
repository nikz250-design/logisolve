import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight, MapPin, Gauge, User, Trash2, Plus } from "lucide-react";
import {
  FlotaModal, FlotaInput, FlotaSelect, FlotaRow,
  toInputDate, fromInputDate,
} from "./forms";

const STATUS_CONFIG = {
  activo:  { label: "Activo",   color: "#3DFFC0" },
  taller:  { label: "Taller",   color: "#FFB830" },
  critico: { label: "Crítico",  color: "#FF5555" },
};

const MARCAS = ["RAM", "Kenworth", "International", "Freightliner", "Volvo", "Mercedes-Benz", "Scania", "Peterbilt", "Mack", "Otro"];

function KmBar({ km, kmUltimoSvc, kmProxSvc, T }) {
  const total = kmProxSvc - kmUltimoSvc;
  const progreso = km - kmUltimoSvc;
  const pct = Math.min(100, Math.max(0, (progreso / (total || 1)) * 100));
  const color = pct > 90 ? "#FF5555" : pct > 70 ? "#FFB830" : T.accent;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: T.textSec }}>Próx. servicio</span>
        <span style={{ fontSize: 10, color: T.textSec }}>{(kmProxSvc || 0).toLocaleString("es-MX")} km</span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: T.border, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", borderRadius: 99, background: color }}
        />
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  eco: "", marca: "RAM", modelo: "", año: new Date().getFullYear().toString(),
  motor: "", color: "", placas: "", vin: "", operador: "", ubicacion: "",
  km: "", kmUltimoSvc: "", kmProxSvc: "",
  ultimoSvc: "", proxSvc: "",
  rendimiento: "", status: "activo",
};

function NuevaUnidadModal({ T, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    if (!form.eco.trim()) { alert("El campo Eco es requerido."); return; }
    if (!form.placas.trim()) { alert("El campo Placas es requerido."); return; }
    if (!form.marca.trim()) { alert("El campo Marca es requerido."); return; }
    onSave({
      ...form,
      año: Number(form.año) || new Date().getFullYear(),
      km: Number(form.km) || 0,
      kmUltimoSvc: Number(form.kmUltimoSvc) || 0,
      kmProxSvc: Number(form.kmProxSvc) || 0,
      rendimiento: Number(form.rendimiento) || 0,
      ultimoSvc: form.ultimoSvc ? fromInputDate(form.ultimoSvc) : "",
      proxSvc: form.proxSvc ? fromInputDate(form.proxSvc) : "",
    });
    onClose();
  };

  return (
    <FlotaModal title="+ Nueva Unidad" onClose={onClose} onSave={handleSave} T={T}>
      <FlotaRow>
        <FlotaInput label="Eco *" T={T} value={form.eco} onChange={set("eco")} placeholder="Ej. 1407" />
        <FlotaSelect label="Status" T={T} value={form.status} onChange={set("status")}
          options={[
            { value: "activo",  label: "Activo"  },
            { value: "taller",  label: "Taller"  },
            { value: "critico", label: "Crítico" },
          ]}
        />
      </FlotaRow>
      <FlotaRow>
        <FlotaSelect label="Marca *" T={T} value={form.marca} onChange={set("marca")}
          options={MARCAS.map(m => ({ value: m, label: m }))}
        />
        <FlotaInput label="Modelo *" T={T} value={form.modelo} onChange={set("modelo")} placeholder="Ej. T680" />
      </FlotaRow>
      <FlotaRow>
        <FlotaInput label="Año" T={T} type="number" value={form.año} onChange={set("año")} placeholder="2024" />
        <FlotaInput label="Color" T={T} value={form.color} onChange={set("color")} placeholder="Ej. Blanco" />
      </FlotaRow>
      <FlotaInput label="Motor" T={T} value={form.motor} onChange={set("motor")} placeholder="Ej. PACCAR MX-13 425HP" />
      <FlotaRow>
        <FlotaInput label="Placas *" T={T} value={form.placas} onChange={set("placas")} placeholder="TXK-82-10" />
        <FlotaInput label="VIN" T={T} value={form.vin} onChange={set("vin")} placeholder="17 caracteres" />
      </FlotaRow>
      <FlotaRow>
        <FlotaInput label="Operador" T={T} value={form.operador} onChange={set("operador")} placeholder="Nombre completo" />
        <FlotaInput label="Ubicación" T={T} value={form.ubicacion} onChange={set("ubicacion")} placeholder="CEDIS SMO" />
      </FlotaRow>
      <FlotaRow>
        <FlotaInput label="Km actuales" T={T} type="number" value={form.km} onChange={set("km")} placeholder="0" />
        <FlotaInput label="Rendimiento (km/L)" T={T} type="number" value={form.rendimiento} onChange={set("rendimiento")} placeholder="8.5" />
      </FlotaRow>
      <FlotaRow>
        <FlotaInput label="Km último servicio" T={T} type="number" value={form.kmUltimoSvc} onChange={set("kmUltimoSvc")} placeholder="0" />
        <FlotaInput label="Km próximo servicio" T={T} type="number" value={form.kmProxSvc} onChange={set("kmProxSvc")} placeholder="0" />
      </FlotaRow>
      <FlotaRow>
        <FlotaInput label="Último servicio" T={T} type="date" value={form.ultimoSvc} onChange={set("ultimoSvc")} />
        <FlotaInput label="Próximo servicio" T={T} type="date" value={form.proxSvc} onChange={set("proxSvc")} />
      </FlotaRow>
    </FlotaModal>
  );
}

export function FlotaUnidades({ T, darkMode, unidades, onAdd, onUpdate, onDelete }) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const filtradas = unidades.filter(u => {
    const matchSearch = !search ||
      u.eco.includes(search) ||
      u.placas.toLowerCase().includes(search.toLowerCase()) ||
      u.marca.toLowerCase().includes(search.toLowerCase()) ||
      u.operador.toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === "todos" || u.status === filtro;
    return matchSearch && matchFiltro;
  });

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Unidades</div>
          <div style={{ fontSize: 12, color: T.textSec }}>{filtradas.length} de {unidades.length} unidades</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={13} color={T.textTer} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Eco, placas, marca…"
              style={{
                background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
                padding: "8px 10px 8px 30px", fontSize: 12, color: T.text,
                outline: "none", width: 180, fontFamily: "inherit",
              }}
            />
          </div>

          {/* Filtros */}
          {["todos", "activo", "taller", "critico"].map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              style={{
                padding: "7px 14px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: filtro === f ? T.accentDim : T.surface,
                border: `1px solid ${filtro === f ? T.accent + "55" : T.border}`,
                color: filtro === f ? T.accent : T.textSec,
                transition: "all 0.15s", fontFamily: "inherit",
              }}
            >
              {f === "todos" ? "Todos" : STATUS_CONFIG[f]?.label ?? f}
            </button>
          ))}

          {/* Nueva Unidad */}
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
            Nueva Unidad
          </motion.button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {filtradas.map(u => {
          const sc = STATUS_CONFIG[u.status] || STATUS_CONFIG.activo;
          return (
            <motion.div
              key={u.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: "16px",
                backdropFilter: T.blur,
                WebkitBackdropFilter: T.blur,
                cursor: "pointer",
                transition: "border-color 0.2s",
                position: "relative",
              }}
              whileHover={{ scale: 1.01, borderColor: T.accent + "66" }}
              onClick={() => setSelected(u)}
            >
              {/* Delete button */}
              <button
                onClick={e => { e.stopPropagation(); if (window.confirm(`¿Eliminar Eco. ${u.eco}?`)) onDelete(u.id); }}
                style={{
                  position: "absolute", top: 10, right: 10,
                  background: T.redDim, border: `1px solid ${T.red}33`,
                  borderRadius: 8, padding: "4px 6px", cursor: "pointer",
                  color: T.red, display: "flex", alignItems: "center",
                  zIndex: 2,
                }}
                title="Eliminar unidad"
              >
                <Trash2 size={12} />
              </button>

              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 28 }}>{u.img}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>Eco. {u.eco}</div>
                    <div style={{ fontSize: 10, color: T.textSec }}>{u.placas}</div>
                  </div>
                </div>
                <div style={{
                  padding: "3px 10px", borderRadius: 99, marginRight: 28,
                  background: sc.color + "20",
                  border: `1px solid ${sc.color}44`,
                  color: sc.color, fontSize: 10, fontWeight: 700,
                }}>
                  {sc.label}
                </div>
              </div>

              {/* Info */}
              <div style={{ fontSize: 12, color: T.textSec, marginBottom: 4 }}>
                {u.marca} {u.modelo} · {u.año}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Gauge size={12} color={T.textTer} />
                  <span style={{ fontSize: 11, color: T.textSec }}>{(u.km || 0).toLocaleString("es-MX")} km</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={12} color={T.textTer} />
                  <span style={{ fontSize: 11, color: T.textSec }}>{u.operador || "Sin asignar"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={12} color={T.textTer} />
                  <span style={{ fontSize: 11, color: T.textSec }}>{u.ubicacion || "—"}</span>
                </div>
              </div>

              <KmBar km={u.km || 0} kmUltimoSvc={u.kmUltimoSvc || 0} kmProxSvc={u.kmProxSvc || 1} T={T} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: 10 }}>
                <span style={{ fontSize: 10, color: T.textTer }}>Ver detalle</span>
                <ChevronRight size={12} color={T.textTer} />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 300 }}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              style={{
                position: "fixed", right: 0, top: 0, bottom: 0, width: 340,
                background: T.surfaceHi,
                backdropFilter: T.blur,
                WebkitBackdropFilter: T.blur,
                borderLeft: `1px solid ${T.border}`,
                zIndex: 400,
                overflowY: "auto",
                padding: 24,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>Eco. {selected.eco}</div>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSec }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>{selected.img}</div>

              {[
                ["Marca / Modelo", `${selected.marca} ${selected.modelo}`],
                ["Año", selected.año],
                ["Motor", selected.motor],
                ["Color", selected.color],
                ["Placas", selected.placas],
                ["VIN", selected.vin || "—"],
                ["Kilómetros", `${(selected.km || 0).toLocaleString("es-MX")} km`],
                ["Rendimiento", `${selected.rendimiento} km/L`],
                ["Operador", selected.operador || "Sin asignar"],
                ["Ubicación", selected.ubicacion || "—"],
                ["Último servicio", selected.ultimoSvc || "—"],
                ["Próximo servicio", selected.proxSvc || "—"],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ fontSize: 11, color: T.textSec }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.text, maxWidth: 180, textAlign: "right" }}>{val}</span>
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Nueva Unidad Modal */}
      <AnimatePresence>
        {showForm && (
          <NuevaUnidadModal T={T} onClose={() => setShowForm(false)} onSave={onAdd} />
        )}
      </AnimatePresence>
    </div>
  );
}
