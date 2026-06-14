import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { expiryRepository } from '../../../repositories/ExpiryRepository';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { ProviderRepository } from '../../../repositories/ProviderRepository';
import { processExpiryItem, filterExpiryItems, calculateExpiryStats } from '../utils/expiryProcessor';
import { useGlobalSearch } from '../../../hooks/useGlobalSearch';
import { normalizeSku, normalizeIdentity } from '../../../services/utils';
import { normalizeExpiryRecord } from '../../../services/normalizationService';
import { ExpiryItem } from '../../../store/useExpiryStore';

export const useExpiryQuery = (
  tableName: string,
  settings: any,
  expiryMapping: any,
  searchQuery: string,
  selectedCategories: string[],
  selectedCanje: string,
  actionPeriod: string,
  customDateRange: any,
  creationDateRange: any,
  selectedStatuses: string[],
  preferences: any
) => {
  const localItems = useLiveQuery(() => expiryRepository.getAll(tableName), [tableName]) || [];
  const allProducts = useLiveQuery(() => productRepository.getAll(), []) || [];
  const allProviders = useLiveQuery(() => ProviderRepository.getAll(), []) || [];
  
  const productMap = useMemo(() => {
    if (!allProducts.length) return new Map();
    const map = new Map();
    allProducts.forEach(p => {
      const sku = normalizeSku(p.barcode);
      if (sku) map.set(sku, p);
    });
    return map;
  }, [allProducts]);

  const providerMap = useMemo(() => {
    if (!allProviders.length) return new Map();
    const map = new Map();
    allProviders.forEach(p => {
      const rut = normalizeIdentity(p.rut);
      if (rut) map.set(rut, p);
      if (p.name) {
        map.set(normalizeIdentity(p.name), p);
      }
    });
    return map;
  }, [allProviders]);

  const baseProcessedData = useMemo(() => {
    const now = new Date();
    const defaultWithdrawalDays = settings?.withdrawalDaysDefault ?? 30;
    const dedupMap = new Map<string, ExpiryItem>();
    const windowSize = 500;
    const itemsToProcess = localItems.length > windowSize 
      ? [...localItems].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, windowSize)
      : localItems;

    itemsToProcess.forEach(record => {
      const normalized = normalizeExpiryRecord(record, expiryMapping);
      const processed = processExpiryItem(
        normalized, 
        productMap, 
        providerMap, 
        now,
        defaultWithdrawalDays
      );

      const key = processed.claveUnica || processed.id;
      const existing = dedupMap.get(key);
      
      if (existing) {
        if (existing.id !== processed.id) {
           existing.quantity += processed.quantity;
           if (processed.observaciones && processed.observaciones !== existing.observaciones) {
               existing.observaciones = existing.observaciones ? `${existing.observaciones} | ${processed.observaciones}` : processed.observaciones;
           }
           if (processed.timestamp > (existing.timestamp || 0)) {
             existing.timestamp = processed.timestamp;
           }
        } else {
           if (processed.timestamp > (existing.timestamp || 0)) {
             dedupMap.set(key, processed);
           }
        }
      } else {
        dedupMap.set(key, { ...processed });
      }
    });

    return Array.from(dedupMap.values());
  }, [localItems, expiryMapping, productMap, providerMap, settings?.withdrawalDaysDefault]);

  const searchResults = useGlobalSearch(baseProcessedData, [
    'barcode',
    'productName',
    'providerName',
    'batch',
    'frc',
    'observaciones'
  ], searchQuery);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    baseProcessedData.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, [baseProcessedData]);

  const contextFilteredData = useMemo(() => {
    return filterExpiryItems(searchResults, {
      query: '', 
      selectedCategories,
      selectedCanje,
      actionPeriod: actionPeriod as any,
      customDateRange,
      creationDateRange
    });
  }, [searchResults, selectedCategories, selectedCanje, actionPeriod, customDateRange, creationDateRange]);

  const processedData = useMemo((): ExpiryItem[] => {
    const filtered = contextFilteredData.filter(item => {
      if (selectedStatuses.length > 0) {
        if (!selectedStatuses.includes(item.status)) return false;
      } else {
        if (preferences.hideExpiredByDefault && item.status === 'expired') return false;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      if (preferences.defaultSort === 'withdrawal') {
        const dateA = a.withdrawalDate?.getTime() || Infinity;
        const dateB = b.withdrawalDate?.getTime() || Infinity;
        if (dateA !== dateB) return dateA - dateB;
      } else {
        const dateA = a.expiryDateObj?.getTime() || Infinity;
        const dateB = b.expiryDateObj?.getTime() || Infinity;
        if (dateA !== dateB) return dateA - dateB;
      }

      if (a.barcode !== b.barcode) {
        return a.barcode.localeCompare(b.barcode);
      }
      return a.id.localeCompare(b.id);
    }).map(item => {
      const maxLifeDays = 730; 
      const percent = Math.max(0, Math.min(100, (item.daysLeft / maxLifeDays) * 100));
      return { ...item, lifePercent: percent };
    });
  }, [contextFilteredData, selectedStatuses, preferences.hideExpiredByDefault, preferences.defaultSort]);

  const stats = useMemo(() => calculateExpiryStats(contextFilteredData), [contextFilteredData]);

  return {
    localItems, // needed for mutations
    baseProcessedData,
    processedData,
    categories,
    stats
  };
};
