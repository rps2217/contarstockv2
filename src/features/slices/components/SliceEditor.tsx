/**
 * SliceEditor - Modal para crear/editar slices
 */

import React, { useState } from 'react';
import { X, Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { AppSheetSlice, SourceTable, FilterOperator } from '../types/Slice';
import { TABLE_FIELDS } from '../constants/defaultSlices';

interface Props {
  slice?: AppSheetSlice;
  isOpen: boolean;
  onClose: () => void;
  onSave: (slice: AppSheetSlice) => void;
  isDark: boolean;
}

const SOURCE_TABLES: { value: SourceTable; label: string }[] = [
  { value: 'scans', label: 'Escaneos' },
  { value: 'products', label: 'Productos' },
  { value: 'sessions', label: 'Sesiones' },
  { value: 'providers', label: 'Proveedores' },
  { value: 'customers', label: 'Clientes' },
  { value: 'dynamic_data', label: 'Datos Dinámicos' },
];

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'equals', label: 'Igual a' },
  { value: 'notEquals', label: 'Diferente de' },
  { value: 'contains', label: 'Contiene' },
  { value: 'greaterThan', label: 'Mayor que' },
  { value: 'lessThan', label: 'Menor que' },
  { value: 'isEmpty', label: 'Está vacío' },
  { value: 'isNotEmpty', label: 'No está vacío' },
];

export const SliceEditor: React.FC<Props> = ({
  slice,
  isOpen,
  onClose,
  onSave,
  isDark,
}) => {
  const [name, setName] = useState(slice?.name || '');
  const [description, setDescription] = useState(slice?.description || '');
  const [sourceTable, setSourceTable] = useState<SourceTable>(slice?.sourceTable || 'scans');
  const [filterField, setFilterField] = useState(slice?.filterField || 'syncStatus');
  const [filterOperator, setFilterOperator] = useState<FilterOperator>(slice?.filterOperator || 'equals');
  const [filterValue, setFilterValue] = useState(slice?.filterValue || 'pending');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(slice?.selectedColumns || []);
  const [allowEdits, setAllowEdits] = useState(slice?.allowEdits ?? true);
  const [allowDeletes, setAllowDeletes] = useState(slice?.allowDeletes ?? true);

  const availableFields = TABLE_FIELDS[sourceTable] || [];

  const handleToggleColumn = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) 
        ? prev.filter(c => c !== col)
        : [...prev, col]
    );
  };

  const handleSave = () => {
    if (!name.trim() || !description.trim()) return;

    const newSlice: AppSheetSlice = {
      id: slice?.id || `slice-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      sourceTable,
      filterField,
      filterOperator,
      filterValue,
      selectedColumns: selectedColumns.length > 0 ? selectedColumns : availableFields.slice(0, 5),
      allowEdits,
      allowDeletes,
      isSystem: false,
    };

    onSave(newSlice);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-brand-dark/40 transition-opacity animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Content */}
      <div className={`relative z-10 w-full max-w-2xl max-h-[90vh] rounded-t-[2.5rem] md:rounded-[2.5rem] animate-in slide-in-from-bottom-8 duration-300 overflow-hidden flex flex-col ${
        isDark ? 'bg-brand-dark shadow-2xl' : 'bg-white shadow-2xl'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
          isDark ? 'border-white/5' : 'border-slate-100'
        }`}>
          <h2 className={`text-lg font-black uppercase tracking-tight leading-none ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {slice ? 'Editar Slice' : 'Nuevo Slice'}
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
            }`}
          >
            <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Name */}
          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mi Slice Personalizado"
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-colors ${
                isDark 
                  ? 'bg-white/5 text-white placeholder:text-slate-500 border border-white/10 focus:border-indigo-500' 
                  : 'bg-slate-100 text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué datos muestra este slice..."
              rows={2}
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-colors resize-none ${
                isDark 
                  ? 'bg-white/5 text-white placeholder:text-slate-500 border border-white/10 focus:border-indigo-500' 
                  : 'bg-slate-100 text-slate-800 placeholder:text-slate-400 border border-slate-200 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* Source Table */}
          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Tabla de Origen
            </label>
            <select
              value={sourceTable}
              onChange={(e) => {
                setSourceTable(e.target.value as SourceTable);
                setFilterField('syncStatus');
                setSelectedColumns([]);
              }}
              className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-colors ${
                isDark 
                  ? 'bg-white/5 text-white border border-white/10 focus:border-indigo-500' 
                  : 'bg-slate-100 text-slate-800 border border-slate-200 focus:border-indigo-500'
              }`}
            >
              {SOURCE_TABLES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Filter */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Campo
              </label>
              <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-sm outline-none ${
                  isDark 
                    ? 'bg-white/5 text-white border border-white/10' 
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                {availableFields.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Operador
              </label>
              <select
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value as FilterOperator)}
                className={`w-full px-3 py-2 rounded-xl text-sm outline-none ${
                  isDark 
                    ? 'bg-white/5 text-white border border-white/10' 
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              >
                {FILTER_OPERATORS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Valor
              </label>
              <input
                type="text"
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-sm outline-none ${
                  isDark 
                    ? 'bg-white/5 text-white border border-white/10' 
                    : 'bg-slate-100 text-slate-800 border border-slate-200'
                }`}
              />
            </div>
          </div>

          {/* Columns */}
          <div>
            <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              Columnas a Mostrar ({selectedColumns.length})
            </label>
            <div className={`flex flex-wrap gap-2 p-3 rounded-xl ${
              isDark ? 'bg-white/5' : 'bg-slate-100'
            }`}>
              {availableFields.map(col => {
                const isSelected = selectedColumns.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => handleToggleColumn(col)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? isDark
                          ? 'bg-indigo-500 text-white'
                          : 'bg-indigo-600 text-white'
                        : isDark
                          ? 'bg-white/10 text-slate-400 hover:bg-white/20'
                          : 'bg-white text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {col}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowEdits}
                onChange={(e) => setAllowEdits(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>
                Permitir ediciones
              </span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDeletes}
                onChange={(e) => setAllowDeletes(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>
                Permitir eliminaciones
              </span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 px-6 py-4 border-t shrink-0 ${
          isDark ? 'border-white/5' : 'border-slate-100'
        }`}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              isDark 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !description.trim()}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              name.trim() && description.trim()
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed'
            }`}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
