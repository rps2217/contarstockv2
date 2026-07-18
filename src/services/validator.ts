import { Product, ScanRecord } from '../types';
import { ProductSchema, ScanRecordSchema } from '../schemas/database';
import { ZodError } from 'zod';

/**
 * Bridge to maintain compatibility with existing code while using central schemas.
 */
export const validateProduct = (data: unknown) => {
  const result = ProductSchema.safeParse(data);
  if (result.success) {
    return {
      valid: true,
      error: undefined,
      data: result.data as Product,
    };
  } else {
    const zodError = result.error as ZodError;
    return {
      valid: false,
      error: zodError.errors[0].message,
      data: undefined,
    };
  }
};

export const validateScanRecord = (data: unknown) => {
  const result = ScanRecordSchema.safeParse(data);
  if (result.success) {
    return {
      valid: true,
      error: undefined,
      data: result.data as ScanRecord,
    };
  } else {
    const zodError = result.error as ZodError;
    return {
      valid: false,
      error: zodError.errors[0].message,
      data: undefined,
    };
  }
};
