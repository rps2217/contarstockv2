
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

 return {
 [SHEET_COLUMNS.ID]: `${uuidPrefix}-${index}`,
 [SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey,
 [SHEET_COLUMNS.DATE]: timestamp,
 [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
 [SHEET_COLUMNS.BARCODE]: item.barcode,
 [SHEET_COLUMNS.PRODUCT_NAME]: item.productName,
 [SHEET_COLUMNS.QUANTITY]: item.totalQuantity,
 [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
 [SHEET_COLUMNS.MONTH]: item.mm || 0,
 [SHEET_COLUMNS.YEAR]: item.yyyy || 0,
 [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "FRC" : ""
 };
 });

 self.postMessage({ success: true, rows });
 } catch (err: any) {
 self.postMessage({ success: false, error: err.message });
 }
};
