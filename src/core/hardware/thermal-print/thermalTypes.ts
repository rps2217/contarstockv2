/**
 * Thermal Printer Types
 * Tipos compartidos para impresoras térmicas
 */

// ============================================================================
// TIPOS WEBSERIAL / WEBUSB
// ============================================================================

export interface USBDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(
    endpointNumber: number,
    data: ArrayBuffer | DataView | ArrayBufferView
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

export interface USBNavigator extends Navigator {
  usb: {
    requestDevice(options: { filters: unknown[] }): Promise<USBDevice>;
    getDevices(): Promise<USBDevice[]>;
  };
}

// ============================================================================
// TIPOS WEBBLUETOOTH
// ============================================================================

export interface WebBluetooth {
  requestDevice(options: {
    filters?: Array<{ namePrefix?: string; services?: string[] }>;
    optionalServices?: string[];
  }): Promise<BluetoothDevice>;
}

export interface BluetoothDevice {
  gatt?: {
    connect(): Promise<BluetoothRemoteGATTServer>;
  };
  name?: string;
}

interface BluetoothRemoteGATTServer {
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTService {
  getCharacteristics(): Promise<BLECharacteristic[]>;
}

export interface BLECharacteristic {
  properties?: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValue(data: BufferSource): Promise<void>;
  startNotifications(): void;
  stopNotifications(): void;
  value?: DataView;
}

// ============================================================================
// TIPOS BLUETOOTH (Alias internos)
// ============================================================================

export interface BLEDevice {
  name?: string;
  gatt?: {
    connected?: boolean;
    connect(): Promise<BLEServer>;
    disconnect(): void;
  };
}

interface BLEServer {
  getPrimaryService(uuid: string): Promise<BLEService>;
}

interface BLEService {
  getCharacteristic(uuid: string): Promise<BLECharacteristic>;
  getCharacteristics(): Promise<BLECharacteristic[]>;
}

// ============================================================================
// TIPOS DE DATOS DE IMPRESIÓN
// ============================================================================

/** Item de reporte para impresión térmica */
export interface PrintItem {
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
export interface ReportItem {
  barcode: string;
  productName?: string;
  expectedQuantity?: number;
  totalQuantity: number;
}

/** Metadatos de orden para impresión */
export interface OrderMetadata {
  documentType?: string;
  date?: string;
  purchaseOrder?: string;
  orderNote?: string;
  [key: string]: unknown;
}

/** Orden completa para impresión */
export interface PrintOrder {
  id: string;
  items?: PrintItem[];
  metadata?: OrderMetadata;
  importedAt?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Constantes de impresoras */
export const PRINTER_BLUETOOTH_FILTERS: Array<{ namePrefix?: string; services?: string[] }> = [
  { namePrefix: 'SLK' },
  { namePrefix: 'Sewoo' },
  { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
  { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] },
];

export const PRINTER_OPTIONAL_SERVICES: string[] = [
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

export const PRINTER_BLUETOOTH_MTU = 20;

export const PRINTER_USB_INTERFACE_CLASS = 7;

export const PRINTER_ERROR_MESSAGES = {
  USB_NOT_SUPPORTED: 'WebUSB no es compatible con este navegador o entorno.',
  USB_SECURITY_BLOCKED:
    'El acceso USB está restringido por la directiva de seguridad del navegador. Abre la aplicación en una pestaña nueva para poder vincular la impresora.',
  BLUETOOTH_NOT_SUPPORTED: 'WebBluetooth no es compatible con este navegador o entorno.',
  BLUETOOTH_NOT_AVAILABLE: 'WebBluetooth no está disponible.',
  BLUETOOTH_GATT_NOT_SUPPORTED: 'El dispositivo Bluetooth no tiene soporte GATT.',
  BLUETOOTH_SECURITY_BLOCKED:
    'El acceso Bluetooth está restringido por la directiva de seguridad del navegador. Abre la aplicación en una pestaña nueva para poder vincular la impresora.',
  NO_OUTPUT_CHANNEL: 'No output channel found.',
} as const;
