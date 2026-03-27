
import React, { useState, useEffect } from 'react';
import { Wifi, AlertCircle, Info, Link, ShieldAlert, Database, QrCode, Camera, X, Settings2, Save, Search, Table, Columns, CheckCircle2, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, ColumnMapping, SpreadsheetMetadata, TableMetadata } from '../../../types';
import { SettingsSection, SettingsCard, SettingsButton, SettingsInput } from './common/SettingsElements';
import { bootstrapByUrl, fetchSpreadsheetMetadata } from '../../../services/gasService';
import { SoundFX } from '../../../services/audio';
import { CameraScanner } from '../../../components/CameraScanner';

interface Props {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
}

export const CloudSection: React.FC<Props> = ({ settings, updateSetting }) => {
 const [urlInput, setUrlInput] = useState(settings.appSheetConfig?.gasWebAppUrl || '');
 const [ssIdInput, setSsIdInput] = useState(settings.appSheetConfig?.spreadsheetId || '');
 const [isConnecting, setIsConnecting] = useState(false);
 const [isDiscovering, setIsDiscovering] = useState(false);
 const [errorMode, setErrorMode] = useState<null | 'OAUTH_STALL' | 'GENERAL'>(null);
 const [errorMessage, setErrorMessage] = useState('');
 const [showQR, setShowQR] = useState(false);
 const [isScanning, setIsScanning] = useState(false);
 const [showMapping, setShowMapping] = useState(false);
 
 // Metadatos descubiertos
 const [metadata, setMetadata] = useState<SpreadsheetMetadata | null>(null);
 const [selectedSheet, setSelectedSheet] = useState<string>(settings.appSheetConfig?.inventoryRegistryTableName || '');

 const [mapping, setMapping] = useState<ColumnMapping>(settings.appSheetConfig?.columnMapping || {
  barcode: 'SKU',
  productName: 'DESCRIPTOR',
  quantity: 'CANTIDAD',
  event: 'EVENTO',
  mm: 'MM',
  yyyy: 'YYYY',
  location: 'BOD.',
  frc: 'FRC',
  erp: 'ERP',
  traspaso: 'DOC-TRAS-INTER',
  destino: 'DESTINO',
  observaciones: 'OBSERVACIONES',
  isAdjusted: 'AJUSTADO'
 });

 // Sincronizar estado local si cambian los settings externos
 useEffect(() => {
  if (settings.appSheetConfig?.columnMapping) {
    setMapping(settings.appSheetConfig.columnMapping);
  }
  if (settings.appSheetConfig?.inventoryRegistryTableName) {
    setSelectedSheet(settings.appSheetConfig.inventoryRegistryTableName);
  }
 }, [settings.appSheetConfig]);

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
  const fullConfig = await bootstrapByUrl(urlInput, ssIdInput);
  
  const finalConfig = {
  ...fullConfig,
  columnMapping: mapping 
  };

  updateSetting('appSheetConfig', finalConfig);
  SoundFX.play('success');
  
  try {
    const { saveGasUrlToCloud } = await import('../../../services/gasService');
    await saveGasUrlToCloud(urlInput, finalConfig.spreadsheetId);
  } catch (e) {
    console.warn("No se pudo sincronizar la URL en la nube:", e);
  }

  alert(`¡CONEXIÓN EXITOSA!\nSistema vinculado al Excel: ${finalConfig.spreadsheetId}`);
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

 const handleDiscoverStructure = async () => {
  if (!urlInput || !ssIdInput) {
    setErrorMessage("Se requiere URL e ID de Spreadsheet para explorar.");
    setErrorMode('GENERAL');
    return;
  }

  setIsDiscovering(true);
  setErrorMode(null);
  try {
    const data = await fetchSpreadsheetMetadata(ssIdInput);
    setMetadata(data);
    SoundFX.play('success');
    setShowMapping(true);
  } catch (e: any) {
    setErrorMessage(e.message);
    setErrorMode('GENERAL');
    SoundFX.play('error');
  } finally {
    setIsDiscovering(false);
  }
 };

 const handleSaveMapping = () => {
  updateSetting('appSheetConfig', {
    ...settings.appSheetConfig,
    inventoryRegistryTableName: selectedSheet,
    columnMapping: mapping
  });
  SoundFX.play('success');
  alert("Estructura de datos actualizada correctamente.");
 };

 const updateMappingField = (key: keyof ColumnMapping, value: string) => {
  setMapping(prev => ({ ...prev, [key]: value }));
 };

 const currentSheetMetadata = metadata?.sheets.find(s => s.sheetName === selectedSheet);

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

 {/* CAMPO 2: ID DEL SPREADSHEET */}
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
 </div>
 </div>

 {errorMode === 'GENERAL' && (
 <div className="bg-rose-500/10 border-2 border-rose-500/30 p-4 rounded-2xl flex items-center gap-3">
 <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
 <p className="text-[10px] text-rose-100 font-bold uppercase leading-tight">{errorMessage}</p>
 </div>
 )}

 <div className="grid grid-cols-1 gap-3">
  <SettingsButton 
    onClick={handleAutoConfig}
    isLoading={isConnecting}
    disabled={!urlInput}
    label={isConnecting ? "Vinculando..." : "Vincular Sistema"}
    icon={Wifi}
    variant="primary"
    className="bg-indigo-600 border-indigo-400 h-16 text-xs"
  />
  <SettingsButton 
    onClick={handleDiscoverStructure}
    isLoading={isDiscovering}
    disabled={!urlInput || !ssIdInput}
    label={isDiscovering ? "Explorando..." : "Explorar Estructura (Auto-Descubrimiento)"}
    icon={Search}
    variant="secondary"
    className="bg-slate-800 border-emerald-500/30 text-emerald-400 h-16 text-xs"
  />
 </div>

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
 </SettingsSection>

 <AnimatePresence>
 {showMapping && (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    className="space-y-6"
  >
    <SettingsSection title="Mapeo Inteligente de Datos">
      <SettingsCard className="bg-slate-900 border-emerald-500/30 text-white overflow-visible">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-600 rounded-[1.5rem] shadow-lg shadow-emerald-900/40">
              <Table className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Módulo de Eventos</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configuración de Pestaña y Columnas</p>
            </div>
          </div>

          {/* SELECCIÓN DE PESTAÑA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Database className="w-4 h-4 text-emerald-400" />
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Pestaña de Origen (Google Sheet)</label>
            </div>
            {metadata ? (
              <select 
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                className="w-full bg-black/60 border-2 border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-white focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Seleccione una pestaña...</option>
                {metadata.sheets.map(s => (
                  <option key={s.sheetName} value={s.sheetName}>{s.sheetName}</option>
                ))}
              </select>
            ) : (
              <div className="p-4 bg-black/40 border-2 border-dashed border-white/10 rounded-2xl text-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase">Use "Explorar Estructura" para listar pestañas</p>
              </div>
            )}
          </div>

          {/* MAPEO DE COLUMNAS */}
          {selectedSheet && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6 pt-4 border-t border-white/5"
            >
              <div className="flex items-center gap-2 px-1">
                <Columns className="w-4 h-4 text-amber-400" />
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Mapeo de Cabeceras</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {[
                  { id: 'barcode', label: 'Código de Barras (SKU)', color: 'emerald' },
                  { id: 'productName', label: 'Descripción Producto', color: 'emerald' },
                  { id: 'quantity', label: 'Cantidad', color: 'emerald' },
                  { id: 'event', label: 'Evento / Tipo', color: 'emerald' },
                  { id: 'traspaso', label: 'N° Traspaso (Columna L)', color: 'amber' },
                  { id: 'destino', label: 'Destino', color: 'emerald' },
                  { id: 'observaciones', label: 'Observaciones', color: 'emerald' },
                  { id: 'isAdjusted', label: 'Flag Ajustado', color: 'emerald' },
                  { id: 'mm', label: 'Mes (MM)', color: 'slate' },
                  { id: 'yyyy', label: 'Año (YYYY)', color: 'slate' },
                ].map((field) => (
                  <div key={field.id} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className={`text-[9px] font-black text-${field.color}-400 uppercase tracking-widest`}>{field.label}</label>
                      {currentSheetMetadata?.headers.includes(mapping[field.id as keyof ColumnMapping] || '') && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      )}
                    </div>
                    <select 
                      value={mapping[field.id as keyof ColumnMapping] || ''}
                      onChange={(e) => updateMappingField(field.id as keyof ColumnMapping, e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[11px] font-mono text-white focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value="">-- Sin asignar --</option>
                      {currentSheetMetadata?.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <SettingsButton 
                onClick={handleSaveMapping}
                label="Guardar Configuración de Datos"
                icon={Save}
                variant="primary"
                className="bg-emerald-600 border-emerald-400 h-16 text-xs mt-4"
              />
            </motion.div>
          )}
        </div>
      </SettingsCard>
    </SettingsSection>
  </motion.div>
 )}
 </AnimatePresence>

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
 </div>
 
 <div className="h-32 bg-slate-900 rounded-t-[2.5rem] -mt-8 relative z-10 flex flex-col items-center justify-center px-6 shadow-[0_-10px_40_rgba(0,0,0,0.5)] border-t border-white/5">
 <QrCode className="w-8 h-8 text-indigo-400 mb-2" />
 <p className="text-xs font-bold text-white uppercase tracking-widest">Escanea el código QR</p>
 <p className="text-[10px] text-slate-500 uppercase mt-1">Para importar la configuración</p>
 </div>
 </div>
 )}
 </div>
 );
};
