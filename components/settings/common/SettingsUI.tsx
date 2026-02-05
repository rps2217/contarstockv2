
import React from 'react';
import { Loader2 } from 'lucide-react';

// --- WRAPPER DE SECCIÓN ---
export const SettingsSection = ({ children, title, icon: Icon, className = "" }: any) => (
    <div className={`space-y-6 mb-10 animate-in slide-in-from-bottom-2 ${className}`}>
        {title && (
            <h3 className="ml-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div> {title}
            </h3>
        )}
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

// --- TARJETA CONTENEDORA ---
export const SettingsCard = ({ children, className = "" }: any) => (
    <div className={`bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-white/5 p-6 rounded-[2.5rem] shadow-sm ${className}`}>
        {children}
    </div>
);

// --- INTERRUPTOR INDUSTRIAL (TOGGLE) ---
// Mejorado: Área de toque extendida y switch visual prominente
export const SettingsToggle = ({ active, label, description, icon: Icon, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`w-full p-6 rounded-[2.5rem] border-2 transition-all duration-300 flex items-center gap-5 active:scale-[0.97] ${
            active 
            ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-900/20' 
            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 dark:bg-slate-900 dark:border-white/5'
        }`}
    >
        <div className={`p-4 rounded-2xl transition-colors shrink-0 ${active ? 'bg-white/20 text-white shadow-inner' : 'bg-slate-50 text-slate-400 dark:bg-black/20'}`}>
            <Icon className="w-7 h-7 stroke-[2.5px]" />
        </div>
        
        <div className="flex-1 text-left min-w-0">
            <div className={`font-black uppercase tracking-widest text-[11px] mb-1 leading-none ${active ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {label}
            </div>
            {description && (
                <div className={`text-[9px] font-bold uppercase tracking-tight line-clamp-1 opacity-60 ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                    {description}
                </div>
            )}
        </div>

        {/* El Switch Visual */}
        <div className={`w-14 h-8 rounded-full border-2 shrink-0 relative transition-all duration-300 flex items-center px-1 ${active ? 'bg-white/30 border-white' : 'bg-slate-100 border-slate-200 dark:bg-black/40 dark:border-white/10'}`}>
            <div className={`w-5 h-5 rounded-full shadow-lg transition-all duration-300 transform ${active ? 'translate-x-6 bg-white' : 'translate-x-0 bg-slate-400 dark:bg-slate-600'}`} />
        </div>
    </button>
);

// --- BOTÓN DE ACCIÓN ---
export const SettingsButton = ({ onClick, label, icon: Icon, variant = 'primary', isLoading, disabled, subLabel, className = "" }: any) => {
    const variants: any = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-transparent",
        danger: "bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900",
        dark: "bg-slate-900 text-white border-black hover:bg-black dark:bg-white/5 dark:border-white/10",
        outline: "bg-white border-slate-200 text-slate-600 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300"
    };

    return (
        <button 
            onClick={onClick}
            disabled={disabled || isLoading}
            className={`w-full h-16 px-8 rounded-2xl border-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${variants[variant]} ${className}`}
        >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : (Icon && <Icon className="w-5 h-5" />)}
            <div className="flex flex-col items-center justify-center leading-none">
                <span>{label}</span>
                {subLabel && <span className="text-[7px] opacity-60 mt-1 font-bold">{subLabel}</span>}
            </div>
        </button>
    );
};

// --- INPUT FIELD ---
export const SettingsInput = ({ value, onChange, placeholder, icon: Icon, className = "" }: any) => (
    <div className="relative group">
        {Icon && <Icon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-blue-500" />}
        <input 
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={`w-full h-16 bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 rounded-[1.5rem] text-[13px] font-bold text-slate-900 dark:text-white outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-black/40 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 ${Icon ? 'pl-14' : 'px-6'} ${className}`}
        />
    </div>
);
