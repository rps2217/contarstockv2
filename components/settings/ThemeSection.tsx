
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
        { id: 'oled', label: 'OLED Black', color: 'bg-black border-white/20' },
        { id: 'warm', label: 'Cálido', color: 'bg-orange-50 border-orange-100' },
        { id: 'contrast', label: 'Contraste', color: 'bg-black border-yellow-400' },
    ];

    return (
        <section className="bg-white dark:bg-slate-900/50 rounded-[2.5rem] p-8 border border-slate-200 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-pink-50 dark:bg-pink-900/20 p-2.5 rounded-xl">
                    <Palette className="w-6 h-6 text-pink-500" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Apariencia</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Personalizar Interfaz</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {themes.map(t => {
                    const isSelected = (settings.theme || 'light') === t.id;
                    return (
                        <button 
                            key={t.id}
                            onClick={() => updateSetting('theme', t.id)}
                            className={`p-4 rounded-[1.5rem] border-2 flex flex-col items-center gap-3 transition-all relative active:scale-95 ${
                                isSelected 
                                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 ring-4 ring-blue-100 dark:ring-blue-900/10' 
                                : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 hover:border-slate-200'
                            }`}
                        >
                            <div className={`w-12 h-8 rounded-lg shadow-sm border-2 ${t.color}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                {t.label}
                            </span>
                            {isSelected && (
                                <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-0.5 shadow-sm">
                                    <Check className="w-3 h-3 text-white stroke-[4px]" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
};
