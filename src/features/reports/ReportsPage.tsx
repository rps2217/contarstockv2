import React, { useCallback, useMemo, useEffect, useState } from "react";
import { 
  Archive, 
  WifiOff, 
  Zap, 
  Package, 
  History, 
  RefreshCw, 
  Boxes, 
  TrendingUp, 
  MapPin, 
  Search, 
  SlidersHorizontal,
  Layers,
  ArrowRight,
  FileSpreadsheet
} from "lucide-react";
import { StartSessionModal } from "../../components/StartSessionModal";
import { ManagementSearchBar } from "../../shared/components/core/ManagementSearchBar";
import { ReportDetail } from "./components/ReportDetail";
import { ReportsHeader } from "./components/ReportsHeader";
import { useNavigate, useLocation } from "react-router-dom";
import { SessionRow } from "./components/SessionRow";
import { SessionRowSkeleton } from "./components/SessionRowSkeleton";
import { useReports } from "./hooks/useReports";
import { VirtualList } from "../../shared/components/ui/VirtualList";
import { useAppStore } from "../../store/mainAppStore";


// Re-export types and constants
export * from './types/Report';
export * from './constants/reportConstants';

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useAppStore();
  const { state, actions } = useReports();
  const theme: 'light' | 'dark' = settings.theme === 'light' ? 'light' : 'dark';
  const isDark = settings.theme !== 'light';

  const [activeTab, setActiveTab] = useState<'live' | 'sessions'>('live');

  // UX Fix: Auto-abrir modal si viene del Dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "true") {
      actions.setIsStartModalOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location, actions, navigate]);

  // Manejador de scroll infinito simplificado
  const handleEndReached = useCallback(() => {
    if (state.hasMore) actions.loadMore();
  }, [state.hasMore, actions]);

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

  // Datos pasados a cada fila
  const rowData = useMemo(
    () => ({
      onSelect: actions.setSelectedSessionId,
      activeMenuId: state.activeMenuId,
      onMenuToggle: actions.handleMenuToggle,
      onDelete: actions.handleDeleteSession,
    }),
    [
      state.activeMenuId,
      actions.setSelectedSessionId,
      actions.handleMenuToggle,
      actions.handleDeleteSession,
    ],
  );

  // Forzar actualización de nubes y consolidación
  const handleRefreshAll = useCallback(async () => {
    await actions.pullCloudData();
    await actions.fetchLiveConsolidatedData();
  }, [actions]);

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
      {/* CABECERA PRINCIPAL DE CONTRALORÍA DE CONSOLIDACIONES */}
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

      <ReportsHeader
        isCleaning={state.isCleaning}
        onClean={actions.handleCleanSynced}
        onStartNew={() => actions.setIsStartModalOpen(true)}
        syncedCount={state.syncedCount}
        theme={theme}
      />

      {/* SELECTOR DE PESTAÑAS BIDIRECCIONALES Y MODERNAS */}
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

      {/* METADATAS DE CARGA O ALERTAS DE SINCRONIZACIÓN LOCAL */}
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

      {/* FILTRO DE BUSQUEDA GENERAL */}
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

      {/* TAB 1: CONSOLIDACIÓN EN VIVO (MÓDULO RE-IMAGINADO Y PRÁCTICO) */}
      {activeTab === 'live' && (
        <div className="flex flex-col flex-1 gap-4">
          {/* BENTO STATS GRID */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-4 rounded-[1.5rem] border ${
              isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">SKUs Únicos</span>
              <span className={`text-xl font-black mt-1 block italic ${isDark ? 'text-white' : 'text-slate-900'}`}>{liveStats.totalSKUs}</span>
            </div>
            <div className={`p-4 rounded-[1.5rem] border ${
              isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Total Fisico</span>
              <span className={`text-xl font-black mt-1 block italic ${isDark ? 'text-white' : 'text-slate-900'}`}>{liveStats.totalUnits}</span>
            </div>
            <div className={`p-4 rounded-[1.5rem] border ${
              isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
            }`}>
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block">Zonas Escaneadas</span>
              <span className={`text-xl font-black mt-1 block italic ${isDark ? 'text-white' : 'text-slate-900'}`}>{liveStats.locationsCount}</span>
            </div>
          </div>

          <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm relative flex flex-col ${
            isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
          }`}>
            {/* Header del Grid de Consolidación */}
            <div className={`h-11 border-b flex items-center px-6 justify-between z-10 shrink-0 ${
              isDark ? 'bg-brand-dark/50 border-white/5' : 'bg-slate-50 border-slate-100'
            }`}>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex-1">PRODUCTO / SKU</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest w-24 text-right">CANT. TOTAL</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest w-24 text-right">ORIGEN</span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[500px]">
              {state.isLiveLoading ? (
                <div className="flex flex-col p-4 gap-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-500/10 w-full" />
                  ))}
                </div>
              ) : filteredLiveConsolidated.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <Archive className="w-10 h-10 opacity-20 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Sin registros consolidados en la nube
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-500/10">
                  {filteredLiveConsolidated.map((item, index) => (
                    <div 
                      key={item.barcode + '-' + index} 
                      className={`p-4 flex items-center justify-between transition-colors ${
                        isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <span className="font-mono text-[10px] font-black uppercase text-indigo-500 block">
                          {item.barcode}
                        </span>
                        <span className={`text-xs font-black truncate block mt-0.5 ${
                          isDark ? 'text-white' : 'text-slate-800'
                        }`}>
                          {item.productName}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wide block mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          Zonas: {item.locationsList}
                        </span>
                      </div>

                      <div className="w-24 text-right font-mono font-black text-lg pr-2 italic">
                        {item.totalQuantity}
                      </div>

                      <div className="w-24 text-right flex justify-end">
                        <span className={`text-[8px] px-2 py-1 font-black uppercase rounded-lg border leading-tight ${
                          item.source === 'Martillo' 
                            ? isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'
                            : item.source === 'Estándar'
                              ? isDark ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' : 'bg-indigo-50 border-indigo-200 text-indigo-600'
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                        }`}>
                          {item.source}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HISTORIAL DE SESIONES / BULTOS */}
      {activeTab === 'sessions' && (
        <div className="flex flex-col flex-1 gap-4">
          {/* BARRA DE FILTRADO INTERNA PARA DEVELAR TODOS LOS TIPOS RAPIDAMENTE */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'standard', label: 'Estándar/Consolidado' },
              { id: 'hammer', label: 'Ciego (Martillo)' },
              { id: 'reception', label: 'Recepciones' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => actions.setFilterType(pill.id as any)}
                className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 border transition-all ${
                  state.filterType === pill.id
                    ? isDark 
                      ? 'bg-white text-black border-white'
                      : 'bg-indigo-600 text-white border-indigo-700'
                    : isDark
                      ? 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>

          <div className={`flex-1 border rounded-[2rem] overflow-hidden shadow-sm relative flex flex-col ${
            isDark ? 'bg-brand-surface border-white/5' : 'bg-white border-slate-200'
          }`}>
            <div className={`h-11 border-b flex items-center px-6 justify-between z-10 shrink-0 ${
              isDark ? 'bg-brand-dark/50 border-white/5' : 'bg-slate-50 border-slate-100'
            }`}>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Firma Operativa / Bulto
              </span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
                Detalle y Estado
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px]">
              {state.isLoading ? (
                <div className="flex flex-col">
                  {[...Array(5)].map((_, i) => (
                    <SessionRowSkeleton key={i} theme={theme} />
                  ))}
                </div>
              ) : state.sessions?.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                  <Archive className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Sin bultos en este filtro
                  </p>
                </div>
              ) : (
                <VirtualList
                  items={state.sessions || []}
                  itemHeight={110}
                  renderRow={SessionRow}
                  rowData={{ ...rowData, theme }}
                  onEndReached={handleEndReached}
                  emptyState={
                    <div className="flex flex-col items-center">
                      <Archive className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        Historial vacío
                      </p>
                    </div>
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
