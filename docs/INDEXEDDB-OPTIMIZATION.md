# Optimización de Índices IndexedDB

*Fecha: 2026-06-28*
*Estado: ✅ Ya optimizado en DbMigrator.ts*

---

## Resumen

Los índices ya están correctamente configurados en `src/db/migrations/DbMigrator.ts` (versión 52).

## Índices Implementados

### Tabla: `products`
```typescript
products: '&barcode, name, syncStatus'
```
- ✅ `&barcode` - Índice único para búsqueda O(1) por código de barras
- ✅ `syncStatus` - Índice para productos pendientes de sync
- ✅ `name` - Índice para búsqueda por nombre

### Tabla: `scans`
```typescript
scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, 
        [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]'
```
- ✅ `sessionId` - Para obtener scans de una sesión
- ✅ `syncStatus` - Para scans pendientes
- ✅ Compuestos para consultas frecuentes

### Tabla: `sessions`
```typescript
sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, 
           [erpOrder+createdAt], [status+lastSyncTimestamp]'
```
- ✅ `status` - Para sesiones activas
- ✅ `syncStatus` - Para sesiones pendientes
- ✅ Compuestos para consultas complejas

### Tabla: `dynamic_data`
```typescript
dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]'
```
- ✅ Compuesto para registros pendientes por tabla

### Tabla: `providers`
```typescript
providers: '&rut, name, syncStatus'
```

### Tabla: `customers`
```typescript
customers: '&id, firstName, lastName, phone, syncStatus'
```

### Tabla: `audit_logs`
```typescript
audit_logs: '++id, tableName, recordId, action, userId, timestamp, synced, [tableName+recordId], [userId+timestamp]'
```

## Consultas Optimizadas

### Productos pendientes de sync
```typescript
// ✅ Usa índice syncStatus
const pending = await db.products
  .where('syncStatus').equals('pending')
  .toArray();
```

### Búsqueda por barcode (crítica para scanner)
```typescript
// ✅ Usa índice único barcode - O(1)
const product = await db.products
  .where('barcode').equals(scannedBarcode)
  .first();
```

### Scans de una sesión ordenados
```typescript
// ✅ Usa índice compuesto [sessionId+timestamp]
const sessionScans = await db.scans
  .where('[sessionId+timestamp]')
  .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
  .toArray();
```

## Verificación de Índices

Para verificar que los índices funcionan correctamente:

```typescript
// En Chrome DevTools > Console
const db = await window.indexedDB.databases();
console.log('Bases de datos:', db);

// O en la aplicación
import { db } from '@/db';

async function checkIndexes() {
  const tables = ['products', 'scans', 'sessions', 'dynamic_data'];
  
  for (const tableName of tables) {
    const table = db.table(tableName);
    const schema = table.schema;
    console.log(`${tableName}:`, [...schema.indexes.keys()]);
  }
}
```

## Índices Faltantes Potenciales

| Tabla | Índice | Uso |
|-------|--------|-----|
| `products` | `category` | Filtrar por categoría |
| `products` | `supplierRut` | Filtrar por proveedor |
| `expirations` | `status` | Productos próximos a vencer |

Estos índices pueden agregarse si hay consultas frecuentes por esos campos.

---

*Documento generado - 2026-06-28*
