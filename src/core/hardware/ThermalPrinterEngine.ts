import { logger } from '@/services/logger';
/**
 * LOGICOUNT PRO - THERMAL ENGINE v1.2
 * Soporte dual: WebUSB (PC) + Web Bluetooth (Android/Mobile)
 */

import JsBarcode from 'jsbarcode';
import { ESC, SEPARATOR } from './thermal-print/escposCommands';
import { generateReportHtml80mm } from './thermal-print/reportHtmlGenerator';
import { generateExpectedOrderHtml } from './thermal-print/expectedOrderHtmlGenerator';
import { generateHammerTicketHtml } from './thermal-print/hammerTicketHtmlGenerator';
import type {
  USBDevice,
  USBNavigator,
  WebBluetooth,
  BluetoothDevice,
  BLECharacteristic,
  BLEDevice,
  PrintItem,
  ReportItem,
} from './thermal-print/thermalTypes';
import {
  PRINTER_BLUETOOTH_FILTERS,
  PRINTER_OPTIONAL_SERVICES,
  PRINTER_BLUETOOTH_MTU,
  PRINTER_USB_INTERFACE_CLASS,
  PRINTER_ERROR_MESSAGES,
} from './thermal-print/thermalTypes';

export class ThermalPrinterEngine {
  private usbDevice: USBDevice | null = null;
  private endpointOut: number | null = null;

  // Bluetooth State
  private bleCharacteristic: BLECharacteristic | null = null;
  private bleDevice: BLEDevice | null = null;

  async connectUSB(): Promise<boolean> {
    try {
      if (!navigator || !('usb' in navigator)) {
        throw new Error(PRINTER_ERROR_MESSAGES.USB_NOT_SUPPORTED);
      }
      const usbNav = navigator as USBNavigator;
      this.usbDevice = await usbNav.usb.requestDevice({ filters: [] });
      if (!this.usbDevice) return false;

      await this.usbDevice.open();
      await this.usbDevice.selectConfiguration(1);
      const interfaceNum =
        this.usbDevice.configuration?.interfaces.find(
          i => i.alternates[0].interfaceClass === PRINTER_USB_INTERFACE_CLASS
        )?.interfaceNumber || 0;
      await this.usbDevice.claimInterface(interfaceNum);
      const endpoint = this.usbDevice.configuration?.interfaces[
        interfaceNum
      ].alternates[0].endpoints.find(e => e.direction === 'out');
      if (!endpoint) throw new Error(PRINTER_ERROR_MESSAGES.NO_OUTPUT_CHANNEL);
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
        throw new Error(PRINTER_ERROR_MESSAGES.USB_SECURITY_BLOCKED);
      }
      logger.warn('ThermalPrinterEngine', 'USB connection error', error.message);
      throw err;
    }
  }

  async connectBluetooth(): Promise<boolean> {
    try {
      if (!navigator || !('bluetooth' in navigator)) {
        throw new Error(PRINTER_ERROR_MESSAGES.BLUETOOTH_NOT_SUPPORTED);
      }
      const bluetooth = (navigator as Navigator & { bluetooth?: WebBluetooth }).bluetooth;
      if (!bluetooth) {
        throw new Error(PRINTER_ERROR_MESSAGES.BLUETOOTH_NOT_AVAILABLE);
      }
      const device = await bluetooth.requestDevice({
        filters: PRINTER_BLUETOOTH_FILTERS,
        optionalServices: PRINTER_OPTIONAL_SERVICES,
      });

      if (!device.gatt) {
        throw new Error(PRINTER_ERROR_MESSAGES.BLUETOOTH_GATT_NOT_SUPPORTED);
      }
      const server = await device.gatt.connect();
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        const writeChar = characteristics.find(
          (c: BLECharacteristic) => c.properties?.write || c.properties?.writeWithoutResponse
        );
        if (writeChar) {
          this.bleCharacteristic = writeChar;
          this.bleDevice = device as unknown as BLEDevice;
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
        throw new Error(PRINTER_ERROR_MESSAGES.BLUETOOTH_SECURITY_BLOCKED);
      }
      logger.warn('ThermalPrinterEngine', 'Bluetooth connection error', error.message);
      throw err;
    }
  }

  async printRaw(data: Uint8Array) {
    if (this.usbDevice && this.endpointOut !== null) {
      await this.usbDevice.transferOut(this.endpointOut, data);
      return;
    }

    if (this.bleCharacteristic) {
      for (let i = 0; i < data.length; i += PRINTER_BLUETOOTH_MTU) {
        const chunk = data.slice(i, i + PRINTER_BLUETOOTH_MTU);
        await this.bleCharacteristic.writeValue(chunk);
      }
    }
  }

  async printLabel(sku: string, description: string, qty: number) {
    const encoder = new TextEncoder();
    const esc = ESC;

    const commands = new Uint8Array([
      ...esc.INIT,
      ...esc.ALIGN_CENTER,
      ...esc.BOLD_ON,
      ...encoder.encode('LOGICOUNT PRO\n'),
      ...esc.BOLD_OFF,
      ...encoder.encode(`${SEPARATOR}\n`),
      ...esc.DOUBLE_SIZE,
      ...encoder.encode(`${sku}\n`),
      ...esc.NORMAL_SIZE,
      ...encoder.encode(`${description.substring(0, 32)}\n`),
      ...esc.BOLD_ON,
      ...encoder.encode(`CANTIDAD: ${qty} UNID.\n`),
      ...esc.BOLD_OFF,
      ...encoder.encode(`${new Date().toLocaleString()}\n`),
      ...esc.FEED_SHORT,
      ...esc.CUT,
    ]);

    await this.printRaw(commands);
  }

  async printSummaryReport(erp: string, label: string, items: PrintItem[]) {
    if (this.isConnected()) {
      const encoder = new TextEncoder();
      const esc = ESC;

      let content: number[] = [
        ...esc.INIT,
        ...esc.ALIGN_CENTER,
        ...esc.BOLD_ON,
        ...esc.DOUBLE_SIZE,
        ...encoder.encode('MANIFIESTO DE CARGA\n'),
        ...encoder.encode('LOGICOUNT PRO v4.5\n'),
        ...esc.NORMAL_SIZE,
        ...esc.BOLD_OFF,
        ...encoder.encode(`${SEPARATOR}\n`),
        ...esc.ALIGN_LEFT,
        ...encoder.encode(`ORDEN ERP: ${erp}\n`),
        ...encoder.encode(`BULTOS: ${label}\n`),
        ...encoder.encode(`FECHA: ${new Date().toLocaleString()}\n`),
        ...encoder.encode(`${SEPARATOR}\n`),
        ...esc.BOLD_ON,
        ...encoder.encode('DESC | SKU\n'),
        ...encoder.encode('TEO REAL DIFF\n'),
        ...esc.BOLD_OFF,
        ...encoder.encode(`${SEPARATOR}\n`),
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
          ...encoder.encode(`${name}\n`),
          ...encoder.encode(`${sku}\n`),
          ...encoder.encode(`${theo} ${real} ${diff}\n`),
          ...encoder.encode('- - - - - - - - - - - - - - - -\n'),
        ];
        content.push(...row);
      });

      const totalReal = items.reduce((acc, i) => acc + (i.totalQuantity || i.quantity || 0), 0);
      const footer: number[] = [
        ...esc.BOLD_ON,
        ...encoder.encode(`TOTAL UNIDADES: ${totalReal}\n`),
        ...esc.BOLD_OFF,
        ...encoder.encode(`${SEPARATOR}\n`),
        ...encoder.encode('\n\n__________________________\n'),
        ...esc.ALIGN_CENTER,
        ...encoder.encode('FIRMA AUDITORIA\n'),
        ...esc.FEED,
        ...esc.CUT,
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

  public printExpectedOrder(order: {
    id: string;
    items?: PrintItem[];
    metadata?: { documentType?: string; date?: string; purchaseOrder?: string; orderNote?: string };
    importedAt?: number;
  }) {
    const iframe = this.createPrintIframe();
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      logger.error('ThermalPrinterEngine', 'No se pudo iniciar el canal de impresión nativa');
      return;
    }

    const htmlContent = generateExpectedOrderHtml({
      documentId: order.id,
      items: order.items || [],
      metadata: order.metadata,
      importedAt: order.importedAt,
    });

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
  public printHammerTicket(order: {
    id: string;
    items?: PrintItem[];
    metadata?: { internalGuide?: string; purchaseOrder?: string };
    importedAt?: number;
  }) {
    const iframe = this.createPrintIframe();
    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      logger.error('ThermalPrinterEngine', 'No se pudo iniciar el canal de impresion nativa');
      return;
    }

    const htmlContent = generateHammerTicketHtml({
      documentId: order.id,
      items: order.items || [],
      batchInfo: order.metadata?.internalGuide || `Lote: ${order.id}`,
      location: order.metadata?.purchaseOrder || 'ZONA-A',
      importedAt: order.importedAt,
    });

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
    }, 120);
  }

  /**
   * Crea un iframe invisible para impresión
   */
  private createPrintIframe(): HTMLIFrameElement {
    const oldIframe = document.getElementById('thermal-print-iframe');
    if (oldIframe) {
      oldIframe.parentNode?.removeChild(oldIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.bottom = '0';
    iframe.style.right = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    return iframe;
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
