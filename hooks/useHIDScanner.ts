import { useEffect, useRef } from 'react';
import { sanitizeBarcode } from '../services/utils';

interface HIDScannerOptions {
    onScan: (barcode: string) => void;
    minChars?: number;
    maxLatency?: number;
    isEnabled?: boolean;
    preventDefault?: boolean;
}

/**
 * Hook especializado para escáneres de hardware (Zebra, Honeywell, USB genéricos).
 * Detecta ráfagas de teclas rápidas (<50ms) y las agrupa como un escaneo.
 */
export const useHIDScanner = ({
    onScan,
    minChars = 2,
    maxLatency = 50,
    isEnabled = true,
    preventDefault = true
}: HIDScannerOptions) => {
    const buffer = useRef('');
    const lastKeyTime = useRef(0);

    useEffect(() => {
        if (!isEnabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // 1. Ignorar si el foco está en un input/textarea explícito
            // Esto permite escribir manualmente sin disparar el escáner
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !target.getAttribute('data-scanner-input')) {
                return;
            }

            const now = Date.now();
            
            // 2. Detección de ráfaga: Si pasa mucho tiempo entre teclas, es escritura manual, no escáner.
            // Reseteamos el buffer si el tiempo excede la latencia máxima.
            if (now - lastKeyTime.current > maxLatency) {
                buffer.current = '';
            }
            lastKeyTime.current = now;

            // 3. Procesamiento de teclas
            if (e.key === 'Enter') {
                if (buffer.current.length >= minChars) {
                    const cleanCode = sanitizeBarcode(buffer.current);
                    if (cleanCode) {
                        onScan(cleanCode);
                    }
                }
                buffer.current = '';
                if (preventDefault) e.preventDefault();
            } else if (e.key.length === 1) {
                // Solo acumulamos caracteres imprimibles
                buffer.current += e.key;
            }
        };

        // Usamos 'capture: true' para interceptar el evento antes que otros listeners si es necesario
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [isEnabled, onScan, minChars, maxLatency, preventDefault]);
};