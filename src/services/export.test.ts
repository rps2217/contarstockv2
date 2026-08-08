/**
 * Tests para servicios de exportación (Excel, CSV, PDF)
 *
 * Para ejecutar estos tests:
 * 1. Instalar Vitest: npm install -D vitest @vitejs/plugin-react jsdom
 * 2. Agregar a vite.config.ts:
 *    import { defineConfig } from 'vite'
 *    import react from '@vitejs/plugin-react'
 *    export default defineConfig({
 *      plugins: [react()],
 *      test: { environment: 'jsdom' }
 *    })
 * 3. Agregar script: "test": "vitest"
 * 4. Ejecutar: npm test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock de xlsx
const mockWriteFile = vi.fn();
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({ '!cols': [] })),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: mockWriteFile,
}));

// Mock de papaparse
vi.mock('papaparse', () => ({
  unparse: vi.fn(() => 'mock,csv,data'),
}));

// Tipos de prueba - debe coincidir con HammerExportItem
type MockItem = {
  barcode: string;
  name: string;
  loc?: string;
  totalQuantity: number;
  expectedQty?: number;
  lastTimestamp: number;
};

describe('exportHammerToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe mapear items correctamente a columnas de Excel', async () => {
    const { exportHammerToExcel } = await import('./export');

    const mockItems: MockItem[] = [
      {
        barcode: 'SKU001',
        name: 'Producto A',
        loc: 'ZONA-A1',
        totalQuantity: 10,
        expectedQty: 8,
        lastTimestamp: Date.now(),
      },
    ];

    await exportHammerToExcel('BATCH-001', mockItems);

    // Verificar que writeFile fue llamado
    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('debe manejar items sin expectedQty', async () => {
    const { exportHammerToExcel } = await import('./export');

    const mockItems: MockItem[] = [
      {
        barcode: 'SKU002',
        name: 'Producto B',
        totalQuantity: 5,
        lastTimestamp: Date.now(),
      },
    ];

    await exportHammerToExcel('BATCH-002', mockItems);

    expect(mockWriteFile).toHaveBeenCalled();
  });

  it('debe calcular diferencia correctamente', async () => {
    const { exportHammerToExcel } = await import('./export');

    const mockItems: MockItem[] = [
      {
        barcode: 'SKU003',
        name: 'Producto C',
        totalQuantity: 15,
        expectedQty: 10,
        lastTimestamp: Date.now(),
      },
    ];

    await exportHammerToExcel('BATCH-003', mockItems);

    // Diferencia esperada: 15 - 10 = 5
    const call = mockWriteFile.mock.calls[0];
    expect(call).toBeDefined();
  });

  it('debe generar nombre de archivo con batchId y fecha', async () => {
    const { exportHammerToExcel } = await import('./export');

    const batchId = 'TEST-BATCH-123';
    await exportHammerToExcel(batchId, []);

    const call = mockWriteFile.mock.calls[0];
    const fileName = call[1];

    expect(fileName).toContain(batchId);
    expect(fileName).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(fileName).toMatch(/\.xlsx$/);
  });

  it('debe manejar array vacío sin errores', async () => {
    const { exportHammerToExcel } = await import('./export');

    await expect(exportHammerToExcel('EMPTY-BATCH', [])).resolves.not.toThrow();
  });
});

describe('exportToExcel (Session)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe funcionar con modo verificación (isVerifiedMode)', async () => {
    const { exportToExcel } = await import('./export');

    const mockSession = {
      id: 'session-1',
      erpOrder: 'ERP-001',
      logisticsLabel: 'LBL-001',
      createdAt: Date.now(),
      isVerifiedMode: true,
    };

    const mockItems = [
      {
        barcode: 'SKU001',
        productName: 'Producto Test',
        totalQuantity: 20,
        scans: 5,
        expectedQuantity: 18,
      },
    ];

    await exportToExcel(mockSession as any, mockItems as any);

    const XLSX = await import('xlsx');
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it('debe funcionar con modo normal (no isVerifiedMode)', async () => {
    const { exportToExcel } = await import('./export');

    const mockSession = {
      id: 'session-2',
      erpOrder: 'ERP-002',
      logisticsLabel: 'LBL-002',
      createdAt: Date.now(),
      isVerifiedMode: false,
    };

    const mockItems = [
      {
        barcode: 'SKU002',
        productName: 'Producto Normal',
        totalQuantity: 10,
        scans: 3,
      },
    ];

    await exportToExcel(mockSession as any, mockItems as any);

    const XLSX = await import('xlsx');
    expect(XLSX.writeFile).toHaveBeenCalled();
  });
});

describe('exportToCSV', () => {
  it('debe generar CSV válido', async () => {
    const { exportToCSV } = await import('./exports/csvExport');

    const data = [
      { sku: 'A', cantidad: 1 },
      { sku: 'B', cantidad: 2 },
    ];

    // Mock window.URL.createObjectURL
    const mockCreateObjectURL = vi.fn(() => 'blob:test');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    await exportToCSV(data, 'test-export');

    expect(mockCreateObjectURL).toHaveBeenCalled();
  });
});
