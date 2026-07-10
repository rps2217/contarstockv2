
import { useState, useCallback, useMemo } from 'react';
import { useFeedbackSystem, FeedbackStatus } from '../../hooks/useFeedbackSystem';
import { Product } from '../../types';
import { sanitizeBarcode } from '../../services/utils';

export type ScannerEngineStatus = 'idle' | 'scanning' | 'validating' | 'error' | 'success';

/**
 * ENGINE CORE v7.1 (Enterprise Orchestrator)
 * Centraliza la lógica de estados optimistas para garantizar fluidez visual 
 * independiente de la velocidad de IndexedDB.
 */
export const useScannerEngine = (defaultMultiplier = 1) => {
 const { feedback, trigger } = useFeedbackSystem(150);
 const [status, setStatus] = useState<ScannerEngineStatus>('idle');
 const [multiplier, setMultiplier] = useState(defaultMultiplier);
 const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
 const [activeProduct, setActiveProduct] = useState<Product | null>(null);
 const [optimisticQty, setOptimisticQty] = useState<number | null>(null);

 /**
 * Actualiza el ítem activo con cálculo optimista de cantidad.
 */
 const updateActiveItem = useCallback((barcode: string, product: Product | null, baseQty: number, delta: number) => {
 const clean = sanitizeBarcode(barcode);
 setActiveBarcode(clean);
 setActiveProduct(product);
 
 // El nuevo total se calcula en memoria para respuesta instantánea de UI
 const newQty = Math.max(0, baseQty + delta);
 setOptimisticQty(newQty);
 
 // Orquestación de Feedback
 if (delta > 0) {
 setStatus('success');
 trigger(product ? 'success' : 'unknown');
 } else if (delta < 0) {
 setStatus('success');
 trigger('undo');
 } else {
 setStatus('idle');
 trigger('idle');
 }
 
 return newQty;
 }, [trigger]);

 const resetActive = useCallback(() => {
 setActiveBarcode(null);
 setActiveProduct(null);
 setOptimisticQty(null);
 setStatus('idle');
 }, []);

 const actions = useMemo(() => ({
 updateActiveItem,
 resetActive,
 triggerFeedback: (s: FeedbackStatus) => trigger(s),
 setStatus
 }), [updateActiveItem, resetActive, trigger]);

 return {
 status,
 multiplier,
 setMultiplier,
 activeBarcode,
 activeProduct,
 optimisticQty,
 feedback,
 actions
 };
};

