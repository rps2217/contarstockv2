import React, { useState, useEffect } from 'react';
import { ZodError } from 'zod';
import { Product, Provider } from '../../../types';
import * as productService from '../../../services/productService';
import { sanitizeBarcode, normalizeIdentity } from '../../../services/utils';
import { productSchema } from '../../../schemas/productSchema';
import { useToastStore } from '@/stores';
import { ProviderRepository } from '../../../repositories/ProviderRepository';

interface UseProductFormProps {
  initialData: Product | null;
  onSaveSuccess: (msg: string) => void;
  onClose: () => void;
}

/** Tipo extendido de Product para el formulario */
export type ProductFormData = Product & {
  withdrawalDays?: number;
  hasExchange?: boolean;
};

export const useProductForm = ({ initialData, onSaveSuccess, onClose }: UseProductFormProps) => {
  const [formData, setFormData] = useState<ProductFormData>({
    barcode: '',
    name: '',
    category: '',
    supplier: '',
    supplierRut: '',
    withdrawalDays: 0,
    hasExchange: false,
  });
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    const loadProviderData = async () => {
      if (initialData) {
        let withdrawalDays = 0;
        let hasExchange = false;

        if (initialData.supplierRut) {
          const provider = await ProviderRepository.getByRut(initialData.supplierRut);
          if (provider) {
            withdrawalDays = provider.withdrawalDays || 0;
            hasExchange = !!provider.hasExchange;
          }
        }

        setFormData({
          ...initialData,
          withdrawalDays,
          hasExchange,
        });
        setIsDuplicating(false);
      } else {
        setFormData({
          barcode: '',
          name: '',
          category: '',
          supplier: '',
          supplierRut: '',
          withdrawalDays: 0,
          hasExchange: false,
        });
        setIsDuplicating(false);
      }
      setError('');
    };

    loadProviderData();
  }, [initialData]);

  const updateField = (key: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleDuplicate = () => {
    setFormData(prev => ({ ...prev, barcode: '' }));
    setIsDuplicating(true);
    addToast('Modo duplicación: Ingrese el nuevo SKU', 'info');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Zod Validation
    const validation = productSchema.safeParse(formData);
    if (!validation.success && validation.error instanceof ZodError) {
      const firstError = validation.error.errors[0]?.message || 'Error de validación';
      setError(firstError);
      addToast(firstError, 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const cleanBarcode = sanitizeBarcode(formData.barcode);
      const productToSave = { ...formData, barcode: cleanBarcode };

      // Separar datos de producto vs proveedor
      const { withdrawalDays, hasExchange, ...productData } = productToSave;

      await productService.saveProduct(productData as Product);

      // Actualizar proveedor si hay RUT
      const cleanRut = normalizeIdentity(formData.supplierRut);
      if (cleanRut) {
        const existingProvider = await ProviderRepository.getByRut(cleanRut);
        await ProviderRepository.save({
          rut: cleanRut,
          name: formData.supplier || 'PROVEEDOR N/A',
          withdrawalDays:
            withdrawalDays != null ? withdrawalDays : existingProvider?.withdrawalDays,
          hasExchange: hasExchange !== undefined ? !!hasExchange : existingProvider?.hasExchange,
          exchangePolicy: existingProvider?.exchangePolicy || '',
        });
      }

      if (navigator.vibrate) navigator.vibrate(20);
      const msg = initialData ? 'Producto actualizado' : 'Producto creado';
      addToast(msg, 'success');
      onSaveSuccess(msg);
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error al guardar el producto';
      setError(errMsg);
      addToast(errMsg, 'error');
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    formData,
    error,
    isSaving,
    isDuplicating,
    updateField,
    handleDuplicate,
    handleSave,
  };
};
