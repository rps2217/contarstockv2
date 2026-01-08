
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

    // --- EL CORAZÓN DE LA SOLUCIÓN: ESTADO ACTIVO LOCAL ---
    // Este estado es síncrono y manda sobre la UI Hero
    const [activeScan, setActiveScan] = useState<ScanRecord | null>(null);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [accumulatedQty, setAccumulatedQty] = useState(0);

    // --- PANTALLA DE PRODUCTO NUEVO ---
    const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
    const [pendingProductName, setPendingProductName] = useState('PENDIENTE');

    // --- REFERENCIAS DE RENDIMIENTO ---
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

    // --- INICIALIZACIÓN DETERMINISTA ---
    useEffect(() => {
        const initCache = async () => {
            const scans = await db.scans.where('sessionId').equals(session.id).toArray();
            scans.forEach(s => sessionSeenSkus.current.add(s.barcode));
            
            // Recuperar el registro más reciente real para el Hero
            if (scans.length > 0) {
                const last = scans.sort((a, b) => b.timestamp - a.timestamp)[0];
                const prod = await db.products.get(last.barcode);
                const total = scans.filter(s => s.barcode === last.barcode).reduce((acc, curr) => acc + curr.quantity, 0);
                
                setActiveScan(last);
                setActiveProduct(prod || null);
                setAccumulatedQty(total);
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

    // --- ACCIÓN CORE: REGISTRO FINAL ---
    const completeScan = useCallback(async (code: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier;
            let finalMm = mm, finalYyyy = yyyy;
            
            // Herencia de fecha automática
            if (finalMm === undefined) {
                const prev = await db.scans.where('[sessionId+barcode]').equals([session.id, code]).first();
                if (prev) { finalMm = prev.mm; finalYyyy = prev.yyyy; }
            }

            // Guardar en DB
            const newScan = await sessionService.addScan(session.id, code, qtyToAdd, finalMm, finalYyyy);
            sessionSeenSkus.current.add(code);

            // ACTUALIZACIÓN SÍNCRONA DE ESTADO ACTIVO
            const prod = await db.products.get(code);
            const allScansOfThisProduct = await db.scans.where('[sessionId+barcode]').equals([session.id, code]).toArray();
            const totalUpdated = allScansOfThisProduct.reduce((a, b) => a + b.quantity, 0) + (newScan.synced === 0 ? 0 : 0); 
            // Nota: recalculamos total desde la DB para máxima precisión
            
            setActiveScan(newScan);
            setActiveProduct(prod || null);
            setAccumulatedQty(allScansOfThisProduct.reduce((a, b) => a + b.quantity, 0) || qtyToAdd);

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
            setFeedback('error'); 
            SoundFX.play('error'); 
        } finally {
            isProcessingRef.current = false;
        }
    }, [session.id, multiplier, updatePredictions]);

    // --- ACCIÓN CORE: PROCESAMIENTO DETERMINISTA ---
    const processScan = useCallback(async (code: string) => {
        if (isProcessingRef.current) return;
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode || cleanCode.length < 2) return;
        
        isProcessingRef.current = true;
        
        try {
            let prod = await db.products.get(cleanCode);
            const settings = getSettings();

            // REGISTRO AUTOMÁTICO 'PENDIENTE'
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

            // Determinación de Flujo: ¿Es la primera vez en este bulto?
            const isNewInSession = !sessionSeenSkus.current.has(cleanCode);
            
            if (isNewInSession) {
                setPendingScanCode(cleanCode);
                setStatus('expiring');
                // Bloqueo se mantiene hasta que se complete o cancele la fecha
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
                
                // Re-sincronizar el Hero tras borrar
                const scans = await db.scans.where('sessionId').equals(session.id).toArray();
                if (scans.length > 0) {
                    const last = scans.sort((a, b) => b.timestamp - a.timestamp)[0];
                    const prod = await db.products.get(last.barcode);
                    const total = scans.filter(s => s.barcode === last.barcode).reduce((acc, curr) => acc + curr.quantity, 0);
                    setActiveScan(last);
                    setActiveProduct(prod || null);
                    setAccumulatedQty(total);
                } else {
                    setActiveScan(null);
                    setActiveProduct(null);
                    setAccumulatedQty(0);
                    sessionSeenSkus.current.clear();
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
                await sessionService.deleteScan(id); 
                SoundFX.play('delete'); 
                // Actualizar Hero si eliminamos el actual
                if (activeScan?.id === id) {
                    const scans = await db.scans.where('sessionId').equals(session.id).toArray();
                    if (scans.length > 0) {
                        const last = scans.sort((a, b) => b.timestamp - a.timestamp)[0];
                        const prod = await db.products.get(last.barcode);
                        setActiveScan(last);
                        setActiveProduct(prod || null);
                        setAccumulatedQty(scans.filter(s => s.barcode === last.barcode).reduce((a, b) => a + b.quantity, 0));
                    } else {
                        setActiveScan(null);
                        setActiveProduct(null);
                        setAccumulatedQty(0);
                    }
                }
            },
            handleQuantityChange: async (id: string, current: number, delta: number) => { 
                const newQty = Math.max(0, current + delta);
                await sessionService.updateScanQuantity(id, newQty); 
                // Si el item modificado es el que está en el Hero, actualizar Hero
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
