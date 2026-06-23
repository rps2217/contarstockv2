# 🔍 Auditoría Completa - ContarStock v2

**Fecha:** 2026-06-23
**Estado Build:** ✅ Local exitoso | ❌ Vercel fallando (caché corrupta)

---

## 1. 🏗️ ESTRUCTURA DEL PROYECTO

### Estadísticas
- **Archivos TS/TSX:** 470
- **Bundle principal:** ~480KB (gzip: ~134KB)
- **Bundle total:** ~4.5MB (gzip: ~1.2MB)
- **Features:** 20 módulos
- **Servicios:** 53 archivos
- **Repositorios:** 23 archivos

### Directorios Problemáticos
```
src/features/     ←→  src/shared/features/
src/components/   ←→  src/shared/components/
src/hooks/        ←→  src/features/*/hooks/
```
**Problema:** Estructura duplicada que causa confusión.

---

## 2. 🐛 PROBLEMAS DE DESPLIEGUE

### Causa Raíz
```
Error: Cannot find module '.../workbox-build/node_modules/lru-cache/dist/commonjs/node/index.min.js'
```
- La caché de Vercel tiene `workbox-build` corrupto
- El proyecto usaba `injectManifest` que requiere `workbox-build`

### Solución Aplicada
- Cambiado de `injectManifest` a `generateSW` en vite.config.ts
- Eliminado `src/sw.ts` (ya no necesario)

### Estado Actual
- ✅ Build local funciona correctamente
- ⏳ Vercel: necesita nueva construcción limpia

---

## 3. 🗑️ CÓDIGO BASURA / OBSOLETO

### 3.1 Archivos Deprecados

| Archivo | Estado | Acción Sugerida |
|---------|--------|-----------------|
| `src/services/supabaseSyncService.ts` | @deprecated | Eliminar (wrapper de compatibilidad) |
| `src/services/tests/legacyTests.ts` | Legacy | Eliminar |
| `src/sw.ts` | Eliminado | Confirmar eliminación en git |

### 3.2 Código con TODO/FIXME
```
src/services/utils.ts
src/types/global/sync.ts
src/features/settings/components/support/BackupCard.tsx
src/features/reception/ReceptionPage.tsx
src/features/expected-orders/ExpectedOrdersPage.tsx
src/features/inventory/components/ProductForm.tsx
src/features/events/hooks/useEventUI.ts
```

### 3.3 Dependencies Workbox (para limpiar)
```json
"workbox-cacheable-response": "^7.4.0",
"workbox-expiration": "^7.4.0",
"workbox-precaching": "7.0.0",
"workbox-routing": "^7.4.0",
"workbox-strategies": "^7.4.0"
```
**Nota:** Ya no son necesarios con `generateSW`

---

## 4. ⚠️ PROBLEMAS TÉCNICOS

### 4.1 Dynamic Imports vs Static Imports (103 instances)
Múltiples archivos son importados tanto dinámica como estáticamente:
- `src/db.ts`
- `src/services/logger.ts`
- `src/lib/supabase.ts`
- `src/services/dynamicSync.ts`
- `src/services/sync/BatchUploader.ts`
- `src/services/types/index.ts`
- `src/services/erpService.ts`
- `src/repositories/DexieProductRepository.ts`
- `src/repositories/ProviderRepository.ts`

**Impacto:** Advertencias de Rollup, posible duplicación de código.

### 4.2 Archivos Grandes (>500 líneas)

| Archivo | Líneas | Prioridad |
|---------|--------|-----------|
| `src/hooks/useBulkActionsAdvanced.tsx` | 927 | 🔴 Alta |
| `src/core/hardware/ThermalPrinterEngine.ts` | 820 | 🟡 Media |
| `src/components/StartSessionModal.tsx` | 655 | 🟡 Media |
| `src/features/expected-orders/hooks/useExpectedOrders.ts` | 643 | 🟡 Media |

### 4.3 Console.log en Producción
```
src/repositories/DatabaseSanitizer.ts: 3
src/services/productService.ts: 2
src/hooks/useExpiryWatcher.ts: 2
src/hooks/useAutoSync.ts: 2
src/services/backupService.ts: 1
```

### 4.4 CSS @import Warnings
```
Warning: @import rules must precede all rules aside from @charset and @layer statements
```
**Archivos afectados:** `src/styles/` y múltiples archivos CSS

---

## 5. 📊 ÁREAS DE MEJORA

### 5.1 Prioridad ALTA

| Área | Problema | Solución |
|------|----------|----------|
| **Dynamic Imports** | 103 imports mixtos | Unificar a estáticos |
| **Bundle Size** | ~4.5MB total | Code splitting adicional |
| **Vercel Cache** | Corrupta | Limpiar manualmente |

### 5.2 Prioridad MEDIA

| Área | Problema | Solución |
|------|----------|----------|
| **useBulkActionsAdvanced** | 927 líneas | Dividir en hooks más pequeños |
| **ThermalPrinterEngine** | 820 líneas | Extraer utilities |
| **Console.log** | En producción | Reemplazar por logger |
| **workbox-* deps** | Sin uso | Eliminar dependencias |

### 5.3 Prioridad BAJA

| Área | Problema | Solución |
|------|----------|----------|
| **Estructura duplicada** | features/shared | Documentar convenciones |
| **Legacy tests** | archivo orphaned | Eliminar |
| **supabaseSyncService** | wrapper deprecado | Eliminar |

---

## 6. 🔧 PLAN DE ACCIÓN

### Fase 1: Fix Despliegue (Urgente)
- [x] Cambiar injectManifest → generateSW ✅
- [ ] Limpiar caché de Vercel (manual)
- [ ] Push y verificar deployment

### Fase 2: Limpieza de Código (Esta semana)
- [ ] Eliminar `workbox-*` dependencies
- [ ] Eliminar `src/services/supabaseSyncService.ts`
- [ ] Eliminar `src/services/tests/legacyTests.ts`
- [ ] Limpiar console.log en producción

### Fase 3: Refactoring (Próxima semana)
- [ ] Unificar dynamic imports problemáticos
- [ ] Dividir `useBulkActionsAdvanced.tsx`
- [ ] Dividir `ThermalPrinterEngine.ts`
- [ ] Agregar tests faltantes

### Fase 4: Optimización (Futuro)
- [ ] Implementar lazy loading consistente
- [ ] Reducir bundle size
- [ ] Documentar arquitectura

---

## 7. 📁 ARCHIVOS A ELIMINAR

```bash
# Deprecados
src/services/supabaseSyncService.ts
src/services/tests/legacyTests.ts

# No necesarios (después de generateSW)
src/sw.ts  # Ya eliminado

# Dependencias a eliminar de package.json
workbox-cacheable-response
workbox-expiration
workbox-precaching
workbox-routing
workbox-strategies
```

---

## 8. 📈 MÉTRICAS ACTUALES

| Métrica | Valor | Meta |
|---------|-------|------|
| Archivos TS/TSX | 470 | - |
| Bundle Principal | 480KB | <400KB |
| Bundle Total | 4.5MB | <3MB |
| Tests passing | 149 | >200 |
| Cobertura | ~40% | >60% |
| Dynamic imports | 103 | <20 |

---

*Auditoría generada automáticamente - 2026-06-23*
