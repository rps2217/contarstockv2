# Ejemplo de Uso: AuditPanel en EventItemRow

Este documento muestra cómo integrar el sistema de auditoría en un componente existente.

---

## Paso 1: Importar componentes

```tsx
import { AuditPanel } from '@/shared/components/ui/AuditPanel';
import { useAudit } from '@/hooks/useAudit';
```

## Paso 2: Agregar estado para auditoría

```tsx
const [showAudit, setShowAudit] = useState(false);
const { getRecordHistory } = useAudit();
```

## Paso 3: Agregar botón de auditoría

```tsx
<button
  onClick={() => setShowAudit(true)}
  className="text-slate-500 hover:text-slate-300"
>
  <History className="w-4 h-4" />
</button>
```

## Paso 4: Mostrar panel en modal/drawer

```tsx
{showAudit && (
  <Modal onClose={() => setShowAudit(false)}>
    <AuditPanel
      tableName="events"
      recordId={event.id}
      loadHistory={getRecordHistory}
      title={`Historial: ${event.id}`}
    />
  </Modal>
)}
```

---

## Hook useAudit - Métodos Disponibles

| Método | Descripción |
|--------|-------------|
| `log(entry)` | Registrar un cambio manualmente |
| `getRecordHistory(table, id)` | Historial de un registro |
| `getTableHistory(table, limit)` | Historial de una tabla |
| `getUserHistory(userId?, limit)` | Historial de un usuario |
| `getPendingSync()` | Entradas pendientes de sync |
| `markSynced(ids)` | Marcar como sincronizadas |
| `purgeOld(timestamp)` | Eliminar logs antiguos |

---

## Integración con Repositorios

Para auditoría automática, usar `AuditRepository`:

```tsx
import { AuditRepository, SyncableRepository } from '@/repositories/base';

// Crear repositorio base
const baseRepo = new SyncableRepository(db.events, 'events');

// Envolver con auditoría
const eventsRepo = new AuditRepository(baseRepo, 'events');

// Usar normalmente - el logging es automático
await eventsRepo.update(id, { quantity: 10 });
// ↑ Se registra en audit_logs automáticamente
```

---

## API de auditService (standalone)

Para uso en servicios sin React:

```typescript
import { auditService } from '@/hooks/useAudit';

await auditService.log({
  tableName: 'events',
  recordId: '123',
  action: 'UPDATE',
  fieldName: 'quantity',
  oldValue: 5,
  newValue: 10,
});
```
