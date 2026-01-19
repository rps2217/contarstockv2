
import { sanitizeBarcode } from './utils';
import { aggregateScans } from './aggregator';

export interface DiagnosticResult {
    passed: number;
    failed: number;
    logs: { msg: string; type: 'info' | 'success' | 'error'; latency?: number }[];
    totalLatency: number;
}

/**
 * MOTOR DE AUDITORÍA v3.1 (Silent Mode)
 * Ejecuta pruebas de integridad sin generar ruido en la consola.
 */
export const runFullSystemAudit = async (): Promise<DiagnosticResult> => {
    let passed = 0;
    let failed = 0;
    const logs: DiagnosticResult['logs'] = [];
    const startTime = performance.now();

    const log = (msg: string, type: 'info' | 'success' | 'error' = 'info', latency?: number) => {
        logs.push({ msg, type, latency });
        if (type === 'success') passed++;
        if (type === 'error') failed++;
    };

    // 1. TEST: AGREGACIÓN DE ALTO RENDIMIENTO (Matemática Pura)
    try {
        const tStart = performance.now();
        const mockScans = [
            { id: 't1', sessionId: 'AUDIT', barcode: 'SKU-A', quantity: 10, timestamp: Date.now(), synced: 0 },
            { id: 't2', sessionId: 'AUDIT', barcode: 'SKU-A', quantity: 5, timestamp: Date.now(), synced: 0 },
        ];
        const res = await aggregateScans(mockScans as any);
        if (res.length === 1 && res[0].totalQuantity === 15) {
            log("Motor de Cálculo: Verificado", 'success', performance.now() - tStart);
        } else {
            throw new Error("Error matemático en agregación");
        }
    } catch (e: any) { log(`Fallo Agregador: ${e.message}`, 'error'); }

    // 2. TEST: NORMALIZACIÓN DE DATOS (Input Sanitization)
    const samples = [
        { in: '  780-123  ', out: '780-123' },
        { in: 'abc\u200Bdef', out: 'ABCDEF' }
    ];
    const isNormOk = samples.every(s => sanitizeBarcode(s.in) === s.out);
    isNormOk ? log("Sanitizador de Inputs: Robusto", 'success') : log("Sanitizador: Fallo", 'error');

    return {
        passed,
        failed,
        logs,
        totalLatency: performance.now() - startTime
    };
};
