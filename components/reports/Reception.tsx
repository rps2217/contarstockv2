
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import * as sessionService from '../../services/sessionService'; 
import { sanitizeBarcode } from '../../services/utils';
import { SoundFX } from '../../services/audio';
import { CameraScanner } from '../CameraScanner';
import { ChevronLeft, Barcode, X, Container, Zap, Keyboard, Camera, List } from 'lucide-react';
import { QueueManager } from '../reception/QueueManager';

export const Reception: React.FC = () => {
 const navigate = useNavigate();
 const [inputValue, setInputValue] = useState('');
 const [lastScanned, setLastScanned] = useState<string | null>(null);
 const [isCameraOpen, setIsCameraOpen] = useState(false);
 const [showQueueModal, setShowQueueModal] = useState(false);
 const [showManualInput, setShowManualInput] = useState(false);

 const buffer = useRef('');
 const lastKeyTime = useRef(0);
 const inputRef = useRef<HTMLInputElement>(null);

 const draftCount = useLiveQuery(() => db.sessions.where('status').equals('draft').count(), [], 0);
 const unsyncedDrafts = useLiveQuery(() => db.sessions.where('status').equals('draft').and(s => !s.lastSyncTimestamp).reverse().toArray(), [], []);

 const handleScan = async (code: string) => {
 const cleanCode = sanitizeBarcode(code);
 if (!cleanCode) return;
 try {
 await sessionService.createDraftSession(cleanCode);
 setLastScanned(cleanCode);
 SoundFX.play('success');
 } catch (err: any) { SoundFX.play('error'); }
 };

 const handleManualSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 handleScan(inputValue);
 setInputValue('');
 setShowManualInput(false); 
 };

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (isCameraOpen || showQueueModal || (e.target as HTMLElement).tagName === 'INPUT') return;
 const now = Date.now();
 if (now - lastKeyTime.current > 50) buffer.current = '';
 lastKeyTime.current = now;
 if (e.key === 'Enter') {
 if (buffer.current.length > 2) handleScan(buffer.current);
 buffer.current = '';
 } else if (e.key.length === 1) buffer.current += e.key;
 };
 window.addEventListener('keydown', handleKeyDown);
 return () => window.removeEventListener('keydown', handleKeyDown);
 }, [isCameraOpen, showQueueModal]);

 return (
 <div className="flex flex-col h-screen bg-[#111827] text-white overflow-hidden">
 <div className="p-4 flex items-center justify-between border-b border-white/5 shrink-0 z-20">
 <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/5 rounded-full text-white/60"><ChevronLeft className="w-6 h-6" /></button>
 <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white/80">Recepción Ciega V2</h1>
 <button onClick={() => setShowQueueModal(true)} className="p-2 hover:bg-white/5 rounded-full text-white/60"><List className="w-6 h-6" /></button>
 </div>

 <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
 <div className="mb-12 text-center">
 <Zap className="w-20 h-20 text-blue-500/40 mx-auto mb-6" />
 <h2 className="text-3xl font-black tracking-tight mb-2">MODO RÁFAGA</h2>
 <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Eskanee bultos rápidamente</p>
 </div>

 <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-[3rem] p-10 text-center mb-16 shadow-2xl relative">
 <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Total Ingresos</div>
 <div className="flex items-center justify-center gap-6">
 <Container className="w-12 h-12 text-white/10" />
 <span className="text-9xl font-black tracking-tighter">{draftCount}</span>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
 <button onClick={() => setShowManualInput(true)} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all">
 <Keyboard className="w-6 h-6 text-white/60" />
 <span className="text-[10px] font-black uppercase tracking-widest">Teclado</span>
 </button>
 <button onClick={() => setIsCameraOpen(true)} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all">
 <Camera className="w-6 h-6 text-white/60" />
 <span className="text-[10px] font-black uppercase tracking-widest">Cámara</span>
 </button>
 </div>
 </div>

 {showManualInput && (
 <div className="fixed inset-0 z-[60] bg-[#111827]/90 flex items-center justify-center p-6">
 <form onSubmit={handleManualSubmit} className="w-full max-w-md bg-[#1F2937] p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative">
 <button type="button" onClick={() => setShowManualInput(false)} className="absolute top-6 right-6 text-white/20"><X className="w-7 h-7"/></button>
 <h3 className="text-xl font-black uppercase tracking-widest text-white mb-8 flex items-center gap-3"><Barcode className="w-6 h-6 text-blue-500" /> Etiqueta</h3>
 <input autoFocus ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))} type="text" inputMode="numeric" placeholder="00000000" className="w-full bg-black/20 border border-white/5 rounded-3xl p-6 text-white text-4xl font-black text-center outline-none transition-all placeholder:text-white/10 mb-8" />
 <button type="submit" className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest text-sm text-white shadow-xl shadow-blue-500/20 active:scale-95">Registrar Bulto</button>
 </form>
 </div>
 )}

 {isCameraOpen && <CameraScanner onScan={(code) => { setIsCameraOpen(false); handleScan(code); }} onClose={() => setIsCameraOpen(false)} />}
 <QueueManager isOpen={showQueueModal} onClose={() => setShowQueueModal(false)} drafts={unsyncedDrafts} onDelete={async (id) => { await db.sessions.delete(id); SoundFX.play('delete'); }} onDiscardAll={async () => { if (confirm("¿Vaciar cola?")) { await db.sessions.where('status').equals('draft').delete(); setShowQueueModal(false); } }} />
 </div>
 );
};
