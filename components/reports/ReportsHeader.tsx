
import React from 'react';
import { ChevronLeft, CheckCircle2, Eraser, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Props {
    isCleaning: boolean;
    onClean: () => void;
    // FIX: Added onOpenConsolidated prop to satisfy requirements in Reports.tsx
    onOpenConsolidated?: () => void;
    onStartNew: () => void;
}

export const ReportsHeader: React.FC<Props> = ({ isCleaning, onClean, onStartNew }) => {
    const navigate = useNavigate();
    return (
        <div className="flex-none">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="text-blue-600"><CheckCircle2 className="w-6 h-6" /></div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Historial</h1>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
                <button 
                    onClick={onClean} 
                    disabled={isCleaning} 
                    className="bg-slate-50 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
                >
                    {isCleaning ? <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" /> : <Eraser className="w-4 h-4" />}
                    Limpiar Cloud
                </button>
                <button onClick={onStartNew} className="bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-200 active:scale-95">
                    <Plus className="w-5 h-5" /> Nueva Carga
                </button>
            </div>
        </div>
    );
};