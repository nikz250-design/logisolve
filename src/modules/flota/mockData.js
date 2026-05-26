// ═══════════════════════════════════════════════════════════════
// MOCK DATA — Control de Flota — Logisolve
// ═══════════════════════════════════════════════════════════════

export const UNIDADES = [
  { id:"U-001", eco:"1407", placas:"TXK-82-10", vin:"3ALACWDT0FDGJ5501", marca:"RAM", modelo:"4000", año:2021, motor:"Cummins ISB 6.7L", color:"Blanco", km:187420, kmUltimoSvc:185000, kmProxSvc:200000, status:"activo", operador:"Carlos Mendoza", operadorId:"OP-01", ultimoSvc:"12/05/2026", proxSvc:"25/06/2026", diasProxSvc:12, ubicacion:"CEDIS SMO", rendimiento:8.4, img:"🚛" },
  { id:"U-002", eco:"1203", placas:"RZG-40-22", vin:"3ALACWDT0FDGJ4892", marca:"Kenworth", modelo:"T680", año:2020, motor:"PACCAR MX-13 425HP", color:"Azul", km:312870, kmUltimoSvc:308000, kmProxSvc:320000, status:"taller", operador:"José Ramírez", operadorId:"OP-02", ultimoSvc:"03/04/2026", proxSvc:"18/05/2026", diasProxSvc:-8, ubicacion:"Taller Norte", rendimiento:7.1, img:"🚛" },
  { id:"U-003", eco:"0905", placas:"TBM-19-87", vin:"3HSDJSJT1HN594821", marca:"International", modelo:"ProStar+", año:2019, motor:"MaxxForce 13L 475HP", color:"Gris", km:445200, kmUltimoSvc:440000, kmProxSvc:455000, status:"activo", operador:"Alejandro Torres", operadorId:"OP-03", ultimoSvc:"28/04/2026", proxSvc:"10/07/2026", diasProxSvc:45, ubicacion:"Ruta MEX-57", rendimiento:6.8, img:"🚛" },
  { id:"U-004", eco:"2108", placas:"LMN-55-33", vin:"1FUJGLDR9CSBL8834", marca:"Freightliner", modelo:"Cascadia 126", año:2022, motor:"Detroit DD15 500HP", color:"Negro", km:98340, kmUltimoSvc:95000, kmProxSvc:110000, status:"activo", operador:"Miguel Herrera", operadorId:"OP-04", ultimoSvc:"15/05/2026", proxSvc:"05/08/2026", diasProxSvc:71, ubicacion:"CEDIS MTY", rendimiento:9.2, img:"🚛" },
  { id:"U-005", eco:"1601", placas:"WPQ-71-56", vin:"3ALACWDT3FDGJ9921", marca:"RAM", modelo:"5500 HD", año:2020, motor:"Cummins ISL 8.9L", color:"Rojo", km:267180, kmUltimoSvc:260000, kmProxSvc:270000, status:"critico", operador:"Francisco López", operadorId:"OP-05", ultimoSvc:"10/03/2026", proxSvc:"20/05/2026", diasProxSvc:-6, ubicacion:"CEDIS GDL", rendimiento:7.8, img:"🚛" },
  { id:"U-006", eco:"0712", placas:"NTR-28-94", vin:"1FUJGHDV9CHBX1144", marca:"Freightliner", modelo:"Cascadia 113", año:2018, motor:"Detroit DD13 450HP", color:"Blanco", km:521000, kmUltimoSvc:515000, kmProxSvc:525000, status:"activo", operador:"Roberto Vega", operadorId:"OP-06", ultimoSvc:"02/05/2026", proxSvc:"15/06/2026", diasProxSvc:20, ubicacion:"Ruta MEX-15", rendimiento:6.5, img:"🚛" },
  { id:"U-007", eco:"1944", placas:"ZXC-62-11", vin:"3AKJHLD53FSJE3311", marca:"Kenworth", modelo:"W900L", año:2023, motor:"PACCAR MX-13 510HP", color:"Azul Marino", km:45120, kmUltimoSvc:40000, kmProxSvc:55000, status:"activo", operador:"Eduardo Salinas", operadorId:"OP-07", ultimoSvc:"10/05/2026", proxSvc:"20/07/2026", diasProxSvc:55, ubicacion:"CEDIS SMO", rendimiento:9.8, img:"🚛" },
  { id:"U-008", eco:"1322", placas:"BVN-83-47", vin:"4V4NC9EJ4EN175521", marca:"Volvo", modelo:"VNL 760", año:2021, motor:"D13 500HP", color:"Blanco", km:189560, kmUltimoSvc:188000, kmProxSvc:198000, status:"taller", operador:"Sin asignar", operadorId:null, ultimoSvc:"01/05/2026", proxSvc:"15/06/2026", diasProxSvc:20, ubicacion:"Taller Sur", rendimiento:8.1, img:"🚛" },
];

export const INCIDENCIAS = [
  { id:"INC-001", titulo:"Falla en frenos traseros", descripcion:"El operador reporta que los frenos traseros responden con retardo. Se detecta desgaste en pastillas y posible fuga en línea hidráulica.", prioridad:"critica", status:"reparacion", unidadId:"U-002", eco:"1203", tecnico:"Ing. Sergio Morales", fecha:"20/05/2026", km:312870, imgs:2, tags:["Frenos","Seguridad"] },
  { id:"INC-002", titulo:"Filtro de aire obstruido", descripcion:"Consumo excesivo de combustible detectado. Diagnóstico inicial apunta a filtro de aire colmatado y posible falla en sensor MAF.", prioridad:"alta", status:"diagnostico", unidadId:"U-005", eco:"1601", tecnico:"Ing. Arnulfo Reyes", fecha:"19/05/2026", km:267180, imgs:1, tags:["Motor","Combustible"] },
  { id:"INC-003", titulo:"Fuga de aceite diferencial", descripcion:"Mancha de aceite detectada en patio. Se identifica fuga en sello de diferencial trasero derecho. Requiere reemplazo de retén.", prioridad:"alta", status:"pendiente", unidadId:"U-006", eco:"0712", tecnico:"Sin asignar", fecha:"21/05/2026", km:521000, imgs:0, tags:["Diferencial","Aceite"] },
  { id:"INC-004", titulo:"Llanta baja presión eje delantero", descripcion:"Sensor TPMS activa alerta. Llanta delantera derecha con 65 PSI (mínimo 100 PSI requerido). Posible pinchazo o válvula defectuosa.", prioridad:"media", status:"pendiente", unidadId:"U-003", eco:"0905", tecnico:"Sin asignar", fecha:"22/05/2026", km:445200, imgs:0, tags:["Llantas","TPMS"] },
  { id:"INC-005", titulo:"A/C inoperante cabina", descripcion:"Sistema de aire acondicionado de cabina sin funcionamiento. Compresor no arranca. Verificar fusibles, relé y carga de refrigerante.", prioridad:"baja", status:"pendiente", unidadId:"U-004", eco:"2108", tecnico:"Sin asignar", fecha:"22/05/2026", km:98340, imgs:0, tags:["A/C","Cabina"] },
  { id:"INC-006", titulo:"Revisión de luces laterales", descripcion:"Dos luces laterales izquierdas fundidas. Reemplazo preventivo de juego completo para cumplir con norma de verificación.", prioridad:"baja", status:"cerrado", unidadId:"U-001", eco:"1407", tecnico:"Ing. Pedro Castro", fecha:"15/05/2026", km:186100, imgs:1, tags:["Eléctrico","Luces"] },
  { id:"INC-007", titulo:"Vibración en transmisión", descripcion:"Vibración anormal a 80-90 km/h. Posible desbalanceo en cardan o desgaste en cruceta. Requiere inspección en foso.", prioridad:"alta", status:"diagnostico", unidadId:"U-008", eco:"1322", tecnico:"Ing. Sergio Morales", fecha:"18/05/2026", km:189560, imgs:0, tags:["Transmisión","Cardan"] },
];

export const MANTENIMIENTOS = [
  { id:"MNT-001", tipo:"preventivo", titulo:"Cambio de aceite y filtros", unidadId:"U-001", eco:"1407", km:187420, kmProg:190000, fecha:"05/06/2026", diasRestantes:14, status:"programado", costo:3800, tecnico:"Taller Norte", piezas:["Aceite 10W-40 20L","Filtro de aceite","Filtro de combustible"] },
  { id:"MNT-002", tipo:"correctivo", titulo:"Reparación sistema de frenos", unidadId:"U-002", eco:"1203", km:312870, kmProg:312870, fecha:"23/05/2026", diasRestantes:1, status:"en_progreso", costo:12500, tecnico:"Ing. Sergio Morales", piezas:["Pastillas traseras","Manguera hidráulica","Líquido de frenos"] },
  { id:"MNT-003", tipo:"preventivo", titulo:"Revisión completa 250K km", unidadId:"U-003", eco:"0905", km:445200, kmProg:450000, fecha:"15/06/2026", diasRestantes:24, status:"programado", costo:28000, tecnico:"Taller Autorizado Int.", piezas:["Kit distribución","Bomba de agua","Termostato","Amortiguadores"] },
  { id:"MNT-004", tipo:"preventivo", titulo:"Cambio de llantas eje trasero", unidadId:"U-005", eco:"1601", km:267180, kmProg:265000, fecha:"10/05/2026", diasRestantes:-12, status:"vencido", costo:42000, tecnico:"Llanteras del Norte", piezas:["4x Michelin XDS2 295/80R22.5"] },
  { id:"MNT-005", tipo:"preventivo", titulo:"Servicio 50K km", unidadId:"U-007", eco:"1944", km:45120, kmProg:50000, fecha:"20/07/2026", diasRestantes:59, status:"programado", costo:5200, tecnico:"Kenworth Monterrey", piezas:["Aceite sintético","Filtros","Inspección general"] },
  { id:"MNT-006", tipo:"correctivo", titulo:"Diagnóstico transmisión", unidadId:"U-008", eco:"1322", km:189560, kmProg:189560, fecha:"24/05/2026", diasRestantes:2, status:"en_progreso", costo:8500, tecnico:"Ing. Sergio Morales", piezas:["Cruceta cardan","Líquido ATF"] },
  { id:"MNT-007", tipo:"preventivo", titulo:"Verificación semestral SEMARNAT", unidadId:"U-006", eco:"0712", km:521000, kmProg:521000, fecha:"31/05/2026", diasRestantes:9, status:"programado", costo:1800, tecnico:"SEMARNAT Autorizada", piezas:["Inspección visual","Prueba humo","Certificado"] },
];

export const COSTOS_MENSUALES = [
  { mes:"Nov", combustible:128400, llantas:0, reparaciones:18200, manoObra:24000, otros:8100 },
  { mes:"Dic", combustible:134800, llantas:42000, reparaciones:12400, manoObra:19500, otros:6800 },
  { mes:"Ene", combustible:119200, llantas:0, reparaciones:31800, manoObra:28000, otros:9200 },
  { mes:"Feb", combustible:125600, llantas:0, reparaciones:8900, manoObra:16800, otros:7400 },
  { mes:"Mar", combustible:141200, llantas:0, reparaciones:22400, manoObra:21200, otros:11300 },
  { mes:"Abr", combustible:138800, llantas:28000, reparaciones:44800, manoObra:38400, otros:14200 },
  { mes:"May", combustible:147200, llantas:42000, reparaciones:28900, manoObra:31800, otros:12400 },
];

export const COSTOS_POR_UNIDAD = [
  { eco:"0712", marca:"Freightliner", total:89400, combustible:38200, mantenimiento:51200, km:521000, costoPorKm:3.82 },
  { eco:"0905", marca:"International", total:72800, combustible:31400, mantenimiento:41400, km:445200, costoPorKm:3.61 },
  { eco:"1203", marca:"Kenworth", total:68900, combustible:29800, mantenimiento:39100, km:312870, costoPorKm:4.11 },
  { eco:"1322", marca:"Volvo", total:52100, combustible:24600, mantenimiento:27500, km:189560, costoPorKm:4.22 },
  { eco:"1407", marca:"RAM", total:48200, combustible:22800, mantenimiento:25400, km:187420, costoPorKm:3.91 },
  { eco:"1601", marca:"RAM", total:61400, combustible:27100, mantenimiento:34300, km:267180, costoPorKm:4.28 },
  { eco:"1944", marca:"Kenworth", total:18200, combustible:9800, mantenimiento:8400, km:45120, costoPorKm:3.74 },
  { eco:"2108", marca:"Freightliner", total:22800, combustible:12400, mantenimiento:10400, km:98340, costoPorKm:3.81 },
];

export const DOCUMENTOS = [
  { id:"DOC-001", tipo:"Seguro", titulo:"Póliza de Seguro Todo Riesgo", unidadId:"U-001", eco:"1407", vencimiento:"30/06/2026", diasVence:39, status:"vigente", aseguradora:"GNP Seguros", poliza:"GNP-2024-78341" },
  { id:"DOC-002", tipo:"Tarjeta Circulación", titulo:"Tarjeta de Circulación", unidadId:"U-001", eco:"1407", vencimiento:"15/07/2026", diasVence:54, status:"vigente", expedidoPor:"SAT CDMX", folio:"TC-2024-141829" },
  { id:"DOC-003", tipo:"Verificación", titulo:"Verificación Vehicular 2026", unidadId:"U-002", eco:"1203", vencimiento:"28/05/2026", diasVence:6, status:"urgente", expedidoPor:"SEMARNAT NL", folio:"VER-2025-44821" },
  { id:"DOC-004", tipo:"Seguro", titulo:"Póliza de Seguro Todo Riesgo", unidadId:"U-003", eco:"0905", vencimiento:"10/06/2026", diasVence:19, status:"proximo", aseguradora:"AXA Seguros", poliza:"AXA-2024-12931" },
  { id:"DOC-005", tipo:"Permiso SCT", titulo:"Permiso de Transporte Federal", unidadId:"U-004", eco:"2108", vencimiento:"31/12/2026", diasVence:223, status:"vigente", expedidoPor:"SCT", folio:"SCT-2024-889201" },
  { id:"DOC-006", tipo:"Verificación", titulo:"Verificación Vehicular 2026", unidadId:"U-005", eco:"1601", vencimiento:"15/05/2026", diasVence:-7, status:"vencido", expedidoPor:"SEMARNAT GDL", folio:"VER-2025-29481" },
  { id:"DOC-007", tipo:"Tarjeta Circulación", titulo:"Tarjeta de Circulación", unidadId:"U-006", eco:"0712", vencimiento:"22/08/2026", diasVence:92, status:"vigente", expedidoPor:"SAT NL", folio:"TC-2022-988341" },
  { id:"DOC-008", tipo:"Seguro", titulo:"Póliza de Seguro Todo Riesgo", unidadId:"U-007", eco:"1944", vencimiento:"01/06/2026", diasVence:10, status:"proximo", aseguradora:"Qualitas", poliza:"QUA-2025-44211" },
  { id:"DOC-009", tipo:"Verificación", titulo:"Verificación Vehicular 2026", unidadId:"U-007", eco:"1944", vencimiento:"30/07/2026", diasVence:69, status:"vigente", expedidoPor:"SEMARNAT SMO", folio:"VER-2025-81122" },
  { id:"DOC-010", tipo:"Permiso SCT", titulo:"Permiso de Transporte Federal", unidadId:"U-008", eco:"1322", vencimiento:"31/12/2026", diasVence:223, status:"vigente", expedidoPor:"SCT", folio:"SCT-2024-889301" },
];

export const ACTIVIDAD_RECIENTE = [
  { id:1, tipo:"incidencia", texto:"Nueva incidencia crítica en Eco. 1203 — Frenos", tiempo:"hace 2 horas", color:"#FF4444" },
  { id:2, tipo:"mantenimiento", texto:"Mantenimiento completado en Eco. 1407", tiempo:"hace 4 horas", color:"#4CAF50" },
  { id:3, tipo:"documento", texto:"Verificación de Eco. 1601 VENCIDA", tiempo:"hace 5 horas", color:"#FF6B00" },
  { id:4, tipo:"unidad", texto:"Eco. 1203 ingresó a taller Norte", tiempo:"ayer 14:30", color:"#FFC107" },
  { id:5, tipo:"incidencia", texto:"Incidencia cerrada en Eco. 1407 — Luces", tiempo:"ayer 11:00", color:"#4CAF50" },
  { id:6, tipo:"mantenimiento", texto:"Mantenimiento vencido — Eco. 1601 llantas", tiempo:"hace 2 días", color:"#FF4444" },
];

export const KPIs = {
  totalUnidades: 8,
  activas: 5,
  enTaller: 2,
  criticas: 1,
  proximosMantenimientos: 3,
  disponibilidad: 62.5,
  gastoMensual: 262300,
  incidenciasAbiertas: 5,
};
