import React from 'react';
import { Sun, Moon, Contrast, CloudSun } from 'lucide-react';
import { AppSettings, Theme } from '../../../types';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'high-contrast' | 'gray' | 'night';
}

export const ThemeSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const currentTheme = settings.theme || 'night';
  const isDark = currentTheme === 'dark' || currentTheme === 'night';

  const themes = [
    { 
      id: 'night' as Theme, 
      label: 'Noche', 
      preview: { bg: '#0A0A0B', surface: '#18181B', accent: '#6B8CAE', text: '#FAFAFA' }, 
      icon: Moon 
    },
    { 
      id: 'gray' as Theme, 
      label: 'Gris', 
      preview: { bg: '#E8E8E8', surface: '#FFFFFF', accent: '#2563EB', text: '#171717' }, 
      icon: CloudSun 
    },
    { 
      id: 'light' as Theme, 
      label: 'Dia', 
      preview: { bg: '#FAFAFA', surface: '#FFFFFF', accent: '#2563EB', text: '#18181B' }, 
      icon: Sun 
    },
    { 
      id: 'high-contrast' as Theme, 
      label: 'Alto Contraste', 
      preview: { bg: '#000000', surface: '#1a1a1a', accent: '#FFFF00', text: '#FFFFFF' }, 
      icon: Contrast 
    },
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
          const isSelected = currentTheme === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleThemeChange(t.id)}
              className={`relative p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                isSelected 
                  ? 'shadow-lg ring-2 ring-blue-500 ring-offset-2' 
                  : 'border-slate-200 dark:border-white/10 opacity-70 hover:opacity-100'
              }`}
              style={{ 
                backgroundColor: t.preview.bg,
                borderColor: isSelected ? t.preview.accent : undefined,
                ringColor: isSelected ? '#3B82F6' : undefined,
                ringOffsetColor: isSelected ? (isDark ? '#0f1423' : '#ffffff') : undefined,
              }}
            >
              {/* Preview del tema */}
              <div className="w-full h-12 rounded-lg overflow-hidden flex flex-col">
                <div className="h-3" style={{ backgroundColor: t.preview.surface }} />
                <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: t.preview.bg }}>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: t.preview.accent }} />
                </div>
              </div>
              
              {/* Icono */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: t.preview.accent }}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              
              {/* Label */}
              <span className="text-xs font-medium" style={{ color: t.preview.text }}>{t.label}</span>
              
              {/* Check de seleccion */}
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
