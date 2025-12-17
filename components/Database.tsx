import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Package, FileSpreadsheet, CheckCircle2, ChevronLeft, AlertTriangle, Download, Upload, Loader2, HardDrive } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { ProductList } from './database/ProductList';
import { ProductForm } from './database/ProductForm';
import { ImportTools } from './database/ImportTools';
import { useProductDatabase } from '../hooks/useProductDatabase';

interface DatabaseProps {
    onBack?: () => void;
}

export const Database: React.FC<DatabaseProps> = ({ onBack }) => {
  // Use Custom Hook for Logic
  const { state, actions } = useProductDatabase();
  
  // Local UI State (Modals)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Derived Values
  const usagePercent = state.storageUsage ? Math.min(100, (state.storageUsage.used / state.storageUsage.quota) * 100) : 0;
  const usedMb = state.storageUsage ? (state.storageUsage.used / 1024 / 1024).toFixed(1) : '0';

  // Local Handlers
  const handleOpenCreate = () => {
      setEditingProduct(null);
      setIsFormOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
      setEditingProduct(product);
      setIsFormOpen(true);
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
                    <SearchBar onSearch={actions.setSearchQuery} placeholder="Buscar por nombre o código..." />
                </div>
                
                {/* CLOUD ACTIONS */}
                <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm relative">
                    <button 
                        onClick={actions.handleDownloadFromCloud}
                        disabled={state.isDownloading}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                        title="Descargar Productos de AppSheet"
                    >
                        {state.isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    </button>
                    <div className="w-px bg-slate-200 my-1"></div>
                    <button 
                        onClick={actions.handleSyncToCloud}
                        disabled={state.isSyncing}
                        className={`p-2 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors relative ${state.pendingChangesCount > 0 ? 'text-indigo-600' : 'text-slate-600'}`}
                        title="Subir Productos a AppSheet"
                    >
                        {state.isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        {state.pendingChangesCount > 0 && !state.isSyncing && (
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
      {state.feedback && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 font-bold text-sm ${
              state.feedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
              {state.feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {state.feedback.msg}
          </div>
      )}

      {/* CONTENT: PRODUCT LIST */}
      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-4 py-4">
          <ProductList 
            products={state.products}
            onEdit={handleOpenEdit}
            onDelete={actions.handleDelete}
            onDeleteAll={actions.handleDeleteAll}
            hasFilter={!!state.searchQuery}
          />
      </div>

      {/* FLOATING ACTION BUTTON (Mobile) */}
      <div className="md:hidden fixed bottom-24 right-5 flex flex-col gap-3 z-30">
        <button onClick={actions.handleDownloadFromCloud} disabled={state.isDownloading} className="w-12 h-12 bg-white text-indigo-600 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50">
            {state.isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        </button>
        <button onClick={actions.handleSyncToCloud} disabled={state.isSyncing} className="w-12 h-12 bg-white text-indigo-600 border border-slate-200 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform disabled:opacity-50 relative">
            {state.isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            {state.pendingChangesCount > 0 && !state.isSyncing && <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
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
        onSaveSuccess={msg => actions.showFeedback('success', msg)} 
      />

      <ImportTools 
        isOpen={isImportOpen} 
        onClose={() => setIsImportOpen(false)} 
        onImportComplete={(count) => actions.showFeedback('success', `${count} productos importados`)} 
      />

    </div>
  );
};