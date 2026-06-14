import React, { useState, useEffect } from 'react';
import { ManagementSearchBar } from '@/shared/components/core/ManagementSearchBar';
import { 
  ChevronLeft, 
  FileSpreadsheet, 
  RefreshCw, 
  Download, 
  Cpu, 
  ShieldAlert, 
  BadgeCheck, 
  Ghost
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@/store/mainAppStore';

interface Props {
  usedMb: string;
  usagePercent: number;
  isDownloading: boolean;
  isSyncing: boolean;
  isVectorizing?: boolean;
  missingVectorsCount?: number;
  trainedPercent?: number;
  backedUpPercent?: number;
  pendingChangesCount: number;
  searchQuery?: string;
  onSearch: (q: string) => void;
  onDownload: () => void;
  onSync: () => void;
  onForceSync?: () => void;
  onVectorize?: () => void;
  onInitializeBrain?: () => void; 
  onImport: () => void;
  onCreate: () => void;
  onSyncProviders: () => void;
  policyFilter: 'all' | 'exchange' | 'loss' | 'no_info';
  onPolicyFilterChange: (filter: 'all' | 'exchange' | 'loss' | 'no_info') => void;
  vectorProgress?: { current: number, total: number };
  brainStatus?: { status: string, progress: number, details?: string };
}

export const DatabaseHeader: React.FC<Props> = (props) => {
  const navigate = useNavigate();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(props.searchQuery || '');
  const [isFocused, setIsFocused] = useState(false);

  const isModelDownloading = props.brainStatus?.status === 'downloading';
  const isModelReady = props.brainStatus?.status === 'ready';
  const isModelDisabled = props.brainStatus?.status === 'disabled';
  
  const setSystemHubOpen = useAppStore(state => state.setSystemHubOpen);

  // Synchronize localQuery if props change
  useEffect(() => {
    if (props.searchQuery !== undefined) {
      setLocalQuery(props.searchQuery);
    }
  }, [props.searchQuery]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      props.onSearch(localQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [localQuery]);

  return (
    <div className="shrink-0 z-30 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md py-4 px-4 md:px-6 border-b border-slate-200 dark:border-white/5 shadow-sm sticky top-0">
      <div className="flex flex-col gap-4 max-w-7xl mx-auto">
        
        {/* ROW 1: Header Brand Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-95"
              title="Volver al inicio"
            >
              <ChevronLeft className="w-6 h-6 stroke-[3px]" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2 truncate leading-none">
                  CATÁLOGO
                </h1>
                <span className="text-[9px] md:text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-md uppercase tracking-widest hidden sm:inline-block">
                  {props.usedMb} MB Usados
                </span>
              </div>
            </div>
          </div>
         
          <div className="flex gap-2">
            {!isModelReady && !isModelDownloading && !isModelDisabled && (
              <button 
                onClick={props.onInitializeBrain}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2 animate-pulse"
              >
                <Download className="w-3.5 h-3.5" /> Instalar IA
              </button>
            )}

            <button
              onClick={() => setSystemHubOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/10 transition-all active:scale-95"
            >
              <Cpu className="w-4 h-4" />
              <span>Nube y Motor</span>
            </button>
          </div>
        </div>

        {/* ROW 2: SEARCH INPUT HERO - Absolute Protagonist from ManagementSearchBar */}
        <div className="w-full">
          <ManagementSearchBar
            searchQuery={props.searchQuery || ''}
            setSearchQuery={props.onSearch}
            onOpenFilters={() => setIsPanelOpen(!isPanelOpen)}
            onOpenAdd={props.onCreate}
            onClearFilters={() => props.onPolicyFilterChange('all')}
            activeFiltersCount={props.policyFilter !== 'all' ? 1 : 0}
            placeholder="SKU O NOMBRE DEL PRODUCTO..."
            accentColor="indigo"
            theme="dark"
          />
        </div>

        {/* Collapsible Control Panel (for Mobile & Desktop) */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden rounded-2xl border bg-stone-50 border-stone-200 dark:bg-slate-950/75 dark:border-white/5 shadow-2xl backdrop-blur-md"
            >
              <div className="p-4 md:p-6 flex flex-col gap-5">
                
                {/* 1. Policy status filter */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                    Auditoría Logística y Filtros de Políticas
                  </span>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <button
                      onClick={() => props.onPolicyFilterChange('all')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        props.policyFilter === 'all'
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20'
                          : 'bg-white dark:bg-white/5 border-stone-200 dark:border-white/5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      <div className="text-[9px] uppercase font-black tracking-wider text-stone-400 dark:text-stone-500">Universo</div>
                      <div className="text-sm font-black mt-1 italic uppercase">Ver Todo</div>
                    </button>

                    <button
                      onClick={() => props.onPolicyFilterChange('exchange')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        props.policyFilter === 'exchange'
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20'
                          : 'bg-white dark:bg-white/5 border-stone-200 dark:border-white/5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      <div className="text-[9px] uppercase font-black tracking-wider text-stone-400 dark:text-stone-500">Garantía</div>
                      <div className="text-sm font-black mt-1 italic uppercase flex items-center gap-1.5 truncate">
                        <BadgeCheck className="w-4 h-4 text-indigo-550 dark:text-indigo-400 shrink-0" /> Canjeable
                      </div>
                    </button>

                    <button
                      onClick={() => props.onPolicyFilterChange('loss')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        props.policyFilter === 'loss'
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20'
                          : 'bg-white dark:bg-white/5 border-stone-200 dark:border-white/5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      <div className="text-[9px] uppercase font-black tracking-wider text-stone-400 dark:text-stone-500">Pérdida</div>
                      <div className="text-sm font-black mt-1 italic uppercase flex items-center gap-1.5 truncate">
                        <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" /> Solo Merma
                      </div>
                    </button>

                    <button
                      onClick={() => props.onPolicyFilterChange('no_info')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        props.policyFilter === 'no_info'
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-500/20'
                          : 'bg-white dark:bg-white/5 border-stone-200 dark:border-white/5 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      <div className="text-[9px] uppercase font-black tracking-wider text-stone-400 dark:text-stone-500">Incógnito</div>
                      <div className="text-sm font-black mt-1 italic uppercase flex items-center gap-1.5 truncate">
                        <Ghost className="w-4 h-4 text-amber-500 shrink-0" /> Sin Proveedor
                      </div>
                    </button>
                  </div>

                  {props.policyFilter === 'no_info' && (
                    <button
                      onClick={props.onSyncProviders}
                      className="mt-1 w-full sm:w-auto py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 animate-in fade-in"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${props.isDownloading ? 'animate-spin' : ''}`} />
                      Fijar Políticas de Proveedor
                    </button>
                  )}
                </div>

                {/* 2. Simplified Actions Section */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-200 dark:border-white/5 pt-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                      Sincronización y Configuración
                    </span>
                    <span className="text-[9px] font-medium text-stone-500">
                      Acceso rápido a herramientas de integridad de datos
                    </span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={props.onImport}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Importar CSV
                    </button>
                    
                    <button
                      onClick={() => setSystemHubOpen(true)}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 rounded-xl hover:bg-indigo-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      <Cpu className="w-4 h-4" />
                      Consola de Sincronización
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OVERLAY DE DESCARGA MODELO */}
        {isModelDownloading && (
          <div className="bg-blue-600 text-white p-2.5 rounded-xl flex items-center justify-between text-xs font-bold animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="uppercase tracking-widest text-[10px]">Descargando cerebro IA...</span>
            </div>
            <span className="font-mono text-[10px]">{props.brainStatus?.details}</span>
          </div>
        )}

      </div>
    </div>
  );
};
