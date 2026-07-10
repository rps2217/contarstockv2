import { useState, useCallback } from 'react';

export interface CaptureMetadata {
  timestamp?: number;
  source?: 'camera' | 'keyboard' | 'hid' | 'manual';
  productId?: string;
  sessionId?: string;
  [key: string]: unknown;
}

interface CaptureHubOptions {
  onCapture: (code: string, metadata?: CaptureMetadata) => void;
}

export const useCaptureHub = ({ onCapture }: CaptureHubOptions) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isKeypadOpen, setIsKeypadOpen] = useState(false);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState(false);
  const [initialBarcode, setInitialBarcode] = useState('');

  const openCamera = useCallback(() => setIsCameraOpen(true), []);
  const closeCamera = useCallback(() => setIsCameraOpen(false), []);

  const openKeypad = useCallback(() => setIsKeypadOpen(true), []);
  const closeKeypad = useCallback(() => setIsKeypadOpen(false), []);

  const openDesktopModal = useCallback((barcode: string = '') => {
    setInitialBarcode(barcode);
    setIsDesktopModalOpen(true);
  }, []);
  const closeDesktopModal = useCallback(() => {
    setIsDesktopModalOpen(false);
    setInitialBarcode('');
  }, []);

  const handleCapture = useCallback((code: string, metadata?: CaptureMetadata) => {
    onCapture(code, metadata);
    setIsCameraOpen(false);
    setIsKeypadOpen(false);
    setIsDesktopModalOpen(false);
    setInitialBarcode('');
  }, [onCapture]);

  return {
    state: {
      isCameraOpen,
      isKeypadOpen,
      isDesktopModalOpen,
      initialBarcode
    },
    actions: {
      openCamera,
      closeCamera,
      openKeypad,
      closeKeypad,
      openDesktopModal,
      closeDesktopModal,
      handleCapture,
      setIsCameraOpen,
      setIsKeypadOpen,
      setIsDesktopModalOpen,
      setInitialBarcode
    }
  };
};
