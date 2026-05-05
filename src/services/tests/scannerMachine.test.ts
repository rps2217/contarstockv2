
import { scannerReducer, ScannerState, ScannerEvent } from '../scannerMachine';

/**
 * UNIT TEST: Transiciones de Máquina de Estados
 */
export const runScannerMachineTests = () => {
 const results = [];

 // Test 1: Inicio de Escaneo
 const s1 = scannerReducer('IDLE', { type: 'SCAN_INBOUND', barcode: 'SKU123' });
 results.push({ name: 'Estado: IDLE -> LOOKING_UP', passed: s1 === 'LOOKING_UP' });

 // Test 2: Resolución sin Pharma
 const s2 = scannerReducer('LOOKING_UP', { type: 'PRODUCT_RESOLVED', needsPharma: false });
 results.push({ name: 'Estado: LOOKING_UP -> COMMITTING (No Pharma)', passed: s2 === 'COMMITTING' });

 // Test 3: Interlocking Pharma (Bloqueo de validación)
 const s3 = scannerReducer('LOOKING_UP', { type: 'PRODUCT_RESOLVED', needsPharma: true });
 results.push({ name: 'Estado: LOOKING_UP -> AWAITING_PHARMA (Bloqueo)', passed: s3 === 'AWAITING_PHARMA' });

 // Test 4: Transición ilegal (Protección)
 const s4 = scannerReducer('COMMITTING', { type: 'OPEN_MANUAL' } as any);
 results.push({ name: 'Estado: Protección contra transición ilegal', passed: s4 === 'COMMITTING' });

 return results;
};

