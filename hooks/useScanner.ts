
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { sanitizeBarcode } from '../services/utils';
import { getSettings } from '../services/settings';
import { SoundFX } from '../services/audio';
import { CountingSession, Product, ScannerStatus, ScanRecord } from '../types';
import { predictNextSkus } from '../services/predictiveService';

export const useScanner = (
    session: CountingSession, 
    onCloseSession: () => void, 
    onDiscardSession?: () => void
) => {
    // --- ESTADOS DE CONTROL ---
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [feedback, setFeedback] = useState<'idle' | 'success' | 'error' | 'undo'>('idle');
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [predictions, setPredictions] = useState<{barcode: string, name: string}[]>([]);

    // --- ESTADO OPTIMISTA (Elimina la sensación de lentitud) ---
    const [activeProduct, setActiveProduct] = useState<{
        barcode: string;
        name: string;
        totalQty: number;
        isUnknown: boolean;
    } | null>(null);

    // --- PANTALLA DE EXPIRACIÓN ---
    const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
    const [pendingProductName, setPendingProductName] = useState('PENDIENTE');

    // --- CACHÉS Y REFERENCIAS DE RENDIMIENTO ---
    const isProcessingRef = useRef(false);
    const sessionSeenSkus = useRef<Set<string>>(new Set());
    const keyBuffer = useRef('');
    const lastKeyTime = useRef(0);

    // --- QUERIES DE FONDO (Para Historial y Metadatos) ---
    const recentScans = useLiveQuery(
        () => db.scans.where('sessionId').equals(session.id).reverse().sortBy('timestamp').then(res => res.slice(0, 15)), 
        [session.id]
    );

    const sessionMetadata = useLiveQuery(() => db.sessions.get(session.id), [session.id]);

    // --- INICIALIZACIÓN DE CACHÉ DE SESIÓN ---
    useEffect(() => {
        const initCache = async () => {
            const scans = await db.scans.where('sessionId').equals(session.id).toArray();
            scans.forEach(s => sessionSeenSkus.current.add(s.barcode));
            
            // Si hay un último scan al cargar, establecerlo como activo para evitar el "LISTO" vacío
            if (scans.length > 0) {
                const last = scans.sort((a, b) => b.timestamp - a.timestamp)[0];
                const prod = await db.products.get(last.barcode);
                const total = scans.filter(s => s.barcode === last.barcode).reduce((acc, curr) => acc + curr.quantity, 0);
                setActiveProduct({
                    barcode: last.barcode,
                    name: prod?.name || last.barcode,
                    totalQty: total,
                    isUnknown: prod?.name === 'PENDIENTE'
                });
            }
        };
        initCache();
    }, [session.id]);

    const updatePredictions = useCallback(async (newBarcode: string) => {
        const settings = getSettings();
        if (!settings.predictiveHintsEnabled) return;
        try {
            const predictedCodes = await predictNextSkus([newBarcode]);
            const fullPredicted = [];
            for (const code of predictedCodes) {
                const p = await db.products.get(code);
                if (p) fullPredicted.push({ barcode: p.barcode, name: p.name });
            }
            setPredictions(fullPredicted);
        } catch (e) {}
    }, []);

    // --- CORE: REGISTRO FINAL OPTIMIZADO ---
    const completeScan = useCallback(async (code: string, mm?: number, yyyy?: number) => {
        try {
            const currentMultiplier = multiplier; // Capturar valor actual
            let finalMm = mm, finalYyyy = yyyy;
            
            // Herencia de fecha
            if (finalMm === undefined) {
                const prev = await db.scans.where('[sessionId+barcode]').equals([session.id, code]).first();
                if (prev) { finalMm = prev.mm; finalYyyy = prev.yyyy; }
            }

            // 1. ACTUALIZACIÓN VISUAL INMEDIATA (Optimismo)
            setActiveProduct(prev => {
                const isSame = prev?.barcode === code;
                return {
                    barcode: code,
                    name: isSame ? prev.name : (pendingProductName || code),
                    totalQty: isSame ? (prev.totalQty + currentMultiplier) : currentMultiplier, // Nota: esto es una estimación, la DB mandará el dato real luego
                    isUnknown: (pendingProductName === 'PENDIENTE')
                };
            });

            setFeedback('success');
            SoundFX.play(currentMultiplier > 1 ? 'increment' : 'success');

            // 2. PERSISTENCIA EN SEGUNDO PLANO
            const newScan = await sessionService.addScan(session.id, code, currentMultiplier, finalMm, finalYyyy);
            sessionSeenSkus.current.add(code);

            // Re-sincronizar cantidad real desde la DB para evitar desajustes por el buffer
            const allScansOfProduct = await db.scans.where('[sessionId+barcode]').equals([session.id, code]).toArray();
            const totalReal = allScansOfProduct.reduce((acc, s) => acc + s.quantity, 0);
            
            setActiveProduct(prev => prev?.barcode === code ? { ...prev, totalQty: totalReal } : prev);

            const settings = getSettings();
            if (settings.ttsEnabled) {
                const prod = await db.products.get(code);
                SoundFX.speak(settings.ttsMode === 'product' ? (prod?.name || "Ok") : `${currentMultiplier}`);
            }

            updatePredictions(code);
            setMultiplier(1);
            setStatus('idle');
            setTimeout(() => setFeedback('idle'), 400); 
        } catch (err) { 
            setFeedback('error'); 
            SoundFX.play('error'); 
        } finally {
            isProcessingRef.current = false;
        }
    }, [session.id, multiplier, pendingProductName, updatePredictions]);

    // --- CORE: IDENTIFICACIÓN ATÓMICA ---
    const processScan = useCallback(async (code: string) => {
        if (isProcessingRef.current) return;
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode || cleanCode.length < 2) return;
        
        isProcessingRef.current = true;
        
        try {
            let prod = await db.products.get(cleanCode);
            const settings = getSettings();

            // REGLA: REGISTRO AUTOMÁTICO 'PENDIENTE'
            if (!prod) {
                if (settings.autoRegisterUnknown) {
                    const newProd: Product = { 
                        barcode: cleanCode, 
                        name: 'PENDIENTE', 
                        category: 'AUTO', 
                        syncStatus: 'add' 
                    };
                    await productService.saveProduct(newProd);
                    prod = newProd;
                } else {
                    setPendingScanCode(cleanCode);
                    setPendingProductName('DESCONOCIDO');
                    setStatus('product_form');
                    isProcessingRef.current = false;
                    return;
                }
            }

            setPendingProductName(prod.name);

            // ¿Necesita fecha? (Solo si es la primera vez que entra en este bulto específico)
            const existsInSession = sessionSeenSkus.current.has(cleanCode);
            
            if (!existsInSession) {
                setPendingScanCode(cleanCode);
                setStatus('expiring');
                // isProcessingRef se libera en completeScan o al cancelar
            } else {
                await completeScan(cleanCode);
            }
        } catch (err) { 
            console.error(err);
            setFeedback('error'); 
            isProcessingRef.current = false;
        }
    }, [session.id, completeScan]);

    const handleUndo = useCallback(async () => {
        try {
            const undoneBarcode = await sessionService.undoLastScan(session.id);
            if (undoneBarcode) {
                setFeedback('undo');
                SoundFX.play('delete');
                
                // Actualizar UI tras deshacer
                const remaining = await db.scans.where('[sessionId+barcode]').equals([session.id, undoneBarcode]).toArray();
                if (remaining.length > 0) {
                    const total = remaining.reduce((acc, s) => acc + s.quantity, 0);
                    setActiveProduct(prev => prev?.barcode === undoneBarcode ? { ...prev, totalQty: total } : prev);
                } else {
                    setActiveProduct(null);
                    sessionSeenSkus.current.delete(undoneBarcode);
                }

                setTimeout(() => setFeedback('idle'), 800);
            }
        } catch (e) {
            SoundFX.play('error');
        }
    }, [session.id]);

    // --- KEYBOARD LISTENER ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (status !== 'idle' && status !== 'manual') return;
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            const now = Date.now();
            if (now - lastKeyTime.current > 40) keyBuffer.current = '';
            lastKeyTime.current = now;
            if (e.key === 'Enter') {
                e.preventDefault();
                if (keyBuffer.current.length >= 2) { processScan(keyBuffer.current); keyBuffer.current = ''; }
            } else if (e.key.length === 1) { keyBuffer.current += e.key; }
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [status, processScan, handleUndo]);

    return {
        state: { 
            status, setStatus, feedback, manualInput, setManualInput, multiplier, setMultiplier,
            pendingScanCode, pendingProductName, predictions,
            optimisticActiveQty: activeProduct?.totalQty || 0,
            optimisticTotalQty: sessionMetadata?.totalUnits || 0,
            optimisticUniqueSkus: sessionMetadata?.totalSKUs || 0
        },
        data: { 
            lastScan: recentScans?.[0], // Usar el real de la DB para el historial lateral
            recentScans, 
            activeProductStats: activeProduct ? { 
                totalQty: activeProduct.totalQty, 
                name: activeProduct.name, 
                isUnknown: activeProduct.isUnknown 
            } : { totalQty: 0, name: 'Listo', isUnknown: false }
        },
        actions: { 
            handleExternalScan: processScan,
            handleManualSubmit: (e: any) => { e.preventDefault(); if (manualInput) processScan(manualInput); setManualInput(''); },
            handleDeleteScan: async (e: any, id: string) => { 
                e.stopPropagation(); 
                const scan = await db.scans.get(id);
                await sessionService.deleteScan(id); 
                if (scan && activeProduct?.barcode === scan.barcode) {
                    const remaining = await db.scans.where('[sessionId+barcode]').equals([session.id, scan.barcode]).toArray();
                    const newTotal = remaining.reduce((acc, s) => acc + s.quantity, 0);
                    setActiveProduct(prev => prev ? { ...prev, totalQty: newTotal } : null);
                }
                SoundFX.play('delete'); 
            },
            handleQuantityChange: async (id: string, current: number, delta: number) => { 
                const newQty = Math.max(0, current + delta);
                await sessionService.updateScanQuantity(id, newQty); 
                const scan = await db.scans.get(id);
                if (scan && activeProduct?.barcode === scan.barcode) {
                    const remaining = await db.scans.where('[sessionId+barcode]').equals([session.id, scan.barcode]).toArray();
                    setActiveProduct(prev => prev ? { ...prev, totalQty: remaining.reduce((a, s) => a + s.quantity, 0) } : null);
                }
            },
            handleExpirationComplete: (mm?: number, yyyy?: number) => { 
                if (pendingScanCode) completeScan(pendingScanCode, mm, yyyy); 
                else isProcessingRef.current = false;
            },
            handleToggleIncident: async (e: any, id: string, s: boolean) => { e.stopPropagation(); await sessionService.updateScanIncident(id, !s); },
            handleDiscard: () => { if (confirm("¿Borrar sesión física?")) onDiscardSession?.(); },
            handleUndo
        }
    };
};
