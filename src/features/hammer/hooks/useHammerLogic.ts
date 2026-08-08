import { useState, useEffect, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { sanitizeBarcode } from '../../../services/utils';
import { useScanPipeline } from '../../../shared/hooks/useScanPipeline';
import { Product } from '../../../types';
import { HammerDbRepository } from '../../../repositories/HammerDbRepository';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { pushScansToCloud } from '../../../services/hammerSync';
import { logger } from '../../../services/logger';
import { expiryService } from '../../../services/ExpiryService';
import { isFeatureEnabled, toggleFeature, FeatureKey } from '@/config/features';

export interface HammerItem {
  barcode: string;
  name: string;
  loc?: string;
  totalQuantity: number;
  expectedQty?: number;
  lastTimestamp: number;
}

// Estado para modal de vencimiento
export interface AwaitingExpiryState {
  barcode: string;
  name: string;
  quantity: number;
}

export const useHammerLogic = (batchId: string) => {
  const { engine, processScan } = useScanPipeline(1);
  const [currentLocation, setCurrentLocation] = useState(() => localStorage.getItem('hammer_loc') || 'ZONA-A');
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(0); // Contador de writes pendientes
  const [syncError, setSyncError] = useState<string | null>(null); // Último error de sync
  
  // Real-time Cloud Sync setting, defaults to true
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('hammer_auto_sync') !== 'false';
  });
  const autoSyncRef = useRef(autoSyncEnabled);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;

  // Feature flag para registrar fecha de vencimiento
  const registerExpiry = isFeatureEnabled('HAMMER_EXPIRY');
  const registerExpiryRef = useRef(registerExpiry);

  // Estado para el modal de vencimiento
  const [awaitingExpiry, setAwaitingExpiry] = useState<AwaitingExpiryState | null>(null);

  useEffect(() => {
    autoSyncRef.current = autoSyncEnabled;
    localStorage.setItem('hammer_auto_sync', autoSyncEnabled ? 'true' : 'false');
  }, [autoSyncEnabled]);
  
  const [optimisticItems, setOptimisticItems] = useState<HammerItem[]>([]);
  const writeQueue = useRef<{barcode: string, qty: number, loc: string, ts: number}[]>([]);
  
  const multiplierRef = useRef(1);
  const locationRef = useRef(currentLocation);
  const instantaneousQtyRef = useRef(new Map<string, number>());
  
  // Mantener ref actualizado
  useEffect(() => {
    registerExpiryRef.current = isFeatureEnabled('HAMMER_EXPIRY');
  });

  useEffect(() => { multiplierRef.current = engine.multiplier; }, [engine.multiplier]);
  useEffect(() => { 
    locationRef.current = currentLocation;
    localStorage.setItem('hammer_loc', currentLocation); 
  }, [currentLocation]);

  const dbItems = useLiveQuery(async () => {
    if (!batchId) return [];
    
    const [rawScans, manifests] = await Promise.all([
      HammerDbRepository.getBlindScansByBatch(batchId),
      HammerDbRepository.getBlindManifestsByBatch(batchId)
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

    const results = Array.from(aggregation.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    
    // Sync the local instantaneous ref with DB truths
    results.forEach(i => {
      instantaneousQtyRef.current.set(i.barcode, i.totalQuantity);
    });

    return results;
  }, [batchId]);

  useEffect(() => {
    // Only update state if queue empty (no pending optimistic updates are running to DB)
    if (dbItems && writeQueue.current.length === 0) {
      setOptimisticItems(dbItems);
    }
  }, [dbItems]);

  useEffect(() => {
    const timer = setInterval(async () => {
      if (writeQueue.current.length === 0) return;
      
      const batch = [...writeQueue.current];
      writeQueue.current = [];
      setPendingWrites(prev => prev + batch.length);
      
      try {
        const aggregatedBatch = batch.reduce((acc, curr) => {
          const key = `${curr.barcode}_${curr.loc}`;
          if (!acc[key]) {
            acc[key] = { ...curr };
          } else {
            acc[key].qty += curr.qty;
            acc[key].ts = Math.max(acc[key].ts, curr.ts);
          }
          return acc;
        }, {} as Record<string, {barcode: string, qty: number, loc: string, ts: number}>);

        const mergedScans = Object.values(aggregatedBatch).filter(b => b.qty !== 0);

        if (mergedScans.length > 0) {
          await HammerDbRepository.bulkAddBlindScans(mergedScans.map(b => ({
            batchId, barcode: b.barcode, quantity: b.qty, location: b.loc, timestamp: b.ts
          })));
          
          // Actualizar contador de writes completados
          setPendingWrites(prev => Math.max(0, prev - mergedScans.length));
          setSyncError(null);
          retryCountRef.current = 0;

          // Trigger zero-latency cloud push if enabled with retry
          if (autoSyncRef.current) {
            pushWithRetry(batchId).catch((err) => {
              setSyncError('Error de sincronización');
              logger.warn('HammerLogic', 'AutoSync background push failed', { error: String(err) });
            });
          }
        }
      } catch (e) {
        logger.error('HammerLogic', 'Write failed, returning to queue', { error: String(e) });
        writeQueue.current = [...batch, ...writeQueue.current];
        setSyncError('Error de escritura local');
      }
    }, 400);
    return () => clearInterval(timer);
  }, [batchId]);

  // Función de retry con exponential backoff
  const pushWithRetry = async (batchId: string, attempt = 0): Promise<void> => {
    try {
      await pushScansToCloud(batchId);
      retryCountRef.current = 0;
      setSyncError(null);
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return pushWithRetry(batchId, attempt + 1);
      }
      throw err;
    }
  };

  const registerScan = useCallback(async (code: string, qtyOverride?: number) => {
    const clean = sanitizeBarcode(code);
    if (!clean) return;
    
    // Feedback táctil inmediato (si disponible)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    
    const delta = qtyOverride ?? multiplierRef.current;
    const isManualEdit = qtyOverride !== undefined;
    
    const ts = Date.now();
    const currentQty = instantaneousQtyRef.current.get(clean) || 0;

    // Si es edición manual, la nueva cantidad absoluta es la cantidad actual más la diferencia (delta)
    if (isManualEdit) {
      try {
        const finalQty = Math.max(0, currentQty + delta);
        instantaneousQtyRef.current.set(clean, finalQty);
        
        // Actualizamos optimísticamente el estado inmediato para feedback instantáneo
        setOptimisticItems(prev => {
          const idx = prev.findIndex(i => i.barcode === clean);
          if (idx !== -1) {
            const updatedItem = {
              ...prev[idx],
              totalQuantity: finalQty,
              lastTimestamp: ts,
              loc: locationRef.current
            };
            if (idx === 0) {
              const updated = [...prev];
              updated[0] = updatedItem;
              return updated;
            }
            return [updatedItem, ...prev.slice(0, idx), ...prev.slice(idx + 1)];
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

        engine.actions.updateActiveItem(clean, null, finalQty, 0);
        engine.actions.triggerFeedback('success');

        await HammerDbRepository.updateScanQuantity(batchId, clean, finalQty, locationRef.current);
        
        // Background push manual edit immediately if enabled
        if (autoSyncRef.current) {
          pushScansToCloud(batchId).catch((err) => {
            logger.warn('HammerLogic', 'AutoSync manual edit push failed', { error: String(err) });
          });
        }
        
        // Sincronizamos con el motor para que el visor superior muestre el total correcto
        const product = await productRepository.getById(clean);
        engine.actions.updateActiveItem(clean, product || null, finalQty, 0);
      } catch (e) {
        engine.actions.triggerFeedback('error');
        logger.error('HAMMER_EDIT_FAIL', `Error editando ${clean}`);
      }
      return;
    }

    const nextQty = Math.max(0, currentQty + delta);
    instantaneousQtyRef.current.set(clean, nextQty);

    processScan(
      clean,
      delta,
      currentQty,
      (cleanBarcode, newQty) => {
        setOptimisticItems(prev => {
          const existingIdx = prev.findIndex(i => i.barcode === cleanBarcode);
          if (existingIdx !== -1) {
            const updatedItem = { 
              ...prev[existingIdx], 
              totalQuantity: newQty, 
              lastTimestamp: ts 
            };
            if (existingIdx === 0) {
              const updated = [...prev];
              updated[0] = updatedItem;
              return updated;
            }
            return [updatedItem, ...prev.slice(0, existingIdx), ...prev.slice(existingIdx + 1)];
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
        
        // Si está habilitado registerExpiry, mostrar modal de vencimiento
        if (registerExpiryRef.current) {
          setAwaitingExpiry({
            barcode: cleanBarcode,
            name: product?.name || 'Producto',
            quantity: delta,
          });
        }
      }
    );
  }, [processScan, batchId, engine.actions]);

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

  // ========================================================================
  // MANEJO DE VENCIMIENTO (EXPIRY)
  // ========================================================================

  /**
   * Completa el registro de vencimiento para el item actual
   * Si mm/yyyy son 0/9999, se omite el registro (onSkip)
   */
  const handleExpiryComplete = useCallback(async (mm: number, yyyy: number) => {
    if (!awaitingExpiry) return;

    // Si es 0/9999, es un "omitir" - no guardamos vencimiento
    if (mm === 0 && yyyy === 9999) {
      logger.info('HAMMER_EXPIRY_SKIP', `Omitido: ${awaitingExpiry.barcode}`);
    } else {
      // Guardar vencimiento usando ExpiryService
      try {
        await expiryService.save({
          barcode: awaitingExpiry.barcode,
          productName: awaitingExpiry.name,
          mm,
          yyyy,
          quantity: awaitingExpiry.quantity,
          sessionId: batchId,
          location: currentLocation,
        }, {
          skipIfOutOfRange: false,
          silent: true,
        });
        logger.info('HAMMER_EXPIRY_SAVED', `${awaitingExpiry.barcode} → ${mm}/${yyyy}`);
      } catch (err) {
        logger.error('HAMMER_EXPIRY_FAIL', String(err));
      }
    }

    // Limpiar estado y continuar
    setAwaitingExpiry(null);
  }, [awaitingExpiry, batchId, currentLocation]);

  /**
   * Cancela el registro de vencimiento
   * Elimina el scan que se había registrado
   */
  const handleExpiryCancel = useCallback(async () => {
    if (!awaitingExpiry) return;

    // Opcional: eliminar el scan asociado
    await HammerDbRepository.deleteBlindScan(batchId, awaitingExpiry.barcode);
    setOptimisticItems(prev => prev.filter(i => i.barcode !== awaitingExpiry.barcode));
    setAwaitingExpiry(null);
    engine.actions.triggerFeedback('error');
  }, [awaitingExpiry, batchId, engine.actions]);

  return { 
    state: { 
      items: optimisticItems, 
      activeBarcode: engine.activeBarcode,
      activeProduct: engine.activeProduct,
      feedback: engine.feedback,
      multiplier: engine.multiplier,
      optimisticQty: engine.optimisticQty,
      currentLocation,
      isSyncing,
      autoSyncEnabled,
      registerExpiry,
      awaitingExpiry,
      pendingWrites,
      syncError
    },
    actions: { 
      setMultiplier: engine.setMultiplier,
      setCurrentLocation, 
      registerScan, 
      syncToCloud,
      toggleAutoSync: () => setAutoSyncEnabled(p => !p),
      toggleRegisterExpiry: () => toggleFeature('HAMMER_EXPIRY'),
      removeItem: async (barcode: string) => {
        if (barcode === 'ALL') {
          await HammerDbRepository.deleteBlindScansByBatch(batchId);
          setOptimisticItems([]);
        } else {
          await HammerDbRepository.deleteBlindScan(batchId, barcode);
          setOptimisticItems(prev => prev.filter(i => i.barcode !== barcode));
          
          if (autoSyncRef.current) {
            pushScansToCloud(batchId).catch(err => {
              logger.warn('HammerLogic', 'Background sync failed after undo', err instanceof Error ? err.message : String(err));
            });
          }
        }
        engine.actions.triggerFeedback('undo');
      },
      selectItem: async (b: string) => {
        const item = optimisticItems.find(i => i.barcode === b);
        const product = await productRepository.getById(b);
        engine.actions.updateActiveItem(b, product || null, item?.totalQuantity || 0, 0);
      },
      handleExpiryComplete,
      handleExpiryCancel,
    }
  };
};

