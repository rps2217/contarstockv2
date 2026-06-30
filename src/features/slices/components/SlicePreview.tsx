/**
 * SlicePreview - Tabla de datos del slice activo con acciones
 */

import React from 'react';
import { BookOpen, Edit, Trash2 } from 'lucide-react';
import { AppSheetSlice } from '../types/Slice';

interface Props {
  activeSlice: AppSheetSlice | undefined;
  filteredRows: any[];
  isLoading?: boolean;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const SlicePreview: React.FC<Props> = ({
  activeSlice,
  filteredRows,
  isLoading = false,
  theme = 'dark',
}) => {
  if (!activeSlice) return null;

  const isDark = theme === 'dark' || theme === 'night' || theme === 'high-contrast' || theme === 'appsheet-dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const tableBg = isLight ? 'bg-white' : isHighContrast ? 'bg-black' : 'bg-base';
  const tableBorder = isLight ? 'border-slate-200' : isHighContrast ? 'border-yellow-400' : 'border-slate-900';
  const theadBg = isLight ? 'bg-slate-100' : isHighContrast ? 'bg-yellow-950/30' : 'bg-surface/40';
  const theadText = isLight ? 'text-slate-600' : isHighContrast ? 'text-yellow-400' : 'text-slate-500';
  const rowDivider = isLight ? 'divide-slate-200' : isHighContrast ? 'divide-yellow-400/20' : 'divide-slate-900';
  const rowHover = isLight ? 'hover:bg-slate-50' : isHighContrast ? 'hover:bg-yellow-900/10' : 'hover:bg-surface/10';
  const cellText = isLight ? 'text-slate-700' : isHighContrast ? 'text-yellow-300' : 'text-secondary';

  const handleEditRow = (rowId: string, rowData: any) => {
    if (!activeSlice.allowEdits) return;
    
    const fieldToEdit = window.prompt(
      `Columna a editar:\n${activeSlice.selectedColumns.join(', ')}`,
      activeSlice.selectedColumns[1]
    );
    if (!fieldToEdit || !activeSlice.selectedColumns.includes(fieldToEdit)) return;
    
    const newValue = window.prompt(`Nuevo valor para [${fieldToEdit}]:`, 
      String(rowData[fieldToEdit] || '')
    );
    if (newValue === null) return;
    
    window.dispatchEvent(new CustomEvent('slice-edit-row', {
      detail: { rowId, fieldToEdit, newValue, rowData }
    }));
  };
  
  const handleDeleteRow = (rowId: string) => {
    if (!activeSlice.allowDeletes) return;
    if (!window.confirm('¿Marcar este registro para borrado?')) return;
    
    window.dispatchEvent(new CustomEvent('slice-delete-row', {
      detail: { rowId }
    }));
  };
  
  const getStatusBadge = (col: string, val: any) => {
    const displayStr = typeof val === 'object' ? JSON.stringify(val) : String(val || '-');
    
    if (col === 'syncStatus' || col === 'status') {
      let badgeStyle = '';
      if (['synced', 'completed', 'active'].includes(val)) {
        badgeStyle = isLight ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      } else if (['pending', 'pending_delete'].includes(val)) {
        badgeStyle = isLight ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      } else if (val === 'error') {
        badgeStyle = isLight ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      }
      
      if (badgeStyle) {
        return (
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${badgeStyle}`}>
            {displayStr}
          </span>
        );
      }
    }
    
    return displayStr;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-pulse ${isLight ? 'text-muted' : 'text-slate-500'}`}>Cargando datos...</div>
      </div>
    );
  }
  
  return (
    <div className={`overflow-x-auto rounded-2xl border ${tableBorder} ${tableBg}`}>
      <table className="w-full text-left font-mono text-[11px] leading-relaxed border-collapse">
        <thead>
          <tr className={`border-b ${tableBorder} ${theadBg} ${theadText} font-extrabold uppercase`}>
            {activeSlice.selectedColumns.map((col) => (
              <th key={col} className="p-3.5 tracking-wider">{col}</th>
            ))}
            {(activeSlice.allowEdits || activeSlice.allowDeletes) && (
              <th className="p-3.5 text-right tracking-wider">Acciones</th>
            )}
          </tr>
        </thead>
        
        <tbody className={`divide-y ${rowDivider}`}>
          {filteredRows.length === 0 ? (
            <tr>
              <td colSpan={activeSlice.selectedColumns.length + 1} className={`p-8 text-center font-sans ${isLight ? 'text-muted' : 'text-slate-500'}`}>
                <BookOpen className={`w-10 h-10 mx-auto mb-3 ${isLight ? 'text-secondary' : 'text-slate-800'}`} />
                Ningún registro cumple con los criterios de este Slice o la búsqueda actual.
              </td>
            </tr>
          ) : (
            filteredRows.map((rowArr: any, index) => {
              const rowId = rowArr.id || rowArr.barcode;
              
              return (
                <tr key={index} className={`transition-colors ${rowHover}`}>
                  {activeSlice.selectedColumns.map((col) => {
                    let cellVal = rowArr[col];
                    if (cellVal === undefined && rowArr.data) {
                      cellVal = rowArr.data[col];
                    }
                    
                    return (
                      <td key={col} className={`p-3.5 truncate max-w-xs font-medium ${cellText}`}>
                        {getStatusBadge(col, cellVal)}
                      </td>
                    );
                  })}
                  
                  {(activeSlice.allowEdits || activeSlice.allowDeletes) && (
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {activeSlice.allowEdits && (
                          <button
                            onClick={() => handleEditRow(rowId, rowArr)}
                            className={`p-1 px-2.5 rounded-lg border transition-all font-sans font-bold text-[9px] uppercase tracking-wide inline-flex items-center gap-1 ${
                              isLight 
                                ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100' 
                                : isHighContrast 
                                ? 'bg-yellow-900/20 text-yellow-400 border-yellow-400/30 hover:bg-yellow-900/30'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/10 hover:bg-blue-500/20'
                            }`}
                            title="Modificar Columna de Celda"
                          >
                            <Edit className="w-3 h-3" /> Alterar
                          </button>
                        )}
                        {activeSlice.allowDeletes && (
                          <button
                            onClick={() => handleDeleteRow(rowId)}
                            className={`p-1 px-2 mb-0.5 rounded-lg transition-all ${
                              isLight 
                                ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50' 
                                : isHighContrast 
                                ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/20'
                                : 'text-rose-400 hover:text-white hover:bg-rose-600/20'
                            }`}
                            title="Remover Fila"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
