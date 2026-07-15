import { logger } from '@/services/logger';
import { AppSettings, TableSchema } from '../types';
import { db } from '../db';

export const DEFAULT_EXPIRY_SCHEMA: TableSchema = {
  tableName: 'VENCIMIENTOS',
  columns: {
    barcode: { col: 'barcode', label: 'Código de Barras', type: 'barcode', required: true },
    productName: { col: 'product_name', label: 'Descripción', type: 'string', required: true },
    providerName: { col: 'supplier_name', label: 'Proveedor', type: 'string', editable: false },
    quantity: { col: 'quantity', label: 'Cantidad', type: 'number', required: true, defaultValue: 1 },
    event: { col: 'event_type', label: 'Evento', type: 'enum', options: ['VENCIMIENTOS', 'MERMA', 'CANJE'], defaultValue: 'VENCIMIENTOS' },
    mm: { col: 'expiry_month', label: 'Mes', type: 'enum', options: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], renderType: 'grid', required: true },
    yyyy: { col: 'expiry_year', label: 'Año', type: 'enum', options: ['2026', '2027', '2028', '2029'], renderType: 'segmented', required: true },
    location: { col: 'location', label: 'Bodega', type: 'string' },
    frc: { col: 'frc_code', label: 'FRC', type: 'string' },
    erp: { col: 'erp_code', label: 'ERP', type: 'string' },
    traspaso: { col: 'transfer_doc', label: 'Traspaso', type: 'string' },
    destino: { col: 'destination', label: 'Destino', type: 'string' },
    observaciones: { col: 'notes', label: 'Observaciones', type: 'string' },
    isAdjusted: { col: 'is_adjusted', label: 'Ajustado', type: 'boolean', defaultValue: false }
  }
};

const DEFAULT_PRODUCTS_SCHEMA: TableSchema = {
  tableName: 'PRODUCTOS',
  columns: {
    barcode: { col: 'barcode', label: 'Código', type: 'barcode', required: true },
    name: { col: 'name', label: 'Nombre', type: 'string', required: true },
    category: { col: 'category', label: 'Categoría', type: 'string' },
    supplier: { col: 'supplier_name', label: 'Proveedor', type: 'string' },
    supplierRut: { col: 'supplier_tax_id', label: 'RUT Proveedor', type: 'string' },
    price: { col: 'price', label: 'Precio', type: 'number' },
    unitsPerBox: { col: 'units_per_box', label: 'Unidades/Caja', type: 'number' }
  }
};

const DEFAULT_COUNTS_SCHEMA: TableSchema = {
  tableName: 'CONTEOS',
  columns: {
    barcode: { col: 'barcode', label: 'Código', type: 'barcode', required: true },
    quantity: { col: 'quantity', label: 'Cantidad', type: 'number', required: true },
    timestamp: { col: 'created_at', label: 'Fecha', type: 'timestamp', required: true },
    operatorId: { col: 'operator_id', label: 'Operador', type: 'string' },
    location: { col: 'location', label: 'Ubicación', type: 'string' },
    batch: { col: 'batch_number', label: 'Lote', type: 'string' },
    expiry: { col: 'expiry_date', label: 'Vencimiento', type: 'date' }
  }
};

const KEYS = {
 SETTINGS: 'logicount_settings',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  soundEnabled: true,
  hapticsEnabled: true,
  ttsEnabled: false, 
  batchTrackingEnabled: true,
  lowEndMode: false,
  cloudConfig: {
    countsTableName: 'CONTEOS', 
    consolidatedTableName: 'CONSOLIDADOS', 
    inventoryRegistryTableName: 'VENCIMIENTOS',
    expiryTableName: 'VENCIMIENTOS',
    productsTableName: 'PRODUCTOS',
    receptionTableName: 'RECEPCION_BULTOS',
    ordersTableName: 'PEDIDOS',
    providersTableName: 'PROVEEDORES',
    eventsTableName: 'EVENTOS',
    mappings: {
      expiry: {
        barcode: 'barcode',
        productName: 'product_name',
        quantity: 'quantity',
        event: 'event_type',
        mm: 'expiry_month',
        yyyy: 'expiry_year',
        location: 'location',
        supplier: 'supplier_name',
        id: 'id',
        uniqueKey: 'unique_key',
        timestamp: 'created_at',
        frc: 'frc_code',
        erp: 'erp_code',
        traspaso: 'transfer_doc',
        destino: 'destination',
        observaciones: 'notes',
        isAdjusted: 'is_adjusted',
        batch: 'batch_number'
      },
      events: {
        barcode: 'barcode',
        productName: 'product_name',
        quantity: 'quantity',
        event: 'event_type',
        mm: 'expiry_month',
        yyyy: 'expiry_year',
        location: 'location',
        supplier: 'supplier_name',
        supplierRut: 'supplier_tax_id',
        frc: 'frc_code',
        erp: 'erp_code',
        traspaso: 'transfer_doc',
        destino: 'destination',
        observaciones: 'notes',
        isAdjusted: 'is_adjusted',
        status: 'status',
        frcNumber: 'frc_code',
        resolution: 'resolution',
        batch: 'batch_number',
        expiryDate: 'expiry_date'
      },
      products: {
        barcode: 'barcode',
        name: 'name',
        category: 'category',
        supplier: 'supplier_name',
        supplierRut: 'supplier_tax_id',
        price: 'price',
        unitsPerBox: 'units_per_box'
      },
      counts: {
        barcode: 'barcode',
        quantity: 'quantity',
        timestamp: 'created_at',
        operatorId: 'operator_id',
        location: 'location',
        batch: 'batch_number',
        expiry: 'expiry_date'
      }
    },
    schema: {
      expiry: DEFAULT_EXPIRY_SCHEMA,
      products: DEFAULT_PRODUCTS_SCHEMA,
      counts: DEFAULT_COUNTS_SCHEMA,
      events: DEFAULT_EXPIRY_SCHEMA
    },
    columnMapping: {
      barcode: 'barcode',
      productName: 'product_name',
      quantity: 'quantity',
      event: 'event_type',
      mm: 'expiry_month',
      yyyy: 'expiry_year',
      location: 'location',
      frc: 'frc_code',
      erp: 'erp_code',
      traspaso: 'transfer_doc',
      destino: 'destination',
      observaciones: 'notes',
      isAdjusted: 'is_adjusted'
    }
  },
  modules: {
    dashboard: { enabled: true, name: 'Dashboard' },
    reception: { enabled: true, name: 'Recepción' },
    counting: { enabled: true, name: 'Conteos' },
    expiry: { enabled: true, name: 'Vencimientos' },
    events: { enabled: true, name: 'Eventos' },
    reports: { enabled: true, name: 'Reportes' },
    sync: { enabled: true, name: 'Sincronización' },
    database: { enabled: true, name: 'Base de Datos' },
    settings: { enabled: true, name: 'Configuración' }
  },
  mobileNavConfig: ['dashboard', 'reception', 'reports', 'sync', 'database', 'settings'],
  pharmacyName: 'L-121',
  autoLockTimeout: 0, // Desactivado por defecto
  withdrawalDaysDefault: 30, // 30 días es el estándar de la tabla
  captureSettings: {
    cameraMirrorMode: false,
    keypadVibration: true,
    scannerSpeed: 'normal',
    scannerDelay: 100,
  },
  thermalPrinter: {
    enabled: false,
    type: 'bluetooth',
    paperWidth: 80,
    margin: 2
  }
};

export const getSettings = (): AppSettings => {
 try {
 const data = localStorage.getItem(KEYS.SETTINGS);
 if (!data) return DEFAULT_SETTINGS;
 
 const parsed = JSON.parse(data);
 return { 
 ...DEFAULT_SETTINGS, 
 ...parsed,
 cloudConfig: {
 ...DEFAULT_SETTINGS.cloudConfig,
 ...(parsed.cloudConfig || {})
 },
 thermalPrinter: {
 ...DEFAULT_SETTINGS.thermalPrinter,
 ...(parsed.thermalPrinter || {})
 },
 captureSettings: {
 ...DEFAULT_SETTINGS.captureSettings,
 ...(parsed.captureSettings || {})
 }
 };
 } catch (e) {
 console.error("Critical: Settings recovery failed", e);
 return DEFAULT_SETTINGS;
 }
};

export const saveSettings = async (settings: AppSettings) => {
 localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
 try {
 await db.settings.put({ key: 'app_config', value: settings });
 } catch (e) {
 console.warn("No se pudo persistir configuración para SW", e);
 }
};
