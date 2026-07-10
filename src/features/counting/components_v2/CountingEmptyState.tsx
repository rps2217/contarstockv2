/**
 * CountingEmptyState - Estado vacío cuando no hay productos
 */

import React, { memo } from 'react';
import { ClipboardList } from 'lucide-react';

interface CountingEmptyStateProps {
  className?: string;
}

export const CountingEmptyState = memo(({
  className = '',
}: CountingEmptyStateProps) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mx-auto mb-4">
        <ClipboardList className="w-10 h-10 text-muted" />
      </div>
      <p className="text-muted text-lg font-medium">No hay productos escaneados</p>
      <p className="text-xs text-muted mt-1">
        Escanea códigos de barras para comenzar el conteo
      </p>
    </div>
  );
});

CountingEmptyState.displayName = 'CountingEmptyState';