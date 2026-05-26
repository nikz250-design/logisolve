import React from "react";
import { motion } from "framer-motion";

export function FlotaModal({ title, onClose, onSave, saveLabel = "Guardar", T, children }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 800 }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: "min(92vw, 480px)",
          maxHeight: "88vh", overflowY: "auto",
          background: T.surfaceHi,
          backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
          border: `1px solid ${T.border}`,
          borderRadius: 20, padding: "24px 20px",
          zIndex: 801, boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSec, fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>
        {children}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: 10, cursor: "pointer",
            background: "transparent", border: `1px solid ${T.border}`,
            color: T.textSec, fontSize: 12, fontFamily: "inherit",
          }}>Cancelar</button>
          <button onClick={onSave} style={{
            padding: "9px 24px", borderRadius: 10, cursor: "pointer",
            background: `linear-gradient(135deg, ${T.accent}, ${T.blue})`,
            border: "none", color: "#0A1A12", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
          }}>{saveLabel}</button>
        </div>
      </motion.div>
    </>
  );
}

const inputStyle = (T) => ({
  width: "100%", boxSizing: "border-box",
  background: T.surface,
  border: `1px solid ${T.borderHi}`,
  borderRadius: 8, padding: "9px 12px",
  fontSize: 13, color: T.text, outline: "none",
  fontFamily: "inherit",
});

export function FlotaField({ label, T, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block", fontSize: 10, fontWeight: 700,
        color: T.textSec, textTransform: "uppercase",
        letterSpacing: "0.06em", marginBottom: 5,
      }}>{label}</label>
      {children}
    </div>
  );
}

export function FlotaInput({ label, T, ...props }) {
  return (
    <FlotaField label={label} T={T}>
      <input style={inputStyle(T)} {...props} />
    </FlotaField>
  );
}

export function FlotaSelect({ label, T, options, value, onChange, ...props }) {
  return (
    <FlotaField label={label} T={T}>
      <select value={value} onChange={onChange} style={{ ...inputStyle(T), cursor: "pointer" }} {...props}>
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: T.surfaceHi }}>{o.label}</option>
        ))}
      </select>
    </FlotaField>
  );
}

export function FlotaTextarea({ label, T, rows = 3, ...props }) {
  return (
    <FlotaField label={label} T={T}>
      <textarea rows={rows} style={{ ...inputStyle(T), resize: "vertical", lineHeight: 1.5 }} {...props} />
    </FlotaField>
  );
}

export function FlotaRow({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {children}
    </div>
  );
}

// Date helpers
export function toInputDate(str) {
  if (!str) return "";
  const parts = str.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

export function fromInputDate(str) {
  if (!str) return "";
  const parts = str.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

export function calcDias(fechaStr) {
  if (!fechaStr) return 0;
  const parts = fechaStr.split("/");
  if (parts.length !== 3) return 0;
  const [d, m, y] = parts.map(Number);
  const fecha = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((fecha - hoy) / (1000 * 60 * 60 * 24));
}

export function todayStr() {
  const hoy = new Date();
  return `${String(hoy.getDate()).padStart(2,"0")}/${String(hoy.getMonth()+1).padStart(2,"0")}/${hoy.getFullYear()}`;
}
