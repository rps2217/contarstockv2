import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { db } from '../../../db';
import { Product, Provider } from '../../../types';
import { fuzzySearchProducts } from '../../../services/search';
import { normalizeIdentity } from '../../../services/utils';

export const useProductQuery = (searchQuery: string, policyFilter: 'all' | 'exchange' | 'loss' | 'no_info') => {
  const norm = normalizeIdentity;

  const stats = useLiveQuery(async () => {
    const { total, synced } = await productRepository.getQuickStats();
    if (total === 0) return { trainedPercent: 0, backedUpPercent: 0, missingVectors: 0 };

    return {
      trainedPercent: 100,
      backedUpPercent: Math.round((synced / total) * 100),
      missingVectors: 0
    };
  }, []);

  const products = useLiveQuery(async () => {
    let baseProducts: Product[];
    if (!searchQuery) {
      baseProducts = await productRepository.getLimited(policyFilter === 'all' ? 200 : 1000); 
    } else {
      baseProducts = await productRepository.search(searchQuery, 200);
      if (baseProducts.length === 0 && searchQuery.length > 3) {
        const sample = await productRepository.getLimited(2000);
        baseProducts = await fuzzySearchProducts(sample, searchQuery, 200);
      }
    }

    const providers = await db.providers.toArray();
    const providerMapByRut = new Map<string, Provider>();
    const providerMapByName = new Map<string, Provider>();
    
    providers.forEach(p => {
      if (p.rut) providerMapByRut.set(norm(p.rut), p);
      if (p.name) providerMapByName.set(norm(p.name), p);
    });

    const mappedProducts = baseProducts.map((p: Product) => {
      const pRut = p.supplierRut ? norm(p.supplierRut) : null;
      const pName = p.supplier ? norm(p.supplier) : null;
      
      const provider = (pRut ? providerMapByRut.get(pRut) : null) || 
                       (pName ? providerMapByName.get(pName) : null);
      
      return {
        ...p,
        withdrawalDays: provider?.withdrawalDays,
        hasExchange: provider?.hasExchange,
        exchangePolicy: provider?.exchangePolicy
      } as any;
    });

    if (policyFilter === 'all') return mappedProducts;

    return mappedProducts.filter(p => {
      if (policyFilter === 'exchange') return p.hasExchange === true;
      if (policyFilter === 'loss') return p.hasExchange === false && p.withdrawalDays !== undefined;
      if (policyFilter === 'no_info') return p.withdrawalDays === undefined;
      return true;
    });
  }, [searchQuery, policyFilter], []);

  const pendingChangesCount = useLiveQuery(() => productRepository.getPendingSyncCount(), [], 0);

  return {
    products,
    stats,
    pendingChangesCount
  };
};
