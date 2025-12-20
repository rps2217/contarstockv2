import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { CameraScanner } from './CameraScanner';
import { ChevronLeft, Cloud, Barcode, X, Upload, Container } from 'lucide-react';

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
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden">
            <div className="p-4 flex items-center justify-between bg-white border-b border-slate-200 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><ChevronLeft className="w-6 h-6" /></button>
                    <div>
                        <h1 className="text-lg font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                            <Container className="w-5 h-5 text-blue-600" /> Recepción de Bultos
                        </h1>
                    </div>
                </div>
                <button onClick={() => navigate('/sync')} className="p-2.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl transition-all flex items-center gap-2 text-xs font-black uppercase border border-blue-100 shadow-sm active:scale-95">
                    <Cloud className="w-4 h-4" /> <span className="hidden md:inline">Gestor Nube</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-10 relative bg-slate-50">
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
                    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6">
                        <form onSubmit={handleManualSubmit} className="w-full max-w-md bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-2xl relative animate-in zoom-in-95">
                            <button type="button" onClick={() => setShowManualInput(false)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 transition-colors"><X className="w-7 h-7"/></button>
                            <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 mb-8 flex items-center gap-3"><Barcode className="w-6 h-6 text-blue-600" /> Ingreso de Etiqueta</h3>
                            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 mb-8 shadow-inner">
                                <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))} type="text" inputMode="numeric" pattern="[0-9]*" placeholder="00000000" className="w-full bg-transparent text-slate-900 text-4xl font-black text-center outline-none transition-all placeholder:text-slate-200" />
                            </div>
                            <button type="submit" className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase tracking-widest text-sm text-white shadow-xl shadow-blue-100 active:scale-95 transition-all">Registrar Bulto</button>
                        </form>
                    </div>
                )}
            </div>

            {unsyncedDrafts.length > 0 && (
                <div className="p-6 bg-white border-t border-slate-200 shadow-2xl z-20 shrink-0">
                    <button onClick={() => navigate('/sync')} className="w-full max-w-xl mx-auto bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm py-5 rounded-2xl shadow-xl shadow-blue-100 flex items-center justify-center gap-4 transition-all active:scale-95">
                        <Upload className="w-6 h-6" /> Sincronizar Cola ({unsyncedDrafts.length})
                    </button>
                </div>
            )}

            {isCameraOpen && <CameraScanner onScan={(code) => { setIsCameraOpen(false); handleScan(code); }} onClose={() => setIsCameraOpen(false)} />}
            <QueueManager isOpen={showQueueModal} onClose={() => setShowQueueModal(false)} drafts={unsyncedDrafts} onDelete={async (id) => { await db.sessions.delete(id); SoundFX.play('delete'); }} onDiscardAll={async () => { if (confirm("¿Vaciar cola de recepción?")) { await db.sessions.where('status').equals('draft').delete(); SoundFX.play('delete'); setShowQueueModal(false); } }} />
        </div>
    );
};