
import { useState, useCallback } from 'react';
import { useFeedbackSystem, FeedbackStatus } from '../../../hooks/useFeedbackSystem';
import { Product } from '../../../types';
import { sanitizeBarcode } from '../../../services/utils';

/**
 * ENGINE CORE v6.5 (Industrial Multi-Mode)
 */
export const useScannerEngine = (defaultMultiplier = 1) => {
    const { feedback, trigger } = useFeedbackSystem(150);
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
        
        // Determinar feedback basado en la acción
        if (delta > 0) trigger('success');
        else if (delta < 0) trigger('undo');
        else trigger('idle');
        
        return newQty;
    }, [trigger]);

    const resetActive = useCallback(() => {
        setActiveBarcode(null);
        setActiveProduct(null);
        setOptimisticQty(null);
    }, []);

    const triggerManualFeedback = useCallback((status: FeedbackStatus) => {
        trigger(status);
    }, [trigger]);

    return {
        multiplier,
        setMultiplier,
        activeBarcode,
        activeProduct,
        optimisticQty,
        feedback,
        actions: {
            updateActiveItem,
            resetActive,
            triggerFeedback: triggerManualFeedback
        }
    };
};
