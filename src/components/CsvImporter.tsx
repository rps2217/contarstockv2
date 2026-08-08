/**
 * CsvImporter - Importador básico de archivos CSV
 * 
 * @deprecated Esta funcionalidad será migrada al nuevo sistema de importación
 */

import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';

interface CsvImporterProps {
  onImport?: (data: any[]) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // en MB
}

export const CsvImporter: React.FC<CsvImporterProps> = ({
  onImport,
  onError,
  accept = '.csv',
  maxSize = 10,
}) => {
  const handleFile = useCallback(async (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      onError?.(`El archivo es demasiado grande. Máximo ${maxSize}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          onError?.('El archivo CSV está vacío o no tiene datos');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((header, i) => {
            row[header] = values[i] || '';
          });
          return row;
        });

        onImport?.(data);
      } catch (err) {
        onError?.('Error al procesar el archivo CSV');
      }
    };
    reader.readAsText(file);
  }, [maxSize, onImport, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFile(file);
    } else {
      onError?.('Por favor, sube un archivo CSV válido');
    }
  }, [handleFile, onError]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className="border-2 border-dashed border-subtle rounded-xl p-6 text-center hover:border-blue-500/50 transition-colors"
    >
      <Upload className="w-8 h-8 mx-auto mb-2 text-muted" />
      <p className="text-sm text-secondary mb-1">
        Arrastra un archivo CSV aquí
      </p>
      <p className="text-xs text-muted">
        o haz clic para seleccionar
      </p>
      <input
        type="file"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="hidden"
        id="csv-upload"
      />
      <label
        htmlFor="csv-upload"
        className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-blue-500 transition-colors"
      >
        Seleccionar archivo
      </label>
    </div>
  );
};
