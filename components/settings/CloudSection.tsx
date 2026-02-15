
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
    const [ssIdInput, setSsIdInput] = useState(settings.appSheetConfig?.spreadsheetId || '');
    const [isConnecting, setIsConnecting] = useState(false);
    const [errorMode, setErrorMode] = useState<null | 'ID_REQUIRED' | 'GENERAL'>(null);
    const [errorMessage, setErrorMessage] = useState('');

    const handleAutoConfig = async () => {
        if (!urlInput.includes('/exec')) {
            setErrorMessage("La URL debe terminar en /exec");
            setErrorMode('GENERAL');
            return;
        }

        setErrorMode(null);
        setIsConnecting(true);
        try {
            const fullConfig = await bootstrapByUrl(urlInput, ssIdInput);
            updateSetting('appSheetConfig', fullConfig);
            alert(`¡Conexión Exitosa!\nSistema vinculado.`);
        } catch (e: any) {
            if (e.message === 'EXCEL_ID_REQUIRED') {
                setErrorMode('ID_REQUIRED');
            } else {
                setErrorMessage(e.message);
                setErrorMode('GENERAL');
            }
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
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configuración basada en URL</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">1. URL del Script de Google</label>
                                <SettingsInput 
                                    value={urlInput}
                                    onChange={(e: any) => setUrlInput(e.target.value)}
                                    placeholder="https://script.google.com/macros/s/.../exec"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
                                />
                            </div>

                            {(errorMode === 'ID_REQUIRED' || ssIdInput) && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest ml-1">2. ID del Spreadsheet (Requerido para scripts independientes)</label>
                                    <SettingsInput 
                                        value={ssIdInput}
                                        onChange={(e: any) => setSsIdInput(e.target.value)}
                                        placeholder="Copia el ID largo de la URL de tu Excel"
                                        className="bg-white/5 border-amber-500/30 text-white placeholder:text-slate-600"
                                    />
                                    {errorMode === 'ID_REQUIRED' && (
                                        <p className="text-[9px] text-amber-500 font-bold ml-2">El script es independiente. Ingresa el ID del Excel para continuar.</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {errorMode === 'GENERAL' && (
                            <div className="bg-rose-500/10 border-2 border-rose-500/30 p-4 rounded-2xl flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                <p className="text-[10px] text-rose-100 font-bold uppercase leading-tight">{errorMessage}</p>
                            </div>
                        )}

                        <SettingsButton 
                            onClick={handleAutoConfig}
                            isLoading={isConnecting}
                            disabled={!urlInput}
                            label={isConnecting ? "Sincronizando..." : "Vincular Sistema"}
                            icon={Wifi}
                            variant="primary"
                            className="bg-indigo-600 border-indigo-400"
                        />
                    </div>
                </SettingsCard>

                <div className="bg-blue-900/10 border-2 border-blue-500/20 p-6 rounded-[2.5rem] flex gap-5">
                    <Info className="w-8 h-8 text-blue-400 shrink-0" />
                    <div className="space-y-2">
                        <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">¿Dónde obtengo el ID?</p>
                        <p className="text-[9px] text-blue-400/80 leading-relaxed font-medium uppercase">
                            Abre tu Excel. En la barra de dirección, el ID es la cadena larga entre <span className="text-white">/d/</span> y <span className="text-white">/edit</span>.<br/>
                            Ejemplo: <span className="text-amber-400">1ABC...XYZ</span>
                        </p>
                    </div>
                </div>

            </SettingsSection>
        </div>
    );
};
