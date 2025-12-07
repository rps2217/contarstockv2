
import React, { memo } from 'react';
import { Trash2, Plus, Minus, AlertTriangle } from 'lucide-react';

interface ScanItemProps {
    scan: any;
    productName: string;
    isLatest: boolean;
    onDelete: (e: React.MouseEvent, id: string) => void;
    onQuantityChange: (id: string, qty: number, delta: number) => void;
    onToggleIncident?: (e: React.MouseEvent, id: string, status: boolean) => void; // New prop
}

export const ScanItem = memo(({ scan, productName, isLatest, onDelete, onQuantityChange, onToggleIncident }: ScanItemProps) => {
    return (
        <div className={`bg-slate-900/80 border p-4 rounded-xl shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-300 relative group transition-all hover:bg-slate-800 hover:border-slate-600 ${isLatest ? 'border-blue-500/30 shadow-blue-900/20' : 'border-slate-800'} ${scan.isIncident ? 'border-red-500/50 bg-red-950/10' : ''}`}>
            {/* Incident Toggle Button */}
            {onToggleIncident && (
                <button 
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onClick={(e) => onToggleIncident(e, scan.id, !!scan.isIncident)}
                    className={`absolute top-2 right-14 w-10 h-10 flex items-center justify-center rounded-lg transition-all z-50 cursor-pointer pointer-events-auto ${scan.isIncident ? 'bg-red-500 text-white' : 'text-slate-600 hover:bg-slate-800 hover:text-amber-500'}`}
                    title="Marcar Incidencia (FRC)"
                >
                    <AlertTriangle className="w-5 h-5" />
                </button>
            )}

            <button 
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(e, scan.id); }}
                className="absolute top-2 right-2 w-10 h-10 flex items-center justify-center bg-slate-950/80 text-slate-500 hover:text-red-400 hover:bg-red-950/50 border border-transparent hover:border-red-500/30 rounded-lg transition-all z-50 cursor-pointer pointer-events-auto"
            >
                <Trash2 className="w-5 h-5" />
            </button>
            
            <div className="flex justify-between items-start mb-4 pr-24">
                <div className="truncate w-full">
                    <div className={`text-sm font-bold truncate leading-tight ${scan.isIncident ? 'text-red-300' : 'text-slate-200'}`}>{productName}</div>
                    <div className="font-mono text-[10px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>{scan.barcode}</span>
                        {scan.mm && scan.yyyy && (
                            <span className="bg-blue-900/50 text-blue-300 px-1.5 rounded text-[9px] font-bold border border-blue-800/50">
                                VENCE: {scan.mm}/{scan.yyyy}
                            </span>
                        )}
                        {scan.isIncident && <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 rounded">FRC</span>}
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 relative z-40">
                <div className="flex items-center justify-between bg-slate-950 rounded-lg p-1 border border-slate-800 flex-1 h-12">
                    <button 
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuantityChange(scan.id, scan.quantity, -1); }} 
                        className="w-10 h-full flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-md active:scale-95 transition-all cursor-pointer pointer-events-auto"
                    >
                        <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 text-center font-mono text-lg font-bold text-white">{scan.quantity}</div>
                    <button 
                        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuantityChange(scan.id, scan.quantity, 1); }} 
                        className="w-10 h-full flex items-center justify-center bg-blue-600/90 hover:bg-blue-600 text-white rounded-md active:scale-95 transition-all shadow-lg shadow-blue-900/20 cursor-pointer pointer-events-auto"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
});
