/**
 * Thermal Report HTML Generator
 * Genera el HTML para reportes de impresoras térmicas 80mm
 */

import JsBarcode from 'jsbarcode';

/**
 * Genera una URL de datos para un código de barras
 */
export function generateBarcodeDataUrl(barcode: string, height: number = 45): string {
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcode, {
      format: 'CODE128',
      height: height,
      width: 2,
      displayValue: false,
      margin: 0,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

interface ReportItem {
  barcode: string;
  productName?: string;
  expectedQuantity?: number;
  totalQuantity: number;
}

interface ReportData {
  erp: string;
  label: string;
  items: ReportItem[];
}

/**
 * Genera el HTML para un reporte de manifiesto de carga (80mm)
 */
export function generateReportHtml80mm(data: ReportData): string {
  const totalReal = data.items.reduce((acc, i) => acc + i.totalQuantity, 0);
  const dateStr = new Date().toLocaleString('es-ES');

  const rowsHtml = data.items
    .map(item => {
      const diff = item.totalQuantity - (item.expectedQuantity || 0);
      const diffSigned = diff > 0 ? `+${diff}` : String(diff);
      const diffClass =
        diff === 0
          ? ''
          : diff > 0
            ? 'color: #059669; font-weight: bold;'
            : 'color: #dc2626; font-weight: bold;';

      const barcodeDataUrl = generateBarcodeDataUrl(item.barcode);

      return `
      <tr class="item-row">
        <td colspan="4" style="font-weight: bold; font-size: 11px; padding-top: 6px; padding-bottom: 2px;">
          ${item.productName || 'SIN DESCRIPCIÓN'}
        </td>
      </tr>
      <tr class="item-subrow" style="border-bottom: 1px dashed #ccc;">
        <td style="padding-bottom: 6px; vertical-align: middle;">
          ${
            barcodeDataUrl
              ? `
            <img src="${barcodeDataUrl}" alt="${item.barcode}" style="max-height: 42px; max-width: 145px; width: auto; height: auto; display: block; image-rendering: pixelated; image-rendering: crisp-edges; background: #ffffff;" />
          `
              : `
            <span style="font-size: 9px; font-family: monospace; color: #4b5563;">${item.barcode}</span>
          `
          }
        </td>
        <td class="text-right" style="font-size: 11px; padding-bottom: 6px; font-family: monospace; vertical-align: middle;">
          ${item.expectedQuantity || 0}
        </td>
        <td class="text-right" style="font-size: 11px; padding-bottom: 6px; font-weight: bold; font-family: monospace; vertical-align: middle;">
          ${item.totalQuantity || 0}
        </td>
        <td class="text-right" style="font-size: 11px; padding-bottom: 6px; ${diffClass} font-family: monospace; vertical-align: middle;">
          ${diffSigned}
        </td>
      </tr>
    `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Manifiesto de Carga - Rollo 80mm</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          @media print {
            body {
              width: 72mm;
              margin: 0;
              padding: 10px 4mm;
              background-color: white;
              color: black;
            }
            .no-print {
              display: none !important;
            }
          }
          body {
            width: 72mm;
            margin: 0 auto;
            padding: 15px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.35;
            color: #000;
            background: #fff;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 12px;
          }
          .header h1 {
            font-size: 13px;
            font-weight: 900;
            margin: 0 0 2px 0;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 11px;
            font-weight: 800;
            margin: 0 0 5px 0;
            text-transform: uppercase;
          }
          .header p {
            font-size: 9px;
            margin: 0;
            color: #4b5563;
          }
          .divider {
            border-top: 1px dashed #000;
            margin: 8px 0;
            height: 0;
          }
          .double-divider {
            border-top: 1px double #000;
            margin: 8px 0;
            height: 0;
          }
          .meta-section {
            margin-bottom: 12px;
            font-size: 10px;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
          }
          .meta-label {
            font-weight: bold;
            text-transform: uppercase;
          }
          .meta-value {
            text-align: right;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          .items-table th {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9px;
            padding-bottom: 4px;
            border-bottom: 1px solid #000;
          }
          .text-right {
            text-align: right;
            white-space: nowrap;
          }
          .total-row {
            border-top: 2px solid #000;
          }
          .total-row td {
            font-weight: bold;
            padding-top: 6px;
          }
          .footer {
            margin-top: 12px;
            font-size: 9px;
            color: #6b7280;
            text-align: center;
          }
          .pos-notice {
            font-size: 8px;
            color: #9ca3af;
            text-align: center;
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${data.label || 'Manifiesto de Carga'}</h1>
          <h2>${data.erp || 'Logicount Pro'}</h2>
          <p>${dateStr}</p>
        </div>

        <div class="double-divider"></div>

        <div class="meta-section">
          <div class="meta-row">
            <span class="meta-label">SKU's:</span>
            <span class="meta-value">${data.items.length}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Total und:</span>
            <span class="meta-value">${totalReal}</span>
          </div>
        </div>

        <div class="divider"></div>

        <table class="items-table">
          <thead>
            <tr>
              <th>Codigo</th>
              <th class="text-right">Teorico</th>
              <th class="text-right">Real</th>
              <th class="text-right">Dif</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="total-row">
              <td colspan="2">TOTAL</td>
              <td class="text-right">${totalReal}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="footer">
          Generado por Logicount Pro<br/>
          Impresion termica 80mm
        </div>

        <div class="pos-notice">
          Ajustado para rollo estándar de 80mm
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;
}

export default {
  generateBarcodeDataUrl,
  generateReportHtml80mm,
};
