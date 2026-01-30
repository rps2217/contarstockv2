import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Package } from 'lucide-react';

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderRow: React.ComponentType<{ index: number; data: any; style?: React.CSSProperties }>;
    rowData?: any;
    onEndReached?: () => void;
    endReachedThreshold?: number; // Cuantos items antes del final para disparar onEndReached
    className?: string;
    emptyState?: React.ReactNode;
}

/**
 * MOTOR DE VIRTUALIZACIÓN UNIVERSAL v2.0
 * Renderiza solo los elementos visibles en el viewport para mantener 60fps
 * incluso con listas de +50,000 registros.
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

    // Observer para redimensionamiento responsivo
    useEffect(() => {
        const updateHeight = () => { 
            if (containerRef.current) {
                setContainerHeight(containerRef.current.offsetHeight);
            }
        };
        
        updateHeight();
        
        const resizeObserver = new ResizeObserver(updateHeight);
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        
        window.addEventListener('resize', updateHeight);
        return () => {
            resizeObserver.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const top = e.currentTarget.scrollTop;
        setScrollTop(top);

        // Lógica de Infinite Scroll
        if (onEndReached) {
            const totalHeight = items.length * itemHeight;
            const scrollBottom = top + containerHeight;
            const remainingHeight = totalHeight - scrollBottom;
            
            if (remainingHeight < itemHeight * endReachedThreshold) {
                onEndReached();
            }
        }
    }, [items.length, itemHeight, containerHeight, onEndReached, endReachedThreshold]);

    // Cálculos de ventana (Windowing)
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 3); // Buffer superior de 3 items
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 6; // Buffer inferior de 6 items
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    
    const visibleItems = useMemo(() => {
        const visible = [];
        for (let i = startIndex; i < endIndex; i++) {
            visible.push(items[i]);
        }
        return visible;
    }, [items, startIndex, endIndex]);

    if (items.length === 0) {
        return (
            <div className={`h-full w-full flex flex-col items-center justify-center text-slate-300 ${className}`}>
                {emptyState || (
                    <>
                        <Package className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Lista Vacía</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div 
            ref={containerRef} 
            onScroll={onScroll} 
            className={`h-full w-full overflow-y-auto no-scrollbar relative will-change-scroll ${className}`}
        >
            {/* Espaciador fantasma para forzar el scrollbar correcto */}
            <div style={{ height: totalHeight, width: '100%', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} />
            
            {/* Contenedor de items visibles posicionado absolutamente */}
            <div 
                style={{ 
                    transform: `translateY(${startIndex * itemHeight}px)`,
                    width: '100%'
                }}
            >
                {visibleItems.map((item, localIndex) => (
                    <div key={(item as any).id || (item as any).barcode || (startIndex + localIndex)} style={{ height: itemHeight }}>
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