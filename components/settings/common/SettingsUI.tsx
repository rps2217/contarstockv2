
import React from 'react';
import { Loader2, ChevronRight } from 'lucide-react';

export const SettingsSection = ({ children, title, className = "" }: any) => (
    <div className={`space-y-4 mb-10 animate-in slide-in-from-bottom-2 ${className}`}>
        {title && (
            <h3 className="ml-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                <div className="h-[2px] w-6 bg-blue-600"></div> {title}
            </h3>
        )}
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

export const SettingsCard = ({ children, className = "" }: any) => (
    <div className={`bg-white dark:bg-slate-900 border-4 border-slate-100 dark:border-white/5 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none ${className}`}>
        {children}
    </div>
);

/**
 * TOGGLE INDUSTRIAL v5.0
 * Diseño de alta fidelidad táctil para PDAs y Tablets.
 */
export const SettingsToggle = ({ active, label, description, icon: Icon, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`w-full p-5 rounded-[2rem] border-4 transition-all duration-300 flex items-center justify-between active:scale-[0.97] group relative overflow-hidden ${
            active 
            ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/30' 
            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/5 text-slate-500'
        }`}
    >
        <div className="flex items-center gap-4 relative z-10">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${active ? 'bg-white/20 text-white rotate-3 shadow-inner' : 'bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:text-blue-500'}`}>
                <Icon className="w-7 h-7 stroke-[2.5px]" />
            </div>
            
            <div className="text-left">
                <div className={`font-black uppercase tracking-tight text-[13px] leading-none mb-1.5 ${active ? 'text-white' : 'text-slate-900 dark:text-slate-200'}`}>
                    {label}
                </div>
                <div className={`text-[9px] font-bold uppercase tracking-widest leading-none ${active ? 'text-blue-100/70' : 'text-slate-400 dark:text-slate-600'}`}>
                    {description}
                </div>
            </div>
        </div>

        {/* Switch Estilizado */}
        <div className={`w-14 h-7 rounded-full border-4 relative transition-all flex items-center px-1 shrink-0 ${active ? 'bg-white/10 border-white' : 'bg-slate-100 dark:bg-black border-slate-200 dark:border-white/10'}`}>
            <div className={`w-4 h-4 rounded-full transition-all transform duration-300 ${active ? 'translate-x-6 bg-white shadow-[0_0_15px_white]' : 'translate-x-0 bg-slate-400'}`} />
        </div>
    </button>
);

export const SettingsInput = ({ value, onChange, placeholder, className = "", ...props }: any) => (
    <div className="relative group w-full">
        <input 
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full h-16 px-6 bg-slate-50 dark:bg-black/40 border-4 border-slate-100 dark:border-white/5 rounded-2xl font-black text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 ${className}`}
            {...props}
        />
    </div>
);

export const SettingsButton = ({ onClick, label, icon: Icon, variant = 'primary', isLoading, disabled, className = "" }: any) => {
    const variants: any = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-xl border-blue-500/50",
        danger: "bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900 text-rose-600 hover:bg-rose-100",
        dark: "bg-slate-900 dark:bg-black text-white border-black hover:bg-black",
        outline: "bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5"
    };

    return (
        <button 
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`w-full h-16 px-8 rounded-[1.8rem] border-2 font-black text-[12px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50 ${variants[variant]} ${className}`}
        >
            {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (Icon && <Icon className="w-6 h-6" />)}
            <span>{label}</span>
        </button>
    );
};
