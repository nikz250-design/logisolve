import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Shield, CheckCircle, AlertTriangle, Clock, Upload } from "lucide-react";
import { DOCUMENTOS } from "./mockData";

const DOC_STATUS = {
  vigente: { label:"Vigente",  color:"#3DFFC0", bg:"rgba(61,255,192,0.12)",  icon:CheckCircle },
  proximo: { label:"Próximo",  color:"#FFB830", bg:"rgba(255,184,48,0.12)",  icon:Clock       },
  urgente: { label:"Urgente",  color:"#FF6B00", bg:"rgba(255,107,0,0.15)",   icon:AlertTriangle },
  vencido: { label:"Vencido",  color:"#FF5555", bg:"rgba(255,85,85,0.15)",   icon:AlertTriangle },
};

export function FlotaDocumentacion({ T, darkMode }) {
  const urgentes  = DOCUMENTOS.filter(d => ["vencido","urgente"].includes(d.status));
  const proximos  = DOCUMENTOS.filter(d => d.status === "proximo");
  const vigentes  = DOCUMENTOS.filter(d => d.status === "vigente");

  return (
    <div style={{ padding:"24px", maxWidth:1200, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800, color:T.text }}>Documentación</div>
          <div style={{ fontSize:11, color:T.textSec, marginTop:3 }}>Control de vigencia documental · {DOCUMENTOS.length} documentos</div>
        </div>
        <motion.button whileHover={{scale:1.04}} whileTap={{scale:0.97}} style={{
          display:"flex", alignItems:"center", gap:7,
          padding:"9px 16px", borderRadius:12,
          background:T.accentDim, border:`1px solid ${T.accent}44`,
          color:T.accent, fontSize:11, fontWeight:700, cursor:"pointer",
        }}>
          <Upload size={14}/> Cargar documento
        </motion.button>
      </div>

      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
        {[
          { label:"Vigentes",   value:vigentes.length,  color:"#3DFFC0" },
          { label:"Próximos",   value:proximos.length,  color:"#FFB830" },
          { label:"Urgentes",   value:DOCUMENTOS.filter(d=>d.status==="urgente").length, color:"#FF6B00" },
          { label:"Vencidos",   value:DOCUMENTOS.filter(d=>d.status==="vencido").length, color:"#FF5555" },
        ].map((k,i) => (
          <motion.div key={k.label} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.06}}
            style={{ background:T.surface, border:`1px solid ${T.borderHi}`, backdropFilter:T.blur, borderRadius:16, padding:"16px", textAlign:"center" }}>
            <div style={{ fontSize:30, fontWeight:900, color:k.color }}>{k.value}</div>
            <div style={{ fontSize:10, color:T.textSec, marginTop:4, fontWeight:600 }}>{k.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Urgentes first */}
      {urgentes.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#FF5555", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>🚨 Acción inmediata requerida</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {urgentes.map((d,i) => <DocCard key={d.id} d={d} T={T} delay={i*0.04}/>)}
          </div>
        </div>
      )}

      {/* Próximos */}
      {proximos.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, fontWeight:800, color:"#FFB830", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Por vencer pronto</div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {proximos.map((d,i) => <DocCard key={d.id} d={d} T={T} delay={i*0.04}/>)}
          </div>
        </div>
      )}

      {/* Vigentes */}
      <div>
        <div style={{ fontSize:11, fontWeight:800, color:T.textSec, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Vigentes</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {vigentes.map((d,i) => <DocCard key={d.id} d={d} T={T} delay={i*0.04}/>)}
        </div>
      </div>
    </div>
  );
}

function DocCard({ d, T, delay }) {
  const st = DOC_STATUS[d.status] || DOC_STATUS.vigente;
  const Icon = st.icon;
  const overdue = d.diasVence < 0;

  return (
    <motion.div initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay}} whileHover={{y:-2}}
      style={{
        display:"grid", gridTemplateColumns:"36px 1fr auto auto",
        gap:14, alignItems:"center",
        background:T.surface, border:`1px solid ${T.borderHi}`,
        backdropFilter:T.blur, WebkitBackdropFilter:T.blur,
        borderRadius:14, padding:"12px 16px",
        boxShadow:"0 2px 10px rgba(0,0,0,0.08)",
      }}>
      <div style={{ width:36, height:36, borderRadius:10, background:st.bg, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={18} color={st.color}/>
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{d.titulo}</div>
        <div style={{ fontSize:10, color:T.textSec, marginTop:2 }}>Eco. {d.eco} · {d.tipo} · {d.folio||d.poliza||""}</div>
      </div>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:9, color:T.textTer, marginBottom:2 }}>VENCE</div>
        <div style={{ fontSize:11, fontWeight:700, color:T.text }}>{d.vencimiento}</div>
        <div style={{ fontSize:9, color:st.color }}>
          {overdue ? `Hace ${Math.abs(d.diasVence)} días` : `En ${d.diasVence} días`}
        </div>
      </div>
      <div style={{ fontSize:10, fontWeight:700, color:st.color, background:st.bg, borderRadius:8, padding:"4px 10px", whiteSpace:"nowrap" }}>
        {st.label}
      </div>
    </motion.div>
  );
}
