/**
 * useProductSearch - Hook compartido para búsqueda de productos
 * 
 * Proporciona:
 * - Búsqueda por barcode/SKU
 * - Autocompletado
 * - Información de proveedor
 * - Políticas de canje/devolución
 * 
 * Usado en: Expiry, Events, Reports, cualquier módulo que necesite productos
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { db } from '@/db';

export interface ProductInfo {
  barcode: string;
  name: string;
  category?: string;
  supplierName?: string;
  supplierRut?: string;
  unitsPerBox?: number;
}

export interface ProviderPolicy {
  hasExchange: boolean;
  hasCanje: boolean;
  withdrawalDays: number;
}

export interface ProductWithPolicy extends ProductInfo {
  providerPolicy?: ProviderPolicy;
}

/**
 * Hook para buscar productos por barcode/SKU
 */
export function useProductSearch(options?: {
  debounceMs?: number;
  minLength?: number;
}) {
  const { debounceMs = 300, minLength = 3 } = options || {};
  
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState<ProductWithPolicy | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Buscar producto en IndexedDB
  const searchProduct = useCallback(async (barcodeToSearch: string) => {
    if (barcodeToSearch.length < minLength) {
      setProduct(null);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      // Buscar en tabla products
      const foundProduct = await db.products.get(barcodeToSearch);
      
      if (foundProduct) {
        // Buscar políticas del proveedor
        const providerPolicy = await getProviderPolicy(foundProduct.supplierRut);
        
        setProduct({
          barcode: foundProduct.barcode,
          name: foundProduct.name,
          category: foundProduct.category,
          supplierName: foundProduct.supplier,
          supplierRut: foundProduct.supplierRut,
          unitsPerBox: foundProduct.unitsPerBox,
          providerPolicy,
        });
      } else {
        setProduct(null);
      }
    } catch (err) {
      console.error('Error searching product:', err);
      setError('Error al buscar producto');
      setProduct(null);
    } finally {
      setIsSearching(false);
    }
  }, [minLength]);

  // Debounce effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      searchProduct(barcode);
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [barcode, debounceMs, searchProduct]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const clear = useCallback(() => {
    setBarcode('');
    setProduct(null);
    setError(null);
  }, []);

  return {
    barcode,
    setBarcode,
    product,
    isSearching,
    error,
    clear,
    isFound: !!product,
    isNotFound: !!barcode && barcode.length >= minLength && !isSearching && !product,
  };
}

/**
 * Obtener políticas del proveedor
 */
async function getProviderPolicy(supplierRut?: string): Promise<ProviderPolicy | undefined> {
  if (!supplierRut) return undefined;

  try {
    const provider = await db.table('providers').get(supplierRut);
    
    if (provider) {
      return {
        hasExchange: provider.hasExchange ?? provider.has_exchange ?? false,
        hasCanje: provider.hasExchange ?? provider.has_exchange ?? false,
        withdrawalDays: provider.withdrawalDays ?? provider.withdrawal_days ?? 0,
      };
    }
  } catch {
    // Provider not found, return undefined
  }
  
  return undefined;
}

/**
 * Obtener políticas de Producto-Proveedor específicas
 */
export async function getProductProviderPolicy(
  productBarcode: string,
  providerRut: string
): Promise<ProviderPolicy | undefined> {
  try {
    const pp = await db.table('productProviders')
      .where(['productBarcode', 'providerRut'])
      .equals([productBarcode, providerRut])
      .first();
    
    if (pp) {
      return {
        hasExchange: pp.hasExchange ?? pp.has_exchange ?? false,
        hasCanje: pp.hasExchange ?? pp.has_exchange ?? false,
        withdrawalDays: pp.withdrawalDays ?? pp.withdrawal_days ?? 0,
      };
    }
  } catch {
    // Fallback a políticas generales del proveedor
    return getProviderPolicy(providerRut);
  }
  
  return undefined;
}
