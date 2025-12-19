
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    // --- STATE ---
    const [manualInput, setManualInput] = useState('');
    const [lastScanId, setLastScanId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<'idle' | 'success' | 'error' | 'undo'>('idle');
    const [manualMode, setManualMode] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [multiplier, setMultiplier] = useState(1);
    const [isMultiplierOpen, setIsMultiplierOpen] = useState(false);

    const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
    const [showExpirationModal, setShowExpirationModal] = useState(false);

    // SECURITY: Privacy / Focus States
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [isIdle, setIsIdle] = useState(false);
    const idleTimerRef = useRef<any>(null);

    // --- REFS ---
    const stateRef = useRef({
        showConfirmModal,
        showExpirationModal,
        manualMode,
        isMultiplierOpen,
        isCameraOpen
    });

    const streakRef = useRef({ barcode: '', count: 0 });
    const scannerBuffer = useRef<string>('');
    const lastKeyTime = useRef<number>(0);
    const lastProcessedScan = useRef<{ code: string, time: number }>({ code: '', time: 0 });
    
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Update ref whenever state changes
    useEffect(() => {
        stateRef.current = {
            showConfirmModal,
            showExpirationModal,
            manualMode,
            isMultiplierOpen,
            isCameraOpen
        };
    }, [showConfirmModal, showExpirationModal, manualMode, isMultiplierOpen, isCameraOpen]);

    // --- SECURITY SENTINEL (Privacy Guard) ---
    const resetIdleTimer = useCallback(() => {
        setIsIdle(false);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        // 5 Minutos de inactividad para difuminar datos sensibles
        idleTimerRef.current = setTimeout(() => setIsIdle(true), 300000);
    }, []);

    useEffect(() => {
        const handleFocus = () => { setIsWindowFocused(true); resetIdleTimer(); };
        const handleBlur = () => { setIsWindowFocused(false); };
        const handleActivity = () => resetIdleTimer();

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('mousedown', handleActivity);
        window.addEventListener('keydown', handleActivity);
        
        setIsWindowFocused(document.hasFocus());
        resetIdleTimer();

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('mousedown', handleActivity);
            window.removeEventListener('keydown', handleActivity);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [resetIdleTimer]);

    // --- DATA QUERIES ---
    const recentScans = useLiveQuery(
        () => db.scans
            .where('[sessionId+timestamp]')
            .between([session.id, Dexie.minKey], [session.id, Dexie.maxKey])
            .reverse()
            .limit(20)
            .toArray(), 
        [session.id]
    );

    const lastScan = useMemo(() => 
        recentScans?.find(s => s.id === lastScanId) || recentScans?.[0], 
    [recentScans, lastScanId]);

    const activeProductStats = useLiveQuery(async () => {
        if (!lastScan) return { totalQty: 0, name: '', isUnknown: false };
        const scansOfProduct = await db.scans.where('[sessionId+barcode]').equals([session.id, lastScan.barcode]).toArray();
        const totalQty = scansOfProduct.reduce((acc, s) => acc + s.quantity, 0);
        const product = await db.products.get(lastScan.barcode);
        return { totalQty, name: product?.name || 'Producto Desconocido', isUnknown: !product };
    }, [lastScan], { totalQty: 0, name: '', isUnknown: false });

    const sessionStats = useLiveQuery(async () => {
        const currentSession = await db.sessions.get(session.id);
        return { totalQty: currentSession?.totalUnits || 0, uniqueSkus: currentSession?.totalSKUs || 0 };
    }, [session.id], { totalQty: 0, uniqueSkus: 0 });

    const visibleBarcodes = useMemo(() => recentScans ? Array.from(new Set(recentScans.map(s => s.barcode))) : [], [recentScans]);
    
    const productsMap = useLiveQuery(async () => {
        if (visibleBarcodes.length === 0) return {};
        const products = await db.products.where('barcode').anyOf(visibleBarcodes).toArray();
        return products.reduce((acc, p) => { acc[p.barcode] = p; return acc; }, {} as Record<string, Product>);
    }, [visibleBarcodes], {});

    const pendingProductName = useLiveQuery(async () => {
        if (!pendingScanCode) return '';
        const p = await db.products.get(pendingScanCode);
        return p?.name || 'Producto Nuevo / Desconocido';
    }, [pendingScanCode], '');


    // --- SCAN LOGIC ---

    const triggerFeedback = useCallback((type: 'success' | 'error' | 'undo') => {
        setFeedback(type);
        if (type === 'undo') SoundFX.play('delete');
        if (type === 'error') SoundFX.play('error');

        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setFeedback('idle'), type === 'undo' ? 1000 : 500);
    }, []);

    const completeScan = async (code: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier > 0 ? multiplier : 1;
            
            if (code === streakRef.current.barcode) {
                SoundFX.play('increment');
            } else {
                SoundFX.play('success');
            }

            const newScan = await sessionService.addScan(session.id, code, qtyToAdd, mm, yyyy);
            setLastScanId(newScan.id);
            setFeedback('success');
            if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
            feedbackTimer.current = setTimeout(() => setFeedback('idle'), 500);

            const settings = getSettings();
            if (settings.ttsEnabled) {
                if (settings.ttsMode === 'count') {
                    if (code === streakRef.current.barcode) {
                        streakRef.current.count += qtyToAdd;
                    } else {
                        streakRef.current.barcode = code;
                        streakRef.current.count = qtyToAdd;
                    }
                    SoundFX.speak(streakRef.current.count.toString());
                } else {
                    let nameToSpeak = "Producto";
                    const cachedProduct = await db.products.get(code);
                    if (cachedProduct) nameToSpeak = cachedProduct.name;
                    SoundFX.speak(nameToSpeak);
                }
            }
            
            if (multiplier !== 1) setMultiplier(1);
            resetIdleTimer();

        } catch (err) {
            triggerFeedback('error');
        }
    };

    const processScan = async (code: string) => {
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode) { triggerFeedback('error'); return; }
        
        const now = Date.now();
        if (cleanCode === lastProcessedScan.current.code && (now - lastProcessedScan.current.time < 150)) {
            return;
        }
        lastProcessedScan.current = { code: cleanCode, time: now };

        const settings = getSettings();

        try {
            const existingScan = await db.scans
                .where('[sessionId+barcode]')
                .equals([session.id, cleanCode])
                .reverse()
                .sortBy('timestamp')
                .then(results => results[0]);

            if (existingScan) {
                await completeScan(cleanCode, existingScan.mm, existingScan.yyyy);
                return;
            } 
            
            const productExists = await db.products.get(cleanCode);
            if (!productExists && settings.autoRegisterUnknown) {
                await productService.saveProduct({
                    barcode: cleanCode,
                    name: `PENDIENTE-${cleanCode}`,
                    category: 'PENDIENTE',
                    supplier: '',
                    supplierRut: ''
                });
            }

            setPendingScanCode(cleanCode);
            setShowExpirationModal(true);
            SoundFX.play('success');

        } catch (err) {
            triggerFeedback('error');
        }
    };

    // --- GLOBAL LISTENER ---
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (!document.hasFocus()) return;

            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return; 
            
            const s = stateRef.current;
            if (s.showConfirmModal || s.showExpirationModal || s.isMultiplierOpen || s.manualMode || s.isCameraOpen) return;

            const now = Date.now();
            if (now - lastKeyTime.current > 50) scannerBuffer.current = ''; 
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                const code = scannerBuffer.current;
                if (code.length > 1) processScan(code);
                scannerBuffer.current = '';
                e.preventDefault(); 
            } else if (e.key.length === 1) {
                scannerBuffer.current += e.key;
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, []); 

    // --- HANDLERS ---

    const handleExpirationComplete = async (mm?: number, yyyy?: number) => {
        if (pendingScanCode) await completeScan(pendingScanCode, mm, yyyy);
        setPendingScanCode(null);
        setShowExpirationModal(false);
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = sanitizeBarcode(manualInput);
        if (cleanCode) processScan(cleanCode); else triggerFeedback('error');
        setManualInput(''); 
        setManualMode(false);
    };

    const handleDeleteScan = useCallback(async (e: React.MouseEvent, scanId: string) => {
        e.preventDefault(); e.stopPropagation();
        const settings = getSettings();
        if (!settings.confirmDelete || window.confirm('¿Confirmar eliminación?')) {
            await sessionService.deleteScan(scanId);
            SoundFX.play('delete');
        }
    }, []);

    const handleUndoLastScan = useCallback(async () => {
        if (!lastScanId) return;
        try {
            await sessionService.deleteScan(lastScanId);
            setLastScanId(null);
            triggerFeedback('undo');
        } catch (e) {
            console.error("Undo failed", e);
        }
    }, [lastScanId, triggerFeedback]);

    const handleQuantityChange = useCallback(async (scanId: string, currentQty: number, delta: number) => {
        if (currentQty + delta <= 0) {
            const settings = getSettings();
            if (!settings.confirmDelete || window.confirm('¿Eliminar?')) {
                await sessionService.deleteScan(scanId); SoundFX.play('delete');
            }
        } else {
            await sessionService.updateScanQuantity(scanId, currentQty + delta);
        }
    }, []);

    const handleToggleIncident = useCallback(async (e: React.MouseEvent, scanId: string, currentStatus: boolean) => {
        e.stopPropagation();
        await sessionService.updateScanIncident(scanId, !currentStatus);
        SoundFX.play('success'); 
    }, []);

    const handleDiscard = () => {
        if (window.confirm("¿DESCARTAR conteo?")) {
            if (onDiscardSession) onDiscardSession(); else onCloseSession();
        }
    };

    const getProductName = (code: string) => productsMap?.[code]?.name || 'Producto Desconocido';

    const handleExternalScan = (code: string) => processScan(code);

    return {
        state: {
            feedback,
            manualMode, setManualMode,
            manualInput, setManualInput,
            showConfirmModal, setShowConfirmModal,
            showExpirationModal,
            isMultiplierOpen, setIsMultiplierOpen,
            multiplier, setMultiplier,
            isCameraOpen, setIsCameraOpen, 
            pendingProductName,
            lastScanId,
            isWindowFocused,
            isIdle // Pass idle state to UI
        },
        data: { sessionStats, activeProductStats, lastScan, recentScans },
        actions: {
            handleManualSubmit,
            handleDeleteScan,
            handleUndoLastScan,
            handleQuantityChange,
            handleRegisterPending: async () => {}, 
            handleDiscard,
            handleExpirationComplete,
            handleToggleIncident,
            getProductName,
            handleExternalScan 
        }
    };
};
