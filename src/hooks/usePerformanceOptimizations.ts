/**
 * usePerformanceOptimizations - Hook para optimizar performance de la aplicación
 *
 * Proporciona:
 * - Debounce y throttle utilities
 * - Memoización avanzada
 * - Virtualización para listas grandes
 * - Preload de recursos
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { logger } from '@/services/logger';
// ============================================================
// UTILIDADES DE OPTIMIZACIÓN
// ============================================================

/**
 * useDebounce - Retrasa la actualización de un valor
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useThrottle - Limita la frecuencia de ejecución de una función
 */
export function useThrottle<T extends (...args: any[]) => any>(callback: T, delay: number): T {
  // Usar useState con inicialización lazy para evitar función impura
  const [lastRan, setLastRan] = useState<number>(() => Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const throttledFn = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRan;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        setLastRan(now);
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          setLastRan(Date.now());
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay, lastRan]
  );

  return throttledFn as T;
}

/**
 * useIntersectionObserver - Detecta cuando un elemento entra en el viewport
 */
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          setHasIntersected(true);
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);

  return { isIntersecting, hasIntersected };
}

/**
 * usePreloadResources - Precarga recursos para mejorar perceived performance
 */
export function usePreloadResources() {
  const preloadImage = useCallback((src: string) => {
    const img = new Image();
    img.src = src;
  }, []);

  const preloadFont = useCallback((fontFamily: string, fontUrl: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.href = fontUrl;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }, []);

  const preloadModule = useCallback(async (importFn: () => Promise<any>) => {
    try {
      await importFn();
    } catch (e) {
      logger.warn(
        'usePerformanceOptimizations',
        'Failed to preload module',
        e instanceof Error ? e.message : String(e)
      );
    }
  }, []);

  return { preloadImage, preloadFont, preloadModule };
}

/**
 * useVirtualScroll - Virtualización simple para listas
 */
export function useVirtualScroll<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    totalHeight,
    visibleItems,
    startIndex,
    offsetY,
    onScroll,
    totalItems: items.length,
  };
}

/**
 * useMediaQuery - Hook para responsive design
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * useIsMobile - Detecta si es dispositivo móvil
 */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 768px)');
}

/**
 * useIsTablet - Detecta si es tablet
 */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
}

/**
 * useIsDesktop - Detecta si es desktop
 */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)');
}

/**
 * useReducedMotion - Detecta preferencia de movimiento reducido
 */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * useIdleCallback - Ejecuta código cuando el navegador está idle
 */
export function useIdleCallback(callback: () => void, options?: { timeout?: number }) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (typeof requestIdleCallback !== 'undefined') {
      const id = requestIdleCallback(() => {
        callbackRef.current();
      }, options);

      return () => cancelIdleCallback(id);
    } else {
      // Fallback para Safari
      timeoutRef.current = setTimeout(() => {
        callbackRef.current();
      }, options?.timeout || 1000);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [options]);
}

/**
 * useMemoCompare - Memoización con comparación personalizada
 */
export function useMemoCompare<T>(value: T, compare: (prev: T | undefined, curr: T) => boolean): T {
  const prevRef = useRef<T | undefined>(undefined);
  const prev = prevRef.current;
  const isEqual = compare(prev, value);

  useEffect(() => {
    prevRef.current = value;
  });

  return isEqual ? prev! : value;
}
