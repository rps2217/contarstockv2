
import { z } from 'zod';

// Schema para Clientes
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
  syncStatus: z.enum(['synced', 'pending', 'error', 'pending_delete']).default('pending')
});

// Schema para Escaneos (Picks)
export const ScanSchema = z.object({
  id: z.string(),
  barcode: z.string().min(1),
  name: z.string(),
  quantity: z.number().positive(),
  timestamp: z.number(),
  operatorId: z.string(),
  sessionId: z.string(),
  logisticsLabel: z.string().optional(),
  syncStatus: z.enum(['synced', 'pending', 'error', 'pending_delete']).default('pending')
});

// Schema para Plantillas de Mensajes
export const MessageTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  content: z.string().min(1),
  updatedAt: z.number(),
  syncStatus: z.enum(['synced', 'pending', 'error', 'pending_delete']).default('pending').optional()
});

export type ValidatedCustomer = z.infer<typeof CustomerSchema>;
export type ValidatedScan = z.infer<typeof ScanSchema>;
export type ValidatedMessageTemplate = z.infer<typeof MessageTemplateSchema>;
