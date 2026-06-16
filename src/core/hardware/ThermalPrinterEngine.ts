/**
 * LOGICOUNT PRO - THERMAL ENGINE v1.2
 * Soporte dual: WebUSB (PC) + Web Bluetooth (Android/Mobile)
 */

// @ts-ignore
import JsBarcode from 'jsbarcode';

interface USBDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<{ bytesWritten: number; status: string }>;
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

export class ThermalPrinterEngine {
  private usbDevice: USBDevice | null = null;
  private endpointOut: number | null = null;
  
  // Bluetooth State
  private bleCharacteristic: any = null;
  private bleDevice: any = null;

  async connectUSB(): Promise<boolean> {
    try {
      if (!navigator || !('usb' in navigator)) {
        throw new Error("WebUSB no es compatible con este navegador o entorno.");
      }
      this.usbDevice = await (navigator as any).usb.requestDevice({ filters: [] });
      if (!this.usbDevice) return false;
      
      await this.usbDevice.open();
      await this.usbDevice.selectConfiguration(1);
      const interfaceNum = this.usbDevice.configuration?.interfaces.find(i => i.alternates[0].interfaceClass === 7)?.interfaceNumber || 0;
      await this.usbDevice.claimInterface(interfaceNum);
      const endpoint = this.usbDevice.configuration?.interfaces[interfaceNum].alternates[0].endpoints.find(e => e.direction === 'out');
      if (!endpoint) throw new Error("No output channel found.");
      this.endpointOut = endpoint.endpointNumber;
      return true;
    } catch (err: any) {
      const isSecurity = err?.name === 'SecurityError' || String(err?.message || '').includes('permissions policy') || String(err?.message || '').includes('disallowed');
      if (isSecurity) {
        console.warn("[USB] Bloqueado por política de seguridad (iframe o permisos).");
        throw new Error("El acceso USB está restringido por la directiva de seguridad del navegador. Abre la aplicación en una pestaña nueva para poder vincular la impresora.");
      }
      console.warn("[USB] Error de conexión:", err?.message || err);
      throw err;
    }
  }

  async connectBluetooth(): Promise<boolean> {
    try {
      if (!navigator || !('bluetooth' in navigator)) {
        throw new Error("WebBluetooth no es compatible con este navegador o entorno.");
      }
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'SLK' },
          { namePrefix: 'Sewoo' },
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] }
        ],
        optionalServices: ['49535343-fe7d-4ae5-8fa9-9fafd205e455', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
      });

      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writeChar = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
        if (writeChar) {
          this.bleCharacteristic = writeChar;
          this.bleDevice = device;
          return true;
        }
      }
      return false;
    } catch (err: any) {
      const isSecurity = err?.name === 'SecurityError' || String(err?.message || '').includes('permissions policy') || String(err?.message || '').includes('disallowed');
      if (isSecurity) {
        console.warn("[Bluetooth] Bloqueado por política de seguridad (iframe o permisos).");
        throw new Error("El acceso Bluetooth está restringido por la directiva de seguridad del navegador. Abre la aplicación en una pestaña nueva para poder vincular la impresora.");
      }
      console.warn("[Bluetooth] Error de conexión:", err?.message || err);
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
      cut: [0x1d, 0x56, 0x42, 0x00]
    };

    const commands = new Uint8Array([
      ...esc.init,
      ...esc.alignCenter,
      ...esc.boldOn,
      ...encoder.encode("LOGICOUNT PRO\\n"),
      ...esc.boldOff,
      ...encoder.encode("--------------------------------\\n"),
      ...esc.sizeBig,
      ...encoder.encode(`${sku}\\n`),
      ...esc.sizeNormal,
      ...encoder.encode(`${description.substring(0, 32)}\\n`),
      ...esc.boldOn,
      ...encoder.encode(`CANTIDAD: ${qty} UNID.\\n`),
      ...esc.boldOff,
      ...encoder.encode(`${new Date().toLocaleString()}\\n`),
      ...esc.feed,
      ...esc.cut
    ]);

    await this.printRaw(commands);
  }

  async printSummaryReport(erp: string, label: string, items: any[]) {
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
        cut: [0x1d, 0x56, 0x42, 0x00]
      };

      let content = [
        ...esc.init,
        ...esc.alignCenter,
        ...esc.boldOn,
        ...encoder.encode("MANIFIESTO DE CARGA\\n"),
        ...encoder.encode("LOGICOUNT PRO v4.5\\n"),
        ...esc.boldOff,
        ...encoder.encode("--------------------------------\\n"),
        ...esc.alignLeft,
        ...encoder.encode(`ORDEN ERP: ${erp}\\n`),
        ...encoder.encode(`BULTOS : ${label}\\n`),
        ...encoder.encode(`FECHA : ${new Date().toLocaleString()}\\n`),
        ...encoder.encode("--------------------------------\\n"),
        ...esc.boldOn,
        ...encoder.encode("DESC | SKU\\n"),
        ...encoder.encode("TEO REAL DIFF\\n"),
        ...esc.boldOff,
        ...encoder.encode("--------------------------------\\n")
      ];

      items.forEach(item => {
        const sku = item.barcode.padEnd(20);
        const name = (item.productName || 'SIN_DESC').substring(0, 32);
        const theo = String(item.expectedQuantity || 0).padStart(5);
        const real = String(item.totalQuantity || 0).padStart(7);
        const diff = String(item.totalQuantity - (item.expectedQuantity || 0)).padStart(7);

        const row = [
          ...encoder.encode(`${name}\\n`),
          ...encoder.encode(`${sku}\\n`),
          ...encoder.encode(`${theo} ${real} ${diff}\\n`),
          ...encoder.encode("- - - - - - - - - - - - - - - -\\n")
        ];
        content.push(...row);
      });

      const totalReal = items.reduce((acc, i) => acc + i.totalQuantity, 0);
      const footer = [
        ...esc.boldOn,
        ...encoder.encode(`TOTAL UNIDADES: ${totalReal}\\n`),
        ...esc.boldOff,
        ...encoder.encode("--------------------------------\\n"),
        ...encoder.encode("\\n\\n__________________________\\n"),
        ...esc.alignCenter,
        ...encoder.encode("FIRMA AUDITORIA\\n"),
        ...esc.feed,
        ...esc.cut
      ];

      await this.printRaw(new Uint8Array([...content, ...footer]));
    } else {
      // Formato rollo térmico de 80mm via iframe de impresión para inmunidad a popup-blockers
      this.printViaIframe80mm(erp, label, items);
    }
  }

  private printViaIframe80mm(erp: string, label: string, items: any[]) {
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
      console.error("No se pudo iniciar el canal de impresión nativa.");
      return;
    }

    const totalReal = items.reduce((acc, i) => acc + i.totalQuantity, 0);
    const dateStr = new Date().toLocaleString('es-ES');

    const rowsHtml = items.map(item => {
      const diff = item.totalQuantity - (item.expectedQuantity || 0);
      const diffSigned = diff > 0 ? `+${diff}` : String(diff);
      const diffClass = diff === 0 ? '' : diff > 0 ? 'color: #059669; font-weight: bold;' : 'color: #dc2626; font-weight: bold;';
      
      const barcodeDataUrl = this.getBarcodeDataUrl(item.barcode);
      
      return `
        <tr class="item-row">
          <td colspan="4" style="font-weight: bold; font-size: 11px; padding-top: 6px; padding-bottom: 2px;">
            ${item.productName || 'SIN DESCRIPCIÓN'}
          </td>
        </tr>
        <tr class="item-subrow" style="border-bottom: 1px dashed #ccc;">
          <td style="padding-bottom: 6px; vertical-align: middle;">
            ${barcodeDataUrl ? `
              <img src="${barcodeDataUrl}" alt="${item.barcode}" style="max-height: 42px; max-width: 145px; width: auto; height: auto; display: block; image-rendering: pixelated; image-rendering: crisp-edges; background: #ffffff;" />
            ` : `
              <span style="font-size: 9px; font-family: monospace; color: #4b5563;">${item.barcode}</span>
            `}
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
    }).join('');

    const htmlContent = `
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
            }
            .text-left {
              text-align: left;
            }
            .totals {
              margin-top: 12px;
              font-size: 11px;
              font-weight: bold;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .signature {
              margin-top: 35px;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #000;
              width: 75%;
              margin: 25px auto 5px auto;
            }
            .signature-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
            .pos-notice {
              margin-top: 20px;
              font-size: 8px;
              text-align: center;
              color: #6b7280;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LOGICOUNT PRO v4.5</h1>
            <h2>Manifiesto de Carga</h2>
            <p>Auditoría de Inventario</p>
          </div>

          <div class="divider"></div>

          <div class="meta-section">
            <div class="meta-row">
              <span class="meta-label">ERP / ORDEN:</span>
              <span class="meta-value" style="font-weight: bold;">${erp}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">BULTOS:</span>
              <span class="meta-value">${label}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">FECHA:</span>
              <span class="meta-value">${dateStr}</span>
            </div>
          </div>

          <div class="divider"></div>

          <table class="items-table">
            <thead>
              <tr>
                <th class="text-left" style="width: 55%;">DESC / SKU</th>
                <th class="text-right" style="width: 15%;">TEO</th>
                <th class="text-right" style="width: 15%;">REAL</th>
                <th class="text-right" style="width: 15%;">DIF</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="double-divider"></div>

          <div class="totals">
            <div class="totals-row">
              <span>TOTAL SKUS:</span>
              <span>${items.length}</span>
            </div>
            <div class="totals-row" style="font-size: 12px; font-weight: 900;">
              <span>TOTAL UNIDADES:</span>
              <span>${totalReal}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="signature">
            <div class="signature-line"></div>
            <div class="signature-label">Firma Auditoría</div>
            <div style="font-size: 8px; color: #4b5563; margin-top: 3px;">Operador Responsable</div>
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

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
    }, 100);
  }

  public printExpectedOrder(order: any) {
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
      console.error("No se pudo iniciar el canal de impresión nativa.");
      return;
    }

    const title = order.metadata?.documentType || "CARGA TEÓRICA";
    const documentId = order.id;
    const itemsCount = order.items?.length || 0;
    const dateStr = order.metadata?.date || new Date(order.importedAt || Date.now()).toLocaleDateString('es-ES');
    const timeStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const currentFullDate = new Date().toLocaleDateString('es-ES') + " " + timeStr;

    const docType = order.metadata?.documentType || '';
    const isGuiaDespacho = docType === 'Remisión' || docType.toLowerCase().includes('guía') || docType.toLowerCase().includes('guia') || docType.toLowerCase().includes('despacho');

    const userDocType = order.metadata?.documentType || "CARGA TEÓRICA";
    let mainHeading = "CARGA TEÓRICA";
    
    if (userDocType.toLowerCase().includes('factura')) {
      mainHeading = "FACTURA";
    } else if (userDocType.toLowerCase().includes('remisión') || userDocType.toLowerCase().includes('remision') || userDocType.toLowerCase().includes('guía') || userDocType.toLowerCase().includes('guia') || userDocType.toLowerCase().includes('despacho')) {
      mainHeading = "GUÍA DE DESPACHO";
    } else if (userDocType.toLowerCase().includes('picking')) {
      mainHeading = "PICKING LIST";
    } else if (userDocType.toLowerCase().includes('manifiesto')) {
      mainHeading = "MANIFIESTO DE CARGA";
    } else if (userDocType.toLowerCase().includes('inventario')) {
      mainHeading = "INVENTARIO TEÓRICO";
    } else {
      mainHeading = userDocType.toUpperCase();
    }

    const itemsHtml = (order.items || []).map((item: any) => {
      // If it's a Guía de Despacho, we encode the expected quantity and 7 tabs
      const barcodeValue = isGuiaDespacho 
        ? `${item.expectedQty || 0}\t\t\t\t\t\t\t` 
        : item.barcode;

      // Generate barcode without text underneath (displayValue: false) and shorter height (28px)
      const barcodeUrl = this.getBarcodeDataUrl(barcodeValue, false, 28);
      
      return `
        <div class="item-block">
          <div class="item-title">${item.name || 'SIN DESCRIPCIÓN'}</div>
          
          <div class="item-meta">
            <div class="item-id-box">
              ID: ${item.barcode}
            </div>
            <div class="item-qty-box">
              ${item.expectedQty || 0}
            </div>
          </div>

          ${barcodeUrl ? `
            <div class="barcode-container">
              <img src="${barcodeUrl}" alt="${item.barcode}" class="barcode-img" />
            </div>
            ${isGuiaDespacho ? `
              <div style="text-align: center; font-size: 7px; font-family: monospace; color: #444; margin-top: -2px; font-weight: bold; text-transform: uppercase;">
                [TECLADO RÁPIDO: CANT + 7 TABS]
              </div>
            ` : ''}
          ` : `
            <div style="text-align: center; font-size: 8px; font-family: monospace; color: #666; margin-top: 4px;">
              [${item.barcode}]
            </div>
          `}
          
          <div class="item-divider"></div>
        </div>
      `;
    }).join('');

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
            ${isGuiaDespacho ? `
              <div style="font-[7px] font-weight: bold; margin-bottom: 2px; text-transform: uppercase; color: #333;">
                MODO TECLADO: CANT + 7 TABS
              </div>
            ` : ''}
            <div class="date">${dateStr}</div>
          </div>
          
          <div class="header-line"></div>

          <div class="meta-info" style="font-size: 10px; font-weight: bold; margin-bottom: 12px; font-family: monospace; text-transform: uppercase; line-height: 1.4;">
            ${order.metadata?.purchaseOrder ? `OC: ${order.metadata.purchaseOrder}<br/>` : ''}
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

  public getBarcodeDataUrl(barcode: string, displayValue: boolean = true, height: number = 45): string {
    if (!barcode) return "";
    try {
      const canvas = document.createElement('canvas');
      // @ts-ignore
      JsBarcode(canvas, barcode, {
        format: "CODE128",
        width: 2,
        height: height,
        displayValue: displayValue,
        fontSize: 10,
        font: "monospace",
        fontOptions: "bold",
        textMargin: 3,
        margin: 2,
        background: "#ffffff",
        lineColor: "#000000"
      });
      return canvas.toDataURL("image/png");
    } catch (err) {
      console.warn("Could not generate barcode with JSBarcode for:", barcode, err);
      return "";
    }
  }

  isConnected(): boolean {
    const usbOk = !!this.usbDevice && this.usbDevice.opened;
    const bleOk = !!this.bleDevice && this.bleDevice.gatt.connected;
    return usbOk || bleOk;
  }

  getDeviceName(): string {
    if (this.usbDevice) return this.usbDevice.productName || "Sewoo USB";
    if (this.bleDevice) return this.bleDevice.name || "Sewoo Bluetooth";
    return "Desconocido";
  }
}

export const thermalPrinter = new ThermalPrinterEngine();
