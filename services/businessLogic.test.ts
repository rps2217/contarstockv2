
import { sanitizeBarcode } from './utils';
import { calculateOrderMatch } from './matcher';
import { ConsolidatedItem, ExpectedOrder } from '../types';

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

export const runSystemDiagnostics = () => {
    let passed = 0;
    let failed = 0;
    const logs: string[] = [];

    const log = (msg: string, isError = false) => {
        logs.push(msg);
        if (isError) failed++; else passed++;
    };

    // 1. Sanitize Test
    try {
        const t1 = sanitizeBarcode(' abc ') === 'ABC';
        const t2 = sanitizeBarcode('a\u200Bb') === 'AB';
        if (t1 && t2) log("✅ Limpieza de Códigos: OK");
        else log("❌ Limpieza de Códigos: FALLÓ", true);
    } catch (e) { log(`❌ Error Sanitize: ${e}`, true); }

    // 2. Matcher Test
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

    return { passed, failed, logs };
};
