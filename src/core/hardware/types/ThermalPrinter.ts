/**
 * Tipos para ThermalPrinterEngine
 */

export interface PrintOrder {
  id: string;
  type: 'reception' | 'guia-despacho' | 'transfer';
  items: PrintItem[];
  metadata?: {
    purchaseOrder?: string;
    orderNote?: string;
    providerName?: string;
  };
}

export interface PrintItem {
  sku: string;
  description: string;
  qty: number;
  barcode: string;
  expiryDate?: string;
}

export interface USBEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
}

export interface BLEDevice {
  name?: string;
  gatt?: {
    connected: boolean;
  };
}

export type PrinterConnection = 'usb' | 'bluetooth' | 'browser';
