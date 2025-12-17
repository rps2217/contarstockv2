import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Barcode, CheckCircle2, WifiOff, Upload, Download, Box, Zap, Layers, Hash, Loader2, Camera, Ban, List, Trash2, X, Eye, Keyboard, AlertTriangle, ArrowRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { restoreReceptionFromCloud } from '../services/syncBridge';
import { SoundFX } from '../services/audio';
import { CameraScanner } from './CameraScanner';
import { useNavigate } from 'react-router-dom';

export const Reception: React.FC = () => {
    const navigate = useNavigate();
    const [inputValue, setInputValue] = useState('');
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [showQueueModal, setShowQueueModal] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);

    const draftCount = useLiveQuery(() => db.sessions.where('status').equals('draft').count(), [], 0);
    const unsyncedDrafts = useLiveQuery(() => db.sessions.where('status').equals('draft').and(s => !s.lastSyncTimestamp).reverse().toArray(), [], []);

    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const hasCameraSupport = useMemo(() => {
        if (typeof navigator === 'undefined') return false;
        const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
        const hasApi = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        return isSecure && hasApi;
    }, []);

    const handleScan = async (code: string) => {
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode) return;

        try {
            await sessionService.createDraftSession(cleanCode);
            setLastScanned(cleanCode);
            setError(null);
            SoundFX.play('success');
        } catch (err: any) {
            setError(err.message === 'Etiqueta ya registrada' ? '¡Duplicado! Ya escaneado.' : 'Error al guardar');
            SoundFX.play('error');
        }
    };

    const handleCameraClick = () => {
        if (!hasCameraSupport) {
            alert("⚠️ CÁMARA BLOQUEADA POR EL NAVEGADOR\n\nCausa: Estás accediendo por una conexión no segura (HTTP).\n\nSolución:\n1. Usa 'localhost' si estás en el PC.\n2. Configura HTTPS para acceso móvil.\n3. O habilita las flags de 'Insecure origins' en chrome://flags.");
            return;
        }
        setIsCameraOpen(true);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleScan(inputValue);
        setInputValue('');
        setShowManualInput(false); 
    };

    const handleToggleManualInput = () => {
        setShowManualInput(prev => !prev);
        if (!showManualInput) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleDeleteDraft = async (id: string) => {
        try {
            await db.sessions.delete(id);
            SoundFX.play('delete');
        } catch (e) {
            console.error("Error deleting draft", e);
        }
    };

    const handleDiscardQueue = async () => {
        if (!unsyncedDrafts || unsyncedDrafts.length === 0) return;
        if (!confirm(`¿Estás seguro de eliminar los ${unsyncedDrafts.length} bultos de la cola? Esta acción no se puede deshacer.`)) return;
        
        try {
            const ids = unsyncedDrafts.map(s => s.id);
            await db.sessions.bulkDelete(ids);
            SoundFX.play('delete');
            setShowQueueModal(false);
        } catch (e) {
            alert("Error al vaciar la cola");
        }
    };

    const handleRestore = async () => {
        if (!confirm('¿Descargar historial de recepción desde la nube? Esto traerá bultos escaneados en otros dispositivos.')) return;
        setIsRestoring(true);
        try {
            const count = await restoreReceptionFromCloud();
            alert(`Descarga completada. ${count} nuevos registros importados.`);
        } catch (e: any) {
            alert(`Error de descarga: ${e.message}`);
        } finally {
            setIsRestoring(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (isCameraOpen || showQueueModal) return;
            if (target.tagName === 'INPUT') return;

            const now = Date.now();
            if (now - lastKeyTime.current > 50) buffer.current = '';
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length > 2) handleScan(buffer.current);
                buffer.current = '';
            } else if (e.key.length === 1) {
                buffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isCameraOpen, showQueueModal]);

    const visibleDrafts = useMemo(() => {
        return unsyncedDrafts ? unsyncedDrafts.slice(0, 100) : [];
    }, [unsyncedDrafts]);

    const hiddenCount = (unsyncedDrafts?.length || 0) - visibleDrafts.length;

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white">
            <div className="p-4 flex items-center justify-between bg-slate-800/50">
                <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="font-bold uppercase tracking-widest text-sm text-slate-400">Recepción Ciega</div>
                
                <button 
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="p-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold border border-indigo-500/30 disabled:opacity-50"
                >
                    {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    <span className="hidden md:inline">Descargar Bitácora</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
                <div className="flex flex-col items-center justify-center min-h-full pb-12">
                
                    {lastScanned ? (
                        <div className="mb-8 animate-in zoom-in slide-in-from-bottom-4 duration-300 text-center">
                            <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-6 py-2 rounded-full font-bold uppercase tracking-wider mb-4 inline-flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5" /> Registrado
                            </div>
                            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight break-all">{lastScanned}</h1>
                            <p className="text-slate-500 mt-2 font-mono">Bulto en espera de conteo</p>
                        </div>
                    ) : (
                        <div className="mb-8 opacity-50 text-center">
                            <Zap className="w-20 h-20 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold">Modo Ráfaga Activo</h2>
                        </div>
                    )}

                    <div className="bg-white/5 rounded-3xl p-6 w-full max-w-sm border border-white/10 relative overflow-hidden group mb-8">
                        <div className="absolute top-0 right-0 p-16 bg-blue-500/20 rounded-full blur-3xl -mr-8 -mt-8"></div>
                        
                        <div className="absolute top-4 right-4 z-20">
                            <button 
                                onClick={() => setShowQueueModal(true)}
                                className="p-2 bg-white/10 hover:bg-blue-600 rounded-lg text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                            >
                                <List className="w-4 h-4" /> <span className="hidden sm:inline">Ver Lista</span>
                            </button>
                        </div>

                        <div className="relative z-10 text-center">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Bultos Recibidos</div>
                            <div className="text-7xl font-black text-white flex items-center justify-center gap-2">
                                <Box className="w-10 h-10 text-slate-600" />
                                {draftCount}
                            </div>
                        </div>
                    </div>

                    <div className="w-full max-w-sm flex flex-col gap-3">
                        {!showManualInput ? (
                             <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={handleToggleManualInput}
                                    className="bg-slate-800 hover:bg-slate-700 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 shadow-sm"
                                >
                                    <Keyboard className="w-5 h-5" /> Teclado
                                </button>
                                <button 
                                    onClick={handleCameraClick}
                                    className={`p-4 rounded-xl font-bold flex items-center justify-center gap-2 border shadow-sm transition-all ${
                                        hasCameraSupport 
                                        ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700' 
                                        : 'bg-red-900/10 text-red-500 border-red-900/30 opacity-50'
                                    }`}
                                >
                                    {hasCameraSupport ? <Camera className="w-5 h-5" /> : <Ban className="w-5 h-5" />} Cámara
                                </button>
                             </div>
                        ) : (
                            <form onSubmit={handleManualSubmit} className="relative animate-in slide-in-from-bottom-2">
                                <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                                <input 
                                    ref={inputRef}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Escriba código..."
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-12 pr-12 text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all font-mono"
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowManualInput(false)}
                                    className="absolute right-2 top-2 p-2 text-slate-500 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </form>
                        )}
                        
                        <p className="text-center text-xs text-slate-600 mt-2">
                            {showManualInput ? 'Presione Enter para registrar' : 'Escáner físico siempre activo'}
                        </p>
                    </div>

                </div>
            </div>

            {unsyncedDrafts && unsyncedDrafts.length > 0 && (
                <div className="p-4 bg-slate-800 border-t border-slate-700 animate-in slide-in-from-bottom-full shrink-0">
                    <button 
                        onClick={() => navigate('/sync')}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                        <Upload className="w-6 h-6" />
                        Ir al Gestor de Nube ({unsyncedDrafts.length} Pendientes)
                    </button>
                </div>
            )}

            {isCameraOpen && (
                <CameraScanner 
                    onScan={(code) => {
                        setIsCameraOpen(false);
                        handleScan(code);
                    }} 
                    onClose={() => setIsCameraOpen(false)}
                />
            )}

            {showQueueModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-800 flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <List className="w-5 h-5 text-blue-500" /> Cola de Recepción
                                </h2>
                                <p className="text-slate-400 text-xs">Items pendientes de sincronización</p>
                            </div>
                            <button onClick={() => setShowQueueModal(false)} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                            {(!visibleDrafts || visibleDrafts.length === 0) ? (
                                <div className="text-center py-12 text-slate-500">
                                    <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p>La cola está vacía.</p>
                                </div>
                            ) : (
                                <>
                                    {visibleDrafts.map((draft, idx) => (
                                        <div key={draft.id} className="bg-slate-800 p-3 rounded-xl flex justify-between items-center group animate-in slide-in-from-right-2" style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s` }}>
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="bg-slate-700 text-slate-400 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                                                    {unsyncedDrafts!.length - idx}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-mono font-bold text-white truncate text-sm">{draft.logisticsLabel}</div>
                                                    <div className="text-[10px] text-slate-500">{new Date(draft.createdAt).toLocaleTimeString()}</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleDeleteDraft(draft.id)}
                                                className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                title="Eliminar este bulto"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))}
                                    {hiddenCount > 0 && (
                                        <div className="text-center py-4 text-slate-500 text-xs font-bold bg-slate-800/50 rounded-xl">
                                            + {hiddenCount} bultos más en cola...
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-800 grid grid-cols-2 gap-3 bg-slate-900/50 rounded-b-3xl">
                             <button 
                                onClick={handleDiscardQueue}
                                disabled={!unsyncedDrafts || unsyncedDrafts.length === 0}
                                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-4 h-4" /> Vaciar Todo
                            </button>
                            <button 
                                onClick={() => setShowQueueModal(false)}
                                className="bg-slate-800 text-white hover:bg-slate-700 py-3 rounded-xl font-bold text-sm transition-all"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};