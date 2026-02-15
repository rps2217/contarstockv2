
import React, { useState } from 'react';
import { ShieldCheck, Wifi, AlertCircle, Info, Database, Link, RefreshCw } from 'lucide-react';
import { AppSettings } from '../../types';
import { SettingsSection, SettingsCard, SettingsButton, SettingsInput } from './common/SettingsUI';
import { bootstrapByUrl } from '../../services/gasService';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [urlInput, setUrlInput] = useState(settings.appSheetConfig?.gasWebAppUrl || '');
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAutoConfig = async () => {
        if (!urlInput.includes('/exec')) {
            setError("La URL no parece válida. Debe terminar en /exec");
            return;
        }

        setError(null);
        setIsConnecting(true);
        try {
            const fullConfig = await bootstrapByUrl(urlInput);
            updateSetting('appSheetConfig', fullConfig);
            alert(`¡Conexión Exitosa!\nVinculado a: ${fullConfig.spreadsheetId?.substring(0, 10)}...`);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <SettingsSection title="Conexión Inteligente">
                
                <SettingsCard className="bg-slate-900 border-indigo-500/30 text-white">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
                                <Link className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Vinculación Maestra</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Un solo paso para configurar el sistema</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] ml-1">URL de Implementación GAS</label>
                            <SettingsInput 
                                value={urlInput}
                                onChange={(e: any) => setUrlInput(e.target.value)}
                                placeholder="https://script.google.com/macros/s/.../exec"
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 h-16 text-xs font-mono"
                            />
                        </div>

                        {error && (
                            <div className="bg-rose-500/10 border-2 border-rose-500/30 p-4 rounded-2xl flex items-center gap-3 animate-in shake">
                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                <p className="text-[10px] text-rose-100 font-bold uppercase leading-tight">{error}</p>
                            </div>
                        )}

                        <SettingsButton 
                            onClick={handleAutoConfig}
                            isLoading={isConnecting}
                            disabled={!urlInput}
                            label={isConnecting ? "Sincronizando..." : "Vincular Ahora"}
                            icon={Wifi}
                            variant="primary"
                            className="bg-indigo-600 border-indigo-400 h-16"
                        />
                    </div>
                </SettingsCard>

                <div className="bg-blue-900/10 border-2 border-blue-500/20 p-6 rounded-[2.5rem] flex gap-5">
                    <Info className="w-8 h-8 text-blue-400 shrink-0" />
                    <div className="space-y-2">
                        <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">¿Cómo funciona?</p>
                        <p className="text-[9px] text-blue-400/80 leading-relaxed font-medium uppercase">
                            1. Crea una pestaña llamada <span className="text-white font-black">CONFIG_SISTEMA</span> en tu Excel.<br/>
                            2. Agrega cabeceras como <span className="text-white">APP_ID</span>, <span className="text-white">ACCESS_KEY</span>, etc.<br/>
                            3. Pega la URL de tu script arriba y presiona vincular.<br/>
                            <span className="text-indigo-400 italic">La App descargará todo automáticamente.</span>
                        </p>
                    </div>
                </div>

                {settings.appSheetConfig?.appId && (
                    <div className="px-6 py-4 bg-emerald-500/5 border-2 border-emerald-500/10 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Sistema Vinculado: {settings.appSheetConfig.appId.substring(0, 8)}...</span>
                        </div>
                        <RefreshCw className="w-3 h-3 text-emerald-800" />
                    </div>
                )}

            </SettingsSection>
        </div>
    );
};
