import React, { useState, useEffect } from 'react';
import { Product } from '../../../types';
import * as productService from '../../../services/productService';
import { sanitizeBarcode } from '../../../services/utils';
import { productSchema } from '../../../schemas/productSchema';
import { useToastStore } from '../../../store/useToastStore';

interface UseProductFormProps {
  initialData: Product | null;
  onSaveSuccess: (msg: string) => void;
  onClose: () => void;
}

export const useProductForm = ({ initialData, onSaveSuccess, onClose }: UseProductFormProps) => {
  const [formData, setFormData] = useState<Product>({ 
    barcode: '', name: '', category: '', supplier: '', supplierRut: '' 
  });
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...initialData });
    } else {
      setFormData({ barcode: '', name: '', category: '', supplier: '', supplierRut: '' });
    }
    setError('');
  }, [initialData]);

  const updateField = (key: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Zod Validation
    const validation = productSchema.safeParse(formData);
    if (validation.success === false) {
      const firstError = (validation as any).error.errors[0].message;
      setError(firstError);
      addToast(firstError, 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const cleanBarcode = sanitizeBarcode(formData.barcode);
      const productToSave = { ...formData, barcode: cleanBarcode };
      
      await productService.saveProduct(productToSave);
      
      if (navigator.vibrate) navigator.vibrate(20);
      const msg = initialData ? 'Producto actualizado' : 'Producto creado';
      addToast(msg, 'success');
      onSaveSuccess(msg);
      onClose();
    } catch (err: any) {
      const errMsg = err.message || 'Error al guardar el producto';
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
    updateField,
    handleSave
  };
};
