
import { useEffect, useRef } from 'react';
import { sanitizeBarcode } from '../services/utils';

interface HIDScannerOptions {
    onScan: (barcode: string) => void;
    minChars?: number;
    maxLatency?: number;
    isEnabled?: boolean;
}

/**
 * MOTOR DE CAPTURA HID v6.0 (PDA Optimized)
 * Captura ráfagas de hardware láser incluso sin foco en inputs.
 */
export const useHIDScanner = ({
    onScan,
    minChars = 2,
    maxLatency = 70, 
    isEnabled = true
}: HIDScannerOptions) => {
    const buffer = useRef('');
    const lastKeyTime = useRef(0);
    const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!isEnabled) return;

        const processBuffer = () => {
            const currentContent = buffer.current.trim();
            if (currentContent.length >= minChars) {
                const cleanCode = sanitizeBarcode(currentContent);
                if (cleanCode) {
                    onScan(cleanCode);
                }
            }
            buffer.current = '';
            if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignorar teclas de sistema y navegación que envían algunas PDAs
            if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;
            if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;

            const target = e.target as HTMLElement;
            // No interferir si el usuario está en un campo de texto manual real (ajustes, etc)
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                if (!target.hasAttribute('data-burst-mode') && target.id !== 'v8-core-optical-engine') return;
            }

            const now = Date.now();
            
            // Si el tiempo entre teclas es muy alto (>70ms), asumimos escritura humana y reseteamos
            if (now - lastKeyTime.current > maxLatency) {
                buffer.current = '';
            }
            
            lastKeyTime.current = now;

            if (e.key === 'Enter') {
                if (buffer.current.length >= minChars) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    processBuffer();
                }
            } else if (e.key.length === 1) {
                buffer.current += e.key;

                // RED DE SEGURIDAD: Algunas PDAs no envían Enter al final. 
                // Procesamos si hay silencio tras la ráfaga.
                if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
                fallbackTimer.current = setTimeout(() => {
                    if (buffer.current.length >= minChars) processBuffer();
                }, 100);
            }
        };

        // Escucha agresiva en fase de captura para ganar a otros listeners
        window.addEventListener('keydown', handleKeyDown, { capture: true });
        
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
        };
    }, [isEnabled, onScan, minChars, maxLatency]);
};
