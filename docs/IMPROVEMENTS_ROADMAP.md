# 🚀 Roadmap de Mejoras - ContarStock v2

## Propuesta de mejoras basadas en experiencia con software de inventario

---

## 1. 🔴 CRÍTICAS (Antes de Producción)

### 1.1 Recuperación ante Fallas (Auto-save Robusto)

**Problema:** Si el usuario cierra el navegador durante un conteo, puede perder datos.

**Mejora propuesta:**

```typescript
// Implementar IndexedDB para auto-save más robusto
interface SessionRecovery {
  sessionId: string;
  items: ConsolidatedItem[];
  lastLocation: string;
  timestamp: number;
  deviceId: string;
}

// - Guardar en IndexedDB cada 5 segundos
// - Sincronizar con localStorage como backup
// - Detectar cierre de pestaña y guardar inmediatamente
// - Implementar "recover session" en login
```

### 1.2 Conciliación de Inventario

**Problema:** No hay forma de comparar stock teórico vs real de forma clara.

**Mejora propuesta:**

```typescript
// Nueva pantalla: "Conciliación"
// - Importar stock desde ERP
// - Comparar con conteos realizados
// - Generar reporte de diferencias
// - Crear ajustes automáticos
```

### 1.3 Batch Scanning con Modo Offline

**Problema:** En almacenes grandes, la conexión puede fallar.

**Mejora propuesta:**

```typescript
// Implementar cola de sincronización offline
interface OfflineScan {
  barcode: string;
  quantity: number;
  location: string;
  timestamp: number;
  sessionId: string;
  synced: boolean;
}

// - Cola local en IndexedDB
// - Sincronización automática cuando hay conexión
// - Indicador visual de "pendiente de sync"
```

---

## 2. 🟠 ALTAS (MVP v3.2)

### 2.1 Dashboard de Productividad en Tiempo Real

**Problema:** Supervisores no ven el progreso del conteo en tiempo real.

**Mejora propuesta:**

```typescript
// Nueva vista: "Monitor de Conteo"
// - SKUs escaneados / SKUs esperados (%)
// - Velocidad promedio (SKUs/hora)
// - Tendencia (↑↓↓↑↑)
// - Operadores activos
// - Productos con más errores

interface ProductivityMetrics {
  skusScanned: number;
  expectedSkus: number;
  scanRate: number; // SKUs/minuto
  trend: 'up' | 'down' | 'stable';
  activeOperators: number;
  errorRate: number;
}
```

### 2.2 Validación de Lotes/Serie

**Problema:** En pharma, cada producto tiene lote y vencimiento.

**Mejora propuesta:**

```typescript
// Agregar a flujo de escaneo:
// 1. Escanear producto
// 2. Ingresar número de lote (cámara OCR o manual)
// 3. Ingresar vencimiento
// 4. Ingresar cantidad

interface BatchScan {
  barcode: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  location: string;
  scannedAt: Date;
}
```

### 2.3 Multi-idioma

**Problema:** Solo español.

**Mejora propuesta:**

```typescript
// i18n con react-i18next
const resources = {
  es: { translation: { ... } },
  en: { translation: { ... } },
  pt: { translation: { ... } },
};

// Traducir:
// - Labels de campos
// - Mensajes de error
// - Notificaciones
// - Reportes
```

### 2.4 Historial de Ajustes de Inventario

**Problema:** No se audita quién ajustó qué y por qué.

**Mejora propuesta:**

```typescript
interface InventoryAdjustment {
  id: string;
  productBarcode: string;
  previousQuantity: number;
  newQuantity: number;
  reason: string; // "Conteo", "Merma", "Daño", "Otro"
  adjustedBy: string;
  adjustedAt: Date;
  approvedBy?: string;
}

// - Log de todos los ajustes
// - Requerir aprobación para ajustes > X%
// - Exportar a Excel
```

---

## 3. 🟡 MEDIAS (v3.3+)

### 3.1 Integración con Impresoras de Etiquetas (ZPL)

**Problema:** No se pueden imprimir etiquetas de productos.

**Mejora propuesta:**

```typescript
// Generar ZPL para impresoras Zebra
const generateZPL = (product: Product) => `
^XA
^FO50,50^ADN,36,20^FD${product.name}^FS
^FO50,100^ADN,24,12^FDBarcode: ${product.barcode}^FS
^FO50,150^BY3^BCN,100,Y,N,N^FD${product.barcode}^FS
^XZ
`;

// Funcionalidades:
// - Imprimir desde producto
// - Impresión masiva
// - Etiquetas de ubicación
// - Etiquetas de envío
```

### 3.2 App Móvil PWA Mejorada

**Problema:** La PWA actual no tiene funcionalidades offline completas.

**Mejora propuesta:**

```typescript
// Service Worker mejorado:
// - Cache de productos frecuentes
// - Cola de operaciones offline
// - Sincronización inteligente (prioridad)
// - Notificaciones push

interface SyncPriority {
  critical: ['sessions', 'scans'];
  important: ['products', 'expiry'];
  normal: ['events', 'logs'];
}
```

### 3.3 Búsqueda por Voz

**Problema:** En ambientes ruidosos, escanear es difícil.

**Mejora propuesta:**

```typescript
// Web Speech API para búsqueda
const useVoiceSearch = () => {
  const startListening = async () => {
    const recognition = new webkitSpeechRecognition();
    recognition.onresult = event => {
      const query = event.results[0][0].transcript;
      searchProducts(query);
    };
  };
};
```

### 3.4 Modo "Auditor Externo"

**Problema:** Auditores necesitan acceso limitado.

**Mejora propuesta:**

```typescript
// Nuevo rol: AUDITOR
const AUDITOR_PERMISSIONS = {
  canView: ['inventory', 'reports'],
  canCount: true,
  canExport: true,
  canAdjust: false,
  canDelete: false,
};

// - Solo puede ver datos
// - Puede realizar conteos
// - Puede exportar reportes
// - No puede modificar productos
```

---

## 4. 🟢 BAJAS (Nice to Have)

### 4.1 Gamificación

**Problema:** Operadores pueden aburrirse de contear.

**Mejora propuesta:**

```typescript
// Leaderboard y logros
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
}

// Logros:
// - "Primer conteo" - Completa tu primer conteo
// - "Rápido" - 100 SKUs en 10 minutos
// - "Preciso" - 0 errores en 500 SKUs
// - "Maraton" - 8 horas de conteo
```

### 4.2 Chat entre Operadores

**Problema:** No hay comunicación en tiempo real.

**Mejora propuesta:**

```typescript
// WebSocket chat integrado
interface TeamMessage {
  id: string;
  from: string;
  message: string;
  timestamp: Date;
}

// - Chat grupal por turno
// - Notificaciones de incidencias
// - Lista de operadores activos
```

### 4.3 Predictive Stock

**Problema:** No hay forecast de inventario.

**Mejora propuesta:**

```typescript
// ML simple para predecir stock
interface StockForecast {
  productBarcode: string;
  currentStock: number;
  predictedOut: Date;
  recommendedReorder: number;
}

// Basado en:
// - Historial de consumo
// - Temporada/Fechas especiales
// - Órdenes pendientes
```

---

## 5. 📊 Métricas de Éxito

Para cada mejora, medir:

- Tiempo promedio de escaneo (antes/después)
- Tasa de errores de escaneo
- Satisfacción del operador (1-5)
- Tiempo de entrenamiento para nuevos usuarios
- Incidentes por pérdida de datos

---

## 6. 🎯 Priorización Sugerida

| Mes        | Mejoras       | Impacto                     |
| ---------- | ------------- | --------------------------- |
| **Mes 1**  | 1.1, 1.2, 2.1 | Estabilidad + Productividad |
| **Mes 2**  | 2.2, 2.4, 3.2 | Cumplimiento regulatorio    |
| **Mes 3**  | 1.3, 3.1, 3.3 | UX + Offline                |
| **Mes 4+** | 4.x           | Features diferenciadoras    |

---

## 7. 🔧 Notas Técnicas

### Arquitectura Recomendada

```
┌─────────────────┐     ┌─────────────────┐
│   PWA Client    │────▶│  Supabase       │
│                 │     │  (Auth + DB)    │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   IndexedDB     │     │   Realtime      │
│   (Offline)     │     │   (WebSocket)   │
└─────────────────┘     └─────────────────┘
```

### Stack Sugerido para Nuevas Features

- **Estado:** Zustand (ya instalado)
- **i18n:** react-i18next
- **PWA:** Workbox (ya configurado)
- **Charts:** Recharts (ya instalado)
- **Forms:** React Hook Form + Zod (ya instalado)
- **Notifications:** Web Push API

---

_Documento creado: 2026-07-16_
_Basado en experiencia con sistemas de inventario, WMS y e-commerce_
