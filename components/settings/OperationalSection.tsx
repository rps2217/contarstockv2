
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
        <SettingsSection title="Preferencias de Campo" className="grid grid-cols-2 gap-3">
            
            <SettingsToggle 
                active={settings.continuousMode} 
                onClick={() => handleToggle('continuousMode')}
                label="Escaneo Continuo"
                description="Gatillo automático"
                icon={FastForward}
            />

            <SettingsToggle 
                active={settings.batchTrackingEnabled} 
                onClick={() => handleToggle('batchTrackingEnabled')}
                label="Gestión Lotes"
                description="Habilitar Vencimientos"
                icon={CalendarRange}
            />

            <SettingsToggle 
                active={settings.autoRegisterUnknown} 
                onClick={() => handleToggle('autoRegisterUnknown')}
                label="Auto-Registro"
                description="Captura instantánea"
                icon={Zap}
            />

            <SettingsToggle 
                active={settings.ttsEnabled} 
                onClick={() => handleToggle('ttsEnabled')}
                label="Voz IA"
                description="Asistente audible"
                icon={Mic}
            />

            <SettingsToggle 
                active={settings.soundEnabled} 
                onClick={() => handleToggle('soundEnabled')}
                label="Audio Beep"
                description="Feedback industrial"
                icon={Volume2}
            />
            
            <SettingsToggle 
                active={settings.hapticsEnabled} 
                onClick={() => handleToggle('hapticsEnabled')}
                label="Vibración"
                description="Respuesta táctil"
                icon={Smartphone}
            />

            <SettingsToggle 
                active={settings.confirmDelete} 
                onClick={() => handleToggle('confirmDelete')}
                label="Safe Delete"
                description="Confirmar borrados"
                icon={ShieldCheck}
            />
            
            <SettingsToggle 
                active={settings.lowPerformanceMode} 
                onClick={() => handleToggle('lowPerformanceMode')}
                label="Eco Mode"
                description="Ahorro de batería"
                icon={Cpu}
            />
        </SettingsSection>
    );
};
