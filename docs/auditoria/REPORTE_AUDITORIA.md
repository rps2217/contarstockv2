# Auditoría de Tablas Supabase - ContarStock v2

**Fecha:** 2026-07-02  
**Analista:** OpenHands Agent

---

## Resumen Ejecutivo

| Estado | Cantidad |
|--------|----------|
| ✅ OK | 5 tablas |
| ⚠️ Requiere corrección | 3 tablas |
| ❌ No existe | 2 tablas |
| **Total** | **10 tablas** |

---

## Estado Detallado por Tabla

### ✅ TABLAS OPERATIVAS

#### 1. PRODUCTOS
| Aspecto | Estado |
|---------|--------|
| syncRegistry | `products` |
| PK | `barcode` |
| Columnas | 9 (OK) |
| Registros | 3,185+ |
| Estructura | ✅ Correcta |

**Columnas:** `barcode`, `name`, `category`, `supplierrut`, `supplierRut`, `unitsPerBox`, `updated_at`

**Nota:** Tiene tanto `supplierrut` (minúscula) como `supplierRut` (camelCase) - el código maneja ambos formatos.

---

#### 2. PROVEEDORES
| Aspecto | Estado |
|---------|--------|
| syncRegistry | `providers` |
| PK | `rut` |
| Columnas | 8 (OK) |
| Registros | 250 |
| Estructura | ✅ Correcta |

**Columnas:** `rut`, `name`, `withdrawal_days`, `has_exchange`, `exchangePolicy`, `withdrawalDays`, `hasExchange`, `updated_at`

**Política de vencimientos aplicada:** ✅
- Días de retiro: 30, 90, 120, 150, 180, 210, 240
- Canje configurado: 90 proveedores con canje

---

#### 3. PRODUCTO_PROVEEDOR
| Aspecto | Estado |
|---------|--------|
| syncRegistry | `productProviders` |
| PK | `id` |
| Columnas | 11 (OK) |
| Registros | 3,185+ |
| Estructura | ✅ Correcta |

**Columnas:** `id`, `product_barcode`, `provider_rut`, `is_primary`, `has_exchange`, `withdrawal_days`, `exchange_policy`, `mundo`, `marca`, `created_at`, `updated_at`

---

#### 4. PEDIDOS
| Aspecto | Estado |
|---------|--------|
| syncRegistry | Ninguno (tabla auxiliar) |
| PK | `id` |
| Columnas | 11 (OK) |
| Registros | 100+ |
| Estructura | ✅ Correcta |

---

### ⚠️ TABLAS QUE REQUIEREN CORRECCIÓN

#### 5. SESSIONS
| Aspecto | Estado |
|---------|--------|
| syncRegistry | `sessions` |
| PK | `id` |
| Columnas actuales | 14 |
| Problema | Usa camelCase inconsistente |

**Columnas actuales:** `id`, `status`, `createdat`, `lastsynctimestamp`, `erporder`, `logisticslabel`, `sessiontype`, `totalunits`, `totalskus`, `isverifiedmode`, `isautolockenabled`, `labelphoto`, `photourl`, `updated_at`

**Corrección requerida:**
- `createdat` → `created_at` (snake_case)
- `erporder` → `erp_order`
- `logisticslabel` → `logistics_label`
- `sessiontype` → `session_type`
- `photourl` → `photo_url`
- Agregar: `mm`, `yyyy`, `batch`

**Script:** `MIGRACION_TABLAS_FALTANTES.sql`

---

#### 6. EVENTOS
| Aspecto | Estado |
|---------|--------|
| syncRegistry | `events` |
| PK | `id` |
| Columnas actuales | 17 |
| Problema | Usa camelCase inconsistente |

**Columnas actuales:** `id`, `ID`, `barcode`, `productName`, `providerName`, `event`, `quantity`, `location`, `frc`, `nguia`, `destino`, `traspaso`, `observaciones`, `timestamp`, `claveUnica`, `isAdjusted`, `updated_at`

**Corrección requerida:**
- `productName` → `product_name`
- `providerName` → `provider_name`
- `claveUnica` → `clave_unica`
- `isAdjusted` → `is_adjusted`

**Script:** `MIGRACION_TABLAS_FALTANTES.sql`

---

#### 7. VENCIMIENTOS
| Aspecto | Estado |
|---------|--------|
| syncRegistry | `expiry` (dynamic_data) |
| PK | `id` |
| Registros | 0 (vacía) |
| Problema | Tabla existe pero está vacía |

**Corrección requerida:**
- Estructura parece correcta pero necesita datos
- La app debe sincronizar desde IndexedDB local

**Script:** `MIGRACION_TABLAS_FALTANTES.sql`

---

### ❌ TABLAS QUE NO EXISTEN

#### 8. SCANS
| Aspecto | Estado |
|---------|--------|
| syncRegistry | `scans` |
| PK | `id` |
| Registros | ❌ TABLA NO EXISTE |
| Estructura | ❌ REQUIERE CREACIÓN |

**Corrección requerida:** Crear tabla completa

**Script:** `MIGRACION_TABLAS_FALTANTES.sql`

---

#### 9. CLIENTES
| Aspecto | Estado |
|---------|--------|
| syncRegistry | `customers` |
| PK | `id` |
| Registros | 0 (vacía) |
| Problema | Estructura incompleta |

**Corrección requerida:**
- Completar columnas faltantes
- La app usa esta tabla para clientes de pedidos

**Script:** `MIGRACION_TABLAS_FALTANTES.sql`

---

#### 10. AUDIT_LOGS
| Aspecto | Estado |
|---------|--------|
| syncRegistry | `auditLogs` |
| PK | `id` |
| Registros | ❌ TABLA NO EXISTE |
| Estructura | ❌ REQUIERE CREACIÓN |

**Corrección requerida:** Crear tabla completa para logs de auditoría

**Script:** `MIGRACION_TABLAS_FALTANTES.sql`

---

## Acciones Requeridas

### Prioridad Alta (Crítico para funcionamiento)

1. **Ejecutar `MIGRACION_TABLAS_FALTANTES.sql`**
   - Crear tabla SCANS
   - Crear tabla AUDIT_LOGS
   - Corregir SESSIONS
   - Corregir EVENTOS
   - Actualizar VENCIMIENTOS
   - Actualizar CLIENTES

### Prioridad Media (Mejora de rendimiento)

2. **Crear índices faltantes** (ya incluido en script)

3. **Verificar RLS (Row Level Security)**
   - Asegurar que las políticas permitan sync

### Prioridad Baja (Documentación)

4. **Documentar estructuras** en README del proyecto

---

## Archivos Generados

| Archivo | Descripción |
|---------|-------------|
| `AUDITORIA_TABLAS_2026-07-02.sql` | Script de auditoría (consultas) |
| `CORRECCION_TABLAS.sql` | Estructuras base de tablas |
| `MIGRACION_TABLAS_FALTANTES.sql` | **PRINCIPAL - Correcciones necesarias** |
| `REPORTE_AUDITORIA.md` | Este documento |

---

## Instrucciones de Ejecución

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar proyecto `contarstockv2`
3. Ir a **SQL Editor**
4. Copiar y pegar contenido de `MIGRACION_TABLAS_FALTANTES.sql`
5. Ejecutar
6. Verificar con `AUDITORIA_TABLAS_2026-07-02.sql`

---

## Verificación Post-Migración

Después de ejecutar la migración, verificar:

```sql
-- Verificar que todas las tablas existan
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar que tengan PK
SELECT tc.table_name, kcu.column_name as pk
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY';

-- Verificar conteo de registros
SELECT 'PRODUCTOS' as t, COUNT(*) FROM PRODUCTOS
UNION ALL SELECT 'PROVEEDORES', COUNT(*) FROM PROVEEDORES
UNION ALL SELECT 'PRODUCTO_PROVEEDOR', COUNT(*) FROM PRODUCTO_PROVEEDOR
UNION ALL SELECT 'VENCIMIENTOS', COUNT(*) FROM VENCIMIENTOS
UNION ALL SELECT 'SESSIONS', COUNT(*) FROM SESSIONS
UNION ALL SELECT 'SCANS', COUNT(*) FROM SCANS
UNION ALL SELECT 'EVENTOS', COUNT(*) FROM EVENTOS
UNION ALL SELECT 'CLIENTES', COUNT(*) FROM CLIENTES
UNION ALL SELECT 'AUDIT_LOGS', COUNT(*) FROM AUDIT_LOGS;
```

---

## Notas Técnicas

### Compatibilidad de Nombres (camelCase vs snake_case)

El código maneja ambos formatos:

```typescript
// Ejemplo en syncRegistry
mapToLocal: (remote) => ({
  withdrawalDays: Number(remote.withdrawal_days || remote.withdrawaldays || remote.withdrawalDays || 30),
})
```

**Recomendación:** Preferir `snake_case` para nuevas columnas.

### Sync con IndexedDB

- Tablas en `dynamic_data` (VENCIMIENTOS, EVENTOS) sincronizan mediante filtro `tableName`
- Tablas normales sincronizan directamente
- La sincronización es bidireccional

---

**Generado:** 2026-07-02  
**Versión:** 1.0
