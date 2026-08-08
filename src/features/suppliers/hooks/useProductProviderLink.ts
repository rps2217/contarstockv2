/**
 * useProductProviderLink - Hook para gestionar la relación producto-proveedor
 * 
 * Permite ver los productos asociados a un proveedor desde PRODUCTO_PROVEEDOR
 */

import { useState, useCallback } from 'react';
import { productProviderRepository, ProductProvider } from '../../../repositories/ProductProviderRepository';
import { productRepository } from '../../../repositories/DexieProductRepository';

export interface ProductWithDetails extends ProductProvider {
  productName?: string;
}

export const useProductProviderLink = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<ProductWithDetails[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Cargar productos de un proveedor
   */
  const loadProviderProducts = useCallback(async (providerRut: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedProvider(providerRut);

    try {
      const relations = await productProviderRepository.getByProvider(providerRut);
      
      // Obtener nombres de productos
      const productsWithNames: ProductWithDetails[] = await Promise.all(
        relations.map(async (relation) => {
          try {
            const product = await productRepository.getById(relation.productBarcode);
            return {
              ...relation,
              productName: product?.name || 'Producto no encontrado',
            };
          } catch {
            return {
              ...relation,
              productName: 'Error al cargar',
            };
          }
        })
      );

      setProducts(productsWithNames);
      setIsModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Cerrar modal
   */
  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedProvider(null);
    setProducts([]);
    setError(null);
  }, []);

  /**
   * Obtener estadísticas de un proveedor
   */
  const getProviderStats = useCallback(async (providerRut: string) => {
    const relations = await productProviderRepository.getByProvider(providerRut);
    const primaryCount = relations.filter(r => r.isPrimary).length;
    
    return {
      totalProducts: relations.length,
      primaryProducts: primaryCount,
    };
  }, []);

  return {
    // State
    isLoading,
    products,
    selectedProvider,
    isModalOpen,
    error,
    
    // Actions
    loadProviderProducts,
    closeModal,
    getProviderStats,
  };
};
