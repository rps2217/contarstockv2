
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { sanitizeBarcode } from '../services/utils';
import { getSettings } from '../services/settings';
import { SoundFX } from '../services/audio';
import { CountingSession, Product, ScannerStatus } from '../types';
import { predictNextSkus } from '../services/predictiveService';

export const useScanner = (
    session: CountingSession, 
    onCloseSession: () => void, 
    onDiscardSession?: () => void
) => {
    const [status, setStatus] = useState<ScannerStatus>('idle');
    const [feedback, setFeedback] = useState<'idle' | 'success' | 'error' | 'undo'>('idle');
    const [lastScanId, setLastScanId] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState('');
    const [multiplier, setMultiplier] = useState(1);
    const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
    const [pendingProductName, setPendingProductName] = useState('PENDIENTE');
    
    const [predictions, setPredictions] = useState<{barcode: string, name: string}[]>([]);
    const lastBarcodesForAi = useRef<string[]>([]);

    const hotProductCache = useRef<Map<string, Product>>(new Map());
    const keyBuffer = useRef('');
    const lastKeyTime = useRef(0);

    const recentScans = useLiveQuery(
        () => db.scans.where('sessionId').equals(session.id).reverse().limit(15).toArray(), 
        [session.id]
    );

    const sessionMetadata = useLiveQuery(() => db.sessions.get(session.id), [session.id]);

    const lastScan = useMemo(() => {
        if (lastScanId) return recentScans?.find(s => s.id === lastScanId);
        return recentScans?.[0];
    }, [recentScans, lastScanId]);

    const activeProductStats = useLiveQuery(async () => {
        if (!lastScan) return { totalQty: 0, name: 'Listo', isUnknown: false };
        const scans = await db.scans.where('[sessionId+barcode]').equals([session.id, lastScan.barcode]).toArray();
        const qty = scans.reduce((acc, s) => acc + s.quantity, 0);
        const cached = hotProductCache.current.get(lastScan.barcode);
        return { totalQty: qty, name: cached?.name || lastScan.barcode, isUnknown: !cached };
    }, [lastScan, session.id]);

    const updatePredictions = useCallback(async (newBarcode: string) => {
        const settings = getSettings();
        if (!settings.predictiveHintsEnabled) return;

        lastBarcodesForAi.current = [newBarcode, ...lastBarcodesForAi.current].slice(0, 5);
        if (lastBarcodesForAi.current.length >= 3) {
            try {
                const predictedCodes = await predictNextSkus(lastBarcodesForAi.current);
                const fullPredicted: any[] = [];
                for (const code of predictedCodes) {
                    const p = await db.products.get(code);
                    if (p) fullPredicted.push({ barcode: p.barcode, name: p.name });
                }
                setPredictions(fullPredicted);
            } catch (e) {}
        }
    }, []);

    const completeScan = useCallback(async (code: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier;
            let finalMm = mm, finalYyyy = yyyy;
            
            if (mm === undefined && yyyy === undefined) {
                const prev = await db.scans.where('[sessionId+barcode]').equals([session.id, code]).filter(s => s.mm !== undefined).first();
                if (prev) { finalMm = prev.mm; finalYyyy = prev.yyyy; }
            }

            const newScan = await sessionService.addScan(session.id, code, qtyToAdd, finalMm, finalYyyy);
            setLastScanId(newScan.id);
            setFeedback('success');
            SoundFX.play(qtyToAdd > 1 ? 'increment' : 'success');

            const settings = getSettings();
            if (settings.ttsEnabled) {
                const cachedProd = hotProductCache.current.get(code) || await db.products.get(code);
                SoundFX.speak(settings.ttsMode === 'product' ? (cachedProd?.name || "Ok") : `${qtyToAdd}`);
            }

            updatePredictions(code);
            setMultiplier(1);
            setStatus('idle');
            setTimeout(() => setFeedback('idle'), 400); 
        } catch (err: any) { 
            setFeedback('error'); 
            SoundFX.play('error'); 
        }
    }, [session.id, multiplier, updatePredictions]);

    const processScan = useCallback(async (code: string) => {
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode || cleanCode.length < 2) return;
        
        try {
            let masterProduct = hotProductCache.current.get(cleanCode);
            if (!masterProduct) {
                masterProduct = await db.products.get(cleanCode);
                if (masterProduct) hotProductCache.current.set(cleanCode, masterProduct);
            }
            
            if (!masterProduct) {
                const settings = getSettings();
                if (settings.autoRegisterUnknown) {
                    const newProd: Product = { barcode: cleanCode, name: 'AUTOREGISTRADO', category: 'AUTO', syncStatus: 'add' };
                    await productService.saveProduct(newProd);
                    masterProduct = newProd;
                    hotProductCache.current.set(cleanCode, newProd);
                } else {
                    setPendingScanCode(cleanCode);
                    setPendingProductName('DESCONOCIDO');
                    setStatus('product_form');
                    return;
                }
            }

            const settings = getSettings();
            const existsWithDate = await db.scans.where('[sessionId+barcode]').equals([session.id, cleanCode]).filter(s => s.mm !== undefined).first();
            
            if (existsWithDate && settings.continuousMode) {
                completeScan(cleanCode);
            } else if (!existsWithDate) {
                setPendingScanCode(cleanCode);
                setPendingProductName(masterProduct.name);
                setStatus('expiring');
            } else {
                completeScan(cleanCode);
            }
        } catch (err) { setFeedback('error'); }
    }, [session.id, completeScan]);

    const handleUndo = useCallback(async () => {
        try {
            const undoneBarcode = await sessionService.undoLastScan(session.id);
            if (undoneBarcode) {
                setFeedback('undo');
                SoundFX.play('delete');
                if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
                setTimeout(() => setFeedback('idle'), 800);
            }
        } catch (e) {
            SoundFX.play('error');
        }
    }, [session.id]);

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
            
            // Atajo de teclado para deshacer (Ctrl+Z o similar podría ser invasivo, usemos una tecla específica o chequeo)
            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [status, processScan, handleUndo]);

    return {
        state: { 
            status, setStatus, feedback, manualInput, setManualInput, multiplier, setMultiplier,
            pendingScanCode, pendingProductName, predictions,
            optimisticActiveQty: activeProductStats?.totalQty || 0,
            optimisticTotalQty: sessionMetadata?.totalUnits || 0,
            optimisticUniqueSkus: sessionMetadata?.totalSKUs || 0
        },
        data: { lastScan, recentScans, activeProductStats },
        actions: { 
            handleExternalScan: processScan,
            handleManualSubmit: (e: any) => { e.preventDefault(); if (manualInput) processScan(manualInput); setManualInput(''); },
            handleDeleteScan: async (e: any, id: string) => { e.stopPropagation(); await sessionService.deleteScan(id); SoundFX.play('delete'); },
            handleQuantityChange: async (id: string, current: number, delta: number) => { await sessionService.updateScanQuantity(id, Math.max(0, current + delta)); },
            handleExpirationComplete: (mm?: number, yyyy?: number) => { if (pendingScanCode) completeScan(pendingScanCode, mm, yyyy); },
            handleToggleIncident: async (e: any, id: string, s: boolean) => { e.stopPropagation(); await sessionService.updateScanIncident(id, !s); },
            handleDiscard: () => { if (confirm("¿Borrar sesión física?")) onDiscardSession?.(); },
            handleUndo
        }
    };
};
