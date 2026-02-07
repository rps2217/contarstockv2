
import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Product } from '../types';
import * as productService from '../services/productService';
import { importProductsFromAppSheet } from '../services/syncManager';
import { syncProductsToAppSheet } from '../services/appsheet';
import { fuzzySearchProducts } from '../services/search';
import { VectorService } from '../services/vectorService';

export const useProductDatabase = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isVectorizing, setIsVectorizing] = useState(false);
    const [vectorProgress, setVectorProgress] = useState({ current: 0, total: 0 });
    const [storageUsage, setStorageUsage] = useState<{ used: number, quota: number } | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    useEffect(() => {
        const checkStorage = async () => {
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                if (estimate.usage && estimate.quota) {
                    setStorageUsage({ used: estimate.usage, quota: estimate.quota });
                }
            }
        };
        checkStorage();
    }, []);

    const products = useLiveQuery(async () => {
        if (!searchQuery) return await db.products.limit(200).toArray();
        const allProducts = await db.products.toArray();
        return await fuzzySearchProducts(allProducts, searchQuery, 50);
    }, [searchQuery], []);

    const pendingChangesCount = useLiveQuery(() => db.products.where('syncStatus').anyOf('add', 'edit').count(), [], 0);
    
    // Filtro robusto para el Badge de notificación
    const missingVectorsCount = useLiveQuery(async () => {
        const all = await db.products.toArray();
        return all.filter(p => !p.embedding || (Array.isArray(p.embedding) && p.embedding.length === 0)).length;
    }, [], 0);

    const showFeedback = useCallback((type: 'success' | 'error', msg: string) => {
        setFeedback({ type, msg });
        setTimeout(() => setFeedback(null), 3000);
    }, []);

    const handleVectorize = async () => {
        if (!navigator.onLine) {
            showFeedback('error', 'Se requiere internet');
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
                showFeedback('error', 'No se detectaron productos nuevos');
            }
        } catch (e: any) {
            console.error("Fallo en vectorización:", e);
            showFeedback('error', e.message || 'Error en IA');
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
        state: { products, pendingChangesCount, missingVectorsCount, isSyncing, isDownloading, isVectorizing, vectorProgress, storageUsage, feedback, searchQuery },
        actions: { setSearchQuery, handleDelete, handleDeleteAll, handleSyncToCloud, handleDownloadFromCloud, handleVectorize, showFeedback }
    };
};
