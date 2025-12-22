
import { sanitizeBarcode } from './utils';
import { calculateOrderMatch } from './matcher';
import { ConsolidatedItem, ExpectedOrder } from '../types';
import { db } from '../db';
import * as sessionService from './sessionService';
import { aggregateScans } from './aggregator';

export interface DiagnosticResult {
    passed: number;
    failed: number;
    logs: { msg: string; type: 'info' | 'success' | 'error'; latency?: number }[];
    totalLatency: number;
}

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

    log("--- INICIANDO AUDITORÍA DE REGRESIÓN v2.5 ---", 'info');

    // 1. TEST DE INTEGRIDAD DE AGREGACIÓN (Crucial para Reportes)
    try {
        const tStart = performance.now();
        const mockScans = [
            { id: '1', sessionId: 'TEST', barcode: 'SKU1', quantity: 5, timestamp: Date.now(), synced: 0 },
            { id: '2', sessionId: 'TEST', barcode: 'SKU1', quantity: 3, timestamp: Date.now(), synced: 0 },
            { id: '3', sessionId: 'TEST', barcode: 'SKU2', quantity: 10, timestamp: Date.now(), synced: 0 },
        ];
        const result = await aggregateScans(mockScans as any);
        const sku1 = result.find(r => r.barcode === 'SKU1');
        
        if (sku1?.totalQuantity === 8 && result.length === 2) {
            log("Motor de Agregación: Integridad confirmada", 'success', performance.now() - tStart);
        } else {
            log("Motor de Agregación: Error de cálculo detectado", 'error');
        }
    } catch (e: any) { log(`Fallo crítico Agregador: ${e.message}`, 'error'); }

    // 2. STRESS TEST DE ESCRITURA (Previene bloqueos de UI)
    try {
        const tStart = performance.now();
        const testSessionId = 'STRESS-UNIT-TEST';
        const batchSize = 50;
        const promises = [];
        
        for(let i=0; i < batchSize; i++) {
            promises.push(sessionService.addScan(testSessionId, `SKU-STRESS-${i % 5}`, 1));
        }
        await Promise.all(promises);
        
        // Esperar flush de buffer
        await new Promise(r => setTimeout(r, 1200));
        
        const count = await db.scans.where('sessionId').equals(testSessionId).count();
        if (count === batchSize) {
            log(`Escritura Concurrente: ${batchSize} ops sin pérdida de datos`, 'success', performance.now() - tStart);
        } else {
            log(`Escritura Concurrente: Pérdida de datos (${count}/${batchSize})`, 'error');
        }
        await db.scans.where('sessionId').equals(testSessionId).delete();
    } catch (e: any) { log(`Stress Test fallido: ${e.message}`, 'error'); }

    // 3. VALIDACIÓN DE NORMALIZACIÓN (Previene fallos de búsqueda)
    const normTests = [
        { in: ' 780-abc ', out: '780-ABC' },
        { in: '99\u200B88', out: '9988' }
    ];
    const normOk = normTests.every(t => sanitizeBarcode(t.in) === t.out);
    normOk ? log("Sanitización de Datos: Robusta", 'success') : log("Sanitización: Regresión detectada", 'error');

    return {
        passed,
        failed,
        logs,
        totalLatency: performance.now() - startTime
    };
};
