/**
 * ReportMetrics - Componente para mostrar métricas de reportes
 */

import React from 'react';
import { Package, AlertTriangle, TrendingUp, Boxes } from 'lucide-react';
import { ConsolidationMetrics } from '../types/Report';

interface ReportMetricsProps {
  metrics: ConsolidationMetrics;
  isLive?: boolean;
}

export const ReportMetrics: React.FC<ReportMetricsProps> = ({ metrics, isLive = true }) => {
  const metricCards = [
    {
      label: isLive ? 'Items en Vivo' : 'Total Items',
      value: metrics.totalItems,
      icon: Package,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Cantidad Total',
      value: metrics.totalQuantity.toLocaleString(),
      icon: Boxes,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'SKUs Únicos',
      value: metrics.uniqueProducts,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Discrepancias',
      value: metrics.discrepancies,
      icon: AlertTriangle,
      color: metrics.discrepancies > 0 ? 'text-yellow-500' : 'text-green-500',
      bgColor: metrics.discrepancies > 0 ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metricCards.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.label}
            className={`${metric.bgColor} rounded-lg p-3 flex items-center gap-3`}
          >
            <Icon className={`w-5 h-5 ${metric.color}`} />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {metric.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReportMetrics;
