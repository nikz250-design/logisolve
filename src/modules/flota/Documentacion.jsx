import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, AlertTriangle, CheckCircle2, Clock, Search, Plus, Trash2 } from "lucide-react";
import {
  FlotaModal, FlotaInput, FlotaSelect, FlotaRow,
  fromInputDate,
} from "./forms";

const DOC_STATUS = {
  vigente: { label: "Vigente",  color: "#3DFFC0", icon: CheckCircle2 },
  proximo: { label: "Próximo",  color: "#FFB830", icon: Clock        },
  urgente: { label: "Urgente",  color: "#FF6B00", icon: AlertTriangle },
  vencido: { label: "Vencido",  color: "#FF5555", icon: AlertTriangle },
};

const TIPO_ICONS = {
  "Seguro":             "🛡️",
  "Tarjeta Circulación":"📋",
  "Verificación":       "🔍",
  "Permiso SCT":        "📄",
};

const TIPO_OPTS = ["Seguro", "Tarjeta Circulación", "Verificación", "Permiso SCT"];

const EMPTY_FORM = {
  tipo: "Seguro", titulo: "", unidadId: "",
  vencimiento: "", aseguradora: "",
  expedidoPor: "", poliza: "",
};

function AgregarDocumentoModal({ T, unidades, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const unidadOptions = [
    { value: "", label: "— Seleccionar unidad —" },
    ...unidades.map(u => ({ value: u.id, label: `${u.eco} — ${u.marca} ${u.modelo}` })),
  ];

  const tipoOptions = TIPO_OPTS.map(t => ({ value: t, label: t }));

  const handleSave = () => {
    if (!form.titulo.trim()) { alert("El título es requerido."); return; }
    if (!form.unidadId) { alert("Selecciona una unidad."); return; }
    if (!form.vencimiento) { alert("La fecha de vencimiento es requerida."); return; }
    onSave({
      ...form,
      vencimiento: fromInputDate(form.vencimiento),
    });
    onClose();
  };

  const isSeguro = form.tipo === "Seguro";

  return (
    <FlotaModal title="+ Agregar Documento" onClose={onClose} onSave={handleSave} T={T}>
      <FlotaRow>
        <FlotaSelect label="Tipo de documento" T={T} value={form.tipo} onChange={set("tipo")} options={tipoOptions} />
        <FlotaSelect label="Unidad *" T={T} value={form.unidadId} onChange={set("unidadId")} options={unidadOptions} />
      </FlotaRow>
      <FlotaInput label="Título *" T={T} value={form.titulo} onChange={set("titulo")} placeholder="Ej. Póliza de Seguro Todo Riesgo" />
      <FlotaInput label="Fecha de vencimiento *" T={T} type="date" value={form.vencimiento} onChange={set("vencimiento")} />
      {isSeguro && (
        <FlotaInput label="Aseguradora" T={T} value={form.aseguradora} onChange={set("aseguradora")} placeholder="Ej. GNP Seguros" />
      )}
      <FlotaInput label="Expedido por" T={T} value={form.expedidoPor} onChange={set("expedidoPor")} placeholder="Ej. SAT CDMX" />
      <FlotaInput label="Póliza / Folio" T={T} value={form.poliza} onChange={set("poliza")} placeholder="Ej. GNP-2024-78341" />
    </FlotaModal>
  );
}

export function FlotaDocumentacion({ T, darkMode, documentos, unidades, onAdd, onDelete }) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [showForm, setShowForm] = useState(false);

  const filtered = documentos.filter(d => {
    const matchSearch = !search ||
      d.titulo.toLowerCase().includes(search.toLowerCase()) ||
      d.eco.includes(search) ||
      d.tipo.toLowerCase().includes(search.toLowerCase());
    const matchFiltro = filtro === "todos" || d.status === filtro || d.tipo === filtro;
    return matchSearch && matchFiltro;
  });

  const grouped = {};
  filtered.forEach(d => {
    if (!grouped[d.tipo]) grouped[d.tipo] = [];
    grouped[d.tipo].push(d);
  });

  const urgentCount = documentos.filter(d => d.status === "urgente" || d.status === "vencido").length;
  const proximoCount = documentos.filter(d => d.status === "proximo").length;
  const vigenteCount = documentos.filter(d => d.status === "vigente").length;

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Documentación</div>
          <div style={{ fontSize: 12, color: T.textSec }}>Control de vigencias y renovaciones</div>
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
          Agregar Documento
        </motion.button>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {[
          { label: "Total documentos",     val: documentos.length, color: T.text   },
          { label: "Vigentes",             val: vigenteCount,      color: T.accent },
          { label: "Próximos a vencer",    val: proximoCount,      color: T.amber  },
          { label: "Vencidos / urgentes",  val: urgentCount,       color: T.red    },
        ].map(k => (
          <div key={k.label} style={{
            flex: "1 1 160px",
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: "16px 18px", backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
          }}>
            <div style={{ fontSize: 10, color: T.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ position: "relative" }}>
          <Search size={13} color={T.textTer} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar documento…"
            style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
              padding: "8px 10px 8px 30px", fontSize: 12, color: T.text,
              outline: "none", width: 200, fontFamily: "inherit",
            }}
          />
        </div>
        {[
          ["todos", "Todos"],
          ["vencido", "Vencidos"],
          ["urgente", "Urgentes"],
          ["proximo", "Próximos"],
          ["vigente", "Vigentes"],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setFiltro(k)} style={{
            padding: "7px 14px", borderRadius: 9, fontSize: 11, fontWeight: 600, cursor: "pointer",
            background: filtro === k ? T.accentDim : T.surface,
            border: `1px solid ${filtro === k ? T.accent + "55" : T.border}`,
            color: filtro === k ? T.accent : T.textSec,
            transition: "all 0.15s", fontFamily: "inherit",
          }}>{l}</button>
        ))}
      </div>

      {/* Grouped by tipo */}
      {Object.entries(grouped).map(([tipo, docs]) => (
        <div key={tipo} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>{TIPO_ICONS[tipo] || "📄"}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{tipo}</span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
              background: T.border, color: T.textSec, marginLeft: 4,
            }}>{docs.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {docs.sort((a, b) => a.diasVence - b.diasVence).map(doc => {
              const st = DOC_STATUS[doc.status] || DOC_STATUS.vigente;
              const StIcon = st.icon;
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: T.surface,
                    border: `1px solid ${doc.status === "vencido" || doc.status === "urgente" ? st.color + "44" : T.border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    backdropFilter: T.blur,
                    WebkitBackdropFilter: T.blur,
                    position: "relative",
                  }}
                >
                  {/* Delete button */}
                  <button
                    onClick={() => { if (window.confirm(`¿Eliminar "${doc.titulo}"?`)) onDelete(doc.id); }}
                    style={{
                      position: "absolute", top: 10, right: 10,
                      background: T.redDim, border: `1px solid ${T.red}33`,
                      borderRadius: 6, padding: "3px 5px", cursor: "pointer",
                      color: T.red, display: "flex", alignItems: "center",
                    }}
                    title="Eliminar documento"
                  >
                    <Trash2 size={11} />
                  </button>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1, marginRight: 36 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{doc.titulo}</div>
                      <div style={{ fontSize: 10, color: T.textSec, marginTop: 2 }}>Eco. {doc.eco}</div>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "3px 10px", borderRadius: 99,
                      background: st.color + "22",
                      color: st.color, fontSize: 9, fontWeight: 700, flexShrink: 0,
                    }}>
                      <StIcon size={9} />
                      {st.label}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                    <div>
                      <div style={{ fontSize: 10, color: T.textTer }}>Vencimiento</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{doc.vencimiento}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: T.textTer }}>Días restantes</div>
                      <div style={{
                        fontSize: 16, fontWeight: 800,
                        color: doc.diasVence < 0 ? T.red : doc.diasVence < 15 ? T.amber : T.accent,
                      }}>
                        {doc.diasVence < 0 ? `${Math.abs(doc.diasVence)}d` : `${doc.diasVence}d`}
                      </div>
                    </div>
                  </div>

                  {(doc.aseguradora || doc.expedidoPor) && (
                    <div style={{ fontSize: 10, color: T.textTer, marginTop: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>
                      {doc.aseguradora ? `Aseguradora: ${doc.aseguradora}` : `Expedido por: ${doc.expedidoPor}`}
                      {(doc.poliza || doc.folio) && ` · ${doc.poliza || doc.folio}`}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}

      {Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: "center", color: T.textTer, fontSize: 13, padding: "48px 0" }}>
          No se encontraron documentos
        </div>
      )}

      {/* Agregar Documento Modal */}
      <AnimatePresence>
        {showForm && (
          <AgregarDocumentoModal
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
