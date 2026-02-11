
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * HOOK: AUTO-BLOQUEO INDUSTRIAL
 * Monitorea la actividad del usuario y dispara el bloqueo tras 3 segundos.
 */
export const useAutoLock = (delayMs: number = 3000) => {
    const [isLocked, setIsLocked] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (isLocked) return;

        timerRef.current = setTimeout(() => {
            setIsLocked(true);
            if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
        }, delayMs);
    }, [isLocked, delayMs]);

    useEffect(() => {
        // Lista extendida de eventos para detectar cualquier tipo de interacción
        const events = ['mousedown', 'mousemove', 'keypress', 'keydown', 'touchstart', 'scroll', 'pointerdown'];
        
        const handler = () => resetTimer();

        events.forEach(event => window.addEventListener(event, handler));
        resetTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, handler));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resetTimer]);

    return {
        isLocked,
        lock: () => setIsLocked(true),
        unlock: () => {
            setIsLocked(false);
            resetTimer();
        }
    };
};
