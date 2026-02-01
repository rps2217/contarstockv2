
/**
 * LÓGICA DE PRESENTACIÓN CENTRALIZADA
 * Principio DRY: Las reglas de color y estado se definen una sola vez aquí.
 */

export type ItemStatus = 'success' | 'warning' | 'error' | 'neutral' | 'info';

export const determineItemStatus = (current: number, target?: number): ItemStatus => {
    if (target === undefined) return 'info'; // No hay target (Modo libre)
    if (current === target) return 'success';
    if (current > target) return 'error'; // Exceso
    return 'warning'; // Pendiente
};

export const getStatusColorClasses = (status: ItemStatus, variant: 'bg' | 'border' | 'text' = 'bg'): string => {
    const map = {
        success: {
            bg: 'bg-emerald-600',
            border: 'border-emerald-500',
            text: 'text-emerald-500'
        },
        error: {
            bg: 'bg-rose-700',
            border: 'border-rose-500',
            text: 'text-rose-500'
        },
        warning: {
            bg: 'bg-amber-600',
            border: 'border-amber-500',
            text: 'text-amber-500'
        },
        info: {
            bg: 'bg-blue-600',
            border: 'border-blue-500',
            text: 'text-blue-500'
        },
        neutral: {
            bg: 'bg-slate-900',
            border: 'border-white/10',
            text: 'text-slate-400'
        }
    };

    return map[status][variant] || '';
};

export const getRowStyles = (current: number, target?: number, isActive?: boolean) => {
    const status = determineItemStatus(current, target);
    
    // Base styles
    let classes = "w-full h-full border-2 p-4 rounded-2xl flex items-center justify-between transition-all text-left active:scale-[0.98] ";
    
    // Status styles
    if (status === 'neutral') {
        classes += "bg-slate-900/40 border-white/5 ";
    } else {
        classes += `${getStatusColorClasses(status, 'bg')} ${getStatusColorClasses(status, 'border')} `;
    }

    // Active state
    if (isActive) {
        classes += "ring-4 ring-white shadow-2xl scale-[1.02] z-10 ";
    }

    return classes;
};
