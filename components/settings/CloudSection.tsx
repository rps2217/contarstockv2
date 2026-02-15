
import React, { useState } from 'react';
import { ShieldCheck, Wifi, AlertCircle, Info, Database } from 'lucide-react';
import { AppSettings } from '../../types';
import { SettingsSection, SettingsCard, SettingsButton, SettingsInput } from './common/SettingsUI';
import { bootstrapByUrl } from '../../services/gasService';

interface Props {
    settings: AppSettings;
    updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
    const [scriptUrl, setScriptUrl] = useState(settings.appSheetConfig?.gasWebAppUrl || '');
    const [ssId, setSsId] = useState(settings.appSheetConfig?.spreadsheetId || '');
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorMode, setErrorMode] = useState<null | 'ID_REQUIRED' | 'URL_INVALID'>(null);

    const handleAutoConfig = async () => {
        if (!scriptUrl.includes('/exec')) {
            setErrorMode('URL_INVALID');
            return;
        }
        
        setErrorMode(null);
        setIsConnecting(true);
        try {
            const fullConfig = await bootstrapByUrl(scriptUrl, ssId);
            updateSetting('appSheetConfig', fullConfig);
            alert("¡Conexión Exitosa! El sistema ahora está vinculado.");
        } catch (e: any) {
            if (e.message === 'EXCEL_ID_REQUIRED') {
                setErrorMode('ID_REQUIRED');
            } else {
                alert("Error: " + e.message);
            }
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <SettingsSection title="Conectividad Cloud">
                
                <SettingsCard className="bg-slate-900 border-indigo-500/30 text-white">
                    <div className="space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-600 rounded-2xl">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase italic tracking-tighter leading-none">Vínculo con Excel</h3>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Google Apps Script API</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">1. URL del Script</label>
                                <SettingsInput 
                                    value={scriptUrl}
                                    onChange={(e: any) => setScriptUrl(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                                />
                                {errorMode === 'URL_INVALID' && (
                                    <p className="text-[9px] text-rose-400 font-bold ml-2">La URL debe terminar en /exec</p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">2. ID del Spreadsheet (Opcional si es vinculado)</label>
                                <div className="relative">
                                    <SettingsInput 
                                        value={ssId}
                                        onChange={(e: any) => setSsId(e.target.value)}
                                        placeholder="Pegue aquí el ID largo de su Excel"
                                        className={`bg-white/5 border-white/10 text-white placeholder:text-slate-600 ${errorMode === 'ID_REQUIRED' ? 'border-rose-500 bg-rose-500/5' : ''}`}
                                    />
                                    <Database className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10" />
                                </div>
                                {errorMode === 'ID_REQUIRED' && (
                                    <div className="flex items-center gap-2 mt-2 p-3 bg-rose-500/20 rounded-xl border border-rose-500/40">
                                        <AlertCircle className="w-4 h-4 text-rose-400" />
                                        <p className="text-[9px] text-rose-100 font-bold uppercase leading-tight">
                                            Tu script es independiente. Debes pegar el ID del Excel para que pueda conectarse.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <SettingsButton 
                            onClick={handleAutoConfig}
                            isLoading={isConnecting}
                            disabled={!scriptUrl}
                            label={isConnecting ? "Validando..." : "Vincular Sistema"}
                            icon={Wifi}
                            variant="primary"
                            className="bg-indigo-600 border-indigo-400"
                        />
                    </div>
                </SettingsCard>

                <div className="bg-blue-900/10 border-2 border-blue-500/20 p-5 rounded-[2rem] flex gap-4">
                    <Info className="w-6 h-6 text-blue-400 shrink-0" />
                    <div className="space-y-1">
                        <p className="text-[9px] text-blue-200 font-bold uppercase tracking-wider">¿Dónde obtengo el ID?</p>
                        <p className="text-[9px] text-blue-400 leading-relaxed font-medium">
                            Abre tu archivo Excel en el navegador. En la barra de direcciones verás algo como: <br/>
                            <span className="text-white/40 italic">docs.google.com/spreadsheets/d/</span>
                            <span className="text-amber-400 font-black">ESTE_ES_EL_ID</span>
                            <span className="text-white/40 italic">/edit</span>
                        </p>
                    </div>
                </div>

            </SettingsSection>
        </div>
    );
};
