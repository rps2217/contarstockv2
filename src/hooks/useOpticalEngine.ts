import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { telemetry } from '../services/telemetryService';

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
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
      } catch (e: any) {
        console.warn("Failed to get environment camera, falling back to any camera...", e);
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
      }

      streamRef.current = stream;
      if (videoRef.current) { 
        videoRef.current.srcObject = stream; 
        await videoRef.current.play(); 
      }

      const formats = ['qr_code', 'ean_13', 'code_128', 'code_39', 'ean_8', 'upc_a', 'itf'];
      let detector: any;
      try {
        // @ts-ignore
        detector = new window.BarcodeDetector({ formats });
        setEngineType('native');
      } catch (e) {
        console.warn("BarcodeDetector API not available, falling back to legacy engine");
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
          } catch (e) {
            // Silently ignore detection errors for smoother experience
          }
          lastDetectTime = timestamp;
        }
        requestRef.current = requestAnimationFrame(detectLoop);
      };
      requestRef.current = requestAnimationFrame(detectLoop);
    } catch (err: any) {
      console.warn("Native engine failed completely:", err);
      startLegacyEngine();
    }
  };

  const startLegacyEngine = async () => {
    telemetry.track('HARDWARE', 'ENGINE_START', { type: 'wasm' });
    try {
      const oldScanner = document.getElementById(scannerDomId);
      if (oldScanner) oldScanner.innerHTML = "";
      const scannerInstance = new Html5Qrcode(scannerDomId);
      scannerRef.current = scannerInstance;
      setEngineType('wasm');
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 };
      const onSuccess = (decodedText: string) => { if (triggerRef.current) handleSuccessfulScan(decodedText); };
      const onError = () => {};

      try {
        await scannerInstance.start({ facingMode: "environment" }, config, onSuccess, onError);
      } catch (e: any) {
        console.warn("Legacy engine environment camera failed, trying any camera", e);
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            await scannerInstance.start(devices[0].id, config, onSuccess, onError);
          } else {
            throw new Error("No cameras found or permission denied");
          }
        } catch (innerErr: any) {
          throw new Error(`Camera access denied or unavailable: ${innerErr.message || innerErr}`);
        }
      }
    } catch (err: any) {
      console.error("Legacy engine failed:", err);
      if (isComponentMounted.current) {
        setError(`OPTICAL_ENGINE_FAILURE: ${err.message || 'Camera access denied or unavailable'}`);
      }
    }
  };

  useEffect(() => {
    isComponentMounted.current = true;
    // @ts-ignore
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
        scannerRef.current.stop().catch(() => {}).finally(() => { scannerRef.current = null; });
      }
    };
  }, []);

  return {
    videoRef,
    error,
    engineType
  };
};

