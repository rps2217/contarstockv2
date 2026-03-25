
import React from 'react';
import { 
  Zap, Volume2, Mic, Cpu, FastForward, 
  Smartphone, ShieldCheck, CalendarRange, 
  BellRing, MousePointerClick, Truck
} from 'lucide-react';
import { AppSettings } from '../../../types';
import { SettingsSection, SettingsToggle } from './common/SettingsElements';

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
 <SettingsSection title="Preferencias de Campo">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border-2 border-slate-100 dark:border-white/5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
              <Truck className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-tighter italic dark:text-white">Destino Predeterminado</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ubicación de destino activa</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['BOD. 37', 'BOD. 80', 'BOD. 95', 'BOD. 98', 'BOD. 106', 'BOD. 121'].map(d => (
            <button
              key={d}
              onClick={() => updateSetting('selectedDestino', d)}
              className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                settings.selectedDestino === d
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-500 hover:bg-white dark:hover:bg-white/10'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
 
 <SettingsToggle 
 active={settings.continuousMode} 
 onClick={() => handleToggle('continuousMode')}
 label="Escaneo Continuo"
 description="Gatillo automático sin pausas"
 icon={FastForward}
 />

 <SettingsToggle 
 active={settings.batchTrackingEnabled} 
 onClick={() => handleToggle('batchTrackingEnabled')}
 label="Trazabilidad Pharma"
 description="Control de lotes y vencimientos"
 icon={CalendarRange}
 />

 <SettingsToggle 
 active={settings.autoRegisterUnknown} 
 onClick={() => handleToggle('autoRegisterUnknown')}
 label="Auto-Registro"
 description="Captura de SKUs no catalogados"
 icon={Zap}
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
 active={settings.confirmDelete} 
 onClick={() => handleToggle('confirmDelete')}
 label="Protocolo Seguro"
 description="Validar antes de borrar picks"
 icon={ShieldCheck}
 />
 
 <SettingsToggle 
 active={settings.lowPerformanceMode} 
 onClick={() => handleToggle('lowPerformanceMode')}
 label="Ecomodo PDA"
 description="Ahorro energético para turnos largos"
 icon={Cpu}
 />
 </SettingsSection>
 );
};
