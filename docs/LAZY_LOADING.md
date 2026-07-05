# Lazy Loading y Optimización de Rutas

Este documento describe las estrategias de lazy loading implementadas en ContarStock v2.

## Estrategias Implementadas

### 1. Lazy Imports con `lazyWithRetry`

El proyecto usa `lazyWithRetry` para cargar componentes de forma diferida:

```tsx
import { lazyWithRetry } from '@/services/lazyLoad';

// Componente lazy con retry automático
const MyPage = lazyWithRetry(() => import('./pages/MyPage').then(m => ({ default: m.MyPage })));
```

### 2. Suspense Boundaries

Cada ruta lazy debe estar envuelta en `<Suspense>`:

```tsx
import { Suspense } from 'react';
import { PageLoader, PageSkeleton } from '@/shared/components/ui';

<Suspense fallback={<PageLoader title="Cargando..." />}>
  <MyLazyPage />
</Suspense>
```

### 3. PageLoader Component

El componente `PageLoader` proporciona estados de carga visual:

```tsx
import { PageLoader, PageSkeleton, SkeletonLine } from '@/shared/components/ui';

// Variantes disponibles
<PageLoader />                    // Default con logo animado
<PageLoader variant="minimal" />   // Solo spinner
<PageLoader variant="dots" />      // Tres puntos animados
<PageSkeleton />                   // Skeleton completo de página
<SkeletonLine width="50%" />      // Línea de skeleton inline
```

## Rutas Lazy en App.tsx

Las siguientes rutas están configuradas como lazy:

### Autenticación
- `Login` - Página de login

### Dashboard
- `DashboardFull` - Dashboard completo (lazy)
- `DashboardSimple` - Dashboard simple (inline, para móviles)

### Vistas Principales (AppSheet-style)
- `CapturePage` - Captura de datos
- `DataPage` - Gestión de datos
- `SyncPage` - Sincronización
- `SettingsPage` - Configuración

### Páginas de Redesign
- `CustomersPage` - Clientes
- `SuppliersPage` - Proveedores
- `SlicesPage` - Rebanadas
- `ExpiryPage` - Vencimientos
- `ReportsLegacy` - Reportes
- `TheoreticalLoadsPage` - Cargas teóricas
- `HammerPage` - Auditoría masiva
- `InventoryPage` - Inventario
- `AuditPage` - Auditoría

### Componentes Pesados (Solo desktop)
- `Sidebar` - Barra lateral
- `BottomDock` - Dock inferior
- `OnboardingOverlay` - Tutorial de bienvenida
- `SystemOperationsDrawer` - Operaciones del sistema
- `ToastContainer` - Contenedor de notificaciones
- `TaskProgressIndicator` - Indicador de progreso
- `ThemeDemo` - Demo de temas

## lazyWithRetry

El wrapper `lazyWithRetry` proporciona:

1. **Lazy loading**: El módulo solo se carga cuando se necesita
2. **Retry automático**: Si falla la carga, reintenta 3 veces con backoff exponencial
3. **Manejo de errores**: Captura errores de carga silenciosamente

```typescript
// En src/services/lazyLoad.ts
export function lazyWithRetry<T>(
  importFn: () => Promise<{ default: T }>,
  maxRetries = 3
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await importFn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
      }
    }
    throw new Error('Max retries exceeded');
  });
}
```

## Impacto en Performance

### Bundle Splitting

El lazy loading permite que Vite divida el bundle:

| Chunk | Contenido | Tamaño Estimado |
|-------|-----------|-----------------|
| vendor-react | React, ReactDOM, Router | ~150KB |
| vendor-ui | Componentes UI | ~200KB |
| vendor-charts | Recharts (lazy) | ~100KB |
| pages-* | Cada página lazy | ~20-80KB |

### Time to Interactive (TTI)

Con lazy loading:
1. **Initial bundle**: ~300KB (core)
2. **Deferred**: ~500KB (componentes UI)
3. **On-demand**: Páginas y features pesadas

### Core Web Vitals

El lazy loading mejora:
- **LCP**: Contenido principal carga primero
- **FID**: Menos JS en el initial bundle
- **CLS**: Mejor control del layout

## Mejores Prácticas

### 1. Identificar componentes pesados

```bash
# Analizar bundle
npm run build -- --analyze
```

### 2. Preferir lazy loading para:

- Páginas que no son el dashboard principal
- Modales grandes
- Componentes con librerías pesadas (charts, maps)
- Features de baja prioridad

### 3. Evitar lazy loading para:

- Navegación principal
- Componentes críticos de UX
- Elementos above-the-fold

### 4. Feedback visual

Siempre proporcionar un fallback atractivo:

```tsx
<Suspense fallback={<PageLoader variant="minimal" />}>
  <HeavyComponent />
</Suspense>
```

## Ejemplo de Uso

```tsx
import { lazy, Suspense } from 'react';
import { PageLoader } from '@/shared/components/ui';
import { lazyWithRetry } from '@/services/lazyLoad';

// Crear componente lazy
const HeavyChart = lazyWithRetry(() => 
  import('./components/HeavyChart').then(m => ({ default: m.HeavyChart }))
);

// Usar con Suspense
function Dashboard() {
  return (
    <div>
      <QuickStats /> {/* Inline - carga inmediata */}
      
      <Suspense fallback={<PageLoader subtitle="Cargando gráfico..." />}>
        <HeavyChart data={data} />
      </Suspense>
    </div>
  );
}
```

## Recursos

- [React.lazy Documentation](https://react.dev/reference/react/lazy)
- [React Suspense](https://react.dev/reference/react/Suspense)
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategies)