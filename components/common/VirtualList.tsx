
import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Package } from 'lucide-react';

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderRow: React.ComponentType<{ index: number; data: any; style?: React.CSSProperties }>;
    rowData?: any;
    onEndReached?: () => void;
    endReachedThreshold?: number; 
    className?: string;
    emptyState?: React.ReactNode;
}

/**
 * MOTOR DE VIRTUALIZACIÓN INDUSTRIAL v2.5 (High Performance)
 * Optimizado para CPUs de bajo consumo y pantallas táctiles de PDA.
 */
export const VirtualList = <T,>({ 
    items, 
    itemHeight, 
    renderRow: RowComponent, 
    rowData = {}, 
    onEndReached,
    endReachedThreshold = 5,
    className = "",
    emptyState
}: VirtualListProps<T>) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);

    // Ajuste de altura responsivo sin causar layouts pesados usando ResizeObserver
    useEffect(() => {
        const target = containerRef.current;
        if (!target) return;
        
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                // Usamos height directo para evitar re-layouts
                setContainerHeight(entry.contentRect.height);
            }
        });
        
        observer.observe(target);
        return () => observer.disconnect();
    }, []);

    // Manejador de scroll optimizado con requestAnimationFrame
    const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const top = e.currentTarget.scrollTop;
        
        window.requestAnimationFrame(() => {
            setScrollTop(top);
        });

        if (onEndReached) {
            const totalHeight = items.length * itemHeight;
            const scrollBottom = top + containerHeight;
            if (totalHeight - scrollBottom < itemHeight * endReachedThreshold) {
                onEndReached();
            }
        }
    }, [items.length, itemHeight, containerHeight, onEndReached, endReachedThreshold]);

    // Cálculos de índices (Memoizados para evitar basura en el GC)
    const { totalHeight, startIndex, endIndex, visibleItems } = useMemo(() => {
        const total = items.length * itemHeight;
        const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 3); 
        const visibleCount = Math.ceil(containerHeight / itemHeight) + 6; 
        const end = Math.min(items.length, start + visibleCount);
        
        return {
            totalHeight: total,
            startIndex: start,
            endIndex: end,
            visibleItems: items.slice(start, end)
        };
    }, [items, scrollTop, itemHeight, containerHeight]);

    if (items.length === 0) {
        return (
            <div className={`h-full w-full flex flex-col items-center justify-center text-slate-300 ${className}`}>
                {emptyState || (
                    <>
                        <Package className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Cola de Trabajo Vacía</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div 
            ref={containerRef} 
            onScroll={onScroll} 
            className={`h-full w-full overflow-y-auto no-scrollbar relative contain-strict ${className}`}
            style={{ 
                WebkitOverflowScrolling: 'touch',
                // Optimización crítica: Capa aislada para el scroll
                willChange: 'scroll-position' 
            }}
        >
            {/* Espaciador invisible para el scrollbar real */}
            <div style={{ height: totalHeight, width: '100%', pointerEvents: 'none' }} />
            
            {/* Contenedor de items con aceleración GPU */}
            <div 
                style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translate3d(0, ${startIndex * itemHeight}px, 0)`,
                    willChange: 'transform',
                    // Evita cálculos de layout costosos dentro de los hijos
                    contain: 'content'
                }}
            >
                {visibleItems.map((item, localIndex) => (
                    <div 
                        key={(item as any).id || (item as any).barcode || (startIndex + localIndex)} 
                        style={{ height: itemHeight, overflow: 'hidden' }}
                        className="contain-content"
                    >
                        <RowComponent 
                            index={startIndex + localIndex} 
                            data={{ items, ...rowData }} 
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
