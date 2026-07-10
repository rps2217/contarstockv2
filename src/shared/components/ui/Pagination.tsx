/**
 * Pagination - Componente de paginación reutilizable
 * 
 * Características:
 * - Navegación: Primera, Anterior, Siguiente, Última
 * - Selector de página actual
 * - Configurable: elementos por página, máx botones visibles
 * - Estados: loading, disabled
 */

import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  maxVisible?: number;
  isLoading?: boolean;
  showInfo?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  maxVisible = 5,
  isLoading = false,
  showInfo = true,
  className,
}) => {
  // Generar números de página visibles
  const pageNumbers = useMemo(() => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | string)[] = [];
    const halfVisible = Math.floor(maxVisible / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Primera página
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) pages.push('...');
    }

    // Páginas del medio
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Última página
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages, maxVisible]);

  // Calcular rango de items actuales
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const itemsPerPageOptions = [10, 25, 50, 100];

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}>
      {/* Info */}
      {showInfo && (
        <div className="flex items-center gap-4 text-sm text-muted order-2 sm:order-1">
          <span>
            {totalItems > 0 ? (
              <>
                Mostrando <span className="font-medium text-primary">{startItem}-{endItem}</span> de{' '}
                <span className="font-medium text-primary">{totalItems}</span>
              </>
            ) : (
              'Sin resultados'
            )}
          </span>
          
          {/* Selector de items por página */}
          {onItemsPerPageChange && (
            <div className="flex items-center gap-2">
              <label className="text-xs">por página:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="bg-surface border border-subtle rounded-lg px-2 py-1 text-xs text-primary focus:outline-none focus:border-blue-500"
              >
                {itemsPerPageOptions.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Navegación */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Primera */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1 || isLoading}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'text-muted hover:text-primary hover:bg-elevated',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
          title="Primera página"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Anterior */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'text-muted hover:text-primary hover:bg-elevated',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
          title="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Números */}
        {pageNumbers.map((page, index) => (
          typeof page === 'number' ? (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              disabled={isLoading}
              className={cn(
                'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                page === currentPage
                  ? 'bg-blue-600 text-white'
                  : 'text-muted hover:text-primary hover:bg-elevated',
                'disabled:cursor-not-allowed'
              )}
            >
              {page}
            </button>
          ) : (
            <span key={`ellipsis-${index}`} className="w-9 h-9 flex items-center justify-center text-muted">
              ...
            </span>
          )
        ))}

        {/* Siguiente */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'text-muted hover:text-primary hover:bg-elevated',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
          title="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Última */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || isLoading}
          className={cn(
            'p-2 rounded-lg transition-colors',
            'text-muted hover:text-primary hover:bg-elevated',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          )}
          title="Última página"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Hook para manejar paginación
export const usePagination = (totalItems: number, defaultItemsPerPage = 25) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(defaultItemsPerPage);

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const currentItems = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return { start, end: Math.min(start + itemsPerPage, totalItems) };
  }, [currentPage, itemsPerPage, totalItems]);

  const goToPage = React.useCallback((page: number) => {
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(clampedPage);
  }, [totalPages]);

  const nextPage = React.useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = React.useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Reset a página 1 cuando cambia el total de items
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  return {
    currentPage,
    totalPages,
    itemsPerPage,
    setItemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    currentItems,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage === totalPages,
  };
};
