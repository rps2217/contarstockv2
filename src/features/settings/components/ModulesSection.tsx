import React from 'react';
import { LayoutGrid, AlertCircle } from 'lucide-react';
import { getModules, toggleModule } from '../../../services/moduleManager';

interface Props {
  theme?: 'dark' | 'light' | 'high-contrast';
}

export const ModulesSection: React.FC<Props> = ({ theme = 'dark' }) => {
  const [modules, setModules] = React.useState(getModules());

  const isDark = theme === 'dark';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-slate-200' : 'bg-surface border-white/10';
  const headerText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-800' : 'text-white';
  const rowBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : isLight ? 'bg-slate-50 border-slate-100' : 'bg-elevated/50 border-subtle';
  const rowText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-700' : 'text-primary';
  const dotEnabled = isHighContrast ? 'bg-yellow-400' : 'bg-emerald-500';
  const dotDisabled = 'bg-slate-300';
  const btnActive = isHighContrast ? 'bg-yellow-400 text-black hover:bg-yellow-300' : isLight ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white hover:bg-indigo-700';
  const btnInactive = isHighContrast ? 'bg-yellow-900/30 text-yellow-400' : isLight ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' : 'bg-slate-700 text-slate-500 hover:bg-slate-600';
  const infoBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400/30' : isLight ? 'bg-indigo-50' : 'bg-indigo-900/10';
  const infoText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-indigo-800' : 'text-indigo-400';

  const handleToggle = async (key: string, enabled: boolean) => {
    await toggleModule(key, enabled);
    setModules(getModules());
  };

  return (
    <div className={`border p-6 rounded-2xl shadow-sm ${cardBg}`}>
      <div className="flex items-center gap-3 mb-6">
        <LayoutGrid className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-indigo-500'}`} />
        <h2 className={`text-lg font-black uppercase tracking-wider ${headerText}`}>
          Gestión de Módulos (Lego)
        </h2>
      </div>
      
      <div className="space-y-3">
        {Object.entries(modules).map(([key, config]) => (
          <div key={key} className={`flex items-center justify-between p-4 rounded-xl border ${rowBg}`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${config.enabled ? dotEnabled : dotDisabled}`} />
              <span className={`font-bold ${rowText}`}>{config.name}</span>
            </div>
            <button
              onClick={() => handleToggle(key, !config.enabled)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${config.enabled ? btnActive : btnInactive}`}
            >
              {config.enabled ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        ))}
      </div>
      <div className={`mt-6 flex items-start gap-3 p-4 rounded-xl border ${infoBg} ${infoText}`}>
        <AlertCircle className="w-5 h-5 shrink-0" />
        <p className="text-[11px] font-medium leading-relaxed">
          Al desactivar un módulo, este desaparecerá del menú lateral y las rutas asociadas serán inaccesibles. La configuración se guarda localmente.
        </p>
      </div>
    </div>
  );
};
