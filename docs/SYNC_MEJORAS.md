# Plan de Mejoras: Sync Bidireccional

**Fecha:** 2026-07-02
**Estado:** ✅ IMPLEMENTADO (Fase 1 y 2)

---

## Implementación Completada

### Archivos Creados

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `src/lib/retry.ts` | Retry con backoff exponencial + circuit breaker | ✅ Listo |
| `src/services/cloud/SyncQueue.ts` | Queue offline con IndexedDB | ✅ Listo |
| `src/services/cloud/GenericSyncEngineEnhanced.ts` | Sync engine mejorado | ✅ Listo |

---

## Lo que se implementó

### 1. ✅ Retry con Backoff Exponencial

```typescript
// Características:
// - maxRetries: 3 (configurable)
// - baseDelay: 1000ms
// - maxDelay: 30000ms
// - jitter aleatorio (±25%) para evitar thundering herd
// - Detección automática de errores reintentables

import { withRetry, withSyncRetry, withCircuitBreaker } from '@/lib/retry';

// Uso simple
const result = await withRetry(fn, { maxRetries: 3 });

// Uso con circuit breaker
const result = await withCircuitBreaker(fn, 'myOperation', { failureThreshold: 5 });
```

### 2. ✅ Sync Queue Offline

```typescript
// Características:
// - Persistencia en IndexedDB
// - Estados: queued, processing, synced, failed, cancelled
// - Automatic retry
// - Eventos para online/offline

import { syncQueue, enqueueSync } from '@/services/cloud/SyncQueue';

// Encolar operación
await enqueueSync('products', 'products', barcode, 'update', data);

// Escuchar eventos
window.addEventListener('sync:process', (e) => {
  const item = e.detail;
  // Procesar item
});
```

### 3. ✅ Métricas de Sync

```typescript
interface SyncMetrics {
  lastSyncAt: number;
  lastSyncDuration: number;
  recordsPushed: number;
  recordsPulled: number;
  conflictsResolved: number;
  errors: string[];
}

// Disponible via enhancedSyncEngine.getMetrics(registryKey)
```

---

## Próximos Pasos (Pendientes)

### Fase 3: Integración con UI

| Tarea | Descripción |
|-------|-------------|
| Integrar EnhancedSyncEngine | Modificar useSync para usar versión mejorada |
| Dashboard de sync | Mostrar métricas en Settings |
| NetworkStatus mejorado | Mostrar estado de sync actual |

---

## Uso

### Usar EnhancedSyncEngine

```typescript
import { enhancedSyncEngine } from '@/services/cloud/GenericSyncEngineEnhanced';

const result = await enhancedSyncEngine.sync('products');

if (result.success) {
  console.log('Sync exitoso:', result.metrics);
} else {
  console.error('Sync falló:', result.error);
}
```

### Usar Retry directamente

```typescript
import { withRetry, withSyncRetry } from '@/lib/retry';

// Retry simple
const data = await withRetry(
  () => fetchData(),
  { maxRetries: 3, baseDelay: 1000 }
);

// Retry para sync
const result = await withSyncRetry(
  () => api.pushData(data),
  { tableName: 'PRODUCTOS', operation: 'push' }
);
```

### Usar SyncQueue

```typescript
import { syncQueue, enqueueSync } from '@/services/cloud/SyncQueue';

// Inicializar (llamar una vez al inicio)
await syncQueue.init();

// Encolar cambio
await enqueueSync('products', 'products', id, 'update', productData);

// Ver estadísticas
const stats = await syncQueue.getStats();
console.log('Pendientes:', stats.pending);
console.log('Fallidos:', stats.failed);
```

---

## Testing Recomendado

1. **Retry**: Simular fallos de red con network throttling
2. **Queue**: Cerrar app durante sync, reopen y verificar queue
3. **Circuit Breaker**: Forzar múltiples fallos, verificar apertura
4. **Conflictos**: Editar mismo registro en 2 dispositivos
