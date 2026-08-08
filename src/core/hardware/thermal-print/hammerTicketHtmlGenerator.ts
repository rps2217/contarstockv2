/**
 * Hammer Ticket HTML Generator
 * Genera el HTML para tickets de conteo Hammer (TEORICO vs REAL)
 */

import type { PrintItem } from './thermalTypes';

/** Configuración para generación de HTML de ticket Hammer */
interface HammerTicketHtmlConfig {
  documentId: string;
  items: PrintItem[];
  batchInfo?: string;
  location?: string;
  importedAt?: number;
}

/** Genera el HTML para un item de hammer con comparativa teórico/real */
function generateHammerItemHtml(
  item: PrintItem,
  index: number
): { html: string; teorico: number; real: number } {
  const teorico = item.expectedQuantity || item.expectedQty || 0;
  const real = item.totalQuantity || item.quantity || 0;
  const diff = real - teorico;

  const diffClass = diff === 0 ? 'diff-ok' : diff > 0 ? 'diff-mas' : 'diff-menos';
  const diffText = diff === 0 ? '0' : diff > 0 ? `+${diff}` : String(diff);

  const html = `
    <div class="hammer-item">
      <div class="hammer-item-header">
        <span class="hammer-item-num">${index + 1}.</span>
        <span class="hammer-item-name">${item.name || item.productName || 'SIN DESCRIPCIÓN'}</span>
      </div>
      <div class="hammer-item-details">
        <div class="hammer-item-barcode">${item.barcode}</div>
        <div class="hammer-item-location">${item.loc || ''}</div>
      </div>
      <div class="hammer-item-qtys">
        <div class="qty-box">
          <span class="qty-label">TEORICO</span>
          <span class="qty-value">${teorico}</span>
        </div>
        <div class="qty-divider">VS</div>
        <div class="qty-box">
          <span class="qty-label">REAL</span>
          <span class="qty-value">${real}</span>
        </div>
        <div class="qty-box diff-box ${diffClass}">
          <span class="qty-label">DIF</span>
          <span class="qty-value">${diffText}</span>
        </div>
      </div>
      <div class="item-divider"></div>
    </div>
  `;

  return { html, teorico, real };
}

/** Genera el HTML completo para un ticket de Hammer */
export function generateHammerTicketHtml(config: HammerTicketHtmlConfig): string {
  const { documentId, items, batchInfo = '', location = '', importedAt } = config;

  const dateStr = new Date(importedAt || Date.now()).toLocaleDateString('es-ES');
  const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const itemsCount = items.length;

  let totalTeorico = 0;
  let totalReal = 0;

  const itemsHtml = items
    .map((item, index) => {
      const { html, teorico, real } = generateHammerItemHtml(item, index);
      totalTeorico += teorico;
      totalReal += real;
      return html;
    })
    .join('');

  const diferencia = totalReal - totalTeorico;
  const diferenciaClass = diferencia === 0 ? 'diff-ok' : diferencia > 0 ? 'diff-mas' : 'diff-menos';
  const diferenciaText =
    diferencia === 0 ? '0' : diferencia > 0 ? `+${diferencia}` : String(diferencia);

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>CONTEO HAMMER - ${documentId}</title>
    <style>
      @page {
        size: 80mm auto;
        margin: 0;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: 'Courier New', monospace;
        font-size: 10px;
        width: 80mm;
        margin: 0 auto;
        padding: 5px;
        background: #fff;
      }
      .header {
        text-align: center;
        margin-bottom: 8px;
        padding-bottom: 5px;
        border-bottom: 2px solid #000;
      }
      .header h1 {
        font-size: 14px;
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 3px;
      }
      .header .subtitle {
        font-size: 9px;
        font-weight: bold;
      }
      .header .meta {
        font-size: 8px;
        margin-top: 3px;
      }
      .totals-section {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
        padding: 5px;
        background: #f5f5f5;
        border: 1px solid #000;
      }
      .total-box {
        text-align: center;
      }
      .total-box .label {
        font-size: 7px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .total-box .value {
        font-size: 14px;
        font-weight: 900;
      }
      .total-box.diff .value {
        font-size: 12px;
      }
      .diff-ok .value { color: #166534; }
      .diff-mas .value { color: #1d4ed8; }
      .diff-menos .value { color: #dc2626; }
      .items-header {
        font-size: 8px;
        font-weight: bold;
        text-transform: uppercase;
        margin: 8px 0 4px 0;
        padding-bottom: 2px;
        border-bottom: 1px dashed #000;
      }
      .hammer-item {
        margin-bottom: 8px;
        page-break-inside: avoid;
      }
      .hammer-item-header {
        display: flex;
        align-items: baseline;
        gap: 5px;
        margin-bottom: 2px;
      }
      .hammer-item-num {
        font-size: 8px;
        font-weight: bold;
        color: #666;
        min-width: 20px;
      }
      .hammer-item-name {
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
        flex: 1;
        word-break: break-word;
      }
      .hammer-item-details {
        display: flex;
        justify-content: space-between;
        font-size: 8px;
        margin-bottom: 3px;
        color: #666;
      }
      .hammer-item-barcode {
        font-family: monospace;
      }
      .hammer-item-qtys {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px;
        background: #fff;
        border: 1px solid #ccc;
      }
      .qty-box {
        flex: 1;
        text-align: center;
      }
      .qty-label {
        display: block;
        font-size: 6px;
        font-weight: bold;
        color: #666;
        text-transform: uppercase;
      }
      .qty-value {
        display: block;
        font-size: 12px;
        font-weight: 900;
      }
      .qty-divider {
        font-size: 8px;
        font-weight: bold;
        color: #999;
        padding: 0 2px;
      }
      .diff-box .qty-value {
        font-size: 11px;
      }
      .item-divider {
        border-top: 1px dashed #ccc;
        margin-top: 4px;
      }
      .footer {
        margin-top: 10px;
        padding-top: 5px;
        border-top: 2px solid #000;
        text-align: center;
      }
      .footer .total-label {
        font-size: 10px;
        font-weight: bold;
        text-transform: uppercase;
      }
      .footer .items-count {
        font-size: 9px;
        margin-top: 2px;
        color: #666;
      }
      .footer .datetime {
        font-size: 8px;
        margin-top: 3px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>CONTEO HAMMER</h1>
      <div class="subtitle">${batchInfo}</div>
      <div class="meta">
        UBICACION: ${location} | FECHA: ${dateStr}
      </div>
    </div>

    <div class="totals-section">
      <div class="total-box">
        <span class="label">Total Teorico</span>
        <span class="value">${totalTeorico}</span>
      </div>
      <div class="total-box">
        <span class="label">Total Real</span>
        <span class="value">${totalReal}</span>
      </div>
      <div class="total-box diff ${diferenciaClass}">
        <span class="label">Diferencia</span>
        <span class="value">${diferenciaText}</span>
      </div>
    </div>

    <div class="items-header">
      Detalle de Items (${itemsCount})
    </div>

    <div class="items-container">
      ${itemsHtml}
    </div>

    <div class="footer">
      <div class="total-label">Fin del Reporte</div>
      <div class="items-count">${itemsCount} productos listados</div>
      <div class="datetime">Generado: ${dateStr} ${timeStr}</div>
    </div>

    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
</html>`;
}
