/**
 * =============================================================================
 * SCHEMAS DE VALIDACION - Zod
 * =============================================================================
 * 
 * Esquemas de validación para todos los modelos de la aplicación.
 * Usar para validar datos antes de guardar en IndexedDB o enviar a Supabase.
 * 
 * SCHEMAS LOCALES (esta carpeta):
 * - ProductSchema, ProviderSchema, CustomerSchema
 * - ExpiryRecordSchema, SessionSchema, EventSchema
 * 
 * SCHEMAS CLOUD (services/schemas.ts):
 * - CloudProductSchema (importación desde CSV/Excel)
 * - CloudProviderSchema
 * - CloudOrderRowSchema
 * 
 * @module schemas
 */

import { z } from 'zod';

// Re-exportar schemas de cloud para uso conveniente
export {
  CloudProductSchema,
  CloudProviderSchema,
  CloudStockSchema,
  CloudOrderRowSchema,
  CloudInventoryRowSchema,
  CloudReceptionRowSchema,
} from '@/services/schemas';

// =============================================================================
// SCHEMAS BASE
// =============================================================================

/** Schema para fechas */
export const dateSchema = z.union([
  z.string().datetime(),
  z.number().positive(),
  z.date()
]).transform(val => {
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'string') return new Date(val).getTime();
  return val;
});

/** Schema para RUT chileno - acepta múltiples formatos */
export const rutSchema = z.string()
  .min(5, 'RUT demasiado corto')
  .max(15, 'RUT demasiado largo')
  .regex(
    /^(?:$|^\s*$|^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$|^\d{7,9}-[\dkK]$|^\d{1,2}\.\d{3}\.\d{3}[\dkK]$|^\d{7,9}[\dkK]$|^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$|^\d{7,9}[\dkK]$)/i,
    'RUT inválido'
  )
  .transform(val => val.trim().toUpperCase())
  .optional()
  .or(z.literal(''));

/** Schema para SKU/Barcode */
export const barcodeSchema = z.string()
  .min(8, 'Barcode mínimo 8 caracteres')
  .max(50, 'Barcode demasiado largo')
  .regex(/^[\dA-Za-z-]+$/, 'Barcode contiene caracteres inválidos');

/** Schema para código de barras EAN/UPC */
export const eanBarcodeSchema = z.string()
  .regex(/^\d{8}$|^\d{12}$|^\d{13}$/, 'EAN/UPC inválido (debe ser 8, 12 o 13 dígitos)');

/** Schema para ubicación en bodega */
export const locationSchema = z.string()
  .max(100, 'Ubicación demasiado larga')
  .regex(/^[A-Z0-9\-\/]+$/, 'Ubicación debe ser mayúsculas, números, guiones')

// =============================================================================
// PRODUCTOS
// =============================================================================

export const ProductSchema = z.object({
  barcode: barcodeSchema,
  name: z.string().min(1, 'Nombre requerido').max(200, 'Nombre demasiado largo'),
  category: z.string().max(50).optional().default('GENERAL'),
  supplierRut: rutSchema.optional().nullable(),
  supplier: z.string().max(200).optional(),
  price: z.number().min(0).optional().default(0),
  unitsPerBox: z.number().int().min(1).optional().default(1),
  imageUrl: z.string().url().optional(),
  syncStatus: z.enum(['pending', 'synced', 'error', 'pending_delete']).optional().default('pending'),
  updatedAt: z.number().optional(),
});

export type ValidatedProduct = z.infer<typeof ProductSchema>;

// =============================================================================
// PROVEEDORES
// =============================================================================

export const ProviderSchema = z.object({
  rut: rutSchema,
  name: z.string().min(1, 'Nombre requerido').max(200),
  withdrawalDays: z.number().int().min(0).max(365).optional().default(30),
  hasExchange: z.boolean().optional().default(false),
  exchangePolicy: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  address: z.string().max(300).optional(),
  syncStatus: z.enum(['pending', 'synced', 'error']).optional().default('pending'),
  updatedAt: z.number().optional(),
});

export type ValidatedProvider = z.infer<typeof ProviderSchema>;

// =============================================================================
// CLIENTES
// =============================================================================

export const CustomerSchema = z.object({
  id: z.string().uuid().optional(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  rut: rutSchema.optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  syncStatus: z.enum(['pending', 'synced', 'error']).optional().default('pending'),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type ValidatedCustomer = z.infer<typeof CustomerSchema>;

// =============================================================================
// VENCIMIENTOS
// =============================================================================

const mmSchema = z.number().int().min(1).max(12);
const yyyySchema = z.number().int().min(2020).max(2050);

export const ExpiryRecordSchema = z.object({
  id: z.string().uuid().optional(),
  barcode: barcodeSchema,
  productName: z.string().min(1).max(200),
  providerName: z.string().max(200).optional(),
  providerRut: rutSchema.optional(),
  mm: mmSchema,
  yyyy: yyyySchema,
  quantity: z.number().int().min(1).max(99999).optional().default(1),
  location: z.string().max(100).optional(),
  observaciones: z.string().max(500).optional(),
  claveUnica: z.string().max(100).optional(),
  withdrawalDays: z.number().int().min(0).max(365).optional().default(30),
  hasCanje: z.boolean().optional().default(false),
  timestamp: z.number().optional(),
  syncStatus: z.enum(['pending', 'synced', 'error']).optional().default('pending'),
  // Campos calculados (opcionales en input)
  daysLeft: z.number().optional(),
  status: z.enum(['expired', 'critical', 'withdrawal', 'next_expiry', 'safe']).optional(),
});

export type ValidatedExpiryRecord = z.infer<typeof ExpiryRecordSchema>;

// =============================================================================
// SESIONES DE CONTEO
// =============================================================================

export const SessionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  status: z.enum(['active', 'completed', 'synced', 'error']).optional().default('active'),
  erpOrder: z.string().max(100).optional(),
  logisticsLabel: z.string().max(200).optional(),
  sessionType: z.enum(['standard', 'bulk', 'express']).optional().default('standard'),
  auditStatus: z.enum(['pending', 'completed', 'approved']).optional().default('pending'),
  mm: mmSchema.optional(),
  yyyy: yyyySchema.optional(),
  batch: z.string().max(50).optional(),
  photoUrl: z.string().url().optional(),
  syncStatus: z.enum(['pending', 'synced', 'error']).optional().default('pending'),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
  lastSyncTimestamp: z.number().optional(),
});

export type ValidatedSession = z.infer<typeof SessionSchema>;

// =============================================================================
// EVENTOS
// =============================================================================

export const EventSchema = z.object({
  id: z.string().uuid().optional(),
  barcode: barcodeSchema,
  productName: z.string().min(1).max(200),
  providerName: z.string().max(200).optional(),
  providerRut: rutSchema.optional(),
  event: z.enum(['count', 'adjustment', 'transfer', 'incident', 'return']),
  quantity: z.number().int().min(-99999).max(99999),
  frc: z.string().max(100).optional(),
  erp: z.string().max(100).optional(),
  traspaso: z.string().max(100).optional(),
  destino: z.string().max(200).optional(),
  observaciones: z.string().max(500).optional(),
  isAdjusted: z.boolean().optional().default(false),
  batch: z.string().max(50).optional(),
  claveUnica: z.string().max(100).optional(),
  timestamp: z.number(),
  syncStatus: z.enum(['pending', 'synced', 'error']).optional().default('pending'),
  location: z.string().max(100).optional(),
  mm: mmSchema.optional(),
  yyyy: yyyySchema.optional(),
});

export type ValidatedEvent = z.infer<typeof EventSchema>;

// =============================================================================
// HELPERS DE VALIDACION
// =============================================================================

/**
 * Valida un objeto contra un schema de Zod
 * Retorna el objeto validado o lanza un error descriptivo
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    const message = context 
      ? `Validation failed for ${context}: ${errors}`
      : `Validation failed: ${errors}`;
    throw new ValidationError(message, result.error.errors);
  }
  
  return result.data;
}

/**
 * Valida sin lanzar - retorna success/error
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: z.ZodError['errors'] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { success: false, errors: result.error.errors };
}

/**
 * Clase de error para validación
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError['errors']
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// =============================================================================
// VALIDATORS PRE-CONFIGURED
// =============================================================================

/**
 * Valida un producto antes de guardar
 */
export function validateProduct(data: unknown): ValidatedProduct {
  const result = ProductSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new ValidationError(`Validation failed for Product: ${errors}`, result.error.errors);
  }
  return result.data;
}

/**
 * Valida un proveedor antes de guardar
 */
export function validateProvider(data: unknown): ValidatedProvider {
  const result = ProviderSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new ValidationError(`Validation failed for Provider: ${errors}`, result.error.errors);
  }
  return result.data;
}

/**
 * Valida un cliente antes de guardar
 */
export function validateCustomer(data: unknown): ValidatedCustomer {
  const result = CustomerSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new ValidationError(`Validation failed for Customer: ${errors}`, result.error.errors);
  }
  return result.data;
}

/**
 * Valida un vencimiento antes de guardar
 */
export function validateExpiry(data: unknown): ValidatedExpiryRecord {
  const result = ExpiryRecordSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new ValidationError(`Validation failed for ExpiryRecord: ${errors}`, result.error.errors);
  }
  return result.data;
}

/**
 * Valida una sesión antes de guardar
 */
export function validateSession(data: unknown): ValidatedSession {
  const result = SessionSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new ValidationError(`Validation failed for Session: ${errors}`, result.error.errors);
  }
  return result.data;
}

/**
 * Valida un evento antes de guardar
 */
export function validateEvent(data: unknown): ValidatedEvent {
  const result = EventSchema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new ValidationError(`Validation failed for Event: ${errors}`, result.error.errors);
  }
  return result.data;
}

/**
 * Valida un barcode (SKU)
 */
export function validateBarcode(data: unknown): string {
  return validate(barcodeSchema, data, 'Barcode');
}

/**
 * Valida un RUT chileno
 */
export function validateRut(data: unknown): string {
  return validate(rutSchema, data, 'RUT');
}
