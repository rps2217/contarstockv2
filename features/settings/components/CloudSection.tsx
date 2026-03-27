import React, { useState, useEffect } from 'react';
import { Wifi, AlertCircle, Info, Link, ShieldAlert, Database, QrCode, Camera, X, Settings2, Save, Search, Table, Columns, CheckCircle2, RefreshCw, Box, Layers, ClipboardList } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { AppSettings, ExpiryMapping, ProductMapping, CountMapping, SpreadsheetMetadata, TableMetadata } from '../../../types';
import { SettingsSection, SettingsCard, SettingsButton, SettingsInput } from './common/SettingsElements';
import { bootstrapByUrl, fetchSpreadsheetMetadata } from '../../../services/gasService';
import { SoundFX } from '../../../services/audio';
import { CameraScanner } from '../../../components/CameraScanner';

interface Props {
 settings: AppSettings;
 updateSetting: (key: keyof AppSettings, value: any) => void;
}

type ModuleType = 'expiry' | 'products' | 'counts';

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
 
 // Centro de Control de Datos
 const [selectedModule, setSelectedModule] = useState<ModuleType>('expiry');
 const [selectedSheet, setSelectedSheet] = useState<string>('');
 const [mapping, setMapping] = useState<any>({});

 // Sincronizar estado local si cambian los settings externos o el módulo seleccionado
 useEffect(() => {
   // Cargar pestaña
   let sheetName = '';
   if (selectedModule === 'expiry') sheetName = settings.appSheetConfig?.inventoryRegistryTableName || '';
   if (selectedModule === 'products') sheetName = settings.appSheetConfig?.productsTableName || '';
   if (selectedModule === 'counts') sheetName = settings.appSheetConfig?.countsTableName || '';
   setSelectedSheet(sheetName);

   // Cargar mapeo
   let currentMapping: any = {};
   if (selectedModule === 'expiry') {
     currentMapping = settings.appSheetConfig?.mappings?.expiry || settings.appSheetConfig?.columnMapping || {
       barcode: 'SKU', productName: 'DESCRIPTOR', quantity: 'CANTIDAD', event: 'EVENTO', mm: 'MM', yyyy: 'YYYY', location: 'BOD.', frc: 'FRC', erp: 'ERP', traspaso: 'DOC-TRAS-INTER', destino: 'DESTINO', observaciones: 'OBSERVACIONES', isAdjusted: 'AJUSTADO'
     };
   } else if (selectedModule === 'products') {
     currentMapping = settings.appSheetConfig?.mappings?.products || {
       barcode: 'SKU', name: 'DESCRIPTOR', category: 'CATEGORIA', supplier: 'PROVEEDOR', price: 'PRECIO', unitsPerBox: 'UNIDADES_CAJA'
     };
   } else if (selectedModule === 'counts') {
     currentMapping = settings.appSheetConfig?.mappings?.counts || {
       barcode: 'SKU', quantity: 'CANTIDAD', timestamp: 'FECHA', operatorId: 'OPERADOR', location: 'UBICACION', batch: 'LOTE', expiry: 'VENCIMIENTO'
     };
   }
   setMapping(currentMapping);
 }, [settings.appSheetConfig, selectedModule]);

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
  columnMapping: mapping // Keep for backward compatibility if needed
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
  const newConfig = { ...settings.appSheetConfig } as any;
  if (!newConfig.mappings) newConfig.mappings = {};
  
  newConfig.mappings[selectedModule] = mapping;

  if (selectedModule === 'expiry') newConfig.inventoryRegistryTableName = selectedSheet;
  if (selectedModule === 'products') newConfig.productsTableName = selectedSheet;
  if (selectedModule === 'counts') newConfig.countsTableName = selectedSheet;

  updateSetting('appSheetConfig', newConfig);
  SoundFX.play('success');
  alert(`Estructura de datos para el módulo actualizada correctamente.`);
 };

 const updateMappingField = (key: string, value: string) => {
  setMapping((prev: any) => ({ ...prev, [key]: value }));
 };

 const handleScanQR = (data: string) => {
   try {
     const parsed = JSON.parse(data);
     if (parsed.gasWebAppUrl) {
       updateSetting('appSheetConfig', parsed);
       setUrlInput(parsed.gasWebAppUrl);
       setSsIdInput(parsed.spreadsheetId || '');
       SoundFX.play('success');
       setIsScanning(false);
       alert("Configuración importada correctamente.");
     }
   } catch (e) {
     SoundFX.play('error');
     alert("Código QR inválido para configuración.");
   }
 };

 const currentSheetMetadata = metadata?.sheets.find(s => s.sheetName === selectedSheet);

 const getModuleFields = () => {
   if (selectedModule === 'expiry') {
     return [
       { id: 'barcode', label: 'Código de Barras (SKU)', color: 'emerald' },
       { id: 'productName', label: 'Descripción Producto', color: 'emerald' },
       { id: 'quantity', label: 'Cantidad', color: 'emerald' },
       { id: 'event', label: 'Evento / Tipo', color: 'emerald' },
       { id: 'traspaso', label: 'N° Traspaso', color: 'amber' },
       { id: 'destino', label: 'Destino', color: 'emerald' },
       { id: 'observaciones', label: 'Observaciones', color: 'emerald' },
       { id: 'isAdjusted', label: 'Flag Ajustado', color: 'emerald' },
       { id: 'mm', label: 'Mes (MM)', color: 'slate' },
       { id: 'yyyy', label: 'Año (YYYY)', color: 'slate' },
       { id: 'location', label: 'Ubicación (BOD)', color: 'slate' },
       { id: 'frc', label: 'FRC', color: 'slate' },
       { id: 'erp', label: 'ERP', color: 'slate' },
     ];
   }
   if (selectedModule === 'products') {
     return [
       { id: 'barcode', label: 'Código de Barras (SKU)', color: 'emerald' },
       { id: 'name', label: 'Nombre del Producto', color: 'emerald' },
       { id: 'category', label: 'Categoría', color: 'amber' },
       { id: 'supplier', label: 'Proveedor', color: 'slate' },
       { id: 'price', label: 'Precio', color: 'slate' },
       { id: 'unitsPerBox', label: 'Unidades por Caja', color: 'slate' },
     ];
   }
   if (selectedModule === 'counts') {
     return [
       { id: 'barcode', label: 'Código de Barras (SKU)', color: 'emerald' },
       { id: 'quantity', label: 'Cantidad', color: 'emerald' },
       { id: 'timestamp', label: 'Fecha/Hora', color: 'amber' },
       { id: 'operatorId', label: 'ID Operador', color: 'slate' },
       { id: 'location', label: 'Ubicación', color: 'slate' },
       { id: 'batch', label: 'Lote', color: 'slate' },
       { id: 'expiry', label: 'Vencimiento', color: 'slate' },
     ];
   }
   return [];
 };

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
    <SettingsSection title="Centro de Control de Datos">
      <SettingsCard className="bg-slate-900 border-emerald-500/30 text-white overflow-visible">
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-600 rounded-[1.5rem] shadow-lg shadow-emerald-900/40">
              <Database className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none">Mapeo de Módulos</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Configuración por Módulo</p>
            </div>
          </div>

          {/* SELECTOR DE MÓDULOS */}
          <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setSelectedModule('expiry')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                selectedModule === 'expiry' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Vencimientos
            </button>
            <button
              onClick={() => setSelectedModule('products')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                selectedModule === 'products' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Box className="w-4 h-4" />
              Productos
            </button>
            <button
              onClick={() => setSelectedModule('counts')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                selectedModule === 'counts' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Conteos
            </button>
          </div>

          {/* SELECCIÓN DE PESTAÑA */}
          <div className="space-y-3 bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 px-1">
              <Table className="w-4 h-4 text-emerald-400" />
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
              key={selectedModule}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6 pt-4 border-t border-white/5"
            >
              <div className="flex items-center gap-2 px-1">
                <Columns className="w-4 h-4 text-amber-400" />
                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Mapeo de Cabeceras - {selectedModule.toUpperCase()}</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {getModuleFields().map((field) => (
                  <div key={field.id} className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className={`text-[9px] font-black text-${field.color}-400 uppercase tracking-widest`}>{field.label}</label>
                      {currentSheetMetadata?.headers.includes(mapping[field.id] || '') && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      )}
                    </div>
                    <select 
                      value={mapping[field.id] || ''}
                      onChange={(e) => updateMappingField(field.id, e.target.value)}
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
                label={`Guardar Configuración de ${selectedModule.toUpperCase()}`}
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
 <QRCodeSVG value={JSON.stringify(settings.appSheetConfig || {})} size={200} level="M" />
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
