
import { z } from 'zod';
import { CLOUD_COLUMNS } from './constants';
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

 const barcode = getVal([mapping?.barcode || '', "barcode", "COD PRODUCTO", "COD_PRODUCTO", "CODIGO", "CODIGO BARRAS", "CODIGO_BARRAS", "COD_BARRAS", "SKU", "BARCODE", "EAN", "ID", "ID_PRODUCTO", "ITEM", "COD_ITEM"]);
 const name = getVal([mapping?.name || '', "name", "DESCRIPCION", "PRODUCTO", "NOMBRE", "DESCRIPTOR", "DESC", "DESCRIP", "ITEM", "DESCRIPCION_PROD", "DETALLE", "ITEM_NAME"]) || "PRODUCTO DESCONOCIDO";
 const category = getVal([mapping?.category || '', "category", "MUNDO", "CATEGORIA", "CATEGORY"]) || "GENERAL";
 const supplier = getVal([mapping?.supplier || '', "supplier", "PROVEEDOR", "SUPPLIER", "PROVIDER", "LABORATORIO", "LAB", "MARCA"]);
 const supplierRut = getVal([mapping?.supplierRut || '', "supplier_rut", "supplierrut", "RUT PROVEEDOR", "RUT", "PROVEEDOR_RUT", "RUT_PROVEEDOR", "RUT_PROV"]);
 const priceRaw = getVal([mapping?.price || '', "price", "PRECIO", "PRICE"]);
 const unitsPerBoxRaw = getVal([mapping?.unitsPerBox || '', "units_per_box", "unitsperbox", "UNIDADES POR CAJA", "UNIDADES", "UNITS"]);

 const parsedPrice = Number(priceRaw);
 const price = priceRaw && !isNaN(parsedPrice) ? parsedPrice : undefined;
 
 const parsedUnits = Number(unitsPerBoxRaw);
 const unitsPerBox = unitsPerBoxRaw && !isNaN(parsedUnits) ? parsedUnits : undefined;

 return {
 barcode: normalizeSku(String(barcode)),
 name: String(name).trim().toUpperCase(),
 category: String(category).trim().toUpperCase(),
 supplier: String(supplier).trim().toUpperCase(),
 supplierRut: normalizeIdentity(String(supplierRut)),
 price: price ? Number(price) : undefined,
 unitsPerBox: unitsPerBox ? Number(unitsPerBox) : undefined
 };
}).pipe(z.object({
 barcode: z.string().min(1, "El código es obligatorio"),
 name: z.string().default("PRODUCTO DESCONOCIDO"),
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

export const CloudProviderSchema = z.record(z.any()).transform((raw) => {
  const name = String(raw.name || raw.NOMBRE || raw.PROVEEDOR || 'PROVEEDOR SIN NOMBRE').trim().toUpperCase();
  let rut = normalizeIdentity(String(raw.rut || raw.RUT || raw.ID || raw.id || raw.ID_RUT || raw.RUT_PROVEEDOR || ''));
  if (!rut) {
    rut = 'RUT_NR_' + name.replace(/[^A-Z0-9]/g, '_').substring(0, 15);
  }
  
  const rawWithdrawal = raw.withdrawal_days !== undefined ? raw.withdrawal_days :
                        raw.withdrawalDays !== undefined ? raw.withdrawalDays :
                        raw.DIAS_RETIRO !== undefined ? raw.DIAS_RETIRO :
                        raw.DIAS_CANJE !== undefined ? raw.DIAS_CANJE :
                        raw.DAYS !== undefined ? raw.DAYS : 0;
  const withdrawalDays = Number(rawWithdrawal) || 0;

  const rawExchange = raw.has_exchange !== undefined ? raw.has_exchange :
                      raw.hasExchange !== undefined ? raw.hasExchange :
                      raw.CANJE !== undefined ? raw.CANJE :
                      raw.TIENE_CANJE !== undefined ? raw.TIENE_CANJE :
                      raw.EXCHANGE_POLICY !== undefined ? raw.EXCHANGE_POLICY : false;
  
  let hasExchange = false;
  if (rawExchange === true || rawExchange === 'true' || rawExchange === 1 || rawExchange === '1' || rawExchange === 'SI') {
    hasExchange = true;
  } else if (typeof rawExchange === 'string') {
    const s = rawExchange.toUpperCase().trim();
    hasExchange = (s === 'TRUE' || s === '1' || s === 'SI' || s === 'CANJE' || s === 'ACTIVO' || s === 'YES');
  } else if (typeof rawExchange === 'boolean') {
    hasExchange = rawExchange;
  }

  return {
    rut,
    name,
    withdrawalDays,
    hasExchange
  };
}).pipe(z.object({
  rut: z.string().min(1),
  name: z.string().min(1),
  withdrawalDays: z.number().default(0),
  hasExchange: z.boolean().default(false)
}));

export const CloudInventoryRowSchema = z.object({
 [CLOUD_COLUMNS.ERP_ORDER]: cleanString,
 [CLOUD_COLUMNS.LABEL]: cleanString,
 [CLOUD_COLUMNS.BARCODE]: cleanString,
 [CLOUD_COLUMNS.QUANTITY]: z.coerce.number().default(0),
 [CLOUD_COLUMNS.DATE]: cleanString,
 [CLOUD_COLUMNS.MONTH]: z.coerce.number().optional(),
 [CLOUD_COLUMNS.YEAR]: z.coerce.number().optional(),
 [CLOUD_COLUMNS.PRODUCT_NAME]: cleanString.optional(),
 [CLOUD_COLUMNS.INCIDENT]: cleanString.optional(),
});

export const CloudReceptionRowSchema = z.object({
 "ID_RECEPCION": cleanString,
 "FECHA_HORA": cleanString,
 "ETIQUETA": cleanString,
 "ESTADO": cleanString,
});

// Forced GitHub sync
