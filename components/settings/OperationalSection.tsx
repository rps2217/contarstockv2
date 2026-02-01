
import React from 'react';
import { Zap, Volume2, Mic, Cpu, FastForward, Smartphone, ShieldCheck } from 'lucide-react';
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
        <SettingsSection title="Operativa">
            
            <SettingsToggle 
                active={settings.continuousMode} 
                onClick={() => handleToggle('continuousMode')}
                label="Gatillo Infinito"
                description="Protocolo Martillo sin pausa"
                icon={FastForward}
            />

            <SettingsToggle 
                active={settings.autoRegisterUnknown} 
                onClick={() => handleToggle('autoRegisterUnknown')}
                label="Auto-Captura"
                description="Registrar SKUs nuevos al vuelo"
                icon={Zap}
            />

            <div className="grid grid-cols-2 gap-3 my-4">
                <SettingsToggle 
                    active={settings.soundEnabled} 
                    onClick={() => handleToggle('soundEnabled')}
                    label="Audio"
                    icon={Volume2}
                />
                <SettingsToggle 
                    active={settings.hapticsEnabled} 
                    onClick={() => handleToggle('hapticsEnabled')}
                    label="Háptico"
                    icon={Smartphone}
                />
            </div>

            <SettingsToggle 
                active={settings.ttsEnabled} 
                onClick={() => handleToggle('ttsEnabled')}
                label="Voz AI"
                description="Lectura audible de bultos"
                icon={Mic}
            />

            <SettingsToggle 
                active={settings.confirmDelete} 
                onClick={() => handleToggle('confirmDelete')}
                label="Seguro de Borrado"
                description="Evita eliminaciones accidentales"
                icon={ShieldCheck}
            />
            
            <SettingsToggle 
                active={settings.lowPerformanceMode} 
                onClick={() => handleToggle('lowPerformanceMode')}
                label="Modo Ultra-Eco"
                description="Optimiza batería en PDAs"
                icon={Cpu}
            />
        </SettingsSection>
    );
};
