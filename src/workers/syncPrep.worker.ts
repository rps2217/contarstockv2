
import { SHEET_COLUMNS } from '../services/constants';

/**
 * Procesa la transformación de registros locales a formato AppSheet
 * de forma paralela.
 */
self.onmessage = (e: MessageEvent) => {
 const { consolidated, session, timestamp, uuidPrefix } = e.data;

 try {
 const rows = consolidated.map((item: any, index: number) => {
 // Generamos una clave única robusta
 const uniqueKey = `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${item.mm || 0}_${item.yyyy || 0}`
 .replace(/[^A-Z0-9_]/gi, '');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${day}/${month}/${year}`;

  return {
  [SHEET_COLUMNS.ID]: `${uuidPrefix}-${index}`, // Col A
  [SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey, // Col B
  [SHEET_COLUMNS.ENTRY_DATE]: dateStr, // Col C: FECHA_INGRESO (DD/MM/YYYY)
  [SHEET_COLUMNS.BARCODE]: item.barcode, // Col D: COD PRODUCTO
  [SHEET_COLUMNS.PRODUCT_NAME]: item.productName, // Col E: DESCRIPCION
  [SHEET_COLUMNS.LABEL]: session.logisticsLabel, // Col F: ETIQUETAS
  [SHEET_COLUMNS.QUANTITY]: item.totalQuantity, // Col G: CANTIDAD
  [SHEET_COLUMNS.YEAR]: item.yyyy || 0, // Col H: YYYY
  [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder, // Col I: ERP
  [SHEET_COLUMNS.DATE]: dateStr, // Col J: FECHA (DD/MM/YYYY)
  [SHEET_COLUMNS.MONTH]: item.mm || 0, // Col K: MM
  [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "FRC" : ""
  };
 });

 self.postMessage({ success: true, rows });
 } catch (err: any) {
 self.postMessage({ success: false, error: err.message });
 }
};

// Forced GitHub sync
