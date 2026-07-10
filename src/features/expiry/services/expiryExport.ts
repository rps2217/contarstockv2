/**
 * expiryExport - Servicio de exportación de reportes de vencimientos
 */

import { ExpiryRecord, ExpiryStatus } from '../hooks/useExpiry';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// TIPOS
// ============================================================================

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExpiryReportOptions {
  format: ExportFormat;
  title?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const STATUS_LABELS: Record<ExpiryStatus, string> = {
  [ExpiryStatus.EXPIRED]: 'VENCIDO',
  [ExpiryStatus.CRITICAL]: 'CRÍTICO',
  [ExpiryStatus.WITHDRAWAL]: 'POR RETIRAR',
  [ExpiryStatus.NEXT_EXPIRY]: 'PRÓXIMO',
  [ExpiryStatus.SAFE]: 'VIGENTE'
};

// ============================================================================
// EXPORTAR CSV
// ============================================================================

export function exportToCSV(records: ExpiryRecord[], filename = 'vencimientos'): void {
  const headers = [
    'Producto', 'Barcode', 'Fecha Vencimiento', 'Días Restantes',
    'Estado', 'Cantidad', 'Ubicación', 'Proveedor', 'Canje', 'Observaciones'
  ];

  const rows = records.map(r => [
    r.productName, r.barcode,
    `${r.mm.toString().padStart(2, '0')}/${r.yyyy}`,
    r.daysLeft.toString(), STATUS_LABELS[r.status],
    r.quantity.toString(), r.location, r.providerName,
    r.hasCanje ? 'Sí' : 'No', r.observaciones || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// ============================================================================
// EXPORTAR EXCEL (HTML)
// ============================================================================

export function exportToExcel(records: ExpiryRecord[], filename = 'vencimientos'): void {
  const headers = ['Producto', 'Barcode', 'Fecha', 'Días', 'Estado', 'Cantidad', 'Ubicación', 'Proveedor', 'Canje'];
  const rows = records.map(r => [
    r.productName, r.barcode,
    `${r.mm.toString().padStart(2, '0')}/${r.yyyy}`,
    r.daysLeft, STATUS_LABELS[r.status],
    r.quantity, r.location, r.providerName,
    r.hasCanje ? 'Sí' : 'No'
  ]);

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Vencimientos</title>
  <style>table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}
  th{background:#4a90d9;color:#fff}tr:nth-child(even){background:#f9f9f9}</style></head>
  <body><h1>Vencimientos</h1><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;

  downloadFile(html, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
}

// ============================================================================
// EXPORTAR PDF (HTML para imprimir)
// ============================================================================

export function exportToPDF(
  records: ExpiryRecord[],
  stats: { total: number; expired: number; critical: number; withdrawal: number; nextExpiry: number; safe: number },
  filename = 'reporte_vencimientos'
): void {
  const now = new Date();
  const dateStr = format(now, 'dd/MM/yyyy HH:mm', { locale: es });

  const byStatus = {
    expired: records.filter(r => r.status === ExpiryStatus.EXPIRED),
    critical: records.filter(r => r.status === ExpiryStatus.CRITICAL),
    withdrawal: records.filter(r => r.status === ExpiryStatus.WITHDRAWAL),
    nextExpiry: records.filter(r => r.status === ExpiryStatus.NEXT_EXPIRY),
    safe: records.filter(r => r.status === ExpiryStatus.SAFE)
  };

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Reporte de Vencimientos</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',sans-serif;font-size:11px;color:#1e293b;padding:20px}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:15px;border-bottom:2px solid #e2e8f0}
.header h1{font-size:20px;font-weight:700;color:#0f172a}
.header .subtitle{font-size:12px;color:#64748b;margin-top:4px}
.header .date{font-size:11px;color:#94a3b8;text-align:right}
.stats{display:flex;gap:15px;margin-bottom:20px}
.stat{flex:1;padding:12px;border-radius:8px;text-align:center}
.stat.expired{background:#fef2f2;border:1px solid #fecaca}
.stat.critical{background:#fffbeb;border:1px solid #fed7aa}
.stat.warning{background:#fff7ed;border:1px solid #fdba74}
.stat.safe{background:#f0fdf4;border:1px solid #bbf7d0}
.stat .value{font-size:24px;font-weight:700}
.stat.expired .value{color:#dc2626}
.stat.critical .value{color:#d97706}
.stat.warning .value{color:#ea580c}
.stat.safe .value{color:#16a34a}
.stat .label{font-size:10px;text-transform:uppercase;color:#64748b;margin-top:2px}
.section{margin-bottom:25px}
.section-title{font-size:12px;font-weight:600;text-transform:uppercase;padding:8px 12px;border-radius:6px;margin-bottom:10px;display:flex;justify-content:space-between}
.section-title.expired{background:#fef2f2;color:#dc2626}
.section-title.critical{background:#fffbeb;color:#d97706}
.section-title.warning{background:#fff7ed;color:#ea580c}
.section-title.safe{background:#f0fdf4;color:#16a34a}
table{width:100%;border-collapse:collapse;font-size:10px}
th{background:#f8fafc;padding:8px 10px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0}
td{padding:8px 10px;border-bottom:1px solid #f1f5f9}
tr:hover{background:#f8fafc}
.days{font-weight:600}
.days.negative{color:#dc2626}
.days.zero{color:#d97706}
.days.positive{color:#16a34a}
.footer{margin-top:30px;padding-top:15px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
@media print{body{padding:10px}.stat,section{page-break-inside:avoid}}
</style></head><body>
<div class="header"><div><h1>Reporte de Vencimientos</h1><div class="subtitle">Control de Caducidades - ContarStock</div></div>
<div class="date">Generado: ${dateStr}<br>Total: ${records.length} registros</div></div>

<div class="stats">
<div class="stat expired"><div class="value">${stats.expired}</div><div class="label">Vencidos</div></div>
<div class="stat critical"><div class="value">${stats.critical}</div><div class="label">Críticos</div></div>
<div class="stat warning"><div class="value">${stats.withdrawal + stats.nextExpiry}</div><div class="label">Por Vencer</div></div>
<div class="stat safe"><div class="value">${stats.safe}</div><div class="label">Vigentes</div></div>
</div>

${byStatus.expired.length > 0 ? `<div class="section"><div class="section-title expired"><span>Vencidos (${byStatus.expired.length})</span><span>Requieren acción inmediata</span></div>
<table><thead><tr><th>Producto</th><th>Barcode</th><th>Fecha</th><th>Días</th><th>Cantidad</th><th>Ubicación</th><th>Proveedor</th></tr></thead><tbody>
${byStatus.expired.map(r => `<tr><td>${r.productName}</td><td>${r.barcode}</td><td>${r.mm.toString().padStart(2,'0')}/${r.yyyy}</td><td class="days negative">${r.daysLeft < 0 ? Math.abs(r.daysLeft) + ' días atrás' : 'Hoy'}</td><td>${r.quantity}</td><td>${r.location}</td><td>${r.providerName}</td></tr>`).join('')}
</tbody></table></div>` : ''}

${byStatus.critical.length > 0 ? `<div class="section"><div class="section-title critical"><span>Críticos (${byStatus.critical.length})</span><span>Menos de 15 días</span></div>
<table><thead><tr><th>Producto</th><th>Barcode</th><th>Fecha</th><th>Días</th><th>Cantidad</th><th>Ubicación</th><th>Proveedor</th></tr></thead><tbody>
${byStatus.critical.map(r => `<tr><td>${r.productName}</td><td>${r.barcode}</td><td>${r.mm.toString().padStart(2,'0')}/${r.yyyy}</td><td class="days zero">${r.daysLeft} días</td><td>${r.quantity}</td><td>${r.location}</td><td>${r.providerName}</td></tr>`).join('')}
</tbody></table></div>` : ''}

${byStatus.withdrawal.length > 0 ? `<div class="section"><div class="section-title warning"><span>Por Retirar (${byStatus.withdrawal.length})</span><span>Dentro de período de retiro</span></div>
<table><thead><tr><th>Producto</th><th>Barcode</th><th>Fecha</th><th>Días</th><th>Cantidad</th><th>Ubicación</th><th>Proveedor</th></tr></thead><tbody>
${byStatus.withdrawal.map(r => `<tr><td>${r.productName}</td><td>${r.barcode}</td><td>${r.mm.toString().padStart(2,'0')}/${r.yyyy}</td><td class="days positive">${r.daysLeft} días</td><td>${r.quantity}</td><td>${r.location}</td><td>${r.providerName}</td></tr>`).join('')}
</tbody></table></div>` : ''}

${byStatus.nextExpiry.length > 0 ? `<div class="section"><div class="section-title warning"><span>Próximos a Vencer (${byStatus.nextExpiry.length})</span><span>Menos de 90 días</span></div>
<table><thead><tr><th>Producto</th><th>Barcode</th><th>Fecha</th><th>Días</th><th>Cantidad</th><th>Ubicación</th><th>Proveedor</th></tr></thead><tbody>
${byStatus.nextExpiry.map(r => `<tr><td>${r.productName}</td><td>${r.barcode}</td><td>${r.mm.toString().padStart(2,'0')}/${r.yyyy}</td><td class="days positive">${r.daysLeft} días</td><td>${r.quantity}</td><td>${r.location}</td><td>${r.providerName}</td></tr>`).join('')}
</tbody></table></div>` : ''}

${byStatus.safe.length > 0 ? `<div class="section"><div class="section-title safe"><span>Vigentes (${byStatus.safe.length})</span><span>Más de 90 días</span></div>
<table><thead><tr><th>Producto</th><th>Barcode</th><th>Fecha</th><th>Días</th><th>Cantidad</th><th>Ubicación</th><th>Proveedor</th></tr></thead><tbody>
${byStatus.safe.slice(0, 50).map(r => `<tr><td>${r.productName}</td><td>${r.barcode}</td><td>${r.mm.toString().padStart(2,'0')}/${r.yyyy}</td><td class="days positive">${r.daysLeft} días</td><td>${r.quantity}</td><td>${r.location}</td><td>${r.providerName}</td></tr>`).join('')}
</tbody></table>${byStatus.safe.length > 50 ? `<p style="text-align:center;color:#94a3b8;padding:10px;">... y ${byStatus.safe.length - 50} más</p>` : ''}</div>` : ''}

<div class="footer">ContarStock v2 • Reporte generado automáticamente</div>
</body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================================
// EXPORT PRINCIPAL
// ============================================================================

export function exportExpiryReport(
  records: ExpiryRecord[],
  stats: { total: number; expired: number; critical: number; withdrawal: number; nextExpiry: number; safe: number },
  options: ExpiryReportOptions
): void {
  const filename = `vencimientos_${format(new Date(), 'yyyy-MM-dd_HHmm')}`;
  
  switch (options.format) {
    case 'csv': exportToCSV(records, filename); break;
    case 'excel': exportToExcel(records, filename); break;
    case 'pdf': exportToPDF(records, stats, filename); break;
    default: exportToCSV(records, filename);
  }
}
