
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
 * MOTOR DE VIRTUALIZACIÓN INDUSTRIAL v2.1
 * Optimizado para CPUs ARM (PDA) mediante el uso de transform-gpu y 
 * reducción de recálculos de layout.
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

    // Ajuste de altura responsivo sin causar layouts pesados
    useEffect(() => {
        if (!containerRef.current) return;
        
        const observer = new ResizeObserver(entries => {
            for (let entry of entries) {
                setContainerHeight(entry.contentRect.height);
            }
        });
        
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const top = e.currentTarget.scrollTop;
        
        // requestAnimationFrame para sincronizar el scroll con el refresco de pantalla
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

    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 2); 
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 4; 
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    
    const visibleItems = useMemo(() => {
        const result = [];
        for (let i = startIndex; i < endIndex; i++) {
            result.push(items[i]);
        }
        return result;
    }, [items, startIndex, endIndex]);

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
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {/* Espaciador para el scrollbar real */}
            <div style={{ height: totalHeight, width: '100%', pointerEvents: 'none' }} />
            
            {/* Contenedor con aceleración por hardware */}
            <div 
                style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translate3d(0, ${startIndex * itemHeight}px, 0)`,
                    willChange: 'transform'
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
