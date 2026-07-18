# Análisis de Simplificación y Redundancias

*Fecha: 2026-07-18*
*Análisis como Senior Developer*

---

## 🔴 CRÍTICAS - Prioridad Alta

### 1. Sistema de Sincronización (38 archivos en sync/)

**Problema:** El sistema de sync está fragmentado en múltiples implementaciones que hacen lo mismo:

```
services/
├── sync/
│   ├── unified/
│   │   ├── UnifiedSyncEngine.ts      ← Motor principal
│   │   ├── SyncMetricsService.ts
│   │   ├── registry.ts
│   │   └── types.ts
│   ├── fsm/
│   │   ├── SyncFSM.ts               ← ¿Necesario?
│   │   └── useSyncFSM.ts
│   ├── ConflictResolution.ts         ← DUPLICADO
│   └── legacyImports.ts
├── cloud/
│   ├── SyncQueue.ts                 ← Cola offline
│   ├── SyncQueueService.ts          ← Servicio de cola
│   ├── GenericSyncEngine.ts         ← DUPLICADO?
│   ├── GenericSyncEngineEnhanced.ts ← DUPLICADO?
│   ├── BatchSyncService.ts         ← ¿Separado?
│   ├── RealtimeSyncService.ts       ← ¿Separado?
│   ├── EventsSyncService.ts         ← ¿Separado?
│   ├── SyncBridge.ts                ← Bridge?
│   ├── ConflictResolution.ts        ← DUPLICADO
│   └── SyncMetrics.ts               ← DUPLICADO?
```

**Recomendación:**
```typescript
// CONSOLIDAR en:
services/sync/
├── SyncEngine.ts           // Motor único
├── SyncQueue.ts            // Cola
├── SyncMetrics.ts          // Métricas
├── registry.ts             // Tablas
└── types.ts               // Tipos
```

**Acción:** Eliminar `GenericSyncEngine`, `GenericSyncEngineEnhanced`, `SyncBridge`, `RealtimeSyncService` si UnifiedSyncEngine los reemplaza.

---

### 2. ConflictResolution.ts Duplicado

**Ubicaciones:**
- `services/sync/ConflictResolution.ts`
- `services/cloud/ConflictResolution.ts`

**Análisis:**
```bash
# Comparar archivos
diff src/services/sync/ConflictResolution.ts src/services/cloud/ConflictResolution.ts
```

**Recomendación:** Mantener uno solo en `services/sync/` y eliminar el otro.

---

### 3. Repositorios Base Duplicados

**Ubicaciones:**
- `src/repositories/BaseRepository.ts` (260 líneas)
- `src/repositories/base/BaseRepository.ts` 
- `src/repositories/core/BaseDexieRepository.ts`

**Problema:** Hay 3 implementaciones base de repositorio.

**Recomendación:**
```
repositories/
├── BaseRepository.ts      ← KEEP (genérico)
├── DexieRepository.ts    ← Fusionar core/BaseDexieRepository aquí
└── LegacyWrapper.ts      ← Mantener solo para backwards compat
```

---

## 🟠 MEDIAS - Prioridad Media

### 4. Hooks de AutoSave Duplicados

**Ubicaciones:**
- `src/shared/hooks/auto-save/useAutoSave.ts` (396 líneas)
- `src/shared/hooks/useAutoSave.tsx` (368 líneas)

**Análisis:**
- `auto-save/useAutoSave.ts`: Más completo, con más features
- `useAutoSave.tsx`: Versión más simple

**Recomendación:**
- Mantener `auto-save/useAutoSave.ts` 
- Eliminar `useAutoSave.tsx` 
- O fusionar en uno con features flags

---

### 5. Features Redundantes

**Feature `expected-orders/` vs `theoretical-loads`**

```typescript
// En docs se menciona:
📁 TheoreticalLoadsPage → Ruta: /theoretical-loads

// Pero también existe:
features/expected-orders/
```

**Pregunta:** ¿El módulo `expected-orders` es código muerto?

```bash
# Buscar imports de expected-orders
grep -r "from.*expected-orders" src/ --include="*.tsx" --include="*.ts"
```

---

### 6. Stores con Responsabilidad Cruzada

**Problema:**
```
stores/
├── useSyncStore.ts      // ¿Solo sync?
├── useToastStore.ts     // Notificaciones
├── useExpiryStore.ts    // Vencimientos
├── usePermissionStore.ts
├── useAuditStore.ts
├── useConflictStore.ts  // ¿No debería estar en sync?
└── useRowLevelSecurityStore.ts
```

**Observación:** `useConflictStore` maneja conflictos de sync, pero está separado de `useSyncStore`.

**Recomendación:** Considerar fusionar `useConflictStore` dentro de `useSyncStore` si son siempre usados juntos.

---

### 7. Hooks de Scanner Duplicados

**Ubicaciones:**
- `src/shared/hooks/useScannerEngine.ts`
- `src/hooks/useScannerEngine.ts`
- `src/shared/hooks/useScanPipeline.ts`
- `src/hooks/useHIDScanner.ts`

**Recomendación:**
```
hooks/scanner/
├── useScanPipeline.ts   // Motor principal
├── useHIDScanner.ts     // Scanner HID
└── useBarcodeParser.ts  // Parser de códigos
```

---

## 🟡 BAJAS - Mejoras Menores

### 8. Alias de Repositorios (Legibilidad)

**Archivos de compatibilidad:**
```typescript
src/repositories/
├── SessionRepository.ts  → re-export de session/SessionRepository.ts (14 líneas)
├── ExpectedOrderRepository.ts → ?
```

**Recomendación:** Eliminar alias una vez que todos los imports estén actualizados.

---

### 9. Logger Duplicado/Cruce

**Problema potencial:**
```typescript
// services/logger.ts
// vs
// shared/hooks/useLogger.ts o similar?
```

**Verificar si hay múltiples implementaciones de logging.**

---

### 10. Feature Flags vs Código Condicional

**Ubicación:** `src/config/features.ts`

El proyecto usa feature flags, pero puede haber código legacy que no los use.

**Recomendación:** Audit de código que NO usa `isFeatureEnabled()` donde debería.

---

## 📋 Plan de Consolidación Sugerido

### Fase 1: Sync (2-3 días)
1. [ ] Audit de `UnifiedSyncEngine` vs otros engines
2. [ ] Decidir cuál es el motor canonical
3. [ ] Eliminar engines redundantes
4. [ ] Unificar ConflictResolution
5. [ ] Unificar SyncMetrics

### Fase 2: Repositorios (1 día)
1. [ ] Consolidar BaseRepository
2. [ ] Eliminar alias legacy
3. [ ] Verificar que no hay imports rotos

### Fase 3: Hooks (1 día)
1. [ ] Consolidar useAutoSave
2. [ ] Mover scanner hooks a carpeta unificada
3. [ ] Eliminar duplicados

### Fase 4: Features (1 día)
1. [ ] Audit de `expected-orders` (código muerto?)
2. [ ] Consolidar páginas redesignadas
3. [ ] Eliminar componentes legacy si no se usan

---

## 📊 Métricas de Simplificación Potencial

| Área | Archivos | Potencial de Reducción |
|------|----------|------------------------|
| Sync Services | 38 | -50% (a ~18) |
| Repos Base | 3 | -66% (a 1) |
| AutoSave | 2 | -50% (a 1) |
| ConflictResolution | 2 | -50% (a 1) |
| Scanner Hooks | 4 | -50% (a 2) |
| **TOTAL** | ~49 | **~24 archivos eliminados** |

---

## ⚠️ Riesgos

1. **Breaking changes**: Eliminar código puede romper features
2. **Testing**: Necesita cobertura de tests antes de eliminar
3. **Feature Flags**: Asegurar que flags cubran transiciones
4. **Backwards Compat**: Mantener exports para código externo

---

## ✅ Checklist Antes de Simplificar

- [ ] Verificar imports de cada archivo a eliminar
- [ ] Ejecutar tests existentes
- [ ] Crear tests de контракт para features críticas
- [ ] Documentar cambios en CHANGELOG
- [ ] Plan de rollback (git revert)
