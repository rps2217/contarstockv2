/**
 * Expected Order HTML Generator
 * Genera el HTML para impresión de órdenes teóricas
 */

import JsBarcode from 'jsbarcode';
import type { PrintItem, OrderMetadata } from './thermalTypes';

/** Configuración para generación de HTML de orden esperada */
interface ExpectedOrderHtmlConfig {
  documentId: string;
  items: PrintItem[];
  metadata?: OrderMetadata;
  importedAt?: number;
}

/** Obtiene el título principal basado en el tipo de documento */
function getMainHeading(docType: string): string {
  const lowerDocType = docType.toLowerCase();

  if (lowerDocType.includes('factura')) return 'FACTURA';
  if (lowerDocType.includes('remisión') || lowerDocType.includes('remision'))
    return 'GUÍA DE DESPACHO';
  if (
    lowerDocType.includes('guía') ||
    lowerDocType.includes('guia') ||
    lowerDocType.includes('despacho')
  )
    return 'GUÍA DE DESPACHO';
  if (lowerDocType.includes('picking')) return 'PICKING LIST';
  if (lowerDocType.includes('manifiesto')) return 'MANIFIESTO DE CARGA';
  if (lowerDocType.includes('inventario')) return 'INVENTARIO TEÓRICO';
  return docType.toUpperCase() || 'CARGA TEÓRICA';
}

/** Verifica si el documento es una guía de despacho */
function isGuiaDespacho(docType: string): boolean {
  const lower = docType.toLowerCase();
  return (
    lower === 'remisión' ||
    lower.includes('guía') ||
    lower.includes('guia') ||
    lower.includes('despacho')
  );
}

/** Verifica si es un picking list */
function isPickingList(docType: string): boolean {
  return docType.toLowerCase().includes('picking');
}

/** Genera el código de barras como DataURL */
function getBarcodeDataUrl(barcode: string, height: number = 28): string {
  if (!barcode) return '';
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, barcode, {
      format: 'CODE128',
      width: 2,
      height: height,
      displayValue: false,
      fontSize: 10,
      font: 'monospace',
      fontOptions: 'bold',
      textMargin: 3,
      margin: 2,
      background: '#ffffff',
      lineColor: '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

/** Genera el HTML para un item individual */
function generateItemHtml(item: PrintItem, isGuiaDespachoDoc: boolean, isPicking: boolean): string {
  const barcodeValue = isGuiaDespachoDoc ? `${item.expectedQty || 0}\t\t\t\t\t\t\t` : item.barcode;
  const barcodeUrl = isPicking ? '' : getBarcodeDataUrl(barcodeValue, 28);

  const guiaDespachoHint = isGuiaDespachoDoc
    ? `<div style="text-align: center; font-size: 7px; font-family: monospace; color: #444; margin-top: -2px; font-weight: bold; text-transform: uppercase;">
         [TECLADO RÁPIDO: CANT + 7 TABS]
       </div>`
    : '';

  return `
    <div class="item-block ${isPicking ? 'picking-item' : ''}">
      <div class="item-title">${item.name || 'SIN DESCRIPCIÓN'}</div>
      
      <div class="item-meta">
        <div class="item-id-box">
          ID: ${item.barcode}
        </div>
        <div class="item-qty-box">
          ${item.expectedQty || 0}
        </div>
      </div>

      ${
        barcodeUrl
          ? `
        <div class="barcode-container">
          <img src="${barcodeUrl}" alt="${item.barcode}" class="barcode-img" />
        </div>
        ${guiaDespachoHint}
      `
          : ''
      }
      
      <div class="item-divider"></div>
    </div>
  `;
}

/** Genera el HTML completo para una orden esperada */
export function generateExpectedOrderHtml(config: ExpectedOrderHtmlConfig): string {
  const { documentId, items, metadata, importedAt } = config;

  const title = metadata?.documentType || 'CARGA TEÓRICA';
  const docType = metadata?.documentType || '';
  const dateStr = metadata?.date || new Date(importedAt || Date.now()).toLocaleDateString('es-ES');
  const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const currentFullDate = new Date().toLocaleDateString('es-ES') + ' ' + timeStr;
  const itemsCount = items.length;

  const mainHeading = getMainHeading(docType);
  const guiaDespachoDoc = isGuiaDespacho(docType);
  const pickingListDoc = isPickingList(docType);

  const itemsHtml = items
    .map(item => generateItemHtml(item, guiaDespachoDoc, pickingListDoc))
    .join('');

  const purchaseOrderMeta = metadata?.purchaseOrder
    ? `<div class="purchase-order-large">OC: ${metadata.purchaseOrder}</div>`
    : '';
  const orderNoteMeta = metadata?.orderNote ? `NOTA: ${metadata.orderNote}<br/>` : '';

  const guiaDespachoHeader = guiaDespachoDoc
    ? `<div style="font-[7px] font-weight: bold; margin-bottom: 2px; text-transform: uppercase; color: #333;">
         MODO TECLADO: CANT + 7 TABS
       </div>`
    : '';

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${title} - ${documentId}</title>
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
      }
      body {
        width: 72mm;
        margin: 0 auto;
        padding: 15px;
        font-family: Arial, sans-serif;
        font-size: 11px;
        line-height: 1.4;
        color: #000;
        background: #fff;
        box-sizing: border-box;
      }
      .header-print {
        text-align: center;
        margin-bottom: 8px;
      }
      .header-print h1 {
        font-size: 16px;
        font-weight: 900;
        margin: 0 0 2px 0;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      .header-print h2 {
        font-size: 12px;
        font-weight: 800;
        margin: 0 0 4px 0;
        text-transform: uppercase;
        letter-spacing: 0.2px;
      }
      .header-print .date {
        font-size: 10px;
        font-weight: bold;
        margin: 0;
        text-transform: uppercase;
      }
      .header-line {
        border-top: 3px solid #000;
        margin: 8px 0;
        height: 0;
      }
      .item-block {
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      .item-title {
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 4px;
        word-wrap: break-word;
      }
      .item-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
        font-size: 10px;
        font-weight: bold;
      }
      .item-id-box {
        border: 1px solid #000;
        padding: 2px 5px;
        font-family: monospace;
        text-transform: uppercase;
      }
      .item-qty-box {
        font-size: 18px;
        font-weight: 900;
        text-transform: uppercase;
        border: 1.5px solid #888;
        padding: 2px 8px;
        background-color: #fff;
        color: #000;
        border-radius: 4px;
      }
      .barcode-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 4px 0;
      }
      .barcode-img {
        max-height: 300px;
        max-height: 28px;
        max-width: 100%;
        width: auto;
        height: auto;
        display: block;
        image-rendering: pixelated;
        image-rendering: crisp-edges;
      }
      .item-divider {
        border-top: 1px solid #000;
        margin-top: 10px;
        height: 0;
      }
      .purchase-order-large {
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 0.5px;
      }
      .picking-item {
        margin-bottom: 6px;
      }
      .picking-item .item-title {
        font-size: 11px;
        margin-bottom: 2px;
      }
      .picking-item .item-meta {
        margin-bottom: 3px;
      }
      .picking-item .item-divider {
        margin-top: 5px;
      }
      .meta-info-picking {
        font-size: 11px;
      }
      .bottom-summary {
        text-align: center;
        margin-top: 20px;
        font-weight: bold;
        page-break-inside: avoid;
      }
      .summary-total {
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .summary-date {
        font-size: 9px;
        font-family: monospace;
      }
      .bottom-line {
        border-top: 3px solid #000;
        margin: 10px 0;
        height: 0;
      }
    </style>
  </head>
  <body>
    <div class="header-print">
      <h1>${mainHeading}</h1>
      <h2>Nº DOC: ${documentId}</h2>
      ${guiaDespachoHeader}
      <div class="date">${dateStr}</div>
    </div>
    
    <div class="header-line"></div>

    <div class="meta-info ${pickingListDoc ? 'meta-info-picking' : ''}" style="${pickingListDoc ? '' : 'font-size: 10px;'} font-weight: bold; margin-bottom: 12px; font-family: monospace; text-transform: uppercase; line-height: 1.4;">
      ${purchaseOrderMeta}
      ${orderNoteMeta}
    </div>

    <div class="items-container">
      ${itemsHtml}
    </div>

    <div class="bottom-line"></div>

    <div class="bottom-summary">
      <div class="summary-total">TOTAL PRODUCTOS: ${itemsCount}</div>
      <div class="summary-date">${currentFullDate}</div>
    </div>

    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
</html>`;
}
