# Análisis del Módulo Expiry/Vencimientos - ContarStock v2

## Resumen Ejecutivo

El módulo `expiry/` gestiona **vencimientos de productos** con 2,431 líneas organizadas en:
- 1 página principal: `ExpiryPage.tsx`
- 4 hooks: database, query, mutations, sync
- 2 utils: expiryUtils (461 líneas), expiryProcessor (279 líneas)
- 1 domain: expiryEngine (122 líneas)
- 4 componentes: ExpirationModal, ExpiryCaptureModal, ExpiryDetailModal, ExpiryCaptureRow

---

## 1. ANÁLISIS POR ARCHIVO

### 1.1 expiryUtils.ts (461 líneas) ⚠️ CRÍTICO

| Aspecto | Análisis |
|---------|----------|
| **Propósito** | Funciones de impresión (reportes y etiquetas) |
| **Problemas** | **MUY LARGO**, HTML hardcodeado, JS en strings |

**Funciones identificadas:**
1. `handlePrintExpirations` - Reporte de vencimientos (genera HTML con JsBarcode)
2. `handlePrintLabels` - Etiquetas de productos (genera HTML con JsBarcode)

**PROBLEMA PRINCIPAL:** 
- HTML hardcodeado como strings literales
- Scripts inline con JsBarcode
- No usa templates o componentes React
- Difícil de mantener y debuggear

**Recomendación:** Extraer templates a archivos HTML separados o usar componentes React para generación de prints.

---

### 1.2 ExpirationModal.tsx (387 líneas) ⚠️ MUY LARGO

| Aspecto | Análisis |
|---------|----------|
| **Propósito** | Modal de captura de fecha de vencimiento |
| **Líneas** | 387 - **MUY LARGO** |
| **Problemas** | Múltiples responsabilidades |

**Responsabilidades identificadas:**
1. Entrada de barcode con auto-lookup
2. Selector de mes/año
3. Campo de observaciones
4. Modo continuo
5. Búsqueda híbrido (local + cloud)

**Recomendación:** Extraer a sub-componentes:
- `BarcodeInput.tsx` - Entrada y búsqueda de producto
- `MonthYearPicker.tsx` - Selector de fecha
- `ObservationField.tsx` - Campo de notas

---

### 1.3 ExpiryCaptureModal.tsx (250 líneas) ⚠️

| Aspecto | Análisis |
|---------|----------|
| **Propósito** | Modal de captura con wizard de cantidad |
| **Líneas** | 250 - Algo extenso |

**Problema:** 250 líneas para un modal

---

### 1.4 expiryProcessor.ts (279 líneas) ✅

| Aspecto | Análisis |
|---------|----------|
| **Propósito** | Procesamiento de datos de vencimiento |
| **Patrón** | Utilidad de dominio ✅ |

**Nota:** Bien estructurado, pero revisar si hay duplicación con expiryEngine.

---

### 1.5 expiryEngine.ts (122 líneas) ✅

| Aspecto | Análisis |
|---------|----------|
| **Propósito** | Lógica de dominio de vencimientos |
| **Patrón** | Domain logic ✅ |

---

### 1.6 Hooks

| Hook | Líneas | Análisis |
|------|--------|----------|
| `useExpiryMutations` | 268 | ⚠️ Algo extenso, verificar |
| `useExpiryQuery` | 165 | ✅ Bien |
| `useExpirySync` | 97 | ✅ Bien |
| `useExpiryDatabase` | 108 | ✅ Bien |

---

## 2. PROBLEMAS IDENTIFICADOS

### 2.1 SoundFX en todo el módulo

```
Archivos con SoundFX:
- ExpiryPage.tsx
- ExpirationModal.tsx
- ExpiryCaptureModal.tsx
- useExpiryMutations.ts
- useExpirySync.ts

PROBLEMA: Efectos de sonido en todas partes
```

### 2.2 HTML Hardcodeado en expiryUtils

```javascript
// Ejemplo del problema
const html = `
  <!DOCTYPE html>
  <html>
  ...
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode...">
  ...
`;
```

### 2.3 Duplicación de selectores MM/YYYY

```
ExpirationModal.tsx tiene su propio selector de mes/año
ExpiryCaptureModal.tsx tiene su propio selector de mes/año

PROBLEMA: Duplicación de UI
```

---

## 3. DECISIONES FINALES

| # | Componente | Acción | Prioridad |
|---|------------|--------|-----------|
| 13.1 | `SoundFX` en ExpiryPage | **ELIMINAR** | Alta |
| 13.2 | `SoundFX` en ExpirationModal | **ELIMINAR** | Alta |
| 13.3 | `SoundFX` en ExpiryCaptureModal | **ELIMINAR** | Alta |
| 13.4 | `SoundFX` en hooks | **ELIMINAR** | Alta |
| 13.5 | `expiryUtils.ts` | **DOCUMENTAR** (futura refactorización) | Baja |
| 13.6 | `ExpirationModal` | **POSTERGAR** (387 líneas - muy extenso) | Media |

---

## 4. IMPLEMENTACIÓN PROPUESTA

### FASE 13: Eliminar SoundFX de Expiry

```
ELIMINAR imports y llamadas a SoundFX en:
1. ExpiryPage.tsx
2. ExpirationModal.tsx
3. ExpiryCaptureModal.tsx
4. useExpiryMutations.ts
5. useExpirySync.ts
```

---

## 5. PENDIENTE (Futura Fase 14)

| Item | Descripción | Prioridad |
|------|-------------|-----------|
| Extraer selector MM/YYYY | Componente reutilizable | Media |
| Refactorizar expiryUtils | Usar templates React | Baja |
| Simplificar ExpirationModal | Extraer sub-componentes | Media |

---

*Análisis generado: 2026-06-18*
