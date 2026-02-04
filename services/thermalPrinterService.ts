
/**
 * LOGICOUNT PRO - THERMAL ENGINE v1.2
 * Soporte dual: WebUSB (PC) + Web Bluetooth (Android/Mobile)
 */

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

class ThermalPrinterService {
  private usbDevice: USBDevice | null = null;
  private endpointOut: number | null = null;
  
  // Bluetooth State
  private bleCharacteristic: any = null;
  private bleDevice: any = null;

  async connectUSB(): Promise<boolean> {
    try {
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
    } catch (err) {
      console.error("USB Connection Error:", err);
      return false;
    }
  }

  async connectBluetooth(): Promise<boolean> {
    try {
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
    } catch (err) {
      console.error("Bluetooth Connection Error:", err);
      return false;
    }
  }

  async printRaw(data: Uint8Array) {
    if (this.usbDevice && this.endpointOut !== null) {
      await this.usbDevice.transferOut(this.endpointOut, data);
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
      ...encoder.encode("LOGICOUNT PRO\n"),
      ...esc.boldOff,
      ...encoder.encode("--------------------------------\n"),
      ...esc.sizeBig,
      ...encoder.encode(`${sku}\n`),
      ...esc.sizeNormal,
      ...encoder.encode(`${description.substring(0, 32)}\n`),
      ...esc.boldOn,
      ...encoder.encode(`CANTIDAD: ${qty} UNID.\n`),
      ...esc.boldOff,
      ...encoder.encode(`${new Date().toLocaleString()}\n`),
      ...esc.feed,
      ...esc.cut
    ]);

    await this.printRaw(commands);
  }

  /**
   * REPORTE RESUMEN DE DISCREPANCIAS
   */
  async printSummaryReport(erp: string, label: string, items: any[]) {
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
          ...encoder.encode("MANIFIESTO DE CARGA\n"),
          ...encoder.encode("LOGICOUNT PRO v4.5\n"),
          ...esc.boldOff,
          ...encoder.encode("--------------------------------\n"),
          ...esc.alignLeft,
          ...encoder.encode(`ORDEN ERP: ${erp}\n`),
          ...encoder.encode(`BULTOS   : ${label}\n`),
          ...encoder.encode(`FECHA    : ${new Date().toLocaleString()}\n`),
          ...encoder.encode("--------------------------------\n"),
          ...esc.boldOn,
          ...encoder.encode("DESC | SKU\n"),
          ...encoder.encode("TEO   REAL   DIFF\n"),
          ...esc.boldOff,
          ...encoder.encode("--------------------------------\n")
      ];

      items.forEach(item => {
          const sku = item.barcode.padEnd(20);
          const name = (item.productName || 'SIN_DESC').substring(0, 32);
          const theo = String(item.expectedQuantity || 0).padStart(5);
          const real = String(item.totalQuantity || 0).padStart(7);
          const diff = String(item.totalQuantity - (item.expectedQuantity || 0)).padStart(7);

          const row = [
              ...encoder.encode(`${name}\n`),
              ...encoder.encode(`${sku}\n`),
              ...encoder.encode(`${theo}  ${real}  ${diff}\n`),
              ...encoder.encode("- - - - - - - - - - - - - - - -\n")
          ];
          content.push(...row);
      });

      const totalReal = items.reduce((acc, i) => acc + i.totalQuantity, 0);
      const footer = [
          ...esc.boldOn,
          ...encoder.encode(`TOTAL UNIDADES: ${totalReal}\n`),
          ...esc.boldOff,
          ...encoder.encode("--------------------------------\n"),
          ...encoder.encode("\n\n__________________________\n"),
          ...esc.alignCenter,
          ...encoder.encode("FIRMA AUDITORIA\n"),
          ...esc.feed,
          ...esc.cut
      ];

      await this.printRaw(new Uint8Array([...content, ...footer]));
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

export const thermalPrinter = new ThermalPrinterService();
