/**
 * AuditPage.tsx - Página de Auditoria y Reportes
 * 
 * Migrado a redesign/pages/ para consolidar UI.
 * Usa componentes de features/reports/ para la logica.
 */

import React, { useCallback, useMemo, useState } from "react";
import { 
  RefreshCw, 
  FileSpreadsheet,
  TrendingUp,
  History,
  WifiOff,
  ArrowRight,
  List,
  Plus,
  Eraser,
  FileText,
  LayoutGrid,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Imports desde features/ (logica de negocio)
import { useReports } from "@/features/reports/hooks/useReports";
import { useAppStore } from "@/stores";
import { NetworkStatus } from "@/shared/components/ui/NetworkStatus";
import { ManagementSearchBar } from "@/shared/components/core/ManagementSearchBar";

// ============================================================================
// COMPONENTE PRINCIPAL: AuditPage (REDESIGN)
// ============================================================================
export const RedesignAuditPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useAppStore();
  const { state, actions } = useReports();
  const isDark = settings?.theme !== "light";

  const [activeTab, setActiveTab] = useState<"live" | "sessions">("live");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");

  // Filtrar datos segun busqueda
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

  // Estadisticas de consolidacion en vivo
  const liveStats = useMemo(() => {
    const items = state.liveConsolidated || [];
    const totalSKUs = items.length;
    const totalUnits = items.reduce((acc, i) => acc + i.totalQuantity, 0);
    
    const uniqueLocations = new Set<string>();
    items.forEach(i => {
      if (i.locationsList && i.locationsList !== "N/A") {
        const parts = i.locationsList.split(",").map((p: string) => p.trim());
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

  // Exportar a Excel
  const handleExportLiveToExcel = useCallback(async () => {
    try {
      const XLSX = await import("xlsx");
      const data = filteredLiveConsolidated.map(item => ({
        "Codigo/SKU": item.barcode,
        "Descripcion": item.productName,
        "Zonas": item.locationsList,
        "Cantidad Total": item.totalQuantity,
        "Origen de Datos": item.source
      }));
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Consolidado");
      const dateStr = new Date().toISOString().substring(0, 10);
      XLSX.writeFile(workbook, `Consolidado_${dateStr}.xlsx`);
      toast.success("Exportacion iniciada");
    } catch (error) {
      toast.error("Error al exportar");
    }
  }, [filteredLiveConsolidated]);

  // Refrescar datos
  const handleRefreshAll = useCallback(async () => {
    await actions.pullCloudData();
    await actions.fetchLiveConsolidatedData();
    toast.success("Datos actualizados");
  }, [actions]);

  // Si hay sesion seleccionada, mostrar detalle (simplificado)
  if (state.selectedSessionId) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <FileText className="w-16 h-16 text-muted mb-4" />
        <h2 className="text-lg font-bold text-primary mb-2">Detalle de Sesion</h2>
        <p className="text-sm text-muted mb-4">ID: {state.selectedSessionId}</p>
        <button
          onClick={() => actions.setSelectedSessionId(null)}
          className="px-4 py-2 bg-surface border border-subtle rounded-xl text-sm"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full w-full px-4 pt-4 pb-24 md:pb-6 overflow-y-auto ${
      isDark ? "bg-base text-white" : "bg-neutral-50 text-neutral-900"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDark ? "bg-surface" : "bg-neutral-100"}`}>
            <FileText className={`w-5 h-5 ${isDark ? "text-muted" : "text-neutral-600"}`} />
          </div>
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${isDark ? "text-white" : "text-neutral-900"}`}>
              Reportes
            </h1>
            <p className={`text-xs ${isDark ? "text-neutral-500" : "text-neutral-500"}`}>
              Consolidacion e historial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <NetworkStatus />
          {activeTab === "live" && (
            <button
              onClick={handleExportLiveToExcel}
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
            isDark ? "bg-surface border-subtle text-secondary" : "bg-white border-neutral-200 text-neutral-700"
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
            isDark ? "bg-neutral-100 text-neutral-900" : "bg-surface text-white"
          }`}
        >
          <Plus className="w-4 h-4" />
          <span className="text-xs">Nueva Carga</span>
        </button>
      </div>

      {/* Tabs */}
      <div className={`p-1 rounded-xl flex items-center gap-1 border mb-4 ${
        isDark ? "bg-surface border-subtle" : "bg-neutral-100 border-neutral-200"
      }`}>
        <button
          onClick={() => {
            setActiveTab("live");
            actions.fetchLiveConsolidatedData();
          }}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === "live"
              ? isDark 
                ? "bg-elevated text-white" 
                : "bg-white text-neutral-900 shadow-sm"
              : isDark ? "text-neutral-500 hover:text-secondary" : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Consolidacion
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
            activeTab === "sessions"
              ? isDark 
                ? "bg-elevated text-white" 
                : "bg-white text-neutral-900 shadow-sm"
              : isDark ? "text-neutral-500 hover:text-secondary" : "text-neutral-500 hover:text-neutral-700"
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
            isDark ? "bg-surface border-subtle" : "bg-white border-neutral-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <WifiOff className={`w-4 h-4 ${isDark ? "text-muted" : "text-neutral-600"}`} />
            <span className={`text-xs ${isDark ? "text-secondary" : "text-neutral-700"}`}>
              {state.pendingSyncCount} registros pendientes de sync
            </span>
          </div>
          <ArrowRight className={`w-4 h-4 ${isDark ? "text-neutral-500" : "text-muted"}`} />
        </button>
      )}

      {/* Search */}
      <div className="mb-4">
        <ManagementSearchBar
          searchQuery={state.searchQuery}
          setSearchQuery={actions.setSearchQuery}
          onOpenFilters={() => {}} 
          onOpenAdd={() => actions.setIsStartModalOpen(true)}
          onClearFilters={() => actions.setSearchQuery("")}
          activeFiltersCount={0}
          placeholder={activeTab === "live" ? "Filtrar por SKU o descripcion..." : "Filtrar bultos..."}
          accentColor="gray"
          theme={isDark ? "dark" : "light"}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className={`p-3 rounded-xl border ${isDark ? "bg-surface border-subtle" : "bg-white border-neutral-200"}`}>
          <p className={`text-xs ${isDark ? "text-muted" : "text-neutral-500"}`}>SKUs</p>
          <p className={`text-xl font-bold ${isDark ? "text-primary" : "text-neutral-900"}`}>
            {liveStats.totalSKUs}
          </p>
        </div>
        <div className={`p-3 rounded-xl border ${isDark ? "bg-surface border-subtle" : "bg-white border-neutral-200"}`}>
          <p className={`text-xs ${isDark ? "text-muted" : "text-neutral-500"}`}>Unidades</p>
          <p className={`text-xl font-bold ${isDark ? "text-primary" : "text-neutral-900"}`}>
            {liveStats.totalUnits}
          </p>
        </div>
        <div className={`p-3 rounded-xl border ${isDark ? "bg-surface border-subtle" : "bg-white border-neutral-200"}`}>
          <p className={`text-xs ${isDark ? "text-muted" : "text-neutral-500"}`}>Zonas</p>
          <p className={`text-xl font-bold ${isDark ? "text-primary" : "text-neutral-900"}`}>
            {liveStats.locationsCount}
          </p>
        </div>
      </div>

      {/* Tab Content - Lista simplificada */}
      {activeTab === "live" && (
        <div className="flex-1 overflow-y-auto">
          {state.isLiveLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : filteredLiveConsolidated.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? "text-muted" : "text-neutral-500"}`}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Sin datos de consolidacion</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLiveConsolidated.slice(0, 50).map((item, index) => (
                <div
                  key={`${item.barcode}-${index}`}
                  className={`p-3 rounded-xl border ${
                    isDark ? "bg-surface border-subtle" : "bg-white border-neutral-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-primary" : "text-neutral-900"}`}>
                        {item.productName}
                      </p>
                      <p className={`text-xs font-mono ${isDark ? "text-muted" : "text-neutral-500"}`}>
                        {item.barcode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${isDark ? "text-primary" : "text-neutral-900"}`}>
                        {item.totalQuantity}
                      </p>
                      <p className={`text-[10px] ${isDark ? "text-muted" : "text-neutral-500"}`}>
                        unidades
                      </p>
                    </div>
                  </div>
                  {item.locationsList && item.locationsList !== "N/A" && (
                    <p className={`text-[10px] mt-2 ${isDark ? "text-secondary" : "text-neutral-600"}`}>
                      Zonas: {item.locationsList}
                    </p>
                  )}
                </div>
              ))}
              {filteredLiveConsolidated.length > 50 && (
                <p className={`text-center py-3 text-xs ${isDark ? "text-muted" : "text-neutral-500"}`}>
                  Mostrando 50 de {filteredLiveConsolidated.length} items
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="flex-1 overflow-y-auto">
          {state.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted" />
            </div>
          ) : !state.sessions || state.sessions.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? "text-muted" : "text-neutral-500"}`}>
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Sin sesiones registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {state.sessions.slice(0, 20).map((session: any) => (
                <button
                  key={session.id}
                  onClick={() => actions.setSelectedSessionId(session.id)}
                  className={`w-full p-3 rounded-xl border text-left transition-colors ${
                    isDark ? "bg-surface border-subtle hover:bg-elevated" : "bg-white border-neutral-200 hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={`text-sm font-medium ${isDark ? "text-primary" : "text-neutral-900"}`}>
                        {session.name || session.erpOrder || "Sesion sin nombre"}
                      </p>
                      <p className={`text-xs ${isDark ? "text-muted" : "text-neutral-500"}`}>
                        {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      session.status === "synced" 
                        ? "bg-emerald-500/20 text-emerald-400" 
                        : session.status === "pending"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-slate-500/20 text-muted"
                    }`}>
                      {session.status || "unknown"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View mode toggle for sessions */}
      {activeTab === "sessions" && state.sessions && state.sessions.length > 0 && (
        <div className="flex justify-end mb-3 mt-4">
          <div className={`flex gap-1 p-1 rounded-lg ${isDark ? "bg-surface" : "bg-neutral-100"}`}>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "list" 
                  ? isDark ? "bg-elevated text-white" : "bg-white text-neutral-900" 
                  : isDark ? "text-neutral-500 hover:text-secondary" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("kanban")}
              className={`p-2 rounded-md transition-colors ${
                viewMode === "kanban" 
                  ? isDark ? "bg-elevated text-white" : "bg-white text-neutral-900" 
                  : isDark ? "text-neutral-500 hover:text-secondary" : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
