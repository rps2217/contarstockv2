/**
 * DashboardSimple - Versión ligera del dashboard para móviles de gama baja
 * 
 * Características:
 * - Sin animaciones
 * - Sin efectos visuales costosos
 * - Queries optimizadas a la mitad
 * - UI minimalista
 */

import React from 'react';
import { Scan, Package, ArrowDownToLine, Zap, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSyncStore, useAppStore } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

interface SimpleActionButtonProps {
  title: string;
  icon: React.ElementType;
  primary?: boolean;
  onClick: () => void;
}

const SimpleActionButton: React.FC<SimpleActionButtonProps> = ({ title, icon: Icon, primary, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-colors',
      primary
        ? 'bg-blue-600 border-blue-500 text-white active:bg-blue-700'
        : 'bg-surface border-subtle text-primary active:bg-elevated'
    )}
  >
    <Icon className="w-6 h-6" />
    <span className="text-xs font-medium">{title}</span>
  </button>
);

export const DashboardSimple: React.FC = () => {
  const navigate = useNavigate();
  const { pendingItems } = useSyncStore();
  const { setStartSessionModalOpen } = useAppStore();

  // Solo consultar lo esencial - NO todas las métricas
  const stats = useLiveQuery(async () => {
    try {
      const [productCount, sessionCount] = await Promise.all([
        db?.products?.count() ?? 0,
        db?.sessions?.count() ?? 0,
      ]);
      return { productCount, sessionCount };
    } catch {
      return { productCount: 0, sessionCount: 0 };
    }
  }, [], { productCount: 0, sessionCount: 0 });

  const handleNewCount = () => setStartSessionModalOpen(true);

  return (
    <div className="h-full overflow-y-auto bg-base pb-24">
      {/* Header simple */}
      <div className="px-4 py-6">
        <h1 className="text-xl font-bold text-primary">Dashboard</h1>
        <p className="text-sm text-secondary mt-1">
          Resumen rápido de tu inventario
        </p>
      </div>

      {/* Stats mínimas */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface border border-subtle rounded-xl p-4">
            <p className="text-2xl font-bold text-primary">{stats?.productCount ?? 0}</p>
            <p className="text-xs text-secondary">Productos</p>
          </div>
          <div className="bg-surface border border-subtle rounded-xl p-4">
            <p className="text-2xl font-bold text-primary">{stats?.sessionCount ?? 0}</p>
            <p className="text-xs text-secondary">Sesiones</p>
          </div>
        </div>
      </div>

      {/* Acciones principales - Solo 4 */}
      <div className="px-4">
        <h2 className="text-sm font-medium text-secondary mb-3">Acciones</h2>
        <div className="grid grid-cols-2 gap-3">
          <SimpleActionButton
            title="Nuevo conteo"
            icon={Scan}
            primary
            onClick={handleNewCount}
          />
          <SimpleActionButton
            title="Recibir stock"
            icon={ArrowDownToLine}
            onClick={() => navigate('/reception')}
          />
          <SimpleActionButton
            title="Ver inventario"
            icon={Package}
            onClick={() => navigate('/data')}
          />
          <SimpleActionButton
            title="Historial"
            icon={History}
            onClick={() => navigate('/data')}
          />
        </div>
      </div>

      {/* Sincronización status */}
      <div className="px-4 mt-6">
        <div className={cn(
          'p-3 rounded-xl text-sm flex items-center justify-between',
          pendingItems > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
        )}>
          <span>
            {pendingItems > 0 ? `${pendingItems} pendientes de sync` : 'Todo sincronizado'}
          </span>
          <button 
            onClick={() => navigate('/sync')}
            className="text-xs underline"
          >
            Ver
          </button>
        </div>
      </div>

      {/* Espacio extra para el dock */}
      <div className="h-20" />
    </div>
  );
};
