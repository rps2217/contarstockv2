
import { sanitizeBarcode } from './utils';
import { calculateOrderMatch } from './matcher';
import { ConsolidatedItem, ExpectedOrder } from '../types';
import { db } from '../db';
import * as sessionService from './sessionService';

export const runSystemDiagnostics = async () => {
    let passed = 0;
    let failed = 0;
    const logs: string[] = [];

    const log = (msg: string, isError = false) => {
        logs.push(msg);
        if (isError) failed++; else passed++;
    };

    log("--- INICIANDO AUDITORÍA DE SISTEMA v2 ---");

    // 1. Test de Integridad de Datos (Sanitize)
    try {
        const tests = [
            { input: ' 780123 ', expected: '780123' },
            { input: 'abc-123', expected: 'ABC-123' },
            { input: '99\u200B88', expected: '9988' } // Zero-width space
        ];
        const allOk = tests.every(t => sanitizeBarcode(t.input) === t.expected);
        if (allOk) log("✅ Desinfección de SKU: Robusta");
        else log("❌ Desinfección de SKU: Falló validación de caracteres invisibles", true);
    } catch (e) { log(`❌ Error Sanitize: ${e}`, true); }

    // 2. Test de Estrés de Inserción (Concurrency Stress)
    try {
        log("⏳ Probando latencia de escritura masiva (100 registros)...");
        const start = performance.now();
        const testSessionId = 'DIAG-STRESS-' + Date.now();
        
        // Simular ráfaga de escaneo ultra-rápida
        const promises = [];
        for(let i=0; i<100; i++) {
            promises.push(sessionService.addScan(testSessionId, 'STRESS-TEST', 1));
        }
        await Promise.all(promises);
        
        // Forzar flush del buffer
        await new Promise(r => setTimeout(r, 600)); 
        
        const count = await db.scans.where('sessionId').equals(testSessionId).count();
        const end = performance.now();
        const duration = end - start;

        if (count === 100) {
            log(`✅ Stress Test: 100 registros en ${duration.toFixed(0)}ms (${(duration/100).toFixed(2)}ms/op)`);
        } else {
            log(`❌ Stress Test: Pérdida de datos detectada. Esperados 100, grabados ${count}`, true);
        }
        
        // Limpiar
        await db.scans.where('sessionId').equals(testSessionId).delete();
    } catch (e: any) {
        log(`❌ Error en Stress Test: ${e.message}`, true);
    }

    // 3. Verificación de Huérfanos
    try {
        const scans = await db.scans.limit(100).toArray();
        const sessions = await db.sessions.toArray();
        const sessionIds = new Set(sessions.map(s => s.id));
        const orphans = scans.filter(s => !sessionIds.has(s.sessionId));
        
        if (orphans.length === 0) log("✅ Integridad Referencial: Sin registros huérfanos");
        else log(`⚠️ Integridad: Detectados ${orphans.length} escaneos sin sesión vinculada`, true);
    } catch (e) { log(`❌ Error Integridad: ${e}`, true); }

    // 4. Test de Matcher (Lógica de Negocio)
    try {
        const mockPhys: ConsolidatedItem[] = [{ barcode: 'X', productName: 'P', totalQuantity: 10, scans: 1 }];
        const mockExp: ExpectedOrder = { 
            id: '1', internalId: 'TEST', totalExpectedUnits: 12, totalExpectedSKUs: 1, importedAt: 0,
            items: [{ barcode: 'X', name: 'P', expectedQty: 12 }] 
        };
        const result = calculateOrderMatch(mockPhys, mockExp);
        if (result.matchScore > 80 && result.status === 'partial') {
            log("✅ Algoritmo Detective: Coincidencia parcial calculada correctamente");
        } else {
            log("❌ Algoritmo Detective: Error en cálculo de desviaciones", true);
        }
    } catch (e) { log(`❌ Error Matcher: ${e}`, true); }

    return { passed, failed, logs };
};
