# Auditoría de ContarStock v2 - Nueva Interfaz vs Funcionalidad Legacy

## Resumen Ejecutivo

La nueva interfaz gráfica (Redesign) se creó con un enfoque incorrecto:
- **INCORRECTO**: Reescribir toda la lógica de negocio
- **CORRECTO**: Adaptar la nueva interfaz para usar el código funcional existente

---

## Módulos Funcionales en `features/` (CÓDIGO LEGACY FUNCIONAL)

| Módulo | Ruta | Estado | Componentes |
|--------|------|--------|-------------|
| counting | /counting/:id | ✅ | CountingPage, hooks/useCounting |
| events | /events | ✅ | EventsPage, componentes |
| customers | /customers | ✅ | CustomersPage |
| suppliers | /suppliers | ✅ | SuppliersPage |
| expected-orders | /expected-orders | ✅ | ExpectedOrdersPage |
| dynamic | /dynamic/:tableKey | ✅ | DynamicManagementPage |
| slices | /slices | ✅ | SlicesPage |
| hammer | /massive/:batchId | ✅ | HammerPage |
| expiry | /expiry | ✅ | ExpiryPage, useExpiry, modales |
| reports | /reports | ✅ | ReportsPage |
| sync | /sync | ✅ | SyncPage |
| reception | /reception | ✅ | ReceptionPage |

---

## Módulos en `shared/components/redesign/` (NUEVA INTERFAZ)

| Módulo | Estado | Observación |
|--------|--------|-------------|
| Dashboard | ⚠️ Parcial | UI nueva, datos limitados |
| CapturePage | ⚠️ Parcial | UI nueva, escaneo funcional |
| DataPage | ⚠️ Parcial | CRUD básico implementado |
| SyncPage | ⚠️ Parcial | UI nueva, sync simulado |
| ReportsPage | ⚠️ Parcial | UI nueva, datos demo |
| SettingsPage | ⚠️ Parcial | UI básica |
| ExpiryPage | ❌ NO FUNCIONAL | Usa datos demo, no usa hooks de features |

---

## Módulos FALTANTES en Redesign

Los siguientes módulos tienen funcionalidad completa en `features/` pero NO tienen equivalente en `redesign/`:

1. **events** - Eventos/incidencias
2. **customers** - Gestión de clientes
3. **suppliers** - Gestión de proveedores  
4. **expected-orders** - Órdenes de pedido
5. **dynamic** - Tablas dinámicas
6. **slices** - Porciones/fracciones
7. **hammer** - Cargas masivas/teóricas
8. **reception** - Recepciones
9. **counting** - Conteo detallado

---

## Problemas Identificados

### 1. Rutas Duplicadas
```
/expiry -> ExpiryPage (Redesign) y ExpiryLegacy (Legacy) - CONFLICTO
```

### 2. Sidebar Desaparecido
El RedesignAppShell tiene su propio sidebar, pero puede no estar renderizándose correctamente.

### 3. ExpiryPage No Funcional
RedesignExpiryPage intenta crear datos demo en lugar de usar:
- `features/expiry/hooks/useExpiry.ts`
- `features/expiry/components/ExpiryDetailModal.tsx`
- `features/expiry/components/ExpiryCaptureModal.tsx`

### 4. No Hay Wrapper para Integrar Legacy con Redesign
Los componentes de features/ deberían ser envueltos con el tema de Redesign.

---

## Plan de Corrección

### Fase 1: Corregir Rutas y Navegación
1. Eliminar conflictos de rutas
2. Asegurar que sidebar funcione en ambas interfaces
3. Verificar que BottomDock sea consistente

### Fase 2: Integrar Funcionalidad Legacy en Redesign
1. Crear wrapper para importar componentes de features/
2. ExpiryPage debe usar hooks de features/expiry
3. Mantener UI de Redesign con lógica de features/

### Fase 3: Desarrollar Módulos Faltantes
1. events -> RedesignEventsPage
2. customers -> RedesignCustomersPage
3. suppliers -> RedesignSuppliersPage
4. hammer -> RedesignHammerPage
5. etc.

---

## Recomendación Principal

**La nueva interfaz debe ser una CAPA VISUAL sobre la funcionalidad existente.**

Esto significa:
- Mantener toda la lógica en `features/` y `hooks/`
- Crear "wrappers" en `redesign/pages/` que:
  1. Usen el tema visual de Redesign
  2. Importen y usen los hooks y componentes de features/
  3. Rendericen con la UI monocromática de la nueva interfaz
