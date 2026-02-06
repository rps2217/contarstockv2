
import React from 'react';
import { Loader2 } from 'lucide-react';

export const SettingsSection = ({ children, title, className = "" }: any) => (
    <div className={`space-y-2 mb-10 animate-in slide-in-from-bottom-2 ${className}`}>
        {title && (
            <h3 className="ml-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                <div className="h-[2px] w-4 bg-blue-600"></div> {title}
            </h3>
        )}
        <div className={className.includes('grid') ? className : "space-y-2"}>
            {children}
        </div>
    </div>
);

export const SettingsCard = ({ children, className = "" }: any) => (
    <div className={`bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 p-6 rounded-[2rem] shadow-sm ${className}`}>
        {children}
    </div>
);

/**
 * TOGGLE RUGGED COMPACT
 * Diseñado para ser una tira táctil de alta visibilidad.
 */
export const SettingsToggle = ({ active, label, description, icon: Icon, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`w-full h-20 px-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between active:scale-[0.97] group relative overflow-hidden ${
            active 
            ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/20' 
            : 'bg-slate-900 border-white/5 text-slate-500'
        }`}
    >
        <div className="flex items-center gap-4">
            {/* Icono con contenedor cuadrado */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-600'}`}>
                <Icon className="w-6 h-6 stroke-[2.5px]" />
            </div>
            
            <div className="text-left">
                <div className={`font-black uppercase tracking-tight text-[11px] leading-none mb-1.5 ${active ? 'text-white' : 'text-slate-300'}`}>
                    {label}
                </div>
                <div className={`text-[8px] font-bold uppercase tracking-widest leading-none ${active ? 'text-blue-100/70' : 'text-slate-600'}`}>
                    {description}
                </div>
            </div>
        </div>

        {/* Switch Industrial Estilizado */}
        <div className={`w-12 h-6 rounded-full border-2 relative transition-all flex items-center px-1 ${active ? 'bg-white/10 border-white' : 'bg-black border-white/10'}`}>
            <div className={`w-3.5 h-3.5 rounded-full transition-all transform ${active ? 'translate-x-5 bg-white shadow-[0_0_10px_white]' : 'translate-x-0 bg-slate-700'}`} />
        </div>
    </button>
);

export const SettingsInput = ({ value, onChange, placeholder, className = "", ...props }: any) => (
    <input 
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full h-14 px-6 bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/10 rounded-2xl font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-300 ${className}`}
        {...props}
    />
);

export const SettingsButton = ({ onClick, label, icon: Icon, variant = 'primary', isLoading, disabled, subLabel, className = "" }: any) => {
    const variants: any = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-xl border-transparent",
        danger: "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900",
        dark: "bg-slate-900 text-white border-black hover:bg-black dark:bg-white/5 dark:border-white/10",
        outline: "bg-white border-slate-100 text-slate-600 hover:border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
    };

    return (
        <button 
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`w-full h-20 px-8 rounded-[2rem] border-2 font-black text-[12px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50 ${variants[variant]} ${className}`}
        >
            {isLoading ? <Loader2 className="animate-spin w-7 h-7" /> : (Icon && <Icon className="w-7 h-7" />)}
            <div className="flex flex-col items-center justify-center leading-none">
                <span>{label}</span>
                {subLabel && <span className="text-[9px] opacity-60 mt-1.5 font-bold tracking-widest">{subLabel}</span>}
            </div>
        </button>
    );
};
