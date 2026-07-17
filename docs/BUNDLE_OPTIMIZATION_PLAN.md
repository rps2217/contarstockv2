# Plan de Optimización de Bundles

**Fecha:** 2026-07-17  
**Estado:** 📋 Planificado

---

## 📊 Estado Actual

| Métrica              | Tamaño                         |
| -------------------- | ------------------------------ |
| **Total JS (raw)**   | 4.35 MB                        |
| **Total JS (gzip)**  | 1.20 MB                        |
| **Bundle principal** | ~1.4 MB (raw) / ~400 KB (gzip) |

---

## 🎯 PRIORIDADES

### 🔴 PRIORIDAD ALTA

#### 1. `vendor-transformers` (802 KB) → Meta: -400 KB (-50%)

**Problema:** Transformers.js es muy pesado (~800 KB).

**Soluciones:**

| Opción                        | Ahorro     | Complejidad | Recomendación      |
| ----------------------------- | ---------- | ----------- | ------------------ |
| Cargar solo modelo específico | -400 KB    | Media       | ✅ **Recomendado** |
| Web Workers para IA           | N/A (lazy) | Alta        | Opcional           |
| Usar API externa              | -800 KB    | Alta        | Solo si hay API    |

**Acción concreta:**

```typescript
// vite.config.ts - Cargar solo modelo pequeño
const config = {
  optimizeDeps: {
    exclude: ['@xenova/transformers'],
  },
};

// En localBrain.ts - Modelo cuantizado
const model = await transformers.pipeline(
  'feature-extraction',
  'Xenova/transformers-small' // Modelo pequeño
);
```

**Impacto:** -400 KB en gzip (~33% del total)

---

#### 2. `vendor-export` (813 KB) → Meta: -300 KB (-37%)

**Problema:** xlsx + jspdf + jspdf-autotable son pesados.

**Soluciones:**

| Opción                       | Ahorro  | Complejidad | Recomendación      |
| ---------------------------- | ------- | ----------- | ------------------ |
| Separar xlsx y pdf en chunks | -200 KB | Baja        | ✅ **Recomendado** |
| Usar alternativas ligeras    | -500 KB | Alta        | Evaluar            |
| Tree-shaking mejorado        | -50 KB  | Baja        | Implementar        |

**Acción concreta:**

```typescript
// vite.config.ts - Separar chunks de exportación
manualChunks: {
  'vendor-xlsx': ['xlsx'],
  'vendor-pdf': ['jspdf', 'jspdf-autotable'],
}

// Lazy load separados
const exportXlsx = () => import('xlsx');
const exportPdf = () => import('jspdf');
```

**Impacto:** -200 KB en gzip (~17% del total)

---

### 🟡 PRIORIDAD MEDIA

#### 3. `vendor-scanner` (327 KB) → Meta: -100 KB (-30%)

**Problema:** html5-qrcode es pesado para solo barcodes.

**Soluciones:**

| Opción                           | Ahorro | Complejidad | Recomendación      |
| -------------------------------- | ------ | ----------- | ------------------ |
| Solo html5-qrcode (sin texturas) | -50 KB | Baja        | ✅ **Recomendado** |
| Web Worker para decoding         | N/A    | Media       | Opcional           |
| Dividir en QR y Barcode          | N/A    | Media       | Postergar          |

**Acción concreta:**

```typescript
// En Html5QrcodeScanner.ts - Configurar solo barcode
const config = {
  formatsToSupport: [BarcodeFormat.CODE_128, BarcodeFormat.EAN_13],
  experimentalFeatures: { useBarCodeDetectorAPI: true },
};
```

**Impacto:** -50 KB en gzip (~4% del total)

---

#### 4. `AppShell` (712 KB) → Meta: -150 KB (-21%)

**Problema:** Demasiado código en el shell inicial.

**Soluciones:**

| Opción                  | Ahorro  | Complejidad | Recomendación      |
| ----------------------- | ------- | ----------- | ------------------ |
| Code-splitting por ruta | -100 KB | Media       | ✅ **Recomendado** |
| Lazy load de Sidebar    | -30 KB  | Baja        | Implementar        |
| Lazy load de modales    | -20 KB  | Baja        | Implementar        |

**Acción concreta:**

```typescript
// En App.tsx - Suspense boundaries por ruta
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

// En AppShell - Lazy load de componentes pesados
const HeavySidebar = lazy(() => import('./components/Sidebar'));
```

**Impacto:** -100 KB en gzip (~8% del total)

---

### 🟢 PRIORIDAD BAJA

#### 5. Optimizaciones Generales

| Optimización               | Ahorro       | Complejidad | Recomendación          |
| -------------------------- | ------------ | ----------- | ---------------------- |
| Tree-shaking en Lucide     | -20 KB       | Baja        | ✅ Implementar         |
| Tree-shaking en date-fns   | -10 KB       | Baja        | ✅ Implementar         |
| Compresión Brotli          | -15% vs gzip | Baja        | Si el servidor soporta |
| Preload de chunks críticos | N/A          | Baja        | ✅ Implementar         |

**Acción concreta:**

```typescript
// En index.html - Preload de chunks críticos
<link rel="modulepreload" href="/assets/vendor-react.js" />
<link rel="modulepreload" href="/assets/AppShell.js" />

// En vite.config.ts - Build options
build: {
  brotliSize: true,
  chunkSizeWarningLimit: 500
}
```

---

## 📈 META TOTAL

| Fase                               | Ahorro  | Resultado                     |
| ---------------------------------- | ------- | ----------------------------- |
| **Fase 1** (transformers + export) | -600 KB | 600 KB gzip → **900 KB gzip** |
| **Fase 2** (scanner + AppShell)    | -150 KB | 900 KB gzip → **750 KB gzip** |
| **Fase 3** (optimizaciones)        | -50 KB  | 750 KB gzip → **700 KB gzip** |

**Meta final:** 1.20 MB → **~700 KB gzip** (-42%)

---

## 🚀 ROADMAP DE IMPLEMENTACIÓN

```
┌─────────────────────────────────────────────────────────────────┐
│                        SEMANA 1-2                                │
├─────────────────────────────────────────────────────────────────┤
│  1.1 Separar vendor-export en vendor-xlsx y vendor-pdf          │
│  1.2 Configurar lazy loading de exportación                     │
│  1.3 Tree-shaking en Lucide y date-fns                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        SEMANA 3-4                                │
├─────────────────────────────────────────────────────────────────┤
│  2.1 Modelo pequeño para transformers                           │
│  2.2 Lazy load de Sidebar y modales pesados                     │
│  2.3 Preload de chunks críticos                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        SEMANA 5-6                                │
├─────────────────────────────────────────────────────────────────┤
│  3.1 Code-splitting por ruta                                   │
│  3.2 Optimizar vendor-scanner                                  │
│  3.3 Testing y validación                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: vendor-export (-200 KB)

- [ ] Separar xlsx en chunk propio
- [ ] Separar jspdf en chunk propio
- [ ] Lazy load por tipo de exportación
- [ ] Verificar que no hay regresiones

### Fase 2: vendor-transformers (-400 KB)

- [ ] Evaluar modelos cuantizados
- [ ] Implementar modelo pequeño
- [ ] Lazy load con fallback
- [ ] Testing de IA

### Fase 3: AppShell (-100 KB)

- [ ] Identificar componentes pesados
- [ ] Implementar lazy load en Sidebar
- [ ] Implementar lazy load en modales
- [ ] Code-splitting por ruta

### Fase 4: Optimizaciones (-50 KB)

- [ ] Tree-shaking Lucide
- [ ] Tree-shaking date-fns
- [ ] Preload chunks críticos
- [ ] Compresión Brotli (si soportado)

---

## 📊 MÉTRICAS DE SEGUIMIENTO

```bash
# Script para medir bundle
npm run build && \
  echo "=== Raw ===" && \
  du -sh dist/assets/*.js | awk '{sum+=$1} END {print "Total: " sum/1024 " MB"}' && \
  echo "=== Gzip ===" && \
  gzip -c dist/assets/*.js | wc -c | awk '{print "Total: " $1/1024/1024 " MB"}'
```

---

## 🎯 KPIs

| KPI                     | Actual  | Meta   | Estado         |
| ----------------------- | ------- | ------ | -------------- |
| JS Total (gzip)         | 1.20 MB | 700 KB | 📋 Planificado |
| Tiempo de carga inicial | ?       | < 3s   | Por medir      |
| Time to Interactive     | ?       | < 5s   | Por medir      |

---

## 📝 NOTAS

### vendor-react (176 KB)

- Ya está optimizado
- No requiere cambios

### vendor-ui (213 KB)

- Lucide tiene tree-shaking parcial
- No es crítico

### vendor-parse (115 KB)

- Ya está en lazy loading
- OK

### vendor-db (74 KB)

- Dexie es necesario
- OK
