
import React, { useState } from 'react';
import { Wifi, AlertCircle, Info, Link, ShieldAlert, Database, QrCode, Camera, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { AppSettings } from '../../types';
import { SettingsSection, SettingsCard, SettingsButton, SettingsInput } from './common/SettingsUI';
import { bootstrapByUrl } from '../../services/gasService';
import { SoundFX } from '../../services/audio';
import { CameraScanner } from '../CameraScanner';

interface Props {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
 const [urlInput, setUrlInput] = useState(settings.appSheetConfig?.gasWebAppUrl || '');
 const [ssIdInput, setSsIdInput] = useState(settings.appSheetConfig?.spreadsheetId || '');
 const [isConnecting, setIsConnecting] = useState(false);
 const [errorMode, setErrorMode] = useState<null | 'OAUTH_STALL' | 'GENERAL'>(null);
 const [errorMessage, setErrorMessage] = useState('');
 const [showQR, setShowQR] = useState(false);
 const [isScanning, setIsScanning] = useState(false);

 const handleAutoConfig = async () => {
 if (!urlInput.includes('/exec')) {
 setErrorMessage("La URL debe terminar en /exec");
 setErrorMode('GENERAL');
 SoundFX.play('error');
 return;
 }

 setErrorMode(null);
 setIsConnecting(true);
 try {
 // Intentamos vincular usando la URL y el ID manual si existe
 const fullConfig = await bootstrapByUrl(urlInput, ssIdInput);
 updateSetting('appSheetConfig', fullConfig);
 SoundFX.play('success');
 alert(`¡CONEXIÓN EXITOSA!\nSistema vinculado al Excel: ${fullConfig.spreadsheetId}`);
 } catch (e: any) {
 if (e.message.includes('GOOGLE_OAUTH_STALL') || e.message.includes('ACCESO_DENEGADO')) {
 setErrorMode('OAUTH_STALL');
 } else {
 setErrorMessage(e.message);
 setErrorMode('GENERAL');
 }
 SoundFX.play('error');
 } finally {
 setIsConnecting(false);
 }
 };

 const handleScanQR = (code: string) => {
 try {
 const data = JSON.parse(code);
 if (data.gasUrl) {
 setUrlInput(data.gasUrl);
 if (data.ssId) setSsIdInput(data.ssId);
 setIsScanning(false);
 SoundFX.play('success');
 } else {
 throw new Error("Formato QR inválido");
 }
 } catch (e) {
 setErrorMessage("El código QR no contiene una configuración válida.");
 setErrorMode('GENERAL');
 SoundFX.play('error');
 setIsScanning(false);
 }
 };

 const qrData = JSON.stringify({ gasUrl: urlInput, ssId: ssIdInput });

 return (
 <div className="space-y-6 animate-in fade-in duration-500">
 <SettingsSection title="Vínculo con Google Sheets">
 
 <SettingsCard className="bg-slate-900 border-indigo-500/30 text-white">
 <div className="space-y-6">
 <div className="flex items-center gap-4">
 <div className="p-4 bg-indigo-600 rounded-[1.5rem] shadow-lg shadow-indigo-900/40">
 <Link className="w-8 h-8 text-white" />
 </div>
 <div>
 <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Vínculo Maestro</h3>
 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configuración Cloud V12</p>
 </div>
 </div>

 <div className="space-y-5">
 {/* CAMPO 1: URL DEL SCRIPT */}
 <div className="space-y-1.5">
 <div className="flex justify-between items-center px-1">
 <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">URL de Implementación (GAS)</label>
 <span className="text-[8px] font-bold text-slate-500 uppercase">Obligatorio</span>
 </div>
 <SettingsInput 
 value={urlInput}
 onChange={(e: any) => setUrlInput(e.target.value)}
 placeholder="https://script.google.com/macros/s/.../exec"
 className="bg-black/40 border-white/5 text-blue-400 font-mono text-xs"
 />
 </div>

 {/* CAMPO 2: ID DEL SPREADSHEET (EL QUE FALTABA) */}
 <div className="space-y-1.5">
 <div className="flex justify-between items-center px-1">
 <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest">ID del Spreadsheet (Excel)</label>
 <span className="text-[8px] font-bold text-slate-500 uppercase">Manual / Anti-Error</span>
 </div>
 <SettingsInput 
 value={ssIdInput}
 onChange={(e: any) => setSsIdInput(e.target.value)}
 placeholder="Pegue aquí el ID largo de la URL de su Excel"
 className="bg-black/40 border-amber-500/20 text-amber-400 font-mono text-xs"
 />
 <p className="text-[8px] text-slate-500 px-1 italic">
 Si su script es independiente, pegue el ID para evitar el error "AUTO_DETECTED".
 </p>
 </div>
 </div>

 {errorMode === 'OAUTH_STALL' && (
 <div className="bg-amber-500/10 border-2 border-amber-500/40 p-5 rounded-[2rem] space-y-3 animate-in shake duration-500">
 <div className="flex items-center gap-3">
 <ShieldAlert className="w-6 h-6 text-amber-500 shrink-0" />
 <p className="text-[11px] text-amber-100 font-black uppercase">Acción Requerida en Google</p>
 </div>
 <p className="text-[10px] text-amber-200/70 leading-relaxed font-bold uppercase">
 Google bloqueó el acceso. 
 1. Abra su Script en Google.
 2. Seleccione la función "TRIGGER_PERMISSIONS".
 3. Presione "Ejecutar" y acepte los permisos.
 </p>
 </div>
 )}

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
 label={isConnecting ? "Sincronizando..." : "Auto-Configurar App"}
 icon={Wifi}
 variant="primary"
 className="bg-indigo-600 border-indigo-400 h-20 text-sm"
 />

 <div className="grid grid-cols-2 gap-4">
 <SettingsButton 
 onClick={() => setIsScanning(true)}
 label="Escanear QR"
 icon={Camera}
 variant="secondary"
 className="bg-slate-800 border-white/10"
 />
 <SettingsButton 
 onClick={() => setShowQR(true)}
 disabled={!urlInput}
 label="Compartir QR"
 icon={QrCode}
 variant="secondary"
 className="bg-slate-800 border-white/10"
 />
 </div>
 </div>
 </SettingsCard>

 <div className="bg-blue-900/10 border-2 border-blue-500/20 p-6 rounded-[2.5rem] flex gap-5">
 <Info className="w-8 h-8 text-blue-400 shrink-0" />
 <div className="space-y-2">
 <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">¿Dónde obtengo el ID del Excel?</p>
 <p className="text-[9px] text-blue-400/80 leading-relaxed font-medium uppercase">
 Está en la URL de tu navegador cuando tienes el Excel abierto:<br/>
 docs.google.com/spreadsheets/d/<span className="text-white bg-blue-600 px-1 font-black">ESTE_ES_EL_ID</span>/edit
 </p>
 </div>
 </div>

 </SettingsSection>

 {/* MODAL QR EXPORT */}
 {showQR && (
 <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-6 animate-in fade-in duration-200">
 <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 max-w-sm w-full flex flex-col items-center relative shadow-2xl">
 <button 
 onClick={() => setShowQR(false)}
 className="absolute top-4 right-4 w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 
 <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6">
 <QrCode className="w-8 h-8 text-indigo-400" />
 </div>
 
 <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2 text-center">Configuración Cloud</h3>
 <p className="text-[10px] text-slate-400 uppercase tracking-widest text-center mb-8">Escanea este código desde otro dispositivo para clonar la configuración</p>
 
 <div className="bg-white p-4 rounded-2xl shadow-inner">
 <QRCodeSVG value={qrData} size={200} level="M" />
 </div>
 </div>
 </div>
 )}

 {/* MODAL QR IMPORT (CAMERA) */}
 {isScanning && (
 <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in slide-in-from-bottom-full duration-300">
 <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent h-24">
 <button 
 onClick={() => setIsScanning(false)}
 className="flex items-center gap-2 bg-black/40 pl-2 pr-4 py-2 rounded-full text-white border border-white/10 active:scale-95 transition-transform"
 >
 <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
 <X className="w-5 h-5" />
 </div>
 <span className="text-[10px] font-black tracking-[0.2em] uppercase">Cancelar</span>
 </button>
 </div>
 
 <div className="flex-1 relative">
 <CameraScanner 
 onScan={handleScanQR} 
 onClose={() => setIsScanning(false)} 
 inline={true}
 isTriggered={true}
 />
 <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
 <div className="w-[70%] aspect-square border-2 border-white/20 rounded-3xl relative">
 <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl -mt-1 -ml-1"></div>
 <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl -mt-1 -mr-1"></div>
 <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl -mb-1 -ml-1"></div>
 <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl -mb-1 -mr-1"></div>
 <div className="absolute top-1/2 left-2 right-2 h-[2px] bg-indigo-500/80 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse"></div>
 </div>
 </div>
 </div>
 
 <div className="h-32 bg-slate-900 rounded-t-[2.5rem] -mt-8 relative z-10 flex flex-col items-center justify-center px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/5">
 <QrCode className="w-8 h-8 text-indigo-400 mb-2" />
 <p className="text-xs font-bold text-white uppercase tracking-widest">Escanea el código QR</p>
 <p className="text-[10px] text-slate-500 uppercase mt-1">Para importar la configuración</p>
 </div>
 </div>
 )}
 </div>
 );
};
