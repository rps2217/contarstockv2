
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
    const [pendingProductName, setPendingProductName] = useState('Nuevo Producto');
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [isIdle, setIsIdle] = useState(false);
    
    const keyBuffer = useRef('');
    const lastKeyTime = useRef(0);
    const hotProductCache = useRef<Map<string, Product>>(new Map());
    const scanHistory = useRef<string[]>([]);

    // Consultar todos los escaneos de la sesión actual para validación de SKU único
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
            name: cached?.name || pendingProductName || lastScan.barcode, 
            isUnknown: status === 'product_form' 
        };
    }, [lastScan, recentScans, status, pendingProductName]);

    const optimisticActiveQty = activeProductStats.totalQty;

    const completeScan = useCallback(async (code: string, mm?: number, yyyy?: number) => {
        try {
            const qtyToAdd = multiplier;
            // Buscar si ya existe una fecha para este producto en la sesión para heredarla si no se provee
            let finalMm = mm;
            let finalYyyy = yyyy;

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
            const masterProduct = hotProductCache.current.get(cleanCode) || await db.products.get(cleanCode);
            if (masterProduct) hotProductCache.current.set(cleanCode, masterProduct);

            // REQUERIMIENTO: Verificar si el SKU ya existe en esta sesión
            const alreadyInSession = recentScans?.some(s => s.barcode === cleanCode);

            if (!masterProduct) {
                setPendingScanCode(cleanCode);
                setPendingProductName("Producto Desconocido");
                setStatus('product_form');
            } else if (alreadyInSession) {
                // Ya existe en la sesión, registrar directamente (Expiry Only Once)
                completeScan(cleanCode);
            } else {
                // Es nuevo para esta sesión, pedir fecha
                setPendingScanCode(cleanCode);
                setPendingProductName(masterProduct.name);
                setStatus('expiring');
            }
        } catch (err) { 
            setFeedback('error'); 
        }
    }, [recentScans, completeScan]);

    // LISTENER GLOBAL ROBUSTO PARA SCANNER FÍSICO
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // No procesar si hay modales de sistema que no sean IDLE o MANUAL
            if (status !== 'idle' && status !== 'manual') return;
            
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' && status !== 'manual') return;

            const now = Date.now();
            const char = e.key;

            // Tiempo máximo entre caracteres de un escáner (50ms)
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
