
import React from 'react';
import { Palette, Check } from 'lucide-react';
import { AppSettings, Theme } from '../../types';

interface Props {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const ThemeSection: React.FC<Props> = ({ settings, updateSetting }) => {
 const themes: {id: Theme, label: string, color: string}[] = [
 { id: 'light', label: 'Claro', color: 'bg-white border-slate-200' },
 { id: 'dark', label: 'Oscuro', color: 'bg-slate-900 border-slate-800' },
 { id: 'navy', label: 'Navy', color: 'bg-blue-900 border-blue-800' },
 { id: 'warm', label: 'Cálido', color: 'bg-orange-50 border-orange-100' },
 { id: 'contrast', label: 'Alto Contraste', color: 'bg-black border-yellow-400' },
 ];

 return (
 <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
 <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
 <Palette className="w-5 h-5 text-pink-500" /> Apariencia
 </h2>
 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
 {themes.map(t => (
 <button 
 key={t.id}
 onClick={() => updateSetting('theme', t.id)}
 className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative ${settings.theme === t.id ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-100'}`}
 >
 <div className={`w-10 h-6 rounded-md shadow-sm border ${t.color}`} />
 <span className="text-[10px] font-black uppercase text-slate-600">{t.label}</span>
 {settings.theme === t.id && <Check className="absolute top-1 right-1 w-3 h-3 text-blue-500" />}
 </button>
 ))}
 </div>
 </section>
 );
};
