
import { useState, useRef, useCallback, useEffect } from 'react';
import { useHIDScanner } from './useHIDScanner';

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
    if (!isEnabled) {
      if (inputRef.current) {
        inputRef.current.blur();
      }
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Forzar doblemente en el siguiente ciclo (ayuda a navegadores testarudos en móvil)
      setTimeout(() => {
        if (document.activeElement instanceof HTMLElement && 
            (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          document.activeElement.blur();
        }
      }, 10);
    }
    
    if (!autoFocus || isCameraActive || !isEnabled) return;

    const focusInput = () => {
      const activeEl = document.activeElement;
      // Do not steal focus if user is intentionally clicking something else like a select or another input
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') && activeEl !== inputRef.current) {
        return;
      }
      if (inputRef.current && isEnabled) {
        inputRef.current.focus();
      }
    };

    focusInput();
    window.addEventListener('click', focusInput);
    return () => window.removeEventListener('click', focusInput);
  }, [autoFocus, isCameraActive, isEnabled]);

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
