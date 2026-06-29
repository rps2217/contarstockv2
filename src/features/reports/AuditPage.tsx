/**
 * ReportsPage - Página de Consolidación e Historial
 * 
 * Diseño monocromático de grises.
 */

import React, { useCallback, useMemo, useState } from "react";
import { 
  RefreshCw, 
  FileSpreadsheet,
  TrendingUp,
  History,
  WifiOff,
  ArrowRight,
  LayoutGrid,
  List,
  ChevronLeft,
  Plus,
  Eraser,
  FileText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ReportDetail } from "./components/ReportDetail";
import { LiveConsolidationGrid } from "./components/LiveConsolidationGrid";
import { SessionHistoryList } from "./components/SessionHistoryList";
import { ManagementSearchBar } from "../../shared/components/core/ManagementSearchBar";
import { useReports } from "./hooks/useReports";
import { useAppStore } from '@/stores';
import { CountingMetricsCards } from "../counting/components/CountingMetricsCards";
import { CountingKanbanView } from "../counting/components/CountingKanbanView";
import { NetworkStatus } from "@/shared/components/ui/NetworkStatus";

// Re-export types and constants
export * from './types/Report';
export * from './constants/reportConstants';

export const AuditPage: React.FC = () => {
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
    <div className={`flex flex-col h-full w-full px-4 pt-4 pb-24 md:pb-6 overflow-y-auto ${
      isDark ? 'bg-base text-white' : 'bg-neutral-50 text-neutral-900'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDark ? 'bg-surface' : 'bg-neutral-100'}`}>
            <FileText className={`w-5 h-5 ${isDark ? 'text-muted' : 'text-neutral-600'}`} />
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-neutral-900'
            }`}>
              Reportes
            </h1>
            <p className={`text-xs ${
              isDark ? 'text-neutral-500' : 'text-neutral-500'
            }`}>
              Consolidación e historial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NetworkStatus />
          {activeTab === 'live' && (
            <button
              onClick={() => handleExportLiveToExcel(filteredLiveConsolidated)}
              disabled={filteredLiveConsolidated.length === 0}
              className={`p-2.5 rounded-xl border text-xs font-medium ${
                isDark 
                  ? "border-subtle bg-surface hover:bg-elevated text-secondary" 
                  : "border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700"
              } disabled:opacity-50`}
            >
              <FileSpreadsheet className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleRefreshAll}
            disabled={state.isPulling || state.isLiveLoading}
            className={`p-2.5 rounded-xl border ${
              isDark 
                ? "border-subtle bg-surface text-muted hover:text-primary" 
                : "border-neutral-200 bg-white text-neutral-600 hover:text-neutral-900"
            } ${state.isPulling || state.isLiveLoading ? "animate-spin opacity-50" : ""}`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={actions.handleCleanSynced}
          disabled={state.isCleaning}
          className={`border font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
            isDark ? 'bg-surface border-subtle text-secondary' : 'bg-white border-neutral-200 text-neutral-700'
          }`}
        >
          <Eraser className="w-4 h-4" />
          <span className="text-xs">Limpiar</span>
          {state.syncedCount > 0 && (
            <span className="text-[10px] text-neutral-500">({state.syncedCount})</span>
          )}
        </button>
        <button
          onClick={() => actions.setIsStartModalOpen(true)}
          className={`font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
            isDark ? 'bg-neutral-100 text-neutral-900' : 'bg-surface text-white'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs">Nueva Carga</span>
        </button>
      </div>

      {/* Tabs */}
      <div className={`p-1 rounded-xl flex items-center gap-1 border mb-4 ${
        isDark ? 'bg-surface border-subtle' : 'bg-neutral-100 border-neutral-200'
      }`}>
        <button
          onClick={() => {
            setActiveTab('live');
            actions.fetchLiveConsolidatedData();
          }}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === 'live'
              ? isDark 
                ? 'bg-elevated text-white' 
                : 'bg-white text-neutral-900 shadow-sm'
              : isDark ? 'text-neutral-500 hover:text-secondary' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Consolidación
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === 'sessions'
              ? isDark 
                ? 'bg-elevated text-white' 
                : 'bg-white text-neutral-900 shadow-sm'
              : isDark ? 'text-neutral-500 hover:text-secondary' : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <History className="w-4 h-4" />
          Historial
        </button>
      </div>

      {/* Sync Alert */}
      {state.pendingSyncCount > 0 && (
        <button
          onClick={() => navigate("/sync")}
          className={`w-full mb-4 p-3 rounded-xl flex items-center justify-between border transition-colors ${
            isDark ? 'bg-surface border-subtle' : 'bg-white border-neutral-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <WifiOff className={`w-4 h-4 ${isDark ? 'text-muted' : 'text-neutral-600'}`} />
            <span className={`text-xs ${isDark ? 'text-secondary' : 'text-neutral-700'}`}>
              {state.pendingSyncCount} registros pendientes de sync
            </span>
          </div>
          <ArrowRight className={`w-4 h-4 ${isDark ? 'text-neutral-500' : 'text-muted'}`} />
        </button>
      )}

      {/* Search */}
      <div className="mb-4">
        <ManagementSearchBar
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          onOpenFilters={() => {}} 
          onOpenAdd={() => actions.setIsStartModalOpen(true)}
          onClearFilters={() => actions.setSearchQuery('')}
          activeFiltersCount={0}
          placeholder={activeTab === 'live' ? "Filtrar por SKU o descripción..." : "Filtrar bultos..."}
          accentColor="gray"
          theme={theme}
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'live' && (
        <LiveConsolidationGrid
          items={filteredLiveConsolidated}
          isLoading={state.isLiveLoading}
          searchQuery={state.searchQuery}
          onExport={() => handleExportLiveToExcel(filteredLiveConsolidated)}
          stats={liveStats}
        />
      )}

      {activeTab === 'sessions' && (
        <>
          <CountingMetricsCards sessions={state.sessions || []} theme={theme} />
          
          <div className="flex justify-end mb-3">
            <div className={`flex gap-1 p-1 rounded-lg ${isDark ? 'bg-surface' : 'bg-neutral-100'}`}>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? (isDark ? 'bg-elevated text-white' : 'bg-white text-neutral-900') : isDark ? 'text-neutral-500 hover:text-secondary' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'kanban' ? (isDark ? 'bg-elevated text-white' : 'bg-white text-neutral-900') : isDark ? 'text-neutral-500 hover:text-secondary' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
          
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

export default AuditPage;
