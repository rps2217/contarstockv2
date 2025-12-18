import { z } from 'zod';
import { SHEET_COLUMNS } from './constants';

/**
 * Helper to coerce various input types into a clean String.
 * Handles numbers, nulls, undefined, and auto-trims.
 */
const cleanString = z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
        if (val === null || val === undefined) return '';
        return String(val).trim();
    });

/**
 * Helper to coerce inputs into a Number.
 * Handles strings with commas (European/LatAm format), empty strings, etc.
 */
const cleanNumber = z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        // Replace comma with dot if necessary and parse
        const clean = val.replace(/,/g, '.').replace(/[^0-9.-]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    });

// --- 1. PRODUCT SCHEMA (Master Data) ---
export const CloudProductSchema = z.object({
    "COD PRODUCTO": cleanString,
    "DESCRIPCION": cleanString.default("Sin Descripción"),
    "MUNDO": cleanString.default("GENERAL"),
    "PROVEEDOR": cleanString.default(""),
    "RUT PROVEEDOR": cleanString.default(""),
}).transform((data) => ({
    barcode: data["COD PRODUCTO"],
    name: data["DESCRIPCION"],
    category: data["MUNDO"],
    supplier: data["PROVEEDOR"],
    supplierRut: data["RUT PROVEEDOR"]
}));

// --- 2. INVENTORY ROW SCHEMA (Transactional Data) ---
export const CloudInventoryRowSchema = z.object({
    [SHEET_COLUMNS.ERP_ORDER]: cleanString,
    [SHEET_COLUMNS.LABEL]: cleanString,
    [SHEET_COLUMNS.BARCODE]: cleanString,
    [SHEET_COLUMNS.QUANTITY]: cleanNumber,
    [SHEET_COLUMNS.DATE]: cleanString,
    [SHEET_COLUMNS.MONTH]: cleanNumber.optional(),
    [SHEET_COLUMNS.YEAR]: cleanNumber.optional(),
    [SHEET_COLUMNS.PRODUCT_NAME]: cleanString.optional(),
    [SHEET_COLUMNS.INCIDENT]: cleanString.optional(),
});

// --- 3. RECEPTION ROW SCHEMA (Logistics Data) ---
// Ajustado según requerimiento: ID_RECEPCION, FECHA_HORA, ETIQUETA, ESTADO
export const CloudReceptionRowSchema = z.object({
    "ID_RECEPCION": cleanString,
    "FECHA_HORA": cleanString,
    "ETIQUETA": cleanString,
    "ESTADO": cleanString,
    "ESTADO_AUDITORIA": cleanString.optional(), // Opcional para modo detective
});

export type CloudProduct = z.infer<typeof CloudProductSchema>;
export type CloudInventoryRow = z.infer<typeof CloudInventoryRowSchema>;
export type CloudReceptionRow = z.infer<typeof CloudReceptionRowSchema>;