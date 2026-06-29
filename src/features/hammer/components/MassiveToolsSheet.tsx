
import React from 'react';
import { Barcode, RotateCcw, Download, X, MapPin, Printer, Camera, Volume2, VolumeX, Cloud, FileSpreadsheet, FlaskConical } from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';

 interface Props {
 isOpen: boolean;
 onClose: () => void;
 batchId: string;
 hasActiveItem: boolean;
 location: string;
 onChangeLocation: () => void;
 onShowLabel: () => void;
 onReset: () => void;
 onImport: () => void;
 onSync?: () => void;
 isSyncing?: boolean;
 onPrintSummary: () => void;
 onToggleCameraMode?: () => void;
 isVoiceEnabled?: boolean;
 onToggleVoice?: () => void;
 autoSyncEnabled?: boolean;
 onToggleAutoSync?: () => void;
 onDownloadExcel?: () => void;
 onStartTestCounting?: () => void;
 hasManifestItems?: boolean;
}

export const MassiveToolsSheet: React.FC<Props> = ({ 
 isOpen, onClose, hasActiveItem, location, onChangeLocation, onShowLabel, onReset, onImport, onSync, isSyncing, onPrintSummary, onToggleCameraMode, isVoiceEnabled, onToggleVoice,
 autoSyncEnabled = true, onToggleAutoSync, onDownloadExcel, onStartTestCounting, hasManifestItems = false
}) => {
 
 const ToolButton = ({ onClick, icon: Icon, label, color, disabled = false, sublabel, loading = false }: any) => (
 <button
 disabled={disabled || loading}
 onClick={() => { onClick(); if(!loading) onClose(); }}
 className={`flex flex-col items-center justify-center p-4 bg-surface rounded-2xl border border-white/5 active:scale-95 transition-all disabled:opacity-20 ${color}`}
 >
 <Icon className={`w-6 h-6 mb-2 ${loading ? 'animate-spin' : ''}`} />
 <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">{loading ? 'Sincronizando...' : label}</span>
 {sublabel && (
 <span className="text-[8px] font-bold opacity-60 mt-1 uppercase tracking-tight truncate w-full px-2 text-center">
 {sublabel}
 </span>
 )}
 </button>
 );

 return (
 <Modal 
 isOpen={isOpen} 
 onClose={onClose} 
 variant="bottom-sheet" 
 className="bg-black border-t-2 border-subtle"
 showCloseButton={false}
 >
 <div className="p-6 pb-8 bg-black text-white">
 <div className="flex justify-between items-center mb-6">
 <div>
 <h2 className="text-lg font-black uppercase italic tracking-tight text-white">Acciones de Auditoría</h2>
 <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Modo Martillo v4.5</p>
 </div>
 <button onClick={onClose} className="p-2 bg-white/5 rounded-full text-muted">
 <X className="w-5 h-5" />
 </button>
 </div>

 {onToggleAutoSync && (
 <div className="mb-6 p-4 bg-surface border border-white/5 rounded-2xl flex items-center justify-between">
 <div className="flex flex-col pr-4">
 <span className="text-xs font-black uppercase text-indigo-400 tracking-wider">Autosincronizar al instante</span>
 <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Sube cada escaneo a la nube en tiempo real</span>
 </div>
 <button 
 onClick={onToggleAutoSync}
 className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoSyncEnabled ? 'bg-indigo-500' : 'bg-slate-700'}`}
 >
 <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
 </button>
 </div>
 )}

 {/* BOTÓN MODO PRUEBA */}
 {onStartTestCounting && (
 <div className="mb-4">
 <button
 onClick={() => { onStartTestCounting(); onClose(); }}
 disabled={!hasManifestItems}
 className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] disabled:opacity-30 ${
 hasManifestItems 
 ? 'bg-purple-600/20 border-2 border-purple-500/40 hover:bg-purple-600/30' 
 : 'bg-surface border border-white/5'
 }`}
 >
 <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
 hasManifestItems ? 'bg-purple-500/20' : 'bg-elevated'
 }`}>
 <FlaskConical className={`w-6 h-6 ${hasManifestItems ? 'text-purple-400' : 'text-slate-600'}`} />
 </div>
 <div className="flex-1 text-left">
 <h4 className={`text-sm font-black uppercase tracking-wider ${hasManifestItems ? 'text-purple-400' : 'text-slate-500'}`}>
 Iniciar Conteo de Prueba
 </h4>
 <p className="text-[9px] font-bold uppercase mt-0.5 text-slate-500">
 {hasManifestItems ? 'Usar carga teórica como guía' : 'Primero carga una teórico'}
 </p>
 </div>
 <span className="text-[9px] font-black uppercase text-slate-600">→</span>
 </button>
 </div>
 )}

 <div className="grid grid-cols-2 gap-4">
 {onToggleCameraMode && (
 <ToolButton 
 onClick={onToggleCameraMode} 
 icon={Camera} 
 label="Modo Cámara" 
 color="text-cyan-400 border-cyan-500/20" 
 />
 )}
 {onToggleVoice && (
 <ToolButton 
 onClick={onToggleVoice} 
 icon={isVoiceEnabled ? Volume2 : VolumeX} 
 label={isVoiceEnabled ? "Voz Activada" : "Voz Desactivada"} 
 color={isVoiceEnabled ? "text-blue-400 border-blue-500/20" : "text-muted border-slate-500/20"} 
 />
 )}
 {onSync && (
 <ToolButton 
 onClick={onSync} 
 icon={Cloud} 
 label="Sincronizar Nube" 
 color="text-blue-400 border-blue-500/20" 
 loading={isSyncing}
 />
 )}
 <ToolButton 
 onClick={onPrintSummary} 
 icon={Printer} 
 label="Imprimir Resumen" 
 color="text-emerald-400 border-emerald-500/20" 
 />
 {onDownloadExcel && (
 <ToolButton 
 onClick={onDownloadExcel} 
 icon={FileSpreadsheet} 
 label="Descargar Excel" 
 color="text-lime-400 border-lime-500/20" 
 />
 )}
 <ToolButton 
 disabled={!hasActiveItem}
 onClick={onShowLabel} 
 icon={Barcode} 
 label="Etiqueta SKU" 
 color="text-indigo-400 border-indigo-500/20" 
 />
 <ToolButton 
 onClick={onChangeLocation} 
 icon={MapPin} 
 label="Ubicación" 
 sublabel={location}
 color="text-blue-400 border-blue-500/20" 
 />
 <ToolButton 
 onClick={onImport} 
 icon={Download} 
 label="Cargar Teórico" 
 color="text-amber-400 border-amber-500/20" 
 />
 <ToolButton 
 onClick={onReset} 
 icon={RotateCcw} 
 label="Vaciar Todo" 
 color="text-rose-500 border-rose-500/20" 
 />
 </div>
 
 <div className="mt-8 text-center">
 <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">LogiCount Pro Hardware-Link</p>
 </div>
 </div>
 </Modal>
 );
};
