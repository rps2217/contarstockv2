
import React from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';

// --- WRAPPER DE SECCIÓN ---
export const SettingsSection = ({ children, title, icon: Icon, className = "" }: any) => (
    <div className={`space-y-4 animate-in slide-in-from-bottom-2 ${className}`}>
        {title && (
            <h3 className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                {Icon && <Icon className="w-3 h-3" />} {title}
            </h3>
        )}
        {children}
    </div>
);

// --- TARJETA CONTENEDORA ---
export const SettingsCard = ({ children, className = "" }: any) => (
    <div className={`bg-white dark:bg-slate-900 border-4 border-slate-100 dark:border-black p-6 rounded-[2.5rem] shadow-xl ${className}`}>
        {children}
    </div>
);

// --- INTERRUPTOR INDUSTRIAL (TOGGLE) ---
export const SettingsToggle = ({ active, label, description, icon: Icon, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`w-full p-5 rounded-[2.5rem] border-4 transition-all duration-200 flex items-center justify-between group active:scale-[0.98] ${
            active 
            ? 'bg-blue-600 border-blue-700 text-white shadow-xl shadow-blue-900/20' 
            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-800'
        }`}
    >
        <div className="flex items-center gap-4 text-left">
            <div className={`p-3 rounded-2xl transition-colors ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400 dark:bg-white/5'}`}>
                <Icon className="w-6 h-6 stroke-[3px]" />
            </div>
            <div>
                <div className={`font-black uppercase tracking-widest text-xs mb-1 ${active ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {label}
                </div>
                {description && (
                    <div className={`text-[10px] font-bold uppercase tracking-tight ${active ? 'text-blue-100' : 'text-slate-300'}`}>
                        {description}
                    </div>
                )}
            </div>
        </div>
        <div className={`w-12 h-6 rounded-full border-2 shrink-0 relative transition-all ${active ? 'bg-white border-white' : 'bg-slate-200 border-slate-300 dark:bg-slate-800 dark:border-slate-700'}`}>
            <div className={`absolute top-0.5 bottom-0.5 w-4 bg-slate-900 rounded-full shadow-sm transition-all ${active ? 'right-1' : 'left-1'}`} />
        </div>
    </button>
);

// --- BOTÓN DE ACCIÓN ---
export const SettingsButton = ({ onClick, label, icon: Icon, variant = 'primary', isLoading, disabled, subLabel }: any) => {
    const variants: any = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-transparent",
        danger: "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900",
        dark: "bg-slate-900 text-white border-black hover:bg-black",
        outline: "bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
    };

    return (
        <button 
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`w-full py-4 px-6 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${variants[variant]}`}
        >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (Icon && <Icon className="w-5 h-5" />)}
            <div className="flex flex-col items-start leading-none">
                <span>{label}</span>
                {subLabel && <span className="text-[8px] opacity-60 mt-1 font-bold">{subLabel}</span>}
            </div>
        </button>
    );
};

// --- INPUT FIELD ---
export const SettingsInput = ({ value, onChange, placeholder, icon: Icon }: any) => (
    <div className="relative">
        {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />}
        <input 
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full h-14 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-300 ${Icon ? 'pl-12' : 'px-4'}`}
        />
    </div>
);
