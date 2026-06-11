import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Truck, Search, Plus, ShieldAlert, AlertTriangle, CheckCircle2, ChevronRight, Edit2, Trash2, Wand2, UploadCloud, RefreshCw, ShieldCheck } from 'lucide-react';
import { ProviderFormModal } from '../components/ProviderFormModal';
import { ProviderList } from '../components/ProviderList';
import { ManagementSearchBar } from '../../../shared/components/core/ManagementSearchBar';
import { useAppStore } from '../../../store/mainAppStore';
import { useProvidersDatabase } from '../hooks/useProvidersDatabase';

export const ProvidersPage: React.FC = () => {
  const { settings } = useAppStore();
  const theme = settings.theme;
  const tableName = settings?.cloudConfig?.providersTableName || 'PROVEEDORES';
  
  const { state, actions } = useProvidersDatabase(tableName);
  const [showExtraMenu, setShowExtraMenu] = useState(false);

  return (
    <div className={`h-full flex flex-col transition-colors duration-500 ${
      theme === 'dark' ? 'bg-brand-dark text-white' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 shrink-0 transition-colors ${
        theme === 'dark' ? 'bg-brand-surface/50 border-white/5' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none flex items-center gap-3 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <Truck className="w-7 h-7 text-brand-info" />
              {settings.pharmacyName || 'Proveedores'}
            </h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1.5 flex items-center gap-2 ${
              theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
              Políticas de Logística Inversa y Canjes
            </p>
          </div>
        </div>

        <ManagementSearchBar 
          searchQuery={state.search}
          setSearchQuery={actions.setSearch}
          onOpenFilters={() => actions.setShowFilters(!state.showFilters)}
          onOpenAdd={actions.handleOpenAdd}
          onClearFilters={actions.handleClearFilters}
          activeFiltersCount={state.activeFiltersCount}
          placeholder="BUSCAR POR NOMBRE O RUT..."
          accentColor="indigo"
          theme={theme}
        />

        <AnimatePresence>
          {state.showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4 flex flex-col gap-4 border-t border-slate-100 dark:border-white/5 mt-4">
                
                {/* 1. Categorías de Filtro */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                    Filtros de Estado de Canje
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => actions.setFilterMode('all')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        state.filterMode === 'all'
                          ? theme === 'dark' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                          : theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => actions.setFilterMode('withExchange')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        state.filterMode === 'withExchange'
                          ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200'
                          : theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Con Canje
                    </button>
                    <button
                      onClick={() => actions.setFilterMode('withoutExchange')}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        state.filterMode === 'withoutExchange'
                          ? theme === 'dark' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30' : 'bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200'
                          : theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Sin Canje
                    </button>
                  </div>
                </div>

                {/* 2. Operaciones Especiales y Nube */}
                <div className="flex flex-col gap-2 border-t border-slate-100 dark:border-white/5 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                      Operaciones Especiales & Nube
                    </span>
                    {state.isSyncing && (
                      <span className="text-[10px] font-bold text-amber-500 animate-pulse uppercase tracking-wider">
                        Sincronizando...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
                    {/* Descargar desde la Nube */}
                    <button
                      onClick={actions.handleDownloadFromCloud}
                      disabled={state.isSyncing}
                      className={`flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                        theme === 'dark' 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20' 
                          : 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                      } ${state.isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Sincronizar Importación"
                    >
                      <RefreshCw className={`w-4 h-4 shrink-0 ${state.isSyncing ? 'animate-spin' : ''}`} />
                      <span className="truncate">Sincronizar Nube</span>
                    </button>

                    {/* Importar desde CSV */}
                    <label 
                      className={`flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        theme === 'dark' 
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-450 hover:bg-indigo-500/20' 
                          : 'bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100'
                      }`}
                      title="Importar Archivo CSV"
                    >
                      <input 
                        type="file" 
                        accept=".csv" 
                        className="hidden" 
                        onChange={actions.handleImportCSV} 
                      />
                      <UploadCloud className="w-4 h-4 shrink-0 text-indigo-500" />
                      <span className="truncate">Importar CSV</span>
                    </label>

                    {/* Subir Respaldo a la Nube */}
                    <button
                      onClick={actions.handleSyncToCloud}
                      disabled={state.isSyncing}
                      className={`flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                        theme === 'dark' 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                      } ${state.isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Subir a la Nube (Respaldo)"
                    >
                      <UploadCloud className={`w-4 h-4 shrink-0 ${state.isSyncing ? 'animate-bounce' : ''}`} />
                      <span className="truncate">Respaldar Nube</span>
                    </button>

                    {/* Autocompletar */}
                    <button
                      onClick={actions.handleAutoFill}
                      className={`flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl border text-[11px] font-black uppercase tracking-wider transition-all ${
                        theme === 'dark' 
                          ? 'bg-white/5 border-white/10 text-slate-350 hover:bg-white/10' 
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                      title="Autocompletar desde Catálogo"
                    >
                      <Wand2 className="w-4 h-4 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">Autocompletar</span>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto px-4 py-4 pb-24 md:pb-4">
        <ProviderList
          providers={state.filteredProviders}
          onEdit={actions.handleEdit}
          onDelete={actions.handleDelete}
          hasFilter={!!state.search}
          theme={theme}
        />
      </div>

      <ProviderFormModal
        isOpen={state.isFormOpen}
        onClose={actions.handleCloseForm}
        onSave={actions.handleSave}
        initialData={state.editingProvider}
        theme={theme}
      />
    </div>
  );
};

