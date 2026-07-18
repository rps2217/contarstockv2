# Respaldo Refactorización - Tipos `any`

**Fecha:** 2026-07-18
**Rama:** `refactor/eliminar-any-types`
**PR:** https://github.com/rps2217/contarstockv2/pull/37

---

## 📊 ESTADO ACTUAL

| Métrica                | Valor         |
| ---------------------- | ------------- |
| Tipos `any` eliminados | 282           |
| Tipos `any` restantes  | 241           |
| Commits en PR          | 45            |
| Tests pasando          | 915 ✅        |
| TypeScript             | Compilando ✅ |

---

## 📈 PROgreso POR FASE

| Fase  | Descripción              | Estado          | Progreso |
| ----- | ------------------------ | --------------- | -------- |
| 1     | Código Muerto            | ✅ Completada   | 100%     |
| 2     | Memory Leaks             | ✅ Completada   | 100%     |
| **3** | **Reducción `any`**      | **🔄 En curso** | **~54%** |
| 4     | Descomposición Monolitos | ⏳ Pendiente    | 0%       |
| 5     | Cobertura Tests          | ⏳ Pendiente    | 0%       |

---

## ✅ COMMITS REALIZADOS (45 total)

```
8463dbb refactor(reportWorker.ts): Eliminar 4 'any' con tipos unknown
ad07827 refactor(utils.ts): Eliminar 'any' con tipo unknown
1693453 refactor(Reconciliation.ts): Eliminar 'any' con tipo SupabaseRow
8281403 refactor(ConflictResolution.ts): Eliminar 'any' con tipo unknown
c03217e refactor(ErrorBoundary.tsx): Eliminar 'any' con tipo unknown
43a9f31 refactor(validator.ts): Eliminar 2 'any' con tipo unknown
10d3734 refactor(useExpiryWatcher.ts): Eliminar 3 'any'
5f5b634 refactor(VersionManager.ts): Eliminar 'any' con tipo ScanRecord
7cb589b refactor(GenericSyncEngine.ts): Eliminar 8 'any'
1458fe6 refactor(sessionService.ts): Eliminar 'any' con tipo PendingScanEvent
19416e1 refactor: Eliminar 11 'any' en catch blocks
3343525 refactor(useSyncManager.ts): Eliminar 4 'any' en catch blocks
be536a2 refactor(RFIDService.ts): Eliminar 4 'any' en catch blocks
bb176a4 refactor(Container.ts): Eliminar 5 tipos 'any'
cbe31a8 refactor(useScannerEngine): Eliminar 4 tipos 'any'
93eb5ae refactor(export.ts): Eliminar 4 tipos 'any'
f92dadd refactor(db.ts): Eliminar 5 tipos 'any' y arreglar usages
4c122b0 refactor(useOpticalEngine): Eliminar 6 tipos 'any'
18caa61 refactor(PerformanceService): Eliminar 7 tipos 'any'
b6f3b35 refactor(PerformanceWorker): Eliminar 9 tipos 'any'
... (25 commits más)
```

---

## 🔄 CONTINUAR DESDE AQUÍ

### Sub-fase activa: 3.5 Hooks y Componentes

### Archivos pendientes con más `any`:

```bash
# Top 10 archivos con 'any' pendientes
src/features/slices/hooks/useSlicesLogic.ts      - 10 any
src/shared/components/redesign/pages/CountingPage.tsx  - 9 any
src/features/counting/hooks/useCountingActions.ts  - 9 any
src/shared/components/redesign/pages/TheoreticalLoadsPage.tsx - 7 any
src/services/cloud/syncRegistry.ts                 - 7 any
src/features/settings/components/common/SettingsElements.tsx - 7 any
src/features/reports/hooks/useReports.ts          - 7 any
src/shared/components/redesign/pages/DataPage.tsx   - 6 any
src/services/cloud/GenericSyncEngineEnhanced.ts    - 6 any
src/shared/components/redesign/pages/CapturePage.tsx - 5 any
```

---

## 🛠️ COMANDOS PARA CONTINUAR

```bash
# 1. Ir al directorio
cd /workspace/project/contarstockv2

# 2. Asegurarse en la rama correcta
git checkout refactor/eliminar-any-types

# 3. Verificar estado
git status
npx tsc --noEmit
npm run test:run

# 4. Contar any restantes
grep -rn ": any" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test." | wc -l
```

---

## 📝 PATRÓN DE REFACTORIZACIÓN

```typescript
// ANTES
const fn = (data: any) => {
  const item = data.prop;
  // ...
};

// DESPUÉS
const fn = (data: unknown) => {
  const typed = data as Record<string, unknown>;
  const item = typed.prop;
  // ...
};
```

---

## ⚠️ ARCHIVOS COMPLEJOS (requieren más trabajo)

### syncRegistry.ts

- 7 tipos `any`
- Tipos dinámicos para mapping de tablas
- Recomendación: Mantener algunos `any` en interfaces dinámicas

### Pages (.tsx)

- CountingPage.tsx, TheoreticalLoadsPage.tsx, etc.
- Mezclan lógica de UI con tipos genéricos
- Recomendación: Refactorizar después de hooks

---

## 🎯 PRÓXIMOS PASOS

1. **Continuar sub-fase 3.5** - Hooks y componentes
2. **Sub-fase 3.6** - Services complejos (syncRegistry, etc.)
3. **Sub-fase 3.7** - Pages (mayor complejidad)
4. **Fase 4** - Descomposición de monolitos
5. **Fase 5** - Aumentar cobertura de tests
