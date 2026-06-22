import React from 'react';
import { 
  Package, 
  Tags, 
  Building2, 
  RotateCcw, 
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { Product } from '@/types';
import { useProductsStats } from '../hooks/useProductsStats';

interface InventoryMetricsCardsProps {
  products: Product[];
  pendingChangesCount?: number;
}

interface MetricCard {
  id: string;
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
}

export const InventoryMetricsCards: React.FC<InventoryMetricsCardsProps> = ({ 
  products,
  pendingChangesCount = 0
}) => {
  const { stats, byPolicy, alerts } = useProductsStats({
    products,
    pendingChangesCount
  });

  // Calcular categorías y proveedores (lógica que no está en productsDomain)
  const { topCategories, topProviders } = React.useMemo(() => {
    const categories = new Map<string, number>();
    const providers = new Map<string, number>();

    products.forEach(p => {
      const cat = (p as any).category || 'SIN CATEGORÍA';
      categories.set(cat, (categories.get(cat) || 0) + 1);

      const prov = (p as any).supplier || 'SIN PROVEEDOR';
      providers.set(prov, (providers.get(prov) || 0) + 1);
    });

    return {
      topCategories: Array.from(categories.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
      topProviders: Array.from(providers.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
    };
  }, [products]);

  // Métricas derivadas
  const synced = stats.total - alerts.syncing;
  const pending = alerts.syncing;
  const withPolicy = byPolicy.exchange + byPolicy.loss;

  const cards: MetricCard[] = [
    {
      id: 'total',
      title: 'Total',
      value: stats.total,
      icon: <Package className="w-4 h-4" />,
      color: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    },
    {
      id: 'conPolitica',
      title: 'Con Política',
      value: withPolicy,
      subtitle: `${Math.round(withPolicy / Math.max(stats.total, 1) * 100)}% del total`,
      icon: <Tags className="w-4 h-4" />,
      color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    },
    {
      id: 'canje',
      title: 'Con Canje',
      value: byPolicy.exchange,
      subtitle: `${byPolicy.loss} sin canje`,
      icon: <RotateCcw className="w-4 h-4" />,
      color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    },
    {
      id: 'sinPolitica',
      title: 'Sin Política',
      value: byPolicy.noInfo,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    },
    {
      id: 'sync',
      title: 'Sincronizados',
      value: synced,
      subtitle: `${pending} pendientes`,
      icon: <Wifi className="w-4 h-4" />,
      color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    },
    {
      id: 'errors',
      title: 'Errores',
      value: alerts.pendingChanges,
      icon: <WifiOff className="w-4 h-4" />,
      color: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
    },
  ];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-3">
        {cards.map(card => (
          <button
            key={card.id}
            className={`p-3 rounded-xl border transition-all active:scale-95 text-left ${card.color}`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                {card.title}
              </span>
              {card.icon}
            </div>
            <div className="text-xl font-black">{card.value}</div>
            {card.subtitle && (
              <div className="text-[8px] font-medium opacity-60 mt-0.5">
                {card.subtitle}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Top Categorías y Proveedores */}
      <div className="px-3 pb-3 flex gap-4 overflow-x-auto">
        {/* Top Categorías */}
        <div className="shrink-0 min-w-[140px] p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-1 mb-2">
            <Tags className="w-3 h-3 text-slate-500" />
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Categorías</span>
          </div>
          <div className="space-y-1">
            {topCategories.slice(0, 3).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-[9px]">
                <span className="text-slate-400 truncate max-w-[80px]">{name.slice(0, 10)}</span>
                <span className="text-slate-300 font-bold ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Proveedores */}
        <div className="shrink-0 min-w-[140px] p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-1 mb-2">
            <Building2 className="w-3 h-3 text-slate-500" />
            <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Proveedores</span>
          </div>
          <div className="space-y-1">
            {topProviders.slice(0, 3).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-[9px]">
                <span className="text-slate-400 truncate max-w-[80px]">{name.slice(0, 10)}</span>
                <span className="text-slate-300 font-bold ml-2">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default InventoryMetricsCards;
