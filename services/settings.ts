import { AppSettings } from '../types';
import { db } from '../db';

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
 productsTableName: 'PRODUCTOS',
 receptionTableName: 'RECEPCION_BULTOS',
 ordersTableName: 'PEDIDOS',
 providersTableName: 'PROVEEDORES',
 eventsTableName: 'EVENTOS',
 mappings: {
   expiry: {
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