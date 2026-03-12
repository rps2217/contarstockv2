import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * HOOK: AUTO-BLOQUEO INDUSTRIAL v3.1
 * Monitorea la actividad y bloquea el terminal tras X ms de inactividad.
 */
export const useAutoLock = (delayMs: number = 3000) => {
 const [isLocked, setIsLocked] = useState(false);
 const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 const isLockedRef = useRef(false);

 useEffect(() => {
 isLockedRef.current = isLocked;
 }, [isLocked]);

 const lock = useCallback(() => {
 if (isLockedRef.current) return;
 setIsLocked(true);
 if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
 }, []);

 const resetTimer = useCallback((forceState?: boolean) => {
 if (timerRef.current) clearTimeout(timerRef.current);
 
 // Use the forced state if provided, otherwise the ref
 const currentLockState = forceState !== undefined ? forceState : isLockedRef.current;
 if (currentLockState) return;

 timerRef.current = setTimeout(() => {
 lock();
 }, delayMs);
 }, [delayMs, lock]);

 useEffect(() => {
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
 }, [resetTimer]);

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