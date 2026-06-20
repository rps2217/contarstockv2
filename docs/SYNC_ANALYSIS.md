# Análisis: Duplicación en Sistema de Sincronización

**Fecha:** 2026-06-20  
**Estado:** ⚠️ REQUIERE CONSOLIDACIÓN

---

## Resumen Ejecutivo

El sistema de sincronización actual tiene **múltiples implementaciones paralelas** que causan:
- Código duplicado (~2,120 líneas solo en servicios sync)
- Inconsistencia entre módulos
- Mantenimiento difícil
- FSM duplicada

---

## Inventario de Servicios Sync

### Servicios Principales (`src/services/`)

| Archivo | Líneas | Propósito | Estado |
|---------|--------|-----------|--------|
| `supabaseSyncService.ts` | 482 | Sync realtime + push/pull | ⚠️ Legacy |
| `syncManager.ts` | 38 | Wrapper compatibilidad | ✅ Refactorizado |
| `syncFSM.ts` | 127 | Máquina de estados (LEGACY) | ❌ DUPLICADO |
| `massiveSync.ts` | 307 | Migraciones BCM | ✅ OK |
| `dynamicSync.ts` | 365 | Datos dinámicos | ✅ OK |
| `configSyncService.ts` | 146 | Configuración | ✅ OK |
| `cloudSync.ts` | 65 | Wrapper legacy | ❌ OBSOLETO |

### Servicios Modularizados (`src/services/sync/`)

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `BatchUploader.ts` | 142 | Upload por lotes |
| `CatalogImporter.ts` | 164 | Importar catálogos |
| `UploadGroupBuilder.ts` | 121 | Grupos de upload |
| `Reconciliation.ts` | 100 | Reconciliación |
| `fsm/SyncFSM.ts` | ~200 | FSM moderna | ✅ NUEVA |

---

## Hooks de Sync por Feature

| Hook | Líneas | Feature |
|------|--------|---------|
| `useSyncCenter.ts` | 275 | Sync Center |
| `useSyncManager.ts` | 243 | Sync Manager |
| `useExpirySync.ts` | 96 | Vencimientos |
| `useProductSync.ts` | 78 | Inventario |
| `useProvidersSync.ts` | 63 | Proveedores |
| `useCountingSync.ts` | 18 | Conteo |

**Total hooks sync:** 773 líneas

---

## Problemas Identificados

### 1. FSM Duplicada

```
src/services/syncFSM.ts (127 líneas) ← LEGACY (USA useDashboard.ts)
src/services/sync/fsm/SyncFSM.ts (~200 líneas) ← NUEVA (USA BatchUploader.ts)
```

**Consumidores de syncFSM legacy:**
- `useDashboard.ts` - Suscribe estado + runSync()

**Acción:** Migrar useDashboard a nueva FSM.

### 2. cloudSync.ts En Uso Activo

```
cloudSync.ts (65 líneas) - USA useProductSync y useProvidersSync
```

**Consumidores:**
- `useProductSync.ts` - `syncProductsToCloud()`
- `useProvidersSync.ts` - `syncProvidersToCloud()`

**Acción:** Migrar a GenericSyncEngine o mantener por ahora.

### 3. Patrón Inconsistente por Feature

Cada módulo implementa `syncToCloud()` de forma diferente:

```typescript
// Hammer
const syncToCloud = async () => {
  await supabaseSyncService.pushBatch('CONTEOS', items);
};

// Reception  
const syncToCloud = async () => {
  await pushReceptionItems(items);
};

// Debería usar patrón uniforme
```

**Acción:** Crear hook genérico `useSyncQueue()` y usar en todos.

### 4. supabaseSyncService.ts Muy Grande (482 líneas)

Contiene:
- Realtime sync
- Push/Pull manual
- Batch operations
- Conflict resolution

**Acción:** Dividir en servicios específicos.

---

## Propuesta de Mejora

### Fase 1: Limpieza Inmediata (1-2 horas)

1. **Eliminar syncFSM.ts legacy**
   - Ya existe nueva FSM en `sync/fsm/`
   - Mover exports si hay consumidores

2. **Eliminar cloudSync.ts** (si no se usa)
   - Verificar imports
   - Eliminar archivo

### Fase 2: Unificar Hooks (4-6 horas)

1. **Crear `useSyncQueue` como hook unificado**
   ```typescript
   // Nuevo hook genérico
   const sync = useSyncQueue({
     table: 'CONTEOS',
     getPending: () => db.scans.where('synced').equals(0).toArray(),
     markSynced: (ids) => db.scans.where('id').anyOf(ids).modify({ synced: 1 })
   });
   
   // Usar en TODOS los módulos
   const { pushToCloud, pendingCount } = sync;
   ```

2. **Migrar features existentes**
   - Hammer → useSyncQueue
   - Reception → useSyncQueue
   - Counting → useSyncQueue
   - Inventory → useSyncQueue

### Fase 3: Refactor Services (4-6 horas)

1. **Dividir supabaseSyncService.ts**
   - `RealtimeSyncService.ts` - Solo realtime
   - `BatchSyncService.ts` - Solo batch operations
   - `ConflictResolver.ts` - Resolución de conflictos

2. **Mantener GenericSyncEngine como orquestador**
   - Coordina servicios
   - FSM para control de flujo

---

## Métricas Actuales vs Meta

| Métrica | Actual | Meta |
|---------|--------|------|
| Líneas servicios sync | 2,120 | ~800 |
| Hooks de sync | 6 | 1-2 |
| FSMs | 2 | 1 |
| Servicios duplicados | 2 | 0 |

---

## Orden de Implementación Sugerido

1. ✅ Análisis (actual)
2. ✅ Eliminar syncFSM.ts legacy (migrado a legacySyncWrapper)
3. 🔲 Verificar y eliminar cloudSync.ts
4. 🔲 Consolidar hooks en useSyncQueue
5. 🔲 Dividir supabaseSyncService.ts
6. 🔲 Tests para nueva arquitectura

## Progreso Fase 1

### Completed:
- ✅ Creado `legacySyncWrapper` en `sync/fsm/SyncFSM.ts`
- ✅ Exportado `LegacySyncStatus` type
- ✅ Actualizado `useDashboard.ts` para usar wrapper
- ✅ Eliminado `src/services/syncFSM.ts` (127 líneas)

### Métricas:
- Líneas eliminadas: 127
- Líneas añadidas (wrapper): ~60
- Net: -67 líneas

---

## Impacto Esperado

| Beneficio | Estimación |
|-----------|------------|
| Líneas eliminadas | ~800-1000 |
| Consistencia | 100% |
| Mantenibilidad | ↑↑↑ |
| Bugs por duplicación | ↓↓ |

---

## Riesgo

| Riesgo | Mitigación |
|--------|------------|
| Romper features existentes | Tests primero |
| Breaking changes | Deprecation warnings |
| Pérdida de funcionalidad realtime | Mantener supabaseSyncService.ts para realtime |

---

**¿Procedemos con la Fase 1 (eliminación de duplicados)?**
