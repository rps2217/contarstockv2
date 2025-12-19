
import React from 'react';
import { Zap, Volume2, VolumeX, Mic, Hash, Type, BarChart3, Gauge, AlertTriangle, Wind } from 'lucide-react';
import { AppSettings } from '../../types';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const OperationalSection: React.FC<Props> = ({ settings, updateSetting }) => {
    return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" /> Preferencias Operativas
            </h2>
            <div className="space-y-4">
                
                {/* REGISTRO RÁPIDO - CRÍTICO */}
                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.autoRegisterUnknown ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-400'}`}>
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm">Registro Rápido (Desconocidos)</div>
                            <div className="text-[10px] text-slate-400">Guardar items nuevos sin preguntar</div>
                        </div>
                    </div>
                    <button onClick={() => updateSetting('autoRegisterUnknown', !settings.autoRegisterUnknown)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoRegisterUnknown ? 'bg-orange-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.autoRegisterUnknown ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.soundEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                            {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </div>
                        <div className="font-bold text-slate-900 text-sm">Sonido</div>
                    </div>
                    <button onClick={() => updateSetting('soundEnabled', !settings.soundEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-green-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.soundEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
                
                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${settings.ttsEnabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                                <Mic className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 text-sm">Asistente de Voz</div>
                                <div className="text-[10px] text-slate-400">Confirmación auditiva</div>
                            </div>
                        </div>
                        <button onClick={() => updateSetting('ttsEnabled', !settings.ttsEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.ttsEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.ttsEnabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {settings.ttsEnabled && (
                        <div className="grid grid-cols-2 gap-2 mt-2 pl-12 animate-in fade-in slide-in-from-top-2">
                            <button 
                                onClick={() => updateSetting('ttsMode', 'count')}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${settings.ttsMode === 'count' ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Hash className="w-5 h-5" />
                                <span className="text-[10px] font-bold">Contador (1, 2...)</span>
                            </button>
                            <button 
                                onClick={() => updateSetting('ttsMode', 'product')}
                                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${settings.ttsMode === 'product' ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <Type className="w-5 h-5" />
                                <span className="text-[10px] font-bold">Leer Nombre</span>
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.controlTowerEnabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm">Torre de Control</div>
                            <div className="text-[10px] text-slate-400">Métricas en inicio</div>
                        </div>
                    </div>
                    <button onClick={() => updateSetting('controlTowerEnabled', !settings.controlTowerEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.controlTowerEnabled ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.controlTowerEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.speedometerEnabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                            <Gauge className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm">Velocímetro</div>
                            <div className="text-[10px] text-slate-400">Items por minuto</div>
                        </div>
                    </div>
                    <button onClick={() => updateSetting('speedometerEnabled', !settings.speedometerEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.speedometerEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.speedometerEnabled ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.confirmDelete ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="font-bold text-slate-900 text-sm">Confirmar Eliminación</div>
                    </div>
                    <button onClick={() => updateSetting('confirmDelete', !settings.confirmDelete)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.confirmDelete ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.confirmDelete ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${settings.lowPerformanceMode ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                            <Wind className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-900 text-sm">Modo Alto Rendimiento</div>
                            <div className="text-[10px] text-slate-400">Reduce animaciones y efectos</div>
                        </div>
                    </div>
                    <button onClick={() => updateSetting('lowPerformanceMode', !settings.lowPerformanceMode)} className={`w-12 h-6 rounded-full transition-colors relative ${settings.lowPerformanceMode ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.lowPerformanceMode ? 'left-7' : 'left-1'}`} />
                    </button>
                </div>
            </div>
        </section>
    );
};
