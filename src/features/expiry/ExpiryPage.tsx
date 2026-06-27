/**
 * ExpiryPage - Módulo de Vencimientos v2
 * 
 * Diseño monocromático de grises, estructura unificada.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  RefreshCw, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  Plus,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores';
import { useExpiry, ExpiryRecord, ExpiryStatus } from './hooks/useExpiry';
import { ExpiryDetailModal } from './components/ExpiryDetailModal';
import { ExpiryCaptureModal } from './components/ExpiryCaptureModal';
import { ModulePage } from '@/shared/components/ui/design-system/ModulePage';
import { ModuleCard } from '@/shared/components/ui/design-system/ModuleCard';
import { FilterSearch } from '@/shared/components/ui/design-system/FilterSearch';
import { ActionFAB } from '@/shared/components/ui/design-system/ActionFAB';
import { EmptyState } from '@/shared/components/ui/design-system/EmptyState';
import { StatusBadge } from '@/shared/components/ui/design-system/StatusBadge';

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
  isDark: boolean;
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
  isDark,
}) => {
  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={`
          w-full px-4 py-3 flex items-center justify-between
          ${isDark ? 'bg-neutral-900' : 'bg-neutral-100'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}>
            <Icon className={`w-4 h-4 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`} />
          </div>
          <div className="text-left">
            <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
              {title}
            </span>
            <span className={`ml-2 text-[10px] font-mono ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
              {records.length} registros
            </span>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className={`w-4 h-4 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
        )}
      </button>

      {/* Section Content */}
      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0 }}
        className="overflow-hidden"
      >
        <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
          {records.length === 0 ? (
            <p className={`text-center py-4 text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
              Sin registros
            </p>
          ) : (
            records.map(record => (
              <ModuleCard
                key={record.id}
                id={record.id}
                title={record.productName || record.barcode}
                subtitle={record.location || ''}
                meta={`${record.mm}/${record.yyyy} • ${record.quantity} unidades`}
                selected={selectedIds.has(record.id)}
                onClick={() => onViewDetail(record)}
                onSelect={onSelect}
                showCheckbox
                isDark={isDark}
                children={
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(record.id); }}
                    className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-neutral-700' : 'hover:bg-neutral-100'}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-neutral-500" />
                  </button>
                }
              />
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL: ExpiryPage
// ============================================================================
const ExpiryPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const isDark = settings?.theme !== 'light';

  const {
    filteredRecords,
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
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const filterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'expired', label: 'Vencidos' },
    { value: 'critical', label: 'Críticos' },
    { value: 'next', label: 'Próximos' },
    { value: 'safe', label: 'Vigentes' },
  ];

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      if (e.key === 'Escape' && isInput) {
        target.blur();
        actions.setSearchQuery('');
      }
      
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleDelete = useCallback(async (id: string) => {
    try {
      await actions.deleteRecord(id);
    } catch {
      toast.error('Error al eliminar');
    }
  }, [actions]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    try {
      await actions.bulkDelete(Array.from(selectedIds));
    } catch {
      toast.error('Error al eliminar');
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
    <ModulePage
      title="Vencimientos"
      subtitle={`${totalCount} registros`}
      icon={<Calendar className={`w-5 h-5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`} />}
      isDark={isDark}
      isLoading={isLoading}
      onRefresh={actions.syncRecords}
      actions={
        <>
          <button
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
            className={`p-2.5 rounded-xl transition-colors ${isDark ? 'bg-neutral-900 text-neutral-400 hover:text-neutral-200' : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'} disabled:opacity-30`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </>
      }
      fab={
        <ActionFAB
          onClick={() => setShowCaptureModal(true)}
          icon={<Plus className="w-5 h-5" />}
          isDark={isDark}
        />
      }
    >
      {/* Search & Filters */}
      <FilterSearch
        placeholder="Buscar vencimientos..."
        value={filters.searchQuery}
        onChange={actions.setSearchQuery}
        filters={filterOptions}
        selectedFilter="all"
        onFilterChange={() => {}}
        isDark={isDark}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      />

      {/* Selection info */}
      {selectedIds.size > 0 && (
        <div className={`mt-3 p-3 rounded-xl ${isDark ? 'bg-neutral-900 border border-neutral-800' : 'bg-neutral-100 border border-neutral-200'}`}>
          <div className="flex items-center justify-between">
            <p className={`text-xs font-medium ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
              {selectedIds.size} seleccionado(s)
            </p>
            <button
              onClick={actions.clearSelection}
              className={`text-xs ${isDark ? 'text-neutral-500 hover:text-neutral-300' : 'text-neutral-500 hover:text-neutral-700'}`}
            >
              Limpiar
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className={`w-6 h-6 animate-spin ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`} />
          </div>
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            title="Sin vencimientos"
            description="No hay vencimientos registrados aún"
            icon={<Calendar className="w-8 h-8" />}
            isDark={isDark}
          />
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
              isDark={isDark}
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
              isDark={isDark}
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
              isDark={isDark}
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
              isDark={isDark}
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
              isDark={isDark}
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
            await actions.deleteRecord(selectedRecord.id);
            actions.setIsDetailModalOpen(false);
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
            toast.success('Vencimiento registrado');
            setShowCaptureModal(false);
            actions.clearFilters();
          } catch (error) {
            toast.error('Error al registrar');
            throw error;
          }
        }}
        theme={isDark ? 'dark' : 'light'}
      />
    </ModulePage>
  );
};

export default ExpiryPage;
