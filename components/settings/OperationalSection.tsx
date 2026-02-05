
import React from 'react';
import { Zap, Volume2, Mic, Cpu, FastForward, Smartphone, ShieldCheck, CalendarRange } from 'lucide-react';
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
                label="Gestión de Lotes"
                description="Habilitar Lote y Vencimiento"
                icon={CalendarRange}
            />

            <SettingsToggle 
                active={settings.autoRegisterUnknown} 
                onClick={() => handleToggle('autoRegisterUnknown')}
                label="Auto-Registro"
                description="Captura instantánea de SKUs nuevos"
                icon={Zap}
            />

            <SettingsToggle 
                active={settings.ttsEnabled} 
                onClick={() => handleToggle('ttsEnabled')}
                label="Asistente de Voz"
                description="Confirmación audible de registros"
                icon={Mic}
            />

            <SettingsToggle 
                active={settings.soundEnabled} 
                onClick={() => handleToggle('soundEnabled')}
                label="Feedback Sonoro"
                description="Beeps industriales de confirmación"
                icon={Volume2}
            />
            
            <SettingsToggle 
                active={settings.hapticsEnabled} 
                onClick={() => handleToggle('hapticsEnabled')}
                label="Feedback Háptico"
                description="Vibración de alta penetración"
                icon={Smartphone}
            />

            <SettingsToggle 
                active={settings.confirmDelete} 
                onClick={() => handleToggle('confirmDelete')}
                label="Seguro de Borrado"
                description="Validar antes de eliminar picks"
                icon={ShieldCheck}
            />
            
            <SettingsToggle 
                active={settings.lowPerformanceMode} 
                onClick={() => handleToggle('lowPerformanceMode')}
                label="Ahorro de Energía"
                description="Optimización agresiva de batería"
                icon={Cpu}
            />
        </SettingsSection>
    );
};
