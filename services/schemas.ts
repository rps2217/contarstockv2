
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
    // Normalizar todas las llaves a mayúsculas y quitar acentos básicos para comparación robusta
    Object.keys(raw).forEach(k => {
        const key = k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        normalized[key] = raw[k];
    });

    // Mapeo flexible
    const barcode = normalized["COD PRODUCTO"] || normalized["CODIGO"] || normalized["SKU"] || normalized["BARCODE"] || normalized["EAN"] || "";
    const name = normalized["DESCRIPCION"] || normalized["PRODUCTO"] || normalized["NOMBRE"] || normalized["DESCRIP"] || "Sin descripción";
    const category = normalized["MUNDO"] || normalized["CATEGORIA"] || normalized["CATEGORY"] || "GENERAL";
    const supplier = normalized["PROVEEDOR"] || normalized["SUPPLIER"] || "";
    const supplierRut = normalized["RUT PROVEEDOR"] || normalized["RUT"] || "";

    return {
        barcode: String(barcode).trim(),
        name: String(name).trim(),
        category: String(category).trim(),
        supplier: String(supplier).trim(),
        supplierRut: String(supplierRut).trim()
    };
}).pipe(z.object({
    barcode: z.string().min(1, "El código es obligatorio"),
    name: z.string(),
    category: z.string(),
    supplier: z.string(),
    supplierRut: z.string()
}));

// Mantener esquemas de inventario para compatibilidad
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

export const CloudReceptionRowSchema = z.object({
    "ID_RECEPCION": cleanString,
    "FECHA_HORA": cleanString,
    "ETIQUETA": cleanString,
    "ESTADO": cleanString,
});
