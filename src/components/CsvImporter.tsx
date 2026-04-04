import React, { useState } from 'react';
import Papa from 'papaparse';
import { firebaseSyncService } from '../services/firebaseSyncService';
import { useAppStore } from '@/store/appStore';
import { toast } from 'sonner';

export const CsvImporter: React.FC = () => {
  const { settings } = useAppStore();
  const [isImporting, setIsImporting] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);

  const validateRow = (row: any) => {
    const errors: string[] = [];
    if (!row.barcode) errors.push('Código de barras faltante');
    if (!row.productName) errors.push('Nombre de producto faltante');
    if (isNaN(row.quantity) || row.quantity < 0) errors.push('Cantidad inválida');
    return errors;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const processedData = data.map((row) => {
          const rowData = {
            id: row.ID_REGISTRO || Math.random().toString(16).substring(2, 10),
            ID: row.ID_REGISTRO || Math.random().toString(16).substring(2, 10),
            barcode: row.COD_BARRAS,
            productName: row.DESCRIPCION_PROD,
            providerName: 'N/A',
            event: row.EVENTO,
            quantity: parseInt(row.CANTIDAD) || 0,
            location: row['BOD.'] || 'GENERAL',
            timestamp: Date.now(),
            claveUnica: row.CLAVE_UNICA,
            mm: parseInt(row.MM) || 0,
            yyyy: parseInt(row.YYYY) || 0,
            isAdjusted: row.AJUSTADO === 'TRUE' || row.AJUSTADO === '1',
            syncStatus: 'synced',
          };
          return { ...rowData, errors: validateRow(rowData) };
        });
        setParsedData(processedData);
      },
      error: (error) => {
        toast.error(`Error al parsear CSV: ${error.message}`);
      }
    });
  };

  const confirmImport = async () => {
    setIsImporting(true);
    try {
      // Filtrar los datos para importar solo los que no tienen errores
      // Opcionalmente, el usuario pidió "ignorar esos errores", lo que puede significar
      // importar todo de todas formas, o importar solo lo válido.
      // Vamos a importar solo los registros válidos, ignorando los que tienen errores.
      const validData = parsedData.filter(row => row.errors.length === 0);
      
      const expiryData = validData.filter(row => row.event === 'VENCIMIENTOS');
      const eventData = validData.filter(row => row.event !== 'VENCIMIENTOS');

      if (expiryData.length > 0) {
        await firebaseSyncService.pushBatch(settings?.appSheetConfig?.expiryTableName || 'VENCIMIENTOS', expiryData);
      }
      if (eventData.length > 0) {
        await firebaseSyncService.pushBatch(settings?.appSheetConfig?.eventsTableName || 'EVENTOS', eventData);
      }

      toast.success(`Importación completada: ${expiryData.length} vencimientos, ${eventData.length} eventos.`);
      setParsedData([]);
    } catch (error: any) {
      toast.error(`Error al importar: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const hasErrors = parsedData.some(row => row.errors.length > 0);
  const validCount = parsedData.filter(row => row.errors.length === 0).length;

  return (
    <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
      <h3 className="text-lg font-semibold mb-2">Importar desde CSV</h3>
      <input
        type="file"
        accept=".csv"
        onChange={handleFileUpload}
        disabled={isImporting}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      
      {parsedData.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">
            Vista previa ({parsedData.length} registros, {parsedData.filter(r => r.errors.length > 0).length} con errores):
          </p>
          <div className="max-h-60 overflow-y-auto border rounded p-2 text-xs">
            {parsedData.slice(0, 5).map((row, i) => (
              <div key={i} className={`border-b py-1 ${row.errors.length > 0 ? 'text-red-600' : ''}`}>
                {row.productName} - {row.quantity}
                {row.errors.length > 0 && <span className="ml-2 font-bold">({row.errors.join(', ')})</span>}
              </div>
            ))}
            {parsedData.length > 5 && <p>...</p>}
          </div>
          <button
            onClick={confirmImport}
            disabled={isImporting || validCount === 0}
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {isImporting ? 'Importando...' : hasErrors ? `Ignorar errores e importar ${validCount} válidos` : 'Confirmar Importación'}
          </button>
        </div>
      )}
    </div>
  );
};
