/**
 * ExpiryIndustrialLayout - Layout profesional para módulo de vencimientos
 * 
 * Diseño inspirado en software industrial con enfoque en:
 * - Visibilidad inmediata de alertas
 * - Acciones rápidas
 * - Vista compacta de datos
 */

import React, { memo, useState, useCallback } from 'react';
import { 
  ArrowLeft,
  Search,
  X,
  Plus,
  RefreshCw,
  Trash2,
  Filter,
  AlertTriangle,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Calendar,
  Package,
  Building2,
  Scan,
  FileText,
  Download,
  MoreVertical
} from 'lucide-react';
import { ExpiryRecord, ExpiryStatus } from '../hooks/useExpiry';

interface ExpiryStats {
  total: number;
  expired: number;
  critical: number;
  withdrawal: number;
  nextExpiry: number;
  safe: number;
}

interface ExpiryIndustrialLayoutProps {
  // Data
  records: ExpiryRecord[];
  filteredRecords: ExpiryRecord[];
  stats: ExpiryStats;
  
  // Selection
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  
  // Actions
  onBack: () => void;
  onNewExpiry: () => void;
  onDelete: (id: string) => void;
  onBulkDelete: () => void;
  onSync: () => void;
  onExport: () => void;
  onViewDetail: (record: ExpiryRecord) => void;
  onScan: () => void;
  
  // States
  isLoading?: boolean;
  isSyncing?: boolean;
  isFilterOpen?: boolean;
  
  // Filters
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedStatuses: ExpiryStatus[];
  onStatusFilter: (statuses: ExpiryStatus[]) => void;
}

// Status configuration
const STATUS_CONFIG: Record<ExpiryStatus, { 
  label: string; 
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  [ExpiryStatus.EXPIRED]: {
    label: 'Vencido',
    icon: AlertTriangle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30'
  },
  [ExpiryStatus.CRITICAL]: {
    label: 'Crítico',
    icon: ShieldAlert,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30'
  },
  [ExpiryStatus.WITHDRAWAL]: {
    label: 'Por Retirar',
    icon: Clock,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30'
  },
  [ExpiryStatus.NEXT_EXPIRY]: {
    label: 'Próximo',
    icon: Calendar,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30'
  },
  [ExpiryStatus.SAFE]: {
    label: 'Vigente',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30'
  }
};

// Stat badge component
const StatBadge = memo(({ 
  label, 
  count, 
  config 
}: { 
  label: string; 
  count: number; 
  config: typeof STATUS_CONFIG[ExpiryStatus];
}) => {
  const Icon = config.icon;
  const isAlert = config === STATUS_CONFIG[ExpiryStatus.EXPIRED] || 
                  config === STATUS_CONFIG[ExpiryStatus.CRITICAL];
  
  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-xl border
      ${config.bgColor} ${config.borderColor}
      ${isAlert && count > 0 ? 'animate-pulse' : ''}
    `}>
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-bold ${config.color}`}>{count}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
});

StatBadge.displayName = 'StatBadge';

// Record row component
const ExpiryRecordRow = memo(({
  record,
  isSelected,
  onSelect,
  onView,
  onDelete
}: {
  record: ExpiryRecord;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onDelete: () => void;
}) => {
  const config = STATUS_CONFIG[record.status];
  const Icon = config.icon;
  const daysLeft = record.daysLeft;
  const isExpired = daysLeft < 0;
  const daysText = isExpired 
    ? `Hace ${Math.abs(daysLeft)} días`
    : daysLeft === 0 
      ? 'Hoy'
      : `${daysLeft} días`;

  return (
    <div 
      className={`
        flex items-center gap-4 px-4 py-3 cursor-pointer transition-all
        border-b border-slate-800/50
        ${isSelected 
          ? 'bg-blue-500/10 border-l-4 border-l-blue-400' 
          : 'hover:bg-slate-800/50 border-l-4 border-l-transparent'
        }
      `}
      onClick={onSelect}
    >
      {/* Status */}
      <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white truncate">{record.productName}</span>
          {record.hasCanje && (
            <span className="px-1.5 py-0.5 bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded">
              CANJE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] font-mono text-slate-500">{record.barcode}</span>
          <span className="text-[10px] text-slate-600">•</span>
          <span className="text-[10px] text-slate-500">{record.location}</span>
        </div>
      </div>

      {/* Provider */}
      <div className="hidden md:flex flex-col items-end">
        <span className="text-xs text-slate-400">{record.providerName}</span>
        <span className="text-[10px] text-slate-600">{record.quantity} uds</span>
      </div>

      {/* Days */}
      <div className="flex flex-col items-end min-w-[80px]">
        <span className={`text-sm font-bold ${config.color}`}>{daysText}</span>
        <span className="text-[10px] text-slate-500">
          {record.mm.toString().padStart(2, '0')}/{record.yyyy}
        </span>
      </div>

      {/* Actions */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
      >
        <Trash2 className="w-4 h-4 text-red-400" />
      </button>
    </div>
  );
});

ExpiryRecordRow.displayName = 'ExpiryRecordRow';

export const ExpiryIndustrialLayout: React.FC<ExpiryIndustrialLayoutProps> = memo(({
  records,
  filteredRecords,
  stats,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onClearSelection,
  onBack,
  onNewExpiry,
  onDelete,
  onBulkDelete,
  onSync,
  onExport,
  onViewDetail,
  onScan,
  isLoading,
  isSyncing,
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusFilter
}) => {
  const [showFilters, setShowFilters] = useState(true);
  
  // Group records by status for sections
  const recordsByStatus = {
    [ExpiryStatus.EXPIRED]: filteredRecords.filter(r => r.status === ExpiryStatus.EXPIRED),
    [ExpiryStatus.CRITICAL]: filteredRecords.filter(r => r.status === ExpiryStatus.CRITICAL),
    [ExpiryStatus.WITHDRAWAL]: filteredRecords.filter(r => r.status === ExpiryStatus.WITHDRAWAL),
    [ExpiryStatus.NEXT_EXPIRY]: filteredRecords.filter(r => r.status === ExpiryStatus.NEXT_EXPIRY),
    [ExpiryStatus.SAFE]: filteredRecords.filter(r => r.status === ExpiryStatus.SAFE),
  };

  const handleStatusToggle = (status: ExpiryStatus) => {
    if (selectedStatuses.includes(status)) {
      onStatusFilter(selectedStatuses.filter(s => s !== status));
    } else {
      onStatusFilter([...selectedStatuses, status]);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-950 font-sans overflow-hidden">
      
      {/* ==================== HEADER ==================== */}
      <header className="h-14 px-4 flex items-center justify-between shrink-0 bg-slate-900 border-b border-slate-800">
        
        {/* LEFT: Back + Title */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-slate-400" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center border border-red-500/20">
              <Calendar className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">VENCIMIENTOS</h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase">Control de Caducidades</p>
            </div>
          </div>
        </div>

        {/* CENTER: Stats */}
        <div className="hidden lg:flex items-center gap-2">
          <StatBadge label="Vencidos" count={stats.expired} config={STATUS_CONFIG[ExpiryStatus.EXPIRED]} />
          <StatBadge label="Críticos" count={stats.critical} config={STATUS_CONFIG[ExpiryStatus.CRITICAL]} />
          <StatBadge label="Por Vencer" count={stats.withdrawal + stats.nextExpiry} config={STATUS_CONFIG[ExpiryStatus.WITHDRAWAL]} />
          <StatBadge label="Vigentes" count={stats.safe} config={STATUS_CONFIG[ExpiryStatus.SAFE]} />
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2">
          {/* Scan */}
          <button
            onClick={onScan}
            className="w-10 h-10 flex items-center justify-center bg-blue-500/10 hover:bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400 transition-all"
            title="Escanear producto (Alt+S)"
          >
            <Scan className="w-5 h-5" />
          </button>
          
          {/* Export */}
          <button
            onClick={onExport}
            disabled={records.length === 0}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all disabled:opacity-50"
            title="Exportar reporte"
          >
            <FileText className="w-5 h-5 text-slate-400" />
          </button>

          {/* Sync */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-all disabled:opacity-50"
            title="Sincronizar"
          >
            <RefreshCw className={`w-5 h-5 text-slate-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Delete */}
          <button
            onClick={onBulkDelete}
            disabled={selectedIds.size === 0}
            className="w-10 h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/30 transition-all disabled:opacity-50"
            title="Eliminar seleccionados"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>

          {/* New */}
          <button
            onClick={onNewExpiry}
            className="px-4 h-10 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 rounded-xl transition-all"
          >
            <Plus className="w-5 h-5 text-black" />
            <span className="text-sm font-bold text-black">Nuevo</span>
          </button>
        </div>
      </header>

      {/* ==================== STATS MOBILE ==================== */}
      <div className="lg:hidden px-4 py-2 bg-slate-900/50 border-b border-slate-800 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <StatBadge label="Vencidos" count={stats.expired} config={STATUS_CONFIG[ExpiryStatus.EXPIRED]} />
          <StatBadge label="Críticos" count={stats.critical} config={STATUS_CONFIG[ExpiryStatus.CRITICAL]} />
          <StatBadge label="Vigentes" count={stats.safe} config={STATUS_CONFIG[ExpiryStatus.SAFE]} />
        </div>
      </div>

      {/* ==================== SEARCH & FILTERS ==================== */}
      <div className="px-4 py-3 bg-slate-900/30 border-b border-slate-800">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por producto, barcode, ubicación..."
              className="w-full h-11 pl-11 pr-4 bg-slate-800 rounded-xl border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              w-10 h-10 flex items-center justify-center rounded-xl border transition-all
              ${showFilters 
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              }
            `}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="flex items-center gap-2 mt-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => {
              const isActive = selectedStatuses.length === 0 || selectedStatuses.includes(status as ExpiryStatus);
              const Icon = config.icon;
              return (
                <button
                  key={status}
                  onClick={() => handleStatusToggle(status as ExpiryStatus)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${isActive 
                      ? `${config.bgColor} ${config.borderColor} ${config.color}` 
                      : 'bg-slate-800 border-slate-700 text-slate-500'
                    }
                  `}
                >
                  <Icon className="w-3 h-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ==================== SELECTION INFO ==================== */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-blue-500/10 border-y border-blue-500/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-400">
              {selectedIds.size} seleccionado(s)
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onSelectAll}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Seleccionar todo
              </button>
              <button
                onClick={onClearSelection}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== CONTENT ==================== */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
              <Calendar className="w-10 h-10 text-slate-600" />
            </div>
            <p className="text-sm font-bold text-slate-400 mb-1">
              {searchQuery ? 'Sin resultados' : 'Sin vencimientos registrados'}
            </p>
            <p className="text-xs text-slate-500">
              {searchQuery ? 'Intenta con otro término' : 'Presiona + para registrar uno nuevo'}
            </p>
          </div>
        ) : (
          <div>
            {/* Expired & Critical first */}
            {(recordsByStatus[ExpiryStatus.EXPIRED].length > 0 || recordsByStatus[ExpiryStatus.CRITICAL].length > 0) && (
              <div className="bg-red-500/5 border-b border-red-500/10">
                {recordsByStatus[ExpiryStatus.EXPIRED].length > 0 && (
                  recordsByStatus[ExpiryStatus.EXPIRED].map(record => (
                    <ExpiryRecordRow
                      key={record.id}
                      record={record}
                      isSelected={selectedIds.has(record.id)}
                      onSelect={() => onToggleSelection(record.id)}
                      onView={() => onViewDetail(record)}
                      onDelete={() => onDelete(record.id)}
                    />
                  ))
                )}
                {recordsByStatus[ExpiryStatus.CRITICAL].map(record => (
                  <ExpiryRecordRow
                    key={record.id}
                    record={record}
                    isSelected={selectedIds.has(record.id)}
                    onSelect={() => onToggleSelection(record.id)}
                    onView={() => onViewDetail(record)}
                    onDelete={() => onDelete(record.id)}
                  />
                ))}
              </div>
            )}

            {/* Other statuses */}
            {recordsByStatus[ExpiryStatus.WITHDRAWAL].map(record => (
              <ExpiryRecordRow
                key={record.id}
                record={record}
                isSelected={selectedIds.has(record.id)}
                onSelect={() => onToggleSelection(record.id)}
                onView={() => onViewDetail(record)}
                onDelete={() => onDelete(record.id)}
              />
            ))}
            {recordsByStatus[ExpiryStatus.NEXT_EXPIRY].map(record => (
              <ExpiryRecordRow
                key={record.id}
                record={record}
                isSelected={selectedIds.has(record.id)}
                onSelect={() => onToggleSelection(record.id)}
                onView={() => onViewDetail(record)}
                onDelete={() => onDelete(record.id)}
              />
            ))}
            {recordsByStatus[ExpiryStatus.SAFE].map(record => (
              <ExpiryRecordRow
                key={record.id}
                record={record}
                isSelected={selectedIds.has(record.id)}
                onSelect={() => onToggleSelection(record.id)}
                onView={() => onViewDetail(record)}
                onDelete={() => onDelete(record.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ==================== FOOTER ==================== */}
      <footer className="h-14 px-4 flex items-center justify-between shrink-0 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">
            <span className="font-bold text-white">{filteredRecords.length}</span> de {records.length} registros
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Alt+S: Escanear</span>
          <span>•</span>
          <span>+/Ctrl+A: Seleccionar todo</span>
        </div>
      </footer>
    </div>
  );
});

ExpiryIndustrialLayout.displayName = 'ExpiryIndustrialLayout';
