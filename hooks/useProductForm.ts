import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import * as productService from '../services/productService';
import { sanitizeBarcode } from '../services/utils';

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
        
        if (!formData.barcode || !formData.name) {
            setError('El código y el nombre son obligatorios.');
            return;
        }

        setIsSaving(true);
        try {
            const cleanBarcode = sanitizeBarcode(formData.barcode);
            const productToSave = { ...formData, barcode: cleanBarcode };
            
            await productService.saveProduct(productToSave);
            
            if (navigator.vibrate) navigator.vibrate(20);
            onSaveSuccess(initialData ? 'Producto actualizado' : 'Producto creado');
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al guardar el producto');
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