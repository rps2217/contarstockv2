
import React from 'react';
import { ChevronLeft, RefreshCw, ShieldCheck, ArrowRight } from 'lucide-react';
import { CountingSession } from '../../types';

interface Props {
    sessions: CountingSession[];
    onBack: () => void;
    onSelect: (id: string) => void;
    isAnalyzing: boolean;
    progress: string;
}

export const SessionPickerStep: React.FC<Props> = ({ sessions, onBack, onSelect, isAnalyzing, progress }) => {
    return (
        <div className="max-w-2xl mx-auto p-4 pt-8 animate-in fade-in">
            <button onClick={onBack} className="flex items-center gap-2 text-slate-500 mb-6 hover:text-slate-900"><ChevronLeft className="w-5 h-5"/> Volver</button>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Selecciona un Conteo</h1>
            <p className="text-slate-500 text-sm mb-6 font-medium">Elige el bulto físico que deseas investigar contra el Excel.</p>
            
            {isAnalyzing && (
                <div className="fixed inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                    <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">Detective Analizando...</h3>
                    <p className="text-slate-500 mt-2 font-mono text-xs">{progress}</p>
                </div>
            )}

            <div className="space-y-3 pb-24">
                {sessions?.map(s => (
                    <button 
                        key={s.id} 
                        onClick={() => onSelect(s.id)}
                        disabled={isAnalyzing}
                        className="w-full bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all text-left flex justify-between items-center group relative overflow-hidden"
                    >
                        {s.auditStatus && (
                            <div className={`absolute top-0 right-0 w-3 h-3 rounded-bl-lg ${s.auditStatus === 'verified' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        )}
                        <div>
                            <div className="font-black text-slate-900 flex items-center gap-2 text-lg">
                                {s.erpOrder}
                                {s.auditStatus === 'verified' && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-tighter">{s.logisticsLabel}</div>
                            <div className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest">{new Date(s.createdAt).toLocaleDateString()}</div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-slate-200 group-hover:text-indigo-500 transition-all group-hover:translate-x-1" />
                    </button>
                ))}
                {sessions.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No hay sesiones registradas</p>
                    </div>
                )}
            </div>
        </div>
    );
};
