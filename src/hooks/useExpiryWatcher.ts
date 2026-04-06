
import { useEffect, useRef } from 'react';
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { auth, db as firestoreDb } from '../lib/firebase';
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
  const { setAlerts } = useExpiryStore();
  const addToast = useToastStore(state => state.addToast);
  const lastCount = useRef<number | null>(null);

  const tableName = settings?.appSheetConfig?.inventoryRegistryTableName || 
                    settings?.appSheetConfig?.expiryTableName || 
                    'VENCIMIENTOS';

  useEffect(() => {
    if (!tableName) return;

    let unsubscribeSnapshot: (() => void) | null = null;

    // We wait for auth to be ready to avoid permission denied errors on startup
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }
        return;
      }

      if (unsubscribeSnapshot) return; // Already subscribed

      const colRef = collection(firestoreDb, tableName);
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(500));

      unsubscribeSnapshot = onSnapshot(q, async (snapshot) => {
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

          const alertItems: any[] = [];

          // 2. Process items to find critical/expired/withdrawal ones
          snapshot.docs.forEach(doc => {
            const exp: any = doc.data();
            
            // Simplified item for status check
            const itemData = {
              id: doc.id,
              barcode: exp[expiryMapping?.barcode || ''] || exp.SKU || exp.COD_BARRAS || exp.barcode || '',
              mm: exp[expiryMapping?.mm || ''] || exp.MM || exp.mm,
              yyyy: exp[expiryMapping?.yyyy || ''] || exp.YYYY || exp.yyyy,
              fechaCC: exp.fechaCC || exp[expiryMapping?.fechaCC || ''],
              productName: exp[expiryMapping?.name || ''] || exp.DESCRIPTOR || exp.DESCRIPCION_PROD || exp.DESCRIPCION || exp.PRODUCTO || exp.ITEM || exp.productName || '',
              quantity: exp[expiryMapping?.quantity || ''] || exp.CANTIDAD || exp.quantity || 0,
              batch: exp[expiryMapping?.batch || ''] || exp.LOTE || exp.batch || 'N/A',
              location: exp[expiryMapping?.location || ''] || exp.UBICACION || exp.location || 'N/A'
            };

            const processed = processExpiryItem(itemData, productMap, providerMap, now);

            if (processed.status === 'critical' || processed.status === 'expired' || processed.status === 'withdrawal') {
              alertItems.push(processed);
            }
          });

          // 3. Update global state
          setAlerts(alertItems.length, alertItems);

          // 4. Notify if count increased (and it's not the first load)
          if (lastCount.current !== null && alertItems.length > lastCount.current) {
            addToast(`Alerta de Vencimientos: Se detectaron ${alertItems.length} lotes que requieren atención.`, 'warning');
          }
          
          lastCount.current = alertItems.length;
        } catch (error) {
          console.error("[ExpiryWatcher] Error processing alerts:", error);
        }
      }, (error) => {
        console.error("[ExpiryWatcher] Firestore connection error:", error);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [tableName, settings, setAlerts, addToast]);
};

// Forced GitHub sync
