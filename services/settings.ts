import { AppSettings, TableSchema } from '../types';
import { db } from '../db';

export const DEFAULT_EXPIRY_SCHEMA: TableSchema = {
  tableName: 'VENCIMIENTOS',
  columns: {
    barcode: { col: 'SKU', label: 'Código de Barras', type: 'barcode', required: true },
    productName: { col: 'DESCRIPTOR', label: 'Descripción', type: 'string', required: true },
    quantity: { col: 'CANTIDAD', label: 'Cantidad', type: 'number', required: true, defaultValue: 1 },
    event: { col: 'EVENTO', label: 'Evento', type: 'enum', options: ['VENCIMIENTOS', 'MERMA', 'CANJE'], defaultValue: 'VENCIMIENTOS' },
    mm: { col: 'MM', label: 'Mes', type: 'enum', options: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'], renderType: 'grid', required: true },
    yyyy: { col: 'YYYY', label: 'Año', type: 'enum', options: ['2026', '2027', '2028', '2029'], renderType: 'segmented', required: true },
    location: { col: 'BOD.', label: 'Bodega', type: 'string' },
    frc: { col: 'FRC', label: 'FRC', type: 'string' },
    erp: { col: 'ERP', label: 'ERP', type: 'string' },
    traspaso: { col: 'DOC-TRAS-INTER', label: 'Traspaso', type: 'string' },
    destino: { col: 'DESTINO', label: 'Destino', type: 'string' },
    observaciones: { col: 'OBSERVACIONES', label: 'Observaciones', type: 'string' },
    isAdjusted: { col: 'AJUSTADO', label: 'Ajustado', type: 'boolean', defaultValue: false }
  }
};

const DEFAULT_PRODUCTS_SCHEMA: TableSchema = {
  tableName: 'PRODUCTOS',
  columns: {
    barcode: { col: 'SKU', label: 'Código', type: 'barcode', required: true },
    name: { col: 'DESCRIPTOR', label: 'Nombre', type: 'string', required: true },
    category: { col: 'CATEGORIA', label: 'Categoría', type: 'string' },
    supplier: { col: 'PROVEEDOR', label: 'Proveedor', type: 'string' },
    supplierRut: { col: 'PROVEEDOR_RUT', label: 'RUT Proveedor', type: 'string' },
    price: { col: 'PRECIO', label: 'Precio', type: 'number' },
    unitsPerBox: { col: 'UNIDADES_CAJA', label: 'Unidades/Caja', type: 'number' }
  }
};

const DEFAULT_COUNTS_SCHEMA: TableSchema = {
  tableName: 'CONTEOS',
  columns: {
    barcode: { col: 'SKU', label: 'Código', type: 'barcode', required: true },
    quantity: { col: 'CANTIDAD', label: 'Cantidad', type: 'number', required: true },
    timestamp: { col: 'FECHA', label: 'Fecha', type: 'timestamp', required: true },
    operatorId: { col: 'OPERADOR', label: 'Operador', type: 'string' },
    location: { col: 'UBICACION', label: 'Ubicación', type: 'string' },
    batch: { col: 'LOTE', label: 'Lote', type: 'string' },
    expiry: { col: 'VENCIMIENTO', label: 'Vencimiento', type: 'date' }
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
 appSheetConfig: {
 appId: '',
 accessKey: '',
 countsTableName: 'CONTEOS', 
 consolidatedTableName: 'CONSOLIDADOS', 
 inventoryRegistryTableName: 'REGISTRO_INV',
 expiryTableName: 'VENCIMIENTOS',
 productsTableName: 'PRODUCTOS',
 receptionTableName: 'RECEPCION_BULTOS',
 ordersTableName: 'PEDIDOS',
 providersTableName: 'PROVEEDORES',
 eventsTableName: 'EVENTOS',
 mappings: {
   expiry: {
     barcode: 'COD_BARRAS',
     productName: 'DESCRIPCION_PROD',
     quantity: 'CANTIDAD',
     event: 'EVENTO',
     mm: 'MM',
     yyyy: 'YYYY',
     location: 'UBICACION',
     id: 'ID_REGISTRO',
     uniqueKey: 'CLAVE_UNICA',
     timestamp: 'FECHA_INGRESO',
     frc: 'FRC',
     erp: 'ERP',
     traspaso: 'DOC-TRAS-INTER',
     destino: 'DESTINO',
     observaciones: 'OBSERVACIONES',
     isAdjusted: 'AJUSTADO'
   },
   events: {
     barcode: 'SKU',
     productName: 'DESCRIPTOR',
     quantity: 'CANTIDAD',
     event: 'EVENTO',
     mm: 'MM',
     yyyy: 'YYYY',
     location: 'BOD.',
     frc: 'FRC',
     erp: 'ERP',
     traspaso: 'DOC-TRAS-INTER',
     destino: 'DESTINO',
     observaciones: 'OBSERVACIONES',
     isAdjusted: 'AJUSTADO'
   },
   products: {
     barcode: 'SKU',
     name: 'DESCRIPTOR',
     category: 'CATEGORIA',
     supplier: 'PROVEEDOR',
     supplierRut: 'PROVEEDOR_RUT',
     price: 'PRECIO',
     unitsPerBox: 'UNIDADES_CAJA'
   },
   counts: {
     barcode: 'SKU',
     quantity: 'CANTIDAD',
     timestamp: 'FECHA',
     operatorId: 'OPERADOR',
     location: 'UBICACION',
     batch: 'LOTE',
     expiry: 'VENCIMIENTO'
   }
 },
 schema: {
   expiry: DEFAULT_EXPIRY_SCHEMA,
   products: DEFAULT_PRODUCTS_SCHEMA,
   counts: DEFAULT_COUNTS_SCHEMA,
   events: DEFAULT_EXPIRY_SCHEMA
 },
 columnMapping: {
 barcode: 'SKU',
 productName: 'DESCRIPTOR',
 quantity: 'CANTIDAD',
 event: 'EVENTO',
 mm: 'MM',
 yyyy: 'YYYY',
 location: 'BOD.',
 frc: 'FRC',
 erp: 'ERP',
 traspaso: 'DOC-TRAS-INTER',
 destino: 'DESTINO',
 observaciones: 'OBSERVACIONES',
 isAdjusted: 'AJUSTADO'
 }
 },
 mobileNavConfig: ['dashboard', 'reports', 'sync', 'database'],
 thermalPrinter: {
 enabled: false,
 type: 'bluetooth'
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
 appSheetConfig: {
 ...DEFAULT_SETTINGS.appSheetConfig,
 ...(parsed.appSheetConfig || {})
 },
 thermalPrinter: {
 ...DEFAULT_SETTINGS.thermalPrinter,
 ...(parsed.thermalPrinter || {})
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