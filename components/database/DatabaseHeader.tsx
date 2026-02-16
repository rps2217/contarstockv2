
import React from 'react';
import { ChevronLeft, HardDrive, Upload, Loader2, FileSpreadsheet, Plus, RefreshCw, BrainCircuit, Download, Cpu, Cloud, CheckCircle2 } from 'lucide-react';
import { SearchBar } from '../SearchBar';
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
    onVectorize?: () => void;
    onInitializeBrain?: () => void; 
    onImport: () => void;
    onCreate: () => void;
    vectorProgress?: { current: number, total: number };
    brainStatus?: { status: string, progress: number, details?: string };
}

export const DatabaseHeader: React.FC<Props> = (props) => {
    const navigate = useNavigate();
    
    const isModelDownloading = props.brainStatus?.status === 'downloading';
    const isModelReady = props.brainStatus?.status === 'ready';

    return (
        <div className="shrink-0 z-30 bg-white dark:bg-slate-900 py-3 px-4 border-b border-slate-200 dark:border-white/5 shadow-md">
            <div className="flex flex-col gap-3 max-w-6xl mx-auto">
                
                {/* NIVEL 1: ACCIONES Y LOGO */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-90">
                            <ChevronLeft className="w-6 h-6 stroke-[3px]" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">Catálogo</h1>
                            <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                <HardDrive className="w-2.5 h-2.5" />
                                <span>{props.usedMb} MB LOCAL</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                         {!isModelReady && !isModelDownloading && (
                             <button 
                                onClick={props.onInitializeBrain}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-lg active:scale-95 flex items-center gap-2 animate-pulse"
                             >
                                <Download className="w-3.5 h-3.5" /> Instalar IA
                             </button>
                         )}

                         {isModelReady && (
                             <button 
                                onClick={props.onVectorize} 
                                disabled={props.isVectorizing || !props.missingVectorsCount}
                                className={`p-3 rounded-xl transition-all relative ${
                                    props.missingVectorsCount ? 'bg-amber-100 text-amber-700 shadow-md active:scale-95 border-2 border-amber-200' : 'bg-slate-50 dark:bg-white/5 text-slate-400 opacity-40'
                                }`}
                                title="Entrenar Motor Local"
                             >
                                {props.isVectorizing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                                {props.missingVectorsCount ? (
                                    <span className="absolute -top-2 -right-2 min-w-[1.25rem] h-5 px-1 bg-amber-500 text-[9px] font-black text-white flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                        {props.missingVectorsCount}
                                    </span>
                                ) : null}
                            </button>
                         )}

                         <button 
                            onClick={props.onSync} 
                            disabled={props.isSyncing}
                            className={`p-3 rounded-xl transition-all relative ${props.pendingChangesCount > 0 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-white/5 text-slate-400'}`}
                         >
                            {props.isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            {props.pendingChangesCount > 0 && (
                                <span className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 text-[9px] font-black text-white flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                                    {props.pendingChangesCount}
                                </span>
                            )}
                        </button>

                        <button onClick={props.onCreate} className="bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-all">
                            <Plus className="w-5 h-5 stroke-[3px]" />
                        </button>
                    </div>
                </div>
                
                {/* NIVEL 2: BÚSQUEDA */}
                <div className="flex gap-2 w-full">
                    <div className="flex-1"><SearchBar onSearch={props.onSearch} placeholder="Filtrar catálogo..." className="h-11" /></div>
                    <button onClick={props.onDownload} disabled={props.isDownloading} className="w-12 h-11 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl flex items-center justify-center text-slate-400">
                        {props.isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    </button>
                    <button onClick={props.onImport} className="w-12 h-11 bg-slate-900 dark:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg"><FileSpreadsheet className="w-5 h-5" /></button>
                </div>
                
                {/* NIVEL 3: INDICADORES DE INTEGRIDAD (PROGRESO) */}
                <div className="grid grid-cols-3 gap-2 py-1">
                    {/* BARRA 1: MOTOR IA (AZUL) */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[7px] font-black text-blue-500 uppercase tracking-widest px-1">
                            <span className="flex items-center gap-1"><Cpu className="w-2.5 h-2.5" /> IA Engine</span>
                            <span>{isModelReady ? '100%' : `${props.brainStatus?.progress || 0}%`}</span>
                        </div>
                        <div className="h-1.5 w-full bg-blue-100 dark:bg-blue-900/20 rounded-full overflow-hidden">
                            <div 
                                className={`h-full bg-blue-600 transition-all duration-500 ${isModelDownloading ? 'animate-pulse' : ''}`} 
                                style={{ width: `${isModelReady ? 100 : (props.brainStatus?.progress || 0)}%` }} 
                            />
                        </div>
                    </div>

                    {/* BARRA 2: ENTRENAMIENTO (AMBAR) */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[7px] font-black text-amber-500 uppercase tracking-widest px-1">
                            <span className="flex items-center gap-1"><BrainCircuit className="w-2.5 h-2.5" /> Asimilación</span>
                            <span>{props.trainedPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-amber-100 dark:bg-amber-900/20 rounded-full overflow-hidden">
                            <div 
                                className={`h-full bg-amber-500 transition-all duration-500 ${props.isVectorizing ? 'animate-pulse' : ''}`} 
                                style={{ width: `${props.trainedPercent}%` }} 
                            />
                        </div>
                    </div>

                    {/* BARRA 3: RESPALDO (INDIGO) */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-center text-[7px] font-black text-indigo-500 uppercase tracking-widest px-1">
                            <span className="flex items-center gap-1"><Cloud className="w-2.5 h-2.5" /> Nube</span>
                            <span>{props.backedUpPercent}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-indigo-100 dark:bg-indigo-900/20 rounded-full overflow-hidden">
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
