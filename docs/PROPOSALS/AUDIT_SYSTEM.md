# PROPUESTA: Sistema de Auditoría de Cambios

## Inspiración: AppSheet Audit Log

AppSheet proporciona un registro completo de cambios que es invaluable para:
- Compliance y trazabilidad
- Debug de problemas
- Historial de ediciones por usuario
- Reversión de cambios accidentales

---

## Propuesta para ContarStock v2

### 1. Tabla de Auditoría

```typescript
// src/types/AuditLog.ts
export interface AuditLogEntry {
  id: string;
  tableName: string;        // 'events', 'sessions', 'products', etc.
  recordId: string;        // ID del registro afectado
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  fieldName?: string;      // Campo específico modificado (opcional)
  oldValue?: string;       // Valor anterior (JSON stringified)
  newValue?: string;       // Valor nuevo (JSON stringified)
  userId: string;          // ID del usuario
  deviceInfo?: string;     // Info del dispositivo
  timestamp: number;
  synced: boolean;
}
```

### 2. Dexie Schema

```typescript
// Agregar a db.ts
export const auditLog = new Dexie('AuditLog');
auditLog.version(1).stores({
  id: 'primary',
  tableName: 'indexed',
  recordId: 'indexed',
  userId: 'indexed',
  timestamp: 'indexed',
  synced: 'indexed'
});
```

### 3. Hook useAudit

```typescript
// src/hooks/useAudit.ts
export function useAudit() {
  const log = async (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'synced'>) => {
    await auditLog.add({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      synced: false
    });
  };

  const getRecordHistory = async (tableName: string, recordId: string) => {
    return auditLog
      .where(['tableName', 'recordId'])
      .equals([tableName, recordId])
      .reverse()
      .sortBy('timestamp');
  };

  return { log, getRecordHistory };
}
```

### 4. Integración con Repositorios

```typescript
// En BaseRepository.ts
class BaseRepository<T> {
  async update(id: string, data: Partial<T>) {
    const oldRecord = await this.get(id);
    
    // ... update logic ...
    
    // Log the change
    const audit = useAudit();
    await audit.log({
      tableName: this.tableName,
      recordId: id,
      action: 'UPDATE',
      oldValue: JSON.stringify(oldRecord),
      newValue: JSON.stringify(newRecord),
      userId: getCurrentUserId()
    });
  }
}
```

### 5. UI: Panel de Auditoría

Componente similar a SyncActivity pero para ver historial de cambios:

```tsx
<AuditPanel 
  recordId={selectedEventId}
  tableName="events"
/>
```

---

## Beneficios Inmediatos

| Feature | Valor |
|---------|-------|
| Trazabilidad | Quién cambió qué y cuándo |
| Debug | Historial para resolver problemas |
| Compliance | Registro para auditorías |
| Reversión | Base para implementar "undo" |

---

## Esfuerzo de Implementación

| Componente | Líneas estimadas |
|------------|------------------|
| Types + DB | ~30 |
| useAudit hook | ~50 |
| BaseRepository integration | ~20 |
| UI AuditPanel | ~150 |
| **Total** | **~250 líneas** |

---

## Siguiente Paso

¿Te interesa que implemente esta auditoría? Es un proyecto pequeño (~250 líneas) con alto impacto en la calidad del software.
