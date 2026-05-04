
import { useState, useCallback, useMemo } from 'react';
import { db } from '../db';
import { normalizeSku } from '../services/utils';
import { useCaptureSession } from './useCaptureSession';
import { useFeedbackSystem } from './useFeedbackSystem';
import { SoundFX } from '../services/audio';

interface ScannerEngineOptions {
  onScanSuccess?: (product: any, code: string) => void;
  autoOpenModal?: boolean;
}

/**
 * ENGINE: Motor Unificado de Captura v1.0
 * Abstrae la lógica de resolución de productos, búsqueda y coordinación de hardware.
 */
export const useScannerEngine = (options: ScannerEngineOptions = {}) => {
  const { feedback, trigger } = useFeedbackSystem(400);
  
  // States compartidos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [providerPolicy, setProviderPolicy] = useState<{ days: number, hasCanje: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Lógica de Escaneo Centralizada
  const handleScan = useCallback(async (code: string) => {
    if (!code) return;
    
    // Si estamos en modo búsqueda, desviamos el input
    if (isSearchActive) {
      setSearchQuery(code);
      return;
    }

    const normalizedCode = normalizeSku(code);
    
    // Evitar reapertura inmediata si es el mismo código y el modal ya está activo
    if (isModalOpen && scannedBarcode === normalizedCode) return;

    trigger('success');
    setScannedBarcode(normalizedCode);
    
    // Resolución paralela de Producto y Política
    const foundProduct = await db.products.get(normalizedCode);
    setProduct(foundProduct || { name: 'Producto Desconocido', barcode: normalizedCode });

    if (foundProduct?.supplierRut) {
      const provider = await db.providers.get(normalizeSku(foundProduct.supplierRut));
      if (provider) {
        setProviderPolicy({ 
          days: provider.withdrawalDays || 0, 
          hasCanje: provider.hasExchange || false 
        });
      } else {
        setProviderPolicy(null);
      }
    } else {
      setProviderPolicy(null);
    }

    if (options.autoOpenModal !== false) {
      setIsModalOpen(true);
    }

    if (options.onScanSuccess) {
      options.onScanSuccess(foundProduct, normalizedCode);
    }
  }, [isSearchActive, isModalOpen, scannedBarcode, trigger, options]);

  // Integración con Sesión de Captura (Hardware + Cámara)
  const capture = useCaptureSession({
    onScan: handleScan,
    isEnabled: true 
  });

  const resetScanner = useCallback(() => {
    setIsModalOpen(false);
    setScannedBarcode('');
    setProduct(null);
    setProviderPolicy(null);
  }, []);

  return {
    // States
    feedback,
    isModalOpen,
    setIsModalOpen,
    isSyncModalOpen,
    setIsSyncModalOpen,
    scannedBarcode,
    product,
    providerPolicy,
    searchQuery,
    setSearchQuery,
    isSearchActive,
    setIsSearchActive,
    
    // Actions
    handleScan,
    resetScanner,
    triggerFeedback: trigger,
    
    // Session (Exposed for Layouts)
    capture
  };
};
