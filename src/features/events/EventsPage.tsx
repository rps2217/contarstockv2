/**
 * EventsPage - Módulo de Gestión de Eventos v2
 * 
 * Arquitectura simplificada - Siguiendo patrón ExpiryPage
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
  Clock,
  MapPin,
  CheckCircle2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/stores';
import { useEvents, EventRecord, EventStatus } from './hooks/useEvents';
import { ModuleHeader } from '@/shared/components/layout/ModuleHeader';
import { EventCard } from './components/EventCard';
import { EventStatsBar } from './components/EventStatsBar';
import { CreateEventModal } from './components/CreateEventModal';

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
  onViewDetail: (record: EventRecord) => void;
  selectedIds: Set<string>;
  theme: 'dark' | 'light' | 'high-contrast';
  colorClass: string;
}

const EventSection: React.FC<EventSectionProps> = ({
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
                  <EventCard
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
// COMPONENTE PRINCIPAL: EventsPage
// ============================================================================
export const EventsPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings?.theme as 'dark' | 'light' | 'high-contrast') || 'dark';
  const isDark = theme === 'dark';

  const {
    filteredEvents,
    stats,
    filters,
    isLoading,
    isSyncing,
    selectedIds,
    isCreateModalOpen,
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

      // Alt + N: Nuevo evento
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowCreateModal(true);
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
  }, [actions]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Eliminar este evento?')) {
      try {
        await actions.deleteEvent(id);
      } catch {
        toast.error('Error al eliminar');
      }
    }
  }, [actions]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`¿Eliminar ${selectedIds.size} eventos?`)) {
      try {
        await actions.bulkDelete(Array.from(selectedIds));
      } catch {
        toast.error('Error al eliminar');
      }
    }
  }, [selectedIds, actions]);

  const handleViewDetail = useCallback((record: EventRecord) => {
    actions.setSelectedEvent(record);
  }, [actions]);

  // Agrupar eventos por estado
  const pendingEvents = filteredEvents.filter(r => r.status === EventStatus.PENDING);
  const destinedEvents = filteredEvents.filter(r => r.status === EventStatus.DESTINED);
  const adjustedEvents = filteredEvents.filter(r => r.status === EventStatus.ADJUSTED);

  const totalCount = filteredEvents.length;

  return (
    <div className={`h-full flex flex-col overflow-hidden ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <ModuleHeader
        title="Eventos"
        subtitle={`${totalCount} registros`}
        hideTitleOnMobile={false}
        hideBackButtonOnMobile={true}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-10 h-10 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 flex items-center justify-center transition-colors"
              title="Nuevo evento (Alt+N)"
            >
              <Plus className="w-5 h-5 text-blue-400" />
            </button>
            <button
              onClick={() => actions.syncEvents()}
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
            placeholder="Buscar por producto, barcode, FRC... (presiona /)"
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
        <EventStatsBar
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
            <EventSection
              title="Pendientes"
              icon={Clock}
              records={pendingEvents}
              isExpanded={expandedSections.pending}
              onToggle={() => toggleSection('pending')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-blue-500/20 text-blue-400"
            />

            <EventSection
              title="Destinados"
              icon={MapPin}
              records={destinedEvents}
              isExpanded={expandedSections.destined}
              onToggle={() => toggleSection('destined')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
              colorClass="bg-amber-500/20 text-amber-400"
            />

            <EventSection
              title="Ajustados"
              icon={CheckCircle2}
              records={adjustedEvents}
              isExpanded={expandedSections.adjusted}
              onToggle={() => toggleSection('adjusted')}
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
        theme={theme}
      />

      {/* Edit Event Modal */}
      <CreateEventModal
        isOpen={isEditModalOpen}
        onClose={() => actions.setIsEditModalOpen(false)}
        onSubmit={async (data) => {
          if (selectedEvent && data.length > 0) {
            const item = data[0];
            try {
              await actions.updateEvent(selectedEvent.id, {
                barcode: item.barcode,
                productName: item.productName,
                destino: item.destino,
                traspaso: item.traspaso,
                observaciones: item.observaciones,
                frc: item.frc,
              });
              toast.success('Evento actualizado');
            } catch {
              toast.error('Error al actualizar');
            }
          }
        }}
        theme={theme}
        editingItem={selectedEvent ? {
          barcode: selectedEvent.barcode,
          productName: selectedEvent.productName,
          providerName: undefined,
          event: 'AJUSTE',
          quantity: 1,
          frc: selectedEvent.frc,
          nguia: '',
          destino: selectedEvent.destino,
          traspaso: selectedEvent.traspaso,
          observaciones: selectedEvent.observaciones,
        } : null}
      />
    </div>
  );
};

export default EventsPage;
