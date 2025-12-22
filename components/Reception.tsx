
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
        <div className="flex flex-col h-full w-full bg-slate-900 text-white rounded-[2rem] overflow-hidden border border-slate-800 shadow-2xl relative">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-white/10 shrink-0 z-20 bg-slate-900/50 backdrop-blur-md">
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full text-white/70 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                <div className="flex flex-col items-center">
                    <h1 className="text-sm font-black uppercase tracking-[0.2em] text-white">Recepción Ciega</h1>
                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 rounded mt-0.5">Modo Rápido</span>
                </div>
                <button onClick={() => setShowQueueModal(true)} className="p-2 hover:bg-white/10 rounded-full text-white/70 relative">
                    <List className="w-6 h-6" />
                    {draftCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>}
                </button>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-y-auto no-scrollbar">
                {lastScanned ? (
                    <div className="mb-12 text-center animate-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-2">{lastScanned}</h2>
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full inline-block">Bulto Registrado</p>
                    </div>
                ) : (
                    <div className="mb-12 text-center opacity-30">
                        <Zap className="w-24 h-24 text-white mx-auto mb-6" />
                        <h2 className="text-3xl font-black tracking-tight text-white mb-2">LISTO</h2>
                        <p className="text-[10px] font-bold text-white uppercase tracking-[0.3em]">Esperando Etiqueta</p>
                    </div>
                )}

                <div className="w-full max-w-xs bg-white/5 border border-white/10 rounded-[2.5rem] p-8 text-center mb-8 backdrop-blur-sm">
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-4">Total Sesión</div>
                    <div className="flex items-center justify-center gap-4">
                        <Container className="w-8 h-8 text-white/20" />
                        <span className="text-7xl font-black tracking-tighter text-white tabular-nums">{draftCount}</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    <button onClick={() => setShowManualInput(true)} className="bg-white/5 hover:bg-white/10 border border-white/10 p-6 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all group">
                        <Keyboard className="w-8 h-8 text-white/40 group-hover:text-white transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Teclado</span>
                    </button>
                    <button onClick={() => setIsCameraOpen(true)} className="bg-blue-600 hover:bg-blue-500 border border-blue-400 p-6 rounded-[2rem] flex flex-col items-center gap-3 active:scale-95 transition-all shadow-lg shadow-blue-900/50">
                        <Camera className="w-8 h-8 text-white" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">Cámara</span>
                    </button>
                </div>
            </div>

            {/* Modals */}
            {showManualInput && (
                <div className="absolute inset-0 z-[60] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in">
                    <div className="w-full max-w-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                                <Barcode className="w-6 h-6 text-blue-500" /> Manual
                            </h3>
                            <button onClick={() => setShowManualInput(false)} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><X className="w-5 h-5 text-white"/></button>
                        </div>
                        <form onSubmit={handleManualSubmit} className="space-y-6">
                            <input 
                                autoFocus 
                                ref={inputRef} 
                                value={inputValue} 
                                onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))} 
                                type="text" 
                                inputMode="numeric" 
                                placeholder="000000" 
                                className="w-full h-24 bg-black/30 border-2 border-white/10 rounded-[2rem] text-4xl font-black text-center outline-none focus:border-blue-500 text-white tracking-widest placeholder:text-white/10 transition-colors" 
                            />
                            <button type="submit" className="w-full h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all">
                                Confirmar
                            </button>
                        </form>
                    </div>
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
