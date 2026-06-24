/**
 * useExpiryScanner - Hook para integrar scanner con captura de vencimientos
 * 
 * Responsabilidades:
 * - Escuchar scanner HID
 * - Auto-completar campos del formulario
 * - Validar producto contra catálogo
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useHIDScanner } from '@/hooks/useHIDScanner';
import { productRepository } from '@/repositories/DexieProductRepository';
import { toast } from 'sonner';

interface ProductInfo {
  barcode: string;
  name: string;
  category?: string;
  supplierName?: string;
}

interface UseExpiryScannerReturn {
  scannedProduct: ProductInfo | null;
  isScanning: boolean;
  lastScanTime: number | null;
  scanError: string | null;
  startScanMode: () => void;
  stopScanMode: () => void;
  clearScannedProduct: () => void;
}

export function useExpiryScanner(
  onProductScanned: (product: ProductInfo) => void,
  isFormOpen: boolean = false
): UseExpiryScannerReturn {
  const [scannedProduct, setScannedProduct] = useState<ProductInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  
  const isEnabledRef = useRef(false);

  const handleScan = useCallback(async (barcode: string) => {
    if (!isEnabledRef.current) return;
    
    setIsScanning(true);
    setScanError(null);
    
    try {
      // Buscar producto en catálogo
      const product = await productRepository.getById(barcode);
      
      if (product) {
        const productInfo: ProductInfo = {
          barcode: product.barcode,
          name: product.name,
          category: product.category,
          supplierName: product.supplierName
        };
        
        setScannedProduct(productInfo);
        setLastScanTime(Date.now());
        onProductScanned(productInfo);
        
        // Feedback táctil
        if (navigator.vibrate) {
          navigator.vibrate(10);
        }
        
        toast.success(`Producto: ${product.name}`);
      } else {
        // Producto no encontrado, permitir registro manual
        setScanError(`Producto ${barcode} no encontrado en catálogo`);
        toast.warning(`Código ${barcode} no está en el catálogo. Puede registrarlo manualmente.`);
        
        // Still return the barcode for manual entry
        const productInfo: ProductInfo = {
          barcode: barcode,
          name: '' // To be filled manually
        };
        setScannedProduct(productInfo);
        setLastScanTime(Date.now());
        onProductScanned(productInfo);
      }
    } catch (error) {
      setScanError('Error al buscar producto');
      toast.error('Error al buscar producto');
    } finally {
      setIsScanning(false);
    }
  }, [onProductScanned]);

  const startScanMode = useCallback(() => {
    isEnabledRef.current = true;
    setIsScanning(true);
  }, []);

  const stopScanMode = useCallback(() => {
    isEnabledRef.current = false;
    setIsScanning(false);
  }, []);

  const clearScannedProduct = useCallback(() => {
    setScannedProduct(null);
    setScanError(null);
  }, []);

  // Habilitar scanner cuando el formulario está abierto
  useEffect(() => {
    if (isFormOpen) {
      startScanMode();
    } else {
      stopScanMode();
      clearScannedProduct();
    }
  }, [isFormOpen, startScanMode, stopScanMode, clearScannedProduct]);

  return {
    scannedProduct,
    isScanning,
    lastScanTime,
    scanError,
    startScanMode,
    stopScanMode,
    clearScannedProduct
  };
}
