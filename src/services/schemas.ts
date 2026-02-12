
import { z } from 'zod';
import { SHEET_COLUMNS } from './constants';

/**
 * MOTOR DE NORMALIZACIÓN DE CABECERAS v2.2
 * Elimina espacios, acentos y caracteres especiales para un mapeo robusto.
 */
const normalizeHeader = (h: string) => 
    String(h || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
        .replace(/\s+/g, ""); // Eliminar todos los espacios

const cleanString = z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
        if (val === null || val === undefined) return '';
        return String(val).trim();
    });

export const CloudProductSchema = z.record(z.any()).transform((raw) => {
    const normalized: Record<string, any> = {};
    Object.keys(raw).forEach(k => {
        normalized[normalizeHeader(k)] = raw[k];
    });

    const barcode = normalized["CODPRODUCTO"] || normalized["CODIGO"] || normalized["SKU"] || normalized["BARCODE"] || normalized["EAN"] || "";
    const name = normalized["DESCRIPCION"] || normalized["PRODUCTO"] || normalized["NOMBRE"] || normalized["DESCRIP"] || normalized["ITEM"] || "Sin descripción";
    const category = normalized["MUNDO"] || normalized["CATEGORIA"] || normalized["CATEGORY"] || "GENERAL";
    const supplier = normalized["PROVEEDOR"] || normalized["SUPPLIER"] || "";
    const supplierRut = normalized["RUTPROVEEDOR"] || normalized["RUT"] || "";
    
    const embeddingRaw = normalized["FIRMAIA"] || normalized["EMBEDDING"] || normalized["VECTOR"] || normalized["IASIGNATURE"];
    let embedding: number[] | undefined;
    
    if (embeddingRaw) {
        try {
            const parsed = typeof embeddingRaw === 'string' ? JSON.parse(embeddingRaw) : embeddingRaw;
            if (Array.isArray(parsed)) embedding = parsed;
        } catch (e) {}
    }

    return {
        barcode: String(barcode).trim(),
        name: String(name).trim(),
        category: String(category).trim(),
        supplier: String(supplier).trim(),
        supplierRut: String(supplierRut).trim(),
        embedding
    };
}).pipe(z.object({
    barcode: z.string().min(1, "El código es obligatorio"),
    name: z.string().default("Sin descripción"),
    category: z.string().default("GENERAL"),
    supplier: z.string().default(""),
    supplierRut: z.string().default(""),
    embedding: z.array(z.number()).optional()
}));

export const CloudStockSchema = z.record(z.any()).transform((raw) => {
    const normalized: Record<string, any> = {};
    Object.keys(raw).forEach(k => {
        normalized[normalizeHeader(k)] = raw[k];
    });

    // Mapeo flexible basado en la imagen del usuario (CODIGO, PRODUCTO, LOC, STOCK FINAL)
    const barcode = normalized["CODIGO"] || normalized["SKU"] || normalized["CODPRODUCTO"] || normalized["EAN"] || normalized["ITEM"] || "";
    const name = normalized["PRODUCTO"] || normalized["DESCRIPCION"] || normalized["NOMBRE"] || normalized["DESC"] || "Producto Desconocido";
    
    // Captura "STOCK FINAL" -> "STOCKFINAL" o cualquier variante
    const qtyRaw = normalized["STOCKFINAL"] !== undefined ? normalized["STOCKFINAL"] : 
                   (normalized["STOCK"] || normalized["STOCKTEORICO"] || normalized["CANTIDAD"] || normalized["QTY"] || 0);
    
    const loc = normalized["LOC"] || normalized["UBICACION"] || normalized["POSICION"] || "";

    return {
        barcode: String(barcode).trim(),
        name: String(name).trim(),
        expectedQty: Number(qtyRaw),
        loc: String(loc).trim()
    };
}).pipe(z.object({
    barcode: z.string().min(1, "SKU Inválido"),
    name: z.string(),
    expectedQty: z.number().min(0),
    loc: z.string().optional()
}));

export const CloudOrderRowSchema = z.record(z.any()).transform((raw) => {
    const normalized: Record<string, any> = {};
    Object.keys(raw).forEach(k => {
        normalized[normalizeHeader(k)] = raw[k];
    });

    const erp = normalized["ERP"] || normalized["ORDEN"] || normalized["DOCUMENTO"] || normalized["DOC"] || normalized["NROORDEN"] || normalized["NUMERO"] || "";
    const barcode = normalized["CODPRODUCTO"] || normalized["CODIGO"] || normalized["SKU"] || normalized["EAN"] || normalized["BARRAS"] || normalized["ITEM"] || "";
    const name = normalized["PRODUCTO"] || normalized["DESCRIPCION"] || normalized["NOMBRE"] || normalized["DESC"] || "Producto Desconocido";
    const qty = normalized["CANTIDAD"] || normalized["QTY"] || normalized["UNIDADES"] || normalized["UNID"] || normalized["CANT"] || 0;

    return {
        erp: String(erp).trim(),
        barcode: String(barcode).trim(),
        name: String(name).trim(),
        qty: Number(qty)
    };
}).pipe(z.object({
    erp: z.string().min(1),
    barcode: z.string().min(1),
    name: z.string(),
    qty: z.coerce.number().min(0)
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

export const CloudReceptionRowSchema = z.object({
    "ID_RECEPCION": cleanString,
    "FECHA_HORA": cleanString,
    "ETIQUETA": cleanString,
    "ESTADO": cleanString,
});
