
import { z } from 'zod';
import { SHEET_COLUMNS } from './constants';

/**
 * Helper to coerce various input types into a clean String.
 */
const cleanString = z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
        if (val === null || val === undefined) return '';
        return String(val).trim();
    });

/**
 * NORMALIZADOR UNIVERSAL DE PRODUCTOS
 * Mapea variaciones de nombres de columnas a nuestro esquema interno.
 */
export const CloudProductSchema = z.record(z.any()).transform((raw) => {
    const normalized: Record<string, any> = {};
    Object.keys(raw).forEach(k => {
        // Normalizamos la llave para que no importe si tiene espacios o acentos
        const key = k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        normalized[key] = raw[k];
    });

    // Mapeo flexible priorizando tu estructura:
    // PROVEEDOR; MUNDO; COD PRODUCTO; DESCRIPCION; RUT PROVEEDOR
    const barcode = normalized["COD PRODUCTO"] || normalized["CODPRODUCTO"] || normalized["CODIGO"] || normalized["SKU"] || normalized["BARCODE"] || "";
    const name = normalized["DESCRIPCION"] || normalized["PRODUCTO"] || normalized["NOMBRE"] || normalized["ITEM"] || "Sin descripción";
    const category = normalized["MUNDO"] || normalized["CATEGORIA"] || normalized["CATEGORY"] || "GENERAL";
    const supplier = normalized["PROVEEDOR"] || normalized["SUPPLIER"] || "";
    const supplierRut = normalized["RUT PROVEEDOR"] || normalized["RUTPROVEEDOR"] || normalized["RUT"] || "";

    return {
        barcode: String(barcode).trim(),
        name: String(name).trim(),
        category: String(category).trim(),
        supplier: String(supplier).trim(),
        supplierRut: String(supplierRut).trim()
    };
}).pipe(z.object({
    barcode: z.string().min(1, "El código es obligatorio"),
    name: z.string().default("Sin descripción"),
    category: z.string().default("GENERAL"),
    supplier: z.string().default(""),
    supplierRut: z.string().default("")
}));

export const CloudInventoryRowSchema = z.object({
    [SHEET_COLUMNS.ERP_ORDER]: cleanString,
    [SHEET_COLUMNS.LABEL]: cleanString,
    [SHEET_COLUMNS.BARCODE]: cleanString,
    [SHEET_COLUMNS.QUANTITY]: z.coerce.number().default(0),
    [SHEET_COLUMNS.DATE]: cleanString,
    [SHEET_COLUMNS.MONTH]: z.coerce.number().optional(),
    [SHEET_COLUMNS.YEAR]: z.coerce.number().optional(),
    [SHEET_COLUMNS.PRODUCT_NAME]: cleanString.optional(),
    [SHEET_COLUMNS.INCIDENT]: cleanString.optional(),
});
