import React, { useState } from 'react';
import { Product } from '../types';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { ProductList } from './database/ProductList';
import { ProductForm } from './database/ProductForm';
import { ImportTools } from './database/ImportTools';
import { DatabaseHeader } from './database/DatabaseHeader';
import { useProductDatabase } from '../hooks/useProductDatabase';

export const Database: React.FC = () => {
  const { state, actions } = useProductDatabase();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const usagePercent = state.storageUsage ? Math.min(100, (state.storageUsage.used / state.storageUsage.quota) * 100) : 0;
  const usedMb = state.storageUsage ? (state.storageUsage.used / 1024 / 1024).toFixed(1) : '0';

  const handleOpenCreate = () => { setEditingProduct(null); setIsFormOpen(true); };
  const handleOpenEdit = (product: Product) => { setEditingProduct(product); setIsFormOpen(true); };

  return (
    <div className="flex flex-col h-screen bg-slate-50/50 dark:bg-black pb-24 md:pb-0">
      <DatabaseHeader 
        usedMb={usedMb}
        usagePercent={usagePercent}
        isDownloading={state.isDownloading}
        isSyncing={state.isSyncing}
        isVectorizing={state.isVectorizing}
        vectorProgress={state.vectorProgress}
        missingVectorsCount={state.missingVectorsCount}
        pendingChangesCount={state.pendingChangesCount}
        onSearch={actions.setSearchQuery}
        onDownload={actions.handleDownloadFromCloud}
        onSync={actions.handleSyncToCloud}
        onVectorize={actions.handleVectorize}
        onImport={() => setIsImportOpen(true)}
        onCreate={handleOpenCreate}
      />

      {state.feedback && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-4 fade-in duration-300 font-bold text-sm ${state.feedback.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
              {state.feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {state.feedback.msg}
          </div>
      )}

      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-4 py-4">
          <ProductList products={state.products} onEdit={handleOpenEdit} onDelete={actions.handleDelete} onDeleteAll={actions.handleDeleteAll} hasFilter={!!state.searchQuery} />
      </div>

      <ProductForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} initialData={editingProduct} onSaveSuccess={msg => actions.showFeedback('success', msg)} />
      <ImportTools isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} onImportComplete={(count) => actions.showFeedback('success', `${count} productos importados`)} />
    </div>
  );
};

export default Database;