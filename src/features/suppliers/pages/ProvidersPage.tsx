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
          extraActions={
            <div className="relative shrink-0">
              <button
                onClick={() => setShowExtraMenu(!showExtraMenu)}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all border shrink-0 ${
                  showExtraMenu
                    ? theme === 'dark' ? 'bg-indigo-500 border-indigo-400 text-white shadow-xl shadow-indigo-500/20' : 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : theme === 'dark' ? 'bg-slate-900/50 border-white/10 text-slate-300 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                }`}
                title="Acciones Especiales"
              >
                <Wand2 className={`w-5 h-5 transition-transform duration-200 ${showExtraMenu ? 'rotate-45 text-white' : 'text-slate-400'}`} />
              </button>

              {showExtraMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowExtraMenu(false)} />
                  <div className={`absolute right-0 mt-3 w-64 rounded-3xl border shadow-2xl p-2.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150 origin-top-right ${
                    theme === 'dark' ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-slate-200/50'
                  }`}>
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-1.5 flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Operaciones de Nube</p>
                      {state.isSyncing && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                      )}
                    </div>

                    <div className="space-y-1">
                      {/* Descargar desde la Nube */}
                      <button
                        onClick={() => {
                          setShowExtraMenu(false);
                          actions.handleDownloadFromCloud();
                        }}
                        disabled={state.isSyncing}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-[11px] font-black uppercase tracking-wider transition-colors ${
                          state.isSyncing ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          theme === 'dark' 
                            ? 'text-amber-400 hover:bg-amber-500/10' 
                            : 'text-amber-600 hover:bg-amber-50'
                        }`}
                      >
                        <RefreshCw className={`w-4.5 h-4.5 shrink-0 ${state.isSyncing ? 'animate-spin' : ''}`} />
                        <span>Sincronizar Importación</span>
                      </button>

                      {/* Importar desde CSV */}
                      <label 
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                          theme === 'dark' 
                            ? 'text-indigo-400 hover:bg-indigo-500/10' 
                            : 'text-indigo-600 hover:bg-indigo-50'
                        }`}
                      >
                        <input 
                          type="file" 
                          accept=".csv" 
                          className="hidden" 
                          onChange={(e) => {
                            setShowExtraMenu(false);
                            actions.handleImportCSV(e);
                          }} 
                        />
                        <UploadCloud className="w-4.5 h-4.5 shrink-0 text-indigo-500" />
                        <span>Importar Archivo CSV</span>
                      </label>

                      {/* Subir Respaldo a la Nube */}
                      <button
                        onClick={() => {
                          setShowExtraMenu(false);
                          actions.handleSyncToCloud();
                        }}
                        disabled={state.isSyncing}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-[11px] font-black uppercase tracking-wider transition-colors ${
                          state.isSyncing ? 'opacity-50 cursor-not-allowed' : ''
                        } ${
                          theme === 'dark' 
                            ? 'text-emerald-400 hover:bg-emerald-500/10' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        <UploadCloud className={`w-4.5 h-4.5 shrink-0 ${state.isSyncing ? 'animate-bounce' : ''}`} />
                        <span>Respaldar en la Nube</span>
                      </button>

                      {/* Autocompletar */}
                      <button
                        onClick={() => {
                          setShowExtraMenu(false);
                          actions.handleAutoFill();
                        }}
                        className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-left text-[11px] font-black uppercase tracking-wider transition-colors ${
                          theme === 'dark' 
                            ? 'text-slate-300 hover:bg-white/5' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Wand2 className="w-4.5 h-4.5 shrink-0 text-slate-400 dark:text-slate-500" />
                        <span>Autocompletar Catálogo</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          }
        />

        <AnimatePresence>
          {state.showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => actions.setFilterMode('all')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    state.filterMode === 'all'
                      ? theme === 'dark' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                      : theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => actions.setFilterMode('withExchange')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    state.filterMode === 'withExchange'
                      ? theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Con Canje
                </button>
                <button
                  onClick={() => actions.setFilterMode('withoutExchange')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    state.filterMode === 'withoutExchange'
                      ? theme === 'dark' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-rose-100 text-rose-700 border border-rose-200'
                      : theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Sin Canje
                </button>
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

