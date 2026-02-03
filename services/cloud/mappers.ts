import { CountingSession, ConsolidatedItem } from '../../types';
import { SHEET_COLUMNS } from '../constants';
import { generateUUID } from '../utils';

/**
 * FACTORY DE PAYLOADS (DRY)
 * Define una única fuente de verdad para la estructura de datos que viaja a la nube.
 * Se ha ajustado para cumplir con el formato histórico de la pestaña CONSOLIDADOS.
 */

export const createInventoryPayload = (
    session: CountingSession, 
    items: ConsolidatedItem[],
    source: 'manual' | 'background' = 'manual'
) => {
    return items.map((item) => {
        // Fecha actual en formato YYYY-MM-DD para la columna FECHA
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        // Etiqueta de vencimiento para la CLAVE_UNICA
        const expiryPart = item.mm && item.yyyy ? `${item.mm}-${item.yyyy}` : 'SIN_FECHA';
        
        // Formato solicitado: ERP_ETIQUETA_SKU_FECHAEXP
        const uniqueKey = `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${expiryPart}`;

        return {
            [SHEET_COLUMNS.ID]: generateUUID(),
            [SHEET_COLUMNS.UNIQUE_KEY]: uniqueKey,
            [SHEET_COLUMNS.DATE]: dateStr,
            [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
            [SHEET_COLUMNS.BARCODE]: item.barcode,
            [SHEET_COLUMNS.PRODUCT_NAME]: item.productName || 'Cargando...',
            [SHEET_COLUMNS.QUANTITY]: item.totalQuantity,
            [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
            [SHEET_COLUMNS.MONTH]: item.mm || "",
            [SHEET_COLUMNS.YEAR]: item.yyyy || "",
            [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "FRC" : "OK",
            [SHEET_COLUMNS.AUDIT_STATUS]: session.auditStatus?.toUpperCase() || "",
            [SHEET_COLUMNS.AUDIT_SCORE]: session.auditScore || "",
            "META_SOURCE": source
        };
    });
};

export const createProductsPayload = (products: any[]) => {
    return products.map(p => ({
        [SHEET_COLUMNS.BARCODE]: p.barcode,
        [SHEET_COLUMNS.PRODUCT_NAME]: p.name,
        "CATEGORIA": p.category,
        "PROVEEDOR": p.supplier,
        "RUT": p.supplierRut
    }));
};