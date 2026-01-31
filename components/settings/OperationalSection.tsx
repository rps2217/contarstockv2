
import React from 'react';
import { 
    Zap, Volume2, Mic, Cpu, FastForward, Smartphone, Trash2, ShieldCheck
} from 'lucide-react';
import { AppSettings } from '../../types';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const OperationalSection: React.FC<Props> = ({ settings, updateSetting }) => {
    
    const handleToggle = (key: keyof AppSettings) => {
        if (navigator.vibrate) navigator.vibrate(15);
        updateSetting(key, !settings[key]);
    };

    // Componente para filas completas con descripción
    const IndustrialSwitch = ({ active, label, icon: Icon, onClick, description }: any) => (
        <button 
            onClick={onClick}
            className={`w-full p-5 rounded-[2.5rem] border-4 transition-all duration-200 flex items-center justify-between group active:scale-[0.98] ${
                active 
                ? 'bg-blue-600 border-blue-700 text-white shadow-xl shadow-blue-900/20' 
                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
            }`}
        >
            <div className="flex items-center gap-4 text-left">
                <div className={`p-3 rounded-2xl transition-colors ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon className="w-6 h-6 stroke-[3px]" />
                </div>
                <div>
                    <div className={`font-black uppercase tracking-widest text-xs mb-1 ${active ? 'text-white' : 'text-slate-900'}`}>
                        {label}
                    </div>
                    <div className={`text-[10px] font-bold uppercase tracking-tight ${active ? 'text-blue-100' : 'text-slate-300'}`}>
                        {description}
                    </div>
                </div>
            </div>
            <div className={`w-12 h-6 rounded-full border-2 shrink-0 relative transition-all ${active ? 'bg-white border-white' : 'bg-slate-200 border-slate-300'}`}>
                <div className={`absolute top-0.5 bottom-0.5 w-4 bg-slate-900 rounded-full shadow-sm transition-all ${active ? 'right-1' : 'left-1'}`} />
            </div>
        </button>
    );

    // Componente compacto para la rejilla sensorial (2 columnas)
    const CompactSwitch = ({ active, label, icon: Icon, onClick }: any) => (
        <button 
            onClick={onClick}
            className={`w-full p-4 rounded-[2rem] border-4 transition-all duration-200 flex flex-col gap-3 group active:scale-[0.98] ${
                active 
                ? 'bg-blue-600 border-blue-700 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-white border-slate-200 text-slate-400'
            }`}
        >
            <div className="flex items-center justify-between w-full">
                <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Icon className="w-5 h-5 stroke-[3px]" />
                </div>
                <div className={`w-10 h-5 rounded-full border-2 shrink-0 relative transition-all ${active ? 'bg-white border-white' : 'bg-slate-200 border-slate-300'}`}>
                    <div className={`absolute top-0.5 bottom-0.5 w-3 bg-slate-900 rounded-full transition-all ${active ? 'right-1' : 'left-1'}`} />
                </div>
            </div>
            <div className={`font-black uppercase tracking-[0.15em] text-[11px] text-left leading-none ${active ? 'text-white' : 'text-slate-900'}`}>
                {label}
            </div>
        </button>
    );

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 px-1">
            <h3 className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Motor de Ejecución</h3>
            
            <IndustrialSwitch 
                active={settings.continuousMode} 
                onClick={() => handleToggle('continuousMode')}
                label="Gatillo Infinito"
                description="Protocolo Martillo sin pausa"
                icon={FastForward}
            />

            <IndustrialSwitch 
                active={settings.autoRegisterUnknown} 
                onClick={() => handleToggle('autoRegisterUnknown')}
                label="Auto-Captura"
                description="Registrar SKUs nuevos al vuelo"
                icon={Zap}
            />

            <div className="h-px bg-slate-200 my-4 mx-4 opacity-50"></div>
            
            <h3 className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Interfaz Sensorial</h3>

            <div className="grid grid-cols-2 gap-3">
                <CompactSwitch 
                    active={settings.soundEnabled} 
                    onClick={() => handleToggle('soundEnabled')}
                    label="Audio"
                    icon={Volume2}
                />
                <CompactSwitch 
                    active={settings.hapticsEnabled} 
                    onClick={() => handleToggle('hapticsEnabled')}
                    label="Háptico"
                    icon={Smartphone}
                />
            </div>

            <IndustrialSwitch 
                active={settings.ttsEnabled} 
                onClick={() => handleToggle('ttsEnabled')}
                label="Voz AI"
                description="Lectura audible de bultos"
                icon={Mic}
            />

            <div className="h-px bg-slate-200 my-4 mx-4 opacity-50"></div>
            
            <h3 className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Protección de Datos</h3>

            <IndustrialSwitch 
                active={settings.confirmDelete} 
                onClick={() => handleToggle('confirmDelete')}
                label="Seguro de Borrado"
                description="Evita eliminaciones accidentales"
                icon={ShieldCheck}
            />
            
            <IndustrialSwitch 
                active={settings.lowPerformanceMode} 
                onClick={() => handleToggle('lowPerformanceMode')}
                label="Modo Ultra-Eco"
                description="Optimiza batería en PDAs"
                icon={Cpu}
            />
        </div>
    );
};
