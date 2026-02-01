
import { CountingSession, ConsolidatedItem } from '../../types';
import { SHEET_COLUMNS } from '../constants';
import { generateUUID } from '../utils';

/**
 * FACTORY DE PAYLOADS (DRY)
 * Define una única fuente de verdad para la estructura de datos que viaja a la nube.
 * Utilizado tanto por el SyncManager (UI) como por el Service Worker (Background).
 */

export const createInventoryPayload = (
    session: CountingSession, 
    items: ConsolidatedItem[],
    source: 'manual' | 'background' = 'manual'
) => {
    return items.map((item, idx) => ({
        [SHEET_COLUMNS.ID]: generateUUID(),
        [SHEET_COLUMNS.UNIQUE_KEY]: `${session.erpOrder}_${session.logisticsLabel}_${item.barcode}_${Date.now()}`,
        [SHEET_COLUMNS.DATE]: new Date().toLocaleString('es-CL'),
        [SHEET_COLUMNS.ERP_ORDER]: session.erpOrder,
        [SHEET_COLUMNS.BARCODE]: item.barcode,
        [SHEET_COLUMNS.PRODUCT_NAME]: item.productName || 'Cargando...',
        [SHEET_COLUMNS.QUANTITY]: item.totalQuantity,
        [SHEET_COLUMNS.EXPECTED]: item.expectedQuantity || 0,
        [SHEET_COLUMNS.DIFF]: (item.totalQuantity - (item.expectedQuantity || 0)),
        [SHEET_COLUMNS.LABEL]: session.logisticsLabel,
        [SHEET_COLUMNS.MONTH]: item.mm || 0,
        [SHEET_COLUMNS.YEAR]: item.yyyy || 0,
        [SHEET_COLUMNS.INCIDENT]: item.isIncident ? "SI" : "NO",
        "META_SOURCE": source
    }));
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
