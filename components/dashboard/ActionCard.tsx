import React from 'react';
import { ChevronRight } from 'lucide-react';
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
                group relative overflow-hidden text-left transition-all active:scale-[0.99] duration-500
                flex flex-row items-center gap-5 p-6 rounded-[2rem] border shadow-xl
                md:flex-col md:justify-between md:p-10 md:h-72
                ${span === 2 ? 'md:col-span-2' : 'md:col-span-1'}
                ${colorClass}
            `}
        >
            <div className={`
                shrink-0 rounded-2xl flex items-center justify-center transition-all duration-700 
                w-14 h-14 md:w-16 md:h-16 bg-white/5 border border-white/10 text-slate-300 md:mb-6
                group-hover:bg-white/10 group-hover:text-white group-hover:scale-105
            `}>
                <Icon className="w-7 h-7 md:w-8 md:h-8" />
            </div>

            <div className="flex-1 min-w-0 z-10">
                <h2 className="text-xl font-bold text-slate-100 md:text-2xl md:mb-2 tracking-tight group-hover:translate-x-1 transition-transform duration-500">{title}</h2>
                <p className="text-sm text-slate-500 md:text-slate-400 font-medium line-clamp-2">{sub}</p>
            </div>

            <div className="bg-white/5 p-2 rounded-full text-slate-600 group-hover:text-slate-200 group-hover:bg-white/10 transition-all">
                <ChevronRight className="w-6 h-6" />
            </div>
        </button>
    );
};