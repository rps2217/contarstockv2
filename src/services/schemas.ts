
import { z } from 'zod';
import { SHEET_COLUMNS } from './constants';
import { normalizeSku, normalizeIdentity } from './utils';
import { getSettings } from './settings';

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

 const mapping = getSettings().cloudConfig?.mappings?.products;

 const getVal = (keys: string[]) => {
  for (const k of keys) {
   if (k && raw[k] !== undefined && raw[k] !== null && String(raw[k]).trim() !== '') {
    return String(raw[k]).trim();
   }
  }
  for (const k of keys) {
   const normK = k ? k.trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : '';
   if (normK && normalized[normK] !== undefined && normalized[normK] !== null && String(normalized[normK]).trim() !== '') {
    return String(normalized[normK]).trim();
   }
  }
  return "";
 };

 const barcode = getVal([mapping?.barcode || '', "barcode", "COD PRODUCTO", "COD_PRODUCTO", "CODIGO", "CODIGO BARRAS", "CODIGO_BARRAS", "SKU", "BARCODE", "EAN", "ID", "ID_PRODUCTO"]);
 const name = getVal([mapping?.name || '', "name", "DESCRIPCION", "PRODUCTO", "NOMBRE", "DESCRIP", "ITEM"]) || "Sin descripción";
 const category = getVal([mapping?.category || '', "category", "MUNDO", "CATEGORIA", "CATEGORY"]) || "GENERAL";
 const supplier = getVal([mapping?.supplier || '', "supplier", "PROVEEDOR", "SUPPLIER", "PROVIDER", "LABORATORIO", "LAB", "MARCA"]);
 const supplierRut = getVal([mapping?.supplierRut || '', "supplier_rut", "supplierrut", "RUT PROVEEDOR", "RUT"]);
 const priceRaw = getVal([mapping?.price || '', "price", "PRECIO", "PRICE"]);
 const unitsPerBoxRaw = getVal([mapping?.unitsPerBox || '', "units_per_box", "unitsperbox", "UNIDADES POR CAJA", "UNIDADES", "UNITS"]);

 const parsedPrice = Number(priceRaw);
 const price = priceRaw && !isNaN(parsedPrice) ? parsedPrice : undefined;
 
 const parsedUnits = Number(unitsPerBoxRaw);
 const unitsPerBox = unitsPerBoxRaw && !isNaN(parsedUnits) ? parsedUnits : undefined;

 return {
 barcode: normalizeSku(String(barcode)),
 name: String(name).trim(),
 category: String(category).trim(),
 supplier: String(supplier).trim(),
 supplierRut: normalizeIdentity(String(supplierRut)),
 price: price ? Number(price) : undefined,
 unitsPerBox: unitsPerBox ? Number(unitsPerBox) : undefined
 };
}).pipe(z.object({
 barcode: z.string().min(1, "El código es obligatorio"),
 name: z.string().default("Sin descripción"),
 category: z.string().default("GENERAL"),
 supplier: z.string().default(""),
 supplierRut: z.string().default(""),
 price: z.number().optional(),
 unitsPerBox: z.number().optional()
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

/**
 * ESQUEMA DE PEDIDOS (NUEVA CARGA)
 * Flexibilizado para capturar más tipos de cabeceras y permitir QTY >= 0.
 */
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
 qty: z.coerce.number().min(0) // Permitimos 0 para precarga de ítems faltantes
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

// Forced GitHub sync
