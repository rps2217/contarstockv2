# Análisis de Relaciones: Proveedores ↔ Productos ↔ Vencimientos

## 📊 Diagrama de Relaciones

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  PROVEEDORES    │     │   PRODUCTOS      │     │  VENCIMIENTOS   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ rut (PK)        │     │ barcode (PK)    │     │ barcode (FK)   │
│ name            │────<│ supplier (name) │     │ productName     │
│ exchangePolicy   │     │ supplierRut (FK)│────<│ providerName     │
│ withdrawalDays   │     │ category        │     │ providerRut (FK)│
│ hasExchange      │     │ price           │     │ mm, yyyy        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POLÍTICAS DE NEGOCIO                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Proveedor.hasExchange ──────> ¿Puedo canjear?                  │
│                                                                  │
│  Proveedor.withdrawalDays ──> ¿Cuántos días antes retiro?       │
│                                                                  │
│  Proveedor.exchangePolicy ──> Descripción de política            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Mapeo en Supabase (syncRegistry.ts)

### PROVEEDORES → Supabase

```typescript
mapToRemote: (p) => ({
  rut: p.rut,
  name: p.name,
  withdrawal_days: Number(p.withdrawalDays) || 30,
  has_exchange: Boolean(p.hasExchange),
  exchange_policy: p.exchangePolicy || '',
})

mapToLocal: (remote) => ({
  rut: remote.rut,
  name: remote.name,
  withdrawalDays: Number(remote.withdrawal_days || 30),
  hasExchange: Boolean(remote.has_exchange),
  exchangePolicy: remote.exchange_policy || '',
})
```

### PRODUCTOS → Supabase

```typescript
mapToRemote: (p) => ({
  barcode: p.barcode,
  name: p.name,
  category: p.category || 'GENERAL',
  supplier_rut: p.supplierRut || null,    // ← FK al proveedor
  supplier: p.supplier || '',               // ← Cache para queries rápidas
  price: Number(p.price) || 0,
})

mapToLocal: (remote) => ({
  barcode: remote.barcode,
  supplierRut: remote.supplier_rut,
  supplier: remote.supplier,
})
```

---

## 🔗 Llaves de Relación

### Vínculo Principal: `supplierRut` / `providerRut`

| Tabla | Campo | Tipo | Descripción |
|-------|-------|------|-------------|
| PRODUCTOS | `supplier` | VARCHAR | Nombre del proveedor (para UI) |
| PRODUCTOS | `supplierRut` | VARCHAR | RUT del proveedor (llave) |
| VENCIMIENTOS | `providerName` | VARCHAR | Nombre del proveedor (para UI) |
| VENCIMIENTOS | `providerRut` | VARCHAR | RUT del proveedor (llave) |
| PROVEEDORES | `rut` | VARCHAR (PK) | Identificador único |

---

## 🔄 Flujo de Búsqueda de Políticas

### Para VENCIMIENTOS:

```
1. VENCIMIENTOS.providerRut
   └─> buscar en PROVEEDORES.rut
   
2. Si NO existe providerRut:
   VENCIMIENTOS.providerName
   └─> buscar en PROVEEDORES.name (normalizado)
   
3. Si existe en PRODUCTOS:
   PRODUCTOS.supplierRut
   └─> buscar en PROVEEDORES.rut
```

### Código de Referencia (`expiryProcessor.ts`):
```typescript
// Búsqueda por nombre normalizado
const normalizedQuery = normalizeIdentity(effectiveSupplierName);
for (const p of Array.from(providerMap.values())) {
  if (normalizeIdentity(p.name) === normalizedQuery) {
    provider = p;
    break;
  }
}
```

---

## 📋 Campos Clave de PROVEEDORES

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `rut` | string | Identificador único (PK) |
| `name` | string | Nombre comercial |
| `exchangePolicy` | string | Descripción de política de canje |
| `withdrawalDays` | number | Días antes del vencimiento para retirar |
| `hasExchange` | boolean | ¿El proveedor acepta canjes? |

---

## 🎯 Reglas de Negocio Actuales

### Determinación de Canje vs Merma:

```typescript
if (provider?.hasExchange === true) {
  → Clasificar como "CANJE" (devolver al proveedor)
} else {
  → Clasificar como "MERMA" (pérdida para la empresa)
}
```

### Cálculo de Fecha de Retiro:

```typescript
withdrawalDate = expiryDate - provider.withdrawalDays
```

---

## ⚠️ Problemas Identificados

### 1. Relación Débil entre PRODUCTOS y PROVEEDORES

**Problema**: La relación es por nombre (`supplier`) en lugar de por RUT.

**Impacto**: 
- Si cambia el nombre del proveedor, se pierde la relación
- Búsquedas inexactas por coincidencia de strings

**Solución Sugerida**:
```typescript
// En lugar de:
product.supplier === provider.name

// Usar:
product.supplierRut === provider.rut
```

### 2. Normalización Inconsistente

**Problema**: Se usa `normalizeIdentity()` para comparar nombres, pero:
- No siempre se persiste el RUT en PRODUCTOS
- La búsqueda puede fallar si hay errores tipográficos

### 3. Fallback a Valores por Defecto

Cuando no se encuentra el proveedor:
```typescript
withdrawalDays = settings?.withdrawalDaysDefault ?? 30
hasExchange = false
```

---

## 🚀 Mejoras Sugeridas

### Opción A: Crear Tabla Intermedia PRODUCTO_PROVEEDOR

```sql
CREATE TABLE PRODUCTO_PROVEEDOR (
  product_barcode VARCHAR,
  provider_rut VARCHAR,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  PRIMARY KEY (product_barcode, provider_rut)
);
```

### Opción B: Forzar RUT en PRODUCTOS

```typescript
interface Product {
  barcode: string;
  supplier: string;
  supplierRut: string; // OBLIGATORIO, no opcional
}
```

### Opción C: Cache de Políticas en VENCIMIENTOS

```typescript
interface ExpiryItem {
  providerRut: string;      // FK obligatorio
  withdrawalDays: number;    // Copiado del proveedor
  hasExchange: boolean;     // Copiado del proveedor
  // Almacenado en el momento de la recepción
}
```

---

## 📁 Archivos de Referencia

| Archivo | Propósito |
|---------|-----------|
| `src/features/expiry/utils/expiryProcessor.ts` | Procesamiento de vencimientos con políticas |
| `src/features/compliance/hooks/useComplianceData.ts` | Dashboard de cumplimiento |
| `src/repositories/ProviderRepository.ts` | Acceso a proveedores |
| `src/repositories/ProductRepository.ts` | Acceso a productos |

---

## 🔍 Queries de Diagnóstico en Supabase

### 1. Verificar Integridad de Relaciones

```sql
-- Productos sin proveedor válido
SELECT 
  p.barcode,
  p.name,
  p.supplier,
  p.supplier_rut,
  CASE 
    WHEN pr.rut IS NULL THEN '❌ PROVEEDOR NO EXISTE'
    WHEN p.supplier_rut IS NULL THEN '⚠️ SIN RUT'
    ELSE '✅ OK'
  END as status
FROM PRODUCTOS p
LEFT JOIN PROVEEDORES pr ON p.supplier_rut = pr.rut
ORDER BY status DESC;
```

### 2. Ver Políticas por Proveedor

```sql
-- Proveedores con políticas de canje
SELECT 
  rut,
  name,
  has_exchange,
  withdrawal_days,
  exchange_policy
FROM PROVEEDORES
ORDER BY has_exchange DESC, name ASC;
```

### 3. Crear Vista de Cumplimiento

```sql
-- Vista para compliance con políticas resueltas
CREATE OR REPLACE VIEW VIEW_CUMPLIMIENTO AS
SELECT 
  v.barcode,
  v.mm,
  v.yyyy,
  v.quantity,
  p.name as product_name,
  pr.name as provider_name,
  pr.has_exchange,
  pr.withdrawal_days,
  pr.exchange_policy,
  -- Fecha de retiro calculada
  DATE_SUB(
    DATE(CONCAT(v.yyyy, '-', LPAD(v.mm, 2, '0'), '-01')),
    INTERVAL COALESCE(pr.withdrawal_days, 30) DAY
  ) as withdrawal_date,
  -- Días restantes
  DATEDIFF(
    DATE_SUB(
      DATE(CONCAT(v.yyyy, '-', LPAD(v.mm, 2, '0'), '-01')),
      INTERVAL COALESCE(pr.withdrawal_days, 30) DAY
    ),
    CURDATE()
  ) as days_remaining
FROM VENCIMIENTOS v
JOIN PRODUCTOS p ON v.barcode = p.barcode
LEFT JOIN PROVEEDORES pr ON p.supplier_rut = pr.rut 
   OR UPPER(v.provider_name) = UPPER(pr.name);
```

### 4. Resumen de Políticas por Proveedor

```sql
SELECT 
  pr.name as proveedor,
  COUNT(DISTINCT p.barcode) as total_productos,
  COUNT(DISTINCT CASE WHEN pr.has_exchange = true THEN p.barcode END) as con_canje,
  COUNT(DISTINCT CASE WHEN pr.has_exchange = false THEN p.barcode END) as sin_canje,
  AVG(pr.withdrawal_days) as dias_promedio_retiro
FROM PROVEEDORES pr
LEFT JOIN PRODUCTOS p ON p.supplier_rut = pr.rut
GROUP BY pr.rut, pr.name
ORDER BY total_productos DESC;
```

---

## 📋 Resumen de la Arquitectura

| Aspecto | Estado | Notas |
|---------|--------|-------|
| **PK Proveedores** | ✅ `rut` | Identificador único |
| **FK en Productos** | ⚠️ `supplier_rut` | Puede ser NULL |
| **FK en Vencimientos** | ⚠️ `provider_rut` | Fallback a `provider_name` |
| **Políticas de Canje** | ✅ `has_exchange` | Boolean en PROVEEDORES |
| **Días de Retiro** | ✅ `withdrawal_days` | Número en PROVEEDORES |
| **Cache en PRODUCTOS** | ✅ `supplier` | Para queries rápidas |

---

## 🎯 Recomendaciones

1. **Normalizar RUTs**: Asegurar que `supplierRut` siempre esté poblado en PRODUCTOS
2. **Validar Relaciones**: Crear constraint o trigger en Supabase
3. **Queries Eficientes**: Usar la vista `VIEW_CUMPLIMIENTO` para dashboards
