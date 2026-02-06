
import { ConsolidatedItem, AppSettings } from '../types';
import { normalizeSku } from './utils';

export type ItemStatus = 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'mismatch';

/**
 * Determina el estado de un ítem basado en el progreso vs meta
 */
export const determineItemStatus = (current: number, target?: number): ItemStatus => {
    if (target === undefined || target === 0) return 'neutral'; 
    if (current === target) return 'success'; 
    if (current > target) return 'error';     
    if (current > 0 && current < target) return 'warning'; 
    return 'neutral'; 
};

/**
 * Mapeo de colores industriales (Semáforo)
 */
export const getStatusColorClasses = (status: ItemStatus, variant: 'bg' | 'border' | 'text' = 'bg'): string => {
    const map = {
        success: { bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-500' },
        error: { bg: 'bg-rose-600', border: 'border-rose-400', text: 'text-rose-500' },
        warning: { bg: 'bg-amber-600', border: 'border-amber-400', text: 'text-amber-500' },
        info: { bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-blue-500' },
        mismatch: { bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-purple-300' },
        neutral: { bg: 'bg-slate-800', border: 'border-white/10', text: 'text-slate-400' }
    };
    return map[status][variant] || '';
};

/**
 * Protocolo SoC: Lógica de decisión para disparo de modal de vencimiento
 */
export const shouldPromptForBatch = (
    barcode: string, 
    recentItems: ConsolidatedItem[], 
    settings: AppSettings
): boolean => {
    if (!settings.batchTrackingEnabled) return false;
    
    const normInbound = normalizeSku(barcode);
    const existing = recentItems.find(i => normalizeSku(i.barcode) === normInbound);
    
    // Si el ítem no existe o su cantidad es 0, requiere captura de fecha/lote
    return !existing || existing.totalQuantity === 0;
};

export const getRowStyles = (current: number, target?: number, isActive?: boolean) => {
    const status = determineItemStatus(current, target);
    const isMismatched = target === 0 && current > 0;
    const finalStatus = isMismatched ? 'mismatch' : status;

    let classes = "w-full h-full border-2 p-4 rounded-2xl flex items-center justify-between transition-all text-left active:scale-[0.98] ";
    classes += `${getStatusColorClasses(finalStatus, 'bg')} ${getStatusColorClasses(finalStatus, 'border')} `;

    if (isActive) classes += "ring-4 ring-white shadow-2xl scale-[1.02] z-10 ";
    return classes;
};
