import React, { memo } from 'react';
import { Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';

interface ScanItemProps {
    scan: any;
    productName: string;
    isLatest: boolean;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onQuantityChange: (id: string, qty: number, delta: number) => void;
    onToggleIncident?: (e: React.MouseEvent, id: string, status: boolean) => void;
}

export const ScanItem = memo(({ scan, productName, isLatest, onDelete, onQuantityChange, onToggleIncident }: ScanItemProps) => {
    return (
        <div className={`bg-white border-2 p-5 rounded-2xl shadow-sm animate-in slide-in-from-right-4 duration-300 relative group transition-all ${isLatest ? 'border-blue-500 shadow-blue-100 ring-4 ring-blue-50' : 'border-slate-100 hover:border-slate-200'} ${scan.isIncident ? 'border-red-500 bg-red-50' : ''}`}>
            {onToggleIncident && (
                <button 
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => onToggleIncident(e, scan.id, !!scan.isIncident)}
                    className={`absolute top-4 right-16 w-10 h-10 flex items-center justify-center rounded-xl transition-all z-10 ${scan.isIncident ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'text-slate-300 hover:text-amber-500 hover:bg-amber-50'}`}
                    title="Incidencia FRC"
                >
                    <AlertTriangle className="w-5 h-5" />
                </button>
            )}

            <button 
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(e, scan.id); }}
                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all z-10"
            >
                <Trash2 className="w-5 h-5" />
            </button>
            
            <div className="pr-24 mb-5">
                <div className={`text-lg font-black leading-tight mb-1 truncate ${scan.isIncident ? 'text-red-700' : 'text-slate-900'}`}>{productName}</div>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 tracking-wider font-mono">{scan.barcode}</span>
                    {scan.mm && scan.yyyy && (
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-[10px] font-black border border-slate-200">
                            EXP: {scan.mm}/{scan.yyyy}
                        </span>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-1.5 border border-slate-200 flex-1 shadow-inner h-14">
                    <button 
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuantityChange(scan.id, scan.quantity, -1); }} 
                        className="w-12 h-full flex items-center justify-center bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl shadow-sm active:scale-90 transition-all border border-slate-100"
                    >
                        <Minus className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center font-black text-2xl text-slate-900 tabular-nums">{scan.quantity}</div>
                    <button 
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuantityChange(scan.id, scan.quantity, 1); }} 
                        className="w-12 h-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-100 active:scale-90 transition-all"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
});