
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie from 'dexie';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { sanitizeBarcode } from '../services/utils';
import { getSettings } from '../services/settings';
import { SoundFX } from '../services/audio';
import { CountingSession, Product } from '../types';

export const useScanner = (
    session: CountingSession, 
    onCloseSession: () => void, 
    onDiscardSession?: () => void
) => {
    const [manualInput, setManualInput] = useState('');
    const [lastScanId, setLastScanId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'idle' | 'success' | 'error' | 'undo'>('idle');
    const [manualMode, setManualMode] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [multiplier, setMultiplier] = useState(1);
    const [isMultiplierOpen, setIsMultiplierOpen] = useState(false);
    const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
    const [pendingProductName, setPendingProductName] = useState('Nuevo Producto');
    const [showExpirationModal, setShowExpirationModal] = useState(false);
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [isIdle, setIsIdle] = useState(false);
    const idleTimerRef = useRef<any>(null);

    // Valores optimistas para UI ultra-rápida
    const [optimisticActiveQty, setOptimisticActiveQty] = useState(0);
    const [optimisticTotalQty, setOptimisticTotalQty] = useState(0);
    const [optimisticUniqueSkus, setOptimisticUniqueSkus] = useState(0);

    const stateRef = useRef({ showConfirmModal, showExpirationModal, manualMode, isMultiplierOpen, isCameraOpen });
    const scannerBuffer = useRef<string>('');
    const lastKeyTime = useRef<number>(0);
    const lastProcessedScan = useRef<{ code: string, time: number }>({ code: '', time: 0 });

    useEffect(() => {
        stateRef.current = { showConfirmModal, showExpirationModal, manualMode, isMultiplierOpen, isCameraOpen };
    }, [showConfirmModal, showExpirationModal, manualMode, isMultiplierOpen, isCameraOpen]);

    const resetIdleTimer = useCallback(() => {
        setIsIdle(false);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = setTimeout(() => setIsIdle(true), 300000);
    }, []);

    useEffect(() => {
        const handleFocus = () => { setIsWindowFocused(true); resetIdleTimer(); };
        const handleBlur = () => setIsWindowFocused(false);
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, [resetIdleTimer]);

    const recentScans = useLiveQuery(
        () => db.scans.where('[sessionId+timestamp]').between([session.id, Dexie.minKey], [session.id, Dexie.maxKey]).reverse().limit(20).toArray(), 
        [session.id]
    );

    const lastScan = useMemo(() => recentScans?.find(s => s.id === lastScanId) || recentScans?.[0], [recentScans, lastScanId]);

    const activeProductStats = useLiveQuery(async () => {
        if (!lastScan) return { totalQty: 0, name: '', isUnknown: false };
        const scansOfProduct = await db.scans.where('[sessionId+barcode]').equals([session.id, lastScan.barcode]).toArray();
        const totalQty = scansOfProduct.reduce((acc, s) => acc + s.quantity, 0);
        const product = await db.products.get(lastScan.barcode);
        return { totalQty, name: product?.name || 'Producto Desconocido', isUnknown: !product };
    }, [lastScan], { totalQty: 0, name: '', isUnknown: false });

    useEffect(() => {
        if (activeProductStats) setOptimisticActiveQty(activeProductStats.totalQty);
    }, [activeProductStats.totalQty, lastScan?.barcode]);

    const sessionStats = useLiveQuery(async () => {
        const currentSession = await db.sessions.get(session.id);
        return { totalQty: currentSession?.totalUnits || 0, uniqueSkus: currentSession?.totalSKUs || 0 };
    }, [session.id], { totalQty: 0, uniqueSkus: 0 });

    useEffect(() => {
        if (sessionStats) { 
            setOptimisticTotalQty(sessionStats.totalQty); 
            setOptimisticUniqueSkus(sessionStats.uniqueSkus); 
        }
    }, [sessionStats.totalQty, sessionStats.uniqueSkus]);

    const completeScan = useCallback(async (code: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier > 0 ? multiplier : 1;
            setOptimisticActiveQty(prev => prev + qtyToAdd);
            setOptimisticTotalQty(prev => prev + qtyToAdd);
            
            const newScan = await sessionService.addScan(session.id, code, qtyToAdd, mm, yyyy);
            setLastScanId(newScan.id);
            setFeedback('success');
            SoundFX.play('success');

            const settings = getSettings();
            if (settings.ttsEnabled) {
                const cachedProduct = await db.products.get(code);
                SoundFX.speak(cachedProduct?.name || "Producto");
            }
            if (multiplier !== 1) setMultiplier(1);
            resetIdleTimer();
            setTimeout(() => setFeedback('idle'), 500);
        } catch (err) { setFeedback('error'); SoundFX.play('error'); }
    }, [session.id, multiplier, resetIdleTimer]);

    const processScan = useCallback(async (code: string) => {
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode) return;
        
        const now = Date.now();
        if (cleanCode === lastProcessedScan.current.code && (now - lastProcessedScan.current.time < 250)) return;
        lastProcessedScan.current = { code: cleanCode, time: now };
        
        try {
            const existingScan = await db.scans.where('[sessionId+barcode]').equals([session.id, cleanCode]).first();
            if (existingScan) { 
                await completeScan(cleanCode, existingScan.mm, existingScan.yyyy); 
                return; 
            } 
            
            const masterProduct = await db.products.get(cleanCode);
            setPendingProductName(masterProduct?.name || 'Nuevo Producto');
            setPendingScanCode(cleanCode);
            setShowExpirationModal(true);
        } catch (err) { setFeedback('error'); }
    }, [session.id, completeScan]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (stateRef.current.showConfirmModal || stateRef.current.showExpirationModal || stateRef.current.isMultiplierOpen || stateRef.current.manualMode || stateRef.current.isCameraOpen) return;
            
            const now = Date.now();
            if (now - lastKeyTime.current > 50) scannerBuffer.current = ''; 
            lastKeyTime.current = now;
            
            if (e.key === 'Enter') {
                if (scannerBuffer.current.length > 1) processScan(scannerBuffer.current);
                scannerBuffer.current = '';
                e.preventDefault(); 
            } else if (e.key.length === 1) { 
                scannerBuffer.current += e.key; 
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [processScan]); 

    return {
        state: {
            feedback, manualMode, setManualMode, manualInput, setManualInput, showConfirmModal, setShowConfirmModal, showExpirationModal, isMultiplierOpen, setIsMultiplierOpen, multiplier, setMultiplier, isCameraOpen, setIsCameraOpen, lastScanId, isWindowFocused, isIdle, optimisticActiveQty, optimisticTotalQty, optimisticUniqueSkus, pendingProductName
        },
        data: { sessionStats, activeProductStats, lastScan, recentScans, expectedForActive: null },
        actions: { 
            handleManualSubmit: (e: any) => {
                e.preventDefault();
                processScan(manualInput);
                setManualMode(false);
                setManualInput('');
            }, 
            handleDeleteScan: async (e: any, id: string) => {
                e.stopPropagation();
                await sessionService.deleteScan(id);
                SoundFX.play('delete');
            }, 
            handleUndoLastScan: async () => {
                if (lastScanId) {
                    await sessionService.deleteScan(lastScanId);
                    setLastScanId(null);
                    setFeedback('undo');
                    setTimeout(() => setFeedback('idle'), 1000);
                }
            }, 
            handleQuantityChange: async (id: string, current: number, delta: number) => {
                const newVal = current + delta;
                if (newVal > 0) await sessionService.updateScanQuantity(id, newVal);
            }, 
            handleRegisterPending: () => {}, 
            handleDiscard: () => { if (confirm("¿Descartar?")) onDiscardSession?.(); }, 
            handleExpirationComplete: (mm?: number, yyyy?: number) => {
                if (pendingScanCode) completeScan(pendingScanCode, mm, yyyy);
                setShowExpirationModal(false);
                setPendingScanCode(null);
            }, 
            handleToggleIncident: async (e: any, id: string, status: boolean) => {
                e.stopPropagation();
                await sessionService.updateScanIncident(id, !status);
            }, 
            getProductName: (code: string) => 'Producto', 
            handleExternalScan: (code: string) => processScan(code) 
        }
    };
};
