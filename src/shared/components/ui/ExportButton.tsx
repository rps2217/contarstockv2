/**
 * ExportButton - Componente de exportación de datos
 * 
 * Botón que abre un modal para seleccionar formato de exportación (CSV, Excel, PDF)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileSpreadsheet, FileText, Table2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExport, ExportFormat, ExportColumn } from '@/shared/hooks';
import { toast } from 'sonner';

interface ExportButtonProps<T extends Record<string, any>> {
  data: T[];
  fileName: string;
  columns: ExportColumn<T>[];
  sheetName?: string;
  label?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onExportStart?: () => void;
  onExportEnd?: () => void;
}

export function ExportButton<T extends Record<string, any>>({
  data,
  fileName,
  columns,
  sheetName,
  label = 'Exportar',
  icon,
  className,
  disabled = false,
}: ExportButtonProps<T>) {
  const [showMenu, setShowMenu] = useState(false);
  const { isExporting, exportTo } = useExport<T>({ fileName, columns, sheetName });

  const handleExport = async (format: ExportFormat) => {
    setShowMenu(false);
    await exportTo(data, format);
  };

  const formats = [
    { format: 'csv' as ExportFormat, label: 'CSV', icon: Table2, desc: 'Hoja de cálculo' },
    { format: 'excel' as ExportFormat, label: 'Excel', icon: FileSpreadsheet, desc: 'Libro de Excel' },
    { format: 'pdf' as ExportFormat, label: 'PDF', icon: FileText, desc: 'Documento PDF' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={disabled || isExporting || data.length === 0}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
          'bg-surface border border-subtle hover:bg-elevated',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
      >
        {icon || <Download className="w-4 h-4" />}
        <span>{label}</span>
        {data.length > 0 && (
          <span className="text-xs text-muted">({data.length})</span>
        )}
      </button>

      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)} 
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 z-50 w-56 bg-surface border border-subtle rounded-xl shadow-xl overflow-hidden"
            >
              <div className="p-3 border-b border-subtle">
                <p className="text-sm font-semibold text-primary">Exportar Datos</p>
                <p className="text-xs text-muted">{data.length} registros seleccionados</p>
              </div>
              
              <div className="p-2 space-y-1">
                {formats.map(({ format, label: formatLabel, icon: FormatIcon, desc }) => (
                  <button
                    key={format}
                    onClick={() => handleExport(format)}
                    disabled={isExporting}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
                      'hover:bg-elevated disabled:opacity-50',
                      'text-left'
                    )}
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <FormatIcon className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">{formatLabel}</p>
                      <p className="text-xs text-muted">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ExportActions - Grupo de acciones de exportación
 */
interface ExportActionsProps {
  onExportCSV?: () => void;
  onExportExcel?: () => void;
  onExportPDF?: () => void;
  isExporting?: boolean;
  className?: string;
}

export const ExportActions: React.FC<ExportActionsProps> = ({
  onExportCSV,
  onExportExcel,
  onExportPDF,
  isExporting = false,
  className,
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        onClick={onExportCSV}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 bg-surface border border-subtle rounded-lg hover:bg-elevated transition-colors disabled:opacity-50"
        title="Exportar a CSV"
      >
        <Table2 className="w-4 h-4 text-emerald-500" />
        <span className="text-sm">CSV</span>
      </button>
      
      <button
        onClick={onExportExcel}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 bg-surface border border-subtle rounded-lg hover:bg-elevated transition-colors disabled:opacity-50"
        title="Exportar a Excel"
      >
        <FileSpreadsheet className="w-4 h-4 text-blue-500" />
        <span className="text-sm">Excel</span>
      </button>
      
      <button
        onClick={onExportPDF}
        disabled={isExporting}
        className="flex items-center gap-2 px-3 py-2 bg-surface border border-subtle rounded-lg hover:bg-elevated transition-colors disabled:opacity-50"
        title="Exportar a PDF"
      >
        <FileText className="w-4 h-4 text-rose-500" />
        <span className="text-sm">PDF</span>
      </button>
    </div>
  );
};
