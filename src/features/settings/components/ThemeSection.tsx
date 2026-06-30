import React from 'react';
import { Sun, Moon, Contrast, CloudSun } from 'lucide-react';
import { AppSettings, Theme } from '../../../types';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'high-contrast' | 'gray' | 'night';
}

export const ThemeSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const isDark = theme === 'dark' || theme === 'night';

  const themes: {id: Theme, label: string, bg: string, bgAlt: string, accent: string, text: string, border: string, icon: any}[] = [
    { id: 'night', label: 'Noche', bg: 'bg-[#0A0A0B]', bgAlt: 'bg-[#18181B]', accent: 'bg-[#6B8CAE]', text: 'text-white', border: 'border-[#6B8CAE]', icon: Moon },
    { id: 'gray', label: 'Gris', bg: 'bg-[#f0f0f0]', bgAlt: 'bg-[#e8e8e8]', accent: 'bg-[#525252]', text: 'text-[#171717]', border: 'border-[#525252]', icon: CloudSun },
    { id: 'light', label: 'Dia', bg: 'bg-white', bgAlt: 'bg-slate-50', accent: 'bg-amber-400', text: 'text-slate-900', border: 'border-slate-300', icon: Sun },
    { id: 'high-contrast', label: 'Alto Contraste', bg: 'bg-black', bgAlt: 'bg-gray-900', accent: 'bg-yellow-400', text: 'text-yellow-400', border: 'border-white', icon: Contrast },
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {themes.map(t => {
          const isSelected = (settings.theme || 'dark') === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`relative p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                isSelected 
                  ? `${t.bg} ${t.border} shadow-lg ring-2 ring-blue-500 ring-offset-2 ${isDark ? 'ring-offset-[#0f1423]' : 'ring-offset-white'}` 
                  : `${t.bg} border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100`
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.accent}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${t.bgAlt}`} />
                <div className={`w-3 h-3 rounded-sm ${t.bg}`} />
              </div>
              <span className={`text-xs font-medium ${t.text}`}>{t.label}</span>
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-[10px]">✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};
