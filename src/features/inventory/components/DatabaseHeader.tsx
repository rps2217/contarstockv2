import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Upload, 
  Loader2, 
  FileSpreadsheet, 
  RefreshCw, 
  BrainCircuit, 
  Download, 
  Cpu, 
  Cloud, 
  ShieldAlert, 
  BadgeCheck, 
  Ghost, 
  Search, 
  Filter, 
  Plus,
  X 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

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
  const isDark = true; // We can assume theme is dark/adaptive, or read it if needed. Let's make it look pristine.


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
          </div>
        </div>

        {/* ROW 2: SEARCH INPUT HERO - Absolute Protagonist on both Mobile & Desktop */}
        <div className="flex flex-col md:flex-row gap-3 w-full">
          <div className="relative flex-1 flex items-center min-w-0">
            <div 
              className={`relative flex-1 flex flex-row items-center rounded-2xl border transition-all duration-300 ${
                isFocused 
                  ? 'shadow-[0_0_20px_rgba(99,102,241,0.08)] ring-2 ring-indigo-500/10 border-indigo-500' 
                  : 'border-stone-200 dark:border-white/5'
              } bg-stone-50 dark:bg-black`}
            >
              <Search className={`absolute left-4 w-5 h-5 transition-colors duration-300 ${
                isFocused ? 'text-indigo-500' : 'text-slate-400'
              }`} />
              <input
                type="text"
                placeholder="SKU O NOMBRE DEL PRODUCTO..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full py-3.5 md:py-4 pl-12 pr-28 text-sm font-bold bg-transparent outline-none transition-all placeholder-slate-400 dark:placeholder-slate-500 text-stone-900 dark:text-white"
              />
              <AnimatePresence>
                {localQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => setLocalQuery('')}
                    className="absolute right-3 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 transition-all bg-stone-200/50 hover:bg-stone-300/50 dark:bg-white/5 dark:hover:bg-white/10 text-stone-600 dark:text-slate-300 border border-stone-300/40 dark:border-white/5"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-3 h-3" />
                    <span>Borrar</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-full shrink-0">
            {/* Collapsible Trigger */}
            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className={`h-[48px] md:h-[54px] px-5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all shrink-0 flex items-center justify-center gap-2 ${
                isPanelOpen
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-stone-100 border-stone-200 text-stone-600 dark:bg-slate-900/60 dark:border-white/5 dark:text-stone-300 dark:hover:bg-slate-900/90 dark:hover:text-indigo-400'
              }`}
              title="Ver filtros y opciones avanzadas"
            >
              <Filter className="w-4.5 h-4.5" />
              <span>Filtros</span>
              {props.policyFilter !== 'all' && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            {/* Add actions */}
            <button
              onClick={props.onCreate}
              className="h-[48px] md:h-[54px] px-5 rounded-2xl bg-indigo-500 hover:bg-indigo-650 bg-indigo-600 text-white hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/10 text-xs font-black uppercase tracking-wider shrink-0 flex items-center justify-center gap-2"
              title="Crear un nuevo registro"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Nuevo</span>
            </button>
          </div>
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

                {/* 2. System Status & IA Signals */}
                <div className="flex flex-col gap-2.5 border-t border-stone-200 dark:border-white/5 pt-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">
                    Estado de Integridad y Sincronizaciones IA
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* IA Engine status */}
                    <div className="space-y-1">
                      <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${isModelDisabled ? 'text-stone-400' : 'text-blue-500'}`}>
                        <span className="flex items-center gap-1 truncate"><Cpu className="w-3.5 h-3.5" /> Cerebro IA</span>
                        <span>{isModelDisabled ? 'Inactivo' : (isModelReady ? 'Listo' : `${props.brainStatus?.progress || 0}%`)}</span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden ${isModelDisabled ? 'bg-stone-200 dark:bg-stone-800' : 'bg-blue-100 dark:bg-blue-950/30'}`}>
                        <div 
                          className={`h-full transition-all duration-500 ${isModelDisabled ? 'bg-stone-400' : 'bg-blue-600'} ${isModelDownloading ? 'animate-pulse' : ''}`} 
                          style={{ width: `${isModelDisabled ? 0 : (isModelReady ? 100 : (props.brainStatus?.progress || 0))}%` }} 
                        />
                      </div>
                    </div>

                    {/* IA Vector Training */}
                    <div className="space-y-1">
                      <div className={`flex justify-between items-center text-[10px] font-black uppercase tracking-widest ${isModelDisabled ? 'text-stone-400' : 'text-amber-500'}`}>
                        <span className="flex items-center gap-1 truncate"><BrainCircuit className="w-3.5 h-3.5" /> Entrenamiento</span>
                        <span>{isModelDisabled ? 'N/A' : `${props.trainedPercent}%`}</span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden ${isModelDisabled ? 'bg-stone-200 dark:bg-stone-800' : 'bg-amber-100 dark:bg-amber-950/30'}`}>
                        <div 
                          className={`h-full transition-all duration-500 ${isModelDisabled ? 'bg-stone-400' : 'bg-amber-550 bg-amber-500'} ${props.isVectorizing && !isModelDisabled ? 'animate-pulse' : ''}`} 
                          style={{ width: `${isModelDisabled ? 0 : props.trainedPercent}%` }} 
                        />
                      </div>
                    </div>

                    {/* Backed up status */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1 truncate"><Cloud className="w-3.5 h-3.5" /> Respaldo Cloud</span>
                        <span>{props.backedUpPercent}%</span>
                      </div>
                      <div className="h-2 w-full bg-indigo-100 dark:bg-indigo-950/30 rounded-full overflow-hidden">
                        <div 
                          className={`h-full bg-indigo-600 transition-all duration-500 ${props.isSyncing ? 'animate-pulse' : ''}`} 
                          style={{ width: `${props.backedUpPercent}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Core Database Sync Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-stone-200 dark:border-white/5 pt-4">
                  <span className="text-[10px] font-black text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                    Operaciones de Archivo & Nube
                  </span>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Vectorization Button */}
                    {isModelReady && (
                      <button 
                        onClick={props.onVectorize} 
                        disabled={props.isVectorizing || !props.missingVectorsCount}
                        className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all border text-xs font-bold uppercase tracking-widest relative ${
                          props.missingVectorsCount 
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 shadow-lg shadow-amber-500/10' 
                            : 'bg-stone-200 dark:bg-white/5 border-stone-200 dark:border-white/5 text-stone-400 dark:text-stone-600 opacity-50 cursor-not-allowed'
                        }`}
                        title="Vectores de búsqueda"
                      >
                        {props.isVectorizing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                        <span>Vectorizar ({props.missingVectorsCount || 0})</span>
                      </button>
                    )}

                    {/* Standard Cloud Sync Upload */}
                    <button 
                      onClick={props.onSync} 
                      disabled={props.isSyncing}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all border text-xs font-bold uppercase tracking-widest relative ${
                        props.pendingChangesCount > 0 
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 dark:text-indigo-450 hover:bg-indigo-500/20 shadow-lg' 
                          : 'bg-stone-200 dark:bg-white/5 border-stone-200 dark:border-white/5 text-stone-550 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-white/10'
                      }`}
                      title="Sincronizar cambios locales"
                    >
                      {props.isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      <span>Subir Locales ({props.pendingChangesCount})</span>
                    </button>

                    {/* Standard Cloud Sync Download */}
                    <button 
                      onClick={props.onDownload} 
                      disabled={props.isDownloading} 
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-stone-200 dark:bg-white/5 border border-stone-300 dark:border-white/5 rounded-xl text-stone-600 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest"
                      title="Sincronizar catálogo"
                    >
                      {props.isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      <span>Sync Cloud</span>
                    </button>

                    {/* Force Cloud Sync write */}
                    {props.onForceSync && (
                      <button 
                        onClick={() => {
                          if (confirm('¿Desea forzar la subida de TODO el catálogo local a la nube? Esto puede tomar tiempo.')) {
                            props.onForceSync?.();
                          }
                        }}
                        disabled={props.isSyncing}
                        className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-550/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all text-xs font-bold uppercase tracking-widest"
                        title="Sobreescribir catálogo en la nube con base de datos local"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Forzar Nube</span>
                      </button>
                    )}

                    {/* CSV Importer */}
                    <button 
                      onClick={props.onImport} 
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all text-xs font-bold uppercase tracking-widest"
                      title="Importar CSV"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Importar CSV</span>
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
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="uppercase tracking-widest text-[10px]">Descargando cerebro IA...</span>
            </div>
            <span className="font-mono text-[10px]">{props.brainStatus?.details}</span>
          </div>
        )}

      </div>
    </div>
  );
};
