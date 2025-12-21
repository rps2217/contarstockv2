
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
    
    const Toggle = ({ active, onClick, color = "bg-blue-500" }: any) => (
        <button onClick={onClick} className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${active ? color : 'bg-slate-200'}`}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${active ? 'left-7' : 'left-1'}`} />
        </button>
    );

    const Item = ({ icon: Icon, title, sub, children, iconBg = "bg-slate-50", iconColor = "text-slate-400" }: any) => (
        <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${iconBg} ${iconColor} shrink-0`}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-base leading-tight">{title}</div>
                    {sub && <div className="text-[11px] text-slate-400 font-medium leading-tight mt-0.5">{sub}</div>}
                </div>
            </div>
            {children}
        </div>
    );

    return (
        <section className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden py-2">
            <div className="px-6 py-4 flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-bold text-slate-900">Preferencias Operativas</h2>
            </div>

            <div className="divide-y divide-slate-50">
                <Item 
                    title="Registro Rápido" 
                    sub="(Desconocidos) - Guardar items nuevos sin preguntar" 
                    icon={Zap}
                >
                    <Toggle active={settings.autoRegisterUnknown} onClick={() => updateSetting('autoRegisterUnknown', !settings.autoRegisterUnknown)} />
                </Item>
                
                <Item 
                    title="Sonido" 
                    icon={Volume2} 
                    iconColor="text-green-600" 
                    iconBg="bg-green-50"
                >
                    <Toggle active={settings.soundEnabled} onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)} color="bg-emerald-500" />
                </Item>

                <Item 
                    title="Vibración (Hápticos)" 
                    sub="Feedback táctil al escanear"
                    icon={Smartphone} 
                    iconColor="text-blue-600" 
                    iconBg="bg-blue-50"
                >
                    <Toggle active={settings.hapticsEnabled} onClick={() => updateSetting('hapticsEnabled', !settings.hapticsEnabled)} color="bg-blue-500" />
                </Item>

                <div className="px-1 py-1">
                    <div className="mx-2 mb-2 rounded-3xl border border-slate-100 bg-slate-50/30 overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 shrink-0">
                                    <Mic className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-base">Asistente de Voz</div>
                                    <div className="text-[11px] text-slate-400 font-medium">Confirmación auditiva</div>
                                </div>
                            </div>
                            <Toggle active={settings.ttsEnabled} onClick={() => updateSetting('ttsEnabled', !settings.ttsEnabled)} color="bg-purple-500" />
                        </div>

                        {settings.ttsEnabled && (
                            <div className="grid grid-cols-2 gap-3 px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                                <button 
                                    onClick={() => updateSetting('ttsMode', 'count')}
                                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${settings.ttsMode === 'count' ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-white border-slate-100 text-slate-400'}`}
                                >
                                    <Hash className="w-6 h-6" />
                                    <span className="text-[11px] font-black uppercase tracking-tight">Contador (1, 2...)</span>
                                </button>
                                <button 
                                    onClick={() => updateSetting('ttsMode', 'product')}
                                    className={`p-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${settings.ttsMode === 'product' ? 'bg-purple-50 border-purple-100 text-purple-700' : 'bg-white border-slate-100 text-slate-400'}`}
                                >
                                    <Type className="w-6 h-6" />
                                    <span className="text-[11px] font-black uppercase tracking-tight">Leer Nombre</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <Item title="Torre de Control" sub="Mostrar métricas en inicio" icon={BarChart3}>
                    <Toggle active={settings.controlTowerEnabled} onClick={() => updateSetting('controlTowerEnabled', !settings.controlTowerEnabled)} />
                </Item>

                <Item title="Velocímetro" sub="Mostrar items por minuto" icon={Gauge}>
                    <Toggle active={settings.speedometerEnabled} onClick={() => updateSetting('speedometerEnabled', !settings.speedometerEnabled)} />
                </Item>

                <Item 
                    title="Confirmar Eliminación" 
                    icon={AlertTriangle} 
                    iconColor="text-blue-600" 
                    iconBg="bg-blue-50"
                >
                    <Toggle active={settings.confirmDelete} onClick={() => updateSetting('confirmDelete', !settings.confirmDelete)} />
                </Item>

                <Item 
                    title="Bajo Rendimiento" 
                    sub="Reduce animaciones para dispositivos antiguos"
                    icon={Cpu} 
                    iconColor="text-slate-600" 
                    iconBg="bg-slate-100"
                >
                    <Toggle active={settings.lowPerformanceMode} onClick={() => updateSetting('lowPerformanceMode', !settings.lowPerformanceMode)} color="bg-slate-700" />
                </Item>
            </div>
        </section>
    );
};
