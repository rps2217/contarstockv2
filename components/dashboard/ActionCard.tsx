import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActionCardProps {
    title: string;
    sub: string;
    icon: any;
    colorClass: string;
    to: string;
    span?: number;
}

export const ActionCard: React.FC<ActionCardProps> = ({ title, sub, icon: Icon, colorClass, to, span = 1 }) => {
    const navigate = useNavigate();
    return (
        <button 
            onClick={() => navigate(to)}
            className={`
                group relative overflow-hidden text-left transition-all active:scale-[0.98] duration-300
                flex flex-row items-center gap-4 p-5 rounded-3xl border shadow-2xl
                md:flex-col md:justify-between md:p-8 md:h-64
                ${span === 2 ? 'md:col-span-2' : 'md:col-span-1'}
                ${colorClass}
            `}
        >
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div className={`
                shrink-0 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3
                w-14 h-14 bg-white/5 backdrop-blur-xl border border-white/10 text-white md:mb-4
                group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]
            `}>
                <Icon className="w-7 h-7" />
            </div>

            <div className="flex-1 min-w-0 z-10">
                <h2 className="text-lg font-black text-white md:text-2xl md:mb-1 tracking-tight truncate group-hover:translate-x-1 transition-transform">{title}</h2>
                <p className="text-xs text-slate-400 md:text-white/60 font-medium truncate">{sub}</p>
            </div>

            <div className="bg-white/5 p-2 rounded-full text-white/20 group-hover:text-white group-hover:bg-white/10 transition-all">
                <ArrowRight className="w-5 h-5" />
            </div>
        </button>
    );
};