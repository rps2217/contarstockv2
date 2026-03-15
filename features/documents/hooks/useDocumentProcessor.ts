import { useState, useCallback } from 'react';
import * as documentProcessor from '../../../services/documentProcessor';
import { SoundFX } from '../../../services/audio';
import { db } from '../../../db';

export const useDocumentProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const processDocument = useCallback(async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const data = await documentProcessor.parseGuidePDF(base64, mimeType);
      if (data && data.erpOrder && data.items) {
        setResult((prev: any) => {
          if (!prev) return data;
          const existingBarcodes = new Set(prev.items.map((i: any) => i.barcode));
          const uniqueNewItems = data.items.filter((i: any) => !existingBarcodes.has(i.barcode));
          return {
            ...prev,
            items: [...prev.items, ...uniqueNewItems]
          };
        });
        SoundFX.play('success');
      } else {
        throw new Error("La IA no pudo detectar una tabla de productos clara. Intente con una foto más cercana.");
      }
    } catch (err: any) {
      setError(err.message || "Error procesando documento");
      SoundFX.play('error');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!result) return;
    try {
      await db.expectedOrders.put({
        id: result.erpOrder,
        internalId: result.erpOrder,
        items: result.items,
        totalExpectedUnits: result.items.reduce((acc: number, item: any) => acc + item.expectedQty, 0),
        totalExpectedSKUs: result.items.length,
        importedAt: Date.now()
      });
      SoundFX.play('success');
      setResult(null);
      alert("Orden guardada exitosamente");
      return true;
    } catch (error) {
      console.error("Error saving expected order:", error);
      alert("Error al guardar la orden");
      return false;
    }
  }, [result]);

  const handleItemChange = useCallback((index: number, field: string, value: string | number) => {
    setResult((prev: any) => {
      if (!prev) return null;
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setResult((prev: any) => {
      if (!prev) return null;
      const newItems = prev.items.filter((_: any, i: number) => i !== index);
      return { ...prev, items: newItems };
    });
  }, []);

  const clearResults = useCallback(() => {
    if (window.confirm("¿Está seguro de borrar todos los ítems extraídos?")) {
      setResult(null);
    }
  }, []);

  const setErpOrder = useCallback((val: string) => {
    setResult((prev: any) => prev ? ({ ...prev, erpOrder: val }) : null);
  }, []);

  return {
    isProcessing,
    result,
    error,
    setError,
    processDocument,
    handleSave,
    handleItemChange,
    handleRemoveItem,
    clearResults,
    setErpOrder,
    setResult
  };
};
