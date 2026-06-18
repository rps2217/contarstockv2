import React from 'react';
import { Home, Database, History, Container, Cloud, Calendar, FileText, Settings } from 'lucide-react';
import { AppSettings, ViewState } from '../../../types';
import { SettingsSection } from './common/SettingsElements';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
}

/**
 * NavigationSection - Selector de módulo inicial
 * Simplificado: eliminado preview visual decorativo y badge "Nuevo Sistema"
 */
export const NavigationSection: React.FC<Props> = ({ settings, updateSetting }) => {
  const defaultStart = settings.defaultStartModule || 'dashboard';

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

  return (
    <SettingsSection title="Módulo de Inicio">
      <div className="space-y-2">
        <p className="text-xs text-slate-500 mb-3">
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
                className={`
                  flex items-center gap-3 p-3 rounded-xl border-2 transition-all
                  ${isActive 
                    ? 'bg-blue-500/10 border-blue-500 text-blue-500' 
                    : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400'
                  }
                `}
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
