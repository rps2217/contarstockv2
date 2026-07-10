# Diagrama de Funcionamiento - ContarStock v2

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTARSTOCK v2                                      │
│              Sistema de Gestión de Inventario con Rediseño UI               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          NAVEGACIÓN PRINCIPAL                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐   │
│   │     SIDEBAR     │      │   BOTTOM DOCK   │      │   TOP HEADER    │   │
│   │   (Desktop)     │      │   (Mobile)      │      │   (Global)      │   │
│   │                 │      │                 │      │                 │   │
│   │  📊 Dashboard   │      │  📊 Panel       │      │  🔔 Notifs     │   │
│   │  📷 Capturar    │      │  📷 Capturar    │      │  👤 Usuario    │   │
│   │  📦 Datos       │      │  📦 Datos       │      │  ⚙️ Ajustes   │   │
│   │  📅 Vencimient. │      │  📊 Reportes    │      │                 │   │
│   │  📈 Reportes    │      │  ⚙️ Ajustes    │      │                 │   │
│   │  🔄 Sync        │      │                 │      │                 │   │
│   │  ⚙️ Ajustes     │      │                 │      │                 │   │
│   └─────────────────┘      └─────────────────┘      └─────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Navegación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           JERARQUÍA DE PÁGINAS                             │
└─────────────────────────────────────────────────────────────────────────────┘

                           ┌─────────────────┐
                           │    DASHBOARD    │
                           │   (Principal)   │
                           │                 │
                           │ • Métricas      │
                           │ • Quick Actions │
                           │ • Actividad     │
                           │ • Estado Sync   │
                           └────────┬────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│     CAPTURA      │      │      DATOS       │      │   SINCRONIZ.    │
│                  │      │                  │      │                  │
│  ┌────────────┐  │      │  ┌────────────┐  │      │  • Estado Sync  │
│  │  Conteo    │  │      │  │ Inventario │  │      │  • Cola Sync    │
│  │  Recepción │  │      │  │ Clientes   │  │      │  • Conflictos   │
│  │  Eventos   │  │      │  │ Proveedores│  │      │  • Logs         │
│  │  Vencimient│  │      │  │ Órdenes    │  │      │  • Métricas     │
│  │  Masivo    │  │      │  └────────────┘  │      └──────────────────┘
│  └────────────┘  │      └──────────────────┘
           │                        │
           └────────────────────────┼────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
           ▼                        ▼                        ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   VENCIMIENTOS   │      │    REPORTES      │      │    AJUSTES      │
│                  │      │                  │      │                  │
│  • Resumen       │      │  • Valor Invent. │      │  • Perfil       │
│  • Por vencer    │      │  • Ítems Cont.   │      │  • Tema         │
│  • Vencidos      │      │  • Discrepancias│      │  • Notificaciones│
│  • Vigentes     │      │  • Gráficos     │      │  • Sync          │
│                  │      │                  │      │  • Dispositivos  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
```

## Sistema de Diseño - Tokens CSS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SISTEMA DE DISEÑO (REDISEÑO 2026)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  TEMA OSCURO (Default)                    TEMA CLARO                        │
│  ─────────────────────────────────       ─────────────────────────────────  │
│  Variable CSS        │  Valor           Variable CSS        │  Valor       │
│  ────────────────────┼─────────         ────────────────────┼─────────     │
│  --bg-base          │  #09090b        --bg-base          │  #f8fafc    │
│  --bg-surface       │  #18181b        --bg-surface       │  #ffffff    │
│  --bg-elevated      │  #27272a        --bg-elevated      │  #f1f5f9    │
│  --border-subtle    │  rgba(255,5%)   --border-subtle    │  rgba(0,6%) │
│  --text-primary     │  #f4f4f5        --text-primary     │  #0f172a    │
│  --text-secondary   │  #a1a1aa        --text-secondary   │  #475569    │
│  --text-muted       │  #71717a        --text-muted       │  #94a3b8    │
│  --color-primary    │  #3b82f6        --color-primary    │  #2563eb    │
│                                                                              │
│  TEMA GRIS                                                                │
│  ─────────────────────────────────                                          │
│  Variable CSS        │  Valor                                               │
│  --bg-base          │  #e5e7eb                                             │
│  --bg-surface       │  #f3f4f6                                             │
│  --bg-elevated      │  #ffffff                                              │
│  --border-subtle    │  #d1d5db                                             │
│  --text-primary     │  #171717                                             │
│  --text-secondary   │  #525252                                             │
│  --text-muted       │  #737373                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS PRINCIPAL                             │
└─────────────────────────────────────────────────────────────────────────────┘

     USUARIO                    APP                      NUBE
        │                        │                        │
        │  ┌──────────────────┐ │                        │
        │  │ 1. Escanea       │ │                        │
        │  │    Producto      │ │                        │
        │  └────────┬─────────┘ │                        │
        │           │           │                        │
        │           └───────────▶│                        │
        │                        │                        │
        │                        │ ┌──────────────────┐   │
        │                        │ │ 2. Busca en      │   │
        │                        │ │    IndexedDB     │   │
        │                        │ │    (Dexie)       │   │
        │                        │ └────────┬─────────┘   │
        │                        │          │             │
        │                        │          ▼             │
        │                        │   ┌───────────────┐     │
        │                        │   │  IndexedDB   │     │
        │                        │   │  - Productos │     │
        │                        │   │  - Sessions  │     │
        │                        │   │  - Counts    │     │
        │                        │   └───────────────┘     │
        │                        │          │             │
        │                        │          │             │
        │  ┌──────────────────┐ │          │             │
        │  │ 3. Ingresa      │ │          │             │
        │  │    Cantidad     │ │          │             │
        │  └────────┬─────────┘ │          │             │
        │           │           │          │             │
        │           └───────────▶│          │             │
        │                        │          │             │
        │                        │ ┌─────────┴─────────┐   │
        │                        │ │ 4. Agrega a      │   │
        │                        │ │    SyncQueue     │   │
        │                        │ └─────────┬─────────┘   │
        │                        │           │             │
        │                        │           ▼             │
        │                        │   ┌───────────────┐     │
        │                        │   │ SyncQueue     │     │
        │                        │   │ - pendingItems│     │
        │                        │   │ - conflicts   │     │
        │                        │   └───────────────┘     │
        │                        │           │             │
        │                        │           │             │
        │                        │           ▼             │
        │                        │   ┌───────────────┐     │
        │                        │   │ SyncManager   │────▶│
        │                        │   │ (Background)   │     │
        │                        │   └───────────────┘     │
        │                        │           │             │
        │                        │           ▼             │
        │                        │   ┌───────────────┐     │
        │                        │   │ Supabase     │◀────│
        │                        │   │ PostgreSQL   │     │
        │                        │   └───────────────┘     │
        │                        │           │             │
        │  ┌──────────────────┐ │           │             │
        │  │ 5. ✓ Sincronizado │ │           │             │
        │  └────────┬─────────┘ │           │             │
        │           │           │           │             │
        │           └───────────▶│           │             │
        │                        │           │             │
        │                        │           ▼             │
        │                        │   ┌───────────────┐     │
        │                        │   │  Feedback     │     │
        │                        │   │  Toast/Sound  │     │
        │                        │   └───────────────┘     │
        │                        │                        │
        ▼                        ▼                        ▼
```

## Estructura de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENTES PRINCIPALES                               │
└─────────────────────────────────────────────────────────────────────────────┘

AppShell (Layout)
│
├── RedesignSidebar (Desktop)
│   ├── Logo (Package2 + ContarStock)
│   ├── Navigation Items
│   │   ├── Dashboard
│   │   ├── Capturar
│   │   ├── Datos
│   │   ├── Vencimientos
│   │   ├── Reportes
│   │   ├── Sync
│   │   └── Ajustes
│   ├── Active Indicator (motion.div)
│   ├── Collapse Toggle
│   └── Sync Badge
│
├── RedesignBottomDock (Mobile)
│   ├── Tab Items
│   ├── Active Indicator (motion.div)
│   └── Status Badges
│
├── RedesignDashboard
│   ├── Header (Saludo + Status)
│   ├── StatCards Grid
│   │   ├── Total Items
│   │   ├── Sync Pendiente
│   │   ├── Por Vencer
│   │   └── Alertas
│   ├── Quick Actions Grid
│   │   ├── Nuevo Conteo (primary)
│   │   ├── Recibir Stock
│   │   ├── Modo Ráfaga
│   │   └── Ver Inventario
│   └── Recent Activity
│
├── RedesignCapturePage
│   ├── Header (Scan + Título)
│   ├── Tab Navigation
│   │   ├── Conteo
│   │   ├── Recepción
│   │   ├── Eventos
│   │   ├── Vencimiento
│   │   └── Masivo
│   ├── Input Mode Toggle (Camera/Manual)
│   ├── Scanner Area
│   └── Recent Scans
│
├── RedesignDataPage
│   ├── Header (Database + Título)
│   ├── Tab Navigation
│   │   ├── Inventario
│   │   ├── Clientes
│   │   ├── Proveedores
│   │   └── Órdenes
│   ├── Search Bar
│   ├── Filter Button
│   └── Data List
│       └── Product Cards
│
├── RedesignExpiryPage
│   ├── Header + Add Button
│   ├── Summary Cards
│   │   ├── Vencido
│   │   ├── Crítico
│   │   ├── A Retirar
│   │   ├── Próximo
│   │   └── Vigente
│   ├── Search Bar
│   ├── Filter Chips
│   └── Collapsible Sections
│
├── RedesignReportsPage
│   ├── Header + Export Button
│   ├── Time Filter
│   ├── Metrics Grid
│   │   ├── Valor Inventario
│   │   ├── Ítems Contados
│   │   ├── Discrepancias
│   │   └── Rotación
│   └── Chart Section
│
├── RedesignSettingsPage
│   ├── Header
│   ├── Profile Card
│   ├── Settings Groups
│   │   ├── Preferencias
│   │   │   ├── Tema
│   │   │   ├── Idioma
│   │   │   └── Notificaciones
│   │   └── Sistema y Nube
│   │       ├── Sync Auto
│   │       ├── Dispositivos
│   │       └── Seguridad
│   └── Logout Button
│
└── RedesignSyncPage
    ├── Header
    ├── Status Banner
    ├── Stats Grid
    │   ├── Registros Locales
    │   ├── Conflictos
    │   └── Actualizaciones
    └── Sync Log
```

## Modelo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MODELO DE DATOS                                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     SESSION     │       │     PRODUCT     │       │      COUNT       │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id: string      │       │ id: string      │       │ id: string      │
│ status          │◀──────│ sessionId: str  │       │ sessionId: str  │
│ startTime       │       │ productId: str  │◀──────│ productId: str  │
│ endTime         │       │ sku             │       │ counted: number │
│ userId          │       │ name            │       │ expected: number│
│ mode            │       │ barcode         │       │ photo: string?  │
│ location        │       │ category        │       │ timestamp       │
└──────────────────┘       │ stock           │       └──────────────────┘
        │                   │ price           │
        │                   │ minStock        │
        │                   │ image: string?  │
        │                   │ expiryDate?     │
        │                   │ supplierId      │
        │                   └──────────────────┘
        │                           │
        └───────────────────────────┘
                                    │
┌──────────────────┐                │
│  SYNC_QUEUE     │                │
├──────────────────┤                │
│ id: number      │                │
│ tableName       │                │
│ recordId        │                │
│ operation       │                │
│ data: JSON      │                │
│ status          │                │
│ retries         │                │
│ lastError?      │                │
│ createdAt       │                │
└──────────────────┘                │

┌──────────────────┐       ┌──────────────────┐
│    SUPPLIER     │       │     CUSTOMER    │
├──────────────────┤       ├──────────────────┤
│ id: string      │       │ id: string      │
│ name            │       │ name            │
│ rut             │       │ rut             │
│ contact         │       │ email           │
│ phone           │       │ phone           │
│ address         │       │ address         │
└──────────────────┘       └──────────────────┘
```

## Estados de la Aplicación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ESTADOS DE LA APLICACIÓN                            │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │   SIN SESIÓN    │
                    │                 │
                    │   Login Screen  │
                    │   └─────────────┼──────────┐
                    └─────────────────┘          │
                                                 │ StartSession
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CON SESIÓN ACTIVA                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │    OFFLINE      │
                    │                 │
                    │  Icono amarillo │
                    │  Cola local     │
                    └────────┬────────┘
                             │ Online
                             ▼
                    ┌─────────────────┐
                    │  SYNCING...    │
                    │                 │
                    │  Icono animado  │
                    │  Progreso %    │
                    └────────┬────────┘
                             │ Complete
                             ▼
                    ┌─────────────────┐
                    │    ONLINE       │
                    │                 │
                    │  Icono verde    │
                    │  Sincronizado   │
                    └────────┬────────┘
                             │ Changes
                             ▼
                    ┌─────────────────┐
                    │   HAS_PENDING   │
                    │                 │
                    │  Badge en Sync  │
                    │  items: N       │
                    └─────────────────┘

MODOS DE OPERACIÓN:
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐            │
│  │   📦 CONTEO    │  │   🔨 HAMMER      │  │   📱 ERP        │            │
│  │                 │  │   PRICE          │  │   MODE          │            │
│  │ Conteo físico   │  │ Modificación     │  │ Lectura simple  │            │
│  │ de inventario   │  │ masiva de        │  │ sin captura     │            │
│  │                 │  │ precios          │  │                 │            │
│  │ • Agregar prods │  │                 │  │ • Solo lectura  │            │
│  │ • Editar        │  │ • Scan + Nuevo  │  │ • Sin cambios   │            │
│  │ • Fotos         │  │   precio        │  │ • Sin sync      │            │
│  │ • Sync a nube   │  │ • Aplica a      │  │                 │            │
│  │                 │  │   múltiples     │  │                 │            │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STACK TECNOLÓGICO                                    │
└─────────────────────────────────────────────────────────────────────────────┘

FRONTEND:
┌─────────────────────────────────────────────────────────────────────────────┐
│  React 18 + TypeScript + Vite                                                │
│  ├── Routing: React Router v6 (HashRouter para PWA)                        │
│  ├── State: Zustand (stores)                                                │
│  │   ├── useAppStore (UI state)                                             │
│  │   ├── useSyncStore (sync state)                                          │
│  │   └── useSettingsStore (user preferences)                                │
│  ├── UI: Lucide React + Framer Motion                                       │
│  ├── Database: Dexie (IndexedDB wrapper)                                    │
│  ├── Charts: Recharts (lazy loaded)                                         │
│  ├── Camera: html5-qrcode                                                   │
│  ├── Export: xlsx + jspdf                                                   │
│  └── PWA: vite-plugin-pwa + workbox                                         │
└─────────────────────────────────────────────────────────────────────────────┘

BACKEND/CLOUD:
┌─────────────────────────────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL + Auth + Realtime + Storage)                         │
│  ├── Tables: products, sessions, counts, users, suppliers, customers         │
│  ├── Auth: email/password + magic link                                     │
│  ├── Storage: productos_images bucket                                       │
│  └── Realtime: sync updates subscription                                    │
└─────────────────────────────────────────────────────────────────────────────┘

HERRAMIENTAS DE DESARROLLO:
┌─────────────────────────────────────────────────────────────────────────────┐
│  • Git + GitHub                                                             │
│  • ESLint + Prettier                                                        │
│  • Tailwind CSS + autoprefixer                                              │
│  └── TypeScript (strict mode)                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Bundles del Build

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ESTRUCTURA DE BUNDLES                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│ vendor-react      │  160 KB    │  React, ReactDOM, ReactRouter
├─────────────────────────────────┤
│ vendor-ui          │  221 KB    │  Lucide, Framer Motion, Sonner
├─────────────────────────────────┤
│ vendor-scanner     │  334 KB    │  html5-qrcode, qrcode.react
├─────────────────────────────────┤
│ vendor-transformers│  807 KB    │  Transformers.js (AI)
├─────────────────────────────────┤
│ vendor-export      │  829 KB    │  xlsx, jspdf
├─────────────────────────────────┤
│ vendor-db          │   75 KB    │  Dexie
├─────────────────────────────────┤
│ vendor-charts      │   58 KB    │  Recharts (lazy)
├─────────────────────────────────┤
│ app-code          │  443 KB    │  Application code
├─────────────────────────────────┤
│ TOTAL (sin gzip)  │  2.9 MB    │
│ TOTAL (gzip)      │  ~800 KB   │
└─────────────────────────────────┘

PWA: 91 assets precacheados (6.3 MB)
```
