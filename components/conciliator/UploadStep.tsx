
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
        <div className="max-w-2xl mx-auto p-4 pt-8 animate-in fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Volver</button>
            
            <div className="text-center mb-10">
                <div className="bg-slate-900 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/30">
                    <Fingerprint className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Detective de Recepción</h1>
                <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">Sube tu Excel de "Packing List" para cruzarlo con el conteo físico.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center relative overflow-hidden">
                {expectedOrdersCount > 0 && (
                    <div className="mb-6 bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3 text-emerald-800 font-bold text-sm text-left">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            <span>{expectedOrdersCount} Pedidos en memoria</span>
                        </div>
                        <button onClick={onSkip} className="text-xs bg-white border border-emerald-200 px-3 py-2 rounded-lg font-bold text-emerald-700 hover:bg-emerald-50 shadow-sm shrink-0">
                            Saltar Carga
                        </button>
                    </div>
                )}

                <label className="block w-full cursor-pointer group">
                    <div className="border-3 border-dashed border-slate-200 rounded-2xl p-10 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-all">
                        {isImporting ? (
                            <div className="animate-pulse flex flex-col items-center">
                                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin mb-4"/>
                                <span className="font-bold text-indigo-600">Procesando Matriz...</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="bg-slate-50 p-4 rounded-full mb-4 group-hover:bg-white group-hover:scale-110 transition-transform">
                                    <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors"/>
                                </div>
                                <span className="text-lg font-bold text-slate-700 group-hover:text-indigo-700">Subir Excel (.xlsx)</span>
                                <span className="text-xs text-slate-400 mt-2 font-mono uppercase tracking-tighter">Columnas: ID, Código, Cantidad</span>
                            </div>
                        )}
                    </div>
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={onFileUpload} disabled={isImporting} />
                </label>
            </div>
        </div>
    );
};
