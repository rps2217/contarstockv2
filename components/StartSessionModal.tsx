
import React, { useState, useCallback } from 'react';
import { DownloadCloud, Loader2, AlertCircle, FileSearch, Sparkles, Database, Ghost, Camera, X, Box, FileText, ArrowRight, ScanLine } from 'lucide-react';
import { CountingSession, ExpectedOrder } from '../types';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { Modal } from '../shared/components/ui/Modal';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';
import { CameraScanner } from './CameraScanner';
import { useNavigate } from 'react-router-dom';

interface StartSessionModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSessionStart: (session: CountingSession) => void;
}

type Mode = 'select' | 'blind' | 'guided';

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ isOpen, onClose, onSessionStart }) => {
 const navigate = useNavigate();
 const [mode, setMode] = useState<Mode>('select');
 const [erpOrder, setErpOrder] = useState('');
 const [labelId, setLabelId] = useState('');
 const [error, setError] = useState('');
 const [activeField, setActiveField] = useState<'label' | 'erp'>('label');
 
 const [isCameraOpen, setIsCameraOpen] = useState(false);
 const [isCloudLoading, setIsCloudLoading] = useState(false);
 const [cloudOrder, setCloudOrder] = useState<ExpectedOrder | null>(null);

 // Scanner de hardware integrado
 useHIDScanner({
 isEnabled: isOpen && !isCameraOpen && mode !== 'select',
 onScan: (raw) => {
 const cleanCode = sanitizeBarcode(raw);
 if (activeField === 'label') {
 setLabelId(cleanCode);
 if (mode === 'guided') setActiveField('erp'); 
 SoundFX.play('success');
 } else {
 setErpOrder(cleanCode);
 SoundFX.play('success');
 }
 }
 });

 const handleCameraScan = useCallback((code: string) => {
 const clean = sanitizeBarcode(code);
 if (clean) {
 if (activeField === 'label') {
 setLabelId(clean);
 if (mode === 'guided') setActiveField('erp');
 } else {
 setErpOrder(clean);
 }
 setIsCameraOpen(false);
 SoundFX.play('success');
 }
 }, [activeField, mode]);

 const handleFetchFromCloud = async () => {
 if (!erpOrder.trim()) return;
 setIsCloudLoading(true);
 setError("");
 try {
 const localOrder = await ExpectedOrderRepository.getById(erpOrder.toUpperCase());
 if (localOrder) {
 setCloudOrder(localOrder);
 SoundFX.play('success');
 return;
 }

 const order = await sessionService.fetchExpectedItemsFromCloud(erpOrder);
 if (!order || order.items.length === 0) {
 setError("Documento no encontrado en nube ni localmente");
 setCloudOrder(null);
 SoundFX.play('error');
 } else {
 setCloudOrder(order);
 SoundFX.play('success');
 }
 } catch (err: any) {
 setError("Error de red: " + err.message);
 setCloudOrder(null);
 } finally {
 setIsCloudLoading(false);
 }
 };

 const handleStart = async () => {
 if (!labelId.trim()) { 
 setError('Ingrese ID de Bulto'); 
 return; 
 }
 if (mode === 'guided' && !erpOrder.trim()) {
 setError('Ingrese ERP para modo manual');
 return;
 }

 try {
 const erpLabel = mode === 'blind' ? 'CONTEO_CIEGO' : erpOrder;

 const session = await sessionService.createSession(
 erpLabel, 
 labelId, 
 'standard', 
 cloudOrder || undefined
 );
 onSessionStart(session);
 onClose();
 // Reset state for next time
 setTimeout(() => {
 setMode('select');
 setLabelId('');
 setErpOrder('');
 setCloudOrder(null);
 setError('');
 }, 500);
 } catch (err) {
 setError("Error de base de datos local");
 }
 };

 const renderSelectMode = () => (
 <div className="space-y-4">
 <div className="text-center mb-6">
 <h3 className="text-xl font-black uppercase italic tracking-tight text-white">Nueva Carga</h3>
 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Selecciona el método de ingreso</p>
 </div>

 <button 
 onClick={() => { setMode('guided'); setActiveField('label'); setError(''); }}
 className="w-full bg-blue-600/10 border-2 border-blue-500/30 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-all text-left group hover:bg-blue-600/20"
 >
 <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
 <FileSearch className="w-6 h-6 text-blue-400" />
 </div>
 <div className="flex-1">
 <h4 className="text-sm font-black text-white uppercase tracking-wider">Con Orden ERP</h4>
 <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Validar contra documento previo</p>
 </div>
 <ArrowRight className="w-5 h-5 text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
 </button>

 <button 
 onClick={() => { setMode('blind'); setActiveField('label'); setError(''); }}
 className="w-full bg-orange-600/10 border-2 border-orange-500/30 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-all text-left group hover:bg-orange-600/20"
 >
 <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
 <Ghost className="w-6 h-6 text-orange-400" />
 </div>
 <div className="flex-1">
 <h4 className="text-sm font-black text-white uppercase tracking-wider">Conteo Ciego</h4>
 <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Escanear sin guía previa</p>
 </div>
 <ArrowRight className="w-5 h-5 text-orange-500 opacity-50 group-hover:opacity-100 transition-opacity" />
 </button>

 <div className="relative flex items-center py-2">
 <div className="flex-grow border-t border-white/10"></div>
 <span className="flex-shrink-0 mx-4 text-slate-500 text-[9px] font-black uppercase">Otras Opciones</span>
 <div className="flex-grow border-t border-white/10"></div>
 </div>

 <button 
 onClick={() => { onClose(); navigate('/reception'); }}
 className="w-full bg-slate-800 border-2 border-white/5 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-all text-left group hover:bg-slate-700"
 >
 <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
 <ScanLine className="w-6 h-6 text-slate-300" />
 </div>
 <div className="flex-1">
 <h4 className="text-sm font-black text-white uppercase tracking-wider">Recepción</h4>
 <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Escanear documento físico con IA</p>
 </div>
 <ArrowRight className="w-5 h-5 text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity" />
 </button>
 </div>
 );

 const renderInputMode = () => (
 <div className="space-y-6">
 <div className="flex items-center gap-3 mb-2">
 <button onClick={() => setMode('select')} className="p-2 bg-white/5 rounded-full text-slate-400 active:bg-white/10">
 <X className="w-5 h-5" />
 </button>
 <div>
 <h3 className="text-lg font-black uppercase italic tracking-tight text-white">
 {mode === 'guided' ? 'Con Orden ERP' : 'Conteo Ciego'}
 </h3>
 </div>
 </div>

 {error && (
 <div className="bg-rose-900/40 text-rose-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-3 animate-in shake">
 <AlertCircle className="w-5 h-5 shrink-0" />
 {error}
 </div>
 )}

 {/* INPUT BULTO */}
 <div className="space-y-2">
 <div className="flex justify-between items-end px-2">
 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Identificador de Bulto</span>
 {labelId && <span className="text-[9px] font-black text-emerald-500 uppercase">✓ Capturado</span>}
 </div>
 <div className="flex gap-2">
 <input 
 type="text"
 value={labelId}
 onChange={(e) => setLabelId(e.target.value)}
 onFocus={() => setActiveField('label')}
 placeholder="ID_Bulto_SSCC"
 className={`flex-1 h-16 bg-slate-900 rounded-2xl px-4 font-mono font-black text-xl border-2 outline-none transition-all ${activeField === 'label' ? 'border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/10 text-slate-300 focus:border-blue-500/50'}`}
 />
 <button 
 onClick={() => { setActiveField('label'); setIsCameraOpen(true); }}
 className="w-16 h-16 bg-blue-500/10 border-2 border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 active:bg-blue-600 active:text-white transition-all shrink-0"
 >
 <Camera className="w-6 h-6" />
 </button>
 </div>
 </div>

 {/* INPUT ERP (Solo en modo guiado) */}
 {mode === 'guided' && (
 <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4">
 <div className="flex justify-between items-end px-2">
 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Orden de Compra / ERP</span>
 </div>
 <div className="flex gap-2">
 <input 
 type="text"
 value={erpOrder}
 onChange={(e) => { setErpOrder(e.target.value); setCloudOrder(null); }}
 onFocus={() => setActiveField('erp')}
 placeholder="Escanear_ERP"
 className={`flex-1 h-16 bg-slate-900 rounded-2xl px-4 font-mono font-black text-xl border-2 outline-none transition-all ${activeField === 'erp' ? 'border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]' : 'border-white/10 text-slate-300 focus:border-amber-500/50'}`}
 />
 <button 
 onClick={() => { setActiveField('erp'); setIsCameraOpen(true); }}
 className="w-16 h-16 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-500 active:bg-amber-500 active:text-black transition-all shrink-0"
 >
 <Camera className="w-6 h-6" />
 </button>
 </div>

 {erpOrder && !cloudOrder && (
 <button 
 onClick={handleFetchFromCloud}
 disabled={isCloudLoading}
 className="w-full h-12 mt-2 bg-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-3 text-emerald-400 active:scale-[0.98] transition-all"
 >
 {isCloudLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
 <span className="text-[10px] font-black uppercase tracking-widest">Validar ERP</span>
 </button>
 )}

 {cloudOrder && (
 <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-4 rounded-2xl flex items-center gap-4 mt-2 animate-in zoom-in-95">
 <div className="bg-emerald-500 p-2 rounded-lg text-black"><Sparkles className="w-4 h-4" /></div>
 <div>
 <div className="text-[10px] font-black uppercase text-emerald-400">Verificación Cloud OK</div>
 <div className="text-xs font-bold text-white">{cloudOrder.items.length} ítems cargados</div>
 </div>
 </div>
 )}
 </div>
 )}

 <div className="pt-4">
 <button 
 onClick={handleStart} 
 disabled={!labelId.trim() || (mode === 'guided' && !erpOrder.trim())}
 className={`w-full font-black h-16 rounded-2xl shadow-lg active:scale-95 uppercase tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100 ${mode === 'guided' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'}`}
 >
 {mode === 'guided' && cloudOrder ? 'INICIAR VERIFICADO' : 'INICIAR CONTEO'}
 </button>
 </div>
 </div>
 );

 return (
 <Modal 
 isOpen={isOpen} 
 onClose={onClose} 
 variant="bottom-sheet"
 className="md:max-w-md bg-slate-950 text-white border-t-4 border-slate-800"
 showCloseButton={mode === 'select'}
 >
 <div className="px-6 pt-8 pb-8">
 {mode === 'select' ? renderSelectMode() : renderInputMode()}
 </div>

 {/* MODAL DE CÁMARA */}
 {isCameraOpen && (
 <div className="fixed inset-0 z-[500]">
 <CameraScanner 
 onScan={handleCameraScan} 
 onClose={() => setIsCameraOpen(false)} 
 isTriggered={true} 
 />
 </div>
 )}
 </Modal>
 );
};
