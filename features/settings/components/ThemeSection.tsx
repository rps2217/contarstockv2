
import React from 'react';
import { Palette, Check, Sun, Moon, Monitor, Eye, Contrast, Zap } from 'lucide-react';
import { AppSettings, Theme } from '../../../types';

interface Props {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const ThemeSection: React.FC<Props> = ({ settings, updateSetting }) => {
 const themes: {id: Theme, label: string, bg: string, accent: string, text: string, icon: any}[] = [
 { id: 'light', label: 'Día', bg: 'bg-white', accent: 'bg-blue-600', text: 'text-slate-900', icon: Sun },
 { id: 'dark', label: 'Noche', bg: 'bg-slate-900', accent: 'bg-blue-500', text: 'text-white', icon: Moon },
 { id: 'navy', label: 'Bodega', bg: 'bg-blue-950', accent: 'bg-blue-400', text: 'text-blue-50', icon: Monitor },
 { id: 'oled', label: 'Pure OLED', bg: 'bg-black', accent: 'bg-slate-200', text: 'text-white', icon: Eye },
 { id: 'warm', label: 'Cálido', bg: 'bg-orange-50', accent: 'bg-orange-600', text: 'text-orange-950', icon: Zap },
 { id: 'contrast', label: 'Contraste', bg: 'bg-yellow-400', accent: 'bg-black', text: 'text-black', icon: Contrast },
 ];

 return (
 <section className="space-y-6 animate-in slide-in-from-bottom-2">
 <div className="grid grid-cols-2 gap-4">
 {themes.map(t => {
 const isSelected = (settings.theme || 'dark') === t.id;
 const Icon = t.icon;
 return (
 <button 
 key={t.id}
 onClick={() => {
 if (navigator.vibrate) navigator.vibrate(15);
 updateSetting('theme', t.id);
 }}
 className={`
 relative p-6 rounded-[2.5rem] border-4 flex flex-col items-center gap-4 transition-all active:scale-95 overflow-hidden
 ${isSelected 
 ? `border-blue-600 shadow-2xl shadow-blue-500/20 z-10 ${t.bg}` 
 : `border-slate-100 dark:border-white/5 ${t.bg} opacity-80 hover:opacity-100 hover:border-slate-200`
 }
 `}
 >
 {/* Previsualización de color */}
 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${t.accent} ${isSelected ? 'animate-bounce' : ''}`}>
 <Icon className={`w-6 h-6 ${t.id === 'contrast' ? 'text-black' : 'text-white'}`} />
 </div>

 <span className={`text-[11px] font-black uppercase tracking-widest ${t.text}`}>
 {t.label}
 </span>

 {isSelected && (
 <div className="absolute top-4 right-4 bg-blue-600 rounded-full p-1 shadow-md border-2 border-white">
 <Check className="w-3 h-3 text-white stroke-[4px]" />
 </div>
 )}
 </button>
 );
 })}
 </div>

 <div className="bg-indigo-50 dark:bg-indigo-950/20 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-[2rem] p-6 flex gap-4">
 <Palette className="w-8 h-8 text-indigo-500 shrink-0" />
 <p className="text-[10px] text-indigo-900 dark:text-indigo-400 font-bold uppercase leading-relaxed">
 Cambiar el tema afecta a toda la aplicación de inmediato, optimizando la visibilidad según las condiciones de luz de la bodega.
 </p>
 </div>
 </section>
 );
};
