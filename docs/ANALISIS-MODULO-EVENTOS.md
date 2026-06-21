# Análisis del Módulo de Eventos

## 📊 Resumen

| Métrica | Valor |
|---------|-------|
| Archivos .tsx | 22 |
| Líneas de código | 3,880 |
| Componente más grande | EventEmailModal.tsx (518 líneas) |
| Hook principal | useEventUI.ts (281 líneas) |

---

## 🔍 Hallazgos del Análisis

### 1. **Puntos Fuertes**

- ✅ Sistema de selección múltiple funcional con `selectedIds` (Set)
- ✅ Panel de acciones masivas con bulk edit
- ✅ Filtros por estado: pending, destined, adjusted
- ✅ Agrupación por fecha
- ✅ Virtualización de listas (useVirtualizer)
- ✅ Sincronización en background
- ✅ Impresión de etiquetas y reportes

### 2. **Problemas Identificados**

#### A) Código Duplicado
- `handleBulkRemove`, `handleBulkSearchDocument`, `handleBulkPrintLabels` están en `useEventUI.ts`
- Estas mismas operaciones podrían reutilizarse en otros módulos

#### B) Modal de BulkEdit Muy Específico
- El `BulkEditModal` está tightly coupled con eventos
- Campos hardcodeados: destino, traspaso, observaciones
- No es reutilizable para otros módulos

#### C) Gestión de Estado Fragmentada
- `useEventUI` combina lógica de UI + base de datos
- Mezcla concerns: selección, modals, acciones
- Difícil de testear

#### D) Sin Persistencia de Preferencias
- Vista expandida/compacta no se guarda
- Orden de clasificación no persistente
- Filtros activos se pierden al recargar

---

## 🎯 Oportunidades de Mejora

### Corto Plazo (1-2 días)

| # | Mejora | Impacto |
|---|--------|---------|
| 1 | Extraer `useBulkActions` como hook global | Reutilizable en todos los módulos |
| 2 | Crear `BulkActionBar` reutilizable | UI consistente |
| 3 | Crear `BulkEditModal` genérico | Eliminar duplicación |

### Medio Plazo (3-5 días)

| # | Mejora | Impacto |
|---|--------|---------|
| 4 | Separar `useEventUI` en hooks más pequeños | Mejor mantenibilidad |
| 5 | Persistir preferencias de vista en IndexedDB | UX mejorada |
| 6 | Agregar atajos de teclado para selección | Productividad |

### Largo Plazo (1-2 semanas)

| # | Mejora | Impacto |
|---|--------|---------|
| 7 | Sistema de acciones masivas por plugins | Extensibilidad |
| 8 | Templates de edición masiva configurables | Flexibilidad total |

---

## 🏗️ Arquitectura Propuesta: Acciones Masivas Globales

```
┌─────────────────────────────────────────────────────────┐
│                    useBulkActions (Hook Global)          │
├─────────────────────────────────────────────────────────┤
│  Estado:                                                 │
│  - selectedIds: Set<string>                             │
│  - isSelectionMode: boolean                             │
│  - isBulkEditModalOpen: boolean                         │
│                                                          │
│  Acciones:                                               │
│  - toggleSelection(id)                                  │
│  - selectAll(items)                                     │
│  - clearSelection()                                     │
│  - executeBulkAction(actionId)                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              BulkActionBar (Componente Global)           │
├─────────────────────────────────────────────────────────┤
│  [✓ 5 seleccionados] [Editar] [Eliminar] [Exportar]     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│            BulkEditModal (Componente Genérico)          │
├─────────────────────────────────────────────────────────┤
│  Configuración por módulo:                              │
│  - fields: BulkField[]                                  │
│  - onApply: (ids, values) => void                       │
└─────────────────────────────────────────────────────────┘
```

---

## 📱 Hook Global: useBulkActions

### Uso en Eventos (Migración)

```tsx
import { useBulkActions, BulkActionBar, BulkEditModal, createStandardBulkActions } from '@/hooks/useBulkActions';

// Configurar acciones
const actions = createStandardBulkActions({
  onDelete: async (items) => {
    await db.actions.deleteMany(items.map(i => i.id));
  },
  onExport: async (items) => {
    await exportToCSV(items);
  }
});

// Usar hook
const bulk = useBulkActions({
  module: 'events',
  getItemId: (item) => item.id,
  actions,
  bulkEdit: {
    title: 'Editar Eventos',
    description: 'Actualizar destino y traspaso',
    fields: [
      { key: 'destino', label: 'Destino', type: 'select', options: DESTINOS },
      { key: 'traspaso', label: 'N° Traspaso', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ],
    onApply: async (ids, values) => {
      await db.actions.updateMany(ids, values);
    }
  }
});

// En el render
<BulkActionBar
  selectedCount={bulk.selectedCount}
  actions={actions}
  onExecute={bulk.executeBulkAction}
  onClear={bulk.clearSelection}
/>

<BulkEditModal
  isOpen={bulk.isBulkEditModalOpen}
  onClose={bulk.closeBulkEditModal}
  config={bulkActionsConfig}
  selectedItems={bulk.getSelectedItems(allEvents)}
/>
```

### Uso en Expiry (Nuevo)

```tsx
const bulk = useBulkActions({
  module: 'expiry',
  getItemId: (item) => item.id,
  actions: createStandardBulkActions({
    onDelete: handleBulkRemove,
    onExport: handleExportCSV
  }),
  bulkEdit: {
    title: 'Actualizar Caducidades',
    description: 'Modificar fecha de caducidad',
    fields: [
      { key: 'newExpiryDate', label: 'Nueva Fecha', type: 'date', required: true }
    ],
    onApply: async (ids, values) => {
      await updateExpiryDates(ids, values.newExpiryDate);
    }
  }
});
```

---

## 📋 Acciones Masivas por Módulo

### Módulo: Eventos
| Acción | Estado | Tipo |
|--------|--------|------|
| Editar destino/traspaso | ✅ Implementada | BulkEditModal |
| Eliminar | ✅ Implementada | Confirmar + Progress |
| Buscar documento | ✅ Implementada | Abrir Gmail |
| Imprimir etiquetas | ✅ Implementada | JSPrint |
| Imprimir reporte | ✅ Implementada | PDF |

### Módulo: Expiry (Vencimientos)
| Acción | Estado | Sugerencia |
|--------|--------|------------|
| Eliminar | ✅ Implementada | Migrar a global |
| Exportar CSV | ❌ Falta | Agregar |
| Cambiar fecha | ❌ Falta | BulkEditModal |
| Marcar como revisado | ❌ Falta | Nueva acción |

### Módulo: Reception (Recepciones)
| Acción | Estado | Sugerencia |
|--------|--------|------------|
| Eliminar | ⚠️ Parcial | Completar |
| Exportar | ❌ Falta | Agregar |
| Cambiar estado | ❌ Falta | BulkEditModal |

### Módulo: Inventory (Inventario)
| Acción | Estado | Sugerencia |
|--------|--------|------------|
| Eliminar | ⚠️ Parcial | Completar |
| Editar campos | ❌ Falta | BulkEditModal |
| Exportar | ❌ Falta | Agregar |

---

## 🔄 Plan de Migración

### Fase 1: Hook Global ✅
- [x] Crear `useBulkActions.tsx`
- [x] Crear `BulkActionBar`
- [x] Crear `BulkEditModal`
- [x] Crear `createStandardBulkActions`
- Commit: `8083a7fd`

### Fase 2: Migrar Módulo Eventos ✅
- [x] Reemplazar estado local con `useBulkActions`
- [x] Usar `BulkActionBar` en lugar de panel custom
- [x] Usar `BulkEditModal` genérico
- [x] Eliminar código duplicado
- Commit: `eb3559a4`

### Fase 3: Migrar Otros Módulos ✅
- [x] Expiry - Vencimientos (`EXPIRY_BULK_ACTIONS`)
- [x] Reception - Recepciones (`RECEPTION_BULK_ACTIONS`)
- [x] Inventory - Inventario (`INVENTORY_BULK_ACTIONS`)
- [x] MassActionsPanel - Wrapper para usar con hook global
- Commit: `15d001cd`

### Fase 4: Features Avanzadas ✅
- [x] Persistencia de preferencias de vista (`useViewPreferences`)
- [x] Atajos de teclado globales (Ctrl+A, Escape, Delete, Ctrl+Z)
- [x] Deshacer acciones masivas (`useBulkHistory`, `performUndo`)
- [x] Historial de acciones masivas (`BulkHistoryPanel`)

---

## 📁 Archivos Creados

```
src/hooks/
├── useBulkActions.ts      # Hook global de acciones masivas
```

## 📁 Archivos a Modificar

```
src/features/events/
├── hooks/useEventUI.ts              # Migrar a useBulkActions
├── components/BulkEditModal.tsx     # Reemplazar por genérico
├── EventsPage.tsx                   # Usar BulkActionBar
```

---

## 💡 Recomendaciones

1. **No romper lo que funciona**: Mantener backwards compatibility mientras se migra
2. **Progressive enhancement**: Empezar con módulos pequeños (Expiry)
3. **Testing**: Agregar tests unitarios para useBulkActions
4. **Documentación**: Documentar API del hook para otros desarrolladores
5. **TypeScript**: Mantener tipos estrictos para mejor DX

---

*Documento generado: $(date +%Y-%m-%d)*
