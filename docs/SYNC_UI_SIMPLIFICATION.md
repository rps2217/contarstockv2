# Simplificación UI/UX de Sincronización

**Fecha:** 2026-06-20  
**Estado:** 🔲 PENDIENTE

---

## Resumen

La sincronización tiene múltiples lugares donde se muestra estado, causando redundancia visual y complejidad. Este documento propone simplificar la UX.

---

## Inventario UI Sync Actual

### Componentes (1,615 líneas totales)

| Componente | Líneas | Propósito |
|------------|--------|----------|
| SyncCenterPage.tsx | 349 | Página principal de sync |
| SyncPanel.tsx | 196 | Panel lateral |
| SyncQueueDetail.tsx | 133 | Detalle de cola |
| SyncDiagnosticsPanel.tsx | 132 | Diagnósticos |
| SyncHistory.tsx | 122 | Historial |
| SyncQueue.tsx | 105 | Cola de salida |
| SyncIncidents.tsx | 93 | Incidentes |
| SyncQueueList.tsx | 82 | Lista de cola |
| SyncStatusCards.tsx | 74 | Cards de estado |
| SyncGroupCard.tsx | 73 | Cards de grupo |
| SyncProgress.tsx | 54 | Progreso |
| SyncStatusBadge.tsx | 42 | Badge simple |

### Componentes Globales

| Componente | Líneas | Propósito |
|------------|--------|----------|
| SystemStatus.tsx | 208 | Barra de estado global |

---

## Redundancias Detectadas

### 1. Estado Mostrado Múltiples Veces

```
SystemStatus.tsx        → Online, isSyncing, pending, latency
SyncStatusCards.tsx     → Online, pending, lastSync
SyncStatusBadge.tsx     → Badge simple de sync
SyncProgress.tsx        → Indicador de progreso
```

**Problema:** El usuario ve la misma información en diferentes lugares.

### 2. Cola Fragmentada

```
SyncQueue.tsx           → Contenedor
SyncQueueList.tsx       → Lista
SyncQueueDetail.tsx     → Detalle
```

**Problema:** 3 componentes para mostrar una cola.

### 3. Logs vs Incidentes

```
SyncHistory.tsx         → Logs de sync
SyncIncidents.tsx       → Incidentes/errores
```

**Problema:** Similar pero separado.

---

## Propuesta de Simplificación

### Fase 1: Unificar Barra de Estado

**Objetivo:** SystemStatus es la única fuente de verdad para estado global.

```
SystemStatus.tsx (208 líneas) - MEJORAR
├── Online/Offline ✅
├── Latency ✅
├── Pending items ✅
├── isSyncing ✅
├── Sync errors ✅
└── AGREGAR:
    ├── Conflictos count
    └── Incidentes count (con link)
```

**Acciones:**
- [ ] Agregar indicadores de conflictos/incidentes en SystemStatus
- [ ] Eliminar SyncStatusCards.tsx (redundante)
- [ ] Eliminar SyncProgress.tsx (SystemStatus ya tiene)

### Fase 2: Simplificar Cola

**Objetivo:** Un componente para cola + detalle.

```
SyncQueue (nuevo, ~150 líneas)
├── Lista compact
├── Detalle inline (expandir/colapsar)
└── Acciones rápidas
```

**Acciones:**
- [ ] Crear SyncQueue unificado
- [ ] Eliminar SyncQueueList.tsx
- [ ] Eliminar SyncQueueDetail.tsx
- [ ] Eliminar SyncQueue.tsx

### Fase 3: Unificar Logs/Incidentes

**Objetivo:** Una sola vista para logs e incidentes.

```
SyncActivity (nuevo, ~100 líneas)
├── Tabs: Logs | Incidentes
├── Filtros por tipo
└── Ver detalle
```

**Acciones:**
- [ ] Crear SyncActivity
- [ ] Eliminar SyncHistory.tsx
- [ ] Eliminar SyncIncidents.tsx

### Fase 4: Page Principal

**Objetivo:** SyncCenterPage más simple.

```
SyncCenterPage (~200 líneas)
├── SystemStatus (usar existente)
├── SyncQueue (componente nuevo)
├── SyncRegistry tables (simplificado)
└── SyncActivity (componente nuevo)
```

---

## Métricas Propuestas

| Antes | Después |
|-------|---------|
| Componentes: 13 | Componentes: 6 |
| Líneas UI: ~1,800 | Líneas UI: ~800 |
| Redundancias: 4 | Redundancias: 0 |

---

## Orden de Implementación

1. ✅ Mejorar SystemStatus con conflictos/incidentes
2. ✅ Crear SyncQueue unificado (SyncQueuePanel)
3. ✅ Crear SyncActivity
4. 🔲 Simplificar SyncCenterPage (en progreso)
5. 🔲 Eliminar componentes redundantes (pendiente)

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Breaking changes en UI | Tests visuales + QA manual |
| Perder información útil | Documentar qué se elimina |

---

## Pendientes Adicionales

### Alto Prioridad
- [ ] Simplificar UI sync (este documento)
- [ ] Migrar features a useGenericSync
- [ ] Eliminar cloudSync.ts

### Media Prioridad
- [ ] Tests para servicios sync modulares
- [ ] Storybook para componentes UI
- [ ] Documentar syncRegistry

### Bajo Prioridad
- [ ] Optimizar bundle (quitar código muerto)
- [ ] Performance de sync grande
- [ ] Mejoras de offline-first
