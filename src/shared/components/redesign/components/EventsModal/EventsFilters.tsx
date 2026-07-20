/**
 * =============================================================================
 * EVENTS FILTERS - Componente de filtros para eventos
 * =============================================================================
 */

import React from 'react';
import { Search } from 'lucide-react';
import { TYPE_OPTIONS, STATUS_OPTIONS } from './eventsConstants';
import type { EventType, EventStatus } from './eventsConstants';

interface EventsFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  typeFilter: EventType | 'all';
  onTypeFilterChange: (type: EventType | 'all') => void;
  statusFilter: EventStatus | 'all';
  onStatusFilterChange: (status: EventStatus | 'all') => void;
}

export const EventsFilters: React.FC<EventsFiltersProps> = ({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
}) => {
  return (
    <div className="px-4 sm:px-6 py-2 sm:py-3 border-b border-subtle shrink-0">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar..."
            className="w-full bg-base border border-subtle rounded-xl pl-9 pr-4 py-2 text-sm text-primary focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => onTypeFilterChange(e.target.value as EventType | 'all')}
          className="bg-base border border-subtle rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm text-primary focus:outline-none focus:border-blue-500"
        >
          <option value="all">Tipo</option>
          {TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => onStatusFilterChange(e.target.value as EventStatus | 'all')}
          className="bg-base border border-subtle rounded-xl px-2 sm:px-3 py-2 text-xs sm:text-sm text-primary focus:outline-none focus:border-blue-500"
        >
          <option value="all">Estado</option>
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
