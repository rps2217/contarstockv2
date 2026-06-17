/**
 * SlicesPage - Página principal de Slices (vistas configurables de datos)
 *
 * Arquitectura Lego: Este componente es un orquestador puro que delega toda la lógica
 * al hook useSlicesLogic y rendering a componentes especializados.
 *
 * Antes: 826 líneas
 * Después: ~120 líneas
 */

import React, { useState, useEffect } from 'react';
import { Plus, Layers } from 'lucide-react';
import { useSlicesLogic } from './hooks/useSlicesLogic';
import { SlicesSidebar, SliceFilters, SlicePreview, CreateSliceModal } from './components';
import { useThemeClasses } from '@/shared/hooks/useTheme';
import { useAppStore } from '@/store/mainAppStore';

export const SlicesPage: React.FC = () => {
  const { settings } = useAppStore();
  const theme = settings?.theme || 'dark';
  const tc = useThemeClasses();

  const {
    slices,
    activeSlice,
    activeSliceId,
    searchTerm,
    filteredRows,
    sliceData,
    isLoading,
    setActiveSliceId,
    setSearchTerm,
    createSlice,
    deleteSlice,
    editRow,
    deleteRow,
    exportCSV,
  } = useSlicesLogic();

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Escuchar eventos de edición/eliminación de filas desde SlicePreview
  useEffect(() => {
    const handleEditRow = (e: CustomEvent) => {
      const { rowId, fieldToEdit, newValue, rowData } = e.detail;
      editRow(rowId, { ...rowData, [fieldToEdit]: newValue });
    };

    const handleDeleteRow = (e: CustomEvent) => {
      const { rowId } = e.detail;
      deleteRow(rowId);
    };

    window.addEventListener('slice-edit-row', handleEditRow as EventListener);
    window.addEventListener('slice-delete-row', handleDeleteRow as EventListener);

    return () => {
      window.removeEventListener('slice-edit-row', handleEditRow as EventListener);
      window.removeEventListener('slice-delete-row', handleDeleteRow as EventListener);
    };
  }, [editRow, deleteRow]);

  return (
    <div className={`p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 font-sans selection:bg-blue-500/30 ${tc.background} ${tc.text}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none flex items-center gap-2.5">
            <Layers className={`w-8 h-8 ${tc.isLight ? 'text-blue-600' : 'text-blue-500'}`} />
            Slices de Datos
            <span className={`${tc.isLight ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'} text-xs tracking-widest uppercase italic font-normal py-1 px-2.5 rounded-full border`}>
              ESTILO APPSHEET
            </span>
          </h1>
          <p className={`${tc.textMuted} text-xs font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2`}>
            Vistas Filtradas, Controles de Escritura y Columnas Personalizadas
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 ${tc.primary}`}
        >
          <Plus className="w-4 h-4" />
          Crear Slice Custom
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Sidebar: Lists of Slices */}
        <SlicesSidebar
          slices={slices}
          activeSliceId={activeSliceId}
          onSelect={setActiveSliceId}
          onDelete={deleteSlice}
          theme={theme as 'dark' | 'light' | 'high-contrast'}
        />

        {/* Content Panel: Display Selected Slice */}
        <div className="lg:col-span-3 space-y-4">
          <div className={`${tc.isLight ? 'bg-white border-slate-200' : 'bg-slate-950/40 border-slate-900'} border p-5 rounded-3xl space-y-4`}>
            {/* Filters & Info */}
            <SliceFilters
              activeSlice={activeSlice}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onExport={exportCSV}
              filteredCount={filteredRows.length}
              totalCount={sliceData?.length || 0}
              theme={theme as 'dark' | 'light' | 'high-contrast'}
            />

            {/* Data Table */}
            <SlicePreview
              activeSlice={activeSlice}
              filteredRows={filteredRows}
              isLoading={isLoading}
              theme={theme as 'dark' | 'light' | 'high-contrast'}
            />
          </div>
        </div>
      </div>

      {/* Create Slice Modal */}
      <CreateSliceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createSlice}
        theme={theme as 'dark' | 'light' | 'high-contrast'}
      />
    </div>
  );
};

export default SlicesPage;
