/**
 * TheoreticalLoadSelector - Componente reutilizable para seleccionar cargas teóricas
 * 
 * Diseño responsivo:
 * - Tabs adaptativas para móvil/desktop
 * - Lista scrolleable con altura máxima responsiva
 * - Cards táctiles optimizadas
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Database, FileText, Loader2, RefreshCw, Layers, HardDrive,
  ChevronRight, Search, Check, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useLiveQuery } from 'dexie-react-hooks';

import { ExpectedOrderRepository } from '@/repositories/ExpectedOrderRepository';
import { erpService, type ErpManifest } from '@/services/erpService';
import type { ExpectedOrder } from '@/types';
import { logger } from '@/services/logger';

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
      logger.error('TheoreticalLoadSelector', 'Error loading cloud manifests', { 
        error: err instanceof Error ? err.message : String(err) 
      });
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
      ExpectedOrderRepository.getAll()
        .then(orders => {
          setLocalOrders(orders || []);
          setLoadingLocal(false);
        })
        .catch(err => {
          logger.error('TheoreticalLoadSelector', 'Error refreshing local orders', { error: String(err) });
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
    <div className={cn('space-y-3', compact ? '' : '')}>
      {/* Tabs - Mejoradas para móvil */}
      <div className="flex gap-1.5 p-1 bg-surface rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all',
                'active:scale-[0.98]',
                isActive
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'text-secondary hover:text-primary hover:bg-elevated'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0',
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
      {activeTab === 'local' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar carga..."
            className={cn(
              'w-full pl-9 pr-4 py-2.5 bg-surface border border-subtle rounded-xl text-sm text-primary',
              'placeholder:text-muted focus:outline-none focus:border-blue-500 transition-colors'
            )}
          />
        </div>
      )}

      {/* Lista de opciones */}
      <div className={cn(
        'space-y-2 overflow-y-auto',
        compact ? 'max-h-[180px]' : 'max-h-[240px] sm:max-h-[280px]'
      )}>
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
            filteredLocalOrders.map((order, index) => {
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
                  subtitle={`${order.metadata?.date || 'Sin fecha'} • ${skuCount} SKUs`}
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
                  subtitle={manifest.description || `${skuCount} SKUs`}
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
          className={cn(
            'w-full py-2.5 text-xs text-secondary hover:text-primary',
            'flex items-center justify-center gap-2 transition-colors disabled:opacity-50'
          )}
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
          Actualizar listado
        </button>
      )}

      {/* Info de selección */}
      {selectedLoad && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'p-3 rounded-xl border flex items-center gap-3',
            selectedLoad.source === 'local' ? 'bg-emerald-500/10 border-emerald-500/30' :
            selectedLoad.source === 'cloud' ? 'bg-indigo-500/10 border-indigo-500/30' :
            'bg-amber-500/10 border-amber-500/30'
          )}
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/10">
            <Check className={cn(
              'w-5 h-5',
              selectedLoad.source === 'local' ? 'text-emerald-400' :
              selectedLoad.source === 'cloud' ? 'text-indigo-400' : 'text-amber-400'
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary truncate">
              {selectedLoad.name}
            </p>
            <p className="text-xs text-muted">
              {selectedLoad.source === 'local' && 'Carga local • Se sincronizará automáticamente'}
              {selectedLoad.source === 'cloud' && 'Manifiesto del ERP'}
              {selectedLoad.source === 'stock' && 'Base de datos completa'}
            </p>
          </div>
          {selectedLoad.skuCount > 0 && (
            <span className="px-2 py-1 bg-white/10 rounded-lg text-xs font-medium text-primary shrink-0">
              {selectedLoad.skuCount} SKUs
            </span>
          )}
        </motion.div>
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
      'active:scale-[0.99]',
      isSelected
        ? 'bg-blue-500/15 border-blue-500 shadow-sm'
        : 'bg-surface/50 border-subtle hover:bg-surface hover:border-blue-500/30'
    )}
  >
    <div className={cn(
      'rounded-lg flex items-center justify-center shrink-0',
      iconBg,
      compact ? 'w-9 h-9' : 'w-10 h-10 sm:w-11 sm:h-11'
    )}>
      <Icon className={cn(iconColor, compact ? 'w-4 h-4' : 'w-5 h-5')} />
    </div>
    <div className="flex-1 min-w-0 py-2.5 sm:py-3">
      <p className={cn(
        'font-semibold truncate',
        isSelected ? 'text-blue-400' : 'text-primary',
        compact ? 'text-xs' : 'text-sm'
      )}>
        {title}
      </p>
      {subtitle && (
        <p className={cn('text-muted truncate', compact ? 'text-[10px]' : 'text-xs')}>
          {subtitle}
        </p>
      )}
    </div>
    {isSelected && (
      <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mr-2">
        <Check className="w-4 h-4 text-white" />
      </div>
    )}
    {!isSelected && skuCount !== undefined && skuCount > 0 && (
      <span className={cn(
        'bg-elevated text-secondary rounded-lg shrink-0 mr-2',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
      )}>
        {skuCount}
      </span>
    )}
  </button>
);

const LoadingState = () => (
  <div className="flex items-center justify-center py-8 sm:py-10">
    <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-blue-500 animate-spin" />
  </div>
);

const EmptyState = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <div className="text-center py-6 sm:py-8 bg-surface/50 rounded-xl border border-dashed border-subtle">
    <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-muted mx-auto mb-2" />
    <p className="text-xs sm:text-sm text-secondary">{title}</p>
    <p className="text-[10px] sm:text-xs text-muted mt-1">{description}</p>
  </div>
);

export default TheoreticalLoadSelector;
