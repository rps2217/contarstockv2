
import { Product, CountingSession, ScanRecord } from '../types';

/**
 * Validates a Product object to ensure it meets database requirements.
 */
export const validateProduct = (product: Partial<Product>): { valid: boolean; error?: string } => {
    if (!product.barcode || typeof product.barcode !== 'string' || product.barcode.trim().length < 3) {
        return { valid: false, error: 'Código de barras demasiado corto o inválido' };
    }
    if (!product.name || typeof product.name !== 'string' || product.name.trim().length < 2) {
        return { valid: false, error: 'Nombre de producto requerido' };
    }
    return { valid: true };
};

/**
 * Validates a Session object.
 */
export const validateSession = (session: Partial<CountingSession>): { valid: boolean; error?: string } => {
    if (!session.erpOrder || session.erpOrder.trim() === '') {
        return { valid: false, error: 'Orden ERP obligatoria' };
    }
    if (!session.logisticsLabel || session.logisticsLabel.trim() === '') {
        return { valid: false, error: 'Etiqueta logística obligatoria' };
    }
    return { valid: true };
};

/**
 * Validador de escaneo para prevenir registros duplicados o corruptos en ráfaga.
 */
export const validateScanRecord = (scan: Partial<ScanRecord>): boolean => {
    if (!scan.barcode || !scan.sessionId || !scan.quantity) return false;
    if (scan.quantity <= 0 || scan.quantity > 10000) return false; // Sanity check
    return true;
};

/**
 * Safe parser that never throws, returns default if failed.
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
    try {
        if (!json) return fallback;
        return JSON.parse(json);
    } catch (e) {
        console.error("JSON Parse Error Recovery:", e);
        return fallback;
    }
};
