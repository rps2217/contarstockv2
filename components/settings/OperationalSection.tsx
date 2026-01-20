
import React from 'react';
import { 
    Zap, Volume2, Mic, Gauge, Cpu, Sparkles, FastForward, Power, Smartphone
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

    const IndustrialSwitch = ({ active, label, icon: Icon, onClick, description }: any) => (
        <button 
            onClick={onClick}
            className={`w-full p-5 rounded-3xl border-4 transition-all duration-200 flex items-center justify-between group active:scale-[0.98] ${
                active 
                ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-900/20' 
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
                    <div className={`text-[10px] font-bold uppercase tracking-tight ${active ? 'text-slate-400' : 'text-slate-300'}`}>
                        {description}
                    </div>
                </div>
            </div>
            <div className={`w-12 h-6 rounded-full border-2 relative transition-all ${active ? 'bg-emerald-500 border-emerald-600' : 'bg-slate-200 border-slate-300'}`}>
                <div className={`absolute top-0.5 bottom-0.5 w-4 bg-white rounded-full shadow-sm transition-all ${active ? 'right-1' : 'left-1'}`} />
            </div>
        </button>
    );

    return (
        <div className="space-y-3 animate-in slide-in-from-bottom-2">
            <h3 className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Sensores y IA</h3>
            
            <IndustrialSwitch 
                active={settings.predictiveHintsEnabled} 
                onClick={() => handleToggle('predictiveHintsEnabled')}
                label="Motor Predictivo"
                description="Sugerencias IA por patrón"
                icon={Sparkles}
            />

            <IndustrialSwitch 
                active={settings.continuousMode} 
                onClick={() => handleToggle('continuousMode')}
                label="Modo Ráfaga"
                description="Escaneo sin pausa"
                icon={FastForward}
            />

            <IndustrialSwitch 
                active={settings.autoRegisterUnknown} 
                onClick={() => handleToggle('autoRegisterUnknown')}
                label="Auto-Registro"
                description="Guardar nuevos SKUs auto"
                icon={Zap}
            />

            <div className="h-px bg-slate-200 my-4 mx-4"></div>
            <h3 className="ml-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Feedback Físico</h3>

            <div className="grid grid-cols-2 gap-3">
                <IndustrialSwitch 
                    active={settings.soundEnabled} 
                    onClick={() => handleToggle('soundEnabled')}
                    label="Sonido"
                    icon={Volume2}
                />
                <IndustrialSwitch 
                    active={settings.hapticsEnabled} 
                    onClick={() => handleToggle('hapticsEnabled')}
                    label="Vibración"
                    icon={Smartphone}
                />
            </div>

            <IndustrialSwitch 
                active={settings.ttsEnabled} 
                onClick={() => handleToggle('ttsEnabled')}
                label="Asistente Voz"
                description="Lectura de items (TTS)"
                icon={Mic}
            />

            {settings.ttsEnabled && (
                <div className="bg-slate-100 p-2 rounded-2xl flex gap-2">
                    {['count', 'product'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => updateSetting('ttsMode', mode as any)}
                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                settings.ttsMode === mode 
                                ? 'bg-white text-blue-600 shadow-sm border border-slate-200' 
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            {mode === 'count' ? 'Solo Cantidad' : 'Nombre Producto'}
                        </button>
                    ))}
                </div>
            )}

            <div className="h-px bg-slate-200 my-4 mx-4"></div>

            <IndustrialSwitch 
                active={settings.lowPerformanceMode} 
                onClick={() => handleToggle('lowPerformanceMode')}
                label="Modo Eco"
                description="Ahorro de batería extremo"
                icon={Cpu}
            />
        </div>
    );
};
