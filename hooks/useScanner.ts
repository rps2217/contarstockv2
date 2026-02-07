
import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService'; 
import * as productService from '../services/productService';
import { sanitizeBarcode, normalizeSku } from '../services/utils';
import { SoundFX } from '../services/audio';
import { getSettings } from '../services/settings';
import { CountingSession, ScannerStatus, ConsolidatedItem, Product } from '../types';
import { useFeedbackSystem } from './useFeedbackSystem';
import { aggregateScans } from '../services/aggregator';
import { shouldPromptForBatch } from '../services/uiLogic';
import { scannerReducer } from '../services/scannerMachine';

export const useScanner = (session: CountingSession, onFinish: () => void) => {
    const settings = useMemo(() => getSettings(), []);
    const { feedback, trigger } = useFeedbackSystem(200);
    const [machineState, dispatch] = useReducer(scannerReducer, 'IDLE');
    
    // Persistencia básica de sesión de trabajo en memoria de componente
    const [multiplier, setMultiplier] = useState(1);
    const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('last_loc') || 'BODEGA_GRAL'); 
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);

    const itemsRef = useRef<ConsolidatedItem[]>([]);
    
    // Guardar ubicación favorita
    useEffect(() => { localStorage.setItem('last_loc', currentLocation); }, [currentLocation]);

    const consolidatedHistory = useLiveQuery(async () => {
        const scans = await db.scans.where('sessionId').equals(session.id).toArray();
        const physicalItems = await aggregateScans(scans);
        
        // Unir con metas si existen
        const expectedItems = session.expectedItems || [];
        const expectedMap = new Map(expectedItems.map(ei => [normalizeSku(ei.barcode), ei.expectedQty]));

        const finalItems = physicalItems.map(pi => ({
            ...pi,
            expectedQuantity: expectedMap.get(normalizeSku(pi.barcode)) || 0
        }));

        // Inyectar ítems de la guía que aún no se han tocado (Solo si es modo verificado)
        if (session.isVerifiedMode && expectedItems.length > 0) {
            const scannedBarcodes = new Set(physicalItems.map(pi => normalizeSku(pi.barcode)));
            expectedItems.forEach(exp => {
                if (!scannedBarcodes.has(normalizeSku(exp.barcode))) {
                    finalItems.push({
                        barcode: exp.barcode,
                        productName: exp.name,
                        totalQuantity: 0,
                        expectedQuantity: exp.expectedQty,
                        scans: 0,
                        location: 'GUÍA'
                    });
                }
            });
        }

        const sorted = finalItems.sort((a, b) => {
            if (normalizeSku(a.barcode) === activeBarcode) return -1;
            if (normalizeSku(b.barcode) === activeBarcode) return 1;
            return b.totalQuantity - a.totalQuantity;
        });

        itemsRef.current = sorted;
        return sorted;
    }, [session.id, session.isVerifiedMode, session.expectedItems, activeBarcode, feedback]);

    const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
        if (machineState !== 'IDLE' && machineState !== 'LOOKING_UP' && machineState !== 'COMMITTING' && machineState !== 'MANUAL_ENTRY') return;

        dispatch({ type: 'SCAN_INBOUND', barcode });
        try {
            const cleanBarcode = sanitizeBarcode(barcode);
            const normBarcode = normalizeSku(cleanBarcode);
            
            // 1. Resolver Producto
            let product = await productService.getProductByBarcode(cleanBarcode);
            setActiveProduct(product || null);

            // 2. Verificar Lotes (Si es necesario)
            const needsPharma = shouldPromptForBatch(cleanBarcode, consolidatedHistory || [], settings) && (mm === undefined);
            if (needsPharma) {
                setActiveBarcode(normBarcode);
                dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: true });
                return;
            }
            dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: false });

            // 3. Calcular Nueva Cantidad Optimista (Para UI sin lag)
            const existing = itemsRef.current.find(i => normalizeSku(i.barcode) === normBarcode);
            const newTotal = Math.max(0, (existing?.totalQuantity || 0) + qty);
            
            setOptimisticQty(newTotal);
            setActiveBarcode(normBarcode);

            // 4. Persistir
            await sessionService.addScanEvent(session.id, cleanBarcode, qty, mm, yyyy, currentLocation, batch);
            
            dispatch({ type: 'COMMIT_COMPLETE' });
            trigger(qty > 0 ? 'success' : 'undo');
            if (settings.ttsEnabled && qty > 0) SoundFX.speak(`${newTotal}`);
        } catch (err) {
            dispatch({ type: 'ERROR_OCCURRED' });
            trigger('error');
        }
    }, [session.id, settings, trigger, currentLocation, consolidatedHistory, machineState]);

    return {
        state: { 
            machineState,
            status: machineState.toLowerCase() as ScannerStatus,
            feedback, multiplier,
            currentLocation,
            activeBarcode, activeProduct,
            optimisticActiveQty: optimisticQty || 0
        },
        data: { 
            history: consolidatedHistory || []
        },
        actions: { 
            handleExternalScan: finalizeScanPipeline,
            // Move setters from state to actions to fix Scanner.tsx property access errors
            setMultiplier,
            setCurrentLocation,
            selectItem: (b: string) => { 
                const norm = normalizeSku(b);
                setActiveBarcode(norm); 
                const existing = itemsRef.current.find(i => normalizeSku(i.barcode) === norm);
                setOptimisticQty(existing?.totalQuantity || 0); 
                productService.getProductByBarcode(b).then(setActiveProduct);
            },
            handlePharmaComplete: (m?: number, y?: number, b?: string) => {
                if (activeBarcode) finalizeScanPipeline(activeBarcode, multiplier, m, y, b);
            },
            cancelPharma: () => dispatch({ type: 'RESET' }),
            setStatus: (s: ScannerStatus) => {
                if (s === 'manual') dispatch({ type: 'OPEN_MANUAL' });
                else if (s === 'confirming') dispatch({ type: 'TRIGGER_CLOSE' });
                else dispatch({ type: 'RESET' });
            }
        }
    };
};
