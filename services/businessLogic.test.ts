
import { sanitizeBarcode } from './utils';
import { db } from '../db';
import * as sessionService from './sessionService';
import { aggregateScans } from './aggregator';

export interface DiagnosticResult {
    passed: number;
    failed: number;
    logs: { msg: string; type: 'info' | 'success' | 'error'; latency?: number }[];
    totalLatency: number;
}

/**
 * MOTOR DE AUDITORÍA v3.0 (Anti-Regresiones)
 * Ejecuta un set de pruebas unitarias sobre los servicios core en el cliente.
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

    log("--- INICIANDO ESCUDO DE REGRESIÓN v3.0 ---", 'info');

    // 1. TEST: AGREGACIÓN DE ALTO RENDIMIENTO
    try {
        const tStart = performance.now();
        const mockScans = [
            { id: 't1', sessionId: 'AUDIT', barcode: 'SKU-A', quantity: 10, timestamp: Date.now(), synced: 0 },
            { id: 't2', sessionId: 'AUDIT', barcode: 'SKU-A', quantity: 5, timestamp: Date.now(), synced: 0 },
        ];
        const res = await aggregateScans(mockScans as any);
        if (res.length === 1 && res[0].totalQuantity === 15) {
            log("Lógica de Agregación: Íntegra", 'success', performance.now() - tStart);
        } else {
            throw new Error("Cálculo incorrecto detectado");
        }
    } catch (e: any) { log(`Fallo Agregador: ${e.message}`, 'error'); }

    // 2. TEST: BLINDAJE DE ESCRITURA (IntegrityGuard)
    try {
        const tStart = performance.now();
        const badData = { sessionId: 'invalid-uuid', barcode: 'X', quantity: -1 }; // Debe fallar por Zod
        try {
            await sessionService.addScanEvent(badData.sessionId, badData.barcode, badData.quantity);
            log("Fallo Crítico: El sistema permitió datos corruptos", 'error');
        } catch (e) {
            log("Gatekeeper Zod: Funcionando (Bloqueó regresión de datos)", 'success', performance.now() - tStart);
        }
    } catch (e: any) { log(`Error en Test de Guardián: ${e.message}`, 'error'); }

    // 3. TEST: NORMALIZACIÓN DE LLAVES
    const samples = [
        { in: '  780-123  ', out: '780-123' },
        { in: 'abc\u200Bdef', out: 'ABCDEF' }
    ];
    const isNormOk = samples.every(s => sanitizeBarcode(s.in) === s.out);
    isNormOk ? log("Normalizador: Robusto", 'success') : log("Normalizador: Fallo", 'error');

    return {
        passed,
        failed,
        logs,
        totalLatency: performance.now() - startTime
    };
};
