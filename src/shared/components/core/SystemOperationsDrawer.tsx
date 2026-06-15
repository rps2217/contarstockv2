import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Cpu, 
  BrainCircuit, 
  Cloud, 
  Upload, 
  Download, 
  RefreshCw, 
  HardDrive, 
  Activity, 
  Wifi, 
  WifiOff, 
  ShieldAlert, 
  Sparkles, 
  Database,
  FileSpreadsheet,
  CheckCircle,
  HelpCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { useAppStore } from '@/store/mainAppStore';
import { useProductDatabase } from '@/features/inventory/hooks/useProductDatabase';
import { useSyncStore } from '@/store/useSyncStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from 'sonner';

export const SystemOperationsDrawer: React.FC = () => {
  const isSystemHubOpen = useAppStore(state => state.isSystemHubOpen);
  const setSystemHubOpen = useAppStore(state => state.setSystemHubOpen);
  
  // Use core product database hooks inside the drawer for fully reactive tracking
  const { state, actions } = useProductDatabase();
  const isOnline = useNetworkStatus();
  
  const { latencyMs, isSupabaseConnected } = useSyncStore();

  const isModelDownloading = state.brainStatus?.status === 'downloading';
  const isModelReady = state.brainStatus?.status === 'ready';
  const isModelDisabled = state.brainStatus?.status === 'disabled';

  const usedMb = state.storageUsage ? (state.storageUsage.used / 1024 / 1024).toFixed(1) : '0';
  const quotaMb = state.storageUsage ? (state.storageUsage.quota / 1024 / 1024).toFixed(0) : '0';
  const usagePercent = state.storageUsage ? Math.min(100, (state.storageUsage.used / state.storageUsage.quota) * 100) : 0;

  // Sync state toast notifications or feedback mapping
  useEffect(() => {
    if (state.feedback) {
      if (state.feedback.type === 'success') {
        toast.success(state.feedback.msg);
      } else {
        toast.error(state.feedback.msg);
      }
    }
  }, [state.feedback]);

  if (!isSystemHubOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex justify-end">
        {/* Backdrop glass blur overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSystemHubOpen(false)}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* Drawer container body */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-md h-full bg-white dark:bg-[#0d1117] border-l border-slate-200 dark:border-white/5 flex flex-col shadow-2xl pointer-events-auto overflow-hidden text-slate-800 dark:text-slate-100"
        >
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-950 dark:text-white leading-tight">
                  Dispositivo y Nube
                </h2>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Centro de Integridad Operativa
                </p>
              </div>
            </div>
            <button
              onClick={() => setSystemHubOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
            {/* SECTION 1: NETWORK & LATENCY */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span>Canal de Transmisión</span>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  {isOnline ? 'En línea' : 'Local'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-rose-500" />}
                    <span className="text-[9px] font-black uppercase tracking-wider">Red</span>
                  </div>
                  <div className="text-sm font-black mt-1.5 uppercase truncate">
                    {isOnline ? 'Conectado' : 'Sin Internet'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/2">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Latencia</span>
                  </div>
                  <div className="text-sm font-black mt-1.5 truncate">
                    {isOnline && isSupabaseConnected && latencyMs !== null ? `${latencyMs} ms` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: STORAGE CAPACITY */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span>Espacio Local de Base de Datos</span>
                <span>{usedMb} MB / {quotaMb} MB</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 space-y-3">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black uppercase block tracking-tight">Capacidad IndexedDB</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Uso actual de almacenamiento persistente</span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${usagePercent > 80 ? 'bg-rose-500' : 'bg-amber-550 bg-amber-550 bg-amber-500'}`} 
                      style={{ width: `${usagePercent}%` }} 
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <span>{usagePercent.toFixed(1)}% Usado</span>
                    <span>Disponible</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: CLOUD SYNC OPERATIONS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span>Alineamiento con Servidor</span>
                <span className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full text-[9px] font-black">
                  <Cloud className="w-3 h-3" /> RESPALDADO: {state.backedUpPercent}%
                </span>
              </div>

              <div className="p-4 rounded-xl border border-indigo-500/10 dark:border-indigo-500/10 bg-indigo-500/2 dark:bg-indigo-500/2 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 shrink-0">
                    <Database className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-tight block">Cambios de Catálogo Locales</span>
                      <span className="text-xs font-black px-1.5 py-0.5 rounded-md bg-indigo-500 text-white animate-pulse">
                        {state.pendingChangesCount}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mt-0.5">
                      Registros locales modificados sin subir
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={actions.handleSyncToCloud}
                    disabled={state.isSyncing}
                    className="flex items-center justify-center gap-2 max-w-full p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest border border-transparent shadow shadow-indigo-500/10 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {state.isSyncing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    <span>Subir Local</span>
                  </button>

                  <button
                    onClick={actions.handleDownloadFromCloud}
                    disabled={state.isDownloading}
                    className="flex items-center justify-center gap-2 max-w-full p-2.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slave-300 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/5 transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {state.isDownloading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Bajar Nube</span>
                  </button>
                </div>

                <div className="flex gap-2 border-t border-slate-200 dark:border-white/5 pt-3">
                  <button
                    onClick={() => {
                      if (confirm('¿Desea forzar el reemplazo de la base de datos remota con su datos locales?')) {
                        actions.handleForceSyncToCloud();
                      }
                    }}
                    disabled={state.isSyncing}
                    className="flex-1 w-full p-2 text-center text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 dark:hover:bg-white/2 rounded-lg transition-colors border border-transparent hover:border-indigo-500/10"
                  >
                    Forzar Sobrescritura en Nube
                  </button>

                  <button
                    onClick={actions.handleSyncProviders}
                    disabled={state.isDownloading}
                    className="flex-1 w-full p-2 text-center text-[9px] font-black uppercase tracking-widest text-amber-500 hover:text-amber-400 dark:hover:bg-white/2 rounded-lg transition-colors border border-transparent hover:border-amber-500/10"
                  >
                    Fijar Políticas Proveedor
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 4: INTELLIGENCE ENGINE & AI BRAIN */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span>Cerebro Local & NLP Inteligente</span>
                <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 dark:text-amber-400 px-2 py-0.5 rounded-full text-[9px] font-black">
                  <Sparkles className="w-3 h-3" /> VECTORES: {state.trainedPercent}%
                </span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/2 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 shrink-0">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-tight block">Motor IA Cerebro</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                        isModelReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        {isModelReady ? 'LISTO' : (isModelDownloading ? 'DESCARGANDO' : 'INACTIVO')}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mt-0.5">
                      {isModelReady ? 'Modelo Transformers cargado en navegador' : 'Instale el motor IA de búsqueda inteligente'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <span>Estado del Modelo IA</span>
                    <span>{isModelReady ? '100%' : (isModelDownloading ? `${state.brainStatus?.progress || 0}%` : '0%')}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 bg-blue-500 ${isModelDownloading ? 'animate-pulse' : ''}`} 
                      style={{ width: `${isModelReady ? 100 : (state.brainStatus?.progress || 0)}%` }} 
                    />
                  </div>
                  {isModelDownloading && (
                    <div className="text-[9px] font-black text-blue-500 uppercase tracking-wider block">
                      Detalle: {state.brainStatus?.details}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {!isModelReady && !isModelDownloading && (
                    <button
                      onClick={actions.handleInitializeBrain}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98]"
                    >
                      <Download className="w-4 h-4" />
                      <span>Instalar Cerebro NLP</span>
                    </button>
                  )}

                  {isModelReady && (
                    <button
                      onClick={actions.handleVectorize}
                      disabled={state.isVectorizing || !state.missingVectorsCount}
                      className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        state.missingVectorsCount 
                          ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 cursor-pointer' 
                          : 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-650 cursor-not-allowed border border-transparent'
                      }`}
                    >
                      <BrainCircuit className="w-4 h-4" />
                      <span>Vectorizar ({state.missingVectorsCount || 0})</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 5: LOCAL MASSIVE ACTIONS */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span>Mantenimiento Local (Acciones Masivas)</span>
                <span className="flex items-center gap-1.5 bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-[9px] font-black">
                  <ShieldAlert className="w-3 h-3" /> ZONA CRÍTICA
                </span>
              </div>

              <div className="p-4 rounded-xl border border-rose-500/10 bg-rose-500/5 space-y-3">
                <button
                  onClick={async () => {
                    if (window.confirm("¿Estás 100% seguro de que deseas VACIAR todo el catálogo de PRODUCTOS y PROVEEDORES? Esto es irreversible localmente (aunque podrías recuperar desde la nube si hiciste respaldo).")) {
                      const tId = toast.loading('Vaciando maestras de productos y proveedores...');
                      try {
                        const { productRepository } = await import('@/repositories/DexieProductRepository');
                        const { ProviderRepository } = await import('@/repositories/ProviderRepository');
                        await ProviderRepository.clear();
                        await productRepository.deleteAll();
                        toast.success('Maestras locales vaciadas.', { id: tId });
                        // Recargar la página o volver al dashboard puede ser util
                        window.location.reload();
                      } catch (error: any) {
                        toast.error('Error al vaciar maestras: ' + error.message, { id: tId });
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Vaciar Master de Productos y Proveedores
                </button>

                <button
                  onClick={async () => {
                    if (window.confirm("¿Estás seguro de que deseas VACIAR todos los REGISTROS DE VENCIMIENTO? Esta acción eliminará todo tu trabajo local de mermas y canjes.")) {
                      const tId = toast.loading('Vaciando registros de vencimiento...');
                      try {
                        const { expiryRepository } = await import('@/repositories/ExpiryRepository');
                        await expiryRepository.clear();
                        toast.success('Registros de vencimiento vaciados correctamente.', { id: tId });
                        window.location.reload();
                      } catch (error: any) {
                        toast.error('Error al vaciar vencimientos: ' + error.message, { id: tId });
                      }
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 p-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Vaciar Registros de Vencimiento
                </button>
              </div>
            </div>
          </div>

          {/* Drawer Footer Status Area */}
          <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-900/40 text-center flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none">
            <Clock className="w-3.5 h-3.5" />
            <span>Último control: Hace instantes</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
