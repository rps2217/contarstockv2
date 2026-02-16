
import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Product } from '../types';
import * as productService from '../services/productService';
import { importProductsFromAppSheet } from '../services/syncManager';
import { syncProductsToAppSheet } from '../services/appsheet';
import { fuzzySearchProducts } from '../services/search';
import { VectorService } from '../services/vectorService';
import { localBrain } from '../services/localBrain';

export const useProductDatabase = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    
    // Estados separados para IA
    const [brainStatus, setBrainStatus] = useState<{ status: string, progress: number, details?: string }>({ status: 'idle', progress: 0 });
    const [isVectorizing, setIsVectorizing] = useState(false);
    const [vectorProgress, setVectorProgress] = useState({ current: 0, total: 0 });
    
    const [storageUsage, setStorageUsage] = useState<{ used: number, quota: number } | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => {
        // Suscripción al estado del modelo
        const unsubscribe = localBrain.subscribe((status, progress, details) => {
            setBrainStatus({ status, progress, details });
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

    const products = useLiveQuery(async () => {
        if (!searchQuery) return await db.products.limit(200).toArray();
        const allProducts = await db.products.toArray();
        return await fuzzySearchProducts(allProducts, searchQuery, 50);
    }, [searchQuery], []);

    const pendingChangesCount = useLiveQuery(() => db.products.where('syncStatus').anyOf('add', 'edit').count(), [], 0);
    
    const missingVectorsCount = useLiveQuery(async () => {
        const all = await db.products.toArray();
        return all.filter(p => VectorService.needsEmbedding(p)).length;
    }, [], 0);

    const showFeedback = useCallback((type: 'success' | 'error', msg: string) => {
        setFeedback({ type, msg });
        setTimeout(() => setFeedback(null), 3000);
    }, []);

    // ACCIÓN 1: DESCARGAR MOTOR (Botón Dedicado)
    const handleInitializeBrain = async () => {
        try {
            await localBrain.init();
        } catch (e: any) {
            showFeedback('error', 'Error de red al descargar motor.');
        }
    };

    // ACCIÓN 2: ENTRENAR PRODUCTOS (Solo disponible si está descargado)
    const handleVectorize = async () => {
        if (brainStatus.status !== 'ready') {
            showFeedback('error', 'Primero debe instalar el Motor IA.');
            return;
        }

        setIsVectorizing(true);
        setVectorProgress({ current: 0, total: 0 });
        
        try {
            const count = await VectorService.vectorizeMissingProducts((current, total) => {
                setVectorProgress({ current, total });
            });
            
            if (count > 0) {
                showFeedback('success', `${count} productos aprendidos`);
            } else {
                showFeedback('success', 'Catálogo ya optimizado');
            }
        } catch (e: any) {
            console.error("[UI] Fallo en vectorización:", e);
            showFeedback('error', e.message || 'Error en motor IA');
        } finally {
            setIsVectorizing(false);
        }
    };

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

    const handleSyncToCloud = useCallback(async () => {
        const unsyncedProds = await db.products.where('syncStatus').anyOf('add', 'edit').toArray();
        if (unsyncedProds.length === 0) return;
        setIsSyncing(true);
        try {
            await syncProductsToAppSheet(unsyncedProds);
            showFeedback('success', 'Catálogo sincronizado');
        } catch (err: any) {
            showFeedback('error', `Error: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    }, [showFeedback]);

    const handleDownloadFromCloud = useCallback(async () => {
        setIsDownloading(true);
        try {
            const count = await importProductsFromAppSheet();
            showFeedback('success', `${count} productos actualizados`);
        } catch (err: any) {
            showFeedback('error', 'Fallo en descarga');
        } finally {
            setIsDownloading(false);
        }
    }, [showFeedback]);

    return {
        state: { 
            products, 
            pendingChangesCount, 
            missingVectorsCount, 
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
            handleDownloadFromCloud, 
            handleVectorize, 
            handleInitializeBrain, // Nueva acción expuesta
            showFeedback 
        }
    };
};
