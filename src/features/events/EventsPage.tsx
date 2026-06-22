/**
 * EventsPage - Módulo de Gestión de Eventos
 * 
 * Diseño Material Design 3 / AppSheet
 * - Tipografía: Inter (font-sans)
 * - Espaciado: 8dp grid
 * - Border radius: 8-12px
 * - Sombras sutiles
 * - Lista densa con dividers
 * - FAB para acción principal
 * - Menú de 3 puntos
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/stores';
import { 
  RefreshCw, 
  Plus,
  MoreVertical,
  Search,
  X,
  Edit2,
  Trash2,
  Eye,
  Package,
  MapPin,
  FileText,
  Clock,
  ChevronLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { useEvents, EventRecord } from './hooks/useEvents';
import { CreateEventModal } from './components/CreateEventModal';

// ============================================================================
// UTILIDADES
// ============================================================================
const cn = (...classes: (string | undefined | false)[]) => 
  classes.filter(Boolean).join(' ');

// ============================================================================
// APPBAR - Top App Bar estilo Material Design
// ============================================================================
interface AppBarProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  search?: React.ReactNode;
}

const AppBar: React.FC<AppBarProps> = ({ 
  title, 
  subtitle, 
  showBack, 
  onBack, 
  actions,
  search 
}) => (
  <div className="bg-[var(--appsheet-bg-surface)] border-b border-[var(--appsheet-border-subtle)]">
    <div className="flex items-center h-14 px-4 gap-3">
      {showBack && onBack && (
        <button 
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-[var(--appsheet-bg-hover)] active:bg-[var(--appsheet-bg-active)] transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-semibold truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-[var(--appsheet-text-tertiary)]">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
    {search}
  </div>
);

// ============================================================================
// SEARCH BAR - Barra de búsqueda Material Design
// ============================================================================
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => (
  <div className="px-4 pb-3">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--appsheet-text-tertiary)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-10 rounded-lg bg-[var(--appsheet-bg-elevated)] border border-[var(--appsheet-border-subtle)] text-sm placeholder:text-[var(--appsheet-text-tertiary)] focus:outline-none focus:border-[var(--appsheet-primary-primary)] transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--appsheet-bg-hover)]"
        >
          <X className="w-4 h-4 text-[var(--appsheet-text-tertiary)]" />
        </button>
      )}
    </div>
  </div>
);

// ============================================================================
// FILTER CHIPS - Pills de filtro estilo MD3
// ============================================================================
interface FilterChipsProps {
  filters: Array<{ label: string; key: string[] }>;
  selected: string[];
  onChange: (key: string[]) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ filters, selected, onChange }) => (
  <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
    {filters.map(filter => {
      const isActive = (selected.length === 0 && filter.key.length === 0) ||
                       JSON.stringify(selected) === JSON.stringify(filter.key);
      return (
        <button
          key={filter.label}
          onClick={() => onChange(filter.key)}
          className={cn(
            'h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all',
            isActive
              ? 'bg-[var(--appsheet-primary-primary)] text-white'
              : 'bg-[var(--appsheet-bg-elevated)] text-[var(--appsheet-text-secondary)] hover:bg-[var(--appsheet-bg-hover)]'
          )}
        >
          {filter.label}
        </button>
      );
    })}
  </div>
);

// ============================================================================
// ACTION MENU - Menú de 3 puntos
// ============================================================================
interface ActionMenuProps {
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
  }>;
}

const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-full hover:bg-[var(--appsheet-bg-hover)] active:bg-[var(--appsheet-bg-active)]"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, originY: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-2 top-full mt-1 w-52 bg-[var(--appsheet-bg-card)] border border-[var(--appsheet-border-default)] rounded-xl shadow-lg overflow-hidden z-50"
          >
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); action.onClick(); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors',
                  action.danger
                    ? 'text-[var(--appsheet-error)] hover:bg-[var(--appsheet-error-subtle)]'
                    : 'text-[var(--appsheet-text-primary)] hover:bg-[var(--appsheet-bg-hover)]'
                )}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// LIST ITEM - Item de lista denso estilo MD3
// ============================================================================
interface ListItemProps {
  title: string;
  subtitle?: string;
  status?: { label: string; variant: 'success' | 'warning' | 'error' | 'info' };
  meta?: Array<{ label: string; value: string }>;
  onClick?: () => void;
  actions?: ActionMenuProps['actions'];
}

const ListItem: React.FC<ListItemProps> = ({ title, subtitle, status, meta, onClick, actions }) => {
  const statusBg = {
    success: 'bg-[var(--appsheet-success)]',
    warning: 'bg-[var(--appsheet-warning)]',
    error: 'bg-[var(--appsheet-error)]',
    info: 'bg-[var(--appsheet-info)]'
  };

  const statusBadge = {
    success: 'bg-[var(--appsheet-success-subtle)] text-[var(--appsheet-success)]',
    warning: 'bg-[var(--appsheet-warning-subtle)] text-[var(--appsheet-warning)]',
    error: 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)]',
    info: 'bg-[var(--appsheet-info-subtle)] text-[var(--appsheet-info)]'
  };

  return (
    <div 
      onClick={onClick}
      className="bg-[var(--appsheet-bg-surface)] border-b border-[var(--appsheet-border-subtle)] last:border-b-0"
    >
      <div className="flex items-center min-h-[72px] px-4 py-3">
        {/* Status dot */}
        <div className={cn('w-2 h-2 rounded-full shrink-0 mr-3', status ? statusBg[status.variant] : 'bg-[var(--appsheet-text-disabled)]')} />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{title}</p>
            {status && (
              <span className={cn('px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0', statusBadge[status.variant])}>
                {status.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--appsheet-text-tertiary)] truncate">{subtitle}</p>
          )}
          {meta && meta.length > 0 && (
            <div className="flex gap-4 mt-1">
              {meta.slice(0, 3).map((m, i) => (
                <span key={i} className="text-[11px] text-[var(--appsheet-text-disabled)]">
                  <span className="uppercase font-medium">{m.label}:</span> {m.value}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {actions && <ActionMenu actions={actions} />}
      </div>
    </div>
  );
};

// ============================================================================
// DETAIL VIEW - Vista de detalle (slide-in desde la derecha)
// ============================================================================
interface DetailViewProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  status?: { label: string; variant: 'success' | 'warning' | 'error' | 'info' };
  sections: Array<{
    title?: string;
    icon?: React.ReactNode;
    rows: Array<{ label: string; value: string }>;
  }>;
  onClose: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'danger';
  }>;
}

const DetailView: React.FC<DetailViewProps> = ({ title, subtitle, icon, status, sections, onClose, actions }) => {
  const statusBadge = {
    success: 'bg-[var(--appsheet-success-subtle)] text-[var(--appsheet-success)] border-[var(--appsheet-success)]',
    warning: 'bg-[var(--appsheet-warning-subtle)] text-[var(--appsheet-warning)] border-[var(--appsheet-warning)]',
    error: 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)] border-[var(--appsheet-error)]',
    info: 'bg-[var(--appsheet-info-subtle)] text-[var(--appsheet-info)] border-[var(--appsheet-info)]'
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-[var(--appsheet-bg-base)] flex flex-col"
    >
      {/* AppBar */}
      <div className="bg-[var(--appsheet-bg-surface)] border-b border-[var(--appsheet-border-subtle)]">
        <div className="flex items-center h-14 px-4 gap-3">
          <button 
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-[var(--appsheet-bg-hover)]"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold flex items-center gap-2">
              {icon}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && (
              <p className="text-xs text-[var(--appsheet-text-tertiary)]">{subtitle}</p>
            )}
          </div>
          {status && (
            <span className={cn('px-3 py-1 text-xs font-semibold rounded-full border', statusBadge[status.variant])}>
              {status.label}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={i} className="bg-[var(--appsheet-bg-surface)] border-b border-[var(--appsheet-border-subtle)]">
            {section.title && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--appsheet-bg-elevated)]">
                {section.icon && <span className="text-[var(--appsheet-primary-primary)]">{section.icon}</span>}
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--appsheet-text-secondary)]">
                  {section.title}
                </span>
              </div>
            )}
            {section.rows.map((row, j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-[11px] text-[var(--appsheet-text-tertiary)] uppercase tracking-wider">{row.label}</p>
                  <p className="text-sm font-medium">{row.value}</p>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="p-4 bg-[var(--appsheet-bg-surface)] border-t border-[var(--appsheet-border-subtle)] flex gap-3">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={cn(
                'flex-1 h-11 rounded-lg text-sm font-semibold transition-colors',
                action.variant === 'primary'
                  ? 'bg-[var(--appsheet-primary-primary)] text-white hover:opacity-90'
                  : action.variant === 'danger'
                  ? 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)] hover:bg-[var(--appsheet-error)] hover:text-white'
                  : 'bg-[var(--appsheet-bg-elevated)] hover:bg-[var(--appsheet-bg-hover)]'
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// EMPTY STATE - Estado vacío
// ============================================================================
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center flex-1 py-16 px-8 text-center">
    {icon && <div className="text-[var(--appsheet-text-disabled)] mb-4">{icon}</div>}
    <p className="text-sm font-medium text-[var(--appsheet-text-secondary)]">{title}</p>
    {description && <p className="text-xs text-[var(--appsheet-text-tertiary)] mt-1">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 h-10 px-5 rounded-full bg-[var(--appsheet-primary-primary)] text-white text-sm font-medium"
      >
        {action.label}
      </button>
    )}
  </div>
);

// ============================================================================
// FAB - Floating Action Button
// ============================================================================
interface FABProps {
  onClick: () => void;
  icon?: React.ReactNode;
}

const FAB: React.FC<FABProps> = ({ onClick, icon }) => (
  <motion.button
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    onClick={onClick}
    className="fixed right-4 bottom-4 w-14 h-14 rounded-2xl bg-[var(--appsheet-primary-primary)] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
    style={{ boxShadow: '0 4px 12px rgba(129, 140, 248, 0.4)' }}
  >
    {icon || <Plus className="w-6 h-6" />}
  </motion.button>
);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export const EventsPage: React.FC = () => {
  const settings = useAppStore(state => state.settings);
  const theme = (settings.theme as 'dark' | 'light' | 'high-contrast') || 'dark';

  const {
    filteredEvents,
    filters,
    isLoading,
    isSyncing,
    isCreateModalOpen,
    isEditModalOpen,
    selectedEvent,
    actions
  } = useEvents();

  const [detailEvent, setDetailEvent] = useState<EventRecord | null>(null);

  const handleViewDetail = useCallback((event: EventRecord) => setDetailEvent(event), []);
  const handleCloseDetail = useCallback(() => setDetailEvent(null), []);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('¿Eliminar este evento?')) {
      try {
        await actions.deleteEvent(id);
        if (detailEvent?.id === id) setDetailEvent(null);
      } catch {
        toast.error('Error al eliminar');
      }
    }
  }, [actions, detailEvent]);

  const handleEdit = useCallback((event: EventRecord) => {
    actions.setSelectedEvent(event);
    actions.setIsEditModalOpen(true);
  }, [actions]);

  const getStatus = (event: EventRecord) => {
    if (event.isAdjusted) return { label: 'Ajustado', variant: 'success' as const };
    if (event.destino) return { label: 'Destinado', variant: 'warning' as const };
    return { label: 'Pendiente', variant: 'info' as const };
  };

  const formatDate = (ts: number) => format(new Date(ts), 'dd MMM yyyy, HH:mm');

  return (
    <div className="h-full flex flex-col bg-[var(--appsheet-bg-base)] appsheet-dark">
      {/* AppBar */}
      <AppBar
        title="Eventos"
        subtitle={`${filteredEvents.length} registros`}
        actions={
          <button
            onClick={() => actions.syncEvents()}
            disabled={isSyncing}
            className="p-2 rounded-full hover:bg-[var(--appsheet-bg-hover)] disabled:opacity-50"
          >
            <RefreshCw className={cn('w-5 h-5', isSyncing && 'animate-spin')} />
          </button>
        }
        search={
          <SearchBar
            value={filters.searchQuery}
            onChange={actions.setSearchQuery}
            placeholder="Buscar por producto, barcode, FRC..."
          />
        }
      />

      {/* Filters */}
      <FilterChips
        filters={[
          { label: 'Todos', key: [] },
          { label: 'Pendientes', key: ['pending'] },
          { label: 'Destinados', key: ['destined'] },
          { label: 'Ajustados', key: ['adjusted'] },
        ]}
        selected={filters.selectedEvents}
        onChange={actions.setSelectedEvents}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-[var(--appsheet-text-tertiary)]" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyState
            icon={<Package className="w-16 h-16" />}
            title="No hay eventos"
            description="Crea un nuevo evento para comenzar"
            action={{ label: '+ Crear Evento', onClick: () => actions.setIsCreateModalOpen(true) }}
          />
        ) : (
          filteredEvents.map(event => (
            <ListItem
              key={event.id}
              title={event.productName || 'Sin producto'}
              subtitle={event.barcode}
              status={getStatus(event)}
              meta={[
                { label: 'FRC', value: event.frc || 'N/A' },
                { label: 'Destino', value: event.destino || 'N/A' },
                { label: 'Fecha', value: formatDate(event.timestamp) }
              ]}
              onClick={() => handleViewDetail(event)}
              actions={[
                { label: 'Ver detalle', icon: <Eye className="w-4 h-4" />, onClick: () => handleViewDetail(event) },
                { label: 'Editar', icon: <Edit2 className="w-4 h-4" />, onClick: () => handleEdit(event) },
                { label: 'Eliminar', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(event.id), danger: true }
              ]}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <FAB onClick={() => actions.setIsCreateModalOpen(true)} />

      {/* Detail View */}
      <AnimatePresence>
        {detailEvent && (
          <DetailView
            title={detailEvent.productName || 'Evento'}
            subtitle={detailEvent.barcode}
            icon={<Package className="w-5 h-5" />}
            status={getStatus(detailEvent)}
            sections={[
              {
                title: 'Producto',
                icon: <Package className="w-4 h-4" />,
                rows: [
                  { label: 'Nombre', value: detailEvent.productName || 'N/A' },
                  { label: 'Barcode', value: detailEvent.barcode },
                  { label: 'Cantidad', value: '1 unidad' }
                ]
              },
              {
                title: 'Documento',
                icon: <FileText className="w-4 h-4" />,
                rows: [
                  { label: 'FRC', value: detailEvent.frc || 'Sin FRC' },
                  { label: 'Traspaso', value: detailEvent.traspaso || 'N/A' }
                ]
              },
              {
                title: 'Ubicación',
                icon: <MapPin className="w-4 h-4" />,
                rows: [
                  { label: 'Destino', value: detailEvent.destino || 'Sin destino' }
                ]
              },
              {
                title: 'Tiempo',
                icon: <Clock className="w-4 h-4" />,
                rows: [
                  { label: 'Creado', value: formatDate(detailEvent.timestamp) }
                ]
              },
              ...(detailEvent.observaciones ? [{
                title: 'Notas',
                icon: <FileText className="w-4 h-4" />,
                rows: [{ label: 'Observaciones', value: detailEvent.observaciones }]
              }] : [])
            ]}
            onClose={handleCloseDetail}
            actions={[
              { label: 'Editar', onClick: () => { handleCloseDetail(); handleEdit(detailEvent); }, variant: 'primary' },
              { label: 'Eliminar', onClick: () => { handleCloseDetail(); handleDelete(detailEvent.id); }, variant: 'danger' }
            ]}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => actions.setIsCreateModalOpen(false)}
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
          actions.setIsCreateModalOpen(false);
        }}
        theme={theme}
      />

      <CreateEventModal
        isOpen={isEditModalOpen}
        onClose={() => actions.setIsEditModalOpen(false)}
        onSubmit={async (data) => {
          if (selectedEvent && data.length > 0) {
            const item = data[0];
            await actions.updateEvent(selectedEvent.id, {
              barcode: item.barcode,
              productName: item.productName,
              destino: item.destino,
              traspaso: item.traspaso,
              observaciones: item.observaciones,
              frc: item.frc,
            });
          }
          actions.setIsEditModalOpen(false);
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
