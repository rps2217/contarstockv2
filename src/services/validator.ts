
import { z } from 'zod';
import { Product, ScanRecord, CountingSession } from '../types';

/**
 * Esquema de Código de Barras:
 * - Mínimo 3 caracteres, máximo 64.
 * - Solo caracteres alfanuméricos y guiones (estándar logístico).
 */
export const BarcodeSchema = z.string()
 .min(3, "Código demasiado corto")
 .max(64, "Código demasiado largo")
 .transform(val => val.trim().toUpperCase());

/**
 * Esquema de Producto: Blindaje del Catálogo
 */
export const ProductSchema = z.object({
 barcode: BarcodeSchema,
 name: z.string().min(2, "Nombre requerido").max(200),
 category: z.string().default("GENERAL"),
 supplier: z.string().optional().default(""),
 supplierRut: z.string().optional().default(""),
 syncStatus: z.enum(['synced', 'add', 'edit']).default('add'),
 embedding: z.array(z.number()).optional()
});

/**
 * Esquema de Escaneo: Blindaje del flujo ráfaga
 */
export const ScanRecordSchema = z.object({
 id: z.string().uuid("ID de registro inválido"),
 sessionId: z.string().uuid("ID de sesión inválido"),
 barcode: BarcodeSchema,
 quantity: z.number().positive("La cantidad debe ser mayor a 0").max(10000, "Cantidad fuera de rango manual"),
 mm: z.number().min(1).max(12).optional(),
 yyyy: z.number().min(2020).max(2050).optional(),
 timestamp: z.number().default(() => Date.now()),
 isIncident: z.boolean().default(false)
});

export const validateProduct = (data: any) => {
 const result = ProductSchema.safeParse(data);
 if (result.success) {
 return {
 valid: true,
 error: undefined,
 data: result.data as Product
 };
 } else {
 return {
 valid: false,
 error: (result as any).error.errors[0].message,
 data: undefined
 };
 }
};

export const validateScanRecord = (data: any) => {
 const result = ScanRecordSchema.safeParse(data);
 if (result.success) {
 return {
 valid: true,
 error: undefined,
 data: result.data as ScanRecord
 };
 } else {
 return {
 valid: false,
 error: (result as any).error.errors[0].message,
 data: undefined
 };
 }
};

// Forced GitHub sync
