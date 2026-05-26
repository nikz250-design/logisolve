import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Truck, AlertTriangle, Wrench, TrendingUp, Activity, Zap } from "lucide-react";
import { INCIDENCIAS, MANTENIMIENTOS, COSTOS_MENSUALES, KPIs, ACTIVIDAD_RECIENTE } from "./mockData";

function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setValue(Math.round(start));
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

function KpiCard({ icon: Icon, label, value, sub, color, T }) {
  const isNum = typeof value === "number";
  const count = useCountUp(isNum ? value : 0);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        flex: "1 1 160px",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "18px 20px",
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: color + "22",
          border: `1px solid ${color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={18} color={color} strokeWidth={2} />
        </div>
        <div style={{ fontSize: 10, color: T.textTer, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{sub}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: T.text, lineHeight: 1 }}>
        {isNum ? count : value}
      </div>
      <div style={{ fontSize: 11, color: T.textSec, marginTop: 4 }}>{label}</div>
    </motion.div>
  );
}

export function FlotaDashboard({ T, darkMode }) {
  const statusData = [
    { name: "Activos", value: KPIs.activas, color: T.accent },
    { name: "En Taller", value: KPIs.enTaller, color: T.amber },
    { name: "Críticos", value: KPIs.criticas, color: T.red },
  ];

  const alertas = [
    ...INCIDENCIAS.filter(i => i.prioridad === "critica" || i.prioridad === "alta"),
    ...MANTENIMIENTOS.filter(m => m.diasRestantes < 0),
  ].slice(0, 5);

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Dashboard de Flota</div>
        <div style={{ fontSize: 12, color: T.textSec, marginTop: 2 }}>
          Resumen operativo · {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard T={T} icon={Truck}         label="Total unidades"       value={KPIs.totalUnidades}        sub="flota"    color={T.blue}   />
        <KpiCard T={T} icon={Activity}      label="En operación"          value={KPIs.activas}              sub="activas"  color={T.accent} />
        <KpiCard T={T} icon={Wrench}        label="En taller"             value={KPIs.enTaller}             sub="servicio" color={T.amber}  />
        <KpiCard T={T} icon={AlertTriangle} label="Incidencias abiertas"  value={KPIs.incidenciasAbiertas}  sub="alertas"  color={T.red}    />
        <KpiCard T={T} icon={TrendingUp}    label="Disponibilidad"        value={`${KPIs.disponibilidad}%`} sub="operativa" color={T.accent} />
        <KpiCard T={T} icon={Zap}           label="Gasto mensual"         value={`$${(KPIs.gastoMensual/1000).toFixed(0)}K`} sub="MXN" color={T.purple} />
      </div>

      {/* Charts */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        <div style={{
          flex: "2 1 400px",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: "18px 16px",
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Costos Mensuales</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={COSTOS_MENSUALES}>
              <defs>
                <linearGradient id="gradFlotaComb" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradFlotaRep" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.amber} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.amber} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="mes" tick={{ fill: T.textSec, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textSec, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: T.surfaceHi, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 11 }} formatter={val => [`$${Number(val).toLocaleString("es-MX")}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11, color: T.textSec }} />
              <Area type="monotone" dataKey="combustible" name="Combustible" stroke={T.accent} fill="url(#gradFlotaComb)" strokeWidth={2} />
              <Area type="monotone" dataKey="reparaciones" name="Reparaciones" stroke={T.amber} fill="url(#gradFlotaRep)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          flex: "1 1 220px",
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: "18px 16px",
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>Estado de Flota</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.9} />)}
              </Pie>
              <Tooltip contentStyle={{ background: T.surfaceHi, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {statusData.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                <span style={{ fontSize: 11, color: T.textSec, flex: 1 }}>{s.name}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas + Actividad */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 300px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 16px", backdropFilter: T.blur, WebkitBackdropFilter: T.blur }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>⚠ Alertas Activas</div>
          {alertas.map((a, i) => {
            const isInc = "prioridad" in a;
            const colorMap = { critica: T.red, alta: T.amber, media: T.blue };
            const color = isInc ? (colorMap[a.prioridad] || T.textSec) : T.red;
            return (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < alertas.length - 1 ? `1px solid ${T.border}` : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, marginTop: 5, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{a.titulo}</div>
                  <div style={{ fontSize: 10, color: T.textSec, marginTop: 2 }}>Eco. {a.eco} · {isInc ? a.prioridad.toUpperCase() : "VENCIDO"}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ flex: "1 1 300px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "18px 16px", backdropFilter: T.blur, WebkitBackdropFilter: T.blur }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Actividad Reciente</div>
          {ACTIVIDAD_RECIENTE.map((a, i) => (
            <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: i < ACTIVIDAD_RECIENTE.length - 1 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.color, marginTop: 5, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 12, color: T.text }}>{a.texto}</div>
                <div style={{ fontSize: 10, color: T.textTer, marginTop: 2 }}>{a.tiempo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
