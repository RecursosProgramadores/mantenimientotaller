import type { Machine } from "@/context/MantePro";
import { formatDate } from "./format";

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const statusColor = (s: string) => {
  switch (s) {
    case "Operativo": return "background:#dcfce7;color:#166534;";
    case "En Revisión": return "background:#fef9c3;color:#854d0e;";
    case "En Taller": return "background:#dbeafe;color:#1e40af;";
    case "Fuera de Servicio": return "background:#fee2e2;color:#991b1b;";
    default: return "";
  }
};
const critColor = (c: string) => {
  switch (c) {
    case "Alto": return "background:#fee2e2;color:#991b1b;font-weight:600;";
    case "Medio": return "background:#fef3c7;color:#92400e;font-weight:600;";
    case "Bajo": return "background:#dcfce7;color:#166534;font-weight:600;";
    default: return "";
  }
};

const critRank: Record<string, number> = { Alto: 0, Medio: 1, Bajo: 2 };
const statusRank: Record<string, number> = {
  "Fuera de Servicio": 0, "En Taller": 1, "En Revisión": 2, "Operativo": 3,
};

export function printInventory(machines: Machine[], institution: string) {
  const sorted = [...machines].sort((a, b) => {
    const c = (critRank[a.criticality] ?? 9) - (critRank[b.criticality] ?? 9);
    return c !== 0 ? c : (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9);
  });
  const now = new Date();
  const dateStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
  const currentYear = now.getFullYear();

  const rows = sorted.map((m, i) => {
    const age = m.acquisitionYear ? `${currentYear - m.acquisitionYear}` : "—";
    return `<tr>
      <td>${i + 1}</td>
      <td>${esc(m.patrimonialCode || "—")}</td>
      <td><b>${esc(m.name)}</b><br><span style="color:#555;font-size:9px">${esc(m.code)}</span></td>
      <td>${esc(m.brand)} ${esc(m.model)}</td>
      <td>${esc(m.serial || "—")}</td>
      <td style="text-align:center">1</td>
      <td style="${statusColor(m.status)};text-align:center">${esc(m.status)}</td>
      <td style="text-align:center">${esc(m.manufactureYear || "—")}</td>
      <td style="text-align:center">${esc(m.acquisitionYear || "—")}</td>
      <td style="text-align:center">${age}</td>
      <td>${esc(m.area || m.location || "—")}</td>
      <td style="text-align:right">${m.powerKw ?? "—"}</td>
      <td style="text-align:right">${m.cost ? m.cost.toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "—"}</td>
      <td style="${critColor(m.criticality)};text-align:center">${esc(m.criticality)}</td>
    </tr>`;
  }).join("");

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Inventario de Equipos</title>
<style>
  @page { size: landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 16px; }
  h1 { text-align: center; font-size: 18px; margin: 0 0 4px; letter-spacing: 1px; }
  .sub { text-align: center; font-size: 11px; color: #444; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; table-layout: fixed; }
  th, td { border: 1px solid #000; padding: 4px 5px; vertical-align: middle; word-wrap: break-word; }
  th { background: #111; color: #fff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; }
  tbody tr:nth-child(even) td { background: #f5f5f5; }
  .footer { margin-top: 18px; font-size: 11px; }
  .sigs { display: flex; justify-content: space-around; margin-top: 42px; }
  .sig { text-align: center; width: 40%; }
  .sig .line { border-top: 1px solid #000; padding-top: 4px; font-size: 11px; }
  .toolbar { text-align:center; margin-bottom: 12px; }
  .toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; }
  @media print { .toolbar { display: none; } }
</style></head><body>
  <div class="toolbar"><button onclick="window.print()">Imprimir</button></div>
  <h1>INVENTARIO DE EQUIPOS Y MAQUINARIA</h1>
  <div class="sub">${esc(institution)} · Fecha de impresión: ${dateStr}</div>
  <table>
    <thead><tr>
      <th style="width:3%">ORD.</th>
      <th style="width:7%">Cód. Patrimonial</th>
      <th style="width:13%">Denominación</th>
      <th style="width:10%">Marca y Modelo</th>
      <th style="width:8%">Serie</th>
      <th style="width:3%">Cant.</th>
      <th style="width:8%">Estado</th>
      <th style="width:5%">Año Fab.</th>
      <th style="width:5%">Año Adq.</th>
      <th style="width:5%">Antig. (años)</th>
      <th style="width:10%">Área</th>
      <th style="width:5%">Pot. (kW)</th>
      <th style="width:8%">Costo (S/)</th>
      <th style="width:7%">Criticidad</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Total de equipos: <b>${sorted.length}</b></div>
  <div class="sigs">
    <div class="sig"><div class="line">Elaborado por</div></div>
    <div class="sig"><div class="line">V°B° Jefe de Mantenimiento</div></div>
  </div>
</body></html>`;

  const w = window.open("", "_blank", "width=1200,height=800");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function printMachineSheet(m: Machine, institution: string) {
  const currentYear = new Date().getFullYear();
  const age = m.acquisitionYear ? `${currentYear - m.acquisitionYear} años` : "—";
  const row = (l: string, v: unknown) => `<tr><th>${esc(l)}</th><td>${esc(v ?? "—") || "—"}</td></tr>`;
  const components = (m.components ?? []).map((c, i) =>
    `<tr><td>${i + 1}</td><td>${esc(c.name)}</td><td>${esc(c.function)}</td><td>${esc(c.state)}</td><td>${esc(c.criticality)}</td></tr>`
  ).join("") || `<tr><td colspan="5" style="text-align:center;color:#666">Sin componentes</td></tr>`;

  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Ficha ${esc(m.code)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  body { font-family: Arial, sans-serif; color: #111; }
  h1 { font-size: 18px; text-align: center; margin: 0; }
  .sub { text-align:center; color:#444; font-size: 11px; margin-bottom: 16px; }
  h2 { font-size: 13px; border-bottom: 2px solid #000; padding-bottom: 3px; margin: 18px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { border: 1px solid #000; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f0f0f0; width: 32%; }
  .grid { display: grid; grid-template-columns: 180px 1fr; gap: 12px; }
  .photo { width: 180px; height: 180px; border: 1px solid #000; object-fit: cover; }
  .placeholder { display: grid; place-items:center; background:#eee; color:#666; font-size:12px; }
  .toolbar { text-align:center; margin-bottom: 12px; }
  .toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; }
  @media print { .toolbar { display: none; } }
</style></head><body>
  <div class="toolbar"><button onclick="window.print()">Imprimir</button></div>
  <h1>FICHA TÉCNICA DE EQUIPO</h1>
  <div class="sub">${esc(institution)}</div>
  <div class="grid">
    ${m.photo ? `<img class="photo" src="${esc(m.photo)}" alt="">` : `<div class="photo placeholder">Sin fotografía</div>`}
    <table>
      ${row("Código", m.code)}
      ${row("Código Patrimonial", m.patrimonialCode)}
      ${row("Denominación", m.name)}
      ${row("Marca / Modelo", `${m.brand} / ${m.model}`)}
      ${row("N° de Serie", m.serial)}
      ${row("Estado", m.status)}
      ${row("Criticidad", m.criticality)}
    </table>
  </div>
  <h2>Identificación y Antigüedad</h2>
  <table>
    ${row("Año de Fabricación", m.manufactureYear)}
    ${row("Año de Adquisición", m.acquisitionYear)}
    ${row("Antigüedad", age)}
    ${row("Fecha de Compra", m.purchaseDate ? formatDate(m.purchaseDate) : "—")}
    ${row("Costo (S/)", m.cost ? m.cost.toLocaleString("es-PE", { minimumFractionDigits: 2 }) : "—")}
  </table>
  <h2>Ubicación</h2>
  <table>
    ${row("Área / Ubicación", m.area || m.location)}
    ${row("Facultad / Departamento", m.department)}
  </table>
  <h2>Especificaciones Técnicas</h2>
  <table>
    ${row("Potencia (kW)", m.powerKw)}
    ${row("Voltaje (V)", m.voltageV)}
    ${row("Frecuencia (Hz)", m.frequencyHz)}
    ${row("Peso (kg)", m.weightKg)}
    ${row("Horas de Operación Anual", m.annualHours)}
    ${row("Días de Uso por Semana", m.daysPerWeek)}
    ${row("Horas de Uso Acumuladas", m.hoursOfUse)}
  </table>
  <h2>Componentes Críticos</h2>
  <table>
    <thead><tr><th style="width:5%">N°</th><th style="width:25%">Componente</th><th>Función</th><th style="width:20%">Estado</th><th style="width:12%">Criticidad</th></tr></thead>
    <tbody>${components}</tbody>
  </table>
  ${m.observations ? `<h2>Observaciones</h2><p style="font-size:11px">${esc(m.observations)}</p>` : ""}
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1200");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
