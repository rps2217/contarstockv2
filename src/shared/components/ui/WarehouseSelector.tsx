"use client";
/**
 * WarehouseSelector - Selector de almacén/ubicación para RLS
 * 
 * Componente UI para cambiar entre almacenes y aplicar filtros RLS.
 */

import React from 'react';
import { MapPin, ChevronDown, X, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWarehouseAccess, useWarehouseSelector } from '@/shared/hooks/useRLSFilter';

interface WarehouseSelectorProps {
  className?: string;
  showClearButton?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const WarehouseSelector: React.FC<WarehouseSelectorProps> = ({
  className,
  showClearButton = true,
  size = 'md',
}) => {
  const { warehouses, activeWarehouse, setWarehouse, isFiltering } = useWarehouseAccess();
  const { select, clear, canChange } = useWarehouseSelector();

  // Si no hay almacenes disponibles, no mostrar
  if (warehouses.length === 0) return null;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__all__') {
      clear();
    } else {
      select(value);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn(
        'flex items-center gap-2 bg-surface border border-subtle rounded-xl',
        sizeClasses[size]
      )}>
        <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
        
        <select
          value={activeWarehouse || '__all__'}
          onChange={handleChange}
          disabled={!canChange}
          className="bg-transparent text-primary outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
        >
          <option value="__all__">Todos</option>
          {warehouses.map((wh) => (
            <option key={wh} value={wh}>
              {wh}
            </option>
          ))}
        </select>

        {isFiltering && showClearButton && canChange && (
          <button
            onClick={clear}
            className="ml-1 p-0.5 hover:bg-elevated rounded-lg transition-colors"
            title="Ver todos"
          >
            <X className="w-3 h-3 text-muted" />
          </button>
        )}
      </div>

      {/* Indicador de filtro activo */}
      {isFiltering && (
        <div className="flex items-center gap-1 text-xs text-blue-500">
          <Shield className="w-3 h-3" />
          <span>Filtrado</span>
        </div>
      )}
    </div>
  );
};

/**
 * Badge que muestra el almacén activo
 */
export const WarehouseBadge: React.FC<{ className?: string }> = ({ className }) => {
  const { activeWarehouse, isFiltering } = useWarehouseAccess();

  if (!isFiltering || !activeWarehouse) return null;

  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-full',
      className
    )}>
      <MapPin className="w-3 h-3" />
      {activeWarehouse}
    </div>
  );
};

/**
 * Selector de almacén simple (dropdown)
 */
export const SimpleWarehouseDropdown: React.FC<{
  value: string | null;
  onChange: (value: string | null) => void;
  warehouses: string[];
  className?: string;
}> = ({ value, onChange, warehouses, className }) => {
  return (
    <select
      value={value || '__none__'}
      onChange={(e) => onChange(e.target.value === '__none__' ? null : e.target.value)}
      className={cn(
        'bg-surface border border-subtle text-primary px-3 py-2 rounded-xl',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
        'transition-all cursor-pointer',
        className
      )}
    >
      <option value="__none__">Sin ubicación</option>
      {warehouses.map((wh) => (
        <option key={wh} value={wh}>
          {wh}
        </option>
      ))}
    </select>
  );
};

export default WarehouseSelector;
