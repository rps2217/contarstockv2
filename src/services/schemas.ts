
import { z } from 'zod';
import { SHEET_COLUMNS } from './constants';
import { normalizeHeader } from './utils';

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
    const name = normalized["DESCRIPCION"] || normalized["PRODUCTO"] || normalized["NOMBRE"] || normalized["ITEM"] || "Sin descripción";
    
    return {
        barcode: String(barcode).trim(),
        name: String(name).trim(),
        category: normalized["MUNDO"] || normalized["CATEGORIA"] || "GENERAL",
        supplier: normalized["PROVEEDOR"] || "",
        supplierRut: normalized["RUTPROVEEDOR"] || normalized["RUT"] || ""
    };
}).pipe(z.object({
    barcode: z.string().min(1),
    name: z.string(),
    category: z.string(),
    supplier: z.string(),
    supplierRut: z.string()
}));

export const CloudStockSchema = z.record(z.any()).transform((raw) => {
    const normalized: Record<string, any> = {};
    Object.keys(raw).forEach(k => {
        normalized[normalizeHeader(k)] = raw[k];
    });

    const barcode = normalized["CODIGO"] || normalized["SKU"] || normalized["CODPRODUCTO"] || normalized["EAN"] || "";
    const name = normalized["PRODUCTO"] || normalized["DESCRIPCION"] || "Producto Desconocido";
    const qty = normalized["STOCKFINAL"] || normalized["STOCK"] || normalized["STOCKTEORICO"] || normalized["CANTIDAD"] || 0;
    
    return {
        barcode: String(barcode).trim(),
        name: String(name).trim(),
        expectedQty: Number(qty),
        loc: normalized["LOC"] || normalized["UBICACION"] || ""
    };
}).pipe(z.object({
    barcode: z.string().min(1),
    name: z.string(),
    expectedQty: z.number().min(0),
    loc: z.string().optional()
}));

export const CloudOrderRowSchema = z.record(z.any()).transform((raw) => {
    const normalized: Record<string, any> = {};
    Object.keys(raw).forEach(k => {
        normalized[normalizeHeader(k)] = raw[k];
    });

    const erp = normalized["ERP"] || normalized["ORDEN"] || normalized["DOCUMENTO"] || "";
    const barcode = normalized["CODPRODUCTO"] || normalized["CODIGO"] || normalized["SKU"] || "";
    const qty = normalized["CANTIDAD"] || normalized["QTY"] || normalized["UNIDADES"] || 0;

    return {
        erp: String(erp).trim(),
        barcode: String(barcode).trim(),
        name: normalized["PRODUCTO"] || normalized["DESCRIPCION"] || "Producto",
        qty: Number(qty)
    };
}).pipe(z.object({
    erp: z.string().min(1),
    barcode: z.string().min(1),
    name: z.string(),
    qty: z.coerce.number().min(0)
}));
