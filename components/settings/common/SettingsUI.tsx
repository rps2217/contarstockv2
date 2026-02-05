
import React from 'react';
import { Loader2 } from 'lucide-react';

export const SettingsSection = ({ children, title, className = "" }: any) => (
    <div className={`space-y-6 mb-12 animate-in slide-in-from-bottom-2 ${className}`}>
        {title && (
            <h3 className="ml-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-3">
                <div className="h-1.5 w-6 bg-blue-600 rounded-full"></div> {title}
            </h3>
        )}
        <div className="space-y-4">
            {children}
        </div>
    </div>
);

export const SettingsCard = ({ children, className = "" }: any) => (
    <div className={`bg-white dark:bg-slate-900 border-4 border-slate-100 dark:border-white/5 p-8 rounded-[3rem] shadow-sm ${className}`}>
        {children}
    </div>
);

export const SettingsToggle = ({ active, label, description, icon: Icon, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`w-full p-6 rounded-[2.8rem] border-4 transition-all duration-300 flex items-center gap-6 active:scale-[0.97] group ${
            active 
            ? 'bg-blue-600 border-blue-400 text-white shadow-xl shadow-blue-900/20' 
            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 dark:bg-slate-900 dark:border-white/5'
        }`}
    >
        <div className={`p-5 rounded-3xl transition-colors shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-black/20 text-slate-400'}`}>
            <Icon className="w-9 h-9 stroke-[2.5px]" />
        </div>
        
        <div className="flex-1 text-left min-w-0">
            <div className={`font-black uppercase tracking-[0.1em] text-[13px] mb-1.5 leading-none ${active ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                {label}
            </div>
            {description && (
                <div className={`text-[10px] font-bold uppercase tracking-tight opacity-60 ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                    {description}
                </div>
            )}
        </div>

        {/* Interruptor Visual Industrial */}
        <div className={`w-18 h-11 rounded-full border-4 shrink-0 relative transition-all duration-300 flex items-center px-1.5 ${active ? 'bg-white/30 border-white' : 'bg-slate-100 border-slate-200 dark:bg-black/40 dark:border-white/10'}`}>
            <div className={`w-6 h-6 rounded-full shadow-lg transition-all duration-300 transform ${active ? 'translate-x-7 bg-white scale-110' : 'translate-x-0 bg-slate-400 dark:bg-slate-600'}`} />
        </div>
    </button>
);

// Added missing SettingsInput component
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
            className={`w-full h-20 px-8 rounded-[2.5rem] border-4 font-black text-[12px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50 ${variants[variant]} ${className}`}
        >
            {isLoading ? <Loader2 className="animate-spin w-7 h-7" /> : (Icon && <Icon className="w-7 h-7" />)}
            <div className="flex flex-col items-center justify-center leading-none">
                <span>{label}</span>
                {subLabel && <span className="text-[9px] opacity-60 mt-1.5 font-bold tracking-widest">{subLabel}</span>}
            </div>
        </button>
    );
};