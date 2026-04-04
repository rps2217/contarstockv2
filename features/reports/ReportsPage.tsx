import React, { useCallback, useMemo, useEffect } from "react";
import { Archive, WifiOff, Zap, Package } from "lucide-react";
import { StartSessionModal } from "../../components/StartSessionModal";
import { SearchBar } from "../../components/SearchBar";
import { ReportDetail } from "./components/ReportDetail";
import { ReportsHeader } from "./components/ReportsHeader";
import { useNavigate, useLocation } from "react-router-dom";
import { SessionRow } from "./components/SessionRow";
import { SessionRowSkeleton } from "./components/SessionRowSkeleton";
import { useReports } from "./hooks/useReports";
import { VirtualList } from "../../shared/components/ui/VirtualList";

export const Reports: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, actions } = useReports();
  const isHammerArchive = state.filterType === "hammer";

  // UX Fix: Auto-abrir modal si viene del Dashboard
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("create") === "true") {
      actions.setIsStartModalOpen(true);
      // Limpiar URL para que no se reabra al refrescar
      navigate(location.pathname, { replace: true });
    }
  }, [location, actions, navigate]);

  // Manejador de scroll infinito simplificado
  const handleEndReached = useCallback(() => {
    if (state.hasMore) actions.loadMore();
  }, [state.hasMore, actions]);

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

  if (state.selectedSessionId) {
    return (
      <ReportDetail
        sessionId={state.selectedSessionId}
        onBack={() => actions.setSelectedSessionId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full page-transition px-4 pt-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isHammerArchive ? (
            <Zap className="w-6 h-6 text-blue-500" />
          ) : (
            <Package className="w-6 h-6 text-indigo-500" />
          )}
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
            {isHammerArchive ? "Archivo Martillo" : "Historial de Carga"}
          </h1>
        </div>
        {isHammerArchive && (
          <button
            onClick={() => navigate("/reports")}
            className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-lg uppercase"
          >
            Ver Cargas
          </button>
        )}
      </div>

      <ReportsHeader
        isCleaning={state.isCleaning}
        onClean={actions.handleCleanSynced}
        onStartNew={() => actions.setIsStartModalOpen(true)}
        syncedCount={state.syncedCount}
      />

      <div className="mt-4 mb-6 shrink-0">
        <SearchBar
          onSearch={actions.setSearchQuery}
          placeholder="Filtrar por ERP o Bulto..."
        />
      </div>

      {state.pendingSyncCount > 0 && (
        <button
          onClick={() => navigate("/sync")}
          className="w-full mb-4 bg-orange-600 p-4 rounded-2xl flex items-center justify-between shadow-lg shadow-orange-900/20 animate-pulse group border-b-4 border-orange-800 shrink-0"
        >
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-white" />
            <div className="text-left">
              <div className="text-[10px] font-black text-white uppercase tracking-widest">
                Sincronización Pendiente
              </div>
              <div className="text-[9px] text-orange-100 font-bold uppercase">
                {state.pendingSyncCount} registros en cola
              </div>
            </div>
          </div>
        </button>
      )}

      <div className="flex-1 min-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[2rem] overflow-hidden shadow-sm relative">
        <div className="absolute top-0 left-0 right-0 h-10 bg-slate-50 dark:bg-black/50 border-b border-slate-100 dark:border-white/5 flex items-center px-6 justify-between z-10">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Firma Operativa
          </span>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">
            Estado
          </span>
        </div>

        <div className="h-full pt-10">
          {state.isLoading ? (
            <div className="flex flex-col">
              {[...Array(6)].map((_, i) => (
                <SessionRowSkeleton key={i} />
              ))}
            </div>
          ) : (
            <VirtualList
              items={state.sessions || []}
              itemHeight={110}
              renderRow={SessionRow}
              rowData={rowData}
              onEndReached={handleEndReached}
              emptyState={
                <div className="flex flex-col items-center">
                  <Archive className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Sin registros
                  </p>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
