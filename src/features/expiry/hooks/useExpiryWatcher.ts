
import { useEffect, useRef } from 'react'
import { logger } from '@/services/logger';
;
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/stores';
import { useExpiryStore } from '@/stores';
import { useToastStore } from '@/stores';
import { processExpiryItem } from '@/features/expiry/utils/expiryProcessor';
import { productRepository } from '@/repositories/DexieProductRepository';
import { normalizeSku } from '@/shared/utils/common';
import { db } from '@/db';

/**
 * useExpiryWatcher: Background service that monitors the expiry table in Supabase
 * and updates a global badge count. It also triggers notifications for new critical items.
 */
export const useExpiryWatcher = () => {
  const settings = useAppStore(state => state.settings);
  const setAlerts = useExpiryStore(state => state.setAlerts);
  const addToast = useToastStore(state => state.addToast);
  const lastCount = useRef<number | null>(null);
  
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const tableName = settings?.cloudConfig?.inventoryRegistryTableName || 
                    settings?.cloudConfig?.expiryTableName || 
                    'VENCIMIENTOS';

  useEffect(() => {
    if (!tableName) return;

    let channel: any = null;

    const runAnalysis = async () => {
      try {
        if (!navigator.onLine) {
          return;
        }
        // 1. Get remote data from Supabase
        const { data: remoteRows, error } = await supabase
          .from(tableName)
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(500);

        if (error) {
          if (error.message === 'Failed to fetch' || error.message?.includes('NetworkError') || error.message?.includes('net::ERR')) {
            return;
          }
          throw error;
         }
        if (!remoteRows) return;

        // 2. Get context data from local DB
        const [allProducts, allProviders] = await Promise.all([
          productRepository.getAll(),
          db.providers.toArray()
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
        const expiryMapping = settingsRef.current?.cloudConfig?.mappings?.expiry;
        const alertItems: any[] = [];

        // 3. Process items
        remoteRows.forEach((exp: any) => {
          const itemData = {
            id: exp.id || exp.ID,
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

        // 4. Update global state
        setAlerts(alertItems.length, alertItems);

        // 5. Notify if count increased
        if (lastCount.current !== null && alertItems.length > lastCount.current) {
          addToast(`Alerta de Vencimientos: Se detectaron ${alertItems.length} lotes que requieren atención.`, 'warning');
        }
        
        lastCount.current = alertItems.length;
      } catch (err) {
        console.error("[ExpiryWatcher] Analysis error:", err);
      }
    };

    // Subscribirse a cambios en tiempo real para re-ejecutar el análisis
    if (navigator.onLine) {
      channel = supabase
        .channel('expiry_watcher_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
          runAnalysis();
        })
        .subscribe();
    }

    // Ejecución inicial
    runAnalysis();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [tableName, setAlerts, addToast]);
};

