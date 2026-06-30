/**
 * CreateSliceModal - Modal para crear nuevos slices
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, Sparkles } from 'lucide-react';
import { AppSheetSlice, SourceTable, FilterOperator } from '../types/Slice';
import { TABLE_FIELDS } from '../constants/defaultSlices';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (slice: Omit<AppSheetSlice, 'id' | 'isSystem'>) => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}

const SOURCE_TABLES: { value: SourceTable; label: string }[] = [
  { value: 'scans', label: 'scans (Operaciones)' },
  { value: 'products', label: 'products (Catálogo)' },
  { value: 'sessions', label: 'sessions (Sesiones)' },
  { value: 'providers', label: 'providers (Proveedores)' },
  { value: 'customers', label: 'customers (Clientes)' },
  { value: 'dynamic_data', label: 'dynamic_data (Tablas Dinámicas)' },
];

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Es igual a' },
  { value: 'notEquals', label: 'No es igual a' },
  { value: 'contains', label: 'Contiene' },
  { value: 'greaterThan', label: 'Mayor que (>)' },
  { value: 'lessThan', label: 'Menor que (<)' },
  { value: 'isEmpty', label: 'Está vacío' },
  { value: 'isNotEmpty', label: 'No está vacío' },
];

export const CreateSliceModal: React.FC<Props> = ({ isOpen, onClose, onCreate, theme = 'dark' }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceTable, setSourceTable] = useState<SourceTable>('scans');
  const [filterField, setFilterField] = useState('syncStatus');
  const [filterOperator, setFilterOperator] = useState<FilterOperator>('equals');
  const [filterValue, setFilterValue] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(TABLE_FIELDS['scans']);
  const [allowEdits, setAllowEdits] = useState(true);
  const [allowDeletes, setAllowDeletes] = useState(true);

  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const modalBg = isLight ? 'bg-white' : isHighContrast ? 'bg-black' : 'bg-base';
  const modalBorder = isLight ? 'border-slate-200' : isHighContrast ? 'border-yellow-400' : 'border-slate-900';
  const textPrimary = isLight ? 'text-slate-900' : isHighContrast ? 'text-yellow-400' : 'text-white';
  const textSecondary = isLight ? 'text-slate-600' : isHighContrast ? 'text-yellow-500' : 'text-muted';
  const textMuted = isLight ? 'text-slate-500' : isHighContrast ? 'text-yellow-600' : 'text-slate-500';
  const inputBg = isLight ? 'bg-slate-50' : isHighContrast ? 'bg-black' : 'bg-surface';
  const inputBorder = isLight ? 'border-slate-200' : isHighContrast ? 'border-yellow-400' : 'border-subtle';
  const accentBlue = isLight ? 'text-blue-600' : isHighContrast ? 'text-yellow-400' : 'text-blue-500';
  const accentBlueBg = isLight ? 'bg-blue-50 border-blue-200' : isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : 'bg-blue-500/5 border-blue-500/10';

  const availableFields = TABLE_FIELDS[sourceTable] || [];

  const resetForm = () => {
    setName('');
    setDescription('');
    setSourceTable('scans');
    setFilterField('syncStatus');
    setFilterOperator('equals');
    setFilterValue('');
    setSelectedColumns(TABLE_FIELDS['scans']);
    setAllowEdits(true);
    setAllowDeletes(true);
  };

  const handleTableChange = (table: SourceTable) => {
    setSourceTable(table);
    setFilterField('syncStatus');
    setSelectedColumns(TABLE_FIELDS[table] || []);
  };

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev =>
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !filterField.trim()) return;

    onCreate({
      name: name.trim(),
      description: description.trim() || 'Visualización de datos filtrada a medida.',
      sourceTable,
      filterField,
      filterOperator,
      filterValue,
      selectedColumns: selectedColumns.length > 0 ? selectedColumns : availableFields.slice(0, 5),
      allowEdits,
      allowDeletes,
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 15 }}
          className={`relative w-full max-w-xl ${modalBg} border ${modalBorder} rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : isHighContrast ? 'border-yellow-400/20' : 'border-white/5'}`}>
            <h3 className={`text-sm font-black uppercase tracking-wider flex items-center gap-2 ${textPrimary}`}>
              <Filter className={`w-4 h-4 ${accentBlue}`} />
              Constructor de Slices Inteligentes
            </h3>
            <button
              onClick={handleClose}
              className={`${textSecondary} hover:${textPrimary} text-xs uppercase font-black`}
            >
              Cerrar
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
            {/* Name & Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className={`${textSecondary} font-black uppercase tracking-wider block`}>
                  Nombre del Slice
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Lotes con Error"
                  className={`w-full ${inputBg} border ${inputBorder} rounded-xl px-3.5 py-2.5 ${textPrimary} placeholder:${textMuted} focus:outline-none focus:border-blue-500`}
                />
              </div>

              <div className="space-y-1.5">
                <label className={`${textSecondary} font-black uppercase tracking-wider block`}>
                  Tabla Origen
                </label>
                <select
                  value={sourceTable}
                  onChange={(e) => handleTableChange(e.target.value as SourceTable)}
                  className={`w-full ${inputBg} border ${inputBorder} rounded-xl px-3 py-2.5 ${textPrimary} focus:outline-none focus:border-blue-500`}
                >
                  {SOURCE_TABLES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className={`${textSecondary} font-black uppercase tracking-wider block`}>
                Descripción de Seguridad
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe para qué sirve o quién supervisará este subconjunto de datos"
                className={`w-full ${inputBg} border ${inputBorder} rounded-xl px-3.5 py-2.5 ${textPrimary} placeholder:${textMuted} focus:outline-none focus:border-blue-500`}
              />
            </div>

            {/* Filter Builder */}
            <div className={`p-4 border rounded-2xl space-y-3 ${accentBlueBg}`}>
              <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${accentBlue}`}>
                <Filter className="w-3.5 h-3.5" />
                Condición row-Level (Expresión del Slice)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className={`${textMuted} text-[9px] font-bold uppercase tracking-wider block`}>
                    Columna Clave
                  </label>
                  <select
                    value={filterField}
                    onChange={(e) => setFilterField(e.target.value)}
                    className={`w-full ${isLight ? 'bg-white' : 'bg-base'} border ${inputBorder} rounded-xl px-2.5 py-2 ${textPrimary} focus:outline-none focus:border-blue-500 block font-mono`}
                  >
                    {availableFields.map(col => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`${textMuted} text-[9px] font-bold uppercase tracking-wider block`}>
                    Operador
                  </label>
                  <select
                    value={filterOperator}
                    onChange={(e) => setFilterOperator(e.target.value as FilterOperator)}
                    className={`w-full ${isLight ? 'bg-white' : 'bg-base'} border ${inputBorder} rounded-xl px-2.5 py-2 ${textPrimary} focus:outline-none focus:border-blue-500 block font-mono`}
                  >
                    {FILTER_OPERATORS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className={`${textMuted} text-[9px] font-bold uppercase tracking-wider block`}>
                    Valor de Referencia
                  </label>
                  <input
                    type="text"
                    value={filterValue}
                    disabled={['isEmpty', 'isNotEmpty'].includes(filterOperator)}
                    onChange={(e) => setFilterValue(e.target.value)}
                    placeholder="Ej: error"
                    className={`w-full ${isLight ? 'bg-white' : 'bg-base'} border ${inputBorder} rounded-xl px-2.5 py-2 ${textPrimary} focus:outline-none focus:border-blue-500 font-mono disabled:opacity-50`}
                  />
                </div>
              </div>
            </div>

            {/* Columns Selection */}
            <div className="space-y-2">
              <label className={`${textSecondary} font-black uppercase tracking-wider block`}>
                Columnas Visibles en Tabla
              </label>
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-2xl border ${isLight ? 'bg-slate-50 border-slate-200' : isHighContrast ? 'bg-yellow-950/10 border-yellow-400/20' : 'bg-surface/40 border-slate-900'}`}>
                {availableFields.map((col) => {
                  const isChecked = selectedColumns.includes(col);
                  return (
                    <label key={col} className={`flex items-center gap-2 cursor-pointer select-none py-1 px-1 text-[11px] font-mono ${isLight ? 'text-slate-700' : isHighContrast ? 'text-yellow-300' : 'text-secondary'}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleColumn(col)}
                        className={`rounded border-${isLight ? 'slate-300' : 'slate-800'} text-blue-600 focus:ring-blue-500 ${isLight ? 'bg-white' : 'bg-base'} w-3.5 h-3.5`}
                      />
                      {col}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Permissions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className={`flex items-center justify-between p-3.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : isHighContrast ? 'bg-yellow-950/10 border-yellow-400/20' : 'bg-surface/30 border-slate-900'}`}>
                <div>
                  <span className={`font-extrabold uppercase block tracking-wide ${isLight ? 'text-slate-800' : isHighContrast ? 'text-yellow-300' : 'text-secondary'}`}>Permitir Edición</span>
                  <span className={`text-[9px] ${textMuted}`}>Acceso a Alterar valores localmente</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowEdits}
                  onChange={(e) => setAllowEdits(e.target.checked)}
                  className={`w-4 h-4 rounded text-blue-600 ${isLight ? 'bg-white border-slate-300' : 'bg-base border-subtle'}`}
                />
              </div>

              <div className={`flex items-center justify-between p-3.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : isHighContrast ? 'bg-yellow-950/10 border-yellow-400/20' : 'bg-surface/30 border-slate-900'}`}>
                <div>
                  <span className={`font-extrabold uppercase block tracking-wide ${isLight ? 'text-slate-800' : isHighContrast ? 'text-yellow-300' : 'text-secondary'}`}>Permitir Eliminación</span>
                  <span className={`text-[9px] ${textMuted}`}>Acceso de purga en este slice</span>
                </div>
                <input
                  type="checkbox"
                  checked={allowDeletes}
                  onChange={(e) => setAllowDeletes(e.target.checked)}
                  className={`w-4 h-4 rounded text-blue-600 ${isLight ? 'bg-white border-slate-300' : 'bg-base border-subtle'}`}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={`w-full py-4.5 rounded-2xl font-black uppercase text-xs tracking-widest mt-4 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl ${isLight ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200/50 border-b-4 border-blue-800' : isHighContrast ? 'bg-yellow-400 hover:bg-yellow-300 text-black shadow-yellow-400/20 border-b-4 border-yellow-600' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 border-b-4 border-blue-800'}`}
            >
              <Sparkles className="w-4 h-4" /> Configurar y Compilar Slice
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
