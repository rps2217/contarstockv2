import { useState, useRef, useEffect, useCallback } from 'react';
import { SoundFX } from '../../../services/audio';

interface UseScannerCameraProps {
  onCapture: (base64: string) => void;
  autoShootEnabled: boolean;
}

export const useScannerCamera = ({ onCapture, autoShootEnabled }: UseScannerCameraProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stabilityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
    setCountdown(null);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Apply Enhancement
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        const contrast = 1.5;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        const final = factor * (gray - 128) + 128;
        data[i] = data[i+1] = data[i+2] = final;
      }
      ctx.putImageData(imageData, 0, 0);

      // Flash Effect
      const flash = document.createElement('div');
      flash.className = 'fixed inset-0 bg-white z-[100] animate-flash-out pointer-events-none';
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 500);

      const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
      onCapture(base64);
      stopCamera();
    }
  }, [onCapture, stopCamera]);

  const startStabilityCheck = useCallback(() => {
    if (stabilityTimerRef.current) clearTimeout(stabilityTimerRef.current);
    
    setCountdown(3);
    let count = 3;
    
    const tick = () => {
      count--;
      setCountdown(count);
      if (count > 0) {
        SoundFX.play('increment');
        stabilityTimerRef.current = setTimeout(tick, 1000);
      } else {
        capturePhoto();
        setCountdown(null);
      }
    };
    
    stabilityTimerRef.current = setTimeout(tick, 1000);
  }, [capturePhoto]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', 
          width: { ideal: 1920 }, 
          height: { ideal: 1080 } 
        } 
      });
      setStream(mediaStream);
      setError(null);
      
      if (autoShootEnabled) {
        startStabilityCheck();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("No se pudo acceder a la cámara. Verifique los permisos.");
    }
  };

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stream]);

  return {
    videoRef,
    canvasRef,
    stream,
    countdown,
    error,
    startCamera,
    stopCamera,
    capturePhoto,
    startStabilityCheck
  };
};
