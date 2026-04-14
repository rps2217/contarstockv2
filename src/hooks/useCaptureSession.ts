
import { useState, useRef, useCallback, useEffect } from 'react';
import { useHIDScanner } from './useHIDScanner';
import { SoundFX } from '../services/audio';

interface UseCaptureSessionOptions {
  onScan: (code: string) => void;
  isEnabled?: boolean;
  autoFocus?: boolean;
}

export const useCaptureSession = ({
  onScan,
  isEnabled = true,
  autoFocus = true
}: UseCaptureSessionOptions) => {
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleManualSubmit = useCallback(() => {
    if (!inputValue || isProcessing) return;
    onScan(inputValue);
    setInputValue('');
  }, [inputValue, isProcessing, onScan]);

  const handleHIDScan = useCallback((code: string) => {
    if (!isEnabled || isCameraActive) return;
    onScan(code);
    setInputValue('');
  }, [isEnabled, isCameraActive, onScan]);

  useHIDScanner({
    onScan: handleHIDScan,
    isEnabled: isEnabled && !isCameraActive,
  });

  useEffect(() => {
    if (!isEnabled && inputRef.current) {
      inputRef.current.blur();
    }
    
    if (!autoFocus || isCameraActive || !isEnabled) return;

    const focusInput = () => {
      if (inputRef.current && isEnabled) {
        inputRef.current.focus();
      }
    };

    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, [autoFocus, isCameraActive]);

  return {
    inputValue,
    setInputValue,
    isProcessing,
    setIsProcessing,
    isCameraActive,
    setIsCameraActive,
    inputRef,
    handleManualSubmit
  };
};
