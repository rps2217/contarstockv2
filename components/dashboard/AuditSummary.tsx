
import React from 'react';
import { ShieldCheck, ChevronRight, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AuditSummary: React.FC<{ certifiedCount: number }> = ({ certifiedCount }) => {
    const navigate = useNavigate();
    return (
        <div className="grid grid-cols-1 gap-4">
            <button 
                onClick={() => navigate('/audit')}
                className="w-full bg-emerald-50 dark:bg-emerald-900/10 border-4 border-black dark:border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between group transition-all active:scale-[0.98] shadow-xl"
            >
                <div className="flex items-center gap-5">
                    <div className="bg-emerald-600 p-4 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-transform group-hover:rotate-6">
                        <ShieldCheck className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-left">
                        <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-[0.2em] mb-1">Integridad de Carga</div>
                        <div className="text-3xl font-black text-emerald-900 dark:text-emerald-100 leading-none">
                            {certifiedCount} <span className="text-xs font-bold uppercase tracking-widest opacity-50">Certificados</span>
                        </div>
                    </div>
                </div>
                <div className="bg-emerald-100 dark:bg-white/5 p-3 rounded-xl">
                    <ChevronRight className="w-6 h-6 text-emerald-600" />
                </div>
            </button>
        </div>
    );
};
