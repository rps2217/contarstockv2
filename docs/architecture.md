# Arquitectura de ContarStock v2 - Diagrama de Funcionamiento

## Vista General del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CONTARSTOCK v2                                     │
│                         Aplicación de Inventario                                │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│    FRONTEND     │     │     SERVICIOS       │     │    BASE DE DATOS    │
│    (React)      │     │     (TypeScript)    │     │     (Dexie.js)      │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
          │                           │                           │
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   UI Components │     │   Sync Services     │     │   IndexedDB        │
│   - Pages       │     │   - unifiedSync    │     │   - sessions       │
│   - Hooks      │     │   - dynamicData    │     │   - products       │
│   - Stores     │     │   - cloud           │     │   - providers       │
└─────────────────┘     └─────────────────────┘     └─────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           UNIFIED SYNC ENGINE                                   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         MOTOR CENTRALIZADO                               │  │
│  │                                                                         │  │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │   │  Catalog    │  │   Batch     │  │  Realtime   │  │   Queue     │  │  │
│  │   │  Sync       │  │   Sync      │  │   Sync      │  │   Offline   │  │  │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  │          │                │                │                │         │  │
│  │          └────────────────┴────────────────┴────────────────┘         │  │
│  │                              │                                          │  │
│  │                              ▼                                          │  │
│  │                    ┌─────────────────┐                                 │  │
│  │                    │   Sync Queue    │                                 │  │
│  │                    │   (Offline-first│                                 │  │
│  │                    │    with retry)  │                                 │  │
│  │                    └─────────────────┘                                 │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│                              FUNCIONALIDADES:                                   │
│                              - pullTable() - Descargar datos                    │
│                              - pushBatch() - Subir datos                       │
│                              - processQueue() - Procesar cola offline          │
│                              - Conflict resolution - Manejo de conflictos      │
│                              - Subscribe/Realtime - Sincronización en vivo     │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE CLOUD                                     │
│                                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│   │  Sessions    │    │  Products    │    │  Providers   │    │  Customers │ │
│   └──────────────┘    └──────────────┘    └──────────────┘    └────────────┘ │
│                                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                    │
│   │  ScanRecords │    │  Expiries    │    │  Events     │                    │
│   └──────────────┘    └──────────────┘    └──────────────┘                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FLUJO DE DATOS                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

    USUARIO                    APP                          SUPABASE
       │                         │                              │
       │                         │                              │
       ▼                         ▼                              │
┌─────────────────┐     ┌─────────────────┐                   │
│  CREAR SESIÓN   │     │                 │                   │
│  (Conteo)       │────▶│  useSync.ts     │                   │
└─────────────────┘     │  - Estado local │                   │
       │                 │  - Validación  │                   │
       │                 └────────┬────────┘                   │
       │                          │                            │
       ▼                          ▼                            │
┌─────────────────┐     ┌─────────────────┐                   │
│  ESCANEAR       │     │  IndexedDB      │                   │
│  productos       │────▶│  (Dexie.js)    │                   │
└─────────────────┘     │  - sessions     │                   │
       │                 │  - scanRecords  │                   │
       │                 └────────┬────────┘                   │
       │                          │                            │
       │                          ▼                            │
       │                 ┌─────────────────┐                   │
       │                 │  SyncQueue      │                   │
       │                 │  (Pendiente)   │──────────────────▶│
       │                 └─────────────────┘                   │
       │                          │                            │
       │                          │  [OFFLINE-FIRST]          │
       │                          ▼                            │
       │                 ┌─────────────────┐                   │
       │                 │  unifiedSync    │                   │
       │                 │  Engine         │──────────────────▶│
       │                 └─────────────────┘         │         │
       │                          │                  │         │
       ▼                          ▼                  │         ▼
┌─────────────────┐     ┌─────────────────┐          │ ┌─────────────────┐
│  SINCRONIZAR    │     │  Conflict       │          │ │  CONFIRMACIÓN   │
│  (Manual/Auto)  │────▶│  Resolution     │          │ │  DE DATOS       │
└─────────────────┘     └─────────────────┘          │ └─────────────────┘
                                                        │
                          ┌─────────────────────────────┘
                          │
                          ▼
                   ┌─────────────────┐
                   │  ACTUALIZACIÓN  │
                   │  EN VIVO        │
                   │  (Realtime)     │
                   └─────────────────┘
```

## Estructura de Carpetas

```
src/
├── components/                    # Componentes UI
│   ├── ui/                       # Design system base
│   ├── counting/                 # Componentes de conteo
│   ├── reception/               # Componentes de recepción
│   └── sync/                    # Componentes de sincronización
│
├── features/                      # Funcionalidades modulares
│   ├── counting/
│   │   ├── hooks/
│   │   │   ├── useCountingSession.ts
│   │   │   ├── useScanner.ts
│   │   │   └── useAutoSync.ts    ← Hook de auto-sync
│   │   └── pages/
│   │
│   ├── reception/
│   │   └── hooks/
│   │       └── useReceptionLogic.ts
│   │
│   └── sync/
│       ├── hooks/
│       │   └── useSyncManager.ts
│       └── pages/
│
├── hooks/                        # Hooks compartidos
│   ├── useSync.ts               ← Hook principal de sync
│   ├── useSyncQueue.ts          ← Gestión de cola offline
│   └── useDatabase.ts
│
├── services/                     # Servicios de negocio
│   ├── sync/                    ← MOTOR CENTRALIZADO
│   │   ├── index.ts             # Punto de entrada único
│   │   ├── unified/             # Motor unificado
│   │   │   ├── UnifiedSyncEngine.ts  # 1314 líneas
│   │   │   ├── types.ts
│   │   │   ├── registry.ts
│   │   │   └── index.ts
│   │   ├── fsm/                 # Control de flujo
│   │   │   ├── SyncFSM.ts
│   │   │   └── types.ts
│   │   ├── UploadGroupBuilder.ts    # Compatibilidad
│   │   ├── Reconciliation.ts        # Sincronización
│   │   └── legacyImports.ts        # Imports legacy
│   │
│   ├── cloud/
│   │   ├── SyncQueueService.ts  # Cola offline
│   │   └── offlineIntegration.ts
│   │
│   ├── dynamicDataService.ts    # Datos dinámicos
│   └── dynamicSync.ts           # Sync de configs
│
├── repositories/                 # Capa de datos
│   ├── ProductRepository.ts
│   ├── SessionRepository.ts
│   └── ...
│
├── stores/                      # Estados globales
│   ├── syncStore.ts
│   └── ...
│
├── db/                          # Base de datos local
│   ├── index.ts
│   └── schema.ts
│
└── types.ts                     # Tipos TypeScript
```

## Hooks de Sincronización

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           HOOKS DE SINCRONIZACIÓN                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              useSync.ts (302 líneas)                             │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ HOOK PRINCIPAL - Usado en toda la aplicación                             │  │
│  │                                                                           │  │
│  │ Funciones:                                                                │  │
│  │ • syncAll()        - Sincronización completa                             │  │
│  │ • syncCatalogs()   - Solo catálogos                                      │  │
│  │ • pushRecord()     - Subir un registro                                   │  │
│  │ • pullTable()      - Descargar tabla                                      │  │
│  │                                                                           │  │
│  │ Estados:                                                                  │  │
│  │ • isSyncing        - Indica si hay sync activo                           │  │
│  │ • lastSyncTime     - Timestamp del último sync                           │  │
│  │ • error            - Último error                                         │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ usa
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         unifiedSyncEngine                                        │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ MOTOR CENTRALIZADO                                                        │  │
│  │                                                                           │  │
│  │ Métodos principales:                                                      │  │
│  │ • syncAll()          - Sync completa (catálogos + batches)               │  │
│  │ • syncCatalogs()     - Solo catálogos                                    │  │
│  │ • syncBatches()      - Solo batches (sesiones pendientes)                │  │
│  │ • pushBatch()        - Subir lote de registros                            │  │
│  │ • pushSingle()       - Subir un registro                                  │  │
│  │ • pullTable()        - Descargar tabla completa                            │  │
│  │ • enqueue()          - Encolar para sync offline                          │  │
│  │ • processQueue()     - Procesar cola offline                              │  │
│  │                                                                           │  │
│  │ Conflictos:                                                               │  │
│  │ • checkConflicts()   - Detectar conflictos                                │  │
│  │ • resolveConflict()  - Resolver automáticamente                          │  │
│  │ • resolveConflictManually() - Resolver manualmente                       │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ También usa
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         useSyncQueue.ts                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ GESTIÓN DE COLA OFFLINE                                                   │  │
│  │                                                                           │  │
│  │ • Cola local de operaciones pendientes                                    │  │
│  │ • Retry automático con backoff                                             │  │
│  │ • Persistencia en IndexedDB                                               │  │
│  │ • Notificaciones de estado                                                │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Estados de Sync

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ESTADOS DE SINCRONIZACIÓN                             │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │      IDLE        │ ◄────────────── Reset
                    │   (Sin sync)    │
                    └────────┬────────┘
                             │ START
                             ▼
                    ┌─────────────────┐
                    │   PREPARING     │ ◄─── PREPARED
                    │  (Preparando)   │
                    └────────┬────────┘
                             │ UPLOADING
                             ▼
                    ┌─────────────────┐
                    │   UPLOADING     │
                    │   (Subiendo)    │─────── Progress updates
                    └────────┬────────┘
                             │ WAITING
                             ▼
                    ┌─────────────────┐
                    │    WAITING      │
                    │  (Esperando)    │
                    └────────┬────────┘
                             │ PROCESSING
                             ▼
                    ┌─────────────────┐
                    │   PROCESSING    │
                    │ (Procesando)    │
                    └────────┬────────┘
                             │ SUCCESS
                             ▼
                    ┌─────────────────┐
                    │    SUCCESS      │───────► [Vuelve a IDLE]
                    │ (Completado)    │
                    └─────────────────┘

                    ┌─────────────────┐
                    │     ERROR       │
                    │   (Falló)       │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
      ┌─────────────┐              ┌─────────────┐
      │   RESET     │              │    RETRY    │
      │ (Cancelar) │              │ (Reintentar)│────► PREPARING
      └─────────────┘              └─────────────┘
                                               │
                                               │ (Max retries)
                                               ▼
                                        [ABORT]
```

## Tablas y Relaciones

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MODELO DE DATOS                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

IndexedDB (Cliente)                              Supabase (Cloud)
┌─────────────────┐                         ┌─────────────────────────┐
│    sessions     │◄──────sync───────►│       sessions           │
│─────────────────│                         │─────────────────────────│
│ id              │                         │ id                      │
│ erpOrder        │                         │ erpOrder                │
│ sessionType     │                         │ sessionType             │
│ totalUnits      │                         │ totalUnits              │
│ syncStatus      │                         │ syncStatus              │
│ logisticsLabel  │                         │ logisticsLabel          │
│ createdAt       │                         │ created_at              │
└─────────────────┘                         └─────────────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐                         ┌─────────────────────────┐
│  scanRecords    │◄──────sync───────►│      scan_records        │
│─────────────────│                         │─────────────────────────│
│ id              │                         │ id                      │
│ sessionId (FK)  │                         │ session_id              │
│ barcode         │                         │ barcode                 │
│ quantity        │                         │ quantity                │
│ timestamp       │                         │ timestamp               │
│ synced          │                         │ synced_at               │
└─────────────────┘                         └─────────────────────────┘

┌─────────────────┐                         ┌─────────────────────────┐
│    products     │◄──────sync───────►│        products          │
│─────────────────│                         │─────────────────────────│
│ id              │                         │ id                      │
│ sku             │                         │ sku                     │
│ barcode         │                         │ barcode                  │
│ name            │                         │ name                    │
│ ...             │                         │ ...                      │
└─────────────────┘                         └─────────────────────────┘

┌─────────────────┐                         ┌─────────────────────────┐
│   providers     │◄──────sync───────►│        providers         │
│─────────────────│                         │─────────────────────────│
│ id              │                         │ id                      │
│ name            │                         │ name                    │
│ ...             │                         │ ...                      │
└─────────────────┘                         └─────────────────────────┘
```

## Configuración de Sync

```typescript
// Configuración del motor unificado
const syncConfig: SyncEngineConfig = {
  // Catálogos (solo lectura desde cloud)
  catalogTables: ['products', 'providers', 'customers', 'categories'],
  
  // Tablas de upload (lectura + escritura)
  uploadTables: ['sessions', 'scanRecords', 'events'],
  
  // Cola offline
  queue: {
    maxRetries: 3,
    retryDelay: 5000,  // ms
    batchSize: 100,
  },
  
  // Conflictos
  conflictStrategy: 'server-wins', // o 'client-wins' o 'manual'
  
  // Realtime
  realtimeEnabled: true,
  realtimeTables: ['sessions'],
};
```

## Métricas y Monitoreo

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              MONITOREO DE SYNC                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SyncMetricsService                                     │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ MÉTRICAS RECOLECTADAS:                                                    │  │
│  │                                                                           │  │
│  │ • totalSyncs          - Número total de sincronizaciones                   │  │
│  │ • successfulSyncs     - Sincronizaciones exitosas                         │  │
│  │ • failedSyncs         - Sincronizaciones fallidas                         │  │
│  │ • avgDuration         - Duración promedio de sync                         │  │
│  │ • totalRecordsSynced - Total de registros sincronizados                   │  │
│  │ • queueSize          - Tamaño actual de la cola                           │  │
│  │ • lastSyncTime       - Timestamp última sincronización                    │  │
│  │ • conflictsResolved  - Conflictos resueltos                              │  │
│  │                                                                           │  │
│  │ TENDENCIAS:                                                               │  │
│  │ • syncFrequency      - Frecuencia de sincronización                       │  │
│  │ • successRate        - Tasa de éxito                                       │  │
│  │ • dataTransfer       - Volumen de datos transferidos                      │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Resumen de la Arquitectura

| Componente | Líneas | Propósito |
|------------|--------|-----------|
| `UnifiedSyncEngine` | 1314 | Motor centralizado de sincronización |
| `useSync.ts` | 302 | Hook principal para componentes |
| `useSyncQueue.ts` | ~150 | Gestión de cola offline |
| `dynamicDataService` | ~117 | Servicio de datos dinámicos |
| `SyncFSM` | ~220 | Control de flujo con estados |
| `UploadGroupBuilder` | ~170 | Agrupación para upload |
| **TOTAL** | **~2300** | **Sistema completo de sync** |

### Beneficios de la Arquitectura

1. **Un solo punto de entrada**: `unifiedSyncEngine`
2. **Offline-first**: Cola local con retry automático
3. **Resolución de conflictos**: Automática o manual
4. **Métricas integradas**: `SyncMetricsService`
5. **FSM robusto**: Control de flujo con estados definidos
6. **Realtime optional**: Suscripción a cambios en vivo