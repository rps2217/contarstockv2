# Análisis: Capa de Base de Datos - ContarStock v2

**Fecha:** 2026-07-16
**Auditor:** OpenHands Agent

---

## 📊 Resumen Ejecutivo

| Métrica            | Valor  |
| ------------------ | ------ |
| LOC Totales        | ~9,000 |
| Tablas IndexedDB   | 27     |
| Repositorios       | 30     |
| Servicios de infra | 10     |
| Tests覆盖率        | ~0.5%  |

---

## 🔴 Problemas Críticos Identificados

### 1. DbMigrator: Schema Duplicado 12 Veces

**Archivo:** `src/db/migrations/DbMigrator.ts`

**Problema:** Las 12 declaraciones `db.version(N).stores({...})` repiten ~50 líneas cada una con cambios minúsculos.

**Riesgo:** Si una versión diverge, los índices no coinciden y se rompe la migración silenciosamente.

### 2. Repositorios con Doble Estilo

**Archivos afectados:** 10 de 18 repositorios exportan tanto clase como objeto.

```
src/repositories/CustomerRepository.ts
src/repositories/DexieProductRepository.ts
src/repositories/DynamicDataRepository.ts
src/repositories/ExpiryRepository.ts
src/repositories/LocationRepository.ts
src/repositories/ScanRepository.ts
src/repositories/SessionRepository.ts
src/repositories/SyncLogRepository.ts
src/repositories/SyncQueueRepository.ts
src/repositories/SystemLogRepository.ts
```

**Ejemplo del problema:**

```typescript
// SessionRepository.ts exporta AMBOS:

// Estilo A: Clase con métodos estáticos
export class SessionRepository {
  static async getById(id: string) { ... }
}

// Estilo C: Objeto con métodos de instancia
export const sessionRepository = {
  getById: async (id) => { ... },
};
```

**Consumers importan de formas distintas:**

```typescript
import { SessionRepository } from '@/repositories/SessionRepository';
SessionRepository.getById(id); // Estilo A

import { sessionRepository } from '@/repositories/SessionRepository';
sessionRepository.getById(id); // Estilo C
```

### 3. Schema Supabase Sub-versionado

**Archivo:** `supabase/migrations/002_create_sessions.sql` (78 LOC)

Solo existe la tabla `sessions`. El resto del schema no está versionado.

---

## 🟠 Problemas Altos

### 4. BaseRepository / BaseDexieRepository No Usados

**Archivos:**

- `src/repositories/BaseRepository.ts` (359 LOC)
- `src/repositories/core/BaseDexieRepository.ts`

**Estado:** Definidos pero ningún repositorio los extiende.

### 5. TransactionalSyncQueue No Realmente Transaccional

**Problema:** Nombre engañoso. Usa `filter().first()` + `add()` separados, no una transacción Dexie.

### 6. Sin Tests para la Capa Crítica

**Cobertura actual:** 0.5% (1 archivo de test para 9,000 LOC)

---

## ✅ Fortalezas

1. **Trinidad WMS-grade:** IntegrityValidator + SessionLockManager + VersionManager
2. **DatabaseHealthService:** Parallel checks, métricas, recomendaciones
3. **QueryCache:** Con invalidación por eventos
4. **Índices optimizados** (v62), TTL, locks, snapshots

---

## 📋 Plan de Acción

### Sprint DB-0: Auditoría ✅

- [x] Confirmar estilos de repositorios
- [ ] Confirmar schema Supabase completo
- [ ] Agregar storage.estimate() al health check

### Sprint DB-1: Tests (Prioridad #1)

- [ ] Backup round-trip tests (3 escenarios)
- [ ] Migración v1→v63 sin pérdida
- [ ] IntegrityValidator con fixtures
- [ ] SessionLockManager concurrencia
- [ ] VersionManager rollback

### Sprint DB-2: DbMigrator Refactor

- [ ] Fuente única del schema
- [ ] Diffs incrementales

### Sprint DB-3: Consistencia Repositorios

- [ ] Elegir estilo canónico (instancia + singleton)
- [ ] Migrar consumidores
- [ ] Deprecation wrappers

---

## 🔧 Estilo Canónico Recomendado

**Elegido:** Instancia + Singleton (Estilo B)

**Razones:**

1. Permite mockear en tests
2. Permite DI via Container.ts existente
3. Es tree-shakeable
4. Consistente con el resto del codebase

**Ejemplo:**

```typescript
// repositories/UserRepository.ts
export class UserRepository {
  async getById(id: string): Promise<User | undefined> {
    return db.users.get(id);
  }

  async save(user: User): Promise<any> {
    return db.users.put(user);
  }
}

export const userRepository = new UserRepository();
```

**Migración:**

1. Agregar `_deprecated` a métodos estáticos (warning en consola)
2. Actualizar imports gradualmente
3. Eliminar código viejo al final

---

## 📁 Archivos Clave

| Archivo                         | LOC    | Estado           |
| ------------------------------- | ------ | ---------------- |
| src/db.ts                       | 222    | Schema principal |
| src/db/migrations/DbMigrator.ts | 553    | 🔴 Refactorizar  |
| src/repositories/*.ts           | ~3,262 | 🟠 Consolidad    |
| src/db/services/*.ts            | ~5,000 | ✅ Robustos      |

---

## 📈 Métricas Objetivo

| Métrica                   | Actual    | Objetivo          |
| ------------------------- | --------- | ----------------- |
| Cobertura tests           | 0.5%      | 30% (Sprint DB-1) |
| Estilos repositorio       | 3         | 1                 |
| LOC duplicadas DbMigrator | ~600      | 0                 |
| Schema Supabase           | 1 archivo | Completo          |
