
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
                group relative overflow-hidden text-left transition-all active:scale-95 duration-200
                flex flex-row items-center gap-4 p-4 rounded-2xl shadow-sm border border-slate-100 bg-white
                md:flex-col md:justify-between md:p-6 md:h-56 md:shadow-lg md:border-0 md:bg-gradient-to-br
                ${span === 2 ? 'md:col-span-2' : 'md:col-span-1'}
                ${colorClass}
            `}
        >
            <div className="hidden md:block absolute top-0 right-0 p-24 bg-white rounded-full blur-3xl -mr-12 -mt-12 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
            <div className={`
                shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110
                w-12 h-12 bg-slate-50 text-slate-600
                md:w-14 md:h-14 md:bg-white/20 md:backdrop-blur-md md:text-white md:mb-4 md:border md:border-white/10
            `}>
                <Icon className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex-1 min-w-0 z-10">
                <h2 className="text-base font-bold text-slate-900 md:text-2xl md:text-white md:mb-1 truncate">{title}</h2>
                <p className="text-xs text-slate-500 font-medium md:text-blue-100 md:opacity-90 truncate">{sub}</p>
            </div>
            <div className="md:hidden text-slate-300">
                <ArrowRight className="w-5 h-5" />
            </div>
        </button>
    );
};
