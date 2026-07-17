# Refactor del Orquestador - useCountingLogic

**Estado:** ✅ COMPLETADO (Sprint 2)
**Fecha:** 2026-07-16
**Commits:** 7+

---

## 📊 RESUMEN DEL REFACTOR

```
┌─────────────────────────────────────────────────────────────┐
│ ANTES: useCountingLogic.ts (405 LOC) - GOD HOOK            │
│ DESPUÉS: 4 hooks + orquestador (~520 LOC total)            │
├─────────────────────────────────────────────────────────────┤
│ ✅ useCountingSession (~150 LOC)                           │
│ ✅ useCountingScanner (~90 LOC)                             │
│ ✅ useCountingAutosave (~200 LOC)                           │
│ ✅ useCountingActions (~300 LOC) - NUEVO Sprint 2           │
│ ✅ useCountingLogic.ts (orquestador ~215 LOC)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 HOOKS EXTRAÍDOS

### 1. `useCountingSession` - Gestión de Sesión

**Responsabilidad:** Inicio/fin de sesión, multiplicador, location, beforeunload

```typescript
// Uso:
const {
  session,
  multiplier,
  setMultiplier,
  currentLocation,
  setCurrentLocation,
  resetSession,
  isBlindMode,
} = useCountingSession(sessionId);
```

### 2. `useCountingScanner` - State Machine

**Responsabilidad:** Estado del scanner, dispatch de acciones, processScan

**Tamaño actual:** ~90 LOC

```typescript
// Uso:
const { machineState, dispatch, activeBarcode, activeProduct, feedback, processScan } =
  useCountingScanner();
```

### 3. `useCountingAutosave` - Persistencia

**Responsabilidad:** Auto-save cada 30s, recovery, beforeunload

**Tamaño actual:** ~200 LOC

```typescript
// Uso:
const { saveNow, hasPendingChanges, lastSaveTime, clearSavedData, recoveredData } =
  useCountingAutosave(sessionId, options);
```

### 4. `useCountingActions` - Acciones de Conteo (NUEVO Sprint 2)

**Responsabilidad:** Todas las acciones del flujo de conteo extraídas para reutilización

**Tamaño actual:** ~300 LOC

```typescript
// Uso:
const actions = useCountingActions({
  sessionId,
  engine,
  settings,
  consolidatedHistory,
  currentLocation,
  multiplier,
  activeBarcode,
  activeProduct,
  machineState,
  potentialMatch,
  dispatch,
  saveExpiry,
  getExpiryForBarcode,
  syncExpiry,
});

// Acciones disponibles:
actions.finalizeScanPipeline; // Escanear producto
actions.resetSession; // Resetear sesión
actions.selectItem; // Seleccionar item
actions.handlePharmaComplete; // Completar fecha vencimiento
actions.cancelPharma; // Cancelar pharma
actions.undoLastScan; // Deshacer último escaneo
actions.toggleAutoLock; // Toggle auto-lock
actions.setStatus; // Cambiar status
actions.applyPotentialMatch; // Aplicar sugerencia AI
```

**Reutilizable en:** Hammer, Reception

---

## 🔄 ARQUITECTURA IMPLEMENTADA

```
┌─────────────────────────────────────────────────────────────┐
│                    useCountingLogic.ts                       │
│                    (Orquestador ~215 LOC)                   │
├─────────────────────────────────────────────────────────────┤
│  ✅ useCountingSession   → Sesión, multiplicador, location │
│  ✅ useCountingScanner   → State machine, processScan       │
│  ✅ useCountingAutosave  → Persistencia, recovery          │
│  ✅ useCountingActions   → Acciones (REUTILIZABLE)          │
│  ✅ useCountingSync      → Sincronización                  │
│  ✅ useCountingQueries   → Queries consolidadas              │
│  ✅ useCountingAI       → Sugerencias AI                   │
│  ✅ useExpiryTracker    → Tracking de vencimiento           │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 CONTRATOS IMPLEMENTADOS

### SessionId (src/features/counting/domain/sessionTypes.ts)

```typescript
interface SessionId {
  raw: string;
  mode: 'blind' | 'theoretical';
  prefix: string;
  isValid: boolean;
}

function parseSessionId(id: string | null | undefined): ParseSessionIdResult;
function isBlindSession(id: string | SessionId): boolean;
```

### CountingSessionSnapshot

```typescript
interface CountingSessionSnapshot {
  sessionId: string;
  items: ConsolidatedItem[];
  currentLocation: string;
  multiplier: number;
  timestamp: number;
}
```

### CountingState

```typescript
interface CountingState {
  isLoading: boolean;
  status: string;
  machineState: ScannerState;
  feedback: string | null;
  multiplier: number;
  currentLocation: string;
  activeBarcode: string | null;
  activeProduct: Product | null;
  optimisticQty: number;
  potentialMatch: PotentialMatch | null;
  autoSave: {
    hasPendingChanges: boolean;
    lastSaveTime: number | null;
    isSaving: boolean;
  };
}
```

---

## ✅ CRITERIOS DE ÉXITO (COMPLETADOS)

- [x] `useCountingLogic.ts` refactorizado usando hooks
- [x] Hooks extraídos reutilizables
- [x] TypeScript sin errores
- [x] Tests pasando (955 tests)
- [x] Build exitoso
- [x] Acciones extraídas a `useCountingActions`
- [x] Hooks reutilizables en otros módulos (Hammer, Reception)
- [ ] Tests para cada hook (parcialmente)

---

## 📈 MÉTRICAS

| Métrica                | Antes | Después |
| ---------------------- | ----- | ------- |
| LOC useCountingLogic   | ~405  | ~216    |
| LOC useCountingActions | 0     | ~305    |
| Hooks reutilizables    | 0     | 4       |
| Tests countingDomain   | 0     | 42      |
| Tests sessionTypes     | 0     | 23      |
| Total tests            | 915   | 955     |

---

## 📝 NOTAS

### Race Conditions en Auto-save

El PDF identifica un riesgo: `itemsRef` puede no estar sincronizado con el estado cuando `consolidatedHistory` cambia.

**Solución propuesta:**

```typescript
// En lugar de dual state + ref
const [items, setItems] = useState<ConsolidatedItem[]>([]);
const itemsRef = useRef(items);

// Usar una sola fuente de verdad con useSyncExternalStore
// o sincronizar explícitamente:

useEffect(() => {
  itemsRef.current = consolidatedHistory;
}, [consolidatedHistory]);
```

### Mode-switching con prefijo

Ya resuelto con `sessionTypes.ts` (Sprint 0).

```typescript
// Antes (frágil):
if (sessionId.startsWith('HM-'))

// Ahora (robusto):
const { sessionId: parsed } = parseSessionId(sessionId);
if (parsed.mode === 'blind')
```
