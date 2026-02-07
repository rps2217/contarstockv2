
import { z } from 'zod';
import { SHEET_COLUMNS } from './constants';

const cleanString = z.union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((val) => {
        if (val === null || val === undefined) return '';
        return String(val).trim();
    });

export const CloudProductSchema = z.record(z.any()).transform((raw) => {
    const normalized: Record<string, any> = {};
    Object.keys(raw).forEach(k => {
        const key = k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        normalized[key] = raw[k];
    });

    const barcode = normalized["COD PRODUCTO"] || normalized["CODIGO"] || normalized["SKU"] || normalized["BARCODE"] || normalized["EAN"] || "";
    const name = normalized["DESCRIPCION"] || normalized["PRODUCTO"] || normalized["NOMBRE"] || normalized["DESCRIP"] || normalized["ITEM"] || "Sin descripción";
    const category = normalized["MUNDO"] || normalized["CATEGORIA"] || normalized["CATEGORY"] || "GENERAL";
    const supplier = normalized["PROVEEDOR"] || normalized["SUPPLIER"] || "";
    const supplierRut = normalized["RUT PROVEEDOR"] || normalized["RUT"] || "";
    
    // Recuperación de Inteligencia Colectiva
    const embeddingRaw = normalized["FIRMA_IA"] || normalized["EMBEDDING"] || normalized["VECTOR"] || normalized["IA_SIGNATURE"];
    let embedding: number[] | undefined;
    
    if (embeddingRaw) {
        try {
            const parsed = JSON.parse(embeddingRaw);
            if (Array.isArray(parsed)) embedding = parsed;
        } catch (e) {
            // Falla silenciosa si el JSON está corrupto en la celda
        }
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
        const key = k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        normalized[key] = raw[k];
    });

    const barcode = normalized["CODIGO"] || normalized["SKU"] || normalized["EAN"] || normalized["ITEM"] || "";
    const name = normalized["PRODUCTO"] || normalized["DESCRIPCION"] || normalized["NOMBRE"] || "Producto Desconocido";
    const qty = normalized["STOCKFINAL"] || normalized["STOCK"] || normalized["CANTIDAD"] || normalized["QTY"] || normalized["SALDO"] || 0;
    const loc = normalized["LOC"] || normalized["UBICACION"] || normalized["POSICION"] || "";

    return {
        barcode: String(barcode).trim(),
        name: String(name).trim(),
        expectedQty: Number(qty),
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
        const key = k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
        normalized[key] = raw[k];
    });

    const erp = normalized["ERP"] || normalized["ORDEN"] || normalized["DOCUMENTO"] || normalized["DOC"] || normalized["NROORDEN"] || normalized["NUMERO"] || "";
    const barcode = normalized["CODIGO"] || normalized["SKU"] || normalized["EAN"] || normalized["BARRAS"] || normalized["ITEM"] || "";
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
