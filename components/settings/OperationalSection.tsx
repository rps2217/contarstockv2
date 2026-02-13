
import React from 'react';
import { 
    Zap, Volume2, Mic, Cpu, FastForward, 
    Smartphone, ShieldCheck, CalendarRange, 
    BellRing, MousePointerClick
} from 'lucide-react';
import { AppSettings } from '../../types';
import { SettingsSection, SettingsToggle } from './common/SettingsUI';

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
