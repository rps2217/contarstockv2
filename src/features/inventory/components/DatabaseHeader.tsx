import React from 'react';
import { ChevronLeft, Upload, Loader2, FileSpreadsheet, RefreshCw, BrainCircuit, Download, Cpu, Cloud, Database, ShieldAlert, BadgeCheck, Ghost } from 'lucide-react';
import { ManagementSearchBar } from '../../../shared/components/core/ManagementSearchBar';
import { useNavigate } from 'react-router-dom';

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
 
 const isModelDownloading = props.brainStatus?.status === 'downloading';
 const isModelReady = props.brainStatus?.status === 'ready';
 const isModelDisabled = props.brainStatus?.status === 'disabled';

 return (
  <div className="shrink-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md py-3 md:py-4 px-4 md:px-6 border-b border-slate-200 dark:border-white/5 shadow-sm sticky top-0">
  <div className="flex flex-col gap-4 max-w-7xl mx-auto">
  
  {/* NIVEL 1: ACCIONES Y LOGO */}
  <div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
  <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-95">
  <ChevronLeft className="w-6 h-6 stroke-[3px]" />
  </button>
  <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2 truncate leading-none">
                   CATÁLOGO
                 </h1>
                 <span className="text-[9px] md:text-[10px] font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md uppercase tracking-widest hidden sm:inline-block">
                   {props.usedMb} MB Usados
                 </span>
               </div>
             </div>
  </div>
 
 <div className="flex gap-2">
 {!isModelReady && !isModelDownloading && !isModelDisabled && (
 <button 
 onClick={props.onInitializeBrain}
 className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-2 animate-pulse"
 >
 <Download className="w-3.5 h-3.5" /> Instalar IA
 </button>
 )}
 </div>
 </div>
 
 {/* BOTÓN FORZAR SUBIDA (MÓVIL) - MÁS COMPACTO */}
 <div className="md:hidden grid grid-cols-2 gap-2">
   <button 
    onClick={() => {
      if (confirm('¿Desea forzar la subida de TODO el catálogo local a la nube? Esto puede tomar tiempo.')) {
        props.onForceSync?.();
      }
    }}
    disabled={props.isSyncing}
    className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-indigo-200 dark:border-indigo-500/20"
   >
    {props.isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
    Forzar Nube
   </button>
   <button 
    onClick={props.onImport}
    className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-emerald-200 dark:border-emerald-500/20"
   >
    <FileSpreadsheet className="w-4 h-4" />
    Importar CSV
   </button>
 </div>

 {/* NIVEL 2: BÚSQUEDA Y ACCIONES */}
 <ManagementSearchBar 
   searchQuery={""} 
   setSearchQuery={props.onSearch}
   onOpenFilters={() => {}} 
   onOpenAdd={props.onCreate}
   onClearFilters={() => props.onSearch('')}
   activeFiltersCount={0}
   placeholder="SKU O NOMBRE..."
   accentColor="blue"
   theme="dark"
   extraActions={
     <div className="flex gap-2">
       {isModelReady && (
         <button 
           onClick={props.onVectorize} 
           disabled={props.isVectorizing || !props.missingVectorsCount}
           className={`hidden sm:flex w-12 h-12 rounded-2xl transition-all relative border items-center justify-center ${
             props.missingVectorsCount 
               ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20 shadow-lg shadow-amber-500/10' 
               : 'bg-white/5 border-white/5 text-slate-600 opacity-40'
           }`}
           title="Entrenar Motor Local"
         >
           {props.isVectorizing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
           {props.missingVectorsCount ? (
             <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-[9px] font-black text-white flex items-center justify-center rounded-full border-2 border-white shadow-sm">
               {props.missingVectorsCount}
             </span>
           ) : null}
         </button>
       )}

       <button 
         onClick={props.onSync} 
         disabled={props.isSyncing}
         className={`w-12 h-12 rounded-2xl transition-all relative border flex items-center justify-center ${
           props.pendingChangesCount > 0 
             ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 hover:bg-indigo-500/20 shadow-lg shadow-indigo-500/10' 
             : 'bg-white/5 border-white/5 text-slate-600'
         }`}
         title="Sincronizar Cambios Pendientes"
       >
         {props.isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
         {props.pendingChangesCount > 0 && (
           <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-500 text-[9px] font-black text-white flex items-center justify-center rounded-full border-2 border-white shadow-sm">
             {props.pendingChangesCount}
           </span>
         )}
       </button>

       <button 
         onClick={props.onDownload} 
         disabled={props.isDownloading} 
         className="w-12 h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-white/10 transition-all"
         title="Sincronizar Catálogo Completo"
       >
         {props.isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
       </button>
       
       <button 
         onClick={props.onImport} 
         className="hidden sm:flex px-4 h-12 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl items-center justify-center gap-2 transition-all border border-emerald-200 dark:border-emerald-500/20 active:scale-95 group shrink-0"
         title="Importar desde Excel/CSV"
       >
         <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition-transform" />
         <span className="text-[10px] font-black uppercase tracking-widest">Importar CSV</span>
       </button>
     </div>
   }
 />

 {/* NIVEL DE AUDITORÍA LOGÍSTICA (NUEVO) */}
 <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
    <button
      onClick={() => props.onPolicyFilterChange('all')}
      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2 ${
        props.policyFilter === 'all' 
          ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
          : 'bg-white dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10 hover:bg-slate-50'
      }`}
    >
      Ver Todo
    </button>
    <button
      onClick={() => props.onPolicyFilterChange('exchange')}
      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2 ${
        props.policyFilter === 'exchange' 
          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
          : 'bg-white dark:bg-white/5 text-indigo-500/70 border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-50'
      }`}
    >
      <BadgeCheck className="w-3 h-3" /> Con Canje
    </button>
    <button
      onClick={() => props.onPolicyFilterChange('loss')}
      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2 ${
        props.policyFilter === 'loss' 
          ? 'bg-rose-600 text-white border-rose-600 shadow-sm' 
          : 'bg-white dark:bg-white/5 text-rose-500/70 border-rose-200 dark:border-rose-500/20 hover:bg-indigo-50'
      }`}
    >
      <ShieldAlert className="w-3 h-3" /> Solo Merma
    </button>
    <button
      onClick={() => props.onPolicyFilterChange('no_info')}
      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2 ${
        props.policyFilter === 'no_info' 
          ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
          : 'bg-white dark:bg-white/5 text-amber-500/70 border-amber-200 dark:border-amber-500/20 hover:bg-amber-500/5'
      }`}
    >
      <Ghost className="w-3 h-3" /> Sin Proveedor
    </button>
    {props.policyFilter === 'no_info' && (
      <button
        onClick={props.onSyncProviders}
        className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-all flex items-center gap-2 animate-in fade-in slide-in-from-left-2"
      >
        <RefreshCw className={`w-3 h-3 ${props.isDownloading ? 'animate-spin' : ''}`} />
        Fijar Políticas
      </button>
    )}
 </div>
 
 {/* NIVEL 3: INDICADORES DE INTEGRIDAD (PROGRESO) */}
 <div className="grid grid-cols-3 gap-1.5 sm:gap-4 py-1">
 {/* BARRA 1: MOTOR IA (AZUL) */}
 <div className="space-y-0.5">
 <div className={`flex justify-between items-center text-[6px] sm:text-[7px] font-black uppercase tracking-widest px-0.5 ${isModelDisabled ? 'text-slate-400' : 'text-blue-500'}`}>
 <span className="flex items-center gap-1 truncate"><Cpu className="w-2 sm:w-2.5 h-2 sm:h-2.5" /> IA</span>
 <span>{isModelDisabled ? 'OFF' : (isModelReady ? '100%' : `${props.brainStatus?.progress || 0}%`)}</span>
 </div>
 <div className={`h-1 sm:h-1.5 w-full rounded-full overflow-hidden ${isModelDisabled ? 'bg-slate-200 dark:bg-slate-800' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
 <div 
 className={`h-full transition-all duration-500 ${isModelDisabled ? 'bg-slate-400' : 'bg-blue-600'} ${isModelDownloading ? 'animate-pulse' : ''}`} 
 style={{ width: `${isModelDisabled ? 0 : (isModelReady ? 100 : (props.brainStatus?.progress || 0))}%` }} 
 />
 </div>
 </div>

 {/* BARRA 2: ENTRENAMIENTO (AMBAR) */}
 <div className="space-y-0.5">
 <div className={`flex justify-between items-center text-[6px] sm:text-[7px] font-black uppercase tracking-widest px-0.5 ${isModelDisabled ? 'text-slate-400' : 'text-amber-500'}`}>
 <span className="flex items-center gap-1 truncate"><BrainCircuit className="w-2 sm:w-2.5 h-2 sm:h-2.5" /> IA Scan</span>
 <span>{isModelDisabled ? 'N/A' : `${props.trainedPercent}%`}</span>
 </div>
 <div className={`h-1 sm:h-1.5 w-full rounded-full overflow-hidden ${isModelDisabled ? 'bg-slate-200 dark:bg-slate-800' : 'bg-amber-100 dark:bg-amber-900/20'}`}>
 <div 
 className={`h-full transition-all duration-500 ${isModelDisabled ? 'bg-slate-400' : 'bg-amber-500'} ${props.isVectorizing && !isModelDisabled ? 'animate-pulse' : ''}`} 
 style={{ width: `${isModelDisabled ? 0 : props.trainedPercent}%` }} 
 />
 </div>
 </div>

 {/* BARRA 3: RESPALDO (INDIGO) */}
 <div className="space-y-0.5">
 <div className="flex justify-between items-center text-[6px] sm:text-[7px] font-black text-indigo-500 uppercase tracking-widest px-0.5">
 <span className="flex items-center gap-1 truncate"><Cloud className="w-2 sm:w-2.5 h-2 sm:h-2.5" /> Nube</span>
 <span>{props.backedUpPercent}%</span>
 </div>
 <div className="h-1 sm:h-1.5 w-full bg-indigo-100 dark:bg-indigo-900/20 rounded-full overflow-hidden">
 <div 
 className={`h-full bg-indigo-600 transition-all duration-500 ${props.isSyncing ? 'animate-pulse' : ''}`} 
 style={{ width: `${props.backedUpPercent}%` }} 
 />
 </div>
 </div>
 </div>

 {/* OVERLAY DE DESCARGA MODELO */}
 {isModelDownloading && (
 <div className="bg-blue-600 text-white p-2 rounded-lg flex items-center justify-between animate-in slide-in-from-top-2">
 <div className="flex items-center gap-2">
 <Loader2 className="w-3 h-3 animate-spin" />
 <span className="text-[8px] font-black uppercase tracking-widest">Descargando cerebro IA...</span>
 </div>
 <span className="text-[8px] font-mono">{props.brainStatus?.details}</span>
 </div>
 )}
 </div>
 </div>
 );
};
