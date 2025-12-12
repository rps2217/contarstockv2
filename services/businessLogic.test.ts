
import { sanitizeBarcode } from './utils';
import { calculateOrderMatch } from './matcher';
import { ConsolidatedItem, ExpectedOrder } from '../types';
import { db } from '../db';

// --- MOCK DATA ---

const mockPhysical: ConsolidatedItem[] = [
    { barcode: 'A1', productName: 'Prod A', totalQuantity: 10, scans: 1 },
    { barcode: 'B2', productName: 'Prod B', totalQuantity: 5, scans: 1 }
];

const mockOrderExact: ExpectedOrder = {
    id: '1', internalId: 'ORD-EXACT', totalExpectedUnits: 15, totalExpectedSKUs: 2, importedAt: 0,
    items: [
        { barcode: 'A1', name: 'Prod A', expectedQty: 10 },
        { barcode: 'B2', name: 'Prod B', expectedQty: 5 }
    ]
};

const mockOrderPartial: ExpectedOrder = {
    id: '2', internalId: 'ORD-PARTIAL', totalExpectedUnits: 20, totalExpectedSKUs: 2, importedAt: 0,
    items: [
        { barcode: 'A1', name: 'Prod A', expectedQty: 10 }, // Match
        { barcode: 'C3', name: 'Prod C', expectedQty: 10 }  // Mismatch
    ]
};

// --- RUNNER ---

export const runSystemDiagnostics = async () => {
    let passed = 0;
    let failed = 0;
    const logs: string[] = [];

    const log = (msg: string, isError = false) => {
        logs.push(msg);
        if (isError) failed++; else passed++;
    };

    // 1. Sanitize Test (Sync)
    try {
        const t1 = sanitizeBarcode(' abc ') === 'ABC';
        const t2 = sanitizeBarcode('a\u200Bb') === 'AB';
        if (t1 && t2) log("✅ Limpieza de Códigos: OK");
        else log("❌ Limpieza de Códigos: FALLÓ", true);
    } catch (e) { log(`❌ Error Sanitize: ${e}`, true); }

    // 2. Matcher Test (Sync)
    try {
        const exactResult = calculateOrderMatch(mockPhysical, mockOrderExact);
        if (exactResult.status === 'exact' && exactResult.matchScore > 99) {
            log("✅ Algoritmo Detective (Exacto): OK");
        } else {
            log("❌ Algoritmo Detective (Exacto): FALLÓ", true);
        }

        const partialResult = calculateOrderMatch(mockPhysical, mockOrderPartial);
        if (partialResult.status === 'mismatch' && partialResult.matchScore < 50) {
            log("✅ Algoritmo Detective (Parcial): OK");
        } else {
            log("❌ Algoritmo Detective (Parcial): FALLÓ", true);
        }
    } catch (e) { log(`❌ Error Matcher: ${e}`, true); }

    // 3. Database Health Check (Async)
    try {
        const start = performance.now();
        // Check 1: Can we count items?
        const productCount = await db.products.count();
        // Check 2: Can we write/delete? (Ephemeral test)
        const testKey = '__DIAGNOSTIC_TEST__';
        await db.products.put({ barcode: testKey, name: 'TEST', category: 'TEST', syncStatus: 'synced' });
        const retrieved = await db.products.get(testKey);
        await db.products.delete(testKey);
        const duration = (performance.now() - start).toFixed(1);

        if (retrieved && retrieved.name === 'TEST') {
            log(`✅ Base de Datos: SALUDABLE (${productCount} items, ${duration}ms)`);
        } else {
            log(`❌ Base de Datos: ERROR DE ESCRITURA`, true);
        }
    } catch (e: any) {
        log(`❌ Base de Datos: CRÍTICO - ${e.message}`, true);
    }

    return { passed, failed, logs };
};
