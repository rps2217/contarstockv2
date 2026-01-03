
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie from 'dexie';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { sanitizeBarcode } from '../services/utils';
import { getSettings } from '../services/settings';
import { SoundFX } from '../services/audio';
import { CountingSession, Product, ScannerStatus } from '../types';

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
    const [pendingProductName, setPendingProductName] = useState('Nuevo Producto');
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [isIdle, setIsIdle] = useState(false);
    
    const keyBuffer = useRef('');
    const lastKeyTime = useRef(0);
    const hotProductCache = useRef<Map<string, Product>>(new Map());

    // Consultar todos los escaneos de la sesión actual
    const recentScans = useLiveQuery(
        () => db.scans.where('[sessionId+timestamp]').between([session.id, Dexie.minKey], [session.id, Dexie.maxKey]).reverse().toArray(), 
        [session.id]
    );

    const lastScan = useMemo(() => recentScans?.find(s => s.id === lastScanId) || recentScans?.[0], [recentScans, lastScanId]);

    const optimisticTotalQty = useMemo(() => 
        recentScans?.reduce((acc, s) => acc + s.quantity, 0) || 0, 
    [recentScans]);

    const optimisticUniqueSkus = useMemo(() => 
        new Set(recentScans?.map(s => s.barcode)).size, 
    [recentScans]);

    const activeProductStats = useMemo(() => {
        if (!lastScan) return { totalQty: 0, name: 'Esperando...', isUnknown: false };
        const qty = recentScans?.filter(s => s.barcode === lastScan.barcode)
                               .reduce((acc, s) => acc + s.quantity, 0) || 0;
        
        const cached = hotProductCache.current.get(lastScan.barcode);
        
        return { 
            totalQty: qty, 
            name: cached?.name || lastScan.barcode, 
            isUnknown: false // Ahora casi no habrá desconocidos por el auto-registro
        };
    }, [lastScan, recentScans]);

    const optimisticActiveQty = activeProductStats.totalQty;

    const completeScan = useCallback(async (code: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier;
            let finalMm = mm;
            let finalYyyy = yyyy;

            // Si no se provee fecha, buscar si ya hay una para este SKU en esta sesión
            if (mm === undefined && yyyy === undefined) {
                const prev = recentScans?.find(s => s.barcode === code && s.mm !== undefined);
                if (prev) {
                    finalMm = prev.mm;
                    finalYyyy = prev.yyyy;
                }
            }

            const newScan = await sessionService.addScan(session.id, code, qtyToAdd, finalMm, finalYyyy);
            
            setLastScanId(newScan.id);
            setFeedback('success');
            SoundFX.play(multiplier > 1 ? 'increment' : 'success');

            const settings = getSettings();
            if (settings.ttsEnabled) {
                const cachedProduct = hotProductCache.current.get(code) || await db.products.get(code);
                SoundFX.speak(cachedProduct?.name || "Registrado");
            }

            setMultiplier(1);
            setStatus('idle');
            setTimeout(() => setFeedback('idle'), 800);
        } catch (err: any) { 
            setFeedback('error'); 
            SoundFX.play('error'); 
            setStatus('idle');
        }
    }, [session.id, multiplier, recentScans]);

    const processScan = useCallback(async (code: string) => {
        const cleanCode = sanitizeBarcode(code);
        if (!cleanCode || cleanCode.length < 2) return;
        
        try {
            let masterProduct = hotProductCache.current.get(cleanCode) || await db.products.get(cleanCode);
            
            // REQUERIMIENTO: Auto-asignar PENDIENTE si es desconocido
            if (!masterProduct) {
                const newProd: Product = {
                    barcode: cleanCode,
                    name: 'PENDIENTE',
                    category: 'AUTO_REGISTRO',
                    syncStatus: 'add'
                };
                await productService.saveProduct(newProd);
                masterProduct = newProd;
                hotProductCache.current.set(cleanCode, newProd);
            } else {
                hotProductCache.current.set(cleanCode, masterProduct);
            }

            // REQUERIMIENTO: Verificar si el SKU ya existe en esta sesión para pedir fecha solo UNA VEZ
            const alreadyInSession = recentScans?.some(s => s.barcode === cleanCode);

            if (alreadyInSession) {
                // Ya tiene registro previo en esta sesión, incrementar directo (asume misma fecha)
                completeScan(cleanCode);
            } else {
                // Es el primer escaneo de este producto en la sesión, pedir fecha de vencimiento
                setPendingScanCode(cleanCode);
                setPendingProductName(masterProduct.name);
                setStatus('expiring');
            }
        } catch (err) { 
            setFeedback('error'); 
        }
    }, [recentScans, completeScan]);

    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (status !== 'idle' && status !== 'manual') return;
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && status !== 'manual') return;

            const now = Date.now();
            const char = e.key;

            if (now - lastKeyTime.current > 50) {
                keyBuffer.current = char.length === 1 ? char : '';
            } else {
                if (char.length === 1) keyBuffer.current += char;
            }
            lastKeyTime.current = now;

            if (char === 'Enter') {
                e.preventDefault();
                const codeToProcess = keyBuffer.current.trim();
                if (codeToProcess.length >= 2) {
                    processScan(codeToProcess);
                    keyBuffer.current = '';
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [status, processScan]);

    return {
        state: { 
            status, setStatus, feedback, setFeedback, manualInput, setManualInput, 
            multiplier, setMultiplier, isWindowFocused, isIdle, pendingScanCode, 
            pendingProductName,
            optimisticActiveQty, optimisticTotalQty, optimisticUniqueSkus
        },
        data: { lastScan, recentScans, activeProductStats },
        actions: { 
            handleExternalScan: processScan,
            handleManualSubmit: (e: any) => {
                e.preventDefault();
                if (manualInput.trim()) processScan(manualInput);
                setManualInput('');
            }, 
            handleDeleteScan: async (e: any, id: string) => {
                e.stopPropagation();
                await sessionService.deleteScan(id);
                SoundFX.play('delete');
            }, 
            handleQuantityChange: async (id: string, currentQty: number, delta: number) => {
                const newQty = Math.max(0, currentQty + delta);
                await sessionService.updateScanQuantity(id, newQty);
            },
            handleExpirationComplete: (mm?: number, yyyy?: number) => {
                if (pendingScanCode) completeScan(pendingScanCode, mm, yyyy);
            }, 
            handleToggleIncident: async (e: any, id: string, status: boolean) => {
                e.stopPropagation();
                await sessionService.updateScanIncident(id, !status);
            }, 
            handleDiscard: () => { if (confirm("¿Descartar sesión?")) onDiscardSession?.(); }
        }
    };
};
