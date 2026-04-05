
import React from 'react';
import { 
  Mic, Smartphone, CalendarRange, BellRing, Cpu
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
 <SettingsSection title="Operativa">

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
