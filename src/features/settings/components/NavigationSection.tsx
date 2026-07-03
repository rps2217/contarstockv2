import React from 'react';
import { Home, Database, History, Container, Cloud, Calendar, FileText, Settings } from 'lucide-react';
import { AppSettings, ViewState } from '../../../types';
import { SettingsSection } from './common/SettingsElements';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

/**
 * NavigationSection - Selector de módulo inicial
 */
export const NavigationSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';
  
  const defaultStart = settings.defaultStartModule || 'dashboard';

  // Clases según tema
  const textMuted = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-500' : 'text-slate-500';

  const modules: { id: ViewState; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'reception', label: 'Recepción', icon: Container },
    { id: 'expiry', label: 'Vencimientos', icon: Calendar },
    { id: 'events', label: 'Eventos', icon: FileText },
    { id: 'reports', label: 'Historial', icon: History },
    { id: 'database', label: 'Catálogo', icon: Database },
    { id: 'sync', label: 'Nube', icon: Cloud },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  const getButtonClass = (isActive: boolean) => {
    if (isActive) {
      return isHighContrast 
        ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' 
        : isLight 
          ? 'bg-blue-500/10 border-blue-500 text-blue-500' 
          : 'bg-blue-500/10 border-blue-500 text-blue-500';
    }
    return isHighContrast 
      ? 'bg-yellow-900/20 border-transparent text-yellow-400 hover:bg-yellow-900/30' 
      : isLight 
        ? 'bg-slate-50 border-transparent text-slate-600' 
        : 'bg-elevated border-transparent text-muted';
  };

  return (
    <SettingsSection title="Módulo de Inicio" theme={theme}>
      <div className="space-y-2">
        <p className={`text-xs ${textMuted} mb-3`}>
          Selecciona el módulo que se abrirá al iniciar la app.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const isActive = defaultStart === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => updateSetting('defaultStartModule', mod.id)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${getButtonClass(isActive)}`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-bold">{mod.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </SettingsSection>
  );
};
