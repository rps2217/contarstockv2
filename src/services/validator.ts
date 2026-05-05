
import { Product, ScanRecord } from '../types';
import { ProductSchema, ScanRecordSchema } from '../schemas/database';

/**
 * Bridge to maintain compatibility with existing code while using central schemas.
 */
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
