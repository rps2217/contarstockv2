
import { ScanRecord } from '../../types';

/**
 * Mock simplificado de agregación para test unitario puro
 */
const mockAggregate = (scans: Partial<ScanRecord>[]) => {
 const map: Record<string, number> = {};
 scans.forEach(s => {
 const key = s.barcode!;
 map[key] = (map[key] || 0) + (s.quantity || 0);
 });
 return map;
};

export const runAggregatorTests = () => {
 const results = [];

 const mockScans: Partial<ScanRecord>[] = [
 { barcode: 'A', quantity: 5 },
 { barcode: 'A', quantity: 10 },
 { barcode: 'B', quantity: 2 },
 { barcode: 'A', quantity: -3 } // Caso de resta/deshacer
 ];

 const aggregated = mockAggregate(mockScans);

 results.push({ 
 name: 'Agregación: Suma correcta de SKU A (5+10-3=12)', 
 passed: aggregated['A'] === 12 
 });

 results.push({ 
 name: 'Agregación: SKU B independiente', 
 passed: aggregated['B'] === 2 
 });

 return results;
};

// Forced GitHub sync
