import React from 'react';
import { ChevronLeft, HardDrive, Upload, Loader2, FileSpreadsheet, Plus, RefreshCw, BrainCircuit, Sparkles } from 'lucide-react';
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
    onImport: () => void;
    onCreate: () => void;
}

export const DatabaseHeader: React.FC<Props> = (props) => {
    const navigate = useNavigate();
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
                         {/* BOTÓN CEREBRO IA */}
                         <button 
                            onClick={props.onVectorize} 
                            disabled={props.isVectorizing}
                            className={`p-3 rounded-xl transition-all relative ${props.missingVectorsCount ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}
                            title="Sincronizar Cerebro Semántico"
                         >
                            {props.isVectorizing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                            {props.missingVectorsCount ? (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-[8px] font-black text-white flex items-center justify-center rounded-full border-2 border-white">
                                    !
                                </span>
                            ) : <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-amber-500" />}
                        </button>

                         <button 
                            onClick={props.onSync} 
                            disabled={props.isSyncing}
                            className={`p-3 rounded-xl transition-all relative ${props.pendingChangesCount > 0 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}
                         >
                            {props.isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        </button>

                        <button onClick={props.onCreate} className="bg-blue-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-all">
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
                
                {props.isVectorizing && (
                    <div className="bg-amber-50 border border-amber-100 p-2 rounded-lg flex items-center justify-between">
                        <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest animate-pulse">Entrenando Cerebro IA...</span>
                        <div className="h-1 flex-1 mx-4 bg-amber-200 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-600" style={{ width: `${(props.vectorProgress?.current / props.vectorProgress?.total) * 100}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};