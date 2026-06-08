import { useState, useEffect, useCallback, useMemo } from 'react';
import { Provider } from '../../../types';
import { ProviderRepository } from '../../../repositories/ProviderRepository';

export type FilterMode = 'all' | 'withExchange' | 'withoutExchange';

export const useProvidersQuery = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showFilters, setShowFilters] = useState(false);

  const loadProviders = useCallback(async () => {
    const data = await ProviderRepository.getAll();
    data.sort((a, b) => a.name.localeCompare(b.name));
    setProviders(data);
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.rut.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      
      if (filterMode === 'withExchange') return p.hasExchange === true;
      if (filterMode === 'withoutExchange') return p.hasExchange === false;
      return true;
    });
  }, [providers, search, filterMode]);

  const activeFiltersCount = (filterMode !== 'all' ? 1 : 0);

  return {
    providers,
    search,
    setSearch,
    filterMode,
    setFilterMode,
    showFilters,
    setShowFilters,
    filteredProviders,
    activeFiltersCount,
    loadProviders
  };
};
