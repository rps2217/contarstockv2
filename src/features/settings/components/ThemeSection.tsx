import React from 'react';
import { Sun, Moon, Contrast, Check } from 'lucide-react';
import { AppSettings, Theme } from '../../../types';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const ThemeSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const isDark = theme === 'dark';

  const themes: {id: Theme, label: string, bg: string, accent: string, text: string, icon: any}[] = [
    { id: 'light', label: 'Dia', bg: 'bg-white', accent: 'bg-amber-400', text: 'text-slate-900', icon: Sun },
    { id: 'dark', label: 'Noche', bg: 'bg-[#0f1423]', accent: 'bg-blue-500', text: 'text-white', icon: Moon },
    { id: 'high-contrast', label: 'Alto Contraste', bg: 'bg-black', accent: 'bg-yellow-400', text: 'text-yellow-400', icon: Contrast },
  ];

  const handleThemeChange = (themeId: Theme) => {
    if (navigator.vibrate) navigator.vibrate(10);
    updateSetting('theme', themeId);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
          <Sun className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
        </div>
        <div>
          <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Tema de la App</h3>
          <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Selecciona como se ve ContarStock</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {themes.map(t => {
          const isSelected = (settings.theme || 'dark') === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`relative p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${isSelected ? `${t.bg} border-blue-500 shadow-lg` : `${t.bg} border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100`}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.accent}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className={`text-xs font-medium ${t.text}`}>{t.label}</span>
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-blue-500" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
