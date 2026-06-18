# Análisis de Hooks y Services Raíz - ContarStock v2

## Resumen Ejecutivo

Análisis de hooks y services en la raíz de `src/`:
- 13 hooks (1,118 líneas totales)
- 1 servicio audio (SoundFX central)

---

## 1. ANÁLISIS DE HOOKS

### 1.1 Hooks extensos (>100 líneas)

| Hook | Líneas | Análisis |
|------|--------|----------|
| `useOpticalEngine.ts` | 163 | ⚠️ Engine de OCR/procesamiento |
| `useAutoSync.ts` | 156 | ✅ Auto-sync logic |
| `useScannerEngine.ts` | 141 | ⚠️ Motor de escaneo |
| `useExpiryWatcher.ts` | 132 | ✅ Watcher de vencimientos |
| `useHIDScanner.ts` | 104 | ✅ HID scanner support |

### 1.2 Hooks con SoundFX

| Hook | SoundFX | Análisis |
|------|---------|----------|
| `useCaptureSession.ts` | ⚠️ Import | Solo import (sin uso) |
| `useScannerEngine.ts` | ⚠️ Import | Solo import (sin uso) |
| `useFeedbackSystem.ts` | ⚠️ **USA** | Sistema de feedback multimodal |

---

## 2. ANÁLISIS DE useFeedbackSystem

### Propósito
Sistema **MULTIMODAL** de feedback que combina:
1. **Estado visual** (`feedback: 'idle' | 'success' | 'error' | ...`)
2. **Sonido** (SoundFX.play)
3. **Vibración** (navigator.vibrate)

### Consumers de useFeedbackSystem

```
src/hooks/useScannerEngine.ts        → usa { feedback, trigger }
src/shared/hooks/useScannerEngine.ts → usa { feedback, trigger }
src/features/expiry/ExpiryPage.tsx   → importa tipo FeedbackStatus
IndustrialScannerLayout.tsx          → usa FeedbackStatus
ScannerTargetOverlay.tsx             → usa FeedbackStatus
CountingCameraView.tsx               → usa FeedbackStatus
HammerCameraView.tsx                 → usa FeedbackStatus
```

### DECISIÓN IMPORTANTE

```
⚠️ useFeedbackSystem NO DEBE SER ELIMINADO

RAZONES:
1. Proveé feedback VISUAL que es esencial para la UX
2. SoundFX es solo UNA parte del sistema
3. Hay consumers que solo usan el estado visual (FeedbackStatus)
4. El feedback multimodal es una buena práctica de accesibilidad
```

---

## 3. DECISIONES FINALES - FASE 16

| # | Componente | Acción | Prioridad |
|---|------------|--------|-----------|
| 16.1 | `useFeedbackSystem` | ✅ **MANTENER** | - |
| 16.2 | `SoundFX` en hooks | ⚠️ **POSTERGAR** | Decisión de UX |
| 16.3 | Imports innecesarios | 🔧 Limpiar imports | Baja |

### Limpieza de imports innecesarios

```
useCaptureSession.ts - importa SoundFX pero no lo usa
useScannerEngine.ts   - importa SoundFX pero no lo usa
```

---

## 4. IMPLEMENTACIÓN PROPUESTA - FASE 16

### 4.1 Limpiar imports innecesarios (5 min)

```typescript
// useCaptureSession.ts - línea 4
- import { SoundFX } from '../services/audio';  // ELIMINAR

// useScannerEngine.ts - línea 7  
- import { SoundFX } from '../services/audio';  // ELIMINAR
```

### 4.2 Mantener useFeedbackSystem

```
useFeedbackSystem es un hook de ACCESIBILIDAD
- Feedback visual para usuarios
- Feedback sonoro para productividad
- Vibración para dispositivos móviles

DECISIÓN: MANTENER hasta que usuario lo solicite
```

---

## 5. CONCLUSIÓN

| Aspecto | Estado |
|---------|--------|
| useFeedbackSystem | ✅ MANTENER (sistema multimodal) |
| SoundFX central | ✅ MANTENER (parte de feedback) |
| Imports innecesarios | 🔧 Limpiar |
| Módulo Sync | ✅ Bien diseñado |

---

## 6. PRÓXIMOS PASOS

1. Limpiar imports de SoundFX en hooks no-used
2. Documentar que useFeedbackSystem es sistema de accesibilidad
3. Validar con usuario si desea deshabilitar sonidos globalmente

---

*Análisis generado: 2026-06-18*
