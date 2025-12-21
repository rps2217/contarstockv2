
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { CameraScanner } from './CameraScanner';
import { ChevronLeft, Barcode, X, Container, Zap, Keyboard, Camera, List, CheckCircle2 } from 'lucide-react';
import { QueueManager } from './reception/QueueManager';

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
            // Auto-clear success message after 3s
            setTimeout(() => setLastScanned(prev => prev === cleanCode ? null : prev), 3000);
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
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
            <div className="p-4 flex items-center justify-between shrink-0 z-20">
                <button onClick={() => navigate('/dashboard')} className="p-3 hover:bg-slate-200 rounded-2xl text-slate-500 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                <h1 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Recepción Express</h1>
                <button onClick={() => setShowQueueModal(true)} className="p-3 hover:bg-slate-200 rounded-2xl text-slate-500 transition-colors relative">
                    <List className="w-6 h-6" />
                    {draftCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-slate-50"></span>}
                </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                {lastScanned ? (
                    <div className="mb-12 text-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{lastScanned}</h2>
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full inline-block">Bulto Registrado</p>
                    </div>
                ) : (
                    <div className="mb-12 text-center opacity-40">
                        <Zap className="w-20 h-20 text-slate-300 mx-auto mb-6" />
                        <h2 className="text-3xl font-black tracking-tight text-slate-300 mb-2">MODO RÁFAGA</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Escanee etiqueta para ingresar</p>
                    </div>
                )}

                <div className="w-full max-w-sm bg-white border border-slate-200 rounded-[3rem] p-10 text-center mb-10 shadow-xl shadow-slate-200/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Cola de Entrada</div>
                    <div className="flex items-center justify-center gap-4">
                        <span className="text-8xl font-black tracking-tighter text-slate-900 tabular-nums">{draftCount}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <button onClick={() => setShowManualInput(true)} className="bg-white border-2 border-slate-100 hover:border-blue-200 p-6 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all shadow-sm group">
                        <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <Keyboard className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Teclado</span>
                    </button>
                    <button onClick={() => setIsCameraOpen(true)} className="bg-white border-2 border-slate-100 hover:border-blue-200 p-6 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all shadow-sm group">
                        <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            <Camera className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Cámara</span>
                    </button>
                </div>
            </div>

            {showManualInput && (
                <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center md:p-6">
                    <form onSubmit={handleManualSubmit} className="w-full max-w-md bg-white p-8 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl relative animate-in slide-in-from-bottom-10">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 flex items-center gap-3">
                                <Barcode className="w-6 h-6 text-blue-600" /> Etiqueta
                            </h3>
                            <button type="button" onClick={() => setShowManualInput(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5 text-slate-500"/></button>
                        </div>
                        
                        <input 
                            autoFocus 
                            ref={inputRef} 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))} 
                            type="text" 
                            inputMode="numeric" 
                            placeholder="ESCANEAR..." 
                            className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-6 text-3xl font-black text-center outline-none focus:border-blue-500 transition-all placeholder:text-slate-300 mb-6 text-slate-900" 
                        />
                        
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-5 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-lg shadow-blue-200 active:scale-95 transition-all">
                            Registrar Bulto
                        </button>
                    </form>
                </div>
            )}

            {isCameraOpen && <CameraScanner onScan={(code) => { setIsCameraOpen(false); handleScan(code); }} onClose={() => setIsCameraOpen(false)} />}
            
            <QueueManager 
                isOpen={showQueueModal} 
                onClose={() => setShowQueueModal(false)} 
                drafts={unsyncedDrafts} 
                onDelete={async (id) => { await db.sessions.delete(id); SoundFX.play('delete'); }} 
                onDiscardAll={async () => { if (confirm("¿Vaciar cola?")) { await db.sessions.where('status').equals('draft').delete(); setShowQueueModal(false); } }} 
            />
        </div>
    );
};
