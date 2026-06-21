/**
 * EventsPage - Módulo de Gestión de Eventos
 * 
 * Arquitectura simplificada v2.0
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/stores';
import { 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Truck,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { useEvents, EventRecord } from './hooks/useEvents';
import { ModuleHeader } from '@/shared/components/layout/ModuleHeader';
import { EventDetailModal } from './components/EventDetailModal';

// ============================================================================
// COMPONENTE: EventItemCard
// ============================================================================
interface EventItemCardProps {
  event: EventRecord;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onViewDetail: (event: EventRecord) => void;
  isSelected: boolean;
}

const EventItemCard: React.FC<EventItemCardProps> = ({
  event,
  onDelete,
  onSelect,
  onViewDetail,
  isSelected
}) => {
  const isAdjusted = event.isAdjusted;
  const isDestined = !!event.destino;
  const isPending = !isAdjusted && !isDestined;

  const statusColor = isAdjusted ? 'bg-emerald-500' : 
                      isDestined ? 'bg-amber-500' : 'bg-slate-500';
  
  const statusLabel = isAdjusted ? 'Ajustado' : 
                      isDestined ? 'Destinado' : 'Pendiente';

  return (
    <div 
      className={`
        relative p-4 rounded-2xl border transition-all cursor-pointer
        ${isSelected 
          ? 'bg-blue-500/10 border-blue-500/30' 
          : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
        }
      `}
      onClick={() => onSelect(event.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {statusLabel}
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-500">
          {format(new Date(event.timestamp), 'HH:mm')}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-1">
        <p className="text-sm font-black uppercase tracking-tight">
          {event.productName || 'Sin producto'}
        </p>
        <p className="text-xs font-mono text-slate-400">
          {event.barcode}
        </p>
        
        {event.frc && (
          <p className="text-[10px] font-mono text-amber-400">
            FRC: {event.frc}
          </p>
        )}
        
        {event.destino && (
          <p className="text-[10px] font-bold text-blue-400">
            {event.destino}
            {event.traspaso && ` (${event.traspaso})`}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
        <button
          onClick={(e) => { e.stopPropagation(); onViewDetail(event); }}
          className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
        >
          Ver Detalle
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
          className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENTE: EventSection
// ============================================================================
interface EventSectionProps {
  title: string;
  icon: React.ElementType;
  events: EventRecord[];
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onViewDetail: (event: EventRecord) => void;
  selectedIds: Set<string>;
  theme: 'dark' | 'light' | 'high-contrast';
}

const EventSection: React.FC<EventSectionProps> = ({
  title,
  icon: Icon,
  events,
  isExpanded,
  onToggle,
  onDelete,
  onSelect,
  onViewDetail,
  selectedIds,
  theme
}) => {
  const isDark = theme === 'dark';
  
  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      {/* Section Header */}
      <button
        onClick={onToggle}
        className={`
          w-full px-4 py-3 flex items-center justify-between
          ${isDark ? 'bg-white/5' : 'bg-slate-100'}
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-black uppercase tracking-wider">{title}</span>
            <span className="ml-2 text-[10px] font-mono text-slate-400">
              {events.length} registros
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
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {events.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p className="text-xs font-bold uppercase tracking-widest">
                    No hay registros
                  </p>
                </div>
              ) : (
                events.map(evt => (
                  <EventItemCard
                    key={evt.id}
                    event={evt}
                    onDelete={onDelete}
                    onSelect={onSelect}
                    onViewDetail={onViewDetail}
                    isSelected={selectedIds.has(evt.id)}
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
  const theme = (settings.theme as 'dark' | 'light' | 'high-contrast') || 'dark';
  const isDark = theme === 'dark';

  const {
    pendingEvents,
    destinedEvents,
    adjustedEvents,
    filters,
    isLoading,
    isSyncing,
    selectedIds,
    isDetailModalOpen,
    selectedEvent,
    actions
  } = useEvents();

  const [expandedSections, setExpandedSections] = useState({
    pending: true,
    destined: true,
    adjusted: false
  });

  const toggleSection = (section: 'pending' | 'destined' | 'adjusted') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Eliminar este evento?')) {
      try {
        await actions.deleteEvent(id);
      } catch {
        toast.error('Error al eliminar');
      }
    }
  }, [actions]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`Eliminar ${selectedIds.size} eventos?`)) {
      try {
        await actions.bulkDelete(Array.from(selectedIds));
      } catch {
        toast.error('Error al eliminar');
      }
    }
  }, [selectedIds, actions]);

  const handleViewDetail = useCallback((event: EventRecord) => {
    actions.setSelectedEvent(event);
    actions.setIsDetailModalOpen(true);
  }, [actions]);

  const totalCount = pendingEvents.length + destinedEvents.length + adjustedEvents.length;

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
            placeholder="Buscar por producto, barcode, destino..."
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
              x
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {[
            { label: 'Todos', key: [] },
            { label: 'Pendientes', key: ['pending'] },
            { label: 'Destinados', key: ['destined'] },
            { label: 'Ajustados', key: ['adjusted'] },
          ].map(filter => (
            <button
              key={filter.label}
              onClick={() => actions.setSelectedEvents(filter.key)}
              className={`
                px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-colors
                ${filters.selectedEvents.length === 0 && filter.key.length === 0
                  ? 'bg-amber-500 text-black'
                  : isDark 
                    ? 'bg-white/5 text-slate-400 hover:bg-white/10' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selection info */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-blue-500/10 border-y border-blue-500/20">
          <p className="text-xs font-bold text-blue-400">
            {selectedIds.size} seleccionado(s)
          </p>
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
              title="En Espera"
              icon={AlertCircle}
              events={pendingEvents}
              isExpanded={expandedSections.pending}
              onToggle={() => toggleSection('pending')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
            />

            <EventSection
              title="Destinados"
              icon={Truck}
              events={destinedEvents}
              isExpanded={expandedSections.destined}
              onToggle={() => toggleSection('destined')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
            />

            <EventSection
              title="Ajustados"
              icon={CheckCircle2}
              events={adjustedEvents}
              isExpanded={expandedSections.adjusted}
              onToggle={() => toggleSection('adjusted')}
              onDelete={handleDelete}
              onSelect={actions.toggleSelection}
              onViewDetail={handleViewDetail}
              selectedIds={selectedIds}
              theme={theme}
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={() => actions.setIsDetailModalOpen(false)}
      />
    </div>
  );
};

export default EventsPage;
