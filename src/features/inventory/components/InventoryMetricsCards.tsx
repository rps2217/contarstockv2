import React, { useMemo } from 'react';
import { 
  Package, 
  Tags, 
  Building2, 
  RotateCcw, 
  AlertTriangle,
  TrendingUp,
  Database,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react';

interface Product {
  barcode: string;
  name: string;
  category?: string;
  supplier?: string;
  supplierRut?: string;
  withdrawalDays?: number;
  hasExchange?: boolean;
  syncStatus?: 'synced' | 'pending' | 'error';
  price?: number;
}

interface InventoryMetricsCardsProps {
  products: Product[];
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
  products 
}) => {
  const metrics = useMemo(() => {
    if (!products || products.length === 0) {
      return {
        total: 0,
        withPolicy: 0,
        withoutPolicy: 0,
        canje: 0,
        merma: 0,
        synced: 0,
        pending: 0,
        errors: 0,
        categories: new Map<string, number>(),
        providers: new Map<string, number>(),
        avgWithdrawalDays: 0,
      };
    }

    let withPolicy = 0;
    let withoutPolicy = 0;
    let canje = 0;
    let merma = 0;
    let synced = 0;
    let pending = 0;
    let errors = 0;
    let totalDays = 0;
    let daysCount = 0;
    const categories = new Map<string, number>();
    const providers = new Map<string, number>();

    products.forEach(p => {
      // Políticas
      if (p.withdrawalDays !== undefined) {
        withPolicy++;
        totalDays += p.withdrawalDays;
        daysCount++;
        if (p.hasExchange) canje++;
        else merma++;
      } else {
        withoutPolicy++;
      }

      // Sync status
      if (p.syncStatus === 'synced') synced++;
      else if (p.syncStatus === 'pending') pending++;
      else if (p.syncStatus === 'error') errors++;

      // Categorías
      const cat = p.category || 'SIN CATEGORÍA';
      categories.set(cat, (categories.get(cat) || 0) + 1);

      // Proveedores
      const prov = p.supplier || 'SIN PROVEEDOR';
      providers.set(prov, (providers.get(prov) || 0) + 1);
    });

    // Top categorías
    const topCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top proveedores
    const topProviders = Array.from(providers.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      total: products.length,
      withPolicy,
      withoutPolicy,
      canje,
      merma,
      synced,
      pending,
      errors,
      categories,
      providers,
      topCategories,
      topProviders,
      avgWithdrawalDays: daysCount > 0 ? Math.round(totalDays / daysCount) : 0,
    };
  }, [products]);

  const cards: MetricCard[] = [
    {
      id: 'total',
      title: 'Total',
      value: metrics.total,
      icon: <Package className="w-4 h-4" />,
      color: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    },
    {
      id: 'conPolitica',
      title: 'Con Política',
      value: metrics.withPolicy,
      subtitle: `${metrics.avgWithdrawalDays}D promedio`,
      icon: <Tags className="w-4 h-4" />,
      color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
    },
    {
      id: 'canje',
      title: 'Con Canje',
      value: metrics.canje,
      subtitle: `${metrics.merma} sin canje`,
      icon: <RotateCcw className="w-4 h-4" />,
      color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    },
    {
      id: 'sinPolitica',
      title: 'Sin Política',
      value: metrics.withoutPolicy,
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    },
    {
      id: 'sync',
      title: 'Sincronizados',
      value: metrics.synced,
      subtitle: `${metrics.pending} pendientes`,
      icon: <Wifi className="w-4 h-4" />,
      color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
    },
    {
      id: 'errors',
      title: 'Errores',
      value: metrics.errors,
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
            {metrics.topCategories.slice(0, 3).map(([name, count]) => (
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
            {metrics.topProviders.slice(0, 3).map(([name, count]) => (
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
