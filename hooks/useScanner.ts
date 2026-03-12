
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
import { scannerReducer, ScannerState } from '../services/scannerMachine';

/**
 * SCANNER ENGINE HOOK v8.5 (Robust Architecture)
 * Centraliza la lógica de negocio y el control de flujo de la PDA.
 */
export const useScanner = (session: CountingSession, onFinish: () => void) => {
 const settings = useMemo(() => getSettings(), []);
 const { feedback, trigger } = useFeedbackSystem(200);
 const [machineState, dispatch] = useReducer(scannerReducer, 'IDLE');
 
 const [multiplier, setMultiplier] = useState(1);
 const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('last_loc') || 'BODEGA_GRAL'); 
 const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
 const [activeProduct, setActiveProduct] = useState<Product | null>(null);
 const [optimisticQty, setOptimisticQty] = useState<number | null>(null);

 // Caché de items para cálculos síncronos entre renders
 const itemsCache = useRef<ConsolidatedItem[]>([]);
 
 useEffect(() => { localStorage.setItem('last_loc', currentLocation); }, [currentLocation]);

 const consolidatedHistory = useLiveQuery(async () => {
 const scans = await db.scans.where('sessionId').equals(session.id).toArray();
 const physicalItems = await aggregateScans(scans);
 
 const expectedItems = session.expectedItems || [];
 const expectedMap = new Map(expectedItems.map(ei => [normalizeSku(ei.barcode), ei.expectedQty]));

 const finalItems = physicalItems.map(pi => ({
 ...pi,
 expectedQuantity: expectedMap.get(normalizeSku(pi.barcode)) || 0
 }));

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
 return b.totalQuantity - a.totalQuantity;
 });

 itemsCache.current = sorted;
 return sorted;
 }, [session.id, session.isVerifiedMode, session.expectedItems, activeBarcode, feedback]);

 /**
 * PIPELINE DE ESCANEO SEGURO
 * Maneja la transición LOOKING_UP -> COMMITTING evitando colisiones.
 */
 const finalizeScanPipeline = useCallback(async (barcode: string, qty: number, mm?: number, yyyy?: number, batch?: string) => {
 // PROTECCIÓN: Solo permitimos escaneo si la máquina está lista o en entrada manual
 if (machineState !== 'IDLE' && machineState !== 'MANUAL_ENTRY' && machineState !== 'AWAITING_PHARMA') return;

 const cleanBarcode = sanitizeBarcode(barcode);
 const normBarcode = normalizeSku(cleanBarcode);
 if (!cleanBarcode) return;

 dispatch({ type: 'SCAN_INBOUND', barcode: cleanBarcode });
 
 try {
 // FASE 1: Resolución de Producto
 let product = await productService.getProductByBarcode(cleanBarcode);
 setActiveProduct(product || null);

 // FASE 2: Verificación de Validación Pharma (Batch/Exp)
 const needsPharma = shouldPromptForBatch(cleanBarcode, itemsCache.current, settings) && (mm === undefined);
 if (needsPharma) {
 setActiveBarcode(normBarcode);
 dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: true });
 return;
 }
 dispatch({ type: 'PRODUCT_RESOLVED', needsPharma: false });

 // FASE 3: Persistencia y UI Optimista
 const existing = itemsCache.current.find(i => normalizeSku(i.barcode) === normBarcode);
 const newTotal = Math.max(0, (existing?.totalQuantity || 0) + qty);
 
 setOptimisticQty(newTotal);
 setActiveBarcode(normBarcode);

 await sessionService.addScanEvent(session.id, cleanBarcode, qty, mm, yyyy, currentLocation, batch);
 
 // FASE 4: Feedback Final
 dispatch({ type: 'COMMIT_COMPLETE' });
 trigger(qty > 0 ? 'success' : 'undo');
 
 if (settings.ttsEnabled && qty > 0) {
 SoundFX.speak(`${newTotal}`);
 }

 // AUTO-RESET para ráfaga continua
 setTimeout(() => dispatch({ type: 'RESET' }), 1000);

 } catch (err) {
 console.error("[Kernel] Scan Pipeline Failure:", err);
 dispatch({ type: 'ERROR_OCCURRED' });
 trigger('error');
 setTimeout(() => dispatch({ type: 'RESET' }), 2000);
 }
 }, [session.id, settings, trigger, currentLocation, machineState]);

 /**
 * Mapeo de Estados de Kernel a Estados UI
 */
 const getUiStatus = (): ScannerStatus => {
 switch(machineState) {
 case 'IDLE': return 'idle';
 case 'MANUAL_ENTRY': return 'manual';
 case 'LOOKING_UP':
 case 'COMMITTING': return 'busy';
 case 'AWAITING_PHARMA': return 'expiring';
 case 'CONFIRMING_CLOSE': return 'confirming';
 case 'FEEDBACK_ERROR': return 'error';
 case 'FEEDBACK_SUCCESS': return 'success';
 default: return 'idle';
 }
 };

 return {
 state: { 
 machineState,
 status: getUiStatus(),
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
 setMultiplier,
 setCurrentLocation,
 selectItem: (b: string) => { 
 const norm = normalizeSku(b);
 setActiveBarcode(norm); 
 const existing = itemsCache.current.find(i => normalizeSku(i.barcode) === norm);
 setOptimisticQty(existing?.totalQuantity || 0); 
 productService.getProductByBarcode(b).then(setActiveProduct);
 },
 handlePharmaComplete: (m?: number, y?: number, b?: string) => {
 if (activeBarcode) {
 dispatch({ type: 'PHARMA_COMPLETE', mm: m, yyyy: y, batch: b });
 finalizeScanPipeline(activeBarcode, multiplier, m, y, b);
 }
 },
 cancelPharma: () => dispatch({ type: 'RESET' }),
 setStatus: (s: ScannerStatus) => {
 if (s === 'manual') dispatch({ type: 'OPEN_MANUAL' });
 else if (s === 'confirming') dispatch({ type: 'TRIGGER_CLOSE' });
 else if (s === 'idle') dispatch({ type: 'RESET' });
 }
 }
 };
};
