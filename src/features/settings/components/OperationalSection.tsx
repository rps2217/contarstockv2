
import React from 'react';
import { 
  Mic, Smartphone, CalendarRange, BellRing, Cpu, History
} from 'lucide-react';
import { AppSettings } from '../../../types';
import { SettingsSection, SettingsToggle, SettingsInput } from './common/SettingsElements';

interface Props {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const OperationalSection: React.FC<Props> = ({ settings, updateSetting }) => {
 
 const handleToggle = (key: keyof AppSettings) => {
 if (navigator.vibrate) navigator.vibrate(15);
 updateSetting(key, !settings[key]);
 };

 return (
 <SettingsSection title="Operativa">

  <div className="bg-white dark:bg-slate-900 border-4 border-slate-100 dark:border-white/5 p-6 rounded-[2.5rem] mb-6 shadow-sm">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center">
        <History className="w-6 h-6 stroke-[3px]" />
      </div>
      <div className="flex-1">
        <h4 className="text-[11px] font-black uppercase text-slate-800 dark:text-white leading-none">Días de Retiro (Standard)</h4>
        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Margen para proveedores sin política</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <SettingsInput 
        type="number"
        value={settings.withdrawalDaysDefault || 30}
        onChange={(e: any) => updateSetting('withdrawalDaysDefault', parseInt(e.target.value) || 0)}
        className="text-center text-xl h-14"
      />
      <div className="w-16 h-14 bg-slate-50 dark:bg-black/40 border-4 border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-center font-black text-[10px] text-slate-400 uppercase">
        Días
      </div>
    </div>
  </div>

 <SettingsToggle 
 active={settings.batchTrackingEnabled} 
 onClick={() => handleToggle('batchTrackingEnabled')}
 label="Trazabilidad Pharma"
 description="Control de lotes y vencimientos"
 icon={CalendarRange}
 />

 <SettingsToggle 
 active={settings.ttsEnabled} 
 onClick={() => handleToggle('ttsEnabled')}
 label="Asistente de Voz"
 description="Confirmación audible de conteo"
 icon={Mic}
 />

 <SettingsToggle 
 active={settings.soundEnabled} 
 onClick={() => handleToggle('soundEnabled')}
 label="Alertas de Audio"
 description="Beeps de feedback industrial"
 icon={BellRing}
 />
 
 <SettingsToggle 
 active={settings.hapticsEnabled} 
 onClick={() => handleToggle('hapticsEnabled')}
 label="Respuesta Háptica"
 description="Vibración inteligente al scanear"
 icon={Smartphone}
 />

 <SettingsToggle 
 active={settings.lowEndMode || false} 
 onClick={() => handleToggle('lowEndMode')}
 label="Modo Bajo Rendimiento"
 description="Desactiva IA local para ahorrar RAM"
 icon={Cpu}
 />

 </SettingsSection>
 );
};

// Forced GitHub sync
