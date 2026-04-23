
import { CountingSession, ConsolidatedItem, Product, CountMapping, ExpiryMapping } from '../../types';
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
  const config = getSettings().cloudConfig;
  const countsMapping = config?.mappings?.counts as CountMapping | undefined;
  const expiryMapping = (config?.mappings?.expiry || config?.columnMapping) as ExpiryMapping | undefined;

  return items.map((item) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${day}/${month}/${year}`;
    
    const expiryPart = item.mm && item.yyyy ? `${item.mm}-${item.yyyy}` : 'SIN_FECHA';
    const activeLabel = item.location || session.logisticsLabel;
    // Agregamos session.id para que cada sesión tenga su propia fila y sea totalmente idempotente
    const uniqueKey = `${session.erpOrder}_${session.id}_${activeLabel}_${item.barcode}_${expiryPart}`;

    if (session.sessionType === 'hammer') {
      // Use counts mapping
      return {
        id: uniqueKey,
        [countsMapping?.id || SHEET_COLUMNS.ID]: uniqueKey,
        [countsMapping?.uniqueKey || SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey,
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
      id: uniqueKey,
      [expiryMapping?.id || SHEET_COLUMNS.ID]: uniqueKey,
      [expiryMapping?.uniqueKey || SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey,
      [SHEET_COLUMNS.ENTRY_DATE]: dateStr,
      [expiryMapping?.barcode || SHEET_COLUMNS.BARCODE]: item.barcode,
      [expiryMapping?.productName || SHEET_COLUMNS.PRODUCT_NAME]: item.productName || 'Cargando...',
      [expiryMapping?.location || SHEET_COLUMNS.LABEL]: activeLabel,
      [expiryMapping?.quantity || SHEET_COLUMNS.QUANTITY]: item.totalQuantity,
      [expiryMapping?.yyyy || SHEET_COLUMNS.YEAR]: item.yyyy || "",
      [expiryMapping?.erp || SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
      [expiryMapping?.timestamp || SHEET_COLUMNS.DATE]: dateStr,
      [expiryMapping?.mm || SHEET_COLUMNS.MONTH]: item.mm || "",
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
  const config = getSettings().cloudConfig;
  const mapping = config?.mappings?.products;

  return products.map(p => ({
    id: p.barcode,
    [mapping?.barcode || "barcode"]: p.barcode,
    [mapping?.name || "name"]: p.name,
    [mapping?.category || "category"]: p.category,
    [mapping?.supplier || "supplier"]: p.supplier,
    [mapping?.supplierRut || "supplier_rut"]: p.supplierRut || "",
    [mapping?.price || "price"]: p.price || 0,
    [mapping?.unitsPerBox || "units_per_box"]: p.unitsPerBox || 1,
    [SHEET_COLUMNS.IA_SIGNATURE || "ia_signature"]: p.embedding ? JSON.stringify(p.embedding) : ""
  }));
};

// Forced GitHub sync
