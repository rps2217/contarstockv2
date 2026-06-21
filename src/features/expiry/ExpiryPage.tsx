/**
 * ExpiryPage - Módulo de Vencimientos v2
 * 
 * Arquitectura simplificada - Un solo hook centralizado
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  RefreshCw, 
  Trash2, 
  Search, 
  ChevronDown,
  ChevronUp,
  Plus,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores';
import { useExpiry, ExpiryRecord, ExpiryStatus } from './hooks/useExpiry';
import { ModuleHeader } from '@/shared/components/layout/ModuleHeader';
import { ExpiryItemCard } from './components/ExpiryItemCard';
import { ExpiryStatsBar } from './components/ExpiryStatsBar';
import { ExpiryDetailModal } from './components/ExpiryDetailModal';
import { ExpiryCaptureModal } from './components/ExpiryCaptureModal';

// ============================================================================
// COMPONENTE: ExpirySection
// ============================================================================
interface ExpirySectionProps {
  title: string;
  icon: React.ElementType;
  records: ExpiryRecord[];
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onViewDetail: (record: ExpiryRecord) => void;
  selectedIds: Set<string>;
  theme: 'dark' | 'light' | 'high-contrast';
  colorClass: string;
}

const ExpirySection: React.FC<ExpirySectionProps> = ({
  title,
  icon: Icon,
  records,
  isExpanded,
  onToggle,
  onDelete,
  onSelect,
  onViewDetail,
  selectedIds,
  theme,
  colorClass
}) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={`
          w-full px-4 py-3 flex items-center justify-between
          ${isDark ? 'bg-white/5' : 'bg-slate-100'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>{title}</span>
            <span className="ml-2 text-[10px] font-mono text-slate-400">
              {records.length} registros
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Section Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {records.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-xs font-bold uppercase tracking-widest">
                    No hay registros
                  </p>
                </div>
              ) : (
                records.map(record => (
                  <ExpiryItemCard
                    key={record.id}
                    record={record}
                    onDelete={onDelete}
                    onSelect={onSelect}
                    onViewDetail={onViewDetail}
                    isSelected={selectedIds.has(record.id)}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: ExpiryPage
// ============================================================================
export const ExpiryPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings?.theme as 'dark' | 'light' | 'high-contrast') || 'dark';
  const isDark = theme === 'dark';

  const {
    filteredRecords,
    stats,
    filters,
    isLoading,
    isSyncing,
    selectedIds,
    isDetailModalOpen,
    selectedRecord,
    actions
  } = useExpiry();

  const [expandedSections, setExpandedSections] = useState({
    expired: true,
    critical: true,
    withdrawal: false,
    nextExpiry: false,
    safe: false
  });

  const [showCaptureModal, setShowCaptureModal] = useState(false);

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Escape: Limpiar búsqueda
      if (e.key === 'Escape' && isInput) {
        target.blur();
        actions.setSearchQuery('');
        return;
      }

      // Alt + N: Nuevo registro
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowCaptureModal(true);
        return;
      }
      
      // Alt + C: Críticos
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        actions.setSelectedStatuses(
          filters.selectedStatuses.includes(ExpiryStatus.CRITICAL)
            ? filters.selectedStatuses.filter(s => s !== ExpiryStatus.CRITICAL)
            : [...filters.selectedStatuses, ExpiryStatus.CRITICAL]
        );
        return;
      }
      
      // Alt + V: Vencidos
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        actions.setSelectedStatuses(
          filters.selectedStatuses.includes(ExpiryStatus.EXPIRED)
            ? filters.selectedStatuses.filter(s => s !== ExpiryStatus.EXPIRED)
            : [...filters.selectedStatuses, ExpiryStatus.EXPIRED]
        );
        return;
      }
      
      // /
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filters.selectedStatuses, actions]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Eliminar este registro de vencimiento?')) {
      try {
        await actions.deleteRecord(id);
      } catch {
        toast.error('Error al eliminar');
      }
    }
  }, [actions]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`¿Eliminar ${selectedIds.size} registros?`)) {
      try {
        await actions.bulkDelete(Array.from(selectedIds));
      } catch {
        toast.error('Error al eliminar');
      }
    }
  }, [selectedIds, actions]);

  const handleViewDetail = useCallback((record: ExpiryRecord) => {
    actions.setSelectedRecord(record);
    actions.setIsDetailModalOpen(true);
  }, [actions]);

  // Agrupar registros por estado
  const expiredRecords = filteredRecords.filter(r => r.status === ExpiryStatus.EXPIRED);
  const criticalRecords = filteredRecords.filter(r => r.status === ExpiryStatus.CRITICAL);
  const withdrawalRecords = filteredRecords.filter(r => r.status === ExpiryStatus.WITHDRAWAL);
  const nextExpiryRecords = filteredRecords.filter(r => r.status === ExpiryStatus.NEXT_EXPIRY);
  const safeRecords = filteredRecords.filter(r => r.status === ExpiryStatus.SAFE);

  const totalCount = filteredRecords.length;

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <ModuleHeader
        title="Vencimientos"
        subtitle={`${totalCount} registros`}
        hideTitleOnMobile={false}
        hideBackButtonOnMobile={true}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCaptureModal(true)}
              className="w-10 h-10 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center transition-colors"
              title="Nuevo vencimiento (Alt+N)"
            >
              <Plus className="w-5 h-5 text-emerald-400" />
            </button>
            <button
              onClick={() => actions.syncRecords()}
              disabled={isSyncing}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Sincronizar"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={selectedIds.size === 0}
              className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
              title="Eliminar seleccionados"
            >
              <Trash2 className="w-5 h-5 text-red-400" />
            </button>
          </div>
        }
      />

      {/* Search & Filters */}
      <div className="px-4 py-3 space-y-3">
        <div className={`
          flex items-center gap-3 px-4 py-3 rounded-2xl border
          ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}
        `}>
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar por producto, barcode, ubicación... (presiona /)"
            value={filters.searchQuery}
            onChange={(e) => actions.setSearchQuery(e.target.value)}
            className={`
              flex-1 bg-transparent outline-none text-sm font-medium
              ${isDark ? 'placeholder:text-slate-500 text-white' : 'placeholder:text-slate-400 text-slate-900'}
            `}
          />
          {filters.searchQuery && (
            <button
              onClick={() => actions.setSearchQuery('')}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Stats Bar */}
        <ExpiryStatsBar
          stats={stats}
          selectedStatuses={filters.selectedStatuses}
          onStatusFilter={actions.setSelectedStatuses}
        />
      </div>

      {/* Selection info */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-blue-500/10 border-y border-blue-500/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-blue-400">
              {selectedIds.size} seleccionado(s)
            </p>
            <button
              onClick={actions.clearSelection}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              Limpiar selección
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <ExpirySection
              title="Vencidos"
              icon={AlertTriangle}
              records={expiredRecords}
              isExpanded={expandedSections.expired}
              onToggle={() => toggleSection('expired')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-red-500/20 text-red-400"
            />

            <ExpirySection
              title="Críticos"
              icon={ShieldAlert}
              records={criticalRecords}
              isExpanded={expandedSections.critical}
              onToggle={() => toggleSection('critical')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-amber-500/20 text-amber-400"
            />

            <ExpirySection
              title="Por Retirar"
              icon={Clock}
              records={withdrawalRecords}
              isExpanded={expandedSections.withdrawal}
              onToggle={() => toggleSection('withdrawal')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-orange-500/20 text-orange-400"
            />

            <ExpirySection
              title="Próximos"
              icon={Clock}
              records={nextExpiryRecords}
              isExpanded={expandedSections.nextExpiry}
              onToggle={() => toggleSection('nextExpiry')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-yellow-500/20 text-yellow-400"
            />

            <ExpirySection
              title="Vigentes"
              icon={CheckCircle2}
              records={safeRecords}
              isExpanded={expandedSections.safe}
              onToggle={() => toggleSection('safe')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-emerald-500/20 text-emerald-400"
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      <ExpiryDetailModal
        record={selectedRecord}
        isOpen={isDetailModalOpen}
        onClose={() => actions.setIsDetailModalOpen(false)}
        onDelete={async () => {
          if (selectedRecord) {
            if (window.confirm('¿Eliminar este registro de vencimiento?')) {
              await actions.deleteRecord(selectedRecord.id);
              actions.setIsDetailModalOpen(false);
            }
          }
        }}
        onSync={() => actions.syncRecords()}
      />

      {/* Capture Modal */}
      <ExpiryCaptureModal
        isOpen={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        onSubmit={async (data) => {
          try {
            // Crear registro usando el hook con políticas del proveedor
            await actions.createRecord({
              barcode: data.barcode,
              productName: data.productName,
              mm: data.mm,
              yyyy: data.yyyy,
              quantity: data.quantity,
              location: data.location,
              observaciones: data.observaciones,
              providerName: data.providerName,
              providerRut: data.providerRut,
              hasCanje: data.hasCanje,
              withdrawalDays: data.withdrawalDays,
            });
            toast.success('Vencimiento registrado exitosamente');
            setShowCaptureModal(false);
            actions.clearFilters();
          } catch (error) {
            toast.error('Error al registrar vencimiento');
            throw error;
          }
        }}
        theme={theme}
      />
    </div>
  );
};

export default ExpiryPage;
