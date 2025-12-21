
import React from 'react';
import { Package, ChevronLeft, HardDrive, Download, Upload, Loader2, FileSpreadsheet, Plus } from 'lucide-react';
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
        <div className="shrink-0 z-30 bg-slate-50/95 backdrop-blur-sm py-4 px-4 border-b border-slate-200/50">
            <div className="flex flex-col gap-4 max-w-6xl mx-auto">
                {/* Title Row */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <Package className="w-6 h-6 text-blue-600" /> Base de Datos
                            </h1>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium mt-1">
                                <HardDrive className="w-3 h-3" />
                                <span>{props.usedMb} MB</span>
                                <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(5, props.usagePercent)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Botón Nuevo en Mobile (Compacto) */}
                    <button onClick={props.onCreate} className="md:hidden bg-slate-900 text-white p-3 rounded-xl shadow-lg active:scale-95">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Controls Row */}
                <div className="flex flex-col md:flex-row gap-3 w-full">
                    <div className="flex-1">
                        <SearchBar onSearch={props.onSearch} placeholder="Buscar por nombre o código..." />
                    </div>
                    
                    <div className="flex gap-2 justify-end">
                        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm relative shrink-0">
                            <button onClick={props.onDownload} disabled={props.isDownloading} className="p-2.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-indigo-600 disabled:opacity-50 transition-colors" title="Descargar de Cloud">
                                {props.isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            </button>
                            <div className="w-px bg-slate-200 my-1"></div>
                            <button onClick={props.onSync} disabled={props.isSyncing} className={`p-2.5 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors relative ${props.pendingChangesCount > 0 ? 'text-indigo-600' : 'text-slate-600'}`} title="Subir a Cloud">
                                {props.isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                {props.pendingChangesCount > 0 && !props.isSyncing && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                            </button>
                        </div>
                        
                        <button onClick={props.onImport} className="bg-white border border-slate-200 text-slate-700 hover:border-green-500 hover:text-green-600 px-4 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95" title="Importar de Excel/Sheet">
                            <FileSpreadsheet className="w-5 h-5" />
                        </button>
                        
                        {/* Botón Nuevo en Desktop */}
                        <button onClick={props.onCreate} className="hidden md:flex bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 items-center gap-2 active:scale-95">
                            <Plus className="w-4 h-4" /> Nuevo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
