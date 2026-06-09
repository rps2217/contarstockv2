import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { sanitizeBarcode } from '../../../services/utils';
import { useScanPipeline } from '../../../shared/hooks/useScanPipeline';
import { Product } from '../../../types';
import { MassiveDbRepository } from '../../../repositories/MassiveDbRepository';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { pushScansToCloud } from '../../../services/massiveSync';
import { logger } from '../../../services/logger';

export interface HammerItem {
  barcode: string;
  name: string;
  loc?: string;
  totalQuantity: number;
  expectedQty?: number;
  lastTimestamp: number;
}

export const useHammerLogic = (batchId: string) => {
  const { engine, processScan } = useScanPipeline(1);
  const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('hammer_loc') || 'ZONA-A');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [optimisticItems, setOptimisticItems] = useState<HammerItem[]>([]);
  const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
  
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
    const prodMap = new Map<string, Product>(products.filter(p => !!p).map(p => [p!.barcode, p!]));
    
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

    return Array.from(aggregation.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
  }, [batchId, engine.activeBarcode, engine.feedback]);

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
        console.error('[HammerLogic] Write failed, returning to queue', e);
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
    const ts = Date.now();
    const currentQty = existingItem?.totalQuantity || 0;

    // Si es edición manual, la nueva cantidad absoluta es la cantidad actual más la diferencia (delta)
    if (isManualEdit) {
      try {
        const finalQty = Math.max(0, currentQty + delta);
        await MassiveDbRepository.updateScanQuantity(batchId, clean, finalQty, locationRef.current);
        
        // Actualizamos optimísticamente el estado inmediato para feedback instantáneo
        setOptimisticItems(prev => {
          const idx = prev.findIndex(i => i.barcode === clean);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              totalQuantity: finalQty,
              lastTimestamp: ts,
              loc: locationRef.current
            };
            return updated.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
          } else if (finalQty > 0) {
            return [{
              barcode: clean,
              name: 'SKU_DESCONOCIDO',
              totalQuantity: finalQty,
              lastTimestamp: ts,
              loc: locationRef.current
            }, ...prev];
          }
          return prev;
        });

        // Sincronizamos con el motor para que el visor superior muestre el total correcto
        const product = await productRepository.getById(clean);
        engine.actions.updateActiveItem(clean, product || null, finalQty, 0);
        engine.actions.triggerFeedback('success');
      } catch (e) {
        engine.actions.triggerFeedback('error');
        logger.error('HAMMER_EDIT_FAIL', `Error editando ${clean}`);
      }
      return;
    }

    processScan(
      clean,
      delta,
      currentQty,
      (cleanBarcode, newQty) => {
        setOptimisticItems(prev => {
          const existingIdx = prev.findIndex(i => i.barcode === cleanBarcode);
          if (existingIdx !== -1) {
            const updated = [...prev];
            updated[existingIdx] = { 
              ...updated[existingIdx], 
              totalQuantity: newQty, 
              lastTimestamp: ts 
            };
            return updated.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
          } else {
            return [{
              barcode: cleanBarcode,
              name: 'Cargando...',
              totalQuantity: newQty,
              lastTimestamp: ts,
              loc: locationRef.current
            }, ...prev];
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
  }, [processScan, optimisticItems, batchId]);

  const syncToCloud = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await pushScansToCloud(batchId);
      engine.actions.triggerFeedback('success');
    } catch (e) {
      engine.actions.triggerFeedback('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return { 
    state: { 
      items: optimisticItems, 
      activeBarcode: engine.activeBarcode,
      activeProduct: engine.activeProduct,
      feedback: engine.feedback,
      multiplier: engine.multiplier,
      optimisticQty: engine.optimisticQty,
      currentLocation,
      isSyncing
    },
    actions: { 
      setMultiplier: engine.setMultiplier,
      setCurrentLocation, 
      registerScan, 
      syncToCloud,
      removeItem: async (barcode: string) => {
        if (barcode === 'ALL') {
          await MassiveDbRepository.deleteBlindScansByBatch(batchId);
          setOptimisticItems([]);
        } else {
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

