
import React from 'react';
import { Package, ChevronLeft, HardDrive, Download, Upload, Loader2, FileSpreadsheet, Plus, RefreshCw } from 'lucide-react';
import { SearchBar } from '../SearchBar';
import { useNavigate } from 'react-router-dom';

interface Props {
    usedMb: string;
    usagePercent: number;
    isDownloading: boolean;
    isSyncing: boolean;
    pendingChangesCount: number;
    onSearch: (q: string) => void;
    onDownload: () => void;
    onSync: () => void;
    onImport: () => void;
    onCreate: () => void;
}

export const DatabaseHeader: React.FC<Props> = (props) => {
    const navigate = useNavigate();
    return (
        <div className="shrink-0 z-30 bg-white dark:bg-slate-900 py-3 px-4 border-b border-slate-200 dark:border-white/5 shadow-md">
            <div className="flex flex-col gap-3 max-w-6xl mx-auto">
                {/* Title Row - Compacta */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-600 dark:text-slate-400 transition-all active:scale-90">
                            <ChevronLeft className="w-6 h-6 stroke-[3px]" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none">
                                Catálogo
                            </h1>
                            <div className="flex items-center gap-1.5 text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">
                                <HardDrive className="w-2.5 h-2.5" />
                                <span>{props.usedMb} MB</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                         <button 
                            onClick={props.onSync} 
                            disabled={props.isSyncing}
                            className={`p-3 rounded-xl transition-all relative ${props.pendingChangesCount > 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}
                         >
                            {props.isSyncing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            {props.pendingChangesCount > 0 && !props.isSyncing && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                                    {props.pendingChangesCount}
                                </span>
                            )}
                        </button>
                        <button onClick={props.onCreate} className="bg-blue-600 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-all shadow-blue-900/20">
                            <Plus className="w-5 h-5 stroke-[3px]" />
                        </button>
                    </div>
                </div>
                
                {/* Search and Import Row */}
                <div className="flex gap-2 w-full">
                    <div className="flex-1">
                        <SearchBar 
                            onSearch={props.onSearch} 
                            placeholder="Buscar SKU..." 
                            className="h-11"
                        />
                    </div>
                    <button 
                        onClick={props.onDownload} 
                        disabled={props.isDownloading}
                        className="w-12 h-11 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 active:scale-95 transition-all"
                    >
                        {props.isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={props.onImport} 
                        className="w-12 h-11 bg-slate-900 dark:bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition-all"
                    >
                        <FileSpreadsheet className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};
