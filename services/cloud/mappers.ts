
import { CountingSession, ConsolidatedItem, Product } from '../../types';
import { SHEET_COLUMNS } from '../constants';
import { generateUUID } from '../utils';
import { getSettings } from '../settings';

/**
 * FACTORY DE PAYLOADS (DRY)
 * Define una única fuente de verdad para la estructura de datos que viaja a la nube.
 */

export const createInventoryPayload = (
 session: CountingSession, 
 items: ConsolidatedItem[],
 source: 'manual' | 'background' = 'manual'
) => {
 const config = getSettings().appSheetConfig;
 const countsMapping = config?.mappings?.counts;
 const expiryMapping = config?.mappings?.expiry || config?.columnMapping;

 return items.map((item) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${day}/${month}/${year}`;
  
  const expiryPart = item.mm && item.yyyy ? `${item.mm}-${item.yyyy}` : 'SIN_FECHA';
  const activeLabel = item.location || session.logisticsLabel;
  const uniqueKey = `${session.erpOrder}_${activeLabel}_${item.barcode}_${expiryPart}`;

  if (session.sessionType === 'hammer') {
    // Use counts mapping
    return {
      [SHEET_COLUMNS.ID]: generateUUID(),
      [SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey,
      [countsMapping?.timestamp || 'FECHA']: dateStr,
      [countsMapping?.barcode || 'SKU']: item.barcode,
      [countsMapping?.quantity || 'CANTIDAD']: item.totalQuantity,
      [countsMapping?.operatorId || 'OPERADOR']: session.operatorId || '',
      [countsMapping?.location || 'UBICACION']: activeLabel,
      [countsMapping?.batch || 'LOTE']: item.batch || '',
      [countsMapping?.expiry || 'VENCIMIENTO']: expiryPart,
      "META_SOURCE": source
    };
  }

  // Use expiry mapping for consolidated/expiry
  return {
  [SHEET_COLUMNS.ID]: generateUUID(), // Col A
  [SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey, // Col B
  [SHEET_COLUMNS.ENTRY_DATE]: dateStr, // Col C: FECHA_INGRESO (DD/MM/YYYY)
  [expiryMapping?.barcode || SHEET_COLUMNS.BARCODE]: item.barcode, // Col D: COD PRODUCTO
  [expiryMapping?.productName || SHEET_COLUMNS.PRODUCT_NAME]: item.productName || 'Cargando...', // Col E: DESCRIPCION
  [expiryMapping?.location || SHEET_COLUMNS.LABEL]: activeLabel, // Col F: ETIQUETAS
  [expiryMapping?.quantity || SHEET_COLUMNS.QUANTITY]: item.totalQuantity, // Col G: CANTIDAD
  [expiryMapping?.yyyy || SHEET_COLUMNS.YEAR]: item.yyyy || "", // Col H: YYYY
  [expiryMapping?.erp || SHEET_COLUMNS.ERP_ORDER]: session.erpOrder, // Col I: ERP
  [SHEET_COLUMNS.DATE]: dateStr, // Col J: FECHA (DD/MM/YYYY)
  [expiryMapping?.mm || SHEET_COLUMNS.MONTH]: item.mm || "", // Col K: MM
  [expiryMapping?.frc || SHEET_COLUMNS.INCIDENT]: item.isIncident ? "FRC" : "OK",
  [SHEET_COLUMNS.AUDIT_STATUS]: session.auditStatus?.toUpperCase() || "",
  [SHEET_COLUMNS.AUDIT_SCORE]: session.auditScore || "",
  [SHEET_COLUMNS.IA_SIGNATURE]: item.embedding ? JSON.stringify(item.embedding) : "",
  [SHEET_COLUMNS.PHOTO_URL]: session.photoUrl || "",
  "META_SOURCE": source
  };
 });
};

export const createProductsPayload = (products: Product[]) => {
 const config = getSettings().appSheetConfig;
 const mapping = config?.mappings?.products;

 return products.map(p => ({
 [mapping?.barcode || SHEET_COLUMNS.BARCODE]: p.barcode,
 [mapping?.name || SHEET_COLUMNS.PRODUCT_NAME]: p.name,
 [mapping?.category || "MUNDO"]: p.category,
 [mapping?.supplier || "PROVEEDOR"]: p.supplier,
 [mapping?.price || "PRECIO"]: p.price || "",
 [mapping?.unitsPerBox || "UNIDADES_CAJA"]: p.unitsPerBox || "",
 [SHEET_COLUMNS.IA_SIGNATURE]: p.embedding ? JSON.stringify(p.embedding) : ""
 }));
};
