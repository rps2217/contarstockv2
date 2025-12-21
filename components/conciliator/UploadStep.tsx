
import React from 'react';
import { ChevronLeft, Fingerprint, FileSpreadsheet, RefreshCw, CheckCircle2 } from 'lucide-react';

interface Props {
    onBack: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSkip: () => void;
    isImporting: boolean;
    expectedOrdersCount: number;
}

export const UploadStep: React.FC<Props> = ({ onBack, onFileUpload, onSkip, isImporting, expectedOrdersCount }) => {
    return (
        <div className="max-w-2xl mx-auto pt-4 animate-in fade-in slide-in-from-bottom-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors mb-6"><ChevronLeft className="w-6 h-6"/></button>
            
            <div className="text-center mb-10">
                <div className="bg-white w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-slate-200 border border-slate-100">
                    <Fingerprint className="w-10 h-10 text-orange-500" />
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Detective</h1>
                <p className="text-slate-400 mt-2 text-xs font-bold uppercase tracking-widest">Cruza tu inventario físico contra el teórico</p>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 text-center relative overflow-hidden">
                {expectedOrdersCount > 0 && (
                    <div className="mb-8 bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3 text-emerald-800 font-black text-sm text-left">
                            <div className="bg-emerald-100 p-2 rounded-lg"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
                            <span>{expectedOrdersCount} GUÍAS EN MEMORIA</span>
                        </div>
                        <button onClick={onSkip} className="text-[10px] bg-white border-2 border-emerald-100 px-4 py-3 rounded-xl font-black text-emerald-700 hover:bg-emerald-50 shadow-sm active:scale-95 uppercase tracking-wider">
                            Usar Memoria
                        </button>
                    </div>
                )}

                <label className="block w-full cursor-pointer group">
                    <div className="border-4 border-dashed border-slate-100 rounded-3xl p-12 group-hover:border-blue-200 group-hover:bg-blue-50/30 transition-all duration-300">
                        {isImporting ? (
                            <div className="animate-pulse flex flex-col items-center">
                                <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4"/>
                                <span className="font-black text-blue-600 uppercase tracking-widest text-xs">Procesando Excel...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="bg-slate-50 p-5 rounded-2xl mb-6 group-hover:bg-white group-hover:shadow-md transition-all">
                                    <FileSpreadsheet className="w-10 h-10 text-slate-300 group-hover:text-blue-500 transition-colors"/>
                                </div>
                                <span className="text-lg font-black text-slate-700 group-hover:text-blue-700 uppercase tracking-tight">Cargar Packing List</span>
                                <span className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full">Soporta .xlsx</span>
                            </div>
                        )}
                    </div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={onFileUpload} disabled={isImporting} />
                </label>
            </div>
        </div>
    );
};
