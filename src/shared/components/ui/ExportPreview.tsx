/**
 * ExportPreview - Componente para previsualizar datos antes de exportar
 */

import React, { memo, useState, useMemo } from 'react';
import { X, Download, Eye, Table, FileText, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/Button';
import type { ExportFormat, ExportData } from '@/services/exports';

interface ExportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  data: ExportData[];
  columns: { key: string; header: string }[];
  title?: string;
  fileName?: string;
  isLoading?: boolean;
}

const FORMAT_OPTIONS: { format: ExportFormat; label: string; icon: React.ReactNode; mimeType: string }[] = [
  { format: 'csv', label: 'CSV', icon: <FileText className="w-4 h-4" />, mimeType: 'text/csv' },
  { format: 'excel', label: 'Excel', icon: <FileSpreadsheet className="w-4 h-4" />, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { format: 'pdf', label: 'PDF', icon: <FileText className="w-4 h-4" />, mimeType: 'application/pdf' },
  { format: 'json', label: 'JSON', icon: <FileText className="w-4 h-4" />, mimeType: 'application/json' },
];

export const ExportPreview = memo(({
  isOpen,
  onClose,
  onExport,
  data,
  columns,
  title = 'Exportar Datos',
  fileName = 'export',
  isLoading = false,
}: ExportPreviewProps) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv');
  const [showTable, setShowTable] = useState(true);

  const stats = useMemo(() => ({
    rows: data.length,
    columns: columns.length,
    size: estimateSize(data),
  }), [data, columns]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-base border border-subtle rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">{title}</h2>
              <p className="text-xs text-muted">
                {stats.rows} filas • {stats.columns} columnas • ~{stats.size}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Preview Table */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-primary flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Vista Previa
              </h3>
              <button
                onClick={() => setShowTable(!showTable)}
                className="text-xs text-blue-500 hover:text-blue-400"
              >
                {showTable ? 'Ocultar' : 'Mostrar'} tabla
              </button>
            </div>

            {showTable && (
              <div className="border border-subtle rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-surface sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted border-b border-subtle">
                          #
                        </th>
                        {columns.map((col) => (
                          <th
                            key={col.key}
                            className="px-3 py-2 text-left text-xs font-semibold text-muted border-b border-subtle whitespace-nowrap"
                          >
                            {col.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-surface/50">
                          <td className="px-3 py-2 text-xs text-muted border-b border-subtle">
                            {i + 1}
                          </td>
                          {columns.map((col) => (
                            <td
                              key={col.key}
                              className="px-3 py-2 text-xs text-primary border-b border-subtle whitespace-nowrap"
                            >
                              {String(row[col.key] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {data.length > 10 && (
                  <div className="p-2 bg-surface text-center text-xs text-muted">
                    ... y {data.length - 10} filas más
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-semibold text-primary mb-3">Formato de exportación</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.format}
                  onClick={() => setSelectedFormat(opt.format)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                    selectedFormat === opt.format
                      ? 'bg-blue-500/20 border-blue-500 text-blue-500'
                      : 'bg-surface border-subtle text-secondary hover:bg-elevated'
                  )}
                >
                  {opt.icon}
                  <span className="text-sm font-medium">{opt.label}</span>
                  <span className="text-xs opacity-60">{opt.mimeType}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => onExport(selectedFormat)}
            isLoading={isLoading}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar como {selectedFormat.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
});

ExportPreview.displayName = 'ExportPreview';

// Helper para estimar tamaño
function estimateSize(data: ExportData[]): string {
  const jsonStr = JSON.stringify(data);
  const bytes = new Blob([jsonStr]).size;
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default ExportPreview;