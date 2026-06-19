import React from 'react';
import { Loader2 } from 'lucide-react';

interface ThemeProps {
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const SettingsSection = ({ children, title, className = "", theme = 'dark' }: any) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <div className={`space-y-4 mb-10 animate-in slide-in-from-bottom-2 ${className}`}>
      {title && (
        <h3 className={`ml-2 text-[10px] font-black uppercase tracking-[0.4em] mb-4 flex items-center gap-3 ${
          isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-600' : 'text-slate-500'
        }`}>
          <div className={`h-[2px] w-6 ${isHighContrast ? 'bg-yellow-400' : 'bg-blue-600'}`}></div> 
          {title}
        </h3>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};

export const SettingsCard = ({ children, className = "", theme = 'dark' }: any) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <div className={`border-4 p-6 rounded-[2.5rem] shadow-xl ${
      isHighContrast 
        ? 'bg-black border-yellow-400 shadow-yellow-400/10' 
        : isLight 
          ? 'bg-white border-slate-100 shadow-slate-200/50' 
          : 'bg-slate-900 border-white/5 shadow-none'
    } ${className}`}>
      {children}
    </div>
  );
};

export const SettingsCardHeader = ({ icon: Icon, title, subtitle, color = "bg-blue-600", children, theme = 'dark' }: any) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-2xl shadow-lg ${color} text-white`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className={`text-lg font-black uppercase italic leading-none ${
            isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white'
          }`}>{title}</h3>
          <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${
            isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500'
          }`}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
};

export const SettingsToggle = ({ active, label, description, icon: Icon, onClick, theme = 'dark' }: any) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <button 
      onClick={onClick}
      className={`w-full p-5 rounded-[2rem] border-4 transition-all duration-300 flex items-center justify-between active:scale-[0.97] group relative overflow-hidden ${
        active 
          ? (isHighContrast ? 'bg-yellow-400 border-yellow-300 text-black shadow-lg shadow-yellow-400/30' : 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/30')
          : (isHighContrast ? 'bg-black border-yellow-400/30 text-yellow-400' : isLight ? 'bg-white border-slate-100 text-slate-500' : 'bg-slate-900 border-white/5 text-slate-500')
      }`}
    >
      <div className="flex items-center gap-4 relative z-10">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
          active 
            ? 'bg-white/20 text-white rotate-3 shadow-inner' 
            : (isHighContrast ? 'bg-yellow-900/30 text-yellow-400' : isLight ? 'bg-slate-50 text-slate-400 group-hover:text-blue-500' : 'bg-white/5 text-slate-400 group-hover:text-blue-500')
        }`}>
          <Icon className="w-7 h-7 stroke-[2.5px]" />
        </div>
    
        <div className="text-left">
          <div className={`font-black uppercase tracking-tight text-[13px] leading-none mb-1.5 ${
            active ? 'text-white' : (isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-slate-200')
          }`}>
            {label}
          </div>
          <div className={`text-[9px] font-bold uppercase tracking-widest leading-none ${
            active ? 'text-blue-100/70' : (isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-400' : 'text-slate-600')
          }`}>
            {description}
          </div>
        </div>
      </div>

      <div className={`w-14 h-7 rounded-full border-4 relative transition-all flex items-center px-1 shrink-0 ${
        active 
          ? 'bg-white/10 border-white' 
          : (isHighContrast ? 'bg-yellow-900/30 border-yellow-400/30' : isLight ? 'bg-slate-100 border-slate-200' : 'bg-black border-white/10')
      }`}>
        <div className={`w-4 h-4 rounded-full transition-all transform duration-300 ${
          active 
            ? 'translate-x-6 bg-white shadow-[0_0_15px_white]' 
            : (isHighContrast ? 'translate-x-0 bg-yellow-400' : isLight ? 'translate-x-0 bg-slate-400' : 'translate-x-0 bg-slate-400')
        }`} />
      </div>
    </button>
  );
};

export const SettingsInput = ({ value, onChange, placeholder, className = "", theme = 'dark', ...props }: any) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  return (
    <div className="relative group w-full">
      <input 
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full h-16 px-6 border-4 rounded-2xl font-black outline-none focus:border-blue-500 transition-all ${
          isHighContrast 
            ? 'bg-black border-yellow-400 text-yellow-400 placeholder:text-yellow-600' 
            : isLight 
              ? 'bg-slate-50 border-slate-100 text-slate-900 placeholder:text-slate-300' 
              : 'bg-black/40 border-white/5 text-white placeholder:text-slate-800'
        } ${className}`}
        {...props}
      />
    </div>
  );
};

export const SettingsButton = ({ onClick, label, icon: Icon, variant = 'primary', isLoading, disabled, className = "", theme = 'dark' }: any) => {
  const isHighContrast = theme === 'high-contrast';
  const isLight = theme === 'light';
  
  const variants: any = {
    primary: isHighContrast 
      ? "bg-yellow-400 hover:bg-yellow-300 text-black border-yellow-600" 
      : isLight 
        ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500/50" 
        : "bg-blue-600 hover:bg-blue-700 text-white border-blue-500/50",
    danger: isHighContrast 
      ? "bg-red-500 text-white border-red-600 hover:bg-red-400" 
      : isLight 
        ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100" 
        : "bg-rose-950/20 border-rose-900 text-rose-600 hover:bg-rose-500/20",
    dark: isHighContrast 
      ? "bg-yellow-400 text-black border-yellow-600" 
      : isLight 
        ? "bg-slate-900 text-white border-black" 
        : "bg-black text-white border-white/10",
    outline: isHighContrast 
      ? "bg-black border-yellow-400 text-yellow-400 hover:bg-yellow-900/20" 
      : isLight 
        ? "bg-white border-slate-100 text-slate-600 hover:bg-slate-50" 
        : "bg-slate-900 border-white/10 text-slate-600 hover:bg-white/5"
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
