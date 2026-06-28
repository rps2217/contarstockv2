# Diagrama de Arquitectura - LogiCount Pro

## 1. Arquitectura General (Capas)

```mermaid
graph TB
    subgraph "CAPA DE PRESENTACIÓN (UI)"
        A1[Sidebar]
        A2[BottomDock]
        A3[Dashboard]
        A4[CapturePage]
        A5[DataPage]
        A6[SyncPage]
        A7[CountingPage]
        A8[SettingsPage]
        A9[Login]
    end

    subgraph "CAPA DE NEGOCIO (Hooks & Services)"
        B1[useAppInit]
        B2[useAutoSync]
        B3[useAutoSession]
        B4[useExpiryWatcher]
        B5[useGenericSync]
        B6[CountingLogic]
        B7[SessionService]
        B8[SyncManager]
        B9[GenericSyncEngine]
    end

    subgraph "CAPA DE DATOS (Repositories & DB)"
        C1[LogiCountDB<br/>IndexedDB/Dexie]
        C2[SyncQueue]
        C3[AuditLog]
        C4[BaseRepository]
    end

    subgraph "CAPA EXTERNA (Cloud Services)"
        D1[Supabase]
        D2[ERP Service]
        D3[Google Gemini AI]
    end

    A1 --> B1
    A3 --> B2 & B3
    A4 --> B5 & B6
    A5 --> C1
    A7 --> B6 & B7
    B1 --> C1
    B2 --> B9
    B5 --> B9
    B8 --> B9
    B9 --> C1
    B9 --> D1
    C1 --> D1
```

## 2. Flujo de Inicialización de la App

```mermaid
sequenceDiagram
    participant User as Usuario
    participant App as App.tsx
    participant Init as useAppInit
    participant Auth as Login
    participant InitSvc as InitializationService
    participant DB as LogiCountDB
    participant Cloud as Supabase

    User->>App: Abre la app
    App->>Init: Ejecuta hook
    Init->>Auth: Verifica auth en localStorage
    alt No autenticado
        Auth->>User: Muestra Login
        User->>Auth: Ingresa credenciales
        Auth->>App: handleLoginSuccess()
    else Autenticado
        Init->>InitSvc: run()
        InitSvc->>InitSvc: 1. version_check
        InitSvc->>DB: Verifica IndexedDB
        InitSvc->>InitSvc: 2. syncConfig
        InitSvc->>Cloud: pullBatch CONFIG_SISTEMA
        InitSvc->>InitSvc: 3. database
        InitSvc->>Cloud: importProducts
        InitSvc->>Cloud: importProviders
        InitSvc->>Cloud: importCustomers
        InitSvc->>InitSvc: Sanitize Database
        InitSvc-->>Init: 'ready'
    end
    Init->>App: bootState: ready, isAuthenticated
    App->>App: Renderiza Dashboard
```

## 3. Flujo de Sincronización (Sync Architecture)

```mermaid
flowchart LR
    subgraph "LOCAL (IndexedDB)"
        L1[(Productos)]
        L2[(Sesiones)]
        L3[(Scans)]
        L4[(Órdenes)]
        L5[(Eventos)]
    end

    subgraph "SYNC QUEUE"
        Q1[Pending Items]
        Q2[Error Items]
        Q3[Delete Items]
    end

    subgraph "SYNC ENGINE"
        SE1[GenericSyncEngine]
        SE2[BatchUploader]
        SE3[ConflictResolution]
    end

    subgraph "CLOUD (Supabase)"
        C1[(remote_products)]
        C2[(remote_sessions)]
        C3[(remote_scans)]
    end

    L1 & L2 & L3 -->|dirty records| Q1
    Q1 --> SE1
    SE1 --> SE2
    SE2 -->|pushBatch| C1 & C2 & C3
    C1 & C2 & C3 -->|pullBatch| L1 & L2 & L3
```

## 4. Módulos de Negocio

```mermaid
graph TB
    subgraph "FEATURES / MÓDULOS"
        M1[DASHBOARD<br/>Métricas, Quick Actions]
        M2[CAPTURE<br/>Recepción, Eventos]
        M3[COUNTING<br/>Conteo Inventario]
        M4[EXPIRY<br/>Vencimientos]
        M5[EVENTS<br/>Eventos/Locación]
        M6[REPORTS<br/>Informes, Auditoría]
        M7[DATA<br/>Gestión Datos]
        M8[SYNC<br/>Sincronización]
        M9[SETTINGS<br/>Configuración]
    end

    subgraph "DATOS COMPARTIDOS"
        DB[(LogiCountDB<br/>IndexedDB)]
        ST[(Stores<br/>Zustand)]
    end

    subgraph "SERVICIOS"
        SV1[SessionService]
        SV2[SyncManager]
        SV3[ProductService]
        SV4[ExportService]
        SV5[ERPService]
    end

    M1 --> ST
    M2 --> SV1 & SV3
    M3 --> SV1 & SV2
    M4 --> SV3
    M6 --> SV4 & SV2
    M7 --> SV3
    M8 --> SV2
    SV1 & SV2 & SV3 --> DB
    M2 & M3 & M4 --> DB
```

## 5. Flujo de Conteo de Inventario (Counting Flow)

```mermaid
flowchart TD
    Start([Inicio]) --> SelectSession[Seleccionar/Crear Sesión]
    SelectSession --> Scan[Escanear Producto]
    Scan --> FindProduct[Buscar en DB local]
    FindProduct -->|Encontrado| ShowProduct[Mostrar Info Producto]
    FindProduct -->|No encontrado| ShowError[Error: Producto no existe]
    ShowProduct --> EnterQty[Ingresar Cantidad]
    EnterQty --> Multiplier{Aplicar<br/>Multiplicador?}
    Multiplier -->|Sí| ApplyMult[Aplicar x6, x12, x24]
    Multiplier -->|No| SaveScan
    ApplyMult --> SaveScan
    SaveScan[Guardar ScanRecord]
    SaveScan --> CheckExpected{¿Orden<br/>esperada?}
    CheckExpected -->|Sí| LogExpected[Marcar como esperado]
    CheckExpected -->|No| Continue
    LogExpected --> Continue[Continuar escaneando]
    Continue --> MoreScans{¿Más<br/>escaneos?}
    MoreScans -->|Sí| Scan
    MoreScans -->|No| Finalize[Finalizar Sesión]
    Finalize --> Sync[Sync a la nube]
    Sync --> Done([Completado])

    ShowError --> ManualEntry[Entrada manual?]
    ManualEntry -->|Sí| EnterManual[Ingresar manualmente]
    EnterManual --> EnterQty
    ManualEntry -->|No| Continue
```

## 6. Arquitectura de Base de Datos Local

```mermaid
erDiagram
    PRODUCTS {
        string barcode PK
        string name
        float stock
        string category
        timestamp createdAt
    }

    SESSIONS {
        int id PK
        string operatorId
        string status
        timestamp startTime
        timestamp endTime
    }

    SCANS {
        int id PK
        int sessionId FK
        string barcode FK
        int quantity
        string location
        timestamp timestamp
        string syncStatus
    }

    EXPECTED_ORDERS {
        string id PK
        json items
        int totalExpectedUnits
        timestamp importedAt
    }

    AUDIT_LOGS {
        int id PK
        string tableName
        string recordId
        string action
        string oldValue
        string newValue
        timestamp timestamp
        boolean synced
    }

    SYNC_QUEUE {
        int id PK
        string tableName
        string operation
        string recordId
        json data
        string priority
        int retries
    }

    PRODUCTS ||--o{ SCANS : "has"
    SESSIONS ||--o{ SCANS : "contains"
    PRODUCTS ||--o{ EXPECTED_ORDERS : "referenced_in"
```

## 7. Stack Tecnológico

```mermaid
graph LR
    subgraph "FRONTEND"
        REACT[React 18]
        RR[React Router]
        ZUSTAND[Zustand<br/>State Management]
        TAILWIND[Tailwind CSS]
        FRAMER[Framer Motion]
        SONNER[Sonner<br/>Toasts]
        LUCIDE[Lucide Icons]
    end

    subgraph "DATOS LOCALES"
        DEXIE[Dexie.js<br/>IndexedDB Wrapper]
        IDB[(IndexedDB)]
    end

    subgraph "SERVICIOS CLOUD"
        SUPABASE[Supabase<br/>PostgreSQL]
        ERP[ERP API]
        GEMINI[Google Gemini<br/>AI Vision]
    end

    subgraph "HARDWARE"
        CAMERA[Cámara]
        HIDScanner[Scanner HID]
        PRINTER[Impresora Térmica]
    end

    REACT --> DEXIE
    DEXIE --> IDB
    REACT --> ZUSTAND
    REACT --> SUPABASE
    DEXIE --> SUPABASE
    REACT --> ERP
    REACT --> GEMINI
    REACT --> CAMERA
    REACT --> HIDScanner
    REACT --> PRINTER
```

## 8. Servicios Clave

```mermaid
mindmap
    root((SERVICIOS))
        Sync
            GenericSyncEngine
            SyncQueue
            BatchUploader
            ConflictResolution
            CatalogImporter
        Data
            ProductService
            SessionService
            ExpectedOrderRepository
            EventRepository
            ExpiryRepository
        AI/Analytics
            DetectiveService
            AggregatorWorker
            VisionService
        Hardware
            AudioEngine
            HapticEngine
            ThermalPrinterEngine
            ScannerMachine
        Utilities
            ExportService
            BackupService
            Logger
            Telemetry
```

## 9. Resumen de Flujo de Datos

```mermaid
flowchart TB
    subgraph "ENTRADA DE DATOS"
        E1[Scanner<br/>Cámara]
        E2[Teclado<br/>Manual]
        E3[CSV Import]
        E4[Cloud Sync<br/>Pull]
    end

    subgraph "PROCESAMIENTO"
        P1[Normalización<br/>Barcode]
        P2[Validación]
        P3[Búsqueda Producto]
        P4[Cálculo Stock]
    end

    subgraph "ALMACENAMIENTO"
        L1[(IndexedDB<br/>Local)]
        L2[(SyncQueue)]
        L3[(AuditLog)]
    end

    subgraph "SALIDA"
        S1[UI Actualizada]
        S2[Cloud Sync<br/>Push]
        S3[Export<br/>PDF/Excel]
        S4[Print<br/>Ticket]
    end

    E1 & E2 & E3 --> P1
    P1 --> P2
    P2 -->|Válido| P3
    P2 -->|Inválido| S1
    P3 --> P4
    P4 --> L1
    P4 --> L2
    P4 --> L3
    L1 --> S1
    L2 --> S2
    L1 --> S3
    L1 --> S4
    E4 --> L1
```

---

## Notas de Implementación

### Lazy Loading
- Todos los módulos se cargan con `lazyWithRetry()` para optimizar el bundle inicial
- El Dashboard carga primero, otros módulos se cargan bajo demanda

### Offline-First
1. Todas las operaciones escriben primero en IndexedDB
2. Los cambios pendientes van a SyncQueue
3. useAutoSync periódicamente sube los cambios a la nube
4. En caso de conflicto, ConflictResolution aplica estrategias configuradas

### Hooks Globales
- `useAutoSync()` - Sincronización automática cada 60s
- `useAutoSession()` - Gestión automática de sesiones
- `useExpiryWatcher()` - Monitoreo de productos próximos a vencer
