
import { z } from 'zod';
import { logger } from './logger';
import { ProductSchema, ScanRecordSchema } from './validator';

/**
 * PROTECCIÓN ANTICORRUPCIÓN
 * Este servicio actúa como una muralla entre la lógica de la app y el disco.
 */
export const IntegrityGuard = {
    /**
     * Valida un producto antes de guardarlo.
     */
    validateProduct: (data: any) => {
        const result = ProductSchema.safeParse(data);
        if (!result.success) {
            const errorMsg = `Regresión de Datos (Producto): ${result.error.errors[0].message}`;
            logger.error('INTEGRITY_GUARD', errorMsg, data);
            throw new Error(errorMsg);
        }
        return result.data;
    },

    /**
     * Valida un escaneo antes de guardarlo.
     */
    validateScan: (data: any) => {
        const result = ScanRecordSchema.safeParse(data);
        if (!result.success) {
            const errorMsg = `Regresión de Datos (Escaneo): ${result.error.errors[0].message}`;
            logger.error('INTEGRITY_GUARD', errorMsg, data);
            throw new Error(errorMsg);
        }
        return result.data;
    }
};
