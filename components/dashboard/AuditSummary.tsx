
import React from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AuditSummary: React.FC<{ certifiedCount: number }> = ({ certifiedCount }) => {
    const navigate = useNavigate();
    return (
        <button 
            onClick={() => navigate('/audit')}
            className="w-full bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-500/20 p-5 rounded-[2rem] flex items-center justify-between group transition-all active:scale-[0.98]"
        >
            <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200 dark:shadow-none transition-transform group-hover:rotate-12">
                    <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                    <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Estado Certificación</div>
                    <div className="text-xl font-black text-emerald-900 dark:text-emerald-100 leading-none">
                        {certifiedCount} <span className="text-xs">Bultos Certificados</span>
                    </div>
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-400" />
        </button>
    );
};
