
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Product } from '../../../types';
import * as productService from '../../../services/productService';
import { importProductsFromFirestore } from '../../../services/syncManager';
import { syncProductsToCloud } from '../../../services/cloudSync';
import { fuzzySearchProducts } from '../../../services/search';
import { VectorService } from '../../../services/vectorService';
import { localBrain } from '../../../services/localBrain';
import { productRepository } from '../../../repositories/DexieProductRepository';

export const useProductDatabase = () => {
 const [searchQuery, setSearchQuery] = useState('');
 const [isSyncing, setIsSyncing] = useState(false);
 const [isDownloading, setIsDownloading] = useState(false);
 
 // Estados de Motor IA
 const [brainStatus, setBrainStatus] = useState({ status: 'idle', progress: 0, details: '' });
 const [isVectorizing, setIsVectorizing] = useState(false);
 const [vectorProgress, setVectorProgress] = useState({ current: 0, total: 0 });
 
 const [storageUsage, setStorageUsage] = useState<{ used: number, quota: number } | null>(null);
 const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

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
 const all = await productRepository.getAll();
 const total = all.length;
 if (total === 0) return { trainedPercent: 0, backedUpPercent: 0, missingVectors: 0 };

 const trained = all.filter(p => !VectorService.needsEmbedding(p)).length;
 const backedUp = all.filter(p => !VectorService.needsEmbedding(p) && p.syncStatus === 'synced').length;

 return {
 trainedPercent: Math.round((trained / total) * 100),
 backedUpPercent: Math.round((backedUp / trained || 1) * 100),
 missingVectors: total - trained
 };
 }, []);

 const products = useLiveQuery(async () => {
 if (!searchQuery) return await productRepository.getLimited(200);
 const allProducts = await productRepository.getAll();
 return await fuzzySearchProducts(allProducts, searchQuery, 50);
 }, [searchQuery], []);

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
 const allProds = await productRepository.getAll();
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
 const count = await importProductsFromFirestore();
 showFeedback('success', `${count} productos actualizados`);
 } catch (err: any) {
 showFeedback('error', 'Error en descarga Cloud');
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
 brainStatus 
 },
 actions: { 
 setSearchQuery, 
 handleDelete, 
 handleDeleteAll, 
 handleSyncToCloud, 
 handleForceSyncToCloud,
 handleDownloadFromCloud, 
 handleVectorize, 
 handleInitializeBrain,
 showFeedback 
 }
 };
};

// Forced GitHub sync
