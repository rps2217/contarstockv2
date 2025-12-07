import React, { useState, useCallback } from 'react';
import { Product } from '../types';
import * as productService from '../services/productService';
// UPDATED: Import all sync functions from syncBridge facade
import { importProductsFromAppSheet, syncProductsToAppSheet } from '../services/syncBridge';
import { sanitizeBarcode } from '../services/utils';
import { Plus, Trash2, Package, FileSpreadsheet, Pencil, CheckCircle2, ChevronLeft, ChevronRight, AlertTriangle, Globe, X, Save, CloudDownload, CloudUpload, Loader2, Factory, ArrowRight, XCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SearchBar } from './SearchBar';

const PAGE_SIZE = 50;

interface DatabaseProps {
    onBack?: () => void;
}

export const Database: React.FC<DatabaseProps> = ({ onBack }) => {
  // UI States
  const [debouncedQuery, setDebouncedQuery] = useState(''); 
  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [isDownloadingProducts, setIsDownloadingProducts] = useState(false);

  // Form State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Product>({ barcode: '', name: '', category: '', supplier: '', supplierRut: '' });
  
  // Import State
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [importCount, setImportCount] = useState(0);
  const [importError, setImportError] = useState('');

  // --- LIVE QUERY (OPTIMIZED) ---
  const products = useLiveQuery(async () => {
    const cleanFilter = sanitizeBarcode(debouncedQuery);
    
    if (cleanFilter || debouncedQuery.length > 0) {
        // Search Mode: Query using Indexes
        return await db.products
            .where('barcode').startsWithIgnoreCase(cleanFilter)
            .or('name').startsWithIgnoreCase(debouncedQuery)
            .limit(PAGE_SIZE) 
            .toArray();
    } else {
        // Default Mode: Offset/Limit Pagination
        return await db.products
            .offset(page * PAGE_SIZE)
            .limit(PAGE_SIZE)
            .toArray();
    }
  }, [page, debouncedQuery], []);

  const totalCount = useLiveQuery(() => db.products.count(), [], 0);
  
  // Check for pending changes
  const pendingChangesCount = useLiveQuery(async () => {
      return await db.products.where('syncStatus').anyOf('add', 'edit').count();
  }, [], 0);

  // --- HANDLERS ---

  const handleSearch = useCallback((query: string) => {
      setDebouncedQuery(query);
      setPage(0);
  }, []);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
      setFeedback({ type, msg });
      setTimeout(() => setFeedback(null), 3000);
  };

  const openNewForm = () => {
      setEditingProduct(null);
      setFormData({ barcode: '', name: '', category: '', supplier: '', supplierRut: '' });
      setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
      setEditingProduct(product);
      setFormData({ ...product });
      setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.barcode || !formData.name) return;

    try {
        const cleanBarcode = sanitizeBarcode(formData.barcode);
        await productService.saveProduct({ ...formData, barcode: cleanBarcode });
        
        showFeedback('success', editingProduct ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
        setIsFormOpen(false);
    } catch (err) {
        showFeedback('error', 'Error al guardar el producto');
    }
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
          // CALL BRIDGE FUNCTION
          const count = await importProductsFromAppSheet();
          showFeedback('success', `${count} productos descargados/actualizados`);
      } catch (err: any) {
          showFeedback('error', `Error de descarga: ${err.message}`);
      } finally {
          setIsDownloadingProducts(false);
      }
  };

  const handleImport = async (e: React.FormEvent) => {
      e.preventDefault();
      setImportStatus('loading');
      setImportError('');
      
      try {
          const idMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (!idMatch) throw new Error("URL de hoja no válida.");
          
          const sheetId = idMatch[1];
          const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;

          const response = await fetch(csvUrl);
          if (!response.ok) throw new Error("No se pudo descargar. Verifique que la hoja sea pública.");
          
          const csvText = await response.text();
          const count = await productService.bulkImportProducts(csvText);
          
          setImportCount(count);
          setImportStatus('success');
          setSheetUrl('');
          showFeedback('success', `${count} productos importados exitosamente`);
      } catch (err: any) {
          console.error(err);
          setImportStatus('error');
          setImportError(err.message || "Error desconocido.");
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImportStatus('loading');
      setImportError('');

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const csvText = event.target?.result as string;
              const count = await productService.bulkImportProducts(csvText);
              setImportCount(count);
              setImportStatus('success');
              showFeedback('success', `${count} productos importados exitosamente`);
          } catch (err: any) {
              setImportStatus('error');
              setImportError('Error procesando el archivo CSV.');
          }
      };
      reader.onerror = () => {
          setImportStatus('error');
          setImportError('Error leyendo el archivo.');
      }
      reader.readAsText(file);
  };

  const maxPage = totalCount ? Math.ceil(totalCount / PAGE_SIZE) - 1 : 0;

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 pt-6 min-h-screen bg-slate-50/50">
      
      {/* HEADER & TOOLS */}
      <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm py-4 -mx-4 px-4 border-b border-slate-200/50 mb-6 transition-all">
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
                    <p className="text-slate-500 text-xs font-medium">
                        {totalCount} items registrados
                    </p>
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
                    onClick={openNewForm}
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

      {/* CONTENT AREA */}
      <div className="space-y-4">
        
        {/* DESKTOP TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hidden md:block">
            <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">CODIGO</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">DESCRIPCION</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">MUNDO</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">PROVEEDOR</th>
                        <th className="px-6 py-4 text-right w-24">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {!products || products.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-12 text-center">
                                <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                                <p className="text-slate-400 font-medium italic">
                                    {debouncedQuery ? 'No se encontraron resultados.' : 'Base de datos vacía.'}
                                </p>
                            </td>
                        </tr>
                    ) : products.map(p => (
                        <tr key={p.barcode} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-6 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="font-mono text-blue-600 font-bold bg-blue-50 inline-block px-2.5 py-1 rounded-md text-xs border border-blue-100 group-hover:bg-white group-hover:border-blue-200">
                                        {p.barcode}
                                    </div>
                                    {p.syncStatus && p.syncStatus !== 'synced' && (
                                        <span className={`w-2 h-2 rounded-full ${p.syncStatus === 'add' ? 'bg-green-500' : 'bg-orange-500'}`} title={p.syncStatus === 'add' ? 'Nuevo (No sincronizado)' : 'Modificado (No sincronizado)'}></span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-3 font-medium text-slate-700">{p.name}</td>
                            <td className="px-6 py-3">
                                {p.category ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200 uppercase tracking-wide">
                                        <Globe className="w-3 h-3" /> {p.category}
                                    </span>
                                ) : (
                                    <span className="text-slate-300 text-xs">-</span>
                                )}
                            </td>
                             <td className="px-6 py-3">
                                <div className="text-xs text-slate-600 truncate max-w-[150px]" title={p.supplier}>
                                    {p.supplier || '-'}
                                </div>
                                {p.supplierRut && <div className="text-[10px] text-slate-400 font-mono">{p.supplierRut}</div>}
                            </td>
                            <td className="px-6 py-3 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => openEditForm(p)}
                                        className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-all"
                                        title="Editar"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(p.barcode)}
                                        className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-all"
                                        title="Eliminar"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-3">
            {products?.map(p => (
                <div key={p.barcode} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-start active:scale-[0.99] transition-transform">
                    <div className="flex-1 mr-4">
                        <div className="font-bold text-slate-900 leading-tight mb-1.5 flex items-center gap-2">
                            {p.name}
                            {p.syncStatus && p.syncStatus !== 'synced' && (
                                <span className={`w-2 h-2 rounded-full shrink-0 ${p.syncStatus === 'add' ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                             <div className="text-blue-600 font-mono text-xs font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{p.barcode}</div>
                             {p.category && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-1.5 py-0.5 rounded">{p.category}</div>}
                        </div>
                        {p.supplier && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Factory className="w-3 h-3" /> {p.supplier}
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1">
                        <button onClick={() => openEditForm(p)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(p.barcode)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
            {(!products || products.length === 0) && (
                <div className="text-center py-12">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <span className="text-slate-400 text-sm">Sin resultados</span>
                </div>
            )}
        </div>

        {/* PAGINATION */}
        {!debouncedQuery && totalCount > PAGE_SIZE && (
            <div className="flex justify-center items-center gap-4 pt-4">
                <button 
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
                >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                </button>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                    Página {page + 1} de {maxPage + 1}
                </span>
                <button 
                    onClick={() => setPage(p => Math.min(maxPage, p + 1))}
                    disabled={page >= maxPage}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
                >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                </button>
            </div>
        )}
      </div>

      {/* DANGER ZONE */}
      {totalCount > 0 && (
          <div className="mt-12 border border-red-200 bg-red-50/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                  <div className="bg-red-100 p-2 rounded-lg text-red-600 shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="text-red-900 font-bold text-sm">Zona de Peligro</h3>
                      <p className="text-red-700/70 text-xs mt-1 max-w-md">
                          Esta acción eliminará permanentemente todos los productos. Solo úsala si necesitas reiniciar la base de datos para una nueva importación.
                      </p>
                  </div>
              </div>
              <button 
                  onClick={handleDeleteAll}
                  className="bg-white border-2 border-red-100 text-red-600 hover:bg-red-600 hover:border-red-600 hover:text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-sm w-full md:w-auto"
              >
                  Eliminar Todo
              </button>
          </div>
      )}

      {/* FLOATING ACTION BUTTON (Mobile) */}
      <div className="md:hidden fixed bottom-24 right-5 flex flex-col gap-3 z-30">
        <button 
            onClick={handleDownloadFromCloud}
            disabled={isDownloadingProducts}
            className="w-12 h-12 bg-white text-indigo-600 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50"
        >
            {isDownloadingProducts ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5" />}
        </button>
        <button 
            onClick={handleSyncToCloud}
            disabled={isSyncingProducts}
            className="w-12 h-12 bg-white text-indigo-600 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50 relative"
        >
            {isSyncingProducts ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
            {pendingChangesCount > 0 && !isSyncingProducts && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            )}
        </button>
        <button 
            onClick={() => setIsImportOpen(true)}
            className="w-12 h-12 bg-white text-green-600 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
        >
            <FileSpreadsheet className="w-5 h-5" />
        </button>
        <button 
            onClick={openNewForm}
            className="w-14 h-14 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/40 flex items-center justify-center active:scale-90 transition-transform"
        >
            <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* MODAL: CREATE / EDIT PRODUCT */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
                <button 
                    onClick={() => setIsFormOpen(false)} 
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"
                >
                    <X className="w-6 h-6" />
                </button>
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        {editingProduct ? <Pencil className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                        {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <p className="text-sm text-slate-500">Complete la información del SKU.</p>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Código de Barras</label>
                        <input 
                            required
                            disabled={!!editingProduct}
                            value={formData.barcode}
                            onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 disabled:bg-slate-100"
                            placeholder="Ej. 780123456789"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Descripción</label>
                        <input 
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder="Nombre del producto"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Mundo / Categoría</label>
                            <input 
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                placeholder="Ej. LACTEOS"
                            />
                        </div>
                        <div>
                             <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Proveedor</label>
                             <input 
                                value={formData.supplier}
                                onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                                placeholder="Nombre Prov."
                            />
                        </div>
                    </div>
                    
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center justify-center gap-2 mt-4">
                        <Save className="w-5 h-5" /> Guardar Producto
                    </button>
                </form>
            </div>
        </div>
      )}

      {/* MODAL: IMPORT CSV */}
      {isImportOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
             <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                 <button onClick={() => setIsImportOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"><X className="w-6 h-6" /></button>
                 
                 <div className="text-center mb-6">
                     <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                         <FileSpreadsheet className="w-8 h-8" />
                     </div>
                     <h2 className="text-xl font-bold text-slate-900">Importar Productos</h2>
                     <p className="text-sm text-slate-500 mt-1">Cargue un CSV o use una hoja de Google Sheets pública.</p>
                 </div>

                 {importStatus === 'loading' ? (
                     <div className="py-8 text-center">
                         <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-3" />
                         <p className="text-slate-600 font-bold">Procesando archivo...</p>
                         <p className="text-xs text-slate-400">Esto puede tomar unos segundos.</p>
                     </div>
                 ) : importStatus === 'success' ? (
                     <div className="py-6 text-center">
                         <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                         <h3 className="text-lg font-bold text-slate-900">¡Importación Exitosa!</h3>
                         <p className="text-slate-600 mb-6">Se cargaron {importCount} productos.</p>
                         <button onClick={() => { setIsImportOpen(false); setImportStatus('idle'); }} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold">Cerrar</button>
                     </div>
                 ) : (
                     <>
                        <div className="space-y-4">
                             <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Opción A: Subir Archivo CSV</label>
                                 <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl" />
                             </div>
                             
                             <div className="relative flex py-2 items-center">
                                 <div className="flex-grow border-t border-slate-200"></div>
                                 <span className="flex-shrink-0 mx-4 text-slate-300 text-xs font-bold uppercase">O también</span>
                                 <div className="flex-grow border-t border-slate-200"></div>
                             </div>

                             <form onSubmit={handleImport}>
                                 <label className="text-xs font-bold text-slate-500 uppercase ml-1 block mb-1">Opción B: URL Google Sheet (Pública)</label>
                                 <div className="flex gap-2">
                                     <input 
                                         value={sheetUrl}
                                         onChange={(e) => setSheetUrl(e.target.value)}
                                         className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                                         placeholder="https://docs.google.com/spreadsheets/d/..."
                                     />
                                     <button type="submit" className="bg-green-600 text-white p-3 rounded-xl hover:bg-green-700 transition-colors shadow-sm">
                                         <CloudDownload className="w-5 h-5" />
                                     </button>
                                 </div>
                             </form>
                        </div>
                        {importError && (
                            <div className="mt-4 bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> {importError}
                            </div>
                        )}
                     </>
                 )}
             </div>
          </div>
      )}

    </div>
  );
};
