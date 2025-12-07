
import { Product, CountingSession, ScanRecord } from '../types';

/**
 * Validates a Product object to ensure it meets database requirements.
 * Used before importing from CSV/Excel/AppSheet to prevent corrupted state.
 */
export const validateProduct = (product: Partial<Product>): { valid: boolean; error?: string } => {
    if (!product.barcode || typeof product.barcode !== 'string' || product.barcode.trim() === '') {
        return { valid: false, error: 'Código de barras inválido o vacío' };
    }
    if (!product.name || typeof product.name !== 'string') {
        return { valid: false, error: 'Nombre de producto inválido' };
    }
    return { valid: true };
};

/**
 * Validates a Session object.
 */
export const validateSession = (session: Partial<CountingSession>): { valid: boolean; error?: string } => {
    if (!session.erpOrder || !session.logisticsLabel) {
        return { valid: false, error: 'Faltan datos requeridos de la sesión (ERP o Etiqueta)' };
    }
    return { valid: true };
};

/**
 * Safe parser that never throws, returns default if failed.
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
    try {
        return JSON.parse(json);
    } catch (e) {
        console.error("JSON Parse Error:", e);
        return fallback;
    }
};
