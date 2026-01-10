
import { useState, useEffect, useRef, useCallback } from 'react';
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

    // --- EL CORAZÓN DE LA SOLUCIÓN: ESTADO OPTIMISTA ---
    const [activeScan, setActiveScan] = useState<ScanRecord | null>(null);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [accumulatedQty, setAccumulatedQty] = useState(0);

    // --- TRACKERS DE SESIÓN (Refs para evitar cierres de estado obsoletos) ---
    const sessionSeenSkus = useRef<Set<string>>(new Set());
    const sessionCountsRef = useRef<Map<string, number>>(new Map());
    
    const isProcessingRef = useRef(false);
    const keyBuffer = useRef('');
    const lastKeyTime = useRef(0);

    // --- PANTALLA DE CONTROL ---
    const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
    const [pendingProductName, setPendingProductName] = useState('PENDIENTE');

    // --- QUERIES REACTIVAS ---
    const recentScans = useLiveQuery(
        () => db.scans.where('sessionId').equals(session.id).reverse().sortBy('timestamp').then(res => res.slice(0, 15)), 
        [session.id]
    );

    const sessionMetadata = useLiveQuery(() => db.sessions.get(session.id), [session.id]);

    // --- INICIALIZACIÓN DE CACHÉ LOCAL ---
    useEffect(() => {
        const initCache = async () => {
            const scans = await db.scans.where('sessionId').equals(session.id).toArray();
            
            // Poblar rastreadores
            sessionSeenSkus.current.clear();
            sessionCountsRef.current.clear();
            
            scans.forEach(s => {
                sessionSeenSkus.current.add(s.barcode);
                const current = sessionCountsRef.current.get(s.barcode) || 0;
                sessionCountsRef.current.set(s.barcode, current + s.quantity);
            });
            
            if (scans.length > 0) {
                const last = scans.sort((a, b) => b.timestamp - a.timestamp)[0];
                const prod = await db.products.get(last.barcode);
                
                setActiveScan(last);
                setActiveProduct(prod || null);
                setAccumulatedQty(sessionCountsRef.current.get(last.barcode) || 0);
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

    // --- ACCIÓN CORE: REGISTRO FINAL OPTIMISTA ---
    const completeScan = useCallback(async (code: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier;
            let finalMm = mm, finalYyyy = yyyy;
            
            // Recuperar fecha previa si no se proporcionó
            if (finalMm === undefined) {
                const prev = await db.scans.where('[sessionId+barcode]').equals([session.id, code]).first();
                if (prev) { finalMm = prev.mm; finalYyyy = prev.yyyy; }
            }

            // 1. ACTUALIZAR RASTREADOR SÍNCRONO (Elimina el "pegado" del contador)
            const currentTotal = sessionCountsRef.current.get(code) || 0;
            const newTotal = currentTotal + qtyToAdd;
            sessionCountsRef.current.set(code, newTotal);
            sessionSeenSkus.current.add(code);

            // 2. DISPARAR GUARDADO EN DB (Asíncrono con buffer)
            const newScan = await sessionService.addScan(session.id, code, qtyToAdd, finalMm, finalYyyy);

            // 3. ACTUALIZAR UI INSTANTÁNEAMENTE
            const prod = await db.products.get(code);
            setActiveScan(newScan);
            setActiveProduct(prod || null);
            setAccumulatedQty(newTotal);

            // Feedback
            setFeedback('success');
            SoundFX.play(qtyToAdd > 1 ? 'increment' : 'success');

            const settings = getSettings();
            if (settings.ttsEnabled) {
                SoundFX.speak(settings.ttsMode === 'product' ? (prod?.name || "Ok") : `${qtyToAdd}`);
            }

            updatePredictions(code);
            setMultiplier(1);
            setStatus('idle');
            setTimeout(() => setFeedback('idle'), 400); 
        } catch (err) { 
            console.error("Scan Error:", err);
            setFeedback('error'); 
            SoundFX.play('error'); 
        } finally {
            isProcessingRef.current = false;
        }
    }, [session.id, multiplier, updatePredictions]);

    // --- PROCESAMIENTO CON SOLICITUD DE FECHA ---
    const processScan = useCallback(async (code: string) => {
        if (isProcessingRef.current) return;
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode || cleanCode.length < 2) return;
        
        isProcessingRef.current = true;
        
        try {
            let prod = await db.products.get(cleanCode);

            // Auto-registro de desconocidos
            if (!prod) {
                const newProd: Product = { 
                    barcode: cleanCode, 
                    name: 'PENDIENTE', 
                    category: 'AUTO', 
                    syncStatus: 'add' 
                };
                await productService.saveProduct(newProd);
                prod = newProd;
            }

            setPendingProductName(prod.name);
            setPendingScanCode(cleanCode);

            const isNewInSession = !sessionSeenSkus.current.has(cleanCode);
            
            // MANDATORIO: Si es la primera vez en el bulto, pedir fecha
            if (isNewInSession) {
                setStatus('expiring');
            } else {
                await completeScan(cleanCode);
            }
        } catch (err) { 
            console.error(err);
            setFeedback('error'); 
            isProcessingRef.current = false;
        }
    }, [completeScan]);

    const handleUndo = useCallback(async () => {
        try {
            const undoneBarcode = await sessionService.undoLastScan(session.id);
            if (undoneBarcode) {
                setFeedback('undo');
                SoundFX.play('delete');
                
                // Actualizar rastreador local tras deshacer
                const scans = await db.scans.where('sessionId').equals(session.id).toArray();
                sessionCountsRef.current.clear();
                sessionSeenSkus.current.clear();
                
                scans.forEach(s => {
                    sessionSeenSkus.current.add(s.barcode);
                    const curr = sessionCountsRef.current.get(s.barcode) || 0;
                    sessionCountsRef.current.set(s.barcode, curr + s.quantity);
                });

                if (scans.length > 0) {
                    const last = scans.sort((a, b) => b.timestamp - a.timestamp)[0];
                    const prod = await db.products.get(last.barcode);
                    setActiveScan(last);
                    setActiveProduct(prod || null);
                    setAccumulatedQty(sessionCountsRef.current.get(last.barcode) || 0);
                } else {
                    setActiveScan(null);
                    setActiveProduct(null);
                    setAccumulatedQty(0);
                }

                setTimeout(() => setFeedback('idle'), 800);
            }
        } catch (e) {
            SoundFX.play('error');
        }
    }, [session.id]);

    // --- TECLADO ESCÁNER ---
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (status !== 'idle' && status !== 'manual') return;
            if ((e.target as HTMLElement).tagName === 'INPUT') return;
            const now = Date.now();
            if (now - lastKeyTime.current > 45) keyBuffer.current = '';
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
            optimisticActiveQty: accumulatedQty,
            optimisticTotalQty: sessionMetadata?.totalUnits || 0,
            optimisticUniqueSkus: sessionMetadata?.totalSKUs || 0
        },
        data: { 
            lastScan: activeScan || undefined, 
            activeProduct: activeProduct || undefined,
            recentScans 
        },
        actions: { 
            handleExternalScan: processScan,
            handleManualSubmit: (e: any) => { e.preventDefault(); if (manualInput) processScan(manualInput); setManualInput(''); },
            handleDeleteScan: async (e: any, id: string) => { 
                e.stopPropagation(); 
                const scan = await db.scans.get(id);
                if (!scan) return;
                
                await sessionService.deleteScan(id); 
                SoundFX.play('delete'); 
                
                // Recalcular conteo local
                const current = sessionCountsRef.current.get(scan.barcode) || 0;
                sessionCountsRef.current.set(scan.barcode, Math.max(0, current - scan.quantity));

                if (activeScan?.id === id) {
                    setAccumulatedQty(sessionCountsRef.current.get(scan.barcode) || 0);
                }
            },
            handleQuantityChange: async (id: string, current: number, delta: number) => { 
                const scan = await db.scans.get(id);
                if (!scan) return;
                const newQty = Math.max(0, current + delta);
                await sessionService.updateScanQuantity(id, newQty); 
                
                // Actualizar rastreador local
                const barcodeTotal = sessionCountsRef.current.get(scan.barcode) || 0;
                sessionCountsRef.current.set(scan.barcode, barcodeTotal + delta);

                if (activeScan?.id === id) {
                   setAccumulatedQty(prev => prev + delta);
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
