
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * HOOK: AUTO-BLOQUEO INDUSTRIAL v2
 * Gestiona el bloqueo de pantalla por inactividad de forma resiliente.
 */
export const useAutoLock = (delayMs: number = 3000) => {
    const [isLocked, setIsLocked] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const lockTerminal = useCallback(() => {
        setIsLocked(true);
        if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    }, []);

    const resetTimer = useCallback(() => {
        // Actualizar marca de tiempo
        lastActivityRef.current = Date.now();
        
        // Limpiar timer anterior
        if (timerRef.current) clearTimeout(timerRef.current);
        
        // Si ya está bloqueado, no re-activar el timer hasta que se desbloquee
        if (isLocked) return;

        timerRef.current = setTimeout(() => {
            const timeSinceLastActivity = Date.now() - lastActivityRef.current;
            if (timeSinceLastActivity >= delayMs) {
                lockTerminal();
            } else {
                // Si por alguna razón el delay no se cumplió, re-agendamos la diferencia
                resetTimer();
            }
        }, delayMs);
    }, [isLocked, delayMs, lockTerminal]);

    useEffect(() => {
        const events = [
            'mousedown', 'mousemove', 'keypress', 
            'keydown', 'touchstart', 'scroll', 
            'pointerdown', 'click'
        ];
        
        const activityHandler = () => {
            resetTimer();
        };

        // Escucha en fase de captura para asegurar prioridad
        events.forEach(event => window.addEventListener(event, activityHandler, true));
        
        // Inicializar
        resetTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, activityHandler, true));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resetTimer]);

    return {
        isLocked,
        lock: lockTerminal,
        unlock: () => {
            setIsLocked(false);
            // Pequeño delay antes de reactivar el monitoreo para evitar re-bloqueos inmediatos
            setTimeout(resetTimer, 100);
        }
    };
};
