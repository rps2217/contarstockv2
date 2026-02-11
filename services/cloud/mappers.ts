
import { CountingSession, ConsolidatedItem, Product } from '../../types';
import { SHEET_COLUMNS } from '../constants';
import { generateUUID } from '../utils';

/**
 * FACTORY DE PAYLOADS (DRY)
 * Define una única fuente de verdad para la estructura de datos que viaja a la nube.
 */

export const createInventoryPayload = (
    session: CountingSession, 
    items: ConsolidatedItem[],
    source: 'manual' | 'background' = 'manual'
) => {
    return items.map((item) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const expiryPart = item.mm && item.yyyy ? `${item.mm}-${item.yyyy}` : 'SIN_FECHA';
        const activeLabel = item.location || session.logisticsLabel;
        const uniqueKey = `${session.erpOrder}_${activeLabel}_${item.barcode}_${expiryPart}`;

        return {
            [SHEET_COLUMNS.ID]: generateUUID(),
            [SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey,
            [SHEET_COLUMNS.DATE]: dateStr,
            [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
            [SHEET_COLUMNS.BARCODE]: item.barcode,
            [SHEET_COLUMNS.PRODUCT_NAME]: item.productName || 'Cargando...',
            [SHEET_COLUMNS.QUANTITY]: item.totalQuantity,
            [SHEET_COLUMNS.LABEL]: activeLabel,
            [SHEET_COLUMNS.MONTH]: item.mm || "",
            [SHEET_COLUMNS.YEAR]: item.yyyy || "",
            [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "FRC" : "OK",
            [SHEET_COLUMNS.AUDIT_STATUS]: session.auditStatus?.toUpperCase() || "",
            [SHEET_COLUMNS.AUDIT_SCORE]: session.auditScore || "",
            [SHEET_COLUMNS.IA_SIGNATURE]: item.embedding ? JSON.stringify(item.embedding) : "",
            "META_SOURCE": source
        };
    });
};

export const createProductsPayload = (products: Product[]) => {
    return products.map(p => ({
        [SHEET_COLUMNS.BARCODE]: p.barcode, // Ahora envía 'COD PRODUCTO'
        [SHEET_COLUMNS.PRODUCT_NAME]: p.name, // Ahora envía 'DESCRIPCION'
        "MUNDO": p.category, // Cambiado de 'CATEGORIA' para coincidir con Col B
        "PROVEEDOR": p.supplier, // Coincide con Col A
        "RUT PROVEEDOR": p.supplierRut, // Cambiado de 'RUT' para coincidir con Col F
        [SHEET_COLUMNS.IA_SIGNATURE]: p.embedding ? JSON.stringify(p.embedding) : ""
    }));
};
