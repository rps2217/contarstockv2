import React from 'react';
import { Palette, Check, Sun, Moon, Contrast, Sparkles } from 'lucide-react';
import { AppSettings, Theme } from '../../../types';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'high-contrast' | 'appsheet-dark';
}

export const ThemeSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';
  const isAppSheetDark = theme === 'appsheet-dark';

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
    { 
      id: 'appsheet-dark', 
      label: 'AppSheet', 
      bg: 'bg-[#0f0f1a]', 
      accent: 'bg-[#818cf8]', 
      text: 'text-white', 
      icon: Sparkles 
    },
  ];

  const infoBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400' : isLight ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-950/20 border-indigo-900/30';
  const infoIcon = isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-500' : 'text-indigo-400';
  const infoText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-900' : 'text-indigo-400';

  const handleThemeChange = (themeId: Theme) => {
    if (navigator.vibrate) navigator.vibrate(15);
    updateSetting('theme', themeId);
    
    if (themeId === 'appsheet-dark') {
      document.body.classList.add('appsheet-dark');
    } else {
      document.body.classList.remove('appsheet-dark');
    }
  };

  return (
    <section className="space-y-6 animate-in slide-in-from-bottom-2">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {themes.map(t => {
          const isSelected = (settings.theme || 'dark') === t.id;
          const Icon = t.icon;
          return (
            <button 
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`
                relative p-3 md:p-5 rounded-2xl border-4 flex flex-col items-center gap-2 md:gap-3 transition-all active:scale-95 overflow-hidden
                ${isSelected 
                  ? `border-blue-600 shadow-2xl shadow-blue-500/20 z-10 ${t.bg}` 
                  : isHighContrast 
                    ? `border-yellow-400/30 ${t.bg} opacity-80 hover:opacity-100 hover:border-yellow-400/50`
                    : `border-slate-100 dark:border-white/5 ${t.bg} opacity-80 hover:opacity-100 hover:border-slate-200`
                }
              `}
            >
              <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl flex items-center justify-center shadow-lg ${t.accent} ${isSelected ? 'animate-bounce' : ''}`}>
                <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
              </div>

              <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-wide ${t.text}`}>
                {t.label}
              </span>
            
              {isSelected && (
                <div className={`absolute top-2 right-2 rounded-full p-0.5 md:p-1 shadow-md border-2 ${
                  isHighContrast ? 'bg-yellow-400 border-black' : 'bg-blue-600 border-white'
                }`}>
                  <Check className="w-2 md:w-2.5 h-2 md:h-2.5 text-white stroke-[4px]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className={`border-4 rounded-[2rem] p-4 md:p-6 flex gap-3 md:gap-4 ${infoBg}`}>
        <Palette className={`w-5 h-5 md:w-7 md:h-7 shrink-0 ${infoIcon}`} />
        <p className={`text-[9px] md:text-[10px] font-bold uppercase leading-relaxed ${infoText}`}>
          Cambiar el tema afecta a toda la aplicación de inmediato. AppSheet ofrece un estilo sobrio con colores azulados fácil de leer.
        </p>
      </div>
    </section>
  );
};
