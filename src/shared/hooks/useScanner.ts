/**
 * useScanner - Hook compartido para escaneo
 * 
 * Wrapper que unifica los diferentes hooks de escaneo:
 * - useHIDScanner: Escaneo via teclado/HID
 * - useOpticalEngine: Motor de reconocimiento óptico
 * - useScannerEngine: Motor genérico de escaneo
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useHIDScanner } from '@/hooks/useHIDScanner';

export interface UseScannerOptions {
  onScan?: (barcode: string) => void;
  onError?: (error: Error) => void;
  enableHID?: boolean;
  prefix?: string;
  minLength?: number;
  cooldown?: number;
}

export interface UseScannerReturn {
  scan: (barcode: string) => void;
  lastBarcode: string | null;
  isScanning: boolean;
  errors: Error[];
  startListening: () => void;
  stopListening: () => void;
}

export function useScanner(options: UseScannerOptions = {}): UseScannerReturn {
  const {
    onScan,
    enableHID = true,
    prefix,
    minLength = 4,
    cooldown = 500,
  } = options;

  const [lastBarcode, setLastBarcode] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const lastScanTime = useRef<number>(0);

  // useHIDScanner maneja internamente el listener
  useHIDScanner({
    onScan: (barcode) => {
      if (barcode.length >= minLength) {
        if (prefix && !barcode.startsWith(prefix)) return;
        
        const now = Date.now();
        if (now - lastScanTime.current < cooldown) return;
        lastScanTime.current = now;
        
        setLastBarcode(barcode);
        onScan?.(barcode);
      }
    },
    isEnabled: enableHID,
  });

  const scan = useCallback((barcode: string) => {
    if (barcode.length >= minLength) {
      setLastBarcode(barcode);
      onScan?.(barcode);
    }
  }, [minLength, onScan]);

  const startListeningCallback = useCallback(() => {
    setIsScanning(true);
  }, []);

  const stopListeningCallback = useCallback(() => {
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => { stopListeningCallback(); };
  }, [stopListeningCallback]);

  return {
    scan,
    lastBarcode,
    isScanning,
    errors: [],
    startListening: startListeningCallback,
    stopListening: stopListeningCallback,
  };
}

export default useScanner;
