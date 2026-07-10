"use client";
/**
 * DashboardFallback - Fallback UI para cuando el dashboard falla
 */

import React from 'react';
import { RefreshCw, Home, BarChart3, Package, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardFallbackProps {
  onRetry: () => void;
}

export const DashboardFallback: React.FC<DashboardFallbackProps> = ({ onRetry }) => {
  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header simplificado */}
      <div className="px-4 py-4 border-b border-subtle">
        <h1 className="text-xl font-bold text-primary">Dashboard</h1>
      </div>

      {/* Contenido fallback */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
          <BarChart3 className="w-10 h-10 text-rose-500" />
        </div>

        <h2 className="text-lg font-bold text-primary mb-2">
          No se pudo cargar el dashboard
        </h2>
        
        <p className="text-sm text-secondary text-center max-w-md mb-6">
          Hubo un problema al cargar las estadísticas. Puedes intentar recargar o volver al inicio.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface text-secondary rounded-xl font-medium hover:bg-elevated transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        </div>
      </div>

      {/* Quick actions simplificadas */}
      <div className="p-4 border-t border-subtle">
        <p className="text-xs text-muted mb-3 text-center">Acciones rápidas</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-2 p-3 bg-surface rounded-xl">
            <Package className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-primary">Inventario</span>
          </button>
          <button className="flex items-center gap-2 p-3 bg-surface rounded-xl">
            <ClipboardList className="w-5 h-5 text-emerald-500" />
            <span className="text-sm text-primary">Conteo</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardFallback;
