import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronRight, MapPin, Gauge, User, Calendar } from "lucide-react";
import { UNIDADES } from "./mockData";

const STATUS_CONFIG = {
  activo:  { label: "Activo",   color: "#3DFFC0" },
  taller:  { label: "Taller",   color: "#FFB830" },
  critico: { label: "Crítico",  color: "#FF5555" },
};

function KmBar({ km, kmUltimoSvc, kmProxSvc, T }) {
  const total = kmProxSvc - kmUltimoSvc;
  const progreso = km - kmUltimoSvc;
  const pct = Math.min(100, Math.max(0, (progreso / total) * 100));
  const color = pct > 90 ? "#FF5555" : pct > 70 ? "#FFB830" : T.accent;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: T.textSec }}>Próx. servicio</span>
        <span style={{ fontSize: 10, color: T.textSec }}>{kmProxSvc.toLocaleString("es-MX")} km</span>
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

export function FlotaUnidades({ T, darkMode }) {
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [selected, setSelected] = useState(null);

  const filtradas = UNIDADES.filter(u => {
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
          <div style={{ fontSize: 12, color: T.textSec }}>{filtradas.length} de {UNIDADES.length} unidades</div>
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
                outline: "none", width: 180,
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
                transition: "all 0.15s",
              }}
            >
              {f === "todos" ? "Todos" : STATUS_CONFIG[f]?.label ?? f}
            </button>
          ))}
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
              onClick={() => setSelected(u)}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 16,
                padding: "16px",
                backdropFilter: T.blur,
                WebkitBackdropFilter: T.blur,
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
              whileHover={{ scale: 1.01, borderColor: T.accent + "66" }}
            >
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
                  padding: "3px 10px", borderRadius: 99,
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
                  <span style={{ fontSize: 11, color: T.textSec }}>{u.km.toLocaleString("es-MX")} km</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={12} color={T.textTer} />
                  <span style={{ fontSize: 11, color: T.textSec }}>{u.operador}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={12} color={T.textTer} />
                  <span style={{ fontSize: 11, color: T.textSec }}>{u.ubicacion}</span>
                </div>
              </div>

              <KmBar km={u.km} kmUltimoSvc={u.kmUltimoSvc} kmProxSvc={u.kmProxSvc} T={T} />

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
                ["VIN", selected.vin],
                ["Kilómetros", `${selected.km.toLocaleString("es-MX")} km`],
                ["Rendimiento", `${selected.rendimiento} km/L`],
                ["Operador", selected.operador],
                ["Ubicación", selected.ubicacion],
                ["Último servicio", selected.ultimoSvc],
                ["Próximo servicio", selected.proxSvc],
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
    </div>
  );
}
