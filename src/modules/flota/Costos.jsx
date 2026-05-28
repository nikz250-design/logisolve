import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { COSTOS_MENSUALES, COSTOS_POR_UNIDAD } from "./mockData";

const CATEGORIAS = [
  { key: "combustible",  label: "Combustible",   color: "#3DFFC0" },
  { key: "llantas",      label: "Llantas",       color: "#4DA3FF" },
  { key: "reparaciones", label: "Reparaciones",  color: "#FFB830" },
  { key: "manoObra",     label: "Mano de Obra",  color: "#9B8DD0" },
  { key: "otros",        label: "Otros",         color: "#8A9BB0" },
];

function sumCat(cat) {
  return COSTOS_MENSUALES.reduce((a, m) => a + (m[cat] || 0), 0);
}

export function FlotaCostos({ T, darkMode }) {
  const [selCat, setSelCat] = useState(null);

  const pieData = CATEGORIAS.map(c => ({ name: c.label, value: sumCat(c.key), color: c.color }));
  const totalGasto = pieData.reduce((a, c) => a + c.value, 0);
  const maxCosto = Math.max(...COSTOS_POR_UNIDAD.map(u => u.total));

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>Costos de Flota</div>
        <div style={{ fontSize: 12, color: T.textSec }}>Análisis financiero · Últimos 7 meses</div>
      </div>

      {/* KPI total */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        {[
          { label: "Gasto total (7 meses)",       val: `$${totalGasto.toLocaleString("es-MX")}`,        color: T.text     },
          { label: "Promedio mensual",             val: `$${Math.round(totalGasto/7).toLocaleString("es-MX")}`, color: T.amber },
          { label: "Mayor costo unitario",         val: `Eco. ${COSTOS_POR_UNIDAD[0].eco}`,              color: T.red      },
          { label: "Costo/km más eficiente",       val: `Eco. ${[...COSTOS_POR_UNIDAD].sort((a,b)=>a.costoPorKm-b.costoPorKm)[0].eco}`, color: T.accent },
        ].map(k => (
          <div key={k.label} style={{
            flex: "1 1 180px",
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
            padding: "16px 18px", backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
          }}>
            <div style={{ fontSize: 10, color: T.textSec, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
        {/* Stacked bar */}
        <div style={{
          flex: "2 1 420px",
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
          padding: "18px 16px", backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 14 }}>Desglose mensual por categoría</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={COSTOS_MENSUALES} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="mes" tick={{ fill: T.textSec, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textSec, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: T.surfaceHi, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 11 }} formatter={val => [`$${Number(val).toLocaleString("es-MX")}`, ""]} />
              <Legend wrapperStyle={{ fontSize: 10, color: T.textSec }} />
              {CATEGORIAS.map(c => (
                <Bar key={c.key} dataKey={c.key} name={c.label} stackId="a" fill={c.color} opacity={selCat && selCat !== c.key ? 0.3 : 0.85} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie por categoría */}
        <div style={{
          flex: "1 1 220px",
          background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
          padding: "18px 16px", backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 10 }}>Por categoría</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2} onClick={d => setSelCat(selCat === d.name ? null : d.name)}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={selCat && selCat !== entry.name ? 0.3 : 0.9} />)}
              </Pie>
              <Tooltip contentStyle={{ background: T.surfaceHi, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 11 }} formatter={val => [`$${Number(val).toLocaleString("es-MX")}`, ""]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", opacity: selCat && selCat !== d.name ? 0.4 : 1 }} onClick={() => setSelCat(selCat === d.name ? null : d.name)}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: T.textSec, flex: 1 }}>{d.name}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.text }}>{((d.value / totalGasto) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Costo por unidad */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16,
        padding: "18px 16px", backdropFilter: T.blur, WebkitBackdropFilter: T.blur,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 16 }}>Ranking de costos por unidad</div>
        {[...COSTOS_POR_UNIDAD].sort((a,b) => b.total - a.total).map((u, i) => {
          const pct = (u.total / maxCosto) * 100;
          const color = pct > 80 ? T.red : pct > 60 ? T.amber : T.accent;
          return (
            <div key={u.eco} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.text }}>Eco. {u.eco}</span>
                  <span style={{ fontSize: 10, color: T.textSec }}>{u.marca}</span>
                  <span style={{ fontSize: 9, color: T.textTer }}>${u.costoPorKm.toFixed(2)}/km</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: color }}>${u.total.toLocaleString("es-MX")}</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: T.border, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06, ease: "easeOut" }}
                  style={{ height: "100%", borderRadius: 99, background: color, opacity: 0.8 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
