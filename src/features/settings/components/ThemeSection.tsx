
import React from 'react';
import { Palette, Check, Sun, Moon, Contrast } from 'lucide-react';
import { AppSettings, Theme } from '../../../types';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const ThemeSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  const themes: {id: Theme, label: string, bg: string, accent: string, text: string, icon: any}[] = [
    { 
      id: 'light', 
      label: 'Día', 
      bg: 'bg-white', 
      accent: 'bg-blue-600', 
      text: 'text-slate-900', 
      icon: Sun 
    },
    { 
      id: 'dark', 
      label: 'Noche', 
      bg: 'bg-slate-900', 
      accent: 'bg-blue-500', 
      text: 'text-white', 
      icon: Moon 
    },
    { 
      id: 'high-contrast', 
      label: 'Contraste', 
      bg: 'bg-black', 
      accent: 'bg-yellow-500', 
      text: 'text-yellow-400', 
      icon: Contrast 
    },
  ];

  // Clases según tema del contenedor info
  const infoBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400' : isLight ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-950/20 border-indigo-900/30';
  const infoIcon = isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-500' : 'text-indigo-400';
  const infoText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-900' : 'text-indigo-400';

  return (
    <section className="space-y-6 animate-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                  : isHighContrast 
                    ? `border-yellow-400/30 ${t.bg} opacity-80 hover:opacity-100 hover:border-yellow-400/50`
                    : `border-slate-100 dark:border-white/5 ${t.bg} opacity-80 hover:opacity-100 hover:border-slate-200`
                }
              `}
            >
              {/* Previsualización de color */}
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${t.accent} ${isSelected ? 'animate-bounce' : ''}`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              <span className={`text-[11px] font-black uppercase tracking-widest ${t.text}`}>
                {t.label}
              </span>

              {isSelected && (
                <div className={`absolute top-4 right-4 rounded-full p-1 shadow-md border-2 ${
                  isHighContrast ? 'bg-yellow-400 border-black' : 'bg-blue-600 border-white'
                }`}>
                  <Check className="w-3 h-3 text-white stroke-[4px]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className={`border-4 rounded-[2rem] p-6 flex gap-4 ${infoBg}`}>
        <Palette className={`w-8 h-8 shrink-0 ${infoIcon}`} />
        <p className={`text-[10px] font-bold uppercase leading-relaxed ${infoText}`}>
          Cambiar el tema afecta a toda la aplicación de inmediato, optimizando la visibilidad según las condiciones de luz de la bodega.
        </p>
      </div>
    </section>
  );
};
