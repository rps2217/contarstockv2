
import { useState, useCallback, useMemo } from 'react';
import { useFeedbackSystem, FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { Product } from '../../../types';
import { sanitizeBarcode } from '../../../services/utils';

export type ScannerEngineStatus = 'idle' | 'scanning' | 'validating' | 'error' | 'success';

/**
 * ENGINE CORE v7.0 (Unified Industrial Engine)
 * Centraliza la lógica de estados para evitar duplicidad en componentes de UI.
 */
export const useScannerEngine = (defaultMultiplier = 1) => {
    const { feedback, trigger } = useFeedbackSystem(150);
    const [status, setStatus] = useState<ScannerEngineStatus>('idle');
    const [multiplier, setMultiplier] = useState(defaultMultiplier);
    const [activeBarcode, setActiveBarcode] = useState<string | null>(null);
    const [activeProduct, setActiveProduct] = useState<Product | null>(null);
    const [optimisticQty, setOptimisticQty] = useState<number | null>(null);

    const updateActiveItem = useCallback((barcode: string, product: Product | null, baseQty: number, delta: number) => {
        const clean = sanitizeBarcode(barcode);
        setActiveBarcode(clean);
        setActiveProduct(product);
        
        const newQty = Math.max(0, baseQty + delta);
        setOptimisticQty(newQty);
        
        if (delta > 0) {
            setStatus('success');
            trigger('success');
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

    const triggerValidationMode = useCallback((barcode: string, product: Product | null) => {
        setActiveBarcode(sanitizeBarcode(barcode));
        setActiveProduct(product);
        setStatus('validating');
    }, []);

    const actions = useMemo(() => ({
        updateActiveItem,
        resetActive,
        triggerValidationMode,
        triggerFeedback: (s: FeedbackStatus) => trigger(s),
        setStatus
    }), [updateActiveItem, resetActive, triggerValidationMode, trigger]);

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
