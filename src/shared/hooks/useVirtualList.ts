/**
 * useVirtualList - Hook para virtualización de listas
 * 
 * Implementa windowing para renderizar eficientemente listas grandes.
 * Solo renderiza los elementos visibles en el viewport.
 * 
 * @example
 * ```tsx
 * const {
 *   virtualItems,
 *   totalSize,
 *   scrollTo,
 *   containerRef
 * } = useVirtualList({
 *   items: products,
 *   itemHeight: 72,
 *   overscan: 5,
 * });
 * ```
 */

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';

export interface UseVirtualListOptions<T> {
  /** Items a renderizar */
  items: T[];
  /** Altura estimada de cada item */
  itemHeight?: number;
  /** Número de items extra a renderizar fuera del viewport */
  overscan?: number;
  /** Scroll container ref */
  containerRef?: React.RefObject<HTMLElement>;
  /** Scroll position inicial */
  initialScrollOffset?: number;
}

export interface UseVirtualListReturn<T> {
  /** Items visibles para renderizar */
  virtualItems: VirtualItem<T>[];
  /** Tamaño total del contenido */
  totalSize: number;
  /** Scroll a una posición específica */
  scrollTo: (index: number) => void;
  /** Scroll al inicio */
  scrollToTop: () => void;
  /** Scroll al final */
  scrollToBottom: () => void;
  /** Ref del contenedor */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Medida estimada del item */
  estimatedItemHeight: number;
  /** Rango de items visibles */
  visibleRange: { start: number; end: number };
}

export interface VirtualItem<T> {
  /** Índice en la lista original */
  index: number;
  /** Item de datos */
  data: T;
  /** Posición vertical start */
  start: number;
  /** Posición vertical end */
  end: number;
  /** Estilo para el item */
  style: React.CSSProperties;
}

// Hook principal de virtualización
export function useVirtualList<T>({
  items,
  itemHeight = 72,
  overscan = 3,
  containerRef: externalContainerRef,
  initialScrollOffset = 0,
}: UseVirtualListOptions<T>): UseVirtualListReturn<T> {
  
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  
  const [scrollTop, setScrollTop] = useState(initialScrollOffset);
  const [containerHeight, setContainerHeight] = useState(0);

  // Medir altura del contenedor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measureHeight = () => {
      const rect = el.getBoundingClientRect();
      const height = window.innerHeight - rect.top;
      setContainerHeight(height > 0 ? height : rect.height);
    };

    measureHeight();

    const resizeObserver = new ResizeObserver(measureHeight);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  // Manejar scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calcular items virtuales
  const { virtualItems, totalSize, visibleRange } = useMemo(() => {
    if (!containerHeight || items.length === 0) {
      return {
        virtualItems: [],
        totalSize: 0,
        visibleRange: { start: 0, end: 0 },
      };
    }

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const endIndex = Math.min(items.length - 1, startIndex + visibleCount + overscan * 2);

    const virtuals: VirtualItem<T>[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const start = i * itemHeight;
      virtuals.push({
        index: i,
        data: items[i],
        start,
        end: start + itemHeight,
        style: {
          position: 'absolute',
          top: start,
          left: 0,
          right: 0,
          height: itemHeight,
        },
      });
    }

    return {
      virtualItems: virtuals,
      totalSize: items.length * itemHeight,
      visibleRange: { start: startIndex, end: endIndex },
    };
  }, [items, scrollTop, containerHeight, itemHeight, overscan]);

  // Scroll a índice específico
  const scrollTo = useCallback((index: number) => {
    const el = containerRef.current;
    if (!el) return;
    
    const targetScroll = index * itemHeight;
    el.scrollTop = targetScroll;
  }, [containerRef, itemHeight]);

  // Scroll al inicio
  const scrollToTop = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [containerRef]);

  // Scroll al final
  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = totalSize - containerHeight;
  }, [containerRef, totalSize, containerHeight]);

  return {
    virtualItems,
    totalSize,
    scrollTo,
    scrollToTop,
    scrollToBottom,
    containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    estimatedItemHeight: itemHeight,
    visibleRange,
  };
}

/**
 * useDynamicVirtualList - Versión con alturas dinámicas
 * Útil cuando los items tienen alturas variables.
 */
export function useDynamicVirtualList<T>({
  items,
  estimatedItemHeight = 72,
  overscan = 3,
  containerRef: externalContainerRef,
}: Omit<UseVirtualListOptions<T>, 'itemHeight'>) {
  
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = externalContainerRef || internalContainerRef;
  
  // Cache de alturas de items
  const itemHeights = useRef<Map<number, number>>(new Map());
  
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Medir altura del contenedor
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measureHeight = () => {
      const rect = el.getBoundingClientRect();
      setContainerHeight(rect.height);
    };

    measureHeight();

    const resizeObserver = new ResizeObserver(measureHeight);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  // Calcular offsets cumulativos
  const offsets = useMemo(() => {
    const result: number[] = [0];
    let currentOffset = 0;

    for (let i = 0; i < items.length; i++) {
      const height = itemHeights.current.get(i) || estimatedItemHeight;
      currentOffset += height;
      result.push(currentOffset);
    }

    return result;
  }, [items.length, estimatedItemHeight]);

  // Calcular total height
  const totalHeight = useMemo(() => {
    return offsets[offsets.length - 1] || 0;
  }, [offsets]);

  // Encontrar índice visible
  const findIndex = useCallback((scrollPosition: number): number => {
    let low = 0;
    let high = offsets.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (offsets[mid] <= scrollPosition) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return Math.max(0, low - 1);
  }, [offsets]);

  // Calcular items visibles
  const { virtualItems, visibleRange } = useMemo(() => {
    if (!containerHeight || items.length === 0) {
      return {
        virtualItems: [],
        visibleRange: { start: 0, end: 0 },
      };
    }

    const startIndex = Math.max(0, findIndex(scrollTop) - overscan);
    const endScroll = scrollTop + containerHeight;
    const endIndex = Math.min(items.length - 1, findIndex(endScroll) + overscan);

    const virtuals: VirtualItem<T>[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const start = offsets[i];
      const height = itemHeights.current.get(i) || estimatedItemHeight;
      
      virtuals.push({
        index: i,
        data: items[i],
        start,
        end: start + height,
        style: {
          position: 'absolute',
          top: start,
          left: 0,
          right: 0,
          minHeight: height,
        },
      });
    }

    return {
      virtualItems: virtuals,
      visibleRange: { start: startIndex, end: endIndex },
    };
  }, [items, scrollTop, containerHeight, offsets, estimatedItemHeight, overscan, findIndex]);

  // Medir altura de item (para usar con ref en elementos)
  const measureItem = useCallback((index: number, height: number) => {
    if (height > 0 && height !== itemHeights.current.get(index)) {
      itemHeights.current.set(index, height);
    }
  }, []);

  return {
    virtualItems,
    totalSize: totalHeight,
    scrollTo: (index: number) => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTop = offsets[index] || 0;
    },
    scrollToTop: () => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTop = 0;
    },
    scrollToBottom: () => {
      const el = containerRef.current;
      if (!el) return;
      el.scrollTop = totalHeight;
    },
    containerRef: containerRef as React.RefObject<HTMLDivElement | null>,
    estimatedItemHeight,
    visibleRange,
    measureItem,
  };
}

export default useVirtualList;