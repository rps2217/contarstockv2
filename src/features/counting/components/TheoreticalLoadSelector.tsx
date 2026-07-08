/**
 * TheoreticalLoadSelector - Componente reutilizable para seleccionar cargas teóricas
 * 
 * Se usa en:
 * - StartCountingModal (para iniciar conteo con carga teórica)
 * - ImportModal de HammerPage (para importar carga durante sesión)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Database, FileText, Loader2, RefreshCw, Layers, HardDrive,
  ChevronRight, Package, Calendar, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';

import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository';
import { erpService, type ErpManifest } from '@/services/erpService';
import type { ExpectedOrder } from '@/types';

// ============================================================================
// TIPOS
// ============================================================================

export type TheoreticalSource = 'local' | 'cloud' | 'stock';

export interface SelectedLoad {
  id: string;
  name: string;
  source: TheoreticalSource;
  skuCount: number;
}

export interface TheoreticalLoadSelectorProps {
  selectedLoad: SelectedLoad | null;
  onSelectLoad: (load: SelectedLoad | null) => void;
  isLoading?: boolean;
  compact?: boolean;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const TheoreticalLoadSelector: React.FC<TheoreticalLoadSelectorProps> = ({
  selectedLoad,
  onSelectLoad,
  isLoading: externalLoading,
  compact = false,
}) => {
  // Estado
  const [activeTab, setActiveTab] = useState<TheoreticalSource>('local');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [localOrders, setLocalOrders] = useState<ExpectedOrder[]>([]);
  const [cloudManifests, setCloudManifests] = useState<ErpManifest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Consultar órdenes locales reactivamente
  const localOrdersData = useLiveQuery(async () => {
    return await ExpectedOrderRepository.getAll();
  }, []);

  // Sincronizar con estado local
  useEffect(() => {
    if (localOrdersData) {
      setLocalOrders(localOrdersData);
    }
  }, [localOrdersData]);

  // Cargar datos de la nube
  const loadCloudData = async () => {
    setLoadingCloud(true);
    try {
      const manifests = await erpService.downloadAllPendingManifests();
      setCloudManifests(manifests || []);
    } catch (err) {
      console.error('Error loading cloud manifests:', err);
      toast.error('Error al cargar manifiestos de la nube');
    } finally {
      setLoadingCloud(false);
    }
  };

  // Cargar cuando cambia el tab a cloud
  useEffect(() => {
    if (activeTab === 'cloud' && cloudManifests.length === 0) {
      loadCloudData();
    }
  }, [activeTab]);

  // Filtrar órdenes por búsqueda
  const filteredLocalOrders = useMemo(() => {
    if (!searchQuery.trim()) return localOrders;
    const query = searchQuery.toLowerCase();
    return localOrders.filter(order => {
      const name = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id;
      return name.toLowerCase().includes(query);
    });
  }, [localOrders, searchQuery]);

  // Refrescar datos
  const handleRefresh = () => {
    if (activeTab === 'local') {
      setLoadingLocal(true);
      ExpectedOrderRepository.getAll().then(orders => {
        setLocalOrders(orders || []);
        setLoadingLocal(false);
      });
    } else if (activeTab === 'cloud') {
      loadCloudData();
    }
  };

  // Seleccionar carga
  const handleSelectLoad = (load: SelectedLoad) => {
    if (selectedLoad?.id === load.id) {
      onSelectLoad(null);
    } else {
      onSelectLoad(load);
    }
  };

  // Estilo de tabs
  const tabs: { id: TheoreticalSource; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'local', label: 'Locales', icon: HardDrive, count: localOrders.length },
    { id: 'cloud', label: 'Nube', icon: Layers, count: cloudManifests.length },
    { id: 'stock', label: 'Stock', icon: Database },
  ];

  const isLoading = externalLoading || loadingLocal || loadingCloud;

  return (
    <div className={cn('space-y-4', compact && 'space-y-2')}>
      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                isActive
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'text-secondary hover:text-primary hover:bg-elevated'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                  isActive ? 'bg-white/20' : 'bg-elevated'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barra de búsqueda (solo para locales) */}
      {activeTab === 'local' && !compact && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar carga..."
            className="w-full pl-9 pr-4 py-2 bg-surface border border-subtle rounded-xl text-sm text-primary placeholder:text-muted focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* Lista de opciones */}
      <div className={cn('space-y-2 overflow-y-auto', compact ? 'max-h-[200px]' : 'max-h-[300px]')}>
        {/* Locales */}
        {activeTab === 'local' && (
          isLoading && localOrders.length === 0 ? (
            <LoadingState />
          ) : filteredLocalOrders.length === 0 ? (
            <EmptyState
              icon={HardDrive}
              title="Sin cargas locales"
              description="Sube un Excel o pega datos en 'Cargas Teóricas'"
            />
          ) : (
            filteredLocalOrders.map((order) => {
              const displayName = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id;
              const skuCount = order.items?.length || 0;
              const isSelected = selectedLoad?.id === order.id && selectedLoad?.source === 'local';
              
              return (
                <LoadCard
                  key={order.id}
                  icon={HardDrive}
                  iconColor="text-emerald-400"
                  iconBg="bg-emerald-500/10"
                  title={displayName}
                  subtitle={`ID: ${order.id.slice(0, 8)}... • ${order.metadata?.date || 'Sin fecha'}`}
                  skuCount={skuCount}
                  isSelected={isSelected}
                  onClick={() => handleSelectLoad({
                    id: order.id,
                    name: displayName,
                    source: 'local',
                    skuCount,
                  })}
                  compact={compact}
                />
              );
            })
          )
        )}

        {/* Nube */}
        {activeTab === 'cloud' && (
          isLoading && cloudManifests.length === 0 ? (
            <LoadingState />
          ) : cloudManifests.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="Sin cargas en la nube"
              description="Sincroniza para ver manifiestos del ERP"
            />
          ) : (
            cloudManifests.map((manifest) => {
              const skuCount = manifest.items?.length || 0;
              const isSelected = selectedLoad?.id === manifest.id && selectedLoad?.source === 'cloud';
              
              return (
                <LoadCard
                  key={manifest.id}
                  icon={Layers}
                  iconColor="text-indigo-400"
                  iconBg="bg-indigo-500/10"
                  title={manifest.id}
                  subtitle={manifest.description || 'Manifiesto del ERP'}
                  skuCount={skuCount}
                  isSelected={isSelected}
                  onClick={() => handleSelectLoad({
                    id: manifest.id,
                    name: manifest.id,
                    source: 'cloud',
                    skuCount,
                  })}
                  compact={compact}
                />
              );
            })
          )
        )}

        {/* Stock General */}
        {activeTab === 'stock' && (
          <LoadCard
            icon={Database}
            iconColor="text-amber-400"
            iconBg="bg-amber-500/10"
            title="Stock Teórico General"
            subtitle="Base de datos completa de productos"
            skuCount={undefined}
            isSelected={selectedLoad?.id === '__STOCK_GENERAL__'}
            onClick={() => handleSelectLoad({
              id: '__STOCK_GENERAL__',
              name: 'Stock General',
              source: 'stock',
              skuCount: -1,
            })}
            compact={compact}
          />
        )}
      </div>

      {/* Botón de actualizar */}
      {activeTab !== 'stock' && (
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="w-full py-2 text-xs text-secondary hover:text-primary flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          Actualizar listado
        </button>
      )}

      {/* Info de selección */}
      {selectedLoad && (
        <div className={cn(
          'p-3 rounded-xl border',
          selectedLoad.source === 'local' ? 'bg-emerald-500/10 border-emerald-500/30' :
          selectedLoad.source === 'cloud' ? 'bg-indigo-500/10 border-indigo-500/30' :
          'bg-amber-500/10 border-amber-500/30'
        )}>
          <p className="text-sm font-medium text-primary">
            {selectedLoad.name}
            {selectedLoad.skuCount > 0 && ` (${selectedLoad.skuCount} SKUs)`}
          </p>
          <p className="text-xs text-secondary mt-1">
            {selectedLoad.source === 'local' && 'Los datos se sincronizarán automáticamente'}
            {selectedLoad.source === 'cloud' && 'Manifiesto del ERP'}
            {selectedLoad.source === 'stock' && 'Usará toda la base de datos de productos'}
          </p>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const LoadCard = ({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  skuCount,
  isSelected,
  onClick,
  compact = false,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  skuCount?: number;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full text-left rounded-xl border transition-all flex items-center gap-3',
      'hover:scale-[1.01] active:scale-[0.99]',
      isSelected
        ? 'bg-blue-500/10 border-blue-500/50'
        : 'bg-surface/50 border-subtle hover:bg-surface hover:border-blue-500/30'
    )}
  >
    <div className={cn('rounded-lg flex items-center justify-center shrink-0', iconBg, compact ? 'w-8 h-8' : 'w-10 h-10')}>
      <Icon className={cn(iconColor, compact ? 'w-4 h-4' : 'w-5 h-5')} />
    </div>
    <div className="flex-1 min-w-0 py-2">
      <p className={cn('font-semibold truncate', isSelected ? 'text-blue-400' : 'text-primary', compact ? 'text-xs' : 'text-sm')}>
        {title}
      </p>
      {subtitle && (
        <p className={cn('text-muted truncate', compact ? 'text-[10px]' : 'text-xs')}>
          {subtitle}
        </p>
      )}
    </div>
    {skuCount !== undefined && skuCount > 0 && (
      <span className={cn(
        'bg-elevated text-secondary rounded-lg shrink-0',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      )}>
        {skuCount} SKUs
      </span>
    )}
    <ChevronRight className={cn('w-5 h-5 shrink-0 mr-2', isSelected ? 'text-blue-400' : 'text-muted')} />
  </button>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-12">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
  </div>
);

const EmptyState = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <div className="text-center py-8 bg-surface/50 rounded-xl border border-dashed border-subtle">
    <Icon className={cn('w-10 h-10 text-muted mx-auto mb-3')} />
    <p className="text-sm text-secondary">{title}</p>
    <p className="text-xs text-muted mt-1">{description}</p>
  </div>
);

export default TheoreticalLoadSelector;
