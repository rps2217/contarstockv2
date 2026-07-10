/**
 * DualView - Vista Dual Reutilizable Estilo AppSheet
 * 
 * Implementación robusta basada en el patrón de VS Code, Figma, AppSheet.
 * SIN animaciones de slide - los paneles siempre están pegados a sus bordes.
 * 
 * Patrón de Layout:
 * ┌────────────────┬────────────────┐
 * │                │                │
 * │     LISTA      │    DETALLE     │
 * │                │                │
 * │   (izquierda) │   (derecha)    │
 * │                │                │
 * └────┬──────────┴────────────────┘
 *      │
 *      ▼
 * ┌────────────────┐
 * │   SPLITTER     │
 * │   (draggable)  │
 * └────────────────┘
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

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
  /** Ancho mínimo del panel izquierdo en pixels (default: 200) */
  minLeftWidth?: number;
  /** Ancho máximo del panel izquierdo en pixels (default: 800) */
  maxLeftWidth?: number;
  /** Si el splitter está habilitado (default: true) */
  enableSplitter?: boolean;
  /** Clase CSS adicional para el contenedor */
  className?: string;
}

export function DualView({
  listPanel,
  detailPanel,
  selectedItem,
  onSelectItem,
  onCloseDetail,
  minLeftWidth = 200,
  maxLeftWidth = 800,
  enableSplitter = true,
  className,
}: DualViewProps) {
  // Estado del ancho del panel izquierdo en pixels
  const [leftWidth, setLeftWidth] = useState(minLeftWidth);
  // Estado de arrastre del splitter
  const [isDragging, setIsDragging] = useState(false);
  // Referencia al contenedor
  const containerRef = useRef<HTMLDivElement>(null);

  // Verificar si hay un item seleccionado
  const hasDetail = !!selectedItem && !!detailPanel;

  // Efecto para inicializar el ancho cuando aparece el detalle
  useEffect(() => {
    if (hasDetail && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      // Inicializar en 50% del contenedor, pero dentro de los límites
      const initialWidth = Math.min(Math.max(containerWidth * 0.5, minLeftWidth), maxLeftWidth);
      setLeftWidth(initialWidth);
    }
  }, [hasDetail, minLeftWidth, maxLeftWidth]);

  // Manejar el cierre del detalle
  const handleClose = useCallback(() => {
    onSelectItem?.(null);
    onCloseDetail?.();
  }, [onSelectItem, onCloseDetail]);

  // Iniciar arrastre del splitter
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!enableSplitter) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const mouseX = moveEvent.clientX - containerRect.left;
      
      // Calcular nuevo ancho en pixels, limitado por min/max
      let newWidth = Math.max(minLeftWidth, mouseX);
      newWidth = Math.min(newWidth, containerRect.width - minLeftWidth);
      newWidth = Math.min(newWidth, maxLeftWidth);
      
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [enableSplitter, minLeftWidth, maxLeftWidth]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        'dual-view h-full w-full flex overflow-hidden',
        isDragging && 'select-none cursor-col-resize',
        className
      )}
    >
      {/* Panel Izquierdo - Lista */}
      {/* SIEMPRE ocupa el espacio disponible hasta leftWidth */}
      <div
        style={{ 
          width: hasDetail ? leftWidth : '100%',
          flexShrink: 0,
          minWidth: hasDetail ? leftWidth : undefined,
          maxWidth: hasDetail ? leftWidth : '100%'
        }}
        className={cn(
          'dual-view-list h-full overflow-hidden bg-[var(--appsheet-bg-base)]',
          hasDetail && 'border-r border-[var(--appsheet-border-subtle)]'
        )}
      >
        {listPanel}
      </div>

      {/* Splitter - Solo visible cuando hay detalle */}
      {hasDetail && enableSplitter && (
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            'dual-view-splitter group relative flex-shrink-0 w-1 cursor-col-resize',
            'flex items-center justify-center',
            'hover:bg-[var(--appsheet-primary)]',
            isDragging && 'bg-[var(--appsheet-primary)]'
          )}
          style={{ height: '100%' }}
        >
          {/* Indicador visual - solo visible en hover/drag */}
          <div
            className={cn(
              'absolute inset-y-0 w-0.5 rounded-full transition-opacity duration-150',
              'opacity-0 group-hover:opacity-100',
              isDragging ? 'opacity-100 bg-white' : 'opacity-100 bg-[var(--appsheet-text-tertiary)]'
            )}
          />
        </div>
      )}

      {/* Panel Derecho - Detalle */}
      {/* SIEMPRE está pegado al borde derecho */}
      {/* Crece para ocupar todo el espacio restante */}
      <div
        style={{
          flex: 1,
          minWidth: 0
        }}
        className="dual-view-detail h-full flex-shrink-0 bg-[var(--appsheet-bg-surface)]"
      >
        {hasDetail && detailPanel}
      </div>
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
                (action.variant === 'default' || !action.variant) && 'bg-[var(--appsheet-bg-elevated)] hover:bg-[var(--appsheet-bg-hover)]'
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
