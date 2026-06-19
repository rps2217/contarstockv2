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
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const ReportFilters: React.FC<ReportFiltersProps> = ({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  onRefresh,
  isPulling = false,
  resultCount = 0,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  const sessionTypes: SessionType[] = ['all', 'standard', 'hammer', 'reception'];

  // Clases según tema
  const inputBg = isHighContrast ? 'bg-black' : isLight ? 'bg-white' : 'bg-gray-800';
  const inputBorder = isHighContrast ? 'border-yellow-400' : isLight ? 'border-gray-200' : 'border-gray-700';
  const inputText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-gray-900' : 'text-gray-100';
  const inputPlaceholder = isHighContrast ? 'text-yellow-600' : isLight ? 'text-gray-400' : 'text-gray-400';
  const iconColor = isHighContrast ? 'text-yellow-400' : isLight ? 'text-gray-400' : 'text-gray-400';
  const resultColor = isHighContrast ? 'text-yellow-400' : isLight ? 'text-gray-500' : 'text-gray-500';

  const labelColor = isHighContrast ? 'text-yellow-400' : isLight ? 'text-gray-600' : 'text-gray-400';

  const getButtonActiveClass = () => {
    if (isHighContrast) return 'bg-yellow-400 text-black';
    if (isLight) return 'bg-blue-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const getButtonInactiveClass = () => {
    if (isHighContrast) return 'bg-yellow-900/20 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-900/30';
    if (isLight) return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    return 'bg-gray-700 text-gray-300 hover:bg-gray-600';
  };

  const getRefreshClass = () => {
    if (isHighContrast) return 'bg-yellow-900/20 text-yellow-400 border border-yellow-400/30 hover:bg-yellow-900/30';
    if (isLight) return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    return 'bg-gray-700 text-gray-300 hover:bg-gray-600';
  };

  return (
    <div className="space-y-3">
      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${iconColor}`} />
        <input
          type="text"
          placeholder="Buscar por SKU, producto o ubicación..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`w-full pl-10 pr-4 py-2 ${inputBg} border ${inputBorder} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${inputText} placeholder:${inputPlaceholder}`}
        />
        {resultCount > 0 && (
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${resultColor}`}>
            {resultCount} resultados
          </span>
        )}
      </div>

      {/* Filtros por tipo de sesión */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-sm ${labelColor}`}>Tipo:</span>
        {sessionTypes.map((type) => (
          <button
            key={type}
            onClick={() => onFilterTypeChange(type)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filterType === type
                ? getButtonActiveClass()
                : getButtonInactiveClass()
            }`}
          >
            {SESSION_TYPE_LABELS[type]}
          </button>
        ))}
        
        {/* Botón de refresh */}
        <button
          onClick={onRefresh}
          disabled={isPulling}
          className={`ml-auto px-3 py-1 text-sm rounded-full hover:disabled:opacity-50 ${getRefreshClass()}`}
        >
          {isPulling ? 'Sincronizando...' : 'Actualizar'}
        </button>
      </div>
    </div>
  );
};

export default ReportFilters;
