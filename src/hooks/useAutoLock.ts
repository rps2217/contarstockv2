import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../store/mainAppStore';

/**
 * HOOK: AUTO-BLOQUEO INDUSTRIAL v3.2
 * Monitorea la actividad y bloquea el terminal tras X ms de inactividad.
 * Utiliza el tiempo de bloqueo global por defecto.
 */
export const useAutoLock = (delayMs?: number, enabled: boolean = true) => {
  const { settings } = useAppStore();
  const [isLocked, setIsLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLockedRef = useRef(false);

  // Usar el delay pasado por props o el global de settings (default 5 min)
  const effectiveDelay = delayMs ?? settings.autoLockTimeout ?? 300000;

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const lock = useCallback(() => {
    if (isLockedRef.current || !enabled || effectiveDelay === 0) return;
    setIsLocked(true);
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
  }, [enabled, effectiveDelay]);

  const resetTimer = useCallback((forceState?: boolean) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (!enabled || effectiveDelay === 0) return;

    // Use the forced state if provided, otherwise the ref
    const currentLockState = forceState !== undefined ? forceState : isLockedRef.current;
    if (currentLockState) return;

    timerRef.current = setTimeout(() => {
      lock();
    }, effectiveDelay);
  }, [effectiveDelay, lock, enabled]);

  useEffect(() => {
    if (!enabled) {
      setIsLocked(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = [
      'mousedown', 'mousemove', 'keypress', 
      'keydown', 'touchstart', 'scroll', 
      'pointerdown', 'click'
    ];
    
    const handler = () => resetTimer();
    events.forEach(event => window.addEventListener(event, handler, { capture: true, passive: true }));
    
    resetTimer();

    return () => {
      events.forEach(event => window.removeEventListener(event, handler, { capture: true }));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer, enabled]);

  return {
    isLocked,
    lock,
    unlock: () => {
      setIsLocked(false);
      // Re-activar el timer forzando el estado a 'false' para evitar race conditions
      resetTimer(false);
    }
  };
};

// Forced GitHub sync
