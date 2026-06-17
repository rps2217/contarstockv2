/**
 * ReportFilters - Componente de filtros para la página de reportes
 */

import React from 'react';
import { Search } from 'lucide-react';
import { SessionType } from '../types/Report';
import { SESSION_TYPE_LABELS } from '../constants/reportConstants';

interface ReportFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: SessionType;
  onFilterTypeChange: (type: SessionType) => void;
  onRefresh: () => void;
  isPulling?: boolean;
  resultCount?: number;
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  onRefresh,
  isPulling = false,
  resultCount = 0,
}) => {
  const sessionTypes: SessionType[] = ['all', 'standard', 'hammer', 'reception'];

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por SKU, producto o ubicación..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {resultCount > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            {resultCount} resultados
          </span>
        )}
      </div>

      {/* Filtros por tipo de sesión */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600 dark:text-gray-400">Tipo:</span>
        {sessionTypes.map((type) => (
          <button
            key={type}
            onClick={() => onFilterTypeChange(type)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filterType === type
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {SESSION_TYPE_LABELS[type]}
          </button>
        ))}
        
        {/* Botón de refresh */}
        <button
          onClick={onRefresh}
          disabled={isPulling}
          className="ml-auto px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          {isPulling ? 'Sincronizando...' : 'Actualizar'}
        </button>
      </div>
    </div>
  );
};

export default ReportFilters;
