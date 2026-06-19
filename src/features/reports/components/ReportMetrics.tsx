/**
 * ReportMetrics - Componente para mostrar métricas de reportes
 */

import React from 'react';
import { Package, AlertTriangle, TrendingUp, Boxes } from 'lucide-react';
import { ConsolidationMetrics } from '../types/Report';

interface ReportMetricsProps {
  metrics: ConsolidationMetrics;
  isLive?: boolean;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const ReportMetrics: React.FC<ReportMetricsProps> = ({ 
  metrics, 
  isLive = true,
  theme = 'dark' 
}) => {
  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  const metricCards = [
    {
      label: isLive ? 'Items en Vivo' : 'Total Items',
      value: metrics.totalItems,
      icon: Package,
      color: isHighContrast ? 'text-yellow-400' : isLight ? 'text-blue-600' : 'text-blue-500',
      bgColor: isHighContrast ? 'bg-yellow-900/20 border border-yellow-400/30' : isLight ? 'bg-blue-50' : 'bg-blue-900/20',
    },
    {
      label: 'Cantidad Total',
      value: metrics.totalQuantity.toLocaleString(),
      icon: Boxes,
      color: isHighContrast ? 'text-yellow-400' : isLight ? 'text-green-600' : 'text-green-500',
      bgColor: isHighContrast ? 'bg-yellow-900/20 border border-yellow-400/30' : isLight ? 'bg-green-50' : 'bg-green-900/20',
    },
    {
      label: 'SKUs Únicos',
      value: metrics.uniqueProducts,
      icon: TrendingUp,
      color: isHighContrast ? 'text-yellow-400' : isLight ? 'text-purple-600' : 'text-purple-500',
      bgColor: isHighContrast ? 'bg-yellow-900/20 border border-yellow-400/30' : isLight ? 'bg-purple-50' : 'bg-purple-900/20',
    },
    {
      label: 'Discrepancias',
      value: metrics.discrepancies,
      icon: AlertTriangle,
      color: metrics.discrepancies > 0 
        ? (isHighContrast ? 'text-yellow-400' : isLight ? 'text-yellow-600' : 'text-yellow-500')
        : (isHighContrast ? 'text-yellow-400' : isLight ? 'text-green-600' : 'text-green-500'),
      bgColor: metrics.discrepancies > 0
        ? (isHighContrast ? 'bg-yellow-900/20 border border-yellow-400/30' : isLight ? 'bg-yellow-50' : 'bg-yellow-900/20')
        : (isHighContrast ? 'bg-yellow-900/20 border border-yellow-400/30' : isLight ? 'bg-green-50' : 'bg-green-900/20'),
    },
  ];

  const textColor = isHighContrast ? 'text-yellow-400' : isLight ? 'text-gray-900' : 'text-gray-100';
  const subtextColor = isHighContrast ? 'text-yellow-500' : isLight ? 'text-gray-500' : 'text-gray-400';

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
              <p className={`text-xs ${subtextColor}`}>{metric.label}</p>
              <p className={`text-lg font-semibold ${textColor}`}>
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
