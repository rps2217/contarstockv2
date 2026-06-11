
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
import { motion } from 'motion/react';

interface Props {
  settings: AppSettings;
  updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const PreferencesSection: React.FC<Props> = ({ settings, updateSetting }) => {
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
      icon: <Building2 className="w-5 h-5 text-blue-500" />,
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
      icon: <Lock className="w-5 h-5 text-amber-500" />,
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
          className="bg-white dark:bg-slate-900 border-4 border-black rounded-[2.5rem] overflow-hidden shadow-xl"
        >
          <div className="px-6 py-4 flex items-center gap-3 border-b-4 border-black bg-slate-50 dark:bg-white/5">
            {section.icon}
            <h2 className="text-sm font-black uppercase italic tracking-wider">{section.title}</h2>
          </div>
          
          <div className="divide-y-2 divide-black/5 dark:divide-white/5">
            {section.fields.map((field, idx) => (
              <div key={idx} className="px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm font-black uppercase tracking-tight">{field.label}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{field.description}</p>
                </div>
                
                <div className="shrink-0">
                  {field.type === 'text' && (
                    <input 
                      type="text"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="px-4 py-2 rounded-xl border-2 border-black bg-slate-50 dark:bg-black text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                  
                  {field.type === 'number' && (
                    <input 
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                      className="w-24 px-4 py-2 rounded-xl border-2 border-black bg-slate-50 dark:bg-black text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {field.type === 'select' && (
                    <select 
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value) || e.target.value)}
                      className="px-4 py-2 rounded-xl border-2 border-black bg-slate-50 dark:bg-black text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {field.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'toggle' && (
                    <button 
                      onClick={() => field.onChange(!field.value)}
                      className={`w-12 h-6 rounded-full relative transition-colors border-2 border-black ${
                        field.value ? 'bg-blue-600' : 'bg-slate-700'
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
