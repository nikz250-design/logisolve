// logisolve-pdf.js
// PDF generation — generarCotizacionPDF
// ─────────────────────────────────────────────────────
import { safeNumber, safeArr, migrateLinea, calculateTicketTotals } from "./logisolve-calc.js";

export // ═══════════════════════════════════════════════════════════════════════════════
function generarCotizacionPDF(tkt, cl, un, supp) {
  const totals = calculateTicketTotals(tkt);
  const folio = tkt.id.replace("TKT","COT");
  const fechaLarga = (()=>{
    const p=tkt.date.split("/");
    if(p.length!==3) return tkt.date;
    const meses=["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    return `${parseInt(p[0])} de ${meses[parseInt(p[1])-1]} de ${p[2]}`;
  })();
  const formaPago = tkt.payType==="credit"
    ? "Cr\u00e9dito"+(tkt.promesaPago?" \u2014 Fecha l\u00edmite: "+tkt.promesaPago:"")
    : "Contado / Transferencia bancaria";
  const entrega = supp&&supp.entregaDias
    ? supp.entregaDias+" d\u00eda"+(supp.entregaDias>1?"s":"")+" h\u00e1biles"
    : "24-48 hrs h\u00e1biles";
  const unidadStr = un?(un.economico?"Eco. "+un.economico+" \u00b7 ":"")+un.marca+" "+un.modelo+" "+un.anio:"";
  const clDirParts=[];
  if(cl?.direccion) clDirParts.push(cl.direccion);
  if(cl?.ciudad)    clDirParts.push(cl.ciudad);
  if(cl?.estado)    clDirParts.push(cl.estado);
  const clLine = cl?(cl.empresa+(clDirParts.length?" \u00b7 "+clDirParts.join(", "):"")):"&mdash;";
  const fmtMXN = n=>safeNumber(n).toLocaleString("es-MX",{style:"currency",currency:"MXN",minimumFractionDigits:2});
  const notaLine = tkt.notes?`<li>${tkt.notes}</li>`:"";

  // Si ticket viejo sin lineas, crear una fila con datos del snap
  const conceptos = (tkt.lineas&&tkt.lineas.length>0)
    ? tkt.lineas
    : [{titulo:tkt.titulo, partRef:tkt.partRef||"", snap:tkt.snap, qty:1, descripcionPDF:""}];

  const multiLinea = conceptos.length > 1;

  const filas = conceptos.map((c,i)=>{
    const ml = migrateLinea(c, tkt.snap);
    const qty = safeNumber(ml.qty,1)||1;
    const lsnap = ml.snap||tkt.snap||{};
    const precioUnit = safeNumber(lsnap.precioConIVA);
    const lineTotal  = precioUnit * qty;
    const desc = ml.descripcionPDF ||
      "Atenci\u00f3n correctiva para continuidad operativa de unidad en CEDIS SMO. "+
      "Incluye integraci\u00f3n de componente compatible, validaci\u00f3n operativa y seguimiento log\u00edstico.";
    const unTag = unidadStr&&i===0?`<br><br><strong>Unidad:</strong> ${unidadStr}`:"";
    const refTag = ml.partRef?`<br><br><strong>Clave:</strong> ${ml.partRef}`:"";

    if(multiLinea) {
      // Tabla con columnas: # | Cant. | Concepto | Descripción | Unitario | Total
      return `<tr>
        <td style="text-align:center">${String(i+1).padStart(2,"0")}</td>
        <td style="text-align:center">${qty}</td>
        <td>${ml.titulo}</td>
        <td>${desc}${unTag}${refTag}</td>
        <td style="text-align:right;white-space:nowrap">${fmtMXN(precioUnit)}</td>
        <td style="text-align:right;white-space:nowrap;font-weight:700">${fmtMXN(lineTotal)}</td>
      </tr>`;
    } else {
      // Tabla simple: # | Concepto | Descripción | Importe
      return `<tr>
        <td>${String(i+1).padStart(2,"0")}</td>
        <td>${ml.titulo}</td>
        <td>${desc}${unTag}${refTag}</td>
        <td style="text-align:right;white-space:nowrap;font-weight:700">${fmtMXN(precioUnit*qty)}</td>
      </tr>`;
    }
  }).join("");

  const theadMulti = `<thead><tr>
    <th style="width:36px;text-align:center">#</th>
    <th style="width:60px;text-align:center">Cant.</th>
    <th style="width:160px">Concepto</th>
    <th>Descripci\u00f3n t\u00e9cnica / operativa</th>
    <th style="width:110px;text-align:right">Unitario</th>
    <th style="width:120px;text-align:right">Total</th>
  </tr></thead>`;

  const theadSimple = `<thead><tr>
    <th style="width:36px">No.</th>
    <th style="width:190px">Concepto</th>
    <th>Descripci\u00f3n t\u00e9cnica / operativa</th>
    <th style="width:130px;text-align:right">Importe</th>
  </tr></thead>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>${folio}</title>
<style>
*{box-sizing:border-box}
body{margin:0;background:#efefef;font-family:Arial,Helvetica,sans-serif;color:#111}
.page{width:794px;min-height:1123px;margin:0 auto;background:#fff;padding:42px 42px 34px}
.toolbar{text-align:right;margin-bottom:14px}
.toolbar button{padding:6px 18px;border:none;border-radius:3px;font-size:11px;font-weight:700;cursor:pointer;margin-left:6px}
.tb-close{background:#ddd;color:#444}.tb-save{background:#111;color:#fff}
.top-header{border:1px solid #d9d9d9;background:#fafafa;padding:20px 18px;display:flex;justify-content:space-between;align-items:flex-start}
.brand h1{margin:0;font-size:28px;font-weight:800;letter-spacing:.5px}
.brand p{margin:8px 0 0;font-size:12px;color:#555;font-weight:600}
.issuer{text-align:right;font-size:12px;line-height:1.55}
.issuer strong{font-size:14px}
.hero{margin-top:22px;background:#0c0c0c;color:#fff;display:flex;justify-content:space-between;align-items:center;padding:20px 22px}
.hero-title{font-size:28px;font-weight:800;letter-spacing:.4px}
.hero-meta{text-align:right;line-height:1.3}
.hero-meta .label{font-size:14px;opacity:.85}
.hero-meta .folio{font-size:22px;font-weight:800}
.hero-meta .date{font-size:16px;font-weight:700}
.meta-table{width:100%;border-collapse:collapse;margin-top:18px}
.meta-table td{border:1px solid #e1e1e1;padding:12px 14px;font-size:14px}
.meta-table td:first-child{width:140px;background:#fafafa;font-weight:700}
.section-title{margin-top:28px;margin-bottom:12px;font-size:18px;font-weight:800;letter-spacing:.2px}
.detail-table{width:100%;border-collapse:collapse}
.detail-table th{background:#0c0c0c;color:#fff;text-align:left;padding:11px 12px;font-size:13px;font-weight:700}
.detail-table td{border:1px solid #e4e4e4;padding:12px 12px;vertical-align:top;font-size:13px;line-height:1.5}
.detail-table strong{display:inline-block;margin-top:0}
.totals{width:420px;margin-left:auto;margin-top:16px;border-collapse:collapse}
.totals td{border:1px solid #e3e3e3;padding:10px 14px;font-size:14px}
.totals td:last-child{text-align:right;font-weight:700}
.totals .sep td{border-top:2px solid #ccc}
.totals .grand-total td{background:#0c0c0c;color:#fff;font-weight:800;font-size:15px}
.block{margin-top:28px}
.block h3{margin:0 0 10px;font-size:17px;font-weight:800}
.block ul{margin:0;padding-left:18px}
.block li{margin-bottom:6px;line-height:1.45;font-size:13px}
.footer{margin-top:38px;padding-top:12px;border-top:1px solid #e3e3e3;display:flex;justify-content:space-between;font-size:12px;color:#444}
@media print{.toolbar{display:none}body{background:#fff}@page{size:A4;margin:0}}
</style>
</head>
<body>
<div class="page">

<div class="toolbar">
  <button class="tb-close" onclick="window.close()">&#x2715; Cerrar</button>
  <button class="tb-save" onclick="window.print()">&#x2193; Guardar PDF</button>
</div>

<div class="top-header">
  <div class="brand">
    <h1>LOGISOLVE</h1>
    <p>Logistics &middot; Supply &middot; Solutions</p>
  </div>
  <div class="issuer">
    <strong>Alejandro Saucedo</strong><br>
    RFC: SAME9612277T9<br>
    Tel. 5562321807<br>
    contacto@logisolve.mx<br>
    https://logisolve-sistema.vercel.app/
  </div>
</div>

<div class="hero">
  <div class="hero-title">COTIZACI&Oacute;N</div>
  <div class="hero-meta">
    <div class="label">No.</div>
    <div class="folio">${folio}</div>
    <div class="date">Fecha: ${tkt.date.replace(/\//g," / ")}</div>
  </div>
</div>

<table class="meta-table">
  <tr><td>Cliente</td><td>${clLine}</td></tr>
  <tr><td>Atenci&oacute;n</td><td>&Aacute;rea de Compras / Operaciones</td></tr>
  <tr><td>Vigencia</td><td>3 d&iacute;as naturales</td></tr>
</table>

<div class="section-title">DETALLE DEL CONCEPTO</div>

<table class="detail-table">
  ${multiLinea?theadMulti:theadSimple}
  <tbody>${filas}</tbody>
</table>

<table class="totals">
  <tr><td>Subtotal</td><td>${fmtMXN(totals.subtotal)} MXN</td></tr>
  <tr><td>IVA (${totals.ivaPct}%)</td><td>${fmtMXN(totals.ivaAmt)} MXN</td></tr>
  <tr class="grand-total"><td>TOTAL &middot; IVA INCLUIDO</td><td>${fmtMXN(totals.total)} MXN</td></tr>
</table>

<div class="block">
  <h3>ALCANCE DEL SERVICIO</h3>
  <ul>
    <li>Integraci&oacute;n y coordinaci&oacute;n de componente requerido para continuidad operativa.</li>
    <li>Validaci&oacute;n y coordinaci&oacute;n operativa.</li>
    <li>Entrega directa en CEDIS SMO.</li>
    <li>Seguimiento y trazabilidad log&iacute;stica.</li>
  </ul>
</div>

<div class="block">
  <h3>CONDICIONES COMERCIALES</h3>
  <ul>
    <li>Precio IVA incluido en el total.</li>
    <li>Forma de pago: ${formaPago}.</li>
    <li>Entrega conforme a disponibilidad confirmada al momento de autorizaci&oacute;n.</li>
    <li>Precios sujetos a cambio y disponibilidad al momento de confirmar.</li>
    <li>Vigencia: 3 d&iacute;as naturales a partir de la fecha de emisi&oacute;n.</li>
    ${notaLine}
  </ul>
</div>

<div class="block">
  <h3>OBSERVACIONES</h3>
  <ul>
    <li>Tiempo estimado de entrega: ${entrega}, sujeto a disponibilidad.</li>
    <li>La validaci&oacute;n t&eacute;cnica final de compatibilidad corresponde al cliente.</li>
    <li>La garant&iacute;a aplica conforme a pol&iacute;ticas del fabricante o proveedor.</li>
  </ul>
</div>

<div class="footer">
  <div>Quedo atento para cualquier duda o confirmaci&oacute;n.</div>
  <div>LogiSolve &middot; ${fechaLarga}</div>
</div>

</div>
</body>
</html>`;

  const win=window.open("","_blank");
  if(win){win.document.open();win.document.write(html);win.document.close();}
}
