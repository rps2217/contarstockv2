/**
 * DualView - Vista Dual Reutilizable Estilo AppSheet
 * 
 * Componente robusto para crear vistas master-detail con splitter redimensionable.
 * Patrón implementado para replicar la experiencia de AppSheet.
 * 
 * Características:
 * - Vista dual con splitter draggable
 * - Estados: full-list | split | full-detail
 * - Animaciones suaves con framer-motion
 * - Preservación del ancho del splitter
 * - Responsive y reutilizable
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Utility function for conditional classes
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

interface DualViewProps {
  /** Panel izquierdo - Lista */
  listPanel: React.ReactNode;
  /** Panel derecho - Detalle */
  detailPanel?: React.ReactNode;
  /** Item seleccionado (determina si se muestra el detail panel) */
  selectedItem?: any | null;
  /** Callback al seleccionar un item */
  onSelectItem?: (item: any | null) => void;
  /** Callback al cerrar el detalle */
  onCloseDetail?: () => void;
  /** Ancho inicial del panel izquierdo en porcentaje (default: 50) */
  initialLeftWidth?: number;
  /** Ancho mínimo del panel izquierdo en porcentaje (default: 25) */
  minLeftWidth?: number;
  /** Ancho máximo del panel izquierdo en porcentaje (default: 75) */
  maxLeftWidth?: number;
  /** Si el splitter está habilitado (default: true) */
  enableSplitter?: boolean;
  /** Si debe usar animación de slide para el panel detalle (default: true) */
  animateDetail?: boolean;
  /** Callback cuando cambia el ancho del splitter */
  onWidthChange?: (width: number) => void;
  /** Clase CSS adicional para el contenedor */
  className?: string;
  /** Mostrar indicador de splitter en hover */
  showSplitterHint?: boolean;
}

export function DualView({
  listPanel,
  detailPanel,
  selectedItem,
  onSelectItem,
  onCloseDetail,
  initialLeftWidth = 50,
  minLeftWidth = 25,
  maxLeftWidth = 75,
  enableSplitter = true,
  animateDetail = true,
  onWidthChange,
  className,
  showSplitterHint = true,
}: DualViewProps) {
  // Estado del ancho del panel izquierdo
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  // Estado de arrastre del splitter
  const [isDragging, setIsDragging] = useState(false);
  // Referencia al contenedor para calcular posiciones
  const containerRef = useRef<HTMLDivElement>(null);

  // Verificar si hay un item seleccionado
  const hasDetail = !!selectedItem && !!detailPanel;

  // Manejar el cierre del detalle
  const handleClose = useCallback(() => {
    onSelectItem?.(null);
    onCloseDetail?.();
  }, [onSelectItem, onCloseDetail]);

  // Iniciar arrastre del splitter
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enableSplitter) return;
    e.preventDefault();
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const containerWidth = rect.width;
      const mouseX = moveEvent.clientX - rect.left;
      
      // Calcular nuevo ancho como porcentaje
      let newWidth = (mouseX / containerWidth) * 100;
      
      // Limitar entre min y max
      newWidth = Math.min(Math.max(newWidth, minLeftWidth), maxLeftWidth);
      
      setLeftWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [enableSplitter, minLeftWidth, maxLeftWidth, onWidthChange]);

  // Preservar el ancho cuando se cierra el detalle
  useEffect(() => {
    if (!hasDetail) {
      // Cuando se cierra el detalle, mantener el último ancho
      // para cuando se vuelva a abrir
    }
  }, [hasDetail]);

  // Determinar el ancho de cada panel
  const listWidth = hasDetail ? leftWidth : 100;
  const detailWidth = hasDetail ? 100 - leftWidth : 0;

  return (
    <div 
      ref={containerRef}
      className={cn(
        'dual-view h-full w-full flex overflow-hidden',
        isDragging && 'select-none',
        className
      )}
    >
      {/* Panel Izquierdo - Lista */}
      <motion.div
        animate={{ width: `${listWidth}%` }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          'dual-view-list h-full overflow-hidden',
          hasDetail && 'border-r border-[var(--appsheet-border-subtle)]'
        )}
      >
        {listPanel}
      </motion.div>

      {/* Splitter */}
      <AnimatePresence>
        {hasDetail && enableSplitter && (
          <motion.div
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
            transition={{ duration: 0.15 }}
            onMouseDown={handleMouseDown}
            className={cn(
              'dual-view-splitter group relative flex-shrink-0 w-2 cursor-col-resize',
              'flex items-center justify-center',
              'hover:bg-[var(--appsheet-border-default)]',
              isDragging && 'bg-[var(--appsheet-primary)]'
            )}
            style={{ height: '100%' }}
          >
            {/* Indicador visual del splitter */}
            {showSplitterHint && (
              <div
                className={cn(
                  'absolute inset-y-0 w-1 rounded-full transition-all duration-150',
                  'opacity-0 group-hover:opacity-100',
                  isDragging ? 'opacity-100 bg-[var(--appsheet-primary)]' : 'bg-[var(--appsheet-text-tertiary)]'
                )}
              />
            )}
            
            {/* Indicador de drag activo */}
            {isDragging && (
              <div className="absolute inset-0 bg-[var(--appsheet-primary)] opacity-50" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel Derecho - Detalle */}
      <AnimatePresence>
        {hasDetail && detailPanel && (
          <motion.div
            initial={animateDetail ? { x: '100%', width: `${detailWidth}%` } : { width: `${detailWidth}%` }}
            animate={{ width: `${detailWidth}%`, x: 0 }}
            exit={animateDetail ? { x: '100%' } : { x: 0 }}
            transition={{ 
              type: animateDetail ? 'spring' : 'tween',
              damping: animateDetail ? 30 : 0,
              stiffness: animateDetail ? 350 : 0,
              mass: animateDetail ? 0.8 : 0,
              duration: animateDetail ? undefined : 0.2
            }}
            className={cn(
              'dual-view-detail h-full overflow-hidden flex-shrink-0',
              'bg-[var(--appsheet-bg-surface)]'
            )}
          >
            {detailPanel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// SPLITTER SEPARADO - Por si se necesita usar independientemente
// ============================================================================

interface SplitterProps {
  /** Callback cuando cambia el ancho */
  onResize: (width: number) => void;
  /** Ancho actual del panel izquierdo en porcentaje */
  currentWidth: number;
  /** Ancho mínimo del panel izquierdo en porcentaje (default: 25) */
  minWidth?: number;
  /** Ancho máximo del panel izquierdo en porcentaje (default: 75) */
  maxWidth?: number;
  /** Mostrar indicador de splitter en hover (default: true) */
  showHint?: boolean;
  /** Altura del splitter (default: 100%) */
  height?: string;
}

export function Splitter({
  onResize,
  currentWidth,
  minWidth = 25,
  maxWidth = 75,
  showHint = true,
  height = '100%',
}: SplitterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      
      const parent = containerRef.current.parentElement;
      if (!parent) return;
      
      const rect = parent.getBoundingClientRect();
      const mouseX = moveEvent.clientX - rect.left;
      let newWidth = (mouseX / rect.width) * 100;
      newWidth = Math.min(Math.max(newWidth, minWidth), maxWidth);
      
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onResize, minWidth, maxWidth]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{ height }}
      className={cn(
        'splitter relative flex-shrink-0 w-2 cursor-col-resize',
        'flex items-center justify-center',
        'hover:bg-[var(--appsheet-border-default)]',
        isDragging && 'bg-[var(--appsheet-primary)]'
      )}
    >
      {showHint && (
        <div
          className={cn(
            'absolute inset-y-0 w-1 rounded-full transition-all duration-150',
            'opacity-0 group-hover:opacity-100',
            isDragging ? 'opacity-100 bg-[var(--appsheet-primary)]' : 'bg-[var(--appsheet-text-tertiary)]'
          )}
        />
      )}
    </div>
  );
}

// ============================================================================
// DETAIL PANEL - Panel de detalle estilizado
// ============================================================================

interface DetailPanelProps {
  /** Título del panel */
  title: string;
  /** Subtítulo del panel */
  subtitle?: string;
  /** Ícono del título */
  icon?: React.ReactNode;
  /** Badge de estado */
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'info';
  };
  /** Contenido del panel */
  children: React.ReactNode;
  /** Acciones del footer */
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'danger' | 'default';
  }>;
  /** Callback al cerrar */
  onClose: () => void;
  /** Clase CSS adicional */
  className?: string;
}

const statusBadgeClasses = {
  success: 'bg-[var(--appsheet-success-subtle)] text-[var(--appsheet-success)] border-[var(--appsheet-success)]',
  warning: 'bg-[var(--appsheet-warning-subtle)] text-[var(--appsheet-warning)] border-[var(--appsheet-warning)]',
  error: 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)] border-[var(--appsheet-error)]',
  info: 'bg-[var(--appsheet-info-subtle)] text-[var(--appsheet-info)] border-[var(--appsheet-info)]',
};

export function DetailPanel({
  title,
  subtitle,
  icon,
  status,
  children,
  actions,
  onClose,
  className,
}: DetailPanelProps) {
  return (
    <div className={cn('flex flex-col h-full bg-[var(--appsheet-bg-surface)]', className)}>
      {/* Header */}
      <div className="flex items-center h-14 px-4 gap-3 border-b border-[var(--appsheet-border-subtle)] flex-shrink-0">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-[var(--appsheet-bg-hover)] active:bg-[var(--appsheet-bg-active)] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold flex items-center gap-2 truncate">
            {icon && <span className="text-[var(--appsheet-primary)]">{icon}</span>}
            <span className="truncate">{title}</span>
          </h2>
          {subtitle && (
            <p className="text-sm text-[var(--appsheet-text-tertiary)] truncate">{subtitle}</p>
          )}
        </div>
        
        {status && (
          <span className={cn(
            'px-3 py-1 text-xs font-semibold rounded-full border shrink-0',
            statusBadgeClasses[status.variant]
          )}>
            {status.label}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="p-4 border-t border-[var(--appsheet-border-subtle)] flex gap-3 flex-shrink-0">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={cn(
                'flex-1 h-12 rounded-xl text-base font-semibold transition-all',
                action.variant === 'primary' && 'bg-[var(--appsheet-primary)] text-black hover:brightness-110',
                action.variant === 'danger' && 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)] hover:bg-[var(--appsheet-error)] hover:text-white',
                action.variant === 'default' || !action.variant && 'bg-[var(--appsheet-bg-elevated)] hover:bg-[var(--appsheet-bg-hover)]'
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SECTION - Sección con título e ícono
// ============================================================================

interface SectionProps {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, icon, children, className }: SectionProps) {
  return (
    <div className={cn('border-b border-[var(--appsheet-border-subtle)]', className)}>
      {title && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[var(--appsheet-bg-elevated)]">
          {icon && <span className="text-[var(--appsheet-primary)]">{icon}</span>}
          <span className="text-sm font-semibold uppercase tracking-wider text-[var(--appsheet-text-secondary)]">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================================================
// ROW - Fila de datos en el panel de detalle
// ============================================================================

interface RowProps {
  label: string;
  value: string | React.ReactNode;
  className?: string;
}

export function Row({ label, value, className }: RowProps) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-4 transition-colors duration-150', className)}>
      <div className="flex-1">
        <p className="text-sm text-[var(--appsheet-text-tertiary)] uppercase tracking-wider">{label}</p>
        <p className="text-base font-medium mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default DualView;
