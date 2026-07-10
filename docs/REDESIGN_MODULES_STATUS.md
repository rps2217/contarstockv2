# Estado de Módulos Redesign

**Última actualización:** 2026-07-05

---

## Resumen

| Módulo | Estado | Datos | Notas |
|--------|--------|-------|-------|
| Dashboard | ✅ Completo | Reales | Hook de dashboard |
| Capture | ✅ Completo | Reales | Escaneo funcional |
| Counting | ✅ Completo | Reales | Refactorizado v2 |
| Events | ⚠️ Demo | Demo | Necesita tabla events |
| Customers | ⚠️ Demo | Demo | CRUD básico |
| Suppliers | ⚠️ Demo | Demo | CRUD básico |
| Inventory | ⚠️ Demo | Demo | CRUD básico |
| Expiry | ⚠️ Demo | Demo | Necesita hooks expiry |
| Sync | ⚠️ Demo | Demo | UI lista |
| Settings | ⚠️ Parcial | Real | Funciones básicas |
| Reports | ⚠️ Demo | Demo | UI lista |
| Audit | ⚠️ Demo | Demo | UI lista |
| DataPage | ⚠️ Demo | Demo | CRUD genérico |
| Dynamic | ⚠️ Demo | Demo | Tablas dinámicas |
| ExpectedOrders | ⚠️ Demo | Demo | UI lista |
| Hammer | ⚠️ Demo | Demo | UI lista |
| Reception | ⚠️ Demo | Demo | UI lista |
| Slices | ⚠️ Demo | Demo | UI lista |
| TheoreticalLoads | ⚠️ Demo | Demo | UI lista |

---

## Módulos Funcionales (features/)

Estos módulos tienen lógica completa en `src/features/`:

| Módulo | Ruta | Hook | Componentes |
|--------|------|------|-------------|
| counting | /counting/:id | useCountingLogic | ✅ Completos |
| customers | /customers | useCustomers | ✅ Completos |
| suppliers | /suppliers | useSuppliers | ✅ Completos |
| expiry | /expiry | useExpiry | ✅ Completos |
| inventory | /inventory | useProducts | ✅ Completos |
| sync | /sync | useSyncManager | ✅ Completos |
| settings | /settings | - | ✅ Completos |
| reports | /reports | - | ✅ Completos |
| expected-orders | /expected-orders | useExpectedOrders | ✅ Completos |
| reception | /reception | useReceptionLogic | ✅ Completos |
| slices | /slices | useSlices | ✅ Completos |
| hammer | /hammer | - | ✅ Completos |

---

## Módulos Necesarios para Integración

### 1. Events Module
**Problema:** El módulo events fue eliminado del repositorio (commit 98df8b1d).

**Solución propuesta:**
1. Recrear tabla `events` en IndexedDB
2. Crear hooks en `features/events/hooks/`
3. Conectar RedesignEventsPage a datos reales

### 2. Expiry Integration
**Problema:** RedesignExpiryPage usa datos demo.

**Solución:**
1. Usar hooks existentes de `features/expiry/`
2. Actualizar imports en RedesignExpiryPage

---

## Próximos Pasos

1. **Crear tabla events** en IndexedDB
2. **Integrar hooks de expiry** en RedesignExpiryPage
3. **Migrar módulos demo** a datos reales uno por uno

---

## Wrappers Disponibles

### RedesignWrapper
```tsx
import { RedesignWrapper } from '@/shared/components/redesign/components/RedesignWrapper';

// Uso básico
<RedesignWrapper withPadding>
  {children}
</RedesignWrapper>

// Con header
<RedesignWrapper withHeader headerTitle="Eventos" headerSubtitle="Registro de incidencias">
  {children}
</RedesignWrapper>
```

### SimpleRedesignWrapper
```tsx
import { SimpleRedesignWrapper } from '@/shared/components/redesign/components/RedesignWrapper';

<SimpleRedesignWrapper>
  {children}
</SimpleRedesignWrapper>
```