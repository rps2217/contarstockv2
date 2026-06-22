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
        className="w-full h-11 pl-11 pr-10 rounded-full bg-[var(--appsheet-surface-tertiary)] border-none text-sm text-[var(--appsheet-text-primary)] placeholder:text-[var(--appsheet-text-secondary)] focus:outline-none focus:bg-[var(--appsheet-bg-elevated)] transition-all"
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
            'h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-all',
            isActive
              ? 'bg-[var(--appsheet-primary)] text-white'
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
                    'w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors relative overflow-hidden',
                    action.danger
                      ? 'text-[var(--appsheet-error)] hover:bg-[var(--appsheet-error-subtle)]'
                      : 'text-[var(--appsheet-text-primary)] hover:bg-[var(--appsheet-bg-hover)]'
                  )}
                  // Ripple effect on click
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Ripple element */}
                  <span className={cn(
                    'absolute inset-0 opacity-0 transition-opacity duration-300',
                    action.danger ? 'bg-[var(--appsheet-error)]' : 'bg-white'
                  )} style={{ opacity: 0 }} />
                  {action.icon}
                  <span className="relative z-10">{action.label}</span>
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
      className="list-item bg-[var(--appsheet-bg-surface)] border-b border-[var(--appsheet-border-subtle)] last:border-b-0 cursor-pointer transition-colors duration-150"
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
// ============================================================================
// DETAIL VIEW - Vista de detalle con animaciones Material Design
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
    <>
      {/* Backdrop con fade */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Panel deslizante desde la derecha */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{
          type: 'spring',
          damping: 30,
          stiffness: 350,
          mass: 0.8
        }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[var(--appsheet-bg-surface)] z-50 flex flex-col"
      >
        {/* AppBar */}
        <div className="flex items-center h-14 px-4 gap-3 border-b border-[var(--appsheet-border-subtle)]">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-[var(--appsheet-bg-hover)] active:bg-[var(--appsheet-bg-active)]"
          >
            <X className="w-6 h-6" />
          </motion.button>
          <motion.div 
            className="flex-1 min-w-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-base font-semibold flex items-center gap-2">
              {icon}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && (
              <p className="text-xs text-[var(--appsheet-text-tertiary)]">{subtitle}</p>
            )}
          </motion.div>
          {status && (
            <motion.span 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className={cn('px-3 py-1 text-xs font-semibold rounded-full border', statusBadge[status.variant])}
            >
              {status.label}
            </motion.span>
          )}
        </div>

        {/* Content con scroll */}
        <motion.div 
          className="flex-1 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          {sections.map((section, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="border-b border-[var(--appsheet-border-subtle)]"
            >
              {section.title && (
                <div className="flex items-center gap-2 px-4 py-2 bg-[var(--appsheet-bg-elevated)]">
                  {section.icon && <span className="text-[var(--appsheet-primary)]">{section.icon}</span>}
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--appsheet-text-secondary)]">
                    {section.title}
                  </span>
                </div>
              )}
              {section.rows.map((row, j) => (
                <div 
                  key={j} 
                  className="detail-row flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors duration-150"
                >
                  <div className="flex-1">
                    <p className="text-[11px] text-[var(--appsheet-text-tertiary)] uppercase tracking-wider">{row.label}</p>
                    <p className="text-sm font-medium mt-0.5">{row.value}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          ))}
        </motion.div>

        {/* Actions con botones animados */}
        {actions && actions.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 border-t border-[var(--appsheet-border-subtle)] flex gap-3"
          >
            {actions.map((action, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                onClick={action.onClick}
                className={cn(
                  'flex-1 h-11 rounded-lg text-sm font-semibold transition-all',
                  action.variant === 'primary'
                    ? 'bg-[var(--appsheet-primary)] text-black hover:brightness-110'
                    : action.variant === 'danger'
                    ? 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)] hover:bg-[var(--appsheet-error)] hover:text-white'
                    : 'bg-[var(--appsheet-bg-elevated)] hover:bg-[var(--appsheet-bg-hover)]'
                )}
              >
                {action.label}
              </motion.button>
            ))}
          </motion.div>
        )}
      </motion.div>
    </>
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
        className="mt-4 h-10 px-5 rounded-full bg-[var(--appsheet-primary)] text-white text-sm font-medium"
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

  // Handle editar - usa el CreateEventModal existente con lógica de negocio
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

      {/* Edit Event Modal - usa el mismo CreateEventModal con editingItem */}
      {/* La lógica de negocio ya está en useEventForm: */}
      {/* - SKU editable → busca producto en BD */}
      {/* - productName auto-rellenado desde BD (no editable) */}
      {/* - Si producto no existe, usa el nombre original del evento */}
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
