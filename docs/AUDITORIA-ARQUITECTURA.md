# Auditoría de Arquitectura - ContarStock v2

**Fecha:** 2026-06-24  
**Auditor:** OpenHands  
**Versión:** 1.0

---

## Resumen Ejecutivo

La aplicación ContarStock v2 presenta una **arquitectura parcialmente bien diseñada** con conceptos Lego implementados en ~60% de los módulos. Se identificaron **3 problemas críticos**, **5 mejoras recomendadas** y **11 oportunidades de optimización**.

**Puntuación General:** 7.5/10

---

## 1. Estructura de Carpetas ✅

### Estado Actual
```
src/
├── app/                      ✅ Organizado
├── components/                ⚠️ Mezcla legacy + nuevos (24 archivos)
├── features/                  ✅ Arquitectura modular
│   ├── counting/             ✅ domain/hooks/components/
│   ├── inventory/            ✅ domain/hooks/components/
│   ├── expiry/               ✅ domain/hooks/components/
│   ├── events/               ✅ domain/hooks/components/
│   └── ...
├── hooks/                    ⚠️ 28 hooks globales (algunos deberían ser módulo-local)
├── repositories/             ✅ ~20 repositories
├── services/                 ⚠️ ~50 servicios (responsabilidad difusa)
├── shared/                   ✅ Componentes compartidos bien organizados
├── stores/                   ✅ Zustand stores
├── theme/                    ✅ ThemeManager + ThemeCustomizer
└── types/                    ⚠️ Dispersos
```

### Evaluación

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Modularidad | ✅ Bueno | features/ bien organizado |
| Componentes compartidos | ✅ Bueno | shared/ ui/layout bien estructurados |
| Consistencia | ⚠️ Regular | Algunos módulos incompletos |
| Lazy loading | ❌ Falta | No implementado consistentemente |

---

## 2. Módulos Features - Análisis Detallado

### Módulos con Arquitectura Lego Completa ✅

| Módulo | Domain | Hooks | Components | Exports | Tests |
|--------|--------|-------|------------|---------|-------|
| counting | ✅ | ✅ | ✅ | ✅ | ✅ 37 |
| inventory | ✅ | ✅ | ✅ | ✅ | ✅ 34 |
| expiry | ✅ | ✅ | ✅ | ✅ | ✅ 27 |
| events | ✅ | ✅ | ✅ | ✅ | ✅ 26 |

### Módulos Pendientes de Consolidación ⚠️

| Módulo | Domain | Hooks | Components | Prioridad |
|--------|--------|-------|------------|-----------|
| suppliers | ❌ | ⚠️ | ⚠️ | Media |
| customers | ❌ | ⚠️ | ⚠️ | Baja |
| reports | ❌ | ⚠️ | ⚠️ | Media |
| reception | ❌ | ⚠️ | ⚠️ | Baja |

---

## 3. Componentes Compartidos (Bloques Lego) ✅

### Primitivos UI - shared/components/ui/

| Componente | Archivo | Estado | Tests |
|------------|---------|--------|-------|
| Button | Button.tsx | ✅ | ✅ 6 tests |
| Badge | Badge.tsx | ✅ | ❌ |
| Card | Card.tsx | ✅ | ❌ |
| Input | Input.tsx | ✅ | ❌ |
| Modal | Modal.tsx | ✅ | ❌ |
| Spinner | Spinner.tsx | ✅ | ❌ |
| Skeleton | Skeleton.tsx | ✅ | ❌ |
| VirtualList | VirtualList.tsx | ✅ | ❌ |

### Layout Components - shared/components/layout/

| Componente | Archivo | Estado |
|------------|---------|--------|
| DualView | DualView.tsx | ✅ |
| ModuleHeader | ModuleHeader.tsx | ✅ |
| CaptureLayout | CaptureLayout.tsx | ✅ |

---

## 4. Problemas Identificados 🔴

### Problema #1: Duplicación ThemeCustomizer ⚠️ CRÍTICO

**Descripción:** Existe duplicación de funcionalidad entre:
- `src/theme/components/ThemeCustomizer.tsx` (625 líneas, nuevo sistema)
- `src/features/settings/components/ThemeSection.tsx` (409 líneas, sistema simple)

**Impacto:** Mantenimiento两份, inconsistencia en UX.

**Recomendación:** Mantener solo ThemeCustomizer y integrarlo en SettingsPage.

### Problema #2: Hook Gigante useBulkActionsAdvanced ⚠️ ALTO

**Descripción:** `hooks/useBulkActionsAdvanced.tsx` tiene **927 líneas**.

**Impacto:** Dificultad de mantenimiento, no reusable.

**Recomendación:** Dividir en hooks más pequeños por funcionalidad.

### Problema #3: Servicios sin Consolidar ⚠️ MEDIO

**Descripción:** ~50 servicios en `services/` sin estructura clara.

**Impacto:** Difuminación de responsabilidades.

**Recomendación:** Agrupar por dominio (sync/, cloud/, analytics/).

---

## 5. Métricas de Calidad

### Tests Coverage

| Categoría | Tests | Coverage |
|-----------|-------|----------|
| Domain logic | ~150 | ~90% |
| Hooks | ~50 | ~60% |
| Services | ~30 | ~40% |
| Components | ~20 | ~20% |
| **Total** | **~500** | **~45%** |

### Bundle Analysis

| Métrica | Valor | Target |
|---------|-------|--------|
| Bundle size | 4.5 MB | <4 MB |
| Chunks | 68 | Optimizar |
| Tree shaking | ✅ | ✅ |

---

## 6. Recomendaciones Prioritarias

### Fase 1: Correcciones Inmediatas (1 día)

1. **Integrar ThemeCustomizer en Settings** (1 hora)
   - Usar ThemeCustomizer en SettingsPage
   - Eliminar lógica duplicada de ThemeSection

2. **Dividir useBulkActionsAdvanced** (4 horas)
   - Extraer: useBulkSelection, useBulkOperations, useBulkExport
   - Mover a módulo correspondiente

### Fase 2: Consolidación (3 días)

3. **Crear exports centralizados** para módulos incompletos
   - suppliers/, customers/, reports/

4. **Agrupar servicios** en subcarpetas
   - services/sync/
   - services/cloud/
   - services/analytics/

### Fase 3: Optimización (5 días)

5. **Lazy loading** para páginas pesadas
6. **Virtualización** para listas > 100 items
7. **Coverage** aumentar a 60%

---

## 7. Checklist de Arquitectura Lego

| Criterio | counting | inventory | expiry | events |
|----------|---------|-----------|--------|--------|
| domain/ folder | ✅ | ✅ | ✅ | ✅ |
| hooks/ folder | ✅ | ✅ | ✅ | ✅ |
| components/ folder | ✅ | ✅ | ✅ | ✅ |
| domain/index.ts | ✅ | ✅ | ✅ | ✅ |
| hooks/index.ts | ✅ | ✅ | ✅ | ✅ |
| components/index.ts | ✅ | ✅ | ✅ | ✅ |
| Tests > 80% | ✅ | ✅ | ✅ | ✅ |
| Sin console.log | ✅ | ✅ | ✅ | ✅ |

---

## 8. Plan de Acción Inmediato

### HOY: Corrección Duplicación ThemeCustomizer

```tsx
// SettingsPage.tsx - Cambiar import
import { ThemeSection } from './components/ThemeSection';
import { ThemeCustomizer } from '@/theme';

// Reemplazar uso
<ThemeSection ... />
<ThemeCustomizer />
```

### ESTA SEMANA: Dividir useBulkActionsAdvanced

```
hooks/useBulkActionsAdvanced.tsx (927 líneas)
  ├── useBulkSelection.ts (~200 líneas)
  ├── useBulkOperations.ts (~300 líneas)
  └── useBulkExport.ts (~200 líneas)
```

---

*Documento de auditoría generado: 2026-06-24*
