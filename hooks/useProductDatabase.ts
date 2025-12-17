import { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Product } from '../types';
import * as productService from '../services/productService';
import { importProductsFromAppSheet } from '../services/syncManager';
import { syncProductsToAppSheet } from '../services/appsheet';
import { fuzzySearchProducts } from '../services/search';

export const useProductDatabase = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [storageUsage, setStorageUsage] = useState<{ used: number, quota: number } | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // --- STORAGE ESTIMATE ---
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

    // --- QUERIES WITH WEB WORKER SEARCH ---
    const products = useLiveQuery(async () => {
        // 1. Fetch raw data from IDB (Fast)
        // If no search, limit to 200 to avoid loading 50k items into memory unnecessarily
        if (!searchQuery) {
            return await db.products.limit(200).toArray();
        }

        // 2. If searching, we need the full dataset to filter
        // Optimization: In a real massive DB, we would use an FTS index or separate table,
        // but for <100k items, loading to memory + Worker is extremely efficient.
        const allProducts = await db.products.toArray();
        
        // 3. Offload processing to Worker (Async)
        return await fuzzySearchProducts(allProducts, searchQuery, 50);
        
    }, [searchQuery], []); // dependency array ensures re-run on query change

    const pendingChangesCount = useLiveQuery(async () => {
        return await db.products.where('syncStatus').anyOf('add', 'edit').count();
    }, [], 0);

    // --- ACTIONS ---
    
    const showFeedback = useCallback((type: 'success' | 'error', msg: string) => {
        setFeedback({ type, msg });
        setTimeout(() => setFeedback(null), 3000);
    }, []);

    const handleDelete = useCallback(async (barcode: string) => {
        if (confirm('¿Estás seguro de que deseas eliminar este producto permanentemente?')) {
            await productService.deleteProduct(barcode);
            showFeedback('success', 'Producto eliminado');
        }
    }, [showFeedback]);

    const handleDeleteAll = useCallback(async () => {
        const confirmation = prompt('⚠️ PELIGRO ⚠️\n\nEstás a punto de borrar TODA la base de datos de productos.\nPara confirmar, escribe "BORRAR" en el campo de abajo:');
        if (confirmation === 'BORRAR') {
            await productService.deleteAllProducts();
            showFeedback('success', 'Base de datos vaciada completamente');
        }
    }, [showFeedback]);

    const handleSyncToCloud = useCallback(async () => {
        const unsyncedProds = await db.products.where('syncStatus').anyOf('add', 'edit').toArray();
        if (unsyncedProds.length === 0) {
            alert('Todos los productos están sincronizados.');
            return;
        }
        
        if (!confirm(`Se detectaron ${unsyncedProds.length} cambios pendientes.\n¿Subir cambios a AppSheet?`)) return;

        setIsSyncing(true);
        try {
            await syncProductsToAppSheet(unsyncedProds);
            showFeedback('success', `${unsyncedProds.length} cambios sincronizados con éxito`);
        } catch (err: any) {
            showFeedback('error', `Error: ${err.message}`);
        } finally {
            setIsSyncing(false);
        }
    }, [showFeedback]);

    const handleDownloadFromCloud = useCallback(async () => {
        if (!confirm('¿Descargar y actualizar productos desde AppSheet? Esto podría sobrescribir datos existentes.')) return;

        setIsDownloading(true);
        try {
            const count = await importProductsFromAppSheet();
            showFeedback('success', `${count} productos descargados/actualizados`);
        } catch (err: any) {
            showFeedback('error', `Error de descarga: ${err.message}`);
        } finally {
            setIsDownloading(false);
        }
    }, [showFeedback]);

    return {
        state: {
            products,
            pendingChangesCount,
            isSyncing,
            isDownloading,
            storageUsage,
            feedback,
            searchQuery
        },
        actions: {
            setSearchQuery,
            handleDelete,
            handleDeleteAll,
            handleSyncToCloud,
            handleDownloadFromCloud,
            showFeedback
        }
    };
};