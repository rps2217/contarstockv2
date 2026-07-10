
import React from 'react';
import { 
  Printer, 
  Lock, 
  Bell, 
  Building2,
  Monitor,
  Volume2,
  Vibrate,
  Camera
} from 'lucide-react';
import { AppSettings } from '../../../types';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const PreferencesSection: React.FC<Props> = ({ settings, updateSetting, theme = 'dark' }) => {
  const isDark = (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray';
  const isLight = theme === 'light';
  const isHighContrast = theme === 'high-contrast';

  // Clases según tema
  const cardBg = isHighContrast ? 'bg-black border-yellow-400' : isLight ? 'bg-white border-black' : 'bg-surface border-white/5';
  const headerBg = isHighContrast ? 'bg-yellow-950/30 border-yellow-400' : isLight ? 'bg-slate-50 border-black' : 'bg-white/5 border-white/5';
  const headerText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-white';
  const divider = isHighContrast ? 'divide-yellow-400/20' : isLight ? 'divide-black/5' : 'divide-white/5';
  const labelText = isHighContrast ? 'text-yellow-400' : isLight ? 'text-slate-900' : 'text-slate-900 dark:text-white';
  const descText = isHighContrast ? 'text-yellow-500' : isLight ? 'text-slate-500' : 'text-slate-500';
  const inputBg = isHighContrast ? 'bg-yellow-900/20 border-yellow-400 text-yellow-400' : isLight ? 'bg-slate-50 border-black text-slate-900' : 'bg-black text-white';

  const handleUpdatePrinter = (key: string, value: any) => {
    updateSetting('thermalPrinter', {
      ...settings.thermalPrinter,
      [key]: value
    });
  };

  const handleUpdateCapture = (key: string, value: any) => {
    updateSetting('captureSettings', {
      ...settings.captureSettings,
      [key]: value
    });
  };

  const sections = [
    {
      id: 'general',
      title: 'Identidad y Apariencia',
      icon: <Building2 className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-blue-500'}`} />,
      fields: [
        {
          label: 'Nombre de la Farmacia',
          description: 'Aparecerá en los tickets y reportes',
          type: 'text',
          value: settings.pharmacyName || '',
          onChange: (v: string) => updateSetting('pharmacyName', v)
        }
      ]
    },
    {
      id: 'security',
      title: 'Seguridad',
      icon: <Lock className={`w-5 h-5 ${isHighContrast ? 'text-yellow-400' : 'text-amber-500'}`} />,
      fields: [
        {
          label: 'Bloqueo Automático',
          description: 'Inactividad antes de bloquear pantalla',
          type: 'select',
          options: [
            { label: 'Desactivado', value: 0 },
            { label: '3 Segundos (Estricto)', value: 3000 },
            { label: '5 Segundos', value: 5000 },
            { label: '10 Segundos', value: 10000 },
            { label: '30 Segundos', value: 30000 },
            { label: '1 Minuto', value: 60000 },
            { label: '5 Minutos', value: 300000 }
          ],
          value: settings.autoLockTimeout || 0,
          onChange: (v: number) => updateSetting('autoLockTimeout', v)
        }
      ]
    }
  ];

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {sections.map((section) => (
        <div 
          key={section.id}
          className={`border-4 rounded-[2.5rem] overflow-hidden shadow-xl ${cardBg}`}
        >
          <div className={`px-6 py-4 flex items-center gap-3 border-b-4 ${headerBg}`}>
            {section.icon}
            <h2 className={`text-sm font-black uppercase italic tracking-wider ${headerText}`}>{section.title}</h2>
          </div>
          
          <div className={`divide-y-2 ${divider}`}>
            {section.fields.map((field, idx) => (
              <div key={idx} className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className={`text-sm font-black uppercase tracking-tight ${labelText}`}>{field.label}</h3>
                  <p className={`text-[10px] font-bold uppercase mt-0.5 ${descText}`}>{field.description}</p>
                </div>
                
                <div className="shrink-0">
                  {field.type === 'text' && (
                    <input 
                      type="text"
                      value={field.value}
                      onChange={(e) => (field.onChange as (v: any) => void)(e.target.value)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                    />
                  )}
                  
                  {field.type === 'number' && (
                    <input 
                      type="number"
                      value={field.value}
                      onChange={(e) => (field.onChange as (v: any) => void)(Number(e.target.value))}
                      className={`w-24 px-4 py-2 rounded-xl border-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                    />
                  )}

                  {field.type === 'select' && (
                    <select 
                      value={field.value}
                      onChange={(e) => (field.onChange as (v: any) => void)(Number(e.target.value) || e.target.value)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`}
                    >
                      {(field as any).options?.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'toggle' && (
                    <button 
                      onClick={() => (field.onChange as (v: any) => void)(!field.value)}
                      className={`w-12 h-6 rounded-full relative transition-colors border-2 ${
                        field.value 
                          ? (isHighContrast ? 'bg-yellow-400 border-yellow-600' : 'bg-blue-600 border-blue-800') 
                          : (isHighContrast ? 'bg-yellow-900/30 border-yellow-400' : 'bg-slate-700 border-slate-900')
                      }`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                        field.value ? 'left-6' : 'left-0.5'
                      }`} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
