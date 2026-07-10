
import { ConsolidatedItem, AppSettings } from '../types';
import { normalizeSku } from './utils';

export type ItemStatus = 'success' | 'warning' | 'error' | 'neutral' | 'info' | 'mismatch' | 'semantic';

/**
 * MOTOR DE VEREDICTO LOGÍSTICO v3.0 (Correlation Engine)
 */
export const determineItemStatus = (current: number, target?: number): ItemStatus => {
 // Si no hay meta definida (Conteo ciego)
 if (target === undefined || target === 0) {
 return current > 0 ? 'info' : 'neutral';
 }

 if (current === 0) return 'neutral';
 
 // Correlación lógica
 if (current === target) return 'success'; // VERDE: Calzado perfecto
 if (current > target) return 'error'; // ROJO: Excedente detectado
 if (current < target) return 'warning'; // NARANJA: Faltante detectado
 
 return 'neutral';
};

/**
 * Mapeo de colores industriales de alto contraste
 */
export const getStatusColorClasses = (status: ItemStatus, variant: 'bg' | 'border' | 'text' = 'bg'): string => {
 const map = {
 success: { bg: 'bg-emerald-600', border: 'border-emerald-400', text: 'text-emerald-500' },
 error: { bg: 'bg-rose-600', border: 'border-rose-400', text: 'text-rose-500' },
 warning: { bg: 'bg-amber-600', border: 'border-amber-400', text: 'text-amber-500' },
 info: { bg: 'bg-blue-600', border: 'border-blue-400', text: 'text-blue-500' },
 mismatch: { bg: 'bg-purple-600', border: 'border-purple-400', text: 'text-purple-300' },
 semantic: { bg: 'bg-indigo-600', border: 'border-violet-400', text: 'text-indigo-500' },
 neutral: { bg: 'bg-slate-800', border: 'border-white/10', text: 'text-slate-400' }
 };
 return map[status][variant] || '';
};

export const getRowStyles = (current: number, target?: number, isActive?: boolean) => {
 const status = determineItemStatus(current, target);
 
 let classes = "w-full h-full border-2 p-4 rounded-2xl flex items-center justify-between transition-all text-left active:scale-[0.98] ";
 
 if (target && target > 0 && current === 0) {
 classes += "bg-slate-900/40 border-white/5 opacity-80 ";
 } else {
 classes += `${getStatusColorClasses(status, 'bg')} ${getStatusColorClasses(status, 'border')} `;
 }

 if (isActive) classes += "ring-4 ring-white shadow-2xl scale-[1.02] z-10 ";
 return classes;
};

export const shouldPromptForBatch = (
 barcode: string, 
 consolidatedItems: ConsolidatedItem[] | undefined, 
 settings: AppSettings
): boolean => {
 if (!settings.batchTrackingEnabled) return false;
 if (!consolidatedItems || consolidatedItems.length === 0) return true;
 const normInbound = normalizeSku(barcode);
 const existingPhysical = consolidatedItems.find(i => 
 normalizeSku(i.barcode) === normInbound && 
 i.totalQuantity > 0 && 
 i.location !== 'GUÍA'
 );
 return !existingPhysical;
};

