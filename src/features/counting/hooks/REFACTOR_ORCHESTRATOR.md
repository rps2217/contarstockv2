# Refactor del Orquestador - useCountingLogic

**Estado:** Planificado
**Archivo actual:** `useCountingLogic.ts` (405 LOC)
**Meta:** ≤80 LOC por hook

---

## 📊 DIAGNÓSTICO ACTUAL

El archivo `useCountingLogic.ts` concentra demasiada lógica:

```
┌─────────────────────────────────────────────────────────────┐
│ useCountingLogic.ts (405 LOC) - GOD HOOK                    │
├─────────────────────────────────────────────────────────────┤
│ • State machine (scannerReducer)                          │
│ • Auto-save & recovery (30s interval)                     │
│ • Finalize scan pipeline                                   │
│ • Reset session                                            │
│ • Actions (undo, toggle, apply match, pharma, beforeunload)│
│ • Location management                                      │
│ • 12+ useCallback/useMemo/useEffect cruzados              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 PLAN DE PARTICIÓN

Se propone partir en **5 hooks cohesivos**:

### 1. `useCountingSession` - Gestión de Sesión

**Responsabilidad:** Inicio/fin de sesión, multiplicador, location, beforeunload

**Tamaño esperado:** ~80 LOC

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

**Responsabilidad:** Estado del scanner, dispatch de acciones

**Tamaño esperado:** ~60 LOC

```typescript
// Uso:
const { machineState, dispatch, activeBarcode, activeProduct, feedback } = useCountingScanner();
```

### 3. `useCountingAutosave` - Persistencia

**Responsabilidad:** Auto-save cada 30s, recovery, beforeunload

**Tamaño esperado:** ~100 LOC

```typescript
// Uso:
const { saveNow, hasPendingChanges, lastSaveTime, clearSavedData, recoveredData } =
  useCountingAutosave(sessionId, items, location);
```

### 4. `useCountingActions` - Acciones

**Responsabilidad:** undoLastScan, toggleAutoLock, applyPotentialMatch, pharmaCompletion

**Tamaño esperado:** ~80 LOC

```typescript
// Uso:
const { undoLastScan, toggleAutoLock, applyPotentialMatch, pharmaComplete } = useCountingActions(
  sessionId,
  dispatch
);
```

### 5. `useCountingSync` - Sincronización (ya existe)

Ya está separado en `useCountingSync.ts`.

---

## 🔄 ARQUITECTURA PROPUESTA

```
┌─────────────────────────────────────────────────────────────┐
│                    useCountingLogic.ts                       │
│                    (Wrapper/Composer)                        │
├─────────────────────────────────────────────────────────────┤
│  useCountingSession   → Sesión, multiplicador, location    │
│  useCountingScanner   → State machine, barcode activo       │
│  useCountingAutosave  → Persistencia, recovery              │
│  useCountingActions   → Undo, lock, match, pharma          │
│  useCountingSync      → Sincronización (ya existe)         │
│  useCountingQueries   → Queries de DB (ya existe)          │
│  useCountingAI        → AI matching (ya existe)            │
│  useExpiryTracker     → Tracking de vencimientos (ya existe)│
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 CONTRATOS

### SessionId

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

## 🚀 MIGRACIÓN PASO A PASO

### Fase 1: Crear hooks vacíos (1 día)

1. Crear `useCountingSession.ts` con firma pero sin lógica
2. Crear `useCountingScanner.ts` con firma pero sin lógica
3. Crear `useCountingAutosave.ts` con firma pero sin lógica
4. Crear `useCountingActions.ts` con firma pero sin lógica
5. Update `useCountingLogic.ts` para importar de los nuevos hooks

### Fase 2: Extraer lógica (3 días)

1. Mover lógica de sesión a `useCountingSession`
2. Mover state machine a `useCountingScanner`
3. Mover auto-save a `useCountingAutosave`
4. Mover actions a `useCountingActions`

### Fase 3: Tests (2 días)

1. Tests unitarios para cada hook
2. Tests de integración del wrapper

### Fase 4: Cleanup (1 día)

1. Eliminar lógica duplicada de `useCountingLogic`
2. Mantener solo el wrapper
3. Verificar que todo funciona

---

## ✅ CRITERIOS DE ÉXITO

- [ ] `useCountingLogic.ts` ≤ 100 LOC
- [ ] Cada nuevo hook ≤ 100 LOC
- [ ] Tests para cada hook
- [ ] TypeScript sin errores
- [ ] Funcionalidad sin regresiones

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
