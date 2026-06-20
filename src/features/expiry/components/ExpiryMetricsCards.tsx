import React, { useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, 
  RotateCcw, Package, DollarSign, CalendarClock 
} from 'lucide-react';
import { format } from 'date-fns';
import { ExpiryItem } from '../hooks/useExpiryDatabase';
import { ExpiryStatus } from '../domain/expiryEngine';

interface ExpiryMetricsCardsProps {
  items: ExpiryItem[];
  showTrend?: boolean;
}

interface MetricCard {
  id: string;
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  onClick?: () => void;
}

export const ExpiryMetricsCards: React.FC<ExpiryMetricsCardsProps> = ({ 
  items, 
  showTrend = false 
}) => {
  const metrics = useMemo(() => {
    const now = new Date();
    let totalValue = 0;
    const stats = {
      expired: 0,
      critical: 0,
      next_expiry: 0,
      withdrawal: 0,
      safe: 0,
    };
    
    // Por política
    let canjeCount = 0;
    let canjeValue = 0;
    let mermaCount = 0;
    let mermaValue = 0;
    
    // Por proveedor (top 5)
    const byProvider = new Map<string, { count: number; value: number }>();
    
    // Por mes de retiro
    const byMonth = new Map<string, number>();
    
    items.forEach(item => {
      // Stats por estado
      if (item.status === 'expired') stats.expired++;
      else if (item.status === 'critical') stats.critical++;
      else if (item.status === 'next_expiry') stats.next_expiry++;
      else if (item.status === 'withdrawal') stats.withdrawal++;
      else stats.safe++;
      
      // Valor estimado (quantity * price o estimado)
      const itemValue = (item.quantity || 1) * (item.price || 1000);
      totalValue += itemValue;
      
      // Por política
      if (item.hasCanje) {
        canjeCount++;
        canjeValue += itemValue;
      } else {
        mermaCount++;
        mermaValue += itemValue;
      }
      
      // Por proveedor
      const provName = item.providerName || 'SIN PROVEEDOR';
      const current = byProvider.get(provName) || { count: 0, value: 0 };
      current.count++;
      current.value += itemValue;
      byProvider.set(provName, current);
      
      // Por mes de retiro
      if (item.withdrawalDate) {
        const monthKey = format(item.withdrawalDate, 'MMM yyyy');
        byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + 1);
      }
    });
    
    // Top proveedores
    const topProviders = Array.from(byProvider.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));
    
    // Próximo mes con retiros
    const nextWithdrawalMonth = byMonth.size > 0 
      ? Array.from(byMonth.entries()).sort()[0]?.[0] 
      : null;
    
    return {
      stats,
      totalValue,
      canjeCount,
      canjeValue,
      mermaCount,
      mermaValue,
      topProviders,
      nextWithdrawalMonth,
      urgentCount: stats.expired + stats.critical + stats.withdrawal,
      percentage: items.length > 0 
        ? Math.round(((stats.expired + stats.critical) / items.length) * 100) 
        : 0
    };
  }, [items]);
  
  const cards: MetricCard[] = [
    {
      id: 'urgentes',
      title: 'Requieren Acción',
      value: metrics.urgentCount,
      subtitle: `${metrics.percentage}% del total`,
      icon: <AlertTriangle className="w-5 h-5" />,
      className: metrics.urgentCount > 0 
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
      onClick: () => {}
    },
    {
      id: 'vencidos',
      title: 'Vencidos',
      value: metrics.stats.expired,
      subtitle: 'ya no se pueden vender',
      icon: <ShieldCheck className="w-5 h-5" />,
      className: 'bg-red-500/10 border-red-500/30 text-red-400'
    },
    {
      id: 'critico',
      title: 'Críticos',
      value: metrics.stats.critical,
      subtitle: 'retiro inmediato',
      icon: <AlertTriangle className="w-5 h-5" />,
      className: 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    },
    {
      id: 'proximo',
      title: 'Próximo',
      value: metrics.stats.next_expiry,
      subtitle: metrics.nextWithdrawalMonth || 'sin fecha',
      icon: <CalendarClock className="w-5 h-5" />,
      className: 'bg-blue-500/10 border-blue-500/30 text-blue-400'
    },
    {
      id: 'valor',
      title: 'En Juego',
      value: metrics.totalValue > 0 
        ? `$${(metrics.totalValue / 1000000).toFixed(1)}M` 
        : '$0',
      subtitle: 'valor total',
      icon: <DollarSign className="w-5 h-5" />,
      className: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
    },
    {
      id: 'canje',
      title: 'Con Canje',
      value: metrics.canjeCount,
      subtitle: `$${(metrics.canjeValue / 1000000).toFixed(1)}M`,
      icon: <RotateCcw className="w-5 h-5" />,
      className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 p-4">
      {cards.map(card => (
        <button
          key={card.id}
          onClick={card.onClick}
          className={`p-3 rounded-2xl border transition-all active:scale-95 text-left ${card.className}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
              {card.title}
            </span>
            {card.icon}
          </div>
          <div className="text-2xl font-black">{card.value}</div>
          {card.subtitle && (
            <div className="text-[9px] font-medium opacity-60 mt-1 uppercase tracking-wide">
              {card.subtitle}
            </div>
          )}
        </button>
      ))}
    </div>
  );
};

export default ExpiryMetricsCards;
