import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { sanitizeBarcode } from '../../../services/utils';
import { useScanPipeline } from '../../../shared/hooks/useScanPipeline';
import { Product } from '../../../types';
import { SoundFX } from '../../../services/audio';
import { MassiveDbRepository } from '../../../repositories/MassiveDbRepository';
import { productRepository } from '../../../repositories/DexieProductRepository';

export interface HammerItem {
  barcode: string;
  name: string;
  loc?: string;
  totalQuantity: number;
  expectedQty?: number;
  lastTimestamp: number;
  embedding?: number[];
}

export const useHammerLogic = (batchId: string) => {
  const { engine, processScan } = useScanPipeline(1);
  const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('hammer_loc') || 'ZONA-A');
  
  const [optimisticItems, setOptimisticItems] = useState<HammerItem[]>([]);
  const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
  
  // REFS DE ESTABILIZACIÓN: Imprescindibles para que el escáner HID no se resetee
  const multiplierRef = useRef(1);
  const locationRef = useRef(currentLocation);

  useEffect(() => { multiplierRef.current = engine.multiplier; }, [engine.multiplier]);
  useEffect(() => { 
    locationRef.current = currentLocation;
    localStorage.setItem('hammer_loc', currentLocation); 
  }, [currentLocation]);

  const dbItems = useLiveQuery(async () => {
    if (!batchId) return [];
    const [rawScans, manifests] = await Promise.all([
      MassiveDbRepository.getBlindScansByBatch(batchId),
      MassiveDbRepository.getBlindManifestsByBatch(batchId)
    ]);
    
    const uniqueBarcodes = Array.from(new Set([...rawScans.map(s => s.barcode), ...manifests.map(m => m.barcode)]));
    const products = uniqueBarcodes.length > 0 ? await Promise.all(uniqueBarcodes.map(b => productRepository.getById(b))) : [];
    const validProducts = products.filter(p => p !== undefined) as Product[];
    const prodMap = new Map<string, Product>(validProducts.map(p => [p.barcode, p]));
    
    const aggregation = new Map<string, HammerItem>();

    manifests.forEach(m => {
      const pInfo = prodMap.get(m.barcode);
      aggregation.set(m.barcode, {
        barcode: m.barcode,
        name: m.name || pInfo?.name || 'SKU_DESCONOCIDO',
        loc: m.loc,
        totalQuantity: 0,
        expectedQty: m.expectedQty,
        lastTimestamp: 0
      });
    });

    rawScans.forEach(s => {
      const existing = aggregation.get(s.barcode);
      const pInfo = prodMap.get(s.barcode);
      if (existing) {
        existing.totalQuantity += s.quantity;
        existing.lastTimestamp = Math.max(existing.lastTimestamp, s.timestamp);
        if (s.location) existing.loc = s.location;
      } else {
        aggregation.set(s.barcode, {
          barcode: s.barcode,
          name: pInfo?.name || 'SKU_DESCONOCIDO',
          totalQuantity: s.quantity,
          lastTimestamp: s.timestamp,
          loc: s.location
        });
      }
    });

    const sorted = Array.from(aggregation.values()).sort((a, b) => {
      return b.lastTimestamp - a.lastTimestamp;
    });

    return sorted;
  }, [batchId, engine.activeBarcode, engine.feedback]);

  // Sincronizar items optimistas con DB
  useEffect(() => {
    if (dbItems && writeQueue.current.length === 0) {
      setOptimisticItems(dbItems);
    }
  }, [dbItems]);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (writeQueue.current.length === 0) return;
      const batch = [...writeQueue.current];
      writeQueue.current = [];
      try {
        await MassiveDbRepository.bulkAddBlindScans(batch.map(b => ({
          batchId, barcode: b.barcode, quantity: b.qty, location: b.loc, timestamp: b.ts
        })));
      } catch (e) {
        writeQueue.current = [...batch, ...writeQueue.current];
      }
    }, 400);
    return () => clearInterval(timer);
  }, [batchId]);

  const registerScan = useCallback(async (code: string, qtyOverride?: number) => {
    const clean = sanitizeBarcode(code);
    if (!clean) return;
    
    const delta = qtyOverride ?? multiplierRef.current;
    const isManualEdit = qtyOverride !== undefined;
    
    const existingItem = optimisticItems.find(i => i.barcode === clean);
    const ts = (isManualEdit && existingItem) ? existingItem.lastTimestamp : Date.now();
    const currentQty = existingItem?.totalQuantity || 0;

    processScan(
      clean,
      delta,
      currentQty,
      (cleanBarcode, newQty) => {
        // ACTUALIZACIÓN OPTIMISTA DE LA LISTA
        setOptimisticItems(prev => {
          const existingIdx = prev.findIndex(i => i.barcode === cleanBarcode);
          if (existingIdx !== -1) {
            const updated = [...prev];
            const item = { ...updated[existingIdx] };
            item.totalQuantity = newQty;
            item.lastTimestamp = ts;
            updated[existingIdx] = item;
            
            return updated.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
          } else {
            // Nuevo item optimista
            const newItem: HammerItem = {
              barcode: cleanBarcode,
              name: 'Cargando...',
              totalQuantity: newQty,
              lastTimestamp: ts,
              loc: locationRef.current
            };
            return [newItem, ...prev];
          }
        });
      },
      (cleanBarcode, product, newQty) => {
        if (product) {
          setOptimisticItems(current => 
            current.map(i => i.barcode === cleanBarcode ? { ...i, name: product.name } : i)
          );
        }
        writeQueue.current.push({ 
          barcode: cleanBarcode, qty: delta, loc: locationRef.current, ts 
        });
      }
    );
  }, [processScan, optimisticItems]);

  return { 
    state: { 
      items: optimisticItems, 
      activeBarcode: engine.activeBarcode,
      activeProduct: engine.activeProduct,
      feedback: engine.feedback,
      multiplier: engine.multiplier,
      optimisticQty: engine.optimisticQty,
      currentLocation
    },
    actions: { 
      setMultiplier: engine.setMultiplier,
      setCurrentLocation, 
      registerScan, 
      removeItem: async (barcode: string) => {
        if (barcode === 'ALL') {
          if (!confirm("¿Eliminar todos los registros de este bulto?")) return;
          await MassiveDbRepository.deleteBlindScansByBatch(batchId);
          setOptimisticItems([]);
        } else {
          if (!confirm(`¿Eliminar registros de ${barcode}?`)) return;
          await MassiveDbRepository.deleteBlindScan(batchId, barcode);
          setOptimisticItems(prev => prev.filter(i => i.barcode !== barcode));
        }
        engine.actions.triggerFeedback('undo');
      },
      selectItem: async (b: string) => {
        const item = optimisticItems.find(i => i.barcode === b);
        const product = await productRepository.getById(b);
        engine.actions.updateActiveItem(b, product || null, item?.totalQuantity || 0, 0);
      }
    }
  };
};
