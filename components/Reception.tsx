
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, Barcode, CheckCircle2, WifiOff, CloudUpload, CloudDownload, Box, Zap, Layers, Hash, Loader2, Camera, Ban } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as storage from '../services/storage';
import { syncReceptionToAppSheet, restoreReceptionFromCloud } from '../services/syncBridge';
import { SoundFX } from '../services/audio';
import { CameraScanner } from './CameraScanner';

interface ReceptionProps {
    onBack: () => void;
}

export const Reception: React.FC<ReceptionProps> = ({ onBack }) => {
    const [inputValue, setInputValue] = useState('');
    const [lastScanned, setLastScanned] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // Queries
    // Count ONLY sessions that are in 'draft' mode (not yet activated)
    const draftCount = useLiveQuery(() => db.sessions.where('status').equals('draft').count(), [], 0);
    const unsyncedDrafts = useLiveQuery(() => db.sessions.where('status').equals('draft').and(s => !s.lastSyncTimestamp).toArray(), [], []);

    // --- SMART GROUPING LOGIC ---
    // Detects lots based on common prefixes
    const detectedLots = useMemo(() => {
        if (!unsyncedDrafts || unsyncedDrafts.length === 0) return [];

        const groups = new Map<string, number>();

        unsyncedDrafts.forEach(s => {
            const label = s.logisticsLabel;
            let groupKey = label;

            // Logic adjusted for 26-digit standard
            if (label.length === 26) {
                // Caso Estándar: 26 dígitos. Usamos los primeros 23 como Lote.
                // Ignoramos los últimos 3 (secuencial 001, 002...)
                groupKey = label.substring(0, 23);
            } else if (label.length > 8) {
                // Heurística genérica para etiquetas largas
                groupKey = label.substring(0, label.length - 3); 
            } else if (label.length > 5) {
                // Etiquetas cortas
                groupKey = label.substring(0, label.length - 1);
            }

            groups.set(groupKey, (groups.get(groupKey) || 0) + 1);
        });

        // Convert to array and sort by count (descending)
        return Array.from(groups.entries())
            .map(([prefix, count]) => ({ prefix, count }))
            .sort((a, b) => b.count - a.count);
    }, [unsyncedDrafts]);

    // Buffer for scanner
    const buffer = useRef('');
    const lastKeyTime = useRef(0);

    // --- SECURITY CHECK ---
    const hasCameraSupport = useMemo(() => {
        if (typeof navigator === 'undefined') return false;
        const isSecure = typeof window !== 'undefined' ? window.isSecureContext : false;
        const hasApi = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        return isSecure && hasApi;
    }, []);

    // --- SCANNER LOGIC ---
    const handleScan = async (code: string) => {
        const cleanCode = storage.sanitizeBarcode(code);
        if (!cleanCode) return;

        try {
            await storage.createDraftSession(cleanCode);
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
    };

    const handleSync = async () => {
        if (unsyncedDrafts.length === 0) return;
        setIsSyncing(true);
        try {
            await syncReceptionToAppSheet(unsyncedDrafts);
            alert('Bitácora de recepción sincronizada correctamente.');
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        } finally {
            setIsSyncing(false);
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
            // Don't capture keys if camera is open to avoid conflicts
            if (isCameraOpen) return;
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
    }, [isCameraOpen]);

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white">
            {/* Header */}
            <div className="p-4 flex items-center justify-between bg-slate-800/50">
                <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="font-bold uppercase tracking-widest text-sm text-slate-400">Recepción Ciega</div>
                
                <button 
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="p-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-xs font-bold border border-indigo-500/30 disabled:opacity-50"
                >
                    {isRestoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                    <span className="hidden md:inline">Descargar Bitácora</span>
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 no-scrollbar">
                <div className="flex flex-col items-center justify-center min-h-full">
                
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

                    {/* Counter */}
                    <div className="bg-white/5 rounded-3xl p-6 w-full max-w-sm border border-white/10 relative overflow-hidden group mb-8">
                        <div className="absolute top-0 right-0 p-16 bg-blue-500/20 rounded-full blur-3xl -mr-8 -mt-8"></div>
                        <div className="relative z-10 text-center">
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Bultos Recibidos</div>
                            <div className="text-7xl font-black text-white flex items-center justify-center gap-2">
                                <Box className="w-10 h-10 text-slate-600" />
                                {draftCount}
                            </div>
                        </div>
                    </div>

                    {/* SMART LOTS GRID */}
                    {detectedLots.length > 0 && (
                        <div className="w-full max-w-lg mb-8 animate-in fade-in slide-in-from-bottom-8">
                            <div className="flex items-center gap-2 mb-3 px-2">
                                <Layers className="w-4 h-4 text-indigo-400" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lotes Detectados</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {detectedLots.map((lot, idx) => (
                                    <div key={lot.prefix} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex justify-between items-center relative overflow-hidden group">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/50"></div>
                                        <div className="min-w-0 pr-2">
                                            <div className="text-[10px] text-slate-500 font-mono uppercase truncate mb-0.5">Prefijo Común</div>
                                            <div className="font-mono font-bold text-indigo-100 truncate text-sm" title={lot.prefix}>
                                                {lot.prefix.length > 20 ? '...' + lot.prefix.slice(-10) : lot.prefix}<span className="opacity-30">###</span>
                                            </div>
                                        </div>
                                        <div className="bg-indigo-500 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-900/50">
                                            {lot.count}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 bg-red-500 text-white px-6 py-3 rounded-xl font-bold animate-in shake">
                            {error}
                        </div>
                    )}

                    {/* Input Area with Camera */}
                    <div className="w-full max-w-sm flex gap-2">
                         <form onSubmit={handleManualSubmit} className="flex-1 relative">
                            <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                            <input 
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Entrada Manual..."
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 outline-none focus:border-blue-500 transition-all font-mono"
                                autoFocus
                            />
                        </form>
                        <button 
                            type="button"
                            onClick={handleCameraClick}
                            className={`w-14 rounded-xl flex items-center justify-center transition-all border ${
                                hasCameraSupport 
                                ? 'bg-slate-800 text-blue-400 border-slate-700 hover:bg-slate-700' 
                                : 'bg-red-900/20 text-red-500 border-red-900/50 cursor-not-allowed'
                            }`}
                            title={hasCameraSupport ? "Abrir Cámara" : "Cámara no disponible (Requiere HTTPS)"}
                        >
                            {hasCameraSupport ? <Camera className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
                        </button>
                    </div>

                </div>
            </div>

            {/* Sync Footer */}
            {unsyncedDrafts.length > 0 && (
                <div className="p-4 bg-slate-800 border-t border-slate-700 animate-in slide-in-from-bottom-full shrink-0">
                    <button 
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-900/50 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSyncing ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <CloudUpload className="w-6 h-6" />
                        )}
                        Sincronizar Bitácora ({unsyncedDrafts.length})
                    </button>
                </div>
            )}

            {/* Camera Modal */}
            {isCameraOpen && (
                <CameraScanner 
                    onScan={(code) => {
                        setIsCameraOpen(false);
                        handleScan(code);
                    }} 
                    onClose={() => setIsCameraOpen(false)}
                />
            )}
        </div>
    );
};
