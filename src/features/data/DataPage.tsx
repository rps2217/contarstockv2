/**
 * DataPage - Página unificada de gestión de datos estilo AppSheet
 * 
 * Optimizada para móvil: tabs compactos, layout full-height
 */

import React, { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database,
  Users,
  Truck,
  ClipboardList,
  Loader2
} from 'lucide-react';

// Lazy imports de las páginas existentes
const InventoryPage = lazy(() => import('../inventory/InventoryPage') as unknown as Promise<{ default: React.ComponentType<any> }>);
const CustomersPage = lazy(() => import('../customers/CustomersPage') as unknown as Promise<{ default: React.ComponentType<any> }>);
const ProvidersPage = lazy(() => import('../suppliers/pages/ProvidersPage') as unknown as Promise<{ default: React.ComponentType<any> }>);
const ExpectedOrdersPage = lazy(() => import('../expected-orders/ExpectedOrdersPage') as unknown as Promise<{ default: React.ComponentType<any> }>);

type DataTab = 'inventory' | 'customers' | 'providers' | 'orders';

interface TabConfig {
  key: DataTab;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  activeBg: string;
}

const TABS: TabConfig[] = [
  { 
    key: 'inventory', 
    label: 'Inventario', 
    shortLabel: 'Prod.',
    icon: Database, 
    color: 'text-blue-400',
    activeBg: 'bg-blue-500/20'
  },
  { 
    key: 'customers', 
    label: 'Clientes', 
    shortLabel: 'Client.',
    icon: Users, 
    color: 'text-cyan-400',
    activeBg: 'bg-cyan-500/20'
  },
  { 
    key: 'providers', 
    label: 'Proveedores', 
    shortLabel: 'Prov.',
    icon: Truck, 
    color: 'text-amber-400',
    activeBg: 'bg-amber-500/20'
  },
  { 
    key: 'orders', 
    label: 'Órdenes', 
    shortLabel: 'Ord.',
    icon: ClipboardList, 
    color: 'text-emerald-400',
    activeBg: 'bg-emerald-500/20'
  },
];

// Componente de loading
const TabLoader = () => (
  <div className="h-full flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
  </div>
);

// Error boundary simple
class TabErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export const DataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DataTab>('inventory');

  const renderContent = () => {
    const fallback = (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-4">
        <p className="text-sm font-medium">Error cargando módulo</p>
        <button 
          onClick={() => setActiveTab(activeTab)}
          className="mt-2 text-xs text-blue-400 hover:underline"
        >
          Reintentar
        </button>
      </div>
    );

    return (
      <TabErrorBoundary fallback={fallback}>
        <Suspense fallback={<TabLoader />}>
          {activeTab === 'inventory' && <InventoryPage />}
          {activeTab === 'customers' && <CustomersPage />}
          {activeTab === 'providers' && <ProvidersPage />}
          {activeTab === 'orders' && <ExpectedOrdersPage />}
        </Suspense>
      </TabErrorBoundary>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Header - Compacto en móvil */}
      <div className="px-3 pt-3 pb-2 shrink-0 bg-slate-900/50">
        <h1 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          Datos
        </h1>
      </div>

      {/* Tabs - Compactos y scrollables */}
      <div className="flex gap-1 px-2 py-2 overflow-x-auto no-scrollbar bg-slate-900/30 border-b border-white/5 shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all shrink-0 ${
                isActive
                  ? `${tab.activeBg} ${tab.color}`
                  : 'text-slate-400 hover:bg-white/5'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DataPage;
