
import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';
import { useAppStore } from '../store/mainAppStore';
import { useExpiryStore } from '../store/useExpiryStore';
import { useToastStore } from '../store/useToastStore';
import { processExpiryItem } from '../features/expiry/utils/expiryProcessor';
import { productRepository } from '../repositories/DexieProductRepository';
import { normalizeSku } from '../services/utils';
import { db as dexieDb } from '../db';

/**
 * useExpiryWatcher: Background service that monitors the expiry collection
 * and updates a global badge count. It also triggers notifications for new critical items.
 */
export const useExpiryWatcher = () => {
  const { settings } = useAppStore();
  const { setAlertCount } = useExpiryStore();
  const addToast = useToastStore(state => state.addToast);
  const lastCount = useRef<number | null>(null);

  const tableName = settings?.appSheetConfig?.inventoryRegistryTableName || 
                    settings?.appSheetConfig?.expiryTableName || 
                    'VENCIMIENTOS';

  useEffect(() => {
    if (!tableName) return;

    const colRef = collection(firestoreDb, tableName);
    // We only need a subset to check for alerts, but let's take enough to be accurate
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(500));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        // 1. Get context data from local DB
        const [allProducts, allProviders] = await Promise.all([
          productRepository.getAll(),
          dexieDb.providers.toArray()
        ]);

        const productMap = new Map();
        allProducts.forEach(p => {
          const sku = normalizeSku(p.barcode);
          if (sku) productMap.set(sku, p);
        });

        const providerMap = new Map();
        allProviders.forEach(p => {
          const rut = normalizeSku(p.rut);
          if (rut) providerMap.set(rut, p);
        });

        const now = new Date();
        const expiryMapping = settings?.appSheetConfig?.mappings?.expiry;

        let criticalCount = 0;

        // 2. Process items to find critical/expired ones
        snapshot.docs.forEach(doc => {
          const exp: any = doc.data();
          
          // Simplified item for status check
          const itemData = {
            id: doc.id,
            barcode: exp[expiryMapping?.barcode || ''] || exp.SKU || exp.COD_BARRAS || exp.barcode || '',
            mm: exp[expiryMapping?.mm || ''] || exp.MM || exp.mm,
            yyyy: exp[expiryMapping?.yyyy || ''] || exp.YYYY || exp.yyyy,
            fechaCC: exp.fechaCC || exp[expiryMapping?.fechaCC || '']
          };

          const processed = processExpiryItem(itemData, productMap, providerMap, now);

          if (processed.status === 'critical' || processed.status === 'expired') {
            criticalCount++;
          }
        });

        // 3. Update global state
        setAlertCount(criticalCount);

        // 4. Notify if count increased (and it's not the first load)
        if (lastCount.current !== null && criticalCount > lastCount.current) {
          addToast(`Alerta de Vencimientos: Se detectaron ${criticalCount} lotes críticos.`, 'warning');
        }
        
        lastCount.current = criticalCount;
      } catch (error) {
        console.error("[ExpiryWatcher] Error processing alerts:", error);
      }
    }, (error) => {
      console.error("[ExpiryWatcher] Firestore connection error:", error);
    });

    return () => unsubscribe();
  }, [tableName, settings, setAlertCount, addToast]);
};

// Forced GitHub sync
