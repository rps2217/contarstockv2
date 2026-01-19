
import React from 'react';
import { Palette, Check, Sun, Moon, Monitor, Eye, Contrast } from 'lucide-react';
import { AppSettings, Theme } from '../../types';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const ThemeSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const themes: {id: Theme, label: string, bg: string, text: string, icon: any}[] = [
        { id: 'light', label: 'Día', bg: 'bg-white', text: 'text-slate-900', icon: Sun },
        { id: 'dark', label: 'Noche', bg: 'bg-slate-900', text: 'text-white', icon: Moon },
        { id: 'navy', label: 'Bodega', bg: 'bg-blue-900', text: 'text-blue-50', icon: Monitor },
        { id: 'oled', label: 'OLED', bg: 'bg-black', text: 'text-white', icon: Eye },
        { id: 'warm', label: 'Cálido', bg: 'bg-orange-50', text: 'text-orange-900', icon: Sun },
        { id: 'contrast', label: 'Alto Contraste', bg: 'bg-yellow-400', text: 'text-black', icon: Contrast },
    ];

    return (
        <section className="space-y-4 animate-in slide-in-from-bottom-2">
            <h3 className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Entorno Visual</h3>
            
            <div className="grid grid-cols-2 gap-4">
                {themes.map(t => {
                    const isSelected = (settings.theme || 'light') === t.id;
                    const Icon = t.icon;
                    return (
                        <button 
                            key={t.id}
                            onClick={() => {
                                if (navigator.vibrate) navigator.vibrate(10);
                                updateSetting('theme', t.id);
                            }}
                            className={`
                                relative p-6 rounded-[2rem] border-4 flex flex-col items-center gap-3 transition-all active:scale-95
                                ${isSelected 
                                    ? `border-blue-600 shadow-xl shadow-blue-900/10 ${t.bg}` 
                                    : `border-transparent ${t.bg} opacity-50 hover:opacity-100 hover:border-slate-200`
                                }
                            `}
                        >
                            <Icon className={`w-8 h-8 ${t.text}`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${t.text}`}>
                                {t.label}
                            </span>
                            {isSelected && (
                                <div className="absolute top-3 right-3 bg-blue-600 rounded-full p-1 shadow-sm animate-in zoom-in">
                                    <Check className="w-3 h-3 text-white stroke-[4px]" />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 mt-6">
                <p className="text-[10px] text-blue-800 font-bold text-center uppercase tracking-wide">
                    El tema "Alto Contraste" se recomienda para exteriores o escáneres con pantalla monocromática.
                </p>
            </div>
        </section>
    );
};
