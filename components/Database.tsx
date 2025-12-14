
import React, { useState, useCallback, useEffect } from 'react';
import { Product } from '../types';
import * as productService from '../services/productService';
import { importProductsFromAppSheet, syncProductsToAppSheet } from '../services/syncBridge';
import { sanitizeBarcode } from '../services/utils';
import { Plus, Package, FileSpreadsheet, CheckCircle2, ChevronLeft, AlertTriangle, CloudDownload, CloudUpload, Loader2, HardDrive } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SearchBar } from './SearchBar';
import { ProductList } from './database/ProductList';
import { ProductForm } from './database/ProductForm';
import { ImportTools } from './database/ImportTools';

interface DatabaseProps {
    onBack?: () => void;
}

export const Database: React.FC<DatabaseProps> = ({ onBack }) => {
  // UI States
  const [debouncedQuery, setDebouncedQuery] = useState(''); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [isDownloadingProducts, setIsDownloadingProducts] = useState(false);
  
  // Storage Stats
  const [storageUsage, setStorageUsage] = useState<{ used: number, quota: number } | null>(null);

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

  const usagePercent = storageUsage ? Math.min(100, (storageUsage.used / storageUsage.quota) * 100) : 0;
  const usedMb = storageUsage ? (storageUsage.used / 1024 / 1024).toFixed(1) : '0';

  // Form State Control
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // --- LIVE QUERY (PERFORMANCE OPTIMIZED) ---
  const products = useLiveQuery(async () => {
    // 1. If empty, return all (virtual list handles the render load)
    if (!debouncedQuery) {
        return await db.products.toArray();
    }

    const cleanFilter = sanitizeBarcode(debouncedQuery);
    const lowerQuery = debouncedQuery.toLowerCase();

    // 2. PARALLEL INDEX SCAN (O(log N))
    // Instead of loading ALL items to memory and filtering (O(N)), 
    // we query indices directly. This is crucial for 10k+ items.
    
    // Promise.all allows running both DB lookups simultaneously
    const [byCode, byName] = await Promise.all([
        // Prefix match on Barcode Index
        db.products.where('barcode').startsWithIgnoreCase(cleanFilter).toArray(),
        
        // Prefix match on Name Index (Dexie case-insensitive index usage)
        // Note: For full-text 'includes', we'd still need a scan, but 'startsWith' 
        // covers 90% of rapid lookup use cases efficiently.
        db.products.where('name').startsWithIgnoreCase(debouncedQuery).toArray()
    ]);

    // 3. Merge & Deduplicate results
    const resultMap = new Map<string, Product>();
    byCode.forEach(p => resultMap.set(p.barcode, p));
    byName.forEach(p => resultMap.set(p.barcode, p));

    // 4. Fallback: If indices yield too few results, user might be searching 
    // for a substring in the middle of a name. Only THEN do we scan, 
    // but we can limit the scan if needed. For now, we return the index hits.
    // If you need "contains" logic for 50k items, you need a full-text search engine (FlexSearch).
    // For this version, we prioritize Speed over "Middle-of-string" matching for huge DBs.
    
    // However, for small result sets, we can filter the index results further if needed,
    // but here we just return the merged matches.
    
    return Array.from(resultMap.values());

  }, [debouncedQuery], []);

  const totalCount = useLiveQuery(() => db.products.count(), [], 0);
  
  const pendingChangesCount = useLiveQuery(async () => {
      return await db.products.where('syncStatus').anyOf('add', 'edit').count();
  }, [], 0);

  // --- HANDLERS ---
  const handleSearch = useCallback((query: string) => {
      setDebouncedQuery(query);
  }, []);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
      setFeedback({ type, msg });
      setTimeout(() => setFeedback(null), 3000);
  };

  const handleOpenCreate = () => {
      setEditingProduct(null);
      setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
      setEditingProduct(product);
      setIsFormOpen(true);
  };

  const handleDelete = async (barcode: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este producto permanentemente?')) {
        await productService.deleteProduct(barcode);
        showFeedback('success', 'Producto eliminado');
    }
  };

  const handleDeleteAll = async () => {
    const confirmation = prompt('⚠️ PELIGRO ⚠️\n\nEstás a punto de borrar TODA la base de datos de productos.\nPara confirmar, escribe "BORRAR" en el campo de abajo:');
    if (confirmation === 'BORRAR') {
        await productService.deleteAllProducts();
        showFeedback('success', 'Base de datos vaciada completamente');
    }
  };

  const handleSyncToCloud = async () => {
      const unsyncedProds = await db.products.where('syncStatus').anyOf('add', 'edit').toArray();
      if (unsyncedProds.length === 0) return alert('Todos los productos están sincronizados.');
      
      if (!confirm(`Se detectaron ${unsyncedProds.length} cambios pendientes.\n¿Subir cambios a AppSheet?`)) return;

      setIsSyncingProducts(true);
      try {
          await syncProductsToAppSheet(unsyncedProds);
          showFeedback('success', `${unsyncedProds.length} cambios sincronizados con éxito`);
      } catch (err: any) {
          showFeedback('error', `Error: ${err.message}`);
      } finally {
          setIsSyncingProducts(false);
      }
  };

  const handleDownloadFromCloud = async () => {
      if (!confirm('¿Descargar y actualizar productos desde AppSheet? Esto podría sobrescribir datos existentes.')) return;

      setIsDownloadingProducts(true);
      try {
          const count = await importProductsFromAppSheet();
          showFeedback('success', `${count} productos descargados/actualizados`);
      } catch (err: any) {
          showFeedback('error', `Error de descarga: ${err.message}`);
      } finally {
          setIsDownloadingProducts(false);
      }
  };

  const handleImportComplete = (count: number) => {
      showFeedback('success', `${count} productos importados correctamente`);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50/50 pb-24 md:pb-0">
      
      {/* HEADER & TOOLS */}
      <div className="shrink-0 z-30 bg-slate-50/95 backdrop-blur-sm py-4 px-4 border-b border-slate-200/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
                {onBack && (
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Package className="w-6 h-6 text-blue-600" /> Base de Datos
                    </h1>
                    
                    {/* STORAGE METER */}
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-1">
                        <HardDrive className="w-3 h-3" />
                        <span>Almacenamiento: {usedMb} MB</span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(5, usagePercent)}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
                <div className="flex-1 md:w-72">
                    <SearchBar onSearch={handleSearch} placeholder="Buscar por nombre o código..." />
                </div>
                
                {/* CLOUD ACTIONS */}
                <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm relative">
                    <button 
                        onClick={handleDownloadFromCloud}
                        disabled={isDownloadingProducts}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                        title="Descargar Productos de AppSheet"
                    >
                        {isDownloadingProducts ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
                    </button>
                    <div className="w-px bg-slate-200 my-1"></div>
                    <button 
                        onClick={handleSyncToCloud}
                        disabled={isSyncingProducts}
                        className={`p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors relative ${pendingChangesCount > 0 ? 'text-indigo-600' : 'text-slate-600'}`}
                        title="Subir Productos a AppSheet"
                    >
                        {isSyncingProducts ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                        {pendingChangesCount > 0 && !isSyncingProducts && (
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                        )}
                    </button>
                </div>

                <button 
                    onClick={() => setIsImportOpen(true)}
                    className="bg-white border border-slate-200 text-slate-700 hover:border-green-500 hover:text-green-600 px-3 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95"
                    title="Importar de Google Sheets"
                >
                    <FileSpreadsheet className="w-5 h-5" />
                </button>
                
                <button 
                    onClick={handleOpenCreate}
                    className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 active:scale-95"
                >
                    <Plus className="w-4 h-4" /> <span className="hidden md:inline">Nuevo</span>
                </button>
            </div>
          </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedback && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 font-bold text-sm ${
              feedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {feedback.msg}
          </div>
      )}

      {/* CONTENT: PRODUCT LIST (Now takes available space) */}
      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-4 py-4">
          <ProductList 
            products={products}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onDeleteAll={handleDeleteAll}
            hasFilter={!!debouncedQuery}
          />
      </div>

      {/* FLOATING ACTION BUTTON (Mobile) */}
      <div className="md:hidden fixed bottom-24 right-5 flex flex-col gap-3 z-30">
        <button onClick={handleDownloadFromCloud} disabled={isDownloadingProducts} className="w-12 h-12 bg-white text-indigo-600 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50">
            {isDownloadingProducts ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
        </button>
        <button onClick={handleSyncToCloud} disabled={isSyncingProducts} className="w-12 h-12 bg-white text-indigo-600 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50 relative">
            {isSyncingProducts ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
            {pendingChangesCount > 0 && !isSyncingProducts && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
        </button>
        <button onClick={() => setIsImportOpen(true)} className="w-12 h-12 bg-white text-green-600 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform">
            <FileSpreadsheet className="w-5 h-5" />
        </button>
        <button onClick={handleOpenCreate} className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/40 flex items-center justify-center active:scale-90 transition-transform">
            <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* MODALS */}
      <ProductForm 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        initialData={editingProduct} 
        onSaveSuccess={msg => showFeedback('success', msg)} 
      />

      <ImportTools 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImportComplete={handleImportComplete} 
      />

    </div>
  );
};
