import { useState, useCallback, useMemo } from 'react';
import { Product, Provider } from '../types';
import { ProductProvider } from '../db';
import { db } from '../db';
import { normalizeSku, normalizeIdentity } from '../services/utils';
import { useCaptureSession } from './useCaptureSession';
import { useFeedbackSystem } from './useFeedbackSystem';

interface ScannerEngineOptions {
  onScanSuccess?: (product: Product | null, code: string) => void;
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
  const [product, setProduct] = useState<Product | null>(null);
  const [providerPolicy, setProviderPolicy] = useState<{ days: number; hasCanje: boolean } | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Lógica de Escaneo Centralizada
  const handleScan = useCallback(
    async (code: string) => {
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
      const productRecord = foundProduct
        ? { ...foundProduct }
        : ({
            name: 'Producto Desconocido',
            barcode: normalizedCode,
            supplier: 'N/A',
            supplierRut: '',
          } as Product);

      let provider: Provider | undefined | null = null;

      if (productRecord.supplierRut) {
        const cleanRut = normalizeIdentity(productRecord.supplierRut);
        // 1. Intento por RUT normalizado
        provider = await db.providers.get(cleanRut);

        // 2. Intento por RUT original con puntuación o barras
        if (!provider) {
          provider = await db.providers.get(productRecord.supplierRut);
        }

        // 3. Intento por escaneo completo normalizado (Sanación de formato)
        if (!provider) {
          const allProviders = await db.providers.toArray();
          provider = allProviders.find(p => normalizeIdentity(p.rut) === cleanRut);
        }
      }

      // 4. Intento por Nombre de Proveedor (si no hay match por RUT o no tiene RUT pero sí nombre)
      if (!provider && productRecord.supplier && productRecord.supplier !== 'N/A') {
        const targetName = normalizeIdentity(productRecord.supplier);
        const allProviders = await db.providers.toArray();
        provider = allProviders.find(p => p.name && normalizeIdentity(p.name) === targetName);
      }

      // 5. PRODUCTO_PROVEEDOR: Buscar políticas específicas por producto-proveedor
      let ppRelation: ProductProvider | null = null;
      try {
        const ppRelations = await db
          .table('productProviders')
          .where('productBarcode')
          .equals(normalizedCode)
          .toArray();
        // Priorizar proveedor principal o el primero que tenga datos específicos
        ppRelation = ppRelations.find(p => p.isPrimary) || ppRelations[0] || null;
      } catch {
        // Tabla puede no existir aún
      }

      // Curación Dinámica de Datos (Self-Healing):
      // Si encontramos el proveedor, sobreescribimos los campos del producto temporalmente
      // con los datos oficiales del maestro para que los registros (vencimientos, conteos)
      // queden perfectamente vinculados.
      if (provider) {
        productRecord.supplier = provider.name;
        productRecord.supplierRut = provider.rut;

        // Usar políticas específicas del PRODUCTO_PROVEEDOR si existen, sino las del proveedor
        setProviderPolicy({
          days: ppRelation?.withdrawalDays ?? provider.withdrawalDays ?? 0,
          hasCanje: ppRelation?.hasExchange ?? provider.hasExchange ?? false,
        });
      } else if (ppRelation) {
        // Si solo tenemos relación PP pero no proveedor maestro, buscamos el proveedor
        provider = await db.providers.get(ppRelation.providerRut);
        if (provider) {
          productRecord.supplier = provider.name;
          productRecord.supplierRut = provider.rut;
        }
        setProviderPolicy({
          days: ppRelation.withdrawalDays ?? 0,
          hasCanje: ppRelation.hasExchange ?? false,
        });
      } else {
        setProviderPolicy(null);
      }

      setProduct(productRecord);

      if (options.autoOpenModal !== false) {
        setIsModalOpen(true);
      }

      if (options.onScanSuccess) {
        options.onScanSuccess(foundProduct ?? null, normalizedCode);
      }
    },
    [isSearchActive, isModalOpen, scannedBarcode, trigger, options]
  );

  // Integración con Sesión de Captura (Hardware + Cámara)
  const capture = useCaptureSession({
    onScan: handleScan,
    isEnabled: true,
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
    capture,
  };
};
