# Módulo de Eventos - Documentación Técnica

## 📋 Resumen

Este documento describe la arquitectura, flujos de datos y sincronización del módulo de eventos en ContarStock v2.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MÓDULO DE EVENTOS                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │ EventsPage  │    │ EventsModal  │    │ EventsImporter       │   │
│  │ (UI Page)   │    │ (Tabla/Edit) │    │ (Import CSV/Paste)   │   │
│  └──────┬───────┘    └──────┬───────┘    └──────────┬───────────┘   │
│         │                    │                       │               │
│         └────────────────────┼───────────────────────┘               │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │   useEventsSync   │                            │
│                    │   (Hook de Sync)  │                            │
│                    └─────────┬─────────┘                            │
│                              │                                     │
│         ┌────────────────────┼────────────────────┐                │
│         │                    │                    │                 │
│  ┌──────▼───────┐    ┌──────▼───────┐    ┌──────▼───────┐        │
│  │ Push (Upload) │    │ Pull (Download)│   │ Realtime     │        │
│  │ syncPending  │    │ pullFromCloud │    │ Subscriptions│        │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘        │
│         │                    │                    │                 │
│         └────────────────────┼────────────────────┘                │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │ EventsSyncService │                            │
│                    │ (Deduplicación)   │                            │
│                    └─────────┬─────────┘                            │
│                              │                                       │
│         ┌────────────────────┼────────────────────┐                │
│         │                    │                    │                 │
│  ┌──────▼───────┐    ┌──────▼───────┐    ┌──────▼───────┐        │
│  │ BatchSyncSvc │    │ Supabase API │    │ Supabase     │        │
│  │ (pushBatch)  │    │ (Direct)     │    │ Realtime     │        │
│  └──────────────┘    └──────────────┘    └──────────────┘        │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         SUPABASE (PostgreSQL)                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────┐   │
│  │ EVENTOS         │    │ DELETED_EVENTS   │    │ AUDIT_LOGS    │   │
│  │ (Tabla Remote)  │    │ (Soft Deletes)  │    │ (Opcional)    │   │
│  └─────────────────┘    └─────────────────┘    └───────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      INDEXEDDB (Dexie.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌───────────────┐   │
│  │ events          │    │ deletedEvents   │    │ syncQueue    │   │
│  │ (Local Cache)   │    │ (Local Deletes) │    │ (Pendientes) │   │
│  └─────────────────┘    └─────────────────┘    └───────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## 📊 Estructura de Datos

### IndexedDB (`events`)

```typescript
interface InventoryEvent {
  id?: number;
  type: 'info' | 'warning' | 'error' | 'success';
  frcNumber: string;
  barcode: string;
  productName: string;
  batch: string;
  expiryDate: string;
  resolution: string;
  status: 'pending' | 'destined' | 'adjusted';
  traspasoNumber?: string;
  location?: string;
  destino?: string;
  createdAt: number;
  updatedAt?: number;
  syncStatus?: 'synced' | 'pending' | 'error';
  lastSyncTimestamp?: number;
}
```

### Supabase (`EVENTOS`)

```sql
CREATE TABLE public."EVENTOS" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode VARCHAR(255),
  frc_code VARCHAR(100),
  product_name TEXT,
  batch_number VARCHAR(100),
  expiry_date DATE,
  resolution TEXT,
  status VARCHAR(50),
  event_type VARCHAR(50),
  location VARCHAR(255),
  transfer_doc VARCHAR(255),
  destination VARCHAR(255),
  notes TEXT,
  sync_status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para deduplicación
CREATE UNIQUE INDEX idx_eventos_dedup 
ON public."EVENTOS" (LOWER(TRIM(frc_code)), LOWER(TRIM(barcode)));
```

## 🔄 Flujo de Sincronización

### 1. Sincronización PUSH (Local → Supabase)

```
1. Usuario crea/actualiza evento en la UI
2. Evento se guarda en IndexedDB con syncStatus = 'pending'
3. useEventsSync.syncEvents() se ejecuta
4. EventsSyncService.syncPendingEvents() obtiene eventos pendientes
5. filterEventsForSync() verifica cada evento:
   - Si NO existe en Supabase → crear
   - Si existe y local es más nuevo → actualizar
   - Si existe y remoto es más nuevo → omitir
6. createEventsBatch() usa UPSERT para crear/actualizar
7. markEventsAsSynced() actualiza syncStatus = 'synced'
```

### 2. Sincronización PULL (Supabase → Local)

```
1. useEventsSync.pullEvents() se ejecuta
2. EventsSyncService.pullFromCloud() consulta Supabase
3. Para cada evento remoto:
   - Verificar si fue eliminado localmente (deletedEvents)
   - Buscar evento local por frcNumber + barcode
   - Si local existe y tiene cambios pendientes → preservar
   - Si local existe y no tiene cambios → actualizar
   - Si local no existe → crear
4. syncDeletedEvents() sincroniza eliminaciones pendientes
```

### 3. Realtime Sync

```
1. App se conecta a Supabase Realtime
2. Suscripción a cambios en tabla EVENTOS
3. Para cada cambio (INSERT/UPDATE/DELETE):
   - handleRealtimeChange() procesa el payload
   - handleRemoteInsertOrUpdate() o handleRemoteDelete()
   - Actualiza IndexedDB según corresponda
   - Notifica callbacks suscritos
```

## 🔑 Clave de Deduplicación

La clave única para cada evento es: `frcNumber + barcode`

```
Ejemplo: "frc-001~1234567890123"
```

Esta clave se normaliza (lowercase, trim) antes de comparar.

## 🔒 Seguridad

### Row Level Security (RLS)

Supabase aplica RLS a la tabla EVENTOS. Los usuarios solo ven eventos según las políticas configuradas.

### Eliminaciones (Soft Deletes)

Las eliminaciones se registran en `DELETED_EVENTS` para:
1. No volver a descargar eventos eliminados
2. Mantener trazabilidad de eliminaciones
3. Sincronizar eliminaciones entre dispositivos

## 📁 Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `EventsSyncService.ts` | Servicio de sincronización principal |
| `useEventsSync.ts` | Hook de React para sync |
| `EventsPage.tsx` | Página principal de eventos |
| `EventsModal.tsx` | Modal de gestión de eventos |
| `EventsImporter.tsx` | Componente de importación |

## 🧪 Testing

Ejecutar tests:
```bash
npm run test -- src/services/cloud/EventsSyncService.test.ts
```

Cobertura:
- Normalización de strings
- Generación de claves
- Validación de eventos
- Configuración de retry
- Historial de sincronización

## ⚙️ Configuración

### Constantes de Sincronización

```typescript
const BATCH_SIZE = 50;           // Tamaño de lote
const MAX_RETRIES = 3;           // Intentos máximos
const RETRY_DELAY = 1000;       // Delay base (ms)
const MAX_HISTORY_ITEMS = 50;   // Items en historial
```

### Hook Options

```typescript
interface UseEventsSyncOptions {
  autoSync?: boolean;           // Sync automático
  autoSyncInterval?: number;    // Intervalo (ms)
  retryConfig?: RetryConfig;    // Configuración de retry
  onStart?: () => void;        // Callback inicio
  onSuccess?: (result) => void; // Callback éxito
  onError?: (error) => void;    // Callback error
  showToasts?: boolean;         // Mostrar notificaciones
}
```

## 🔧 Troubleshooting

### Problema: Eventos duplicados

**Síntoma**: El mismo evento aparece múltiples veces en Supabase.

**Solución**: 
1. Ejecutar script de migración para agregar constraint único
2. Limpiar duplicados existentes

### Problema: Sync no funciona

**Síntoma**: Los eventos no se sincronizan.

**Pasos**:
1. Verificar conexión a internet
2. Verificar RLS en Supabase
3. Revisar consola para errores
4. Verificar `syncStatus` en IndexedDB

### Problema: Conflictos de datos

**Síntoma**: Datos diferentes entre local y remoto.

**Solución**: 
- La lógica de sync usa timestamps para resolver
- Local más nuevo → prevalece local
- Remoto más nuevo → prevalece remoto

## 📅 Migración SQL

Archivos de migración:
- `scripts/migrate_events_schema.sql` - Agrega columnas, índices, RLS
- `scripts/rollback_events_schema.sql` - Revierte cambios

Ejecutar en Supabase Dashboard → SQL Editor.

## 🔗 Referencias

- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Dexie.js](https://dexie.org/)
- [PostgreSQL UPSERT](https://www.postgresql.org/docs/current/sql-insert.html)
