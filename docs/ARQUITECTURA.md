# Arquitectura de ContarStock v2

## Diagrama de Funcionamiento de la Aplicación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTARSTOCK v2                                     │
│                    Sistema de Gestión de Inventario                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   NAVEGACIÓN    │
                              │   PRINCIPAL     │
                              └────────┬────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌───────────────┐            ┌─────────────────┐            ┌─────────────────┐
│   SIDEBAR     │            │  BOTTOM DOCK    │            │   TOP HEADER    │
│   (Desktop)   │            │    (Mobile)     │            │   (Global)      │
└───────────────┘            └─────────────────┘            └─────────────────┘
        │                              │                              │
        └──────────────────────────────┼──────────────────────────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    │                  │                  │
                    ▼                  ▼                  ▼
         ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
         │   📊 DASHBOARD   │  │   📦 CAPTURA     │  │   🔄 SINCRONIZ. │
         │   Métricas y     │  │   Conteo de      │  │   Sync con la    │
         │   Resumenes      │  │   Inventario     │  │   nube (PWA)     │
         └──────────────────┘  └──────────────────┘  └──────────────────┘
                    │                  │                  │
                    ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MÓDULOS DE LA APLICACIÓN                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   📦📦📦   │  │    👥👥    │  │    🚚🚚    │  │    📋📋    │        │
│  │  INVENTARIO │  │  CLIENTES  │  │ PROVEEDORES│  │ PEDIDOS    │        │
│  │             │  │             │  │             │  │ ESPERADOS  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    🔨🔨    │  │    📝📝    │  │    📊📊    │  │    🏷️🏷️   │        │
│  │   HAMMER    │  │   SLICES   │  │   REPORTES  │  │ ETIQUETAS  │        │
│  │   PRICE     │  │   AUDITORÍA│  │             │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS PRINCIPAL                             │
└─────────────────────────────────────────────────────────────────────────────┘

     USUARIO                          APP                              NUBE
       │                               │                                │
       │  1. Escanea Producto          │                                │
       │──────────────────────────────▶│                                │
       │                               │                                │
       │                               │  2. Busca en Local (Dexie)     │
       │                               │──────────────────────────────▶  │
       │                               │                                │
       │                               │  3. Producto Encontrado?       │
       │                               │◀───────────────────────────────│
       │                               │                                │
       │  4. Ingresa Cantidad          │                                │
       │──────────────────────────────▶│                                │
       │                               │                                │
       │                               │  5. Guarda en IndexedDB        │
       │                               │───────────────────────────────▶│
       │                               │                                │
       │  6. Confirma                  │                                │
       │──────────────────────────────▶│                                │
       │                               │                                │
       │                               │  7. Agrega a SyncQueue          │
       │                               │───────────────────────────────▶│
       │                               │                                │
       │                               │  8. SyncManager (Background)    │
       │                               │───────────────────────────────▶│
       │                               │                                │
       │  9. Sincronizado ✓            │                                │
       │◀──────────────────────────────│                                │
       │                               │                                │


┌─────────────────────────────────────────────────────────────────────────────┐
│                         SISTEMA DE DISEÑO (REDISEÑO 2026)                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           TEMA OSCURO (Default)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  Variable CSS          │  Clase Tailwind  │  Valor              │  Uso       │
├─────────────────────────┼──────────────────┼────────────────────┼───────────│
│  --bg-base             │  bg-base         │  #09090b           │  Fondo    │
│  --bg-surface          │  bg-surface      │  #18181b           │  Cards    │
│  --bg-elevated         │  bg-elevated     │  #27272a           │  Elem.Elev│
│  --border-subtle       │  border-subtle   │  rgba(255,5%)      │  Bordes   │
│  --text-primary        │  text-primary    │  #f4f4f5           │  Texto pr │
│  --text-secondary      │  text-secondary  │  #a1a1aa           │  Texto sc │
│  --text-muted          │  text-muted      │  #71717a           │  Texto mt │
│  --color-primary       │  text-primary    │  #3b82f6           │  Acento   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           MODOS DE OPERACIÓN                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   📦 CONTEO     │  │   🔨 HAMMER      │  │   📱 ERP        │            │
│  │                 │  │   PRICE          │  │   MODE          │            │
│  │ Conteo físico   │  │ Modificación     │  │ Lectura simple  │            │
│  │ de inventario   │  │ masiva de        │  │ sin captura     │            │
│  │                 │  │ precios          │  │                 │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────┘

## Diagrama General de Componentes

```mermaid
graph TB
    subgraph "Frontend (React + TypeScript)"
        App[App.tsx - Lazy Loading]
        subgraph "Features"
            Inventory[Inventario]
            Counts[Conteos]
            Sessions[Sesiones]
            Events[Eventos]
        end
        subgraph "Shared Components"
            UI[UI Components]
            Hooks[Hooks Comunes]
        end
    end

    subgraph "Services Layer"
        subgraph "Core Services"
            InitService[InitializationService]
            ConfigSync[ConfigSynchronizer]
            DynamicData[DynamicDataService]
            LocalBrain[LocalBrain]
        end
        
        subgraph "Sync Services - MOTOR UNIFICADO"
            UnifiedEngine["🎯 UnifiedSyncEngine (NUEVO)"]
            subgraph "Legacy Wrappers"
                SyncOrchestrator[SyncOrchestrator]
            end
        end
        
        subgraph "AI Services"
            GeminiAI[Gemini AI]
            Transformers[Transformers]
        end
    end

    subgraph "Data Layer"
        subgraph "Repositories"
            BaseRepo[BaseRepository]
            AuditRepo[AuditRepository]
            ProductRepo[ProductRepository]
            SessionRepo[SessionRepository]
        end
        
        subgraph "Database (Dexie/IndexedDB)"
            DB[(IndexedDB)]
        end
    end

    subgraph "External Services"
        Supabase[Supabase]
        ERP[ERP System]
    end

    App --> Features
    Features --> Hooks
    Hooks --> Services
    
    InitService --> ConfigSync
    ConfigSync --> DynamicData
    
    UnifiedEngine --> Supabase
    UnifiedEngine --> DB
    UnifiedEngine --> ERP
    
    SyncOrchestrator -.->|delegates| UnifiedEngine
    
    Repositories --> DB
    Services --> Repositories
```

### Arquitectura del Motor Unificado

```mermaid
graph TB
    subgraph "UnifiedSyncEngine"
        direction TB
        
        EventSystem["📡 Event System<br/>(listeners)"]
        StateMachine["⚙️ FSM States<br/>(idle|syncing|error|offline)"]
        
        subgraph "Core Methods"
            SyncAll["🔄 syncAll()"]
            SyncCatalogs["📦 syncCatalogs()"]
            SyncBatches["📤 syncBatches()"]
            Enqueue["📝 enqueue()"]
            ProcessQueue["⚡ processQueue()"]
        end
        
        subgraph "Sub-Services (integrados)"
            GenericSync["• Catálogos (products, providers)"]
            BatchOps["• Batch Operations (push/pull)"]
            QueueService["• Offline Queue (retry/backoff)"]
            Realtime["• Real-time Subscriptions"]
        end
    end
    
    EventSystem --> StateMachine
    StateMachine --> SyncAll
    SyncAll --> SyncCatalogs
    SyncAll --> SyncBatches
    SyncBatches --> ProcessQueue
    Enqueue --> ProcessQueue
```

## Flujo de Sincronización

```mermaid
sequenceDiagram
    participant User
    participant App
    participant UnifiedSyncEngine
    participant Supabase
    participant ERP
    participant DB
    
    User->>App: Inicia App
    App->>UnifiedSyncEngine: syncAll()
    
    Note over UnifiedSyncEngine: FSM: idle → syncing_catalogs
    
    par Sync Catálogos
        UnifiedSyncEngine->>Supabase: pullCatalogs()
        Supabase-->>UnifiedSyncEngine: Productos, Proveedores
        UnifiedSyncEngine->>DB: Guardar local
        DB-->>UnifiedSyncEngine: OK
    and Sync Batches
        UnifiedSyncEngine->>UnifiedSyncEngine: processQueue()
        UnifiedSyncEngine->>Supabase: pushBatch()
        Supabase-->>UnifiedSyncEngine: Confirmed
    and Realtime
        UnifiedSyncEngine->>Supabase: Subscribe to changes
    end
    
    Note over UnifiedSyncEngine: FSM: syncing_catalogs → idle
    
    App-->>User: ✅ Sincronización completa
```

### API Pública del Motor Unificado

```typescript
// Uso recomendado (código nuevo)
import { unifiedSyncEngine } from '@/services/sync/unified';

// Sincronización completa
await unifiedSyncEngine.syncAll();

// Solo catálogos
await unifiedSyncEngine.syncCatalogs();

// Solo batches pendientes
await unifiedSyncEngine.syncBatches();

// Encolar cambio offline
await unifiedSyncEngine.enqueue({
  tableName: 'products',
  recordId: '123',
  operation: 'update',
  data: { name: 'Nuevo Producto' },
  priority: 'high'
});

// Suscribirse a eventos
unifiedSyncEngine.addListener((event) => {
  console.log('Sync event:', event.type);
});

// Tiempo real
unifiedSyncEngine.startRealtimeSync();
```

### Compatibilidad Legacy

```typescript
// Código existente sigue funcionando
import { syncOrchestrator } from '@/services/sync';

// syncOrchestrator.delegates internally to unifiedSyncEngine
await syncOrchestrator.syncAll();
```

## Modelo de Datos

```mermaid
erDiagram
    PRODUCTS {
        string id PK
        string sku
        string name
        string category
        float stock
        timestamp updated_at
    }
    
    SESSIONS {
        string id PK
        string status
        timestamp start_time
        timestamp end_time
        string user_id
    }
    
    COUNTS {
        string id PK
        string session_id FK
        string product_id FK
        float counted
        float expected
    }
    
    INVENTORY_REGISTRY {
        string id PK
        string product_id FK
        string location
        float quantity
        timestamp last_updated
    }
    
    AUDIT_LOGS {
        int id PK
        string table_name
        string operation
        string record_id
        json old_data
        json new_data
        timestamp created_at
        string device_info
    }
    
    SYNC_QUEUE {
        int id PK
        string table_name
        string operation
        string record_id
        json data
        int retries
        string last_error
    }
    
    PRODUCTS ||--o{ COUNTS : has
    SESSIONS ||--o{ COUNTS : contains
    PRODUCTS ||--o{ INVENTORY_REGISTRY : tracked_in
```

## Estados de Sync FSM

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> SyncingCatalogs: syncCatalogs()
    Idle --> UploadingBatches: uploadBatches()
    
    SyncingCatalogs --> DownloadingProducts: Descargar productos
    DownloadingProducts --> DownloadingProviders: Descargar proveedores
    DownloadingProviders --> DownloadingSessions: Descargar sesiones
    DownloadingSessions --> CheckingConflicts: Verificar conflictos
    CheckingConflicts --> ResolvingConflicts: Resolver diferencias
    ResolvingConflicts --> Idle: Éxito
    
    UploadingBatches --> PreparingBatch: Preparar lote
    PreparingBatch --> PushingBatch: Subir a Supabase
    PushingBatch --> WaitingResponse: Esperar confirmación
    WaitingResponse --> RetryingOnError: Error? Reintentar
    RetryingOnError --> PreparingBatch: Max retries
    WaitingResponse --> Idle: Éxito
    
    SyncingCatalogs --> Error: Error de red
    UploadingBatches --> Error: Error de red
    Error --> Idle: Reintentar después
```

## TypeScript Strict Mode Status

✅ **TypeScript Strict Mode: HABILITADO - 0 errores**

### Correcciones Realizadas

| Archivo | Corrección |
|---------|------------|
| `AuditRepository.ts` | Agregado null-check para métodos opcionales (saveMany, update, count, exists) |
| `ConfigSynchronizer.ts` | Imports corregidos (CloudStorageConfig, AppSettings) y null-check para cloudConfig |
| `modules.ts` | Path corregido de `../../types` a `../types` |
| `SyncQueueService.ts` | Imports corregidos (telemetryService, handleError) y tipo priority requerido |
| `SyncQueueService.ts` | TelemetryEventType cambiado de 'SYNC_QUEUE' a 'SYNC' |
| `SyncFSM.extended.test.ts` | async callback fix para match con Promise<void> |
| `ProductSearchInput.tsx` | Null-check para supplierRut |
| `useCloudCache.ts` | Generic interface movida fuera de la función |

## Análisis de Motores de Sincronización

La aplicación tiene **3 motores de sync** + **2 orquestadores**:

### Motores Principales
| Motor | Ubicación | Propósito |
|-------|-----------|-----------|
| `GenericSyncEngine` | `src/services/cloud/` | Sync de catálogos (productos, proveedores, sesiones) |
| `BatchSyncService` | `src/services/cloud/` | Operaciones batch: push, pull, delete |
| `RealtimeSyncService` | `src/services/cloud/` | Suscripciones en tiempo real via Supabase |

### Orquestadores
| Orquestador | Ubicación | Propósito |
|-------------|-----------|-----------|
| `SyncOrchestrator` | `src/services/sync/` | Coordina GenericSyncEngine + BatchSyncService |
| `SyncFSM` | `src/services/sync/fsm/` | Máquina de estados para gestión de sync |

### Cola Offline
| Servicio | Ubicación | Propósito |
|----------|-----------|-----------|
| `SyncQueueService` | `src/services/sync/` | Cola offline con retry y backoff exponencial |

### Evaluación: ¿Es Ideal?

**NO, actualmente hay redundancia.** Recomendaciones:

1. **Consolidar a 2 motores máximo**: GenericSyncEngine (catálogos) + BatchSyncService (datos usuario)
2. **Eliminar SyncOrchestrator**: Añade otra capa de indirección
3. **Cola unificada**: Un solo SyncQueueService, no múltiples mecanismos de cola
4. **Centralizar tipos**: Solo `types/common.ts` como fuente única de verdad

**Estado actual**: 3 motores + 2 orquestadores = 5 partes móviles
**Ideal**: 1-2 motores máximo

## Estructura de Bundles (Vite)

```mermaid
pie title Distribución de Bundles
    "vendor-react (React, ReactDOM)" : 150
    "vendor-ui (Lucide, Framer)" : 80
    "vendor-charts (Recharts)" : 120
    "vendor-db (Dexie)" : 60
    "vendor-export (xlsx, jspdf)" : 100
    "vendor-ai (Gemini, Transformers)" : 200
    "app-code (Nuestra app)" : 250
```
