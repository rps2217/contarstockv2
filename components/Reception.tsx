
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { CameraScanner } from './CameraScanner';
import { ChevronLeft, Cloud, Barcode, X, Upload } from 'lucide-react';

// Atómicos
import { ReceptionHero } from './reception/ReceptionHero';
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

    const hasCameraSupport = useMemo(() => {
        return typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }, []);

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
        <div className="flex flex-col h-screen bg-slate-900 text-white overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-slate-800/30 backdrop-blur-md border-b border-white/5 shrink-0 z-20">
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                <div className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400">Recepción Ciega v2</div>
                <button onClick={() => navigate('/sync')} className="p-2.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase border border-indigo-500/20 shadow-lg">
                    <Cloud className="w-4 h-4" /> <span className="hidden md:inline">Gestor Nube</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar relative">
                <ReceptionHero 
                    lastScanned={lastScanned} 
                    draftCount={draftCount} 
                    showManualInput={showManualInput} 
                    hasCameraSupport={hasCameraSupport}
                    onToggleManual={() => { setShowManualInput(true); setTimeout(() => inputRef.current?.focus(), 100); }}
                    onCameraClick={() => setIsCameraOpen(true)}
                    onShowList={() => setShowQueueModal(true)}
                />

                {showManualInput && (
                    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
                        <form onSubmit={handleManualSubmit} className="w-full max-w-sm bg-slate-900 p-6 rounded-[2rem] border border-white/10 shadow-2xl relative animate-in zoom-in-95">
                            <button type="button" onClick={() => setShowManualInput(false)} className="absolute top-4 right-4 text-slate-500"><X /></button>
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><Barcode className="w-4 h-4" /> Ingreso Manual</h3>
                            <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="Escriba código..." className="w-full bg-black border border-white/10 rounded-2xl py-5 px-6 text-white text-2xl font-mono text-center outline-none focus:border-blue-500 transition-all mb-4" />
                            <button type="submit" className="w-full bg-blue-600 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-blue-900/50">Registrar</button>
                        </form>
                    </div>
                )}
            </div>

            {unsyncedDrafts.length > 0 && (
                <div className="p-4 bg-slate-800 border-t border-white/5 animate-in slide-in-from-bottom-full shrink-0">
                    <button onClick={() => navigate('/sync')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl shadow-2xl shadow-blue-900/50 flex items-center justify-center gap-3 transition-all active:scale-95">
                        <Upload className="w-5 h-5" /> Sincronizar ({unsyncedDrafts.length})
                    </button>
                </div>
            )}

            {isCameraOpen && <CameraScanner onScan={(code) => { setIsCameraOpen(false); handleScan(code); }} onClose={() => setIsCameraOpen(false)} />}
            <QueueManager isOpen={showQueueModal} onClose={() => setShowQueueModal(false)} drafts={unsyncedDrafts} onDelete={async (id) => { await db.sessions.delete(id); SoundFX.play('delete'); }} onDiscardAll={async () => { if (confirm("¿Vaciar cola?")) { await db.sessions.where('status').equals('draft').delete(); SoundFX.play('delete'); setShowQueueModal(false); } }} />
        </div>
    );
};
