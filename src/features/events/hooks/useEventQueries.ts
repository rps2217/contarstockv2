/**
 * useEventQueries - Hook para consulta de datos de eventos
 * 
 * Maneja la obtención inicial de datos y suscripción en tiempo real.
 * Usa cache centralizado para evitar recargas excesivas.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { supabaseSyncService } from '../../../services/supabaseSyncService';
import { useAppStore } from '@/stores';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { eventRepository } from '../../../repositories/EventRepository';
import { normalizeSku } from '../../../services/utils';
import { Product } from '../../../types';
import { logger } from '../../../services/logger';
import { useCloudCache, clearCache } from '@/shared/hooks/useCloudCache';

// Cache key para sync de eventos
const EVENTS_CACHE_KEY = 'events-initial-sync';

export interface ProcessedEvent {
  id: string;
  barcode: string;
  productName: string;
  providerName: string;
  event: string;
  quantity: number;
  location: string;
  frc: string;
  nguia: string;
  destino: string;
  traspaso: string;
  observaciones: string;
  timestamp: number;
  claveUnica: string;
  category: string;
  isAdjusted: boolean;
  syncStatus: string;
}

interface FieldMapping {
  barcode?: string;
  name?: string;
  supplier?: string;
  quantity?: string;
  location?: string;
  frc?: string;
  nguia?: string;
  destino?: string;
  traspaso?: string;
  observaciones?: string;
  event?: string;
}

interface CloudConfig {
  eventsTableName?: string;
  mappings?: {
    events?: FieldMapping;
  };
}

interface UseEventQueriesReturn {
  // Estado
  isSyncing: boolean;
  localEvents: ReturnType<typeof eventRepository.getAll> extends Promise<infer T> ? T : never;
  allProducts: ReturnType<typeof productRepository.getAll> extends Promise<infer T> ? T : never;
  tableName: string;
  
  // Datos procesados
  processedEvents: ProcessedEvent[];
  productMap: Map<string, Product>;
}

export function useEventQueries(): UseEventQueriesReturn {
  const { settings } = useAppStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const tableName = settings?.cloudConfig?.eventsTableName || 'EVENTOS';

  // Queries reactivas con Dexie
  const localEvents = useLiveQuery(() => eventRepository.getAll(), []) || [];
  const allProducts = useLiveQuery(() => productRepository.getAll(), []) || [];

  // Mapa de productos para lookup rápido
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    if (!allProducts) return map;
    for (let i = 0; i < allProducts.length; i++) {
      const p = allProducts[i];
      const sku = normalizeSku(p.barcode);
      if (sku) map.set(sku, p);
    }
    return map;
  }, [allProducts]);

  // Fetcher para sync de eventos
  const fetchEventsSync = useCallback(async () => {
    const { rows, error } = await supabaseSyncService.pullBatch(tableName);
    if (error) throw new Error(error);
    if (rows && rows.length > 0) {
      await eventRepository.bulkSave(rows.map((item: Record<string, unknown>) => ({ 
        ...item, 
        syncStatus: 'synced' 
      }) as any));
      logger.info('SYNC_INITIAL_EVENTS', `Cargados ${rows.length} eventos desde Supabase`);
    }
    return { success: true, count: rows?.length || 0 };
  }, [tableName]);

  // Usar cache centralizado
  const { isLoading: isCacheLoading, refresh: refreshCache } = useCloudCache(
    EVENTS_CACHE_KEY,
    fetchEventsSync,
    { ttl: 3 * 60 * 1000 } // 3 minutos
  );

  // Sincronización inicial y suscripción en tiempo real
  useEffect(() => {
    setIsSyncing(isCacheLoading);

    const unsubscribe = supabaseSyncService.startSync(
      tableName, 
      eventRepository as unknown as Parameters<typeof supabaseSyncService.startSync>[1]
    );
    return () => {
      unsubscribe();
    };
  }, [tableName, isCacheLoading]);

  // Procesamiento de eventos con mapeo de campos
  const processedEvents = useMemo(() => {
    const eventMapping = settings?.cloudConfig?.mappings?.events;
    
    const windowSize = 500;
    const items = (localEvents || []).length > windowSize
      ? [...(localEvents || [])].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, windowSize)
      : (localEvents || []);
      
    const result: ProcessedEvent[] = [];

    for (let i = 0; i < items.length; i++) {
      const record = items[i];
      // Cast para acceso con strings dinámicos (mapeo de campos)
      const exp = record as unknown as Record<string, unknown>;
      
      const getField = (mappingKey: string | undefined, fallbacks: string[]) => {
        if (mappingKey && exp[mappingKey] !== undefined && String(exp[mappingKey]).trim() !== '') {
          return exp[mappingKey];
        }
        for (const key of fallbacks) {
          if (exp[key] !== undefined && String(exp[key]).trim() !== '') {
            return exp[key];
          }
        }
        if (mappingKey && exp[mappingKey] !== undefined) {
          return exp[mappingKey];
        }
        for (const key of fallbacks) {
          if (exp[key] !== undefined) return exp[key];
        }
        return undefined;
      };

      const eventValue = getField(eventMapping?.event, ['EVENTO', 'evento', 'event', 'EVENT', 'Tipo', 'TIPO', 'MOTIVO', 'motivo']) || 'OTRO';
      
      if (String(eventValue || "").toUpperCase() === 'VENCIMIENTOS') continue;

      const barcode = String(getField(eventMapping?.barcode, ['SKU', 'sku', 'barcode', 'BARCODE', 'codigo', 'CODIGO', 'Codigo', 'EAN', 'ean', 'UPC', 'upc']) || '').trim();
      const product = productMap.get(normalizeSku(barcode));
      
      const productName = String(product?.name || 
        getField(eventMapping?.name, ['DESCRIPTOR', 'descriptor', 'productName', 'PRODUCTO', 'producto', 'Name', 'name', 'DESCRIPCION', 'descripcion']) || 
        'Producto Desconocido');
        
      const providerName = String(product?.supplier || 
        getField(eventMapping?.supplier, ['PROVEEDOR', 'proveedor', 'supplier', 'SUPPLIER', 'Proveedor', 'Provider', 'FABRICANTE', 'fabricante']) || 
        'N/A');
      
      const quantityValue = getField(eventMapping?.quantity, ['CANTIDAD', 'cantidad', 'quantity', 'QUANTITY', 'Cant', 'CANT', 'QTY', 'qty']) || 0;
      const locationValue = getField(eventMapping?.location, ['UBICACION', 'ubicacion', 'location', 'LOCATION', 'Ubic', 'UBIC', 'SITIO', 'sitio']) || 'GENERAL';
      const frcValue = getField(eventMapping?.frc, ['FRC', 'frc', 'folio', 'FOLIO', 'folio_frc', 'FOLIO_FRC', 'Folio', 'FRC_FOLIO', 'folio_frc']) || '';
      const nguiaValue = getField(eventMapping?.nguia, ['nguia', 'NGUIA', 'guia', 'GUIA', 'n_guia', 'N_GUIA', 'GUIA_NUM', 'guia_num']) || '';
      const destinoValue = getField(eventMapping?.destino, ['DESTINO', 'destino', 'Destino', 'BODEGA', 'bodega']) || '';
      const traspasoValue = getField(eventMapping?.traspaso, ['DOC-TRAS-INTER', 'TRASPASO', 'traspaso', 'Traspaso', 'N_TRASPASO', 'n_traspaso']) || '';
      const observacionesValue = getField(eventMapping?.observaciones, ['OBSERVACIONES', 'observaciones', 'Observaciones', 'OBS', 'obs', 'NOTAS', 'notas']) || '';
      
      const hasTraspaso = !!(traspasoValue && String(traspasoValue).trim() !== '');

      result.push({
        id: record.id,
        barcode,
        productName,
        providerName,
        event: eventValue as string,
        quantity: quantityValue as number,
        location: locationValue as string,
        frc: frcValue as string,
        nguia: nguiaValue as string,
        destino: destinoValue as string,
        traspaso: traspasoValue as string,
        observaciones: observacionesValue as string,
        timestamp: record.timestamp || Date.now(),
        claveUnica: (exp as unknown as Record<string, unknown>).claveUnica as string || record.id,
        category: product?.category || 'GENERAL',
        isAdjusted: hasTraspaso,
        syncStatus: (record as unknown as Record<string, unknown>).syncStatus as string || 'synced',
      });
    }

    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [localEvents, settings?.cloudConfig?.mappings?.events, productMap]);

  return {
    isSyncing,
    localEvents,
    allProducts,
    tableName,
    processedEvents,
    productMap,
  };
}
