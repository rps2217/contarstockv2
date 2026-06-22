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
import { DualView, DetailPanel, Section, Row } from '@/shared/components/layout';

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
        <h1 className="text-lg font-semibold truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[var(--appsheet-text-tertiary)]">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
    {search}
  </div>
);

// ============================================================================
// SEARCH BAR - Barra de búsqueda estilo AppSheet (centrado, discreto)
// ============================================================================
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => (
  <div className="px-6 pb-3">
    <div className="relative max-w-md mx-auto">
      {/* Icono de búsqueda */}
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--appsheet-text-secondary)]" />
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 pl-11 pr-10 rounded-full bg-[var(--appsheet-bg-search)] border-none text-base text-[var(--appsheet-text-primary)] placeholder:text-[var(--appsheet-text-secondary)] focus:outline-none focus:bg-[var(--appsheet-bg-elevated)] transition-all"
      />
      
      {/* Botón clear */}
      {value && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[var(--appsheet-bg-elevated)] hover:bg-[var(--appsheet-bg-hover)]"
        >
          <X className="w-4 h-4 text-[var(--appsheet-text-secondary)]" />
        </motion.button>
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
            'h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-all',
            isActive
              ? 'bg-[var(--appsheet-primary)] text-black'
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
// ACTION MENU - Menú de 3 puntos con animaciones Material Design
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
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        buttonRef && !buttonRef.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [buttonRef]);

  // Calculate position based on button
  const getMenuStyle = () => {
    if (!buttonRef) return {};
    const rect = buttonRef.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      right: `${window.innerWidth - rect.right + 8}px`,
      top: `${rect.bottom + 4}px`,
    };
  };

  return (
    <div className="relative">
      <button
        ref={setButtonRef}
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-2 rounded-full hover:bg-[var(--appsheet-bg-hover)] active:bg-[var(--appsheet-bg-active)] transition-colors duration-150"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop para cerrar */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            
            {/* Menú animado desde el centro del botón */}
            <motion.div
              ref={menuRef}
              initial={{ 
                opacity: 0, 
                scale: 0.85,
                y: -8
              }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: 0
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.85,
                y: -8
              }}
              transition={{
                duration: 0.2,
                ease: [0.32, 0.72, 0, 1] // MD3 Emphasized decelerate
              }}
              style={getMenuStyle()}
              className="w-56 bg-[var(--appsheet-bg-card)] border border-[var(--appsheet-border-default)] rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {/* Elevation overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
              
              {actions.map((action, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    action.onClick(); 
                    setOpen(false); 
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 text-base transition-colors relative overflow-hidden',
                    action.danger
                      ? 'text-[var(--appsheet-error)] hover:bg-[var(--appsheet-error-subtle)]'
                      : 'text-[var(--appsheet-text-primary)] hover:bg-[var(--appsheet-bg-hover)]'
                  )}
                  whileTap={{ scale: 0.98 }}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// LIST ITEM - Item de lista denso estilo MD3 con State Layers sutiles
// ============================================================================
interface ListItemProps {
  title: string;
  subtitle?: string;
  status?: { label: string; variant: 'success' | 'warning' | 'error' | 'info' };
  meta?: Array<{ label: string; value: string }>;
  onClick?: () => void;
  isSelected?: boolean;
  actions?: ActionMenuProps['actions'];
}

const ListItem: React.FC<ListItemProps> = ({ title, subtitle, status, meta, onClick, isSelected, actions }) => {
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
      className={cn(
        'list-item border-b border-[var(--appsheet-border-subtle)] last:border-b-0 cursor-pointer transition-colors duration-150',
        isSelected 
          ? 'bg-[var(--appsheet-primary-subtle)] border-l-4 border-l-[var(--appsheet-primary)]' 
          : 'bg-[var(--appsheet-bg-surface)] hover:bg-[var(--appsheet-bg-elevated)]'
      )}
    >
      <div className="flex items-center min-h-[76px] px-4 py-3">
        {/* Status dot */}
        <div className={cn('w-2.5 h-2.5 rounded-full shrink-0 mr-3', status ? statusBg[status.variant] : 'bg-[var(--appsheet-text-disabled)]')} />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn('text-base font-medium truncate', isSelected && 'text-[var(--appsheet-primary)]')}>{title}</p>
            {status && (
              <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-full shrink-0', statusBadge[status.variant])}>
                {status.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-[var(--appsheet-text-tertiary)] truncate">{subtitle}</p>
          )}
          {meta && meta.length > 0 && (
            <div className="flex gap-4 mt-1.5">
              {meta.slice(0, 3).map((m, i) => (
                <span key={i} className="text-sm text-[var(--appsheet-text-disabled)]">
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
    <p className="text-base font-medium text-[var(--appsheet-text-secondary)]">{title}</p>
    {description && <p className="text-sm text-[var(--appsheet-text-tertiary)] mt-1">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-5 h-11 px-6 rounded-full bg-[var(--appsheet-primary)] text-black text-sm font-semibold"
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
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className="fixed right-4 bottom-4 w-14 h-14 rounded-2xl bg-[var(--appsheet-primary)] text-black shadow-lg flex items-center justify-center"
    style={{ boxShadow: '0 4px 12px rgba(138, 180, 248, 0.4)' }}
  >
    {icon || <Plus className="w-6 h-6" />}
  </motion.button>
);

// ============================================================================
// COMPONENTE PRINCIPAL - Vista Dual (Lista + Panel Detalle) estilo AppSheet
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

  // Renderizar el panel de detalle
  const renderDetailPanel = () => (
    <DetailPanel
      title={detailEvent.productName || 'Evento'}
      subtitle={detailEvent.barcode}
      icon={<Package className="w-5 h-5" />}
      status={getStatus(detailEvent)}
      onClose={handleCloseDetail}
      actions={[
        { label: 'Editar', onClick: () => handleEdit(detailEvent), variant: 'primary' },
        { label: 'Eliminar', onClick: () => handleDelete(detailEvent.id), variant: 'danger' }
      ]}
    >
      <Section title="Producto" icon={<Package className="w-4 h-4" />}>
        <Row label="Nombre" value={detailEvent.productName || 'N/A'} />
        <Row label="Barcode" value={detailEvent.barcode} />
        <Row label="Cantidad" value="1 unidad" />
      </Section>
      
      <Section title="Documento" icon={<FileText className="w-4 h-4" />}>
        <Row label="FRC" value={detailEvent.frc || 'Sin FRC'} />
        <Row label="Traspaso" value={detailEvent.traspaso || 'N/A'} />
      </Section>
      
      <Section title="Ubicación" icon={<MapPin className="w-4 h-4" />}>
        <Row label="Destino" value={detailEvent.destino || 'Sin destino'} />
      </Section>
      
      <Section title="Tiempo" icon={<Clock className="w-4 h-4" />}>
        <Row label="Creado" value={formatDate(detailEvent.timestamp)} />
      </Section>
      
      {detailEvent.observaciones && (
        <Section title="Notas" icon={<FileText className="w-4 h-4" />}>
          <Row label="Observaciones" value={detailEvent.observaciones} />
        </Section>
      )}
    </DetailPanel>
  );

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

      {/* Vista Dual */}
      <DualView
        selectedItem={detailEvent}
        onSelectItem={setDetailEvent}
        minLeftWidth={200}
        maxLeftWidth={800}
        listPanel={
          isLoading ? (
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
                isSelected={detailEvent?.id === event.id}
                actions={[
                  { label: 'Ver detalle', icon: <Eye className="w-4 h-4" />, onClick: () => handleViewDetail(event) },
                  { label: 'Editar', icon: <Edit2 className="w-4 h-4" />, onClick: () => handleEdit(event) },
                  { label: 'Eliminar', icon: <Trash2 className="w-4 h-4" />, onClick: () => handleDelete(event.id), danger: true }
                ]}
              />
            ))
          )
        }
        detailPanel={detailEvent ? renderDetailPanel() : undefined}
      />

      {/* FAB - Solo visible cuando no hay detalle abierto */}
      {!detailEvent && (
        <FAB onClick={() => actions.setIsCreateModalOpen(true)} />
      )}

      {/* Create Event Modal */}
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

      {/* Edit Event Modal - supersede el panel de detalle */}
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
              // Refrescar el detalle si está abierto
              if (detailEvent?.id === selectedEvent.id) {
                setDetailEvent({
                  ...detailEvent,
                  barcode: item.barcode,
                  productName: item.productName,
                  destino: item.destino,
                  traspaso: item.traspaso,
                  observaciones: item.observaciones,
                  frc: item.frc,
                });
              }
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
