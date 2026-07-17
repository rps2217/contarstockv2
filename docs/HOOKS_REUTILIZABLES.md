# Hooks Reutilizables - Arquitectura Shared

Este documento lista los hooks que son compartidos entre módulos y cómo se utilizan.

---

## 📦 Hooks Compartidos en `src/shared/hooks/`

### 1. `useScanPipeline` - Pipeline de Escaneo

**Ubicación:** `src/shared/hooks/useScanPipeline.ts`

**Descripción:** Pipeline de procesamiento de códigos de barras con feedback táctil y visual.

**Uso en Módulos:**

| Módulo        | Uso                                         |
| ------------- | ------------------------------------------- |
| **Counting**  | ✅ Usa internamente en `useCountingScanner` |
| **Hammer**    | ✅ `useHammerLogic.ts` lo usa directamente  |
| **Reception** | ⚠️ No usa (flujo diferente)                 |

**API:**

```typescript
const { engine, processScan } = useScanPipeline(defaultMultiplier);

// engine.multiplier
// engine.setMultiplier(value)
// engine.activeBarcode
// engine.activeProduct
// engine.feedback
// engine.actions.updateActiveItem()
// engine.actions.resetActive()
// engine.actions.triggerFeedback()
```

---

### 2. `useExpiryActions` - Manejo de Vencimiento

**Ubicación:** `src/shared/hooks/useExpiryActions.ts`

**Descripción:** Lógica reutilizable para registro de fecha de vencimiento.

**Uso en Módulos:**

| Módulo        | Uso                                         |
| ------------- | ------------------------------------------- |
| **Counting**  | ✅ `useCountingActions.ts` puede usarlo     |
| **Hammer**    | ✅ `useHammerLogic.ts` tiene lógica similar |
| **Reception** | ⚠️ No aplica (no maneja vencimiento)        |

**API:**

```typescript
const { handleExpiryComplete, handleExpiryCancel, isNoDate } = useExpiryActions({
  sessionId,
  currentLocation,
  engine,
  saveExpiry,
  getExpiryForBarcode,
  syncExpiry,
});
```

---

### 3. `useSync` - Sincronización

**Ubicación:** `src/shared/hooks/useSync.ts`

**Descripción:** Hook unificado de sincronización con la nube.

**Uso en Módulos:**

| Módulo        | Uso                                           |
| ------------- | --------------------------------------------- |
| **Counting**  | ✅ `useCountingSync.ts`                       |
| **Hammer**    | ✅ `pushScansToCloud()` en `hammerSync.ts`    |
| **Reception** | ✅ `useReceptionLogic.ts` usa `syncToCloud()` |

---

### 4. `useOfflineSync` - Cola Offline

**Ubicación:** `src/shared/hooks/useOfflineSync.ts`

**Descripción:** Sincronización cuando vuelve la conexión.

**Componentes:**

- `OfflineIndicator` - Indicador visual de estado offline
- `OfflineRecoveryBanner` - Banner de recuperación

---

### 5. `useEventsSync` - Sincronización de Eventos

**Ubicación:** `src/shared/hooks/useEventsSync.ts`

**Descripción:** Sincronización de eventos con deduplicación.

---

### 6. `useProductivity` - Métricas de Productividad

**Ubicación:** `src/shared/hooks/useProductivity.ts`

**Descripción:** Tracking de velocidad de escaneo y productividad.

**Uso en Módulos:**

| Módulo        | Uso                        |
| ------------- | -------------------------- |
| **Counting**  | ✅ `useCountingMetrics.ts` |
| **Hammer**    | ✅ Métricas en UI          |
| **Reception** | ⚠️ No usa                  |

---

### 7. `useTurboMode` - Modo Turbo

**Ubicación:** `src/shared/hooks/useTurboMode.ts`

**Descripción:** Modo de conteo rápido sin interrupciones.

---

### 8. `useKeyboardShortcuts` - Atajos de Teclado

**Ubicación:** `src/shared/hooks/useKeyboardShortcuts.ts`

**Descripción:** Sistema de atajos de teclado reutilizable.

---

### 9. `useGlobalSearch` - Búsqueda Global

**Ubicación:** `src/shared/hooks/useGlobalSearch.ts`

**Descripción:** Búsqueda unificada en productos, sesiones, etc.

---

### 10. `useTheme` - Tema de la App

**Ubicación:** `src/shared/hooks/useTheme.ts`

**Descripción:** Gestión del tema (oscuro/claro) y personalización.

---

### 11. `useSoftDelete` - Eliminación Suave

**Ubicación:** `src/shared/hooks/useSoftDelete.ts`

**Descripción:** Sistema de eliminación temporal con recuperación.

---

## 🔄 Hooks de Counting Extraídos

**Ubicación:** `src/features/counting/hooks/`

Estos hooks están diseñados para ser reutilizables:

| Hook                  | Descripción          | Reutilizable en      |
| --------------------- | -------------------- | -------------------- |
| `useCountingSession`  | Gestión de sesión    | ⚠️ Hammer (parcial)  |
| `useCountingScanner`  | State machine        | ⚠️ Hammer (parcial)  |
| `useCountingAutosave` | Persistencia         | ⚠️ Hammer            |
| `useCountingActions`  | Acciones de conteo   | ⚠️ Hammer, Reception |
| `useCountingSync`     | Sincronización       | ✅ Ya compartido     |
| `useCountingQueries`  | Queries consolidadas | ⚠️ Hammer            |

---

## 📊 Estado de Reutilización

```
┌─────────────────────────────────────────────────────────────────┐
│                      src/shared/hooks/                          │
│                    (Repositorio Central)                         │
├─────────────────────────────────────────────────────────────────┤
│  ✅ useScanPipeline    → Counting, Hammer                        │
│  ✅ useExpiryActions   → Counting, Hammer                        │
│  ✅ useSync           → Counting, Hammer, Reception              │
│  ✅ useOfflineSync    → Todos los módulos                        │
│  ✅ useEventsSync     → Eventos                                  │
│  ✅ useProductivity   → Counting, Hammer                         │
│  ✅ useTurboMode      → Counting                                 │
│  ✅ useTheme          → Toda la app                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Próximas Oportunidades

1. **Extraer `useCountingActions` a shared hooks**
   - Acciones de escaneo que pueden ser compartidas
   - Estado de multiplier, feedback, etc.

2. **Unificar lógica de sync en Hammer**
   - Usar `useSync` en lugar de lógica inline
   - Implementar `useExpiryActions`

3. **Crear hook de métricas compartido**
   - Velocidad de escaneo
   - Items por hora
   - Tendencias

---

## 📝 Notas

### Hammer usa `useScanPipeline` directamente

```typescript
// src/features/hammer/hooks/useHammerLogic.ts
import { useScanPipeline } from '../../../shared/hooks/useScanPipeline';

const { engine, processScan } = useScanPipeline(1);
```

### Counting usa hooks extraídos

```typescript
// src/features/counting/hooks/useCountingLogic.ts
import { useCountingScanner } from './useCountingScanner';
import { useCountingSession } from './useCountingSession';

const { machineState, dispatch, engine } = useCountingScanner(multiplier);
const { session, multiplier, setMultiplier } = useCountingSession(sessionId);
```

### Reception tiene flujo independiente

```typescript
// src/features/reception/hooks/useReceptionLogic.ts
// No usa hooks de counting - flujo diferente (foto + sesión)
```
