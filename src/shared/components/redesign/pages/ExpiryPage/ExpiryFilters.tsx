/**
 * ExpiryFilters - Filtros avanzados para la página de vencimientos
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, X } from 'lucide-react';

export interface ExpiryFiltersProps {
  // Estado
  showFilters: boolean;
  selectedProvider: string;
  selectedLocation: string;
  providers: string[];
  locations: string[];

  // Acciones
  onToggleFilters: () => void;
  onProviderChange: (provider: string) => void;
  onLocationChange: (location: string) => void;
  onClearFilters: () => void;
}

export const ExpiryFilters: React.FC<ExpiryFiltersProps> = ({
  showFilters,
  selectedProvider,
  selectedLocation,
  providers,
  locations,
  onToggleFilters,
  onProviderChange,
  onLocationChange,
  onClearFilters,
}) => {
  if (!showFilters) return null;

  const hasActiveFilters = selectedProvider || selectedLocation;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-surface border border-subtle rounded-xl p-4 space-y-3"
    >
      <div className="flex flex-wrap gap-3">
        {/* Filtro por proveedor */}
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-muted mb-1 block flex items-center gap-1">
            <Truck className="w-3 h-3" /> Proveedor
          </label>
          <select
            value={selectedProvider}
            onChange={e => onProviderChange(e.target.value)}
            className="w-full bg-elevated border border-subtle rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-blue-500"
          >
            <option value="">Todos</option>
            {providers.map(p => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por ubicación */}
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-muted mb-1 block flex items-center gap-1">
            <MapPin className="w-3 h-3" /> Ubicación
          </label>
          <select
            value={selectedLocation}
            onChange={e => onLocationChange(e.target.value)}
            className="w-full bg-elevated border border-subtle rounded-lg px-3 py-2 text-sm text-primary focus:outline-none focus:border-blue-500"
          >
            <option value="">Todas</option>
            {locations.map(l => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        {/* Botón limpiar filtros */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              onClick={onClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-primary transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ExpiryFilters;
