# Guía de Migración de Sincronización

## Resumen

Este documento describe cómo migrar los módulos de sincronización legacy al nuevo ecosistema basado en `GenericSyncEngine`.

---

## Arquitectura Nueva

```
┌─────────────────────────────────────────────────────────────┐
│                    GenericSyncEngine                         │
│  (Motor Genérico - UNO PARA TODOS)                         │
│                                                              │
│  ✅ pushIncremental() → Sube cambios pending                 │
│  ✅ pullRemoteChanges() → Descarga cambios remotos           │
│  ✅ sync() → Ciclo bidireccional completo                   │
│  ✅ ConflictResolution → Estrategias configurables          │
│  ✅ Reconciliation → Limpieza de huérfanos                  │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ USA
        ┌─────────────────────┴─────────────────────┐
        │                                             │
   ┌────┴────┐                                 ┌────┴────┐
   │ syncRegistry                              │  hooks  │
   │ (config)                                  │(interfaz)│
   └────┬────┘                                 └────┬────┘
        │                                           │
   Tablas                                         useGenericSync
   registradas                                     (wrapper React)
```

---

## Módulos Deprecados

| Módulo | Estado | Reemplazo |
|--------|--------|-----------|
| `cloudSync.ts` | ✅ ELIMINADO | `GenericSyncEngine` |
| `useProductSync` | ⚠️ Legacy | `useGenericSync({ registryKey: 'products' })` |
| `useProvidersSync` | ⚠️ Legacy | `useGenericSync({ registryKey: 'providers' })` |

---

## Cómo Usar `useGenericSync`

### Instalación Básica

```tsx
import { useGenericSync } from '@/hooks/useGenericSync';

function MiComponente() {
  const { push, pull, sync, isSyncing } = useGenericSync({
    registryKey: 'products',  // Clave del registry (requerido)
    tableName: 'PRODUCTOS',     // Para logging (opcional)
  });

  return (
    <button onClick={() => push()} disabled={isSyncing}>
      {isSyncing ? 'Sincronizando...' : 'Subir Cambios'}
    </button>
  );
}
```

### Con Callbacks de Feedback

```tsx
import { toast } from 'sonner';

function MiComponente() {
  const showFeedback = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') toast.success(msg);
    else toast.error(msg);
  };

  const { push } = useGenericSync({
    registryKey: 'products',
    onSuccess: (msg) => showFeedback('success', msg),
    onError: (msg) => showFeedback('error', msg),
  });
}
```

### Force Full Refresh (Download)

```tsx
// Para forzar descarga completa (ignora lastSync timestamp)
const { pull } = useGenericSync({
  registryKey: 'products',
});

// En tu handler:
await pull(true); // forceFullRefresh = true
```

---

## Tablas Registradas en `syncRegistry`

| Clave | Tabla Local | Tabla Remota | Primary Key |
|-------|-------------|--------------|-------------|
| `products` | `products` | `PRODUCTOS` | `barcode` |
| `providers` | `providers` | `PROVEEDORES` | `rut` |
| `sessions` | `sessions` | `SESSIONS` | `id` |
| `scans` | `scans` | `SCANS` | `id` |
| `expectedOrders` | `expectedOrders` | `EXPECTED_ORDERS` | `id` |
| `customers` | `dynamic_data` | `CLIENTES` | `id` |
| `expiry` | `dynamic_data` | `VENCIMIENTOS` | `id` |
| `events` | `dynamic_data` | `EVENTOS` | `id` |
| `auditLogs` | `audit_logs` | `AUDIT_LOGS` | `id` |

---

## Agregar Nueva Tabla al Registry

1. **Definir los mappers** en `syncRegistry.ts`:

```typescript
// En src/services/cloud/syncRegistry.ts
export const syncRegistry = {
  // ... tablas existentes ...
  
  myNewTable: {
    localTable: 'my_local_table',
    remoteTable: 'MY_REMOTE_TABLE',
    primaryKey: 'id',
    mapToRemote: (local) => ({
      id: local.id,
      name: local.name,
      updated_at: new Date().toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      name: remote.name,
      syncStatus: 'synced' as const
    })
  }
};
```

2. **Usar en componente**:

```tsx
const { sync } = useGenericSync({
  registryKey: 'myNewTable',
});
```

---

## Estrategias de Conflictos

Configurable en `ConflictResolution.ts`:

```typescript
type ConflictStrategy = 
  | 'client_wins'      // Local siempre gana
  | 'server_wins'      // Nube siempre gana
  | 'last_write_wins'  // Timestamp más reciente
  | 'manual';          // Usuario decide

// Configurar:
import { setConfiguredStrategy } from '@/services/cloud/ConflictResolution';
await setConfiguredStrategy('last_write_wins');
```

---

## Módulos que NO deben migrar

Estos tienen lógica específica que no puede usar `GenericSyncEngine`:

| Módulo | Razón |
|--------|-------|
| `useExpirySync` | Lógica especial mm/yyyy para vencimientos |
| `useCountingSync` | Agregación de conteos por período |
| `BatchSyncService` | Lotes de 50 para embeddings IA |
| `RealtimeSyncService` | WebSockets, no polling |

---

## Métricas y Monitoring

```typescript
import { syncMetrics, SyncHealth } from '@/services/cloud/SyncMetrics';

// Obtener estadísticas
const stats = syncMetrics.getStats();
// { totalSyncs, avgLatency, tables: {...} }

// Verificar salud
const health = syncMetrics.getHealth();
// { isHealthy, score: 0-100, issues: [...] }
```

---

## API Reference

### `useGenericSync(config)`

**Configuración:**

```typescript
interface GenericSyncConfig {
  registryKey: string;           // ✅ Requerido
  tableName?: string;            // Para logging
  useRealtime?: boolean;         // Default: false
  localRepository?: Repository; // Para realtime
  onSuccess?: (msg) => void;    // Callback éxito
  onError?: (msg) => void;       // Callback error
  onProgress?: (op, count) => void; // Callback progreso
}
```

**Retorno:**

```typescript
interface GenericSyncReturn {
  isSyncing: boolean;
  push: () => Promise<{ success: number; failed: number }>;
  pull: (forceFullRefresh?: boolean) => Promise<{ added: number; updated: number }>;
  sync: () => Promise<{ success: boolean; error?: string }>;
}
```

---

## Changelog

| Fecha | Cambio |
|-------|--------|
| 2026-06-17 | Migración `useProductSync` y `useProvidersSync` a `useGenericSync` |
| 2026-06-17 | Eliminación de `cloudSync.ts` |
| 2026-06-17 | Creación de `GenericSyncEngine` + `ConflictResolution` + `SyncMetrics` |
