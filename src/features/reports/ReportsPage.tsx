/**
 * ReportsPage - Página de Consolidación e Historial
 * 
 * Arquitectura Lego: Este componente es un orquestador puro que delega toda la lógica
 * al hook useReports y rendering a componentes especializados.
 * 
 * Antes: 463 líneas
 * Después: ~150 líneas
 */

import React, { useCallback, useMemo, useState } from "react";
import { 
  RefreshCw, 
  Boxes, 
  FileSpreadsheet,
  TrendingUp,
  History,
  WifiOff,
  ArrowRight,
  LayoutGrid,
  List
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReportDetail } from "./components/ReportDetail";
import { ReportsHeader } from "./components/ReportsHeader";
import { LiveConsolidationGrid } from "./components/LiveConsolidationGrid";
import { SessionHistoryList } from "./components/SessionHistoryList";
import { ManagementSearchBar } from "../../shared/components/core/ManagementSearchBar";
import { useReports } from "./hooks/useReports";
import { useAppStore } from '@/stores';
import { CountingMetricsCards } from "../counting/components/CountingMetricsCards";
import { CountingKanbanView } from "../counting/components/CountingKanbanView";

// Re-export types and constants
export * from './types/Report';
export * from './constants/reportConstants';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const { state, actions } = useReports();
  const theme: 'light' | 'dark' = settings.theme === 'light' ? 'light' : 'dark';
  const isDark = settings.theme !== 'light';

  const [activeTab, setActiveTab] = useState<'live' | 'sessions'>('live');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');

  // Filtrar consolidación en vivo según la barra de búsqueda
  const filteredLiveConsolidated = useMemo(() => {
    if (!state.liveConsolidated) return [];
    const q = state.searchQuery.trim().toLowerCase();
    if (!q) return state.liveConsolidated;
    return state.liveConsolidated.filter(item => 
      item.barcode.toLowerCase().includes(q) || 
      item.productName.toLowerCase().includes(q) || 
      item.locationsList.toLowerCase().includes(q)
    );
  }, [state.liveConsolidated, state.searchQuery]);

  // Helper para exportar consolidación en vivo a Excel
  const handleExportLiveToExcel = useCallback(async (items: typeof filteredLiveConsolidated) => {
    const XLSX = await import('xlsx');
    const data = items.map(item => ({
      'Código/SKU': item.barcode,
      'Descripción': item.productName,
      'Zonas': item.locationsList,
      'Cantidad Total': item.totalQuantity,
      'Origen de Datos': item.source
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet['!cols'] = [
      { wch: 18 }, { wch: 45 }, { wch: 20 }, { wch: 15 }, { wch: 15 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidado");
    const dateStr = new Date().toISOString().substring(0, 10);
    XLSX.writeFile(workbook, `Consolidado_En_Vivo_${dateStr}.xlsx`);
  }, []);

  // Métricas generales de consolidación
  const liveStats = useMemo(() => {
    const items = state.liveConsolidated || [];
    const totalSKUs = items.length;
    const totalUnits = items.reduce((acc, i) => acc + i.totalQuantity, 0);
    
    const uniqueLocations = new Set<string>();
    items.forEach(i => {
      if (i.locationsList && i.locationsList !== 'N/A') {
        const parts = i.locationsList.split(',').map((p: string) => p.trim());
        parts.forEach((p: string) => {
          if (p) uniqueLocations.add(p);
        });
      }
    });

    return { 
      totalSKUs, 
      totalUnits, 
      locationsCount: uniqueLocations.size || 1 
    };
  }, [state.liveConsolidated]);

  // Manejador de scroll infinito
  const handleEndReached = useCallback(() => {
    if (state.hasMore) actions.loadMore();
  }, [state.hasMore, actions]);

  // Forzar actualización de nubes y consolidación
  const handleRefreshAll = useCallback(async () => {
    await actions.pullCloudData();
    await actions.fetchLiveConsolidatedData();
  }, [actions]);

  // Si hay sesión seleccionada, mostrar detalle
  if (state.selectedSessionId) {
    return (
      <ReportDetail
        sessionId={state.selectedSessionId}
        onBack={() => actions.setSelectedSessionId(null)}
      />
    );
  }

  return (
    <div className={`flex flex-col h-full w-full page-transition px-4 pt-6 pb-24 md:pb-6 overflow-y-auto ${
      isDark ? 'bg-brand-dark text-white' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* CABECERA PRINCIPAL */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <Boxes className={`w-8 h-8 ${isDark ? 'text-brand-info animate-pulse' : 'text-indigo-600'}`} />
          <div>
            <h1 className={`text-2xl md:text-3xl font-black tracking-tighter uppercase italic leading-none ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              Consolidación e Historial
            </h1>
            <p className={`text-[10px] uppercase font-bold tracking-widest mt-1 flex items-center gap-1.5 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sincronización Bidireccional de Auditorías Realizadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'live' && (
            <button
              onClick={() => handleExportLiveToExcel(filteredLiveConsolidated)}
              disabled={filteredLiveConsolidated.length === 0}
              className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 border text-xs font-black uppercase tracking-wider ${
                isDark 
                  ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/20" 
                  : "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
              }`}
              title="Descargar consola de consolidación en formato Excel"
            >
              <FileSpreadsheet className="w-5 h-5 animate-pulse" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          )}

          <button
            onClick={handleRefreshAll}
            disabled={state.isPulling || state.isLiveLoading}
            className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center border ${
              state.isPulling || state.isLiveLoading 
                ? "animate-spin opacity-50" 
                : "hover:scale-105 active:scale-95"
            } ${
              isDark 
                ? "text-brand-info border-white/5 bg-white/5 hover:bg-white/10" 
                : "text-indigo-600 border-indigo-200 bg-white shadow-sm hover:bg-indigo-50"
            }`}
            title="Refrescar datos de la nube en tiempo real"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ReportsHeader */}
      <ReportsHeader
        isCleaning={state.isCleaning}
        onClean={actions.handleCleanSynced}
        onStartNew={() => actions.setIsStartModalOpen(true)}
        syncedCount={state.syncedCount}
        theme={theme}
      />

      {/* SELECTOR DE PESTAÑAS */}
      <div className={`mt-2 p-1.5 rounded-2xl flex items-center gap-2 border ${
        isDark ? 'bg-brand-surface border-white/5' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          onClick={() => {
            setActiveTab('live');
            actions.fetchLiveConsolidatedData();
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'live'
              ? isDark 
                ? 'bg-brand-warning text-black shadow-lg shadow-brand-warning/10 scale-100'
                : 'bg-white text-indigo-700 shadow border border-indigo-100 scale-100'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Consolidación en Vivo (Nube)
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sessions'
              ? isDark 
                ? 'bg-brand-warning text-black shadow-lg shadow-brand-warning/10 scale-100'
                : 'bg-white text-indigo-700 shadow border border-indigo-100 scale-100'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          Historial de Carga / Bultos
        </button>
      </div>

      {/* ALERTA DE SINCRONIZACIÓN PENDIENTE */}
      {state.pendingSyncCount > 0 && (
        <button
          onClick={() => navigate("/sync")}
          className="w-full mt-4 bg-brand-warning p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-brand-warning/20 animate-pulse group border-b-4 border-brand-warning/80 shrink-0"
        >
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-black" />
            <div className="text-left">
              <div className="text-[10px] font-black text-black uppercase tracking-widest">
                Sincronización Pendiente
              </div>
              <div className="text-[9px] text-black/60 font-bold uppercase">
                Hay {state.pendingSyncCount} registros creados offline esperando ser subidos.
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-black group-hover:translate-x-1 transition-transform" />
        </button>
      )}

      {/* FILTRO DE BÚSQUEDA */}
      <div className="mt-4 mb-4 shrink-0">
        <ManagementSearchBar
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          onOpenFilters={() => {}} 
          onOpenAdd={() => actions.setIsStartModalOpen(true)}
          onClearFilters={() => actions.setSearchQuery('')}
          activeFiltersCount={0}
          placeholder={activeTab === 'live' ? "Filtrar consolidado por SKU o descripción..." : "Filtrar bultos por etiqueta o ERP..."}
          accentColor={activeTab === 'live' ? "blue" : "indigo"}
          theme={theme}
        />
      </div>

      {/* TAB 1: CONSOLIDACIÓN EN VIVO */}
      {activeTab === 'live' && (
        <LiveConsolidationGrid
          items={filteredLiveConsolidated}
          isLoading={state.isLiveLoading}
          searchQuery={state.searchQuery}
          onExport={() => handleExportLiveToExcel(filteredLiveConsolidated)}
          stats={liveStats}
        />
      )}

      {/* TAB 2: HISTORIAL DE SESIONES */}
      {activeTab === 'sessions' && (
        <>
          {/* Metrics Cards */}
          <CountingMetricsCards sessions={state.sessions || []} theme={theme} />
          
          {/* View Toggle */}
          <div className="flex justify-end">
            <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-white text-black' : isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-600 hover:bg-white'
                }`}
                title="Vista Lista"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'kanban' ? 'bg-white text-black' : isDark ? 'text-slate-400 hover:bg-white/10' : 'text-slate-600 hover:bg-white'
                }`}
                title="Vista Kanban"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* List or Kanban View */}
          {viewMode === 'kanban' ? (
            <CountingKanbanView 
              sessions={state.sessions || []} 
              theme={theme}
              onItemClick={(s) => actions.setSelectedSessionId(s.id)}
            />
          ) : (
            <SessionHistoryList
              sessions={state.sessions}
              isLoading={state.isLoading}
              filterType={state.filterType}
              theme={theme}
              activeMenuId={state.activeMenuId}
              onSelect={actions.setSelectedSessionId}
              onMenuToggle={(id) => actions.handleMenuToggle(undefined as unknown as React.MouseEvent, id)}
              onDelete={(id) => actions.handleDeleteSession(undefined as unknown as React.MouseEvent, id)}
              onEndReached={handleEndReached}
              onFilterChange={(filter) => actions.setFilterType(filter as any)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Reports;
