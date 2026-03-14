
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReceptionLogic } from './hooks/useReceptionLogic';
import { CameraScanner } from '../../components/CameraScanner';
import { ReceptionHero } from '../../components/reception/ReceptionHero'; 
import { QueueManager } from '../../components/reception/QueueManager'; 
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { VirtualList } from '../../components/common/VirtualList';
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { ChevronLeft, Box, Trash2, Camera, Loader2 } from 'lucide-react';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useHIDScanner } from '../../hooks/useHIDScanner';
import * as documentProcessor from '../../services/documentProcessor';
import { SoundFX } from '../../services/audio';

const ReceptionRow = React.memo(({ index, data }: any) => {
 const item = data.items[index];
 if (!item) return null;
 const { onDelete } = data;

 return (
 <div className="px-3 py-1 h-full">
 <div className="w-full h-full border-2 border-white/5 bg-slate-900/40 p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98]">
 <div className="flex items-center gap-4 overflow-hidden">
 <div className="w-10 h-10 rounded-xl bg-blue-900/20 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
 <Box className="w-5 h-5" />
 </div>
 <div className="min-w-0">
 <div className="font-mono font-black text-white truncate text-sm uppercase tracking-wider">
 {item.logisticsLabel}
 </div>
 <div className="text-[9px] font-bold text-slate-500 uppercase mt-1 flex items-center gap-2">
 <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
 {item.erpOrder && item.erpOrder !== 'RECEPCION_BORRADOR' ? (
 <>
 <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
 <span className="text-emerald-500 font-black tracking-tighter">ERP: {item.erpOrder}</span>
 </>
 ) : (
 <>
 <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
 <span className="text-blue-500 font-black tracking-tighter">BORRADOR</span>
 </>
 )}
 </div>
 </div>
 </div>
 <button 
 onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
 className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-rose-500 hover:bg-rose-900/20 rounded-xl transition-all"
 >
 <Trash2 className="w-5 h-5" />
 </button>
 </div>
 </div>
 );
});

export const ReceptionPage: React.FC = () => {
 const navigate = useNavigate();
 const { state, actions } = useReceptionLogic();
 const { isLocked, unlock, lock } = useAutoLock(3000);
 
 const [isTriggerActive, setIsTriggerActive] = useState(false);
 const [showKeypad, setShowKeypad] = useState(false);
 const [showQueue, setShowQueue] = useState(false);
 const [isOcrLoading, setIsOcrLoading] = useState(false);

 // ESCUCHA DE HARDWARE
 useHIDScanner({
 onScan: (barcode) => actions.handleScan(barcode, state.currentErp),
 isEnabled: !isLocked && !showKeypad && !showQueue && !isOcrLoading,
 maxLatency: 50
 });

 const handleOcrCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
 const file = event.target.files?.[0];
 if (!file) return;

 setIsOcrLoading(true);
 const reader = new FileReader();
 reader.onload = async (e) => {
 const base64 = (e.target?.result as string).split(',')[1];
 try {
 const erp = await documentProcessor.extractERPFromPhoto(base64);
 if (erp) {
 actions.setCurrentErp(erp);
 SoundFX.play('success');
 } else {
 SoundFX.play('error');
 alert("No se encontró un número de ERP válido en la imagen.");
 }
 } catch (err) {
 SoundFX.play('error');
 } finally {
 setIsOcrLoading(false);
 }
 };
 reader.readAsDataURL(file);
 };

 const startTrigger = useCallback(() => {
 if (isLocked) return;
 setIsTriggerActive(true);
 if (navigator.vibrate) navigator.vibrate(30);
 }, [isLocked]);

 const endTrigger = useCallback(() => {
 setIsTriggerActive(false);
 }, []);

 const drafts = state.unsyncedDrafts || [];
 const rowData = React.useMemo(() => ({ onDelete: actions.deleteDraft, items: drafts }), [actions.deleteDraft, drafts]);

 const handleKeypadConfirm = (value: string) => {
 actions.handleScan(value, state.currentErp);
 setShowKeypad(false);
 };

 const containerClass = state.flashActive 
 ? 'bg-blue-600' 
 : (state.lastAction?.type === 'duplicate' ? 'bg-rose-950' : 'bg-black');

 return (
 <div className={`h-screen w-full flex flex-col font-mono select-none overflow-hidden text-white transition-colors duration-200 ${containerClass}`}>
 
 <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-2xl shrink-0 z-50">
 <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
 <ChevronLeft className="w-6 h-6 text-white" />
 </button>
 <div className="flex flex-col items-center">
 <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">RECEPCIÓN</span>
 <span className="text-xs font-black uppercase tracking-widest text-white italic">Blind_Entry</span>
 </div>
 <div className="flex items-center gap-2">
 <button 
 onClick={() => setShowQueue(true)}
 className="h-10 px-4 bg-white/5 border border-white/10 rounded-xl active:scale-95 flex items-center justify-center gap-2"
 >
 <span className="text-[10px] font-black text-white uppercase tracking-widest">{state.draftCount}</span>
 <Box className="w-4 h-4 text-slate-400" />
 </button>
 </div>
 </div>

 <div className="p-4 bg-slate-950 border-b border-white/5 shrink-0">
 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">ERP / Orden (Para siguientes bultos)</label>
 <div className="flex gap-2">
 <input 
 type="text" 
 value={state.currentErp}
 onChange={(e) => actions.setCurrentErp(e.target.value)}
 placeholder="Ej. ERP-12345 (Opcional)"
 className="flex-1 bg-black border border-white/10 rounded-xl px-4 font-mono text-white focus:border-blue-500 outline-none"
 />
 <button 
 onClick={() => document.getElementById('ocr-capture')?.click()}
 className="w-12 h-12 shrink-0 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center border border-blue-500/30 active:bg-blue-600 active:text-white transition-colors"
 >
 {isOcrLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
 </button>
 <input type="file" accept="image/*" capture="environment" className="hidden" id="ocr-capture" onChange={handleOcrCapture} />
 </div>
 </div>

 <ReceptionHero 
 lastAction={state.lastAction}
 draftCount={state.draftCount}
 isEcoMode={false}
 onToggleManual={() => {}}
 onCameraClick={() => {}}
 />

 <div className="flex-1 min-h-0 relative bg-black">
 <VirtualList 
 items={drafts} 
 itemHeight={80} 
 renderRow={ReceptionRow} 
 rowData={rowData} 
 className="bg-black/20" 
 />
 </div>

 <ScannerFooter 
 multiplier={1}
 unitsPerBox={1}
 isTriggerActive={isTriggerActive}
 onMultiplierChange={() => {}}
 onOpenManual={() => setShowKeypad(true)}
 onTriggerStart={startTrigger}
 onTriggerEnd={endTrigger}
 />

 {isTriggerActive && (
 <div className="fixed inset-0 z-[200]">
 <CameraScanner 
 onScan={(code) => { actions.handleScan(code, state.currentErp); setIsTriggerActive(false); }} 
 onClose={endTrigger} 
 isTriggered={true} 
 />
 </div>
 )}

 <NumericKeypad 
 isOpen={showKeypad}
 title="ETIQUETA MANUAL"
 onConfirm={handleKeypadConfirm}
 onClose={() => setShowKeypad(false)}
 />

 <QueueManager 
 isOpen={showQueue} 
 onClose={() => setShowQueue(false)} 
 drafts={drafts} 
 onDelete={actions.deleteDraft} 
 onDiscardAll={actions.discardAll} 
 onFinalize={() => {
   actions.finalizeReception();
   setShowQueue(false);
 }}
 />

 <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
 </div>
 );
};

export default ReceptionPage;
