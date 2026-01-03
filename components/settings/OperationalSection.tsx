
import React from 'react';
import { 
    Zap, Volume2, Mic, BarChart3, Gauge, AlertTriangle, Hash, Type, 
    Smartphone, Cpu
} from 'lucide-react';
import { AppSettings } from '../../types';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const OperationalSection: React.FC<Props> = ({ settings, updateSetting }) => {
    
    const Toggle = ({ active, onClick, color = "bg-blue-600" }: any) => (
        <button 
            onClick={onClick} 
            className={`w-16 h-8 rounded-full transition-all relative shrink-0 border-2 ${active ? `${color} border-black` : 'bg-slate-200 border-slate-300'}`}
        >
            <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full transition-all shadow-md ${active ? 'left-8 border-2 border-black' : 'left-1'}`} />
        </button>
    );

    const Item = ({ icon: Icon, title, sub, children, iconBg = "bg-slate-100", iconColor = "text-slate-900" }: any) => (
        <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
                <div className={`p-4 rounded-2xl ${iconBg} ${iconColor} border-2 border-slate-100 shrink-0`}>
                    <Icon className="w-6 h-6 stroke-[2.5px]" />
                </div>
                <div className="min-w-0">
                    <div className="font-black text-black text-lg leading-none mb-1 uppercase tracking-tighter">{title}</div>
                    {sub && <div className="text-[10px] text-slate-500 font-bold leading-tight uppercase tracking-wider">{sub}</div>}
                </div>
            </div>
            {children}
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="bg-white rounded-[2.5rem] shadow-xl border-4 border-black overflow-hidden divide-y-4 divide-slate-50">
                <Item title="Auto Registro" sub="Guardar items desconocidos" icon={Zap}>
                    <Toggle active={settings.autoRegisterUnknown} onClick={() => updateSetting('autoRegisterUnknown', !settings.autoRegisterUnknown)} />
                </Item>
                
                <Item title="Sonido" sub="Alertas audibles" icon={Volume2} iconColor="text-emerald-700" iconBg="bg-emerald-50">
                    <Toggle active={settings.soundEnabled} onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)} color="bg-emerald-600" />
                </Item>

                <Item title="Vibración" sub="Feedback táctil" icon={Smartphone} iconColor="text-blue-700" iconBg="bg-blue-50">
                    <Toggle active={settings.hapticsEnabled} onClick={() => updateSetting('hapticsEnabled', !settings.hapticsEnabled)} color="bg-blue-600" />
                </Item>

                <div className="bg-slate-50/50 p-1">
                    <div className="bg-white rounded-[2rem] border-2 border-slate-200">
                        <Item title="Voz (TTS)" sub="Asistente activo" icon={Mic} iconColor="text-purple-700" iconBg="bg-purple-50">
                            <Toggle active={settings.ttsEnabled} onClick={() => updateSetting('ttsEnabled', !settings.ttsEnabled)} color="bg-purple-600" />
                        </Item>
                        {settings.ttsEnabled && (
                            <div className="grid grid-cols-2 gap-2 p-4 pt-0">
                                <button 
                                    onClick={() => updateSetting('ttsMode', 'count')}
                                    className={`py-4 rounded-2xl border-4 font-black uppercase text-[10px] tracking-widest transition-all ${settings.ttsMode === 'count' ? 'bg-black border-black text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                >
                                    Contador
                                </button>
                                <button 
                                    onClick={() => updateSetting('ttsMode', 'product')}
                                    className={`py-4 rounded-2xl border-4 font-black uppercase text-[10px] tracking-widest transition-all ${settings.ttsMode === 'product' ? 'bg-black border-black text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                                >
                                    Producto
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <Item title="Velocímetro" sub="Items por minuto" icon={Gauge}>
                    <Toggle active={settings.speedometerEnabled} onClick={() => updateSetting('speedometerEnabled', !settings.speedometerEnabled)} />
                </Item>

                <Item title="Eco Mode" sub="Ahorro de batería" icon={Cpu} iconColor="text-slate-600" iconBg="bg-slate-200">
                    <Toggle active={settings.lowPerformanceMode} onClick={() => updateSetting('lowPerformanceMode', !settings.lowPerformanceMode)} color="bg-slate-800" />
                </Item>
            </div>
        </div>
    );
};
