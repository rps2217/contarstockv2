import { useState, useEffect, useRef } from 'react';
import { logger } from '@/services/logger';
import { Html5Qrcode } from 'html5-qrcode';
import { telemetry } from '../services/telemetryService';

// Type para BarcodeDetector API (experimental - no disponible en TypeScript lib)
type BarcodeDetectorOptions = {
  formats: string[];
};

type BarcodeDetectorResult = {
  boundingBox: DOMRectReadOnly;
  cornerPoints: { x: number; y: number }[];
  rawValue: string;
  format: string;
};

class WebBarcodeDetector {
  constructor(options: BarcodeDetectorOptions) {
    this.formats = options.formats;
  }
  formats: string[];
  async detect(_image: ImageBitmapSource): Promise<BarcodeDetectorResult[]> {
    return [];
  }
  static getSupportedFormats(): Promise<string[]> {
    return Promise.resolve([]);
  }
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options: BarcodeDetectorOptions): WebBarcodeDetector;
      getSupportedFormats(): Promise<string[]>;
    };
  }
}

export type EngineType = 'native' | 'wasm' | 'init';

interface UseOpticalEngineProps {
  onScan: (code: string) => void;
  isTriggered: boolean;
  scannerDomId: string;
}

export const useOpticalEngine = ({ onScan, isTriggered, scannerDomId }: UseOpticalEngineProps) => {
  const [error, setError] = useState<string | null>(null);
  const [engineType, setEngineType] = useState<EngineType>('init');

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef<number | undefined>(undefined);

  const lastScanTime = useRef(0);
  const triggerRef = useRef(isTriggered);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    triggerRef.current = isTriggered;
  }, [isTriggered]);

  const handleSuccessfulScan = (code: string) => {
    if (!isComponentMounted.current) return;
    const now = Date.now();
    if (now - lastScanTime.current < 1000) return;
    lastScanTime.current = now;

    telemetry.track('HARDWARE', 'CAMERA_SCAN', { engine: engineType });
    if (navigator.vibrate) navigator.vibrate(40);
    onScan(code);
  };

  const startNativeEngine = async () => {
    telemetry.track('HARDWARE', 'ENGINE_START', { type: 'native' });
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.warn('useOpticalEngine', 'Failed to get environment camera, falling back', message);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const formats = ['qr_code', 'ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'itf'];
      let detector: WebBarcodeDetector;
      try {
        if (!window.BarcodeDetector) throw new Error('BarcodeDetector not available');
        detector = new window.BarcodeDetector({ formats });
        setEngineType('native');
      } catch (e: unknown) {
        logger.warn(
          'useOpticalEngine',
          'BarcodeDetector API not available, falling back to legacy engine'
        );
        startLegacyEngine();
        return;
      }

      let lastDetectTime = 0;
      const detectLoop = async (timestamp: number) => {
        if (!videoRef.current || !isComponentMounted.current) return;

        // Optimización móvil: Solo detectamos cada 150ms si el dispositivo es lento,
        // o mantenemos 100ms para balancear entre velocidad y consumo de batería.
        if (timestamp - lastDetectTime >= 150) {
          try {
            if (triggerRef.current && videoRef.current.readyState === 4) {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0) {
                // Debounce extra para evitar múltiples detecciones accidentales del mismo frame
                handleSuccessfulScan(barcodes[0].rawValue);
              }
            }
          } catch (e: unknown) {
            // Silently ignore detection errors for smoother experience
          }
          lastDetectTime = timestamp;
        }
        requestRef.current = requestAnimationFrame(detectLoop);
      };
      requestRef.current = requestAnimationFrame(detectLoop);
    } catch (err: unknown) {
      logger.warn(
        'useOpticalEngine',
        'Native engine failed completely',
        err instanceof Error ? err.message : String(err)
      );
      startLegacyEngine();
    }
  };

  const startLegacyEngine = async () => {
    telemetry.track('HARDWARE', 'ENGINE_START', { type: 'wasm' });
    try {
      const oldScanner = document.getElementById(scannerDomId);
      if (oldScanner) oldScanner.innerHTML = '';
      const scannerInstance = new Html5Qrcode(scannerDomId);
      scannerRef.current = scannerInstance;
      setEngineType('wasm');

      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      const onSuccess = (decodedText: string) => {
        if (triggerRef.current) handleSuccessfulScan(decodedText);
      };
      const onError = () => {};

      try {
        await scannerInstance.start({ facingMode: 'environment' }, config, onSuccess, onError);
      } catch (e: unknown) {
        logger.warn(
          'useOpticalEngine',
          'Legacy engine environment camera failed, trying any camera',
          e instanceof Error ? e.message : String(e)
        );
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            await scannerInstance.start(devices[0].id, config, onSuccess, onError);
          } else {
            throw new Error('No cameras found or permission denied');
          }
        } catch (innerErr: unknown) {
          throw new Error(
            `Camera access denied or unavailable: ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`
          );
        }
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      logger.warn('useOpticalEngine', 'Legacy engine failed', errMessage);
      if (isComponentMounted.current) {
        setError(`OPTICAL_ENGINE_FAILURE: ${errMessage}`);
      }
    }
  };

  useEffect(() => {
    isComponentMounted.current = true;
    if ('BarcodeDetector' in window && typeof window.BarcodeDetector === 'function') {
      startNativeEngine();
    } else {
      startLegacyEngine();
    }
    return () => {
      isComponentMounted.current = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, []);

  return {
    videoRef,
    error,
    engineType,
  };
};
