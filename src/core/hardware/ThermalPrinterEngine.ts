import { logger } from '@/services/logger';
/**
 * LOGICOUNT PRO - THERMAL ENGINE v1.2
 * Soporte dual: WebUSB (PC) + Web Bluetooth (Android/Mobile)
 */

import JsBarcode from 'jsbarcode';
import {
  generateReportHtml80mm,
  generateBarcodeDataUrl,
} from './thermal-print/reportHtmlGenerator';

// ============================================================================
// TIPOS
// ============================================================================

interface USBDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(
    endpointNumber: number,
    data: BufferSource
  ): Promise<{ bytesWritten: number; status: string }>;
  opened: boolean;
  productName?: string;
  configuration?: {
    interfaces: Array<{
      interfaceNumber: number;
      alternates: Array<{
        interfaceClass: number;
        endpoints: Array<{
          endpointNumber: number;
          direction: 'in' | 'out';
        }>;
      }>;
    }>;
  };
}

/** Item de reporte para impresión térmica */
interface PrintItem {
  barcode: string;
  productName?: string;
  name?: string;
  expectedQty?: number;
  expectedQuantity?: number;
  quantity?: number;
  totalQuantity?: number;
  loc?: string;
}

/** Item para reportes HTML (requerido por generateReportHtml80mm) */
interface ReportItem {
  barcode: string;
  productName?: string;
  expectedQuantity?: number;
  totalQuantity: number;
}

/** Metadatos de orden para impresión */
interface OrderMetadata {
  documentType?: string;
  date?: string;
  [key: string]: unknown;
}

/** Orden completa para impresión */
interface PrintOrder {
  id: string;
  items?: PrintItem[];
  metadata?: OrderMetadata;
  importedAt?: number;
}

/** Dispositivo Bluetooth */
interface BLEDevice {
  name?: string;
  gatt?: {
    connected?: boolean;
    connect(): Promise<BLEServer>;
    disconnect(): void;
  };
}

/** Servicio Bluetooth GATT */
interface BLEServer {
  getPrimaryService(uuid: string): Promise<BLEService>;
}

/** Servicio Bluetooth */
interface BLEService {
  getCharacteristic(uuid: string): Promise<BLECharacteristic>;
  getCharacteristics(): Promise<BLECharacteristic[]>;
}

/** Característica Bluetooth */
interface BLECharacteristic {
  writeValue(data: BufferSource): Promise<void>;
  startNotifications(): void;
  stopNotifications(): void;
  value?: DataView;
  properties?: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
}

/** Navegador con soporte WebUSB */
interface USBNavigator extends Navigator {
  usb: {
    requestDevice(options: { filters: unknown[] }): Promise<USBDevice>;
    getDevices(): Promise<USBDevice[]>;
  };
}

export class ThermalPrinterEngine {
  private usbDevice: USBDevice | null = null;
  private endpointOut: number | null = null;

  // Bluetooth State
  private bleCharacteristic: BLECharacteristic | null = null;
  private bleDevice: BLEDevice | null = null;

  async connectUSB(): Promise<boolean> {
    try {
      if (!navigator || !('usb' in navigator)) {
        throw new Error('WebUSB no es compatible con este navegador o entorno.');
      }
      const usbNav = navigator as USBNavigator;
      this.usbDevice = await usbNav.usb.requestDevice({ filters: [] });
      if (!this.usbDevice) return false;

      await this.usbDevice.open();
      await this.usbDevice.selectConfiguration(1);
      const interfaceNum =
        this.usbDevice.configuration?.interfaces.find(i => i.alternates[0].interfaceClass === 7)
          ?.interfaceNumber || 0;
      await this.usbDevice.claimInterface(interfaceNum);
      const endpoint = this.usbDevice.configuration?.interfaces[
        interfaceNum
      ].alternates[0].endpoints.find(e => e.direction === 'out');
      if (!endpoint) throw new Error('No output channel found.');
      this.endpointOut = endpoint.endpointNumber;
      return true;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const isSecurity =
        error.name === 'SecurityError' ||
        error.message.includes('permissions policy') ||
        error.message.includes('disallowed');
      if (isSecurity) {
        logger.warn('ThermalPrinterEngine', 'USB blocked by security policy');
        throw new Error(
          'El acceso USB está restringido por la directiva de seguridad del navegador. Abre la aplicación en una pestaña nueva para poder vincular la impresora.'
        );
      }
      logger.warn('ThermalPrinterEngine', 'USB connection error', error.message);
      throw err;
    }
  }

  async connectBluetooth(): Promise<boolean> {
    try {
      if (!navigator || !('bluetooth' in navigator)) {
        throw new Error('WebBluetooth no es compatible con este navegador o entorno.');
      }
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'SLK' },
          { namePrefix: 'Sewoo' },
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] },
        ],
        optionalServices: [
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        ],
      });

      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writeChar = characteristics.find(
          (c: BLECharacteristic) => c.properties?.write || c.properties?.writeWithoutResponse
        );
        if (writeChar) {
          this.bleCharacteristic = writeChar;
          this.bleDevice = device;
          return true;
        }
      }
      return false;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const isSecurity =
        error.name === 'SecurityError' ||
        error.message.includes('permissions policy') ||
        error.message.includes('disallowed');
      if (isSecurity) {
        logger.warn('ThermalPrinterEngine', 'Bluetooth blocked by security policy');
        throw new Error(
          'El acceso Bluetooth está restringido por la directiva de seguridad del navegador. Abre la aplicación en una pestaña nueva para poder vincular la impresora.'
        );
      }
      logger.warn('ThermalPrinterEngine', 'Bluetooth connection error', error.message);
      throw err;
    }
  }

  async printRaw(data: Uint8Array) {
    if (this.usbDevice && this.endpointOut !== null) {
      await this.usbDevice.transferOut(this.endpointOut, data as any);
      return;
    }

    if (this.bleCharacteristic) {
      const MTU = 20;
      for (let i = 0; i < data.length; i += MTU) {
        const chunk = data.slice(i, i + MTU);
        await this.bleCharacteristic.writeValue(chunk);
      }
    }
  }

  async printLabel(sku: string, description: string, qty: number) {
    const encoder = new TextEncoder();
    const esc = {
      init: [0x1b, 0x40],
      alignCenter: [0x1b, 0x61, 1],
      boldOn: [0x1b, 0x45, 1],
      boldOff: [0x1b, 0x45, 0],
      sizeBig: [0x1d, 0x21, 0x11],
      sizeNormal: [0x1d, 0x21, 0x00],
      feed: [0x0a, 0x0a, 0x0a],
      cut: [0x1d, 0x56, 0x42, 0x00],
    };

    const commands = new Uint8Array([
      ...esc.init,
      ...esc.alignCenter,
      ...esc.boldOn,
      ...encoder.encode('LOGICOUNT PRO\\n'),
      ...esc.boldOff,
      ...encoder.encode('--------------------------------\\n'),
      ...esc.sizeBig,
      ...encoder.encode(`${sku}\\n`),
      ...esc.sizeNormal,
      ...encoder.encode(`${description.substring(0, 32)}\\n`),
      ...esc.boldOn,
      ...encoder.encode(`CANTIDAD: ${qty} UNID.\\n`),
      ...esc.boldOff,
      ...encoder.encode(`${new Date().toLocaleString()}\\n`),
      ...esc.feed,
      ...esc.cut,
    ]);

    await this.printRaw(commands);
  }

  async printSummaryReport(erp: string, label: string, items: PrintItem[]) {
    if (this.isConnected()) {
      const encoder = new TextEncoder();
      const esc = {
        init: [0x1b, 0x40],
        alignCenter: [0x1b, 0x61, 1],
        alignLeft: [0x1b, 0x61, 0],
        boldOn: [0x1b, 0x45, 1],
        boldOff: [0x1b, 0x45, 0],
        sizeNormal: [0x1d, 0x21, 0x00],
        feed: [0x0a, 0x0a, 0x0a, 0x0a],
        cut: [0x1d, 0x56, 0x42, 0x00],
      };

      let content = [
        ...esc.init,
        ...esc.alignCenter,
        ...esc.boldOn,
        ...encoder.encode('MANIFIESTO DE CARGA\\n'),
        ...encoder.encode('LOGICOUNT PRO v4.5\\n'),
        ...esc.boldOff,
        ...encoder.encode('--------------------------------\\n'),
        ...esc.alignLeft,
        ...encoder.encode(`ORDEN ERP: ${erp}\\n`),
        ...encoder.encode(`BULTOS : ${label}\\n`),
        ...encoder.encode(`FECHA : ${new Date().toLocaleString()}\\n`),
        ...encoder.encode('--------------------------------\\n'),
        ...esc.boldOn,
        ...encoder.encode('DESC | SKU\\n'),
        ...encoder.encode('TEO REAL DIFF\\n'),
        ...esc.boldOff,
        ...encoder.encode('--------------------------------\\n'),
      ];

      items.forEach(item => {
        const sku = item.barcode.padEnd(20);
        const name = (item.productName || 'SIN_DESC').substring(0, 32);
        const theoVal = item.expectedQuantity || item.expectedQty || 0;
        const realVal = item.totalQuantity || item.quantity || 0;
        const theo = String(theoVal).padStart(5);
        const real = String(realVal).padStart(7);
        const diff = String(realVal - theoVal).padStart(7);

        const row = [
          ...encoder.encode(`${name}\\n`),
          ...encoder.encode(`${sku}\\n`),
          ...encoder.encode(`${theo} ${real} ${diff}\\n`),
          ...encoder.encode('- - - - - - - - - - - - - - - -\\n'),
        ];
        content.push(...row);
      });

      const totalReal = items.reduce((acc, i) => acc + (i.totalQuantity || i.quantity || 0), 0);
      const footer = [
        ...esc.boldOn,
        ...encoder.encode(`TOTAL UNIDADES: ${totalReal}\\n`),
        ...esc.boldOff,
        ...encoder.encode('--------------------------------\\n'),
        ...encoder.encode('\\n\\n__________________________\\n'),
        ...esc.alignCenter,
        ...encoder.encode('FIRMA AUDITORIA\\n'),
        ...esc.feed,
        ...esc.cut,
      ];

      await this.printRaw(new Uint8Array([...content, ...footer]));
    } else {
      // Formato rollo térmico de 80mm via iframe de impresión para inmunidad a popup-blockers
      this.printViaIframe80mm(erp, label, items);
    }
  }

  private printViaIframe80mm(erp: string, label: string, items: PrintItem[]) {
    // 1. Quitar residuo previo
    const oldIframe = document.getElementById('thermal-print-iframe');
    if (oldIframe) {
      oldIframe.parentNode?.removeChild(oldIframe);
    }

    // 2. Crear iframe invisible
    const iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      logger.error('ThermalPrinterEngine', 'No se pudo iniciar el canal de impresión nativa');
      return;
    }

    // Generar HTML usando el helper (transformar PrintItem a ReportItem)
    const reportItems: ReportItem[] = items.map(item => ({
      barcode: item.barcode,
      productName: item.productName,
      expectedQuantity: item.expectedQuantity || item.expectedQty || 0,
      totalQuantity: item.totalQuantity || item.quantity || 0,
    }));
    const htmlContent = generateReportHtml80mm({ erp, label, items: reportItems });

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
    }, 100);
  }

  public printExpectedOrder(order: PrintOrder) {
    // 1. Quitar residuo previo
    const oldIframe = document.getElementById('thermal-print-iframe');
    if (oldIframe) {
      oldIframe.parentNode?.removeChild(oldIframe);
    }

    // 2. Crear iframe invisible
    const iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      logger.error('ThermalPrinterEngine', 'No se pudo iniciar el canal de impresión nativa');
      return;
    }

    const title = order.metadata?.documentType || 'CARGA TEÓRICA';
    const documentId = order.id;
    const itemsCount = order.items?.length || 0;
    const dateStr =
      order.metadata?.date || new Date(order.importedAt || Date.now()).toLocaleDateString('es-ES');
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const currentFullDate = new Date().toLocaleDateString('es-ES') + ' ' + timeStr;

    const docType = order.metadata?.documentType || '';
    const isGuiaDespacho =
      docType === 'Remisión' ||
      docType.toLowerCase().includes('guía') ||
      docType.toLowerCase().includes('guia') ||
      docType.toLowerCase().includes('despacho');

    const userDocType = order.metadata?.documentType || 'CARGA TEÓRICA';
    const isPickingList = userDocType.toLowerCase().includes('picking');

    let mainHeading = 'CARGA TEÓRICA';

    if (userDocType.toLowerCase().includes('factura')) {
      mainHeading = 'FACTURA';
    } else if (
      userDocType.toLowerCase().includes('remisión') ||
      userDocType.toLowerCase().includes('remision') ||
      userDocType.toLowerCase().includes('guía') ||
      userDocType.toLowerCase().includes('guia') ||
      userDocType.toLowerCase().includes('despacho')
    ) {
      mainHeading = 'GUÍA DE DESPACHO';
    } else if (isPickingList) {
      mainHeading = 'PICKING LIST';
    } else if (userDocType.toLowerCase().includes('manifiesto')) {
      mainHeading = 'MANIFIESTO DE CARGA';
    } else if (userDocType.toLowerCase().includes('inventario')) {
      mainHeading = 'INVENTARIO TEÓRICO';
    } else {
      mainHeading = userDocType.toUpperCase();
    }

    const itemsHtml = (order.items || [])
      .map((item: PrintItem) => {
        // If it's a Guía de Despacho, we encode the expected quantity and 7 tabs
        const barcodeValue = isGuiaDespacho
          ? `${item.expectedQty || 0}\t\t\t\t\t\t\t`
          : item.barcode;

        // For picking list, skip barcode generation to save paper
        const barcodeUrl = isPickingList ? '' : this.getBarcodeDataUrl(barcodeValue, false, 28);

        return `
        <div class="item-block ${isPickingList ? 'picking-item' : ''}">
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
            ${
              isGuiaDespacho
                ? `
              <div style="text-align: center; font-size: 7px; font-family: monospace; color: #444; margin-top: -2px; font-weight: bold; text-transform: uppercase;">
                [TECLADO RÁPIDO: CANT + 7 TABS]
              </div>
            `
                : ''
            }
          `
              : ''
          }
          
          <div class="item-divider"></div>
        </div>
      `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
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
            /* Estilos para orden de compra ampliada */
            .purchase-order-large {
              font-size: 14px;
              font-weight: 900;
              letter-spacing: 0.5px;
            }
            /* Estilos para Picking List - reduce alto para ahorrar papel */
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
            ${
              isGuiaDespacho
                ? `
              <div style="font-[7px] font-weight: bold; margin-bottom: 2px; text-transform: uppercase; color: #333;">
                MODO TECLADO: CANT + 7 TABS
              </div>
            `
                : ''
            }
            <div class="date">${dateStr}</div>
          </div>
          
          <div class="header-line"></div>

          <div class="meta-info ${isPickingList ? 'meta-info-picking' : ''}" style="${isPickingList ? '' : 'font-size: 10px;'} font-weight: bold; margin-bottom: 12px; font-family: monospace; text-transform: uppercase; line-height: 1.4;">
            ${order.metadata?.purchaseOrder ? `<div class="purchase-order-large">OC: ${order.metadata.purchaseOrder}</div>` : ''}
            ${order.metadata?.orderNote ? `NOTA: ${order.metadata.orderNote}<br/>` : ''}
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
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
    }, 120);
  }

  public getBarcodeDataUrl(
    barcode: string,
    displayValue: boolean = true,
    height: number = 45
  ): string {
    if (!barcode) return '';
    try {
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, barcode, {
        format: 'CODE128',
        width: 2,
        height: height,
        displayValue: displayValue,
        fontSize: 10,
        font: 'monospace',
        fontOptions: 'bold',
        textMargin: 3,
        margin: 2,
        background: '#ffffff',
        lineColor: '#000000',
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
      logger.warn('ThermalPrinterEngine', 'Could not generate barcode with JSBarcode', {
        barcode,
        error: err instanceof Error ? err.message : String(err),
      });
      return '';
    }
  }

  /**
   * Imprimir ticket de conteo HAMMER con TEORICO vs REAL
   */
  public printHammerTicket(order: PrintOrder) {
    // 1. Quitar residuo previo
    const oldIframe = document.getElementById('thermal-print-iframe');
    if (oldIframe) {
      oldIframe.parentNode?.removeChild(oldIframe);
    }

    // 2. Crear iframe invisible
    const iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      logger.error('ThermalPrinterEngine', 'No se pudo iniciar el canal de impresion nativa');
      return;
    }

    const title = order.metadata?.documentType || 'CONTEO HAMMER';
    const documentId = order.id;
    const itemsCount = order.items?.length || 0;
    const dateStr = new Date().toLocaleDateString('es-ES');
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const location = order.metadata?.purchaseOrder || 'ZONA-A';
    const batchInfo = order.metadata?.internalGuide || `Lote: ${documentId}`;

    // Calcular totales
    const totalTeorico = (order.items || []).reduce(
      (acc: number, item: PrintItem) => acc + (item.expectedQty || 0),
      0
    );
    const totalReal = (order.items || []).reduce(
      (acc: number, item: PrintItem) => acc + (item.quantity || item.totalQuantity || 0),
      0
    );
    const diferencia = totalReal - totalTeorico;

    // Generar HTML de items
    const itemsHtml = (order.items || [])
      .map((item: PrintItem, index: number) => {
        const teorico = item.expectedQty || 0;
        const real = item.quantity || item.totalQuantity || 0;
        const diff = real - teorico;
        const diffClass = diff === 0 ? 'diff-ok' : diff > 0 ? 'diff-mas' : 'diff-menos';
        const diffText = diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`;

        return `
        <div class="hammer-item">
          <div class="hammer-item-header">
            <span class="hammer-item-num">${index + 1}</span>
            <span class="hammer-item-name">${item.name || 'SIN DESCRIPCION'}</span>
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
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title} - ${documentId}</title>
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
            <div class="total-box diff ${diferencia === 0 ? 'diff-ok' : diferencia > 0 ? 'diff-mas' : 'diff-menos'}">
              <span class="label">Diferencia</span>
              <span class="value">${diferencia === 0 ? '0' : diferencia > 0 ? '+' + diferencia : diferencia}</span>
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
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
    }, 120);
  }

  isConnected(): boolean {
    const usbOk = !!this.usbDevice && this.usbDevice.opened;
    const bleOk = !!this.bleDevice?.gatt?.connected;
    return usbOk || bleOk;
  }

  getDeviceName(): string {
    if (this.usbDevice) return this.usbDevice.productName || 'Sewoo USB';
    if (this.bleDevice) return this.bleDevice.name || 'Sewoo Bluetooth';
    return 'Desconocido';
  }
}

export const thermalPrinter = new ThermalPrinterEngine();
