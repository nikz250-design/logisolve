import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, AlertTriangle, CheckCircle2, Clock, Search } from "lucide-react";
import { DOCUMENTOS } from "./mockData";

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

export function FlotaDocumentacion({ T, darkMode }) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");

  const grouped = {};
  DOCUMENTOS
    .filter(d => {
      const matchSearch = !search ||
        d.titulo.toLowerCase().includes(search.toLowerCase()) ||
        d.eco.includes(search) ||
        d.tipo.toLowerCase().includes(search.toLowerCase());
      const matchFiltro = filtro === "todos" || d.status === filtro || d.tipo === filtro;
      return matchSearch && matchFiltro;
    })
    .forEach(d => {
      if (!grouped[d.tipo]) grouped[d.tipo] = [];
      grouped[d.tipo].push(d);
    });

  const urgentCount = DOCUMENTOS.filter(d => d.status === "urgente" || d.status === "vencido").length;
  const proximoCount = DOCUMENTOS.filter(d => d.status === "proximo").length;
  const vigenteCount = DOCUMENTOS.filter(d => d.status === "vigente").length;

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Documentación</div>
        <div style={{ fontSize: 12, color: T.textSec }}>Control de vigencias y renovaciones</div>
      </div>

      {/* KPIs */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {[
          { label: "Total documentos", val: DOCUMENTOS.length, color: T.text },
          { label: "Vigentes",         val: vigenteCount,      color: T.accent },
          { label: "Próximos a vencer",val: proximoCount,      color: T.amber  },
          { label: "Vencidos / urgentes", val: urgentCount,    color: T.red    },
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
            style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 10px 8px 30px", fontSize: 12, color: T.text, outline: "none", width: 200 }}
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
            transition: "all 0.15s",
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
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ flex: 1, marginRight: 8 }}>
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
                      {" · "}
                      {doc.poliza || doc.folio}
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
    </div>
  );
}
