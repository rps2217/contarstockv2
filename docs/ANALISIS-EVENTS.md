# Análisis del Módulo Events/Eventos - ContarStock v2

## Resumen Ejecutivo

El módulo `events/` gestiona **eventos de inventario** con 5,067 líneas organizadas en:
- 2 páginas: EventManagementPage, EventCapturePage
- 12 componentes modulares
- 7 hooks (Domain Hook pattern)
- 3 servicios/constants

**Patrón:** Arquitectura Lego parcialmente implementada ✅

---

## 1. ANÁLISIS POR ARCHIVO

### 1.1 Archivos extensos (>200 líneas)

| Archivo | Líneas | Análisis |
|---------|--------|----------|
| `EventEmailModal.tsx` | 511 | ⚠️ Gestión de plantillas email |
| `EventItemCard.tsx` | 420 | ⚠️ Card de evento |
| `CreateEventModal.tsx` | 368 | ✅ Ya refactorizado (~600→368) |
| `EventCaptureModal.tsx` | 300 | ⚠️ Con SoundFX |
| `EventSettingsDrawer.tsx` | 204 | ✅ |
| `EventFilterDrawer.tsx` | 213 | ✅ |

### 1.2 Hooks

| Hook | Líneas | Análisis |
|------|--------|----------|
| `useEventUI` | 281 | ✅ Domain logic |
| `useEventMutations` | 329 | ✅ CRUD operations |
| `useEventFilters` | 242 | ✅ Filtros |
| `useEventForm` | 214 | ✅ Form state |
| `useEventQueries` | 211 | ✅ Queries |
| `useEventDatabase` | 95 | ✅ Façade |

---

## 2. PROBLEMAS IDENTIFICADOS

### 2.1 SoundFX en Events

```
Archivos con SoundFX:
- EventCapturePage.tsx
- EventCaptureModal.tsx

ACCIÓN: Eliminar en FASE 15
```

### 2.2 EventEmailModal (511 líneas) ⚠️

| Aspecto | Análisis |
|---------|----------|
| **Propósito** | Gestión de plantillas de email |
| **Responsabilidades** | Lista de plantillas, editor, preview, envío |
| **PROBLEMA** | Múltiples responsabilidades en un archivo |

**Recomendación:** Extraer a sub-componentes:
- `EmailTemplateList.tsx`
- `EmailTemplateEditor.tsx`
- `EmailPreview.tsx`

**NOTA:** Postergar para fase posterior (no crítico)

### 2.3 CreateEventModal - Refactorización exitosa ✅

```
NOTA: Ya fue refactorizado (de ~600 a 368 líneas)
- Delega lógica a useEventForm
- Renderiza componentes especializados
```

---

## 3. DECISIONES FINALES

| # | Componente | Acción | Prioridad |
|---|------------|--------|-----------|
| 15.1 | SoundFX en EventCapturePage | **ELIMINAR** | Alta |
| 15.2 | SoundFX en EventCaptureModal | **ELIMINAR** | Alta |
| 15.3 | EventEmailModal | **POSTERGAR** (511 líneas - gestión de estado compleja) | Baja |

---

## 4. IMPLEMENTACIÓN PROPUESTA - FASE 15

```
ELIMINAR SoundFX en:
1. EventCapturePage.tsx
2. EventCaptureModal.tsx
```

---

## 5. CONCLUSIÓN

El módulo `events/` está **parcialmente refactorizado**:
- ✅ CreateEventModal ya mejorado (~600→368 líneas)
- ✅ Arquitectura Lego implementada en hooks
- ❌ SoundFX presente en 2 archivos
- ⚠️ EventEmailModal extenso pero funcional

---

*Análisis generado: 2026-06-18*
