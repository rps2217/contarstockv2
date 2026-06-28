# Arquitectura de Sincronización - ContarStock v2

## Diagrama de Arquitectura General

```mermaid
flowchart TB
    subgraph Frontend["📱 FRONTEND (React/PWA)"]
        subgraph UI["Capa de Presentación"]
            Components["Componentes UI"]
            Pages["Páginas"]
        end
        
        subgraph Hooks["Capa de Hooks"]
            useAutoSync["useAutoSync"]
            useSync["useSync"]
            useSyncManager["useSyncManager"]
            useProductSync["useProductSync"]
        end
        
        subgraph State["Estado Global"]
            useSyncStore["useSyncStore"]
            useToastStore["useToastStore"]
        end
    end
    
    subgraph Sync["Motor de Sincronización Unificado"]
        UnifiedEngine["UnifiedSyncEngine"]
        
        subgraph Engines["Motores Internos"]
            CatalogSync["GenericSyncEngine"]
            BatchSync["BatchSyncService"]
            QueueSync["SyncQueueService"]
            RealtimeSync["RealtimeSyncService"]
        end
        
        subgraph Helpers["Helpers"]
            ConflictHelper["ConflictResolutionHelper"]
            MetricsService["SyncMetricsService"]
        end
        
        subgraph Registry["Registry"]
            syncRegistry["syncRegistry"]
        end
    end
    
    subgraph Local["Base de Datos Local"]
        DB["IndexedDB (Dexie)"]
        
        subgraph Tables["Tablas Locales"]
            products["products"]
            sessions["sessions"]
            scans["scans"]
            providers["providers"]
            syncQueue["syncQueue"]
            syncMetrics["syncMetrics"]
        end
    end
    
    subgraph Remote["Backend Remoto"]
        Supabase["Supabase"]
        
        subgraph RemoteTables["Tablas Remotas"]
            remoteProducts["PRODUCTOS"]
            remoteSessions["SESSIONS"]
            remoteProviders["PROVIDERS"]
            remoteConfigs["CONFIGS"]
        end
    end
    
    subgraph Services["Servicios"]
        supabaseClient["Supabase Client"]
        telemetry["Telemetry Service"]
        logger["Logger Service"]
        circuitBreaker["Circuit Breaker"]
    end
    
    %% Flujo de UI a Hooks
    Components --> useAutoSync
    Components --> useSync
    Components --> useSyncManager
    Pages --> useProductSync
    
    %% Hooks a Stores
    useAutoSync --> useSyncStore
    useAutoSync --> useToastStore
    useSync --> useSyncStore
    useSyncManager --> useToastStore
    
    %% Hooks a UnifiedSyncEngine
    useAutoSync --> UnifiedEngine
    useSync --> UnifiedEngine
    useSyncManager --> UnifiedEngine
    
    %% Engines Internos
    UnifiedEngine --> CatalogSync
    UnifiedEngine --> BatchSync
    UnifiedEngine --> QueueSync
    UnifiedEngine --> RealtimeSync
    
    %% Helpers
    UnifiedEngine --> ConflictHelper
    UnifiedEngine --> MetricsService
    
    %% Registry
    UnifiedEngine --> syncRegistry
    syncRegistry -.-> CatalogSync
    syncRegistry -.-> BatchSync
    
    %% Database
    UnifiedEngine <--> DB
    DB <--> Tables
    
    %% Remote
    UnifiedEngine <--> supabaseClient
    supabaseClient <--> Supabase
    Supabase <--> RemoteTables
    
    %% Services
    UnifiedEngine --> logger
    UnifiedEngine --> telemetry
    UnifiedEngine --> circuitBreaker
    MetricsService --> DB
    
    %% Estilos
    classDef frontend fill:#e3f2fd,stroke:#1976d2
    classDef hooks fill:#f3e5f5,stroke:#7b1fa2
    classDef sync fill:#fff3e0,stroke:#f57c00
    classDef database fill:#e8f5e9,stroke:#388e3c
    classDef remote fill:#ffebee,stroke:#d32f2f
    classDef services fill:#f5f5f5,stroke:#616161
    
    class Components,Pages,UI frontend
    class useAutoSync,useSync,useSyncManager,useProductSync,Hooks,State hooks
    class UnifiedEngine,Engines,Helpers,Registry sync
    class DB,Tables local
    class Supabase,RemoteTables,Remote remote
    class Services services
```

## Flujo de Sincronización Completo

```mermaid
sequenceDiagram
    participant User as Usuario
    participant UI as Componentes UI
    participant Hook as useAutoSync
    participant Store as useSyncStore
    participant Engine as UnifiedSyncEngine
    participant Registry as syncRegistry
    participant LocalDB as IndexedDB
    participant Supabase as Supabase
    
    Note over User,Supabase: Sincronización Automática (Online)
    
    User->>UI: Accede a la app
    UI->>Hook: Inicia useAutoSync
    Hook->>Store: setSyncError(null)
    
    alt Online
        Hook->>Engine: syncAll()
        Engine->>Engine: checkConflicts()
        
        par Catalog Sync
            Engine->>Registry: get tables
            Registry-->>Engine: table configs
            loop Para cada tabla
                Engine->>LocalDB: pullRemoteChanges()
                LocalDB-->>Engine: changes
            end
        and Batch Sync
            Engine->>LocalDB: getPendingBatches()
            LocalDB-->>Engine: batches
            loop Para cada batch
                Engine->>Engine: pushBatch()
                Engine->>Supabase: upsert()
                Supabase-->>Engine: result
            end
        and Queue Sync
            Engine->>LocalDB: processQueue()
            loop Cola de sync
                Engine->>Supabase: push item
                Supabase-->>Engine: result
                Engine->>LocalDB: mark processed
            end
        end
        
        Engine->>Engine: recordMetrics()
        Engine-->>Hook: SyncResult
        Hook->>Store: update state
        Hook->>Hook: addToast(success)
        
    else Offline
        Hook->>Hook: addToast(offline)
        Hook->>Hook: Programar retry
    end
    
    Note over User,Supabase: Conflict Resolution
    Engine->>Engine: checkConflicts()
    alt Hay conflictos
        Engine->>ConflictHelper: getConflictStrategy()
        ConflictHelper-->>Engine: strategy
        Engine->>Engine: applyResolution()
    end
```

## Diagrama de Estados (FSM)

```mermaid
stateDiagram-v2
    [*] --> Idle: Init
    
    Idle --> Syncing: triggerSync()
    Idle --> Paused: pause()
    Paused --> Idle: resume()
    
    Syncing --> Syncing: Pull catalogs
    Syncing --> Syncing: Push batches
    Syncing --> Syncing: Process queue
    
    Syncing --> Success: All done
    Syncing --> Error: Any error
    
    Success --> Idle: Complete
    Error --> Idle: Show error
    Error --> Retrying: Auto retry
    
    Retrying --> Syncing: Retry
    Retrying --> Error: Max retries
    
    note right of Syncing
        Circuit Breaker
        puede abrir aquí
    end
    
    note right of Idle
        Timer cada 60s
        revisa pendingItems
    end
```

## Estructura de Datos

```mermaid
erDiagram
    PRODUCTS ||--o{ SCANS : "has"
    PRODUCTS ||--o{ EXPECTED_ORDERS : "belongs_to"
    PRODUCTS ||--o{ PRODUCT_PROVIDERS : "linked_to"
    
    SESSIONS ||--o{ SCANS : "contains"
    
    PROVIDERS ||--o{ PRODUCTS : "supplies"
    PROVIDERS ||--o{ PRODUCT_PROVIDERS : "provides"
    
    SYNC_QUEUE {
        int id PK
        string tableName
        string operation
        string recordId
        json data
        int timestamp
        int retries
        string priority
    }
    
    SYNC_METRICS {
        int id PK
        int timestamp
        string operation
        string tableName
        float duration
        boolean success
        int recordsAffected
        string error
    }
    
    SYNC_LOGS {
        int id PK
        string tableName
        string operation
        string status
        int recordsCount
        string error
        int duration
        int createdAt
    }
    
    PRODUCTS ||--o{ SYNC_QUEUE : "queued_for_sync"
    SYNC_QUEUE ||--o{ SYNC_LOGS : "logged_as"
    SYNC_QUEUE ||--o{ SYNC_METRICS : "tracked_in"
```

## Tablas del Registry

```mermaid
graph LR
    subgraph syncRegistry
        direction TB
        R1["products<br/>local: products<br/>remote: PRODUCTOS<br/>pk: barcode"]
        R2["sessions<br/>local: sessions<br/>remote: SESSIONS<br/>pk: id"]
        R3["scans<br/>local: scans<br/>remote: SCANS<br/>pk: id"]
        R4["providers<br/>local: providers<br/>remote: PROVIDERS<br/>pk: rut"]
        R5["configs<br/>local: dynamic_data<br/>remote: CONFIGS<br/>pk: id"]
    end
    
    R1 --> |mapToRemote| P1["Barcode → barcode<br/>Name → name<br/>Price → price"]
    R2 --> |mapToRemote| P2["StartTime → started_at<br/>Status → status"]
    R3 --> |mapToRemote| P3["Timestamp → scanned_at"]
```

## Métricas de Rendimiento

```mermaid
graph TD
    subgraph Metrics["SyncMetricsService"]
        M1["recordMetric()"]
        M2["getTableMetrics()"]
        M3["getTrends()"]
        M4["getHealthSummary()"]
        M5["cleanupOldMetrics()"]
    end
    
    subgraph Storage["Persistencia"]
        Cache["In-Memory Cache<br/>(50 records)"]
        IndexedDB["syncMetrics table"]
    end
    
    subgraph Indicators["Indicadores"]
        SuccessRate["Success Rate %"]
        AvgDuration["Avg Duration ms"]
        LastSync["Last Sync At"]
        TableStats["Per-Table Stats"]
    end
    
    M1 --> Cache
    Cache -->|flush 30s| IndexedDB
    M2 --> IndexedDB
    M3 --> IndexedDB
    M4 --> IndexedDB
    M2 --> TableStats
    M4 --> SuccessRate
    M4 --> AvgDuration
    M4 --> LastSync
```

## Retry & Resilience

```mermaid
flowchart LR
    subgraph Retry["Estrategia de Retry"]
        R1["Exponential Backoff"]
        R2["Circuit Breaker"]
        R3["Max Retries: 3"]
    end
    
    subgraph CB["Circuit Breaker Config"]
        CB1["failureThreshold: 5"]
        CB2["successThreshold: 2"]
        CB3["timeout: 60s"]
    end
    
    subgraph Errors["Manejo de Errores"]
        E1["Network Error → Silent"]
        E2["Missing Table → Silent"]
        E3["Other Error → Show"]
    end
    
    R1 --> CB1
    R2 --> CB2
    R2 --> CB3
    CB --> Errors
```

## Resumen de Archivos

```
src/services/sync/unified/
├── UnifiedSyncEngine.ts      (800+ líneas) - Motor principal
├── types.ts                  (280+ líneas) - Tipos TypeScript
├── index.ts                  (160+ líneas) - Exports públicos
├── registry.ts               (60+ líneas)  - Registro de tablas
├── ConflictResolutionHelper.ts             - Resolución de conflictos
└── SyncMetricsService.ts                  - Métricas de rendimiento

src/hooks/
├── useAutoSync.ts            - Hook de sync automático
└── (migrado a unifiedSyncEngine)

src/shared/hooks/
└── useSync.ts                - Hook genérico de sync

src/features/sync/hooks/
└── useSyncManager.ts         - Manager de UI de sync
```

## API Pública del UnifiedSyncEngine

```typescript
// Métodos principales
syncAll(): Promise<SyncResult>           // Sincronización completa
syncCatalogs(): Promise<TableSyncResult[]> // Solo catálogos
syncBatches(): Promise<SyncResult>       // Solo batches
syncTable(table: string): Promise<TableSyncResult>

// Cola offline
enqueueSync(item: QueuedSyncItem): Promise<void>
processQueue(): Promise<QueueProcessResult>

// Realtime
startRealtimeSync(): void
stopRealtimeSync(): void

// Métricas y estado
getSyncStats(): Promise<SyncStats>
getSyncState(): SyncState
addSyncListener(listener: SyncEventListener): void

// Helpers
pushBatch(table: string, rows: any[]): Promise<SyncResult>
pullTable(table: string, since?: string): Promise<TableSyncResult>
checkConflicts(table: string): Promise<SyncConflict[]>
```