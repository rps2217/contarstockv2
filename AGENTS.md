# Architecture Rules
- Use Lego Architecture: Deeply decouple components.
- Extracted layouts go to `src/shared/components/layout/`.
- Repositories must isolate Dexie DB operations (`src/repositories/`).
- Modules should use `VirtualList` for 100+ items, not inline manual generic virtualizers to avoid duplicated boilerplate.
- Use Domain feature hooks (e.g., `useHammerLogic`, `useExpiryDatabase`) returning `{ state, actions }` interface to eliminate logic from React components.
- Do NOT merge components; split them when they exceed 150-200 lines if feasible (specially extract Modals and lists).

## Common Pitfalls (Lecciones Aprendidas)

### Concurrencia y Sincronización
- ❌ NO usar variables globales para estados de sincronización (`isSyncingInProgress`)
- ✅ Usar Zustand stores que son thread-safe entre tabs
- ❌ NO usar buffers en memoria para datos críticos (se pierden al cerrar el browser)
- ✅ Guardar inmediatamente en IndexedDB para persistencia

### Sync Centralizada
- ❌ NO ejecutar múltiples motores de sync para las mismas tablas
- ✅ Usar un solo motor (GenericSyncEngine) para evitar conflictos
- ❌ NO auto-resolver conflictos de campos sin notificación
- ✅ Detectar conflictos de campos y marcarlos para resolución manual

### Cache Management
- ❌ NO crear caches sin invalidación
- ✅ Implementar TTL y funciones de invalidación explícitas
- ✅ Invalidar cache cuando los datos cambian (save, update, delete)

### Seguridad
- ❌ NO exponer settings o datos sensibles en `window`
- ✅ Usar stores o contextos de React

### Manejo de Errores
- ❌ NO mezclar `console.error`, `logger.error`, y `addToast`
- ✅ Usar el wrapper centralizado `errorHandler.ts`
- Clasificación automática de errores por contexto (network, sync, database, etc.)
- Mensajes de usuario amigables según severidad
