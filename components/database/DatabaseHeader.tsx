
import React from 'react';
import { ChevronLeft, HardDrive, Upload, Loader2, FileSpreadsheet, Plus, RefreshCw, BrainCircuit, Sparkles, Download, CheckCircle2, AlertTriangle, Wifi, Cpu } from 'lucide-react';
import { SearchBar } from '../SearchBar';
import { useNavigate } from 'react-router-dom';

interface Props {
    usedMb: string;
    usagePercent: number;
    isDownloading: boolean;
    isSyncing: boolean;
    isVectorizing?: boolean;
    missingVectorsCount?: number;
    pendingChangesCount: number;
    onSearch: (q: string) => void;
    onDownload: () => void;
    onSync: () => void;
    onVectorize?: () => void;
    // Nueva prop para iniciar la descarga explícita
    onInitializeBrain?: () => void; 
    onImport: () => void;
    onCreate: () => void;
    vectorProgress?: { current: number, total: number };
    brainStatus?: { status: string, progress: number, details?: string };
}

export const DatabaseHeader: React.FC<Props> = (props) => {
    const navigate = useNavigate();
    
    const isModelDownloading = props.brainStatus?.status === 'downloading';
    const isModelError = props.brainStatus?.status === 'error';
    const isModelReady = props.brainStatus?.status === 'ready';
    const isModelMissing = props.brainStatus?.status === 'idle' || isModelError;

    return (
        <div className="shrink-0 z-30 bg-white dark:bg-slate-900 py-3 px-4 border-b border-slate-200 dark:border-white/5 shadow-md">
            <div className="flex flex-col gap-3 max-w-6xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-90">
                            <ChevronLeft className="w-6 h-6 stroke-[3px]" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Catálogo</h1>
                            <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                <HardDrive className="w-2.5 h-2.5" />
                                <span>{props.usedMb} MB</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                         {/* BOTÓN DEDICADO 1: INSTALAR MOTOR (Si falta) */}
                         {isModelMissing && (
                             <button 
                                onClick={props.onInitializeBrain}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 active:scale-95 flex items-center gap-2 animate-pulse"
                             >
                                <Download className="w-4 h-4" /> Instalar Motor IA
                             </button>
                         )}

                         {/* BOTÓN DEDICADO 2: ENTRENAR (Si ya está listo) */}
                         {isModelReady && (
                             <button 
                                onClick={props.onVectorize} 
                                disabled={props.isVectorizing || !props.missingVectorsCount}
                                className={`p-3 rounded-xl transition-all relative overflow-hidden group ${
                                    props.missingVectorsCount ? 'bg-amber-100 text-amber-700 shadow-md active:scale-95 border-2 border-amber-200' : 'bg-slate-100 dark:bg-white/5 text-slate-400 opacity-60'
                                }`}
                                title="Entrenar Nuevos Productos"
                             >
                                {props.isVectorizing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                                
                                {props.missingVectorsCount ? (
                                    <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 bg-amber-500 text-[9px] font-black text-white flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10 animate-in zoom-in">
                                        {props.missingVectorsCount > 99 ? '99+' : props.missingVectorsCount}
                                    </span>
                                ) : null}
                            </button>
                         )}

                         <button 
                            onClick={props.onSync} 
                            disabled={props.isSyncing}
                            className={`p-3 rounded-xl transition-all relative ${props.pendingChangesCount > 0 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}
                         >
                            {props.isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            {props.pendingChangesCount > 0 && (
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 text-[9px] font-black text-white flex items-center justify-center rounded-full border-2 border-white shadow-sm z-10">
                                    {props.pendingChangesCount}
                                </span>
                            )}
                        </button>

                        <button onClick={props.onCreate} className="bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-all">
                            <Plus className="w-5 h-5 stroke-[3px]" />
                        </button>
                    </div>
                </div>
                
                <div className="flex gap-2 w-full">
                    <div className="flex-1"><SearchBar onSearch={props.onSearch} placeholder="Buscar SKU..." className="h-11" /></div>
                    <button onClick={props.onDownload} disabled={props.isDownloading} className="w-12 h-11 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400">
                        {props.isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    </button>
                    <button onClick={props.onImport} className="w-12 h-11 bg-slate-900 dark:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FileSpreadsheet className="w-5 h-5" /></button>
                </div>
                
                {/* --- BARRA DE ESTADO 1: DESCARGA DEL MODELO (AZUL) --- */}
                {isModelDownloading && (
                    <div className="bg-blue-50 border-2 border-blue-100 p-3 rounded-xl flex flex-col gap-1 shadow-md animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center text-[9px] font-black text-blue-700 uppercase tracking-widest">
                            <span className="flex items-center gap-2"><Download className="w-3 h-3 animate-bounce"/> Descargando Cerebro Local...</span>
                            <span>{props.brainStatus?.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden border border-blue-200">
                            <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${props.brainStatus?.progress}%` }} />
                        </div>
                        <div className="text-[8px] text-blue-500 font-bold text-center mt-0.5 truncate px-2">
                            {props.brainStatus?.details || 'Conectando con CDN...'}
                        </div>
                    </div>
                )}

                {/* --- BARRA DE ESTADO 2: ENTRENAMIENTO (AMBAR) --- */}
                {/* Solo se muestra si NO se está descargando el modelo */}
                {!isModelDownloading && props.isVectorizing && (
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex flex-col gap-1 shadow-sm animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center text-[9px] font-black text-amber-700 uppercase tracking-widest">
                            <span className="flex items-center gap-2"><Cpu className="w-3 h-3 animate-pulse"/> Asimilando Datos (CPU)...</span>
                            <span>{Math.round(((props.vectorProgress?.current || 0) / (props.vectorProgress?.total || 1)) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 ease-out" 
                                style={{ width: `${((props.vectorProgress?.current || 0) / (props.vectorProgress?.total || 1)) * 100}%` }} 
                            />
                        </div>
                        <div className="text-[8px] text-amber-600 font-bold text-center mt-0.5">
                            Procesando {props.vectorProgress?.current} de {props.vectorProgress?.total}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
