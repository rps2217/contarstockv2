/**
 * LazyStatsGrid - Grid de estadísticas con lazy loading
 * 
 * Las estadísticas se cargan de forma lazy para mejorar el TTI (Time to Interactive).
 */

import React, { memo, Suspense, useState, useEffect } from 'react';
import { Package, Users, ShoppingCart, Scan, RefreshCw, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/shared/components/ui/Skeleton';

// Iconos para métricas
const METRIC_ICONS = {
  products: Package,
  customers: Users,
  sessions: ShoppingCart,
  scans: Scan,
  syncQueue: RefreshCw,
  todaySessions: Calendar,
} as const;

// Lazy hook para cargar métricas
const LazyStatsGridInner = memo(({
  metrics,
  onMetricClick,
}: {
  metrics: any;
  onMetricClick?: (key: string) => void;
}) => {
  const items = [
    {
      key: 'productCount',
      label: 'Productos',
      value: metrics.productCount ?? 0,
      icon: METRIC_ICONS.products,
      colorClass: 'bg-blue-500/20 text-blue-500',
    },
    {
      key: 'customerCount',
      label: 'Clientes',
      value: metrics.customerCount ?? 0,
      icon: METRIC_ICONS.customers,
      colorClass: 'bg-emerald-500/20 text-emerald-500',
    },
    {
      key: 'sessionCount',
      label: 'Sesiones',
      value: metrics.sessionCount ?? 0,
      icon: METRIC_ICONS.sessions,
      colorClass: 'bg-purple-500/20 text-purple-500',
    },
    {
      key: 'scanCount',
      label: 'Escaneos',
      value: metrics.scanCount ?? 0,
      icon: METRIC_ICONS.scans,
      colorClass: 'bg-amber-500/20 text-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            onClick={() => onMetricClick?.(item.key)}
            className={cn(
              'bg-surface border border-subtle rounded-xl p-4 text-left',
              'hover:bg-elevated hover:border-blue-500/30 cursor-pointer transition-colors'
            )}
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', item.colorClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-primary mb-1">
              {item.value.toLocaleString()}
            </p>
            <p className="text-xs text-muted">{item.label}</p>
          </button>
        );
      })}
    </div>
  );
});

LazyStatsGridInner.displayName = 'LazyStatsGridInner';

// Placeholder skeleton
const StatsSkeleton = memo(() => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-surface border border-subtle rounded-xl p-4">
        <Skeleton className="w-10 h-10 rounded-lg mb-3" />
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-4 w-16" />
      </div>
    ))}
  </div>
));

StatsSkeleton.displayName = 'StatsSkeleton';

interface LazyStatsGridProps {
  metrics?: any;
  loading?: boolean;
  onMetricClick?: (key: string) => void;
  fallbackDelay?: number; // ms antes de mostrar skeleton
}

export const LazyStatsGrid = memo(({
  metrics,
  loading = false,
  onMetricClick,
  fallbackDelay = 100,
}: LazyStatsGridProps) => {
  const [shouldShowSkeleton, setShouldShowSkeleton] = useState(loading);

  // Mostrar skeleton después del delay
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => {
        setShouldShowSkeleton(true);
      }, fallbackDelay);
      return () => clearTimeout(timer);
    } else {
      setShouldShowSkeleton(false);
    }
  }, [loading, fallbackDelay]);

  // Si ya tenemos métricas, mostrar directamente
  if (metrics && !loading) {
    return (
      <LazyStatsGridInner metrics={metrics} onMetricClick={onMetricClick} />
    );
  }

  // Si está cargando y pasó el delay, mostrar skeleton
  if (shouldShowSkeleton || loading) {
    return <StatsSkeleton />;
  }

  // Si no está cargando pero tampoco hay métricas, retornar null
  return null;
});

LazyStatsGrid.displayName = 'LazyStatsGrid';

export default LazyStatsGrid;