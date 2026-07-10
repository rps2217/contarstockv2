
import { z } from 'zod';

export const productSchema = z.object({
  barcode: z.string()
    .min(1, 'El código es obligatorio')
    .max(50, 'El código es demasiado largo')
    .regex(/^[a-zA-Z0-9_-]+$/, 'El código contiene caracteres no válidos'),
  name: z.string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre es demasiado largo'),
  category: z.string().max(50, 'La categoría es demasiado larga').optional().or(z.literal('')),
  supplier: z.string().max(100, 'El proveedor es demasiado largo').optional().or(z.literal('')),
  supplierRut: z.string()
    .min(1, 'El RUT es obligatorio si se especifica proveedor')
    .max(12, 'El RUT es demasiado largo')
    .regex(/^\d{1,8}-[\dkK]$/, 'Formato RUT inválido (ej: 12345678-K)')
    .optional()
    .or(z.literal('')),
});

export type ProductFormData = z.infer<typeof productSchema>;

