/**
 * EventsPage - Módulo de Gestión de Eventos v2
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
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores';
import { useEvents, EventRecord, EventStatus } from './hooks/useEvents';
import { CreateEventModal } from './components/CreateEventModal';
import { ModulePage } from '@/shared/components/ui/design-system/ModulePage';
import { ModuleCard } from '@/shared/components/ui/design-system/ModuleCard';
import { FilterSearch } from '@/shared/components/ui/design-system/FilterSearch';
import { ActionFAB } from '@/shared/components/ui/design-system/ActionFAB';
import { EmptyState } from '@/shared/components/ui/design-system/EmptyState';
import { StatusBadge } from '@/shared/components/ui/design-system/StatusBadge';

// ============================================================================
// COMPONENTE: EventSection
// ============================================================================
interface EventSectionProps {
  title: string;
  icon: React.ElementType;
  records: EventRecord[];
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  selectedIds: Set<string>;
  isDark: boolean;
}

const EventSection: React.FC<EventSectionProps> = ({
  title,
  icon: Icon,
  records,
  isExpanded,
  onToggle,
  onDelete,
  onSelect,
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
                subtitle={record.destino || record.frc}
                meta={record.timestamp ? new Date(record.timestamp).toLocaleDateString('es-CL') : ''}
                selected={selectedIds.has(record.id)}
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
// COMPONENTE PRINCIPAL: EventsPage
// ============================================================================
const EventsPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const isDark = settings?.theme !== 'light';

  const {
    filteredEvents,
    filters,
    isLoading,
    isSyncing,
    selectedIds,
    isEditModalOpen,
    selectedEvent,
    actions
  } = useEvents();

  const [expandedSections, setExpandedSections] = useState({
    pending: true,
    destined: true,
    adjusted: false
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const filterOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'pending', label: 'Pendientes' },
    { value: 'destined', label: 'Destinados' },
    { value: 'adjusted', label: 'Ajustados' },
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
      await actions.deleteEvent(id);
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

  // Agrupar eventos por estado
  const pendingEvents = filteredEvents.filter(r => r.status === EventStatus.PENDING);
  const destinedEvents = filteredEvents.filter(r => r.status === EventStatus.DESTINED);
  const adjustedEvents = filteredEvents.filter(r => r.status === EventStatus.ADJUSTED);
  const totalCount = filteredEvents.length;

  return (
    <ModulePage
      title="Eventos"
      subtitle={`${totalCount} registros`}
      icon={<AlertCircle className={`w-5 h-5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`} />}
      isDark={isDark}
      isLoading={isLoading}
      onRefresh={actions.syncEvents}
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
          onClick={() => setShowCreateModal(true)}
          icon={<Plus className="w-5 h-5" />}
          isDark={isDark}
        />
      }
    >
      {/* Search & Filters */}
      <FilterSearch
        placeholder="Buscar eventos..."
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
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            title="Sin eventos"
            description="No hay eventos registrados aún"
            icon={<AlertCircle className="w-8 h-8" />}
            isDark={isDark}
          />
        ) : (
          <>
            <EventSection
              title="Pendientes"
              icon={Clock}
              records={pendingEvents}
              isExpanded={expandedSections.pending}
              onToggle={() => toggleSection('pending')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              selectedIds={selectedIds}
              isDark={isDark}
            />

            <EventSection
              title="Destinados"
              icon={MapPin}
              records={destinedEvents}
              isExpanded={expandedSections.destined}
              onToggle={() => toggleSection('destined')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              selectedIds={selectedIds}
              isDark={isDark}
            />

            <EventSection
              title="Ajustados"
              icon={CheckCircle2}
              records={adjustedEvents}
              isExpanded={expandedSections.adjusted}
              onToggle={() => toggleSection('adjusted')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              selectedIds={selectedIds}
              isDark={isDark}
            />
          </>
        )}
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={async (data) => {
          for (const item of data) {
            await actions.createEvent({
              barcode: item.barcode,
              productName: item.productName,
              destino: item.destino,
              traspaso: item.traspaso,
              observaciones: item.observaciones,
              frc: item.frc,
              isAdjusted: false,
              timestamp: Date.now()
            });
          }
          toast.success('Evento(s) creado(s)');
          setShowCreateModal(false);
          actions.clearFilters();
        }}
        theme={isDark ? 'dark' : 'light'}
      />
    </ModulePage>
  );
};

export default EventsPage;
