
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAppStore } from '../../../store/mainAppStore';
import { Product, Provider } from '../../../types';
import * as productService from '../../../services/productService';
import { importProductsFromCloud, importProvidersFromCloud } from '../../../services/syncManager';
import { syncProductsToCloud, syncProvidersToCloud } from '../../../services/cloudSync';
import { fuzzySearchProducts } from '../../../services/search';
import { VectorService } from '../../../services/vectorService';
import { localBrain } from '../../../services/localBrain';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { db } from '../../../db';
import { normalizeIdentity } from '../../../services/utils';

export const useProductDatabase = () => {
 const [searchQuery, setSearchQuery] = useState('');
 const [policyFilter, setPolicyFilter] = useState<'all' | 'exchange' | 'loss' | 'no_info'>('all');
 const [isSyncing, setIsSyncing] = useState(false);
 const [isDownloading, setIsDownloading] = useState(false);
 
 // Estados de Motor IA
 const [brainStatus, setBrainStatus] = useState({ status: 'idle', progress: 0, details: '' });
 const [isVectorizing, setIsVectorizing] = useState(false);
 const [vectorProgress, setVectorProgress] = useState({ current: 0, total: 0 });
 
 const [storageUsage, setStorageUsage] = useState<{ used: number, quota: number } | null>(null);
 const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

 // MOTOR DE NORMALIZACIÓN DE IDENTIDAD (RUT/SKU)
 const norm = normalizeIdentity;

 useEffect(() => {
 const unsubscribe = localBrain.subscribe((status, progress, details) => {
 setBrainStatus({ status, progress, details: details || '' });
 });

 const checkStorage = async () => {
 if (navigator.storage && navigator.storage.estimate) {
 const estimate = await navigator.storage.estimate();
 if (estimate.usage && estimate.quota) {
 setStorageUsage({ used: estimate.usage, quota: estimate.quota });
 }
 }
 };
 checkStorage();

 return () => { unsubscribe(); };
 }, []);

 // CONSULTAS DE INTEGRIDAD (Dashboard de Barras)
  const stats = useLiveQuery(async () => {
    const { total, synced } = await productRepository.getQuickStats();
    if (total === 0) return { trainedPercent: 0, backedUpPercent: 0, missingVectors: 0 };

  return {
  trainedPercent: 100,
  backedUpPercent: Math.round((synced / total) * 100),
  missingVectors: 0
  };
  }, []);

 const products = useLiveQuery(async () => {
  let baseProducts: Product[];
  if (!searchQuery) {
   baseProducts = await productRepository.getLimited(policyFilter === 'all' ? 200 : 1000); 
  } else {
   baseProducts = await productRepository.search(searchQuery, 200);
   if (baseProducts.length === 0 && searchQuery.length > 3) {
     const sample = await productRepository.getLimited(2000);
     baseProducts = await fuzzySearchProducts(sample, searchQuery, 200);
   }
  }

  // Cruce con proveedores para obtener días de retiro y política de canje
  const providers = await db.providers.toArray();
  const providerMapByRut = new Map<string, Provider>();
  const providerMapByName = new Map<string, Provider>();
  
  providers.forEach(p => {
    if (p.rut) providerMapByRut.set(norm(p.rut), p);
    if (p.name) providerMapByName.set(norm(p.name), p);
  });

  const mappedProducts = baseProducts.map((p: Product) => {
   const pRut = p.supplierRut ? norm(p.supplierRut) : null;
   const pName = p.supplier ? norm(p.supplier) : null;
   
   // Intentar match por RUT, si no, por Nombre (Normalización Robusta)
   const provider = (pRut ? providerMapByRut.get(pRut) : null) || 
                    (pName ? providerMapByName.get(pName) : null);
   
   return {
    ...p,
    withdrawalDays: provider?.withdrawalDays,
    hasExchange: provider?.hasExchange,
    exchangePolicy: provider?.exchangePolicy
   } as any;
  });

  if (policyFilter === 'all') return mappedProducts;

  return mappedProducts.filter(p => {
   if (policyFilter === 'exchange') return p.hasExchange === true;
   if (policyFilter === 'loss') return p.hasExchange === false && p.withdrawalDays !== undefined;
   if (policyFilter === 'no_info') return p.withdrawalDays === undefined;
   return true;
  });
 }, [searchQuery, policyFilter], []);

 const pendingChangesCount = useLiveQuery(() => productRepository.getPendingSyncCount(), [], 0);

 const showFeedback = useCallback((type: 'success' | 'error', msg: string) => {
 setFeedback({ type, msg });
 setTimeout(() => setFeedback(null), 3000);
 }, []);

 const handleInitializeBrain = async () => {
 try {
 await localBrain.init();
 } catch (e) {
 showFeedback('error', 'Error al descargar motor IA');
 }
 };

 const handleVectorize = async () => {
 if (brainStatus.status === 'disabled') {
 showFeedback('error', 'Modo Bajo Rendimiento Activo');
 return;
 }
 if (brainStatus.status !== 'ready') {
 showFeedback('error', 'Instale el motor IA primero');
 return;
 }
 setIsVectorizing(true);
 try {
 await VectorService.vectorizeMissingProducts((current, total) => {
 setVectorProgress({ current, total });
 });
 showFeedback('success', 'Entrenamiento completo');
 } catch (e) {
 showFeedback('error', 'Fallo en motor neural');
 } finally {
 setIsVectorizing(false);
 }
 };

 const handleSyncToCloud = useCallback(async () => {
 const unsyncedProds = await productRepository.getPendingSync();
 if (unsyncedProds.length === 0) return;
 setIsSyncing(true);
 try {
 await syncProductsToCloud(unsyncedProds);
 showFeedback('success', 'Catálogo sincronizado');
 } catch (err: any) {
 showFeedback('error', err.message);
 } finally {
 setIsSyncing(false);
 }
 }, [showFeedback]);

 const handleForceSyncToCloud = useCallback(async () => {
  const allProds = await productRepository.getLimited(5000); 
 if (allProds.length === 0) {
 showFeedback('error', 'No hay productos locales para subir');
 return;
 }
 setIsSyncing(true);
 try {
 await syncProductsToCloud(allProds);
 showFeedback('success', 'Catálogo completo subido a la nube');
 } catch (err: any) {
 showFeedback('error', err.message);
 } finally {
 setIsSyncing(false);
 }
 }, [showFeedback]);

 const handleDownloadFromCloud = useCallback(async () => {
 setIsDownloading(true);
 try {
 const { useSyncStore } = await import('../../../store/useSyncStore');
 const settings = useAppStore.getState().settings;
 useSyncStore.getState().setTableSyncTime(settings.cloudConfig.productsTableName || 'PRODUCTOS', 0);
 useSyncStore.getState().setTableSyncTime(settings.cloudConfig.providersTableName || 'PROVEEDORES', 0);
 const count = await importProductsFromCloud();
 showFeedback('success', `${count} productos y políticas actualizados`);
 } catch (err: any) {
 showFeedback('error', 'Error en descarga Cloud');
 } finally {
 setIsDownloading(false);
 }
 }, [showFeedback]);

 const handleSyncProviders = useCallback(async () => {
  setIsDownloading(true);
  try {
    const count = await importProvidersFromCloud();
    showFeedback('success', `${count} políticas logísticas actualizadas`);
  } catch (err: any) {
    showFeedback('error', 'Error al sincronizar políticas');
  } finally {
    setIsDownloading(false);
  }
 }, [showFeedback]);

 const handleDelete = useCallback(async (barcode: string) => {
 if (confirm('¿Eliminar producto?')) {
 await productService.deleteProduct(barcode);
 showFeedback('success', 'Producto eliminado');
 }
 }, [showFeedback]);

 const handleDeleteAll = useCallback(async () => {
 if (prompt('Escribe BORRAR para confirmar:') === 'BORRAR') {
 await productService.deleteAllProducts();
 showFeedback('success', 'Base de datos vaciada');
 }
 }, [showFeedback]);

 return {
 state: { 
 products, 
 pendingChangesCount, 
 missingVectorsCount: stats?.missingVectors || 0,
 trainedPercent: stats?.trainedPercent || 0,
 backedUpPercent: stats?.backedUpPercent || 0,
 isSyncing, 
 isDownloading, 
 isVectorizing, 
 vectorProgress, 
 storageUsage, 
 feedback, 
 searchQuery,
 policyFilter,
 brainStatus 
 },
 actions: { 
 setSearchQuery, 
 setPolicyFilter,
 handleDelete, 
 handleDeleteAll, 
 handleSyncToCloud, 
 handleForceSyncToCloud,
 handleDownloadFromCloud, 
 handleSyncProviders,
 handleVectorize, 
 handleInitializeBrain,
 showFeedback 
 }
 };
};

