import { useMemo, useState, useEffect } from 'react';
import Fuse, { IFuseOptions } from 'fuse.js';

export function useGlobalSearch<T>(
  items: T[],
  keys: string[],
  searchQuery: string,
  options?: Omit<IFuseOptions<T>, 'keys'>
) {
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  // Debounce the search query to improve typing performance
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fuse = useMemo(() => {
    const defaultOptions: IFuseOptions<T> = {
      keys,
      threshold: 0.3, // 0.0 requires perfect match, 1.0 matches anything. 0.3 is a good default for typo tolerance.
      ignoreLocation: true, // Find matches anywhere in the string
      useExtendedSearch: true, // Allows logical operators
      includeScore: true, // Sort by score
      ...options
    };
    return new Fuse(items, defaultOptions);
  }, [items, keys, options]);

  const results = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return items;
    }

    // Split search terms to perform an AND-like fuzzy search natively with fuse.js using extended search syntax if preferred, 
    // or simply pass the query string directly. Fuse's extended search is powerful.
    
    // Normalize and format query for extended search (AND logic on multiple words)
    const terms = debouncedSearch.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(Boolean);
    const extendedQuery = terms.map(term => `'${term}`).join(' '); // Using ' (include-match) to force ALL terms to match partially

    try {
      const searchResults = fuse.search(extendedQuery);
      return searchResults.map(result => result.item);
    } catch {
      // Fallback to simple search if extended search syntax fails
      const searchResults = fuse.search(debouncedSearch);
      return searchResults.map(result => result.item);
    }

  }, [fuse, debouncedSearch, items]);

  return results;
}
