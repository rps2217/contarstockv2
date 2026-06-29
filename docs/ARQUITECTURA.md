# Arquitectura ContarStock v2

## Visión General

```
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE PRESENTACIÓN                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Dashboard │ │Capture   │ │DataPage  │ │Reports   │  ...     │
│  │          │ │Page      │ │          │ │Page      │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │             │            │            │                  │
│       └─────────────┴────────────┴────────────┘                  │
│                         │                                        │
│                    ┌────▼────┐                                  │
│                    │AppShell │  Navegación principal             │
│                    └────┬────┘                                  │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                         ▼           CAPA DE DATOS                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    IndexedDB (Dexie.js)                  │    │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐  │    │
│  │  │products │ │customers │ │providers │ │  sessions  │  │    │
│  │  └─────────┘ └──────────┘ └──────────┘ └────────────┘  │    │
│  │  ┌─────────┐ ┌──────────┐ ┌──────────────────────┐    │    │
│  │  │  scans  │ │syncQueue │ │     audit_logs       │    │    │
│  │  └─────────┘ └──────────┘ └──────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                         ▼           CAPA DE SERVICIOS            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │useDbReady    │ │useOptical    │ │useAutoSync  │            │
│  │              │ │Engine        │ │              │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────────┐
│                         ▼           APIs EXTERNAS                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │Supabase      │ │Barcode      │ │html5-qrcode │            │
│  │(Backend)     │ │Detector API │ │(WASM)        │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Inicialización

```
App Entry → AppShell → useDbReady() → db.open()
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              [Loading]         [Error]           [Ready]
               <DbLoader>       <DbError>        Render Page
```

## Flujo de Escaneo

```
Usuario → CapturePage (cámara)
              │
              ▼
    useOpticalEngine()
              │
    ┌─────────┴─────────┐
    ▼                   ▼
BarcodeDetector    html5-qrcode
(Nativo)           (Fallback WASM)
    │                   │
    └─────────┬─────────┘
              ▼
        Código leído
              │
              ▼
    navigate(/counting/new?code=XXX)
```

## CRUD de Productos

```
DataPage
    │
    ├─[+]──► ProductForm ──► handleCreateProduct ──► IndexedDB
    │
    ├─[📝]──► ProductForm + producto ──► handleUpdateProduct ──► IndexedDB
    │
    └─[🗑]──► handleDeleteProduct ──► IndexedDB
```

## Estructura de Archivos

```
src/shared/components/redesign/
├── AppShell.tsx              # Navegación principal
├── Dashboard.tsx             # Panel de métricas
├── ThemeContext.tsx          # Sistema de temas
├── utils.ts                 # cn(), helpers
│
├── pages/
│   ├── CapturePage.tsx      # Escaneo de códigos
│   ├── DataPage.tsx          # CRUD de datos
│   ├── ReportsPage.tsx       # Reportes
│   ├── SyncPage.tsx         # Sincronización
│   ├── SettingsPage.tsx     # Configuración
│   └── ExpiryPage.tsx       # Vencimientos
│
├── components/
│   ├── DbLoader.tsx         # Loading de BD
│   └── forms/
│       ├── ProductForm.tsx  # Form producto
│       ├── CustomerForm.tsx # Form cliente
│       └── ProviderForm.tsx # Form proveedor
│
└── hooks/
    └── useDbReady.ts        # Espera inicialización DB
```

## Estado de Funcionalidades

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Dashboard | ✅ | Métricas y accesos rápidos |
| CapturePage | ✅ | Escaneo con cámara |
| DataPage | ✅ | CRUD productos/clientes/proveedores |
| SyncPage | 🔄 | Cola de sync con Supabase |
| ReportsPage | 🔄 | Generación de reportes |
| SettingsPage | ✅ | Configuraciones básicas |
| ExpiryPage | 🔄 | Gestión de vencimientos |
