/**
 * useEventForm - Hook para gestión del formulario de eventos
 */

import { useState, useEffect, useCallback } from 'react';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { Product } from '../../../types';
import { normalizeSku } from '../../../services/utils';
import { toast } from 'sonner';
import { EventType, EventListItem, EventFormData, DESTINOS } from '../constants/eventConstants';

interface UseEventFormProps {
  editingItem?: {
    barcode: string;
    productName: string;
    providerName?: string;
    event: string;
    quantity: number;
    frc?: string;
    nguia?: string;
    destino?: string;
    traspaso?: string;
    observaciones?: string;
  } | null;
  isOpen: boolean;
}

interface UseEventFormReturn {
  // State
  sku: string;
  setSku: (sku: string) => void;
  product: Product | null;
  eventType: EventType;
  setEventType: (type: EventType) => void;
  quantity: number;
  setQuantity: (qty: number) => void;
  frc: string;
  setFrc: (frc: string) => void;
  nguia: string;
  setNguia: (nguia: string) => void;
  destino: string;
  setDestino: (destino: string) => void;
  traspaso: string;
  setTraspaso: (traspaso: string) => void;
  observaciones: string;
  setObservaciones: (obs: string) => void;
  showAdditional: boolean;
  setShowAdditional: (show: boolean) => void;
  isSearching: boolean;
  isSubmitting: boolean;
  items: EventListItem[];
  // Actions
  addItem: () => void;
  removeItem: (index: number) => void;
  resetForm: () => void;
  setIsSubmitting: (submitting: boolean) => void;
  getFormData: () => EventFormData | null;
}

export function useEventForm({ editingItem, isOpen }: UseEventFormProps): UseEventFormReturn {
  const [sku, setSku] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [eventType, setEventType] = useState<EventType>('DIF. PED.');
  const [quantity, setQuantity] = useState<number>(1);
  const [frc, setFrc] = useState('');
  const [nguia, setNguia] = useState('');
  const [destino, setDestino] = useState('');
  const [traspaso, setTraspaso] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [showAdditional, setShowAdditional] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<EventListItem[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (editingItem) {
      setSku(editingItem.barcode);
      setEventType(editingItem.event as EventType);
      setQuantity(editingItem.quantity);
      setFrc(editingItem.frc || '');
      setNguia(editingItem.nguia || '');
      setDestino(editingItem.destino || '');
      setTraspaso(editingItem.traspaso || '');
      setObservaciones(editingItem.observaciones || '');
      setItems([]);

      const loadProduct = async () => {
        const found = await productRepository.getById(normalizeSku(editingItem.barcode));
        if (found) setProduct(found);
        else {
          setProduct({
            barcode: editingItem.barcode,
            name: editingItem.productName,
            supplier: editingItem.providerName,
            category: 'GENERAL'
          } as Product);
        }
      };
      loadProduct();
    } else {
      resetForm();
    }
  }, [editingItem, isOpen]);

  // Search product when SKU changes
  useEffect(() => {
    if (sku.length >= 3) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        try {
          const found = await productRepository.getById(normalizeSku(sku));
          if (found) {
            setProduct(found);
          } else if (editingItem && sku === editingItem.barcode) {
            setProduct({
              barcode: editingItem.barcode,
              name: editingItem.productName,
              supplier: editingItem.providerName,
              category: 'GENERAL'
            } as Product);
          } else {
            setProduct(null);
          }
        } catch (error) {
          console.error('Error searching product:', error);
        } finally {
          setIsSearching(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setProduct(null);
    }
  }, [sku, editingItem]);

  const addItem = useCallback(() => {
    if (!product) {
      toast.error('Selecciona un producto válido');
      return;
    }
    if (quantity === 0) {
      toast.error('La cantidad no puede ser 0');
      return;
    }
    setItems(prev => [...prev, {
      barcode: product.barcode,
      productName: product.name,
      providerName: product.supplier,
      quantity
    }]);
    // Reset for next entry
    setSku('');
    setProduct(null);
    setQuantity(1);
  }, [product, quantity]);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetForm = useCallback(() => {
    setSku('');
    setProduct(null);
    setEventType('DIF. PED.');
    setQuantity(1);
    setFrc('');
    setNguia('');
    setDestino('');
    setTraspaso('');
    setObservaciones('');
    setItems([]);
  }, []);

  const getFormData = useCallback((): EventFormData | null => {
    if (items.length === 0 && !product) {
      toast.error('Agrega al menos un producto');
      return null;
    }
    return {
      barcode: product?.barcode || items[0]?.barcode || '',
      productName: product?.name || items[0]?.productName || '',
      providerName: product?.supplier || items[0]?.providerName,
      event: eventType,
      quantity,
      frc,
      nguia,
      destino: destino || DESTINOS[0],
      traspaso,
      observaciones
    };
  }, [product, items, eventType, quantity, frc, nguia, destino, traspaso, observaciones]);

  return {
    sku, setSku,
    product,
    eventType, setEventType,
    quantity, setQuantity,
    frc, setFrc,
    nguia, setNguia,
    destino, setDestino,
    traspaso, setTraspaso,
    observaciones, setObservaciones,
    showAdditional, setShowAdditional,
    isSearching,
    isSubmitting,
    items,
    addItem,
    removeItem,
    resetForm,
    setIsSubmitting,
    getFormData
  };
}
