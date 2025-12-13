
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie from 'dexie';
import { db } from '../db';
import * as storage from '../services/storage';
import * as sessionService from '../services/sessionService'; // Direct Import
import * as productService from '../services/productService';
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
    
    // NEW: Camera Mode
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    // NEW: Multiplier Mode
    const [multiplier, setMultiplier] = useState(1);
    const [isMultiplierOpen, setIsMultiplierOpen] = useState(false);

    // Expiration State
    const [pendingScanCode, setPendingScanCode] = useState<string | null>(null);
    const [showExpirationModal, setShowExpirationModal] = useState(false);

    // --- REFS FOR EVENT LISTENER STABILITY ---
    const stateRef = useRef({
        showConfirmModal,
        showExpirationModal,
        manualMode,
        isMultiplierOpen,
        isCameraOpen
    });

    // --- STREAK COUNTER LOGIC ---
    const streakRef = useRef({ barcode: '', count: 0 });

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

    // Refs for buffer
    const scannerBuffer = useRef<string>('');
    const lastKeyTime = useRef<number>(0);
    const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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


    // --- ACTIONS & LOGIC ---

    const triggerFeedback = useCallback((type: 'success' | 'error' | 'undo') => {
        setFeedback(type);
        SoundFX.play(type === 'undo' ? 'delete' : type);
        if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setFeedback('idle'), type === 'undo' ? 1000 : 500);
    }, []);

    const completeScan = async (code: string, mm?: number, yyyy?: number) => {
        try {
            // Apply multiplier
            const qtyToAdd = multiplier > 0 ? multiplier : 1;
            
            // DB Save
            const newScan = await sessionService.addScan(session.id, code, qtyToAdd, mm, yyyy);
            setLastScanId(newScan.id);
            triggerFeedback('success');

            // --- TTS LOGIC (Improved Streak Counter) ---
            const settings = storage.getSettings();
            if (settings.ttsEnabled) {
                // Determine Mode
                if (settings.ttsMode === 'count') {
                    // STREAK MODE
                    if (code === streakRef.current.barcode) {
                        streakRef.current.count += qtyToAdd;
                    } else {
                        // New product, reset streak
                        streakRef.current.barcode = code;
                        streakRef.current.count = qtyToAdd; // Start at 1 (or multiplier value)
                    }
                    SoundFX.speak(streakRef.current.count.toString());
                } else {
                    // PRODUCT NAME MODE
                    // We need the name asynchronously, so we do a quick fetch
                    // Optimistic lookup from existing map if possible
                    let nameToSpeak = "Producto";
                    const cachedProduct = await db.products.get(code);
                    
                    if (cachedProduct) nameToSpeak = cachedProduct.name;
                    else nameToSpeak = "Producto Desconocido";

                    SoundFX.speak(nameToSpeak);
                }
            } else {
                // If TTS Disabled, reset streak silently so next time voice is enabled it starts fresh
                // or just keep it sync'd logic.
                // It's safer to track streaks anyway in case they toggle it mid-session (unlikely but possible)
                if (code !== streakRef.current.barcode) {
                    streakRef.current.barcode = code;
                    streakRef.current.count = 0; 
                }
                streakRef.current.count += qtyToAdd;
            }
            
            // Reset multiplier after successful scan for safety
            if (multiplier !== 1) setMultiplier(1);

        } catch (err) {
            triggerFeedback('error');
        }
    };

    const processScan = async (code: string) => {
        const cleanCode = storage.sanitizeBarcode(code);
        if (!cleanCode) { triggerFeedback('error'); return; }
    
        try {
            const existingScan = await db.scans.where('[sessionId+barcode]').equals([session.id, cleanCode]).first();
            if (existingScan) {
                await completeScan(cleanCode, existingScan.mm, existingScan.yyyy);
            } else {
                setPendingScanCode(cleanCode);
                setShowExpirationModal(true);
                SoundFX.play('success');
            }
        } catch (err) {
            triggerFeedback('error');
        }
    };

    // --- GLOBAL LISTENER ---
    
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore typing in input fields
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return; 
            
            // CHECK REFS INSTEAD OF DIRECT STATE DEPENDENCIES
            const s = stateRef.current;
            if (s.showConfirmModal || s.showExpirationModal || s.isMultiplierOpen || s.manualMode || s.isCameraOpen) return;

            const now = Date.now();
            const timeDiff = now - lastKeyTime.current;
            lastKeyTime.current = now;

            if (timeDiff > 50) {
                scannerBuffer.current = ''; 
            }

            if (e.key === 'Enter') {
                const code = scannerBuffer.current;
                if (code.length > 1) { 
                    processScan(code);
                }
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
        const cleanCode = storage.sanitizeBarcode(manualInput);
        if (cleanCode) processScan(cleanCode); else triggerFeedback('error');
        setManualInput(''); 
        setManualMode(false);
    };

    const handleDeleteScan = useCallback(async (e: React.MouseEvent, scanId: string) => {
        e.preventDefault(); e.stopPropagation();
        const settings = storage.getSettings();
        if (!settings.confirmDelete || window.confirm('¿Confirmar eliminación del registro?')) {
            // Decrement streak if this was the last item, logic complex so mostly we leave it
            // because physical count usually moves forward. 
            await sessionService.deleteScan(scanId);
            SoundFX.play('delete');
        }
    }, []);

    // NEW: Undo Logic
    const handleUndoLastScan = useCallback(async () => {
        if (!lastScanId) return;
        try {
            await sessionService.deleteScan(lastScanId);
            setLastScanId(null);
            
            // Adjust streak if undoing the immediate last one
            if (streakRef.current.count > 0) {
                streakRef.current.count--;
            }

            triggerFeedback('undo');
        } catch (e) {
            console.error("Undo failed", e);
        }
    }, [lastScanId, triggerFeedback]);

    const handleQuantityChange = useCallback(async (scanId: string, currentQty: number, delta: number) => {
        if (currentQty + delta <= 0) {
            const settings = storage.getSettings();
            if (!settings.confirmDelete || window.confirm('¿Eliminar registro?')) {
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
        if (window.confirm("¿DESCARTAR conteo? Se perderán todos los datos.")) {
            if (onDiscardSession) onDiscardSession(); else onCloseSession();
        }
    };

    const handleRegisterPending = async () => {
        if (lastScan && activeProductStats.isUnknown) {
            const pendingName = `PENDIENTE-${lastScan.barcode}`;
            await productService.saveProduct({
                barcode: lastScan.barcode,
                name: pendingName,
                category: 'PENDIENTE',
                supplier: '',
                supplierRut: ''
            });
            SoundFX.play('success');
        }
    };

    const getProductName = (code: string) => productsMap?.[code]?.name || 'Producto Desconocido';

    const handleExternalScan = (code: string) => {
        processScan(code);
    };

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
            lastScanId 
        },
        data: { sessionStats, activeProductStats, lastScan, recentScans },
        actions: {
            handleManualSubmit,
            handleDeleteScan,
            handleUndoLastScan,
            handleQuantityChange,
            handleRegisterPending,
            handleDiscard,
            handleExpirationComplete,
            handleToggleIncident,
            getProductName,
            handleExternalScan 
        }
    };
};
