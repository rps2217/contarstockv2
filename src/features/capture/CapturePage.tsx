/**
 * CapturePage - Página unificada de captura estilo AppSheet
 * 
 * Optimizada para móvil: tabs compactos, layout full-height
 */

import React, { useState, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Scan, 
  Container,
  FileText, 
  Calendar,
  Zap,
  Loader2
} from 'lucide-react';

// Lazy imports de las páginas existentes
const CountingPage = lazy(() => import('../counting/CountingPage'));
const ReceptionPage = lazy(() => import('../reception/ReceptionPage'));
const EventsPage = lazy(() => import('../events/EventsPage'));
const ExpiryPage = lazy(() => import('../expiry/ExpiryPage'));
const HammerPage = lazy(() => import('../hammer/HammerPage'));

type CaptureTab = 'counting' | 'reception' | 'events' | 'expiry' | 'hammer';

interface TabConfig {
  key: CaptureTab;
  label: string;
  shortLabel: string; // Para móvil
  icon: React.ElementType;
  color: string;
  activeBg: string;
}

const TABS: TabConfig[] = [
  { 
    key: 'counting', 
    label: 'Conteo', 
    shortLabel: 'Conteo',
    icon: Scan, 
    color: 'text-blue-400',
    activeBg: 'bg-blue-500/20'
  },
  { 
    key: 'reception', 
    label: 'Recepción', 
    shortLabel: 'Recep.',
    icon: Container, 
    color: 'text-emerald-400',
    activeBg: 'bg-emerald-500/20'
  },
  { 
    key: 'events', 
    label: 'Eventos', 
    shortLabel: 'Eventos',
    icon: FileText, 
    color: 'text-amber-400',
    activeBg: 'bg-amber-500/20'
  },
  { 
    key: 'expiry', 
    label: 'Vencimiento', 
    shortLabel: 'Vence.',
    icon: Calendar, 
    color: 'text-rose-400',
    activeBg: 'bg-rose-500/20'
  },
  { 
    key: 'hammer', 
    label: 'Masivo', 
    shortLabel: 'Masivo',
    icon: Zap, 
    color: 'text-purple-400',
    activeBg: 'bg-purple-500/20'
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

export const CapturePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CaptureTab>('counting');

  const renderContent = () => {
    const fallback = (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500 p-4">
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
          {activeTab === 'counting' && <CountingPage />}
          {activeTab === 'reception' && <ReceptionPage initialMode="capture" />}
          {activeTab === 'events' && <EventsPage />}
          {activeTab === 'expiry' && <ExpiryPage />}
          {activeTab === 'hammer' && <HammerPage />}
        </Suspense>
      </TabErrorBoundary>
    );
  };

  return (
    <div className="h-full flex flex-col bg-base text-primary overflow-hidden">
      {/* Header - Más compacto en móvil */}
      <div className="px-3 pt-3 pb-2 shrink-0 bg-surface/50">
        <h1 className="text-base font-black uppercase tracking-tight flex items-center gap-2">
          <Scan className="w-4 h-4 text-blue-500" />
          Capturar
        </h1>
      </div>

      {/* Tabs - Compactos y scrollables */}
      <div className="flex gap-1 px-2 py-2 overflow-x-auto no-scrollbar bg-surface/30 border-b border-subtle shrink-0">
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
                  : 'text-secondary hover:bg-surface'
              }`}
            >
              <Icon className="w-3 h-3" />
              {/* Usa etiqueta corta en pantallas pequeñas */}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Content - Ocupa todo el espacio restante */}
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

export default CapturePage;
