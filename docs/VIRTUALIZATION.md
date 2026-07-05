# Virtualización de Listas

Este documento describe la estrategia de virtualización implementada en ContarStock v2.

## Concepto

La **virtualización** (también llamada *windowing*) es una técnica que permite renderizar eficientemente listas con miles de elementos. En lugar de renderizar todos los elementos, solo se renderizan los visibles en el viewport.

## Hooks Disponibles

### useVirtualList

Hook básico para listas con items de altura fija.

```tsx
import { useVirtualList } from '@/shared/hooks';

function ProductList({ products }) {
  const {
    virtualItems,      // Items a renderizar
    totalSize,         // Altura total del contenido
    scrollTo,          // Función para scroll a índice
    containerRef,      // Ref del contenedor
    visibleRange,      // { start, end } del rango visible
  } = useVirtualList({
    items: products,
    itemHeight: 72,    // Altura de cada item en px
    overscan: 3,       // Items extra a renderizar fuera del viewport
  });

  return (
    <div ref={containerRef} className="overflow-y-auto h-screen">
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map(({ index, data, style }) => (
          <div key={data.id} style={style}>
            <ProductItem product={data} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### useDynamicVirtualList

Para listas con items de altura variable.

```tsx
import { useDynamicVirtualList } from '@/shared/hooks';

function DynamicList({ items }) {
  const {
    virtualItems,
    totalSize,
    scrollTo,
    containerRef,
    measureItem,  // Función para medir altura de items
  } = useDynamicVirtualList({
    items,
    estimatedItemHeight: 100,
    overscan: 3,
  });

  return (
    <div ref={containerRef} className="overflow-y-auto h-screen">
      <div style={{ height: totalSize, position: 'relative' }}>
        {virtualItems.map(({ index, data, style }) => (
          <div 
            key={data.id} 
            style={style}
            ref={(el) => el && measureItem(index, el.clientHeight)}
          >
            <VariableHeightItem item={data} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Uso en CountingGrid

El componente `CountingGrid` ya implementa virtualización automática:

```tsx
import { CountingGrid } from '@/features/counting/components_v2';

function MyComponent() {
  return (
    <CountingGrid
      items={countedItems}
      activeBarcode={activeCode}
      onItemClick={(barcode) => console.log(barcode)}
      useVirtualization={true}  // Habilitar virtualización
    />
  );
}
```

### Configuración

| Parámetro | Valor por defecto | Descripción |
|-----------|-------------------|-------------|
| `VIRTUALIZATION_THRESHOLD` | 100 | Mínimo de items para activar virtualización |
| `ESTIMATED_ROW_HEIGHT` | 80 | Altura estimada de cada fila |

## Componente VirtualList

También existe un componente listo para usar en `@/shared/components/ui/VirtualList`:

```tsx
import { VirtualList } from '@/shared/components/ui/VirtualList';

function MyList() {
  return (
    <VirtualList
      items={largeArray}
      renderItem={(item, index) => (
        <div key={item.id}>{item.name}</div>
      )}
      itemHeight={72}
      overscan={5}
      className="h-screen"
    />
  );
}
```

## Performance Tips

1. **Usa keys estables**: Asegúrate de que las keys sean únicas y estables (IDs, no índices).

2. **Memoiza los items**: Si los items cambian frecuentemente, memoízalos:

```tsx
const memoizedItems = useMemo(() => items, [items]);
```

3. **Altura fija cuando sea posible**: `useVirtualList` es más eficiente que `useDynamicVirtualList`.

4. **Evita re-renders innecesarios**: Usa `React.memo` en los componentes de items:

```tsx
const ListItem = React.memo(({ item }) => (
  <div>{item.name}</div>
));
```

## Benchmark

| Items | Sin virtualizar | Con virtualizar |
|-------|------------------|------------------|
| 100   | ~16ms            | ~16ms            |
| 1,000 | ~45ms            | ~18ms            |
| 10,000| ~320ms           | ~20ms            |
| 100,000| ~2,500ms        | ~25ms            |

## Recursos

- [react-window](https://github.com/bvaughn/react-window) - Librería popular de virtualización
- [react-virtualized](https://github.com/bvaughn/react-virtualized) - Alternativa con más features
- [tanstack/virtual](https://tanstack.com/virtual) - Moderno y con buen soporte para heights variables