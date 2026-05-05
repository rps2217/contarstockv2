import { z } from 'zod';

export const SyncStatusSchema = z.enum(['synced', 'pending', 'error', 'pending_delete']);

export const BarcodeSchema = z.string()
  .min(3, "Código demasiado corto")
  .max(64, "Código demasiado largo")
  .transform(val => val.trim().toUpperCase());

export const ProductSchema = z.object({
  barcode: BarcodeSchema,
  name: z.string().min(2, "Nombre requerido").max(200),
  category: z.string().default("GENERAL"),
  supplier: z.string().optional().default(""),
  supplierRut: z.string().optional().default(""),
  price: z.number().optional().default(0),
  unitsPerBox: z.number().int().positive().optional().default(1),
  syncStatus: SyncStatusSchema.default('pending').optional(),
  embedding: z.array(z.number()).optional()
});

export const CountingSessionSchema = z.object({
  id: z.string().uuid(),
  erpOrder: z.string().min(1),
  logisticsLabel: z.string().min(1),
  createdAt: z.number().default(() => Date.now()),
  status: z.enum(['active', 'completed', 'draft']).default('active'),
  sessionType: z.enum(['standard', 'hammer', 'reception']).default('standard'),
  operatorId: z.string().optional(),
  totalUnits: z.number().optional().default(0),
  totalSKUs: z.number().optional().default(0),
  lastSyncTimestamp: z.number().optional(),
  mm: z.number().min(1).max(12).optional(),
  yyyy: z.number().min(2020).max(2100).optional(),
  syncStatus: SyncStatusSchema.default('pending').optional()
});

export const ScanRecordSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  barcode: BarcodeSchema,
  timestamp: z.number().default(() => Date.now()),
  quantity: z.number().positive().max(10000),
  logisticsLabel: z.string().optional(),
  expiryDate: z.string().optional(),
  batch: z.string().optional(),
  mm: z.number().min(1).max(12).optional(),
  yyyy: z.number().min(2020).max(2100).optional(),
  isIncident: z.boolean().default(false),
  syncStatus: SyncStatusSchema.default('pending').optional()
});

export const ProviderSchema = z.object({
  rut: z.string().min(1),
  name: z.string().min(2),
  exchangePolicy: z.string().optional(),
  withdrawalDays: z.number().int().nonnegative().optional(),
  hasExchange: z.boolean().optional(),
  syncStatus: SyncStatusSchema.default('synced').optional()
});

export const MessageTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  subject: z.string().optional(),
  content: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  syncStatus: SyncStatusSchema.default('synced').optional()
});

export const CustomerSchema = z.object({
  id: z.string().uuid().or(z.string().min(1)),
  firstName: z.string().min(1, "El nombre es requerido"),
  lastName: z.string().min(1, "El apellido es requerido"),
  phone: z.string().min(8, "Teléfono inválido"),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  address: z.string().optional(),
  rut: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
  syncStatus: SyncStatusSchema.default('pending').optional()
});

export type ProductInput = z.infer<typeof ProductSchema>;
export type SessionInput = z.infer<typeof CountingSessionSchema>;
export type ScanInput = z.infer<typeof ScanRecordSchema>;
export type ProviderInput = z.infer<typeof ProviderSchema>;
export type MessageTemplateInput = z.infer<typeof MessageTemplateSchema>;
export type CustomerInput = z.infer<typeof CustomerSchema>;
