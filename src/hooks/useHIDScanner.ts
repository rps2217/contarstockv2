
import { useEffect, useRef } from 'react';
import { sanitizeBarcode } from '../services/utils';
import { telemetry } from '../services/telemetryService';

interface HIDScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxLatency?: number;
  isEnabled?: boolean;
}

/**
 * MOTOR DE CAPTURA HID v7.0 (High Performance Industrial)
 * Blindado contra re-renders y optimizado para ráfagas láser de PDAs Zebra/Honeywell.
 */
export const useHIDScanner = ({
  onScan,
  minChars = 2,
  maxLatency = 50, 
  isEnabled = true
}: HIDScannerOptions) => {
  const buffer = useRef('');
  const lastKeyTime = useRef(0);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // ESTABILIZACIÓN CRÍTICA: Guardar callback en Ref para evitar que el listener se desmonte 
  // y remonte durante una ráfaga de escaneo (Keyboard Burst).
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!isEnabled) {
      buffer.current = '';
      return;
    }

    const processBuffer = () => {
      const currentContent = buffer.current.trim();
      if (currentContent.length >= minChars) {
        telemetry.track('HARDWARE', 'HID_SCAN', { length: currentContent.length });
        const cleanCode = sanitizeBarcode(currentContent);
        if (cleanCode) {
          onScanRef.current(cleanCode);
        }
      }
      buffer.current = '';
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar teclas de control y modificadores que envían algunas PDAs
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;
      
      // Si el carácter tiene longitud > 1 y no es Enter/Backspace, es una tecla de función del sistema
      if (e.key.length > 1 && e.key !== 'Enter' && e.key !== 'Backspace') return;

      const target = e.target as HTMLElement;
      // No interferir si el usuario está en un campo de texto manual
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        if (target.id !== 'v8-core-optical-engine') return;
      }

      const now = Date.now();
      
      // Los láseres disparan a ~10ms por carácter. Si el gap es > maxLatency, es escritura humana.
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

        // RED DE SEGURIDAD: Procesamos por tiempo de inactividad si no hay Enter
        if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
        fallbackTimer.current = setTimeout(() => {
          if (buffer.current.length >= minChars) processBuffer();
        }, 100); 
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };
  }, [isEnabled, minChars, maxLatency]);
};

// Forced GitHub sync
