
import { useEffect, useRef } from 'react';
import { sanitizeBarcode } from '../services/utils';

interface HIDScannerOptions {
    onScan: (barcode: string) => void;
    minChars?: number;
    maxLatency?: number;
    isEnabled?: boolean;
}

/**
 * MOTOR DE CAPTURA HID v4.0 (PDA Optimized)
 * Intercepta ráfagas de teclado físico incluso si el foco no está en un input.
 */
export const useHIDScanner = ({
    onScan,
    minChars = 2,
    maxLatency = 45, // Latencia crítica para motores Zebra/Honeywell
    isEnabled = true
}: HIDScannerOptions) => {
    const buffer = useRef('');
    const lastKeyTime = useRef(0);

    useEffect(() => {
        if (!isEnabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Evitar interferencia si el usuario está en un campo de texto manual explícito
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                // Solo permitimos si es nuestro input de ráfaga
                if (!target.hasAttribute('data-burst-mode')) return;
            }

            const now = Date.now();
            
            // Si el tiempo entre teclas es muy alto, asumimos escritura humana y limpiamos
            if (now - lastKeyTime.current > maxLatency) {
                buffer.current = '';
            }
            
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length >= minChars) {
                    const cleanCode = sanitizeBarcode(buffer.current);
                    if (cleanCode) {
                        onScan(cleanCode);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                }
                buffer.current = '';
            } else if (e.key.length === 1) {
                // Acumular caracteres imprimibles
                buffer.current += e.key;
            }
        };

        // 'capture: true' asegura que el evento se tome antes que cualquier otro listener
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [isEnabled, onScan, minChars, maxLatency]);
};
