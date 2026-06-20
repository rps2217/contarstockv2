# Ejemplo de Uso: RecordDetailView

Este documento muestra cómo integrar el componente RecordDetailView en módulos existentes.

---

## Ejemplo 1: En EventItemRow

```tsx
import { RecordDetailView } from '@/shared/components/ui/RecordDetailView';
import { useAudit } from '@/hooks/useAudit';

const EventItemRow: React.FC<{ event: Event }> = ({ event }) => {
  const [showDetail, setShowDetail] = useState(false);
  const { getRecordHistory } = useAudit();

  const handleDelete = async () => {
    if (confirm('¿Eliminar este evento?')) {
      await eventsRepo.delete(event.id);
    }
  };

  return (
    <>
      <div onClick={() => setShowDetail(true)}>
        {/* ... resto del componente */}
      </div>

      {showDetail && (
        <Modal onClose={() => setShowDetail(false)} fullHeight>
          <RecordDetailView
            title={event.productName || 'Evento'}
            subtitle={`${event.quantity} unidades`}
            icon={<Package className="w-5 h-5" />}
            status={event.isIncident ? 'warning' : 'default'}
            statusLabel={event.isIncident ? 'Incidente' : undefined}
            recordId={event.id}
            tableName="EVENTOS"
            sections={[
              {
                id: 'info',
                title: 'Información',
                icon: <FileText className="w-4 h-4" />,
                rows: [
                  { label: 'Barcode', value: event.barcode, copyable: true },
                  { label: 'Cantidad', value: event.quantity },
                  { label: 'Ubicación', value: event.location || 'N/A' },
                ]
              },
              {
                id: 'tiempo',
                title: 'Tiempo',
                icon: <Clock className="w-4 h-4" />,
                rows: [
                  { label: 'Creado', value: formatDate(event.timestamp) },
                  { label: 'Mes/Año', value: `${event.mm}/${event.yyyy}` },
                ]
              }
            ]}
            metadata={[
              { label: 'Creado', value: formatDate(event.timestamp), icon: <Clock className="w-3 h-3" /> },
              { label: 'Sincronizado', value: event.syncStatus === 'synced' ? 'Sí' : 'No', icon: <RefreshCw className="w-3 h-3" /> },
            ]}
            syncStatus={event.syncStatus === 'synced' ? 'synced' : 'pending'}
            actions={[
              { id: 'duplicate', label: 'Duplicar', icon: <Copy className="w-4 h-4" />, onClick: () => {} },
              { id: 'export', label: 'Exportar PDF', icon: <FileDown className="w-4 h-4" />, onClick: () => {} },
            ]}
            onEdit={() => {}}
            onDelete={handleDelete}
            onClose={() => setShowDetail(false)}
          />
        </Modal>
      )}
    </>
  );
};
```

---

## Ejemplo 2: En ProductCard

```tsx
const ProductDetail: React.FC<{ product: Product }> = ({ product }) => {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <Card onClick={() => setShowDetail(true)}>
        <h3>{product.name}</h3>
        <p>Stock: {product.stock}</p>
      </Card>

      {showDetail && (
        <Modal>
          <RecordDetailView
            title={product.name}
            subtitle={`SKU: ${product.barcode}`}
            icon={<Box className="w-5 h-5" />}
            status={product.stock < 10 ? 'warning' : 'success'}
            statusLabel={product.stock < 10 ? 'Stock Bajo' : 'Disponible'}
            recordId={product.barcode}
            tableName="PRODUCTS"
            sections={[
              {
                id: 'stock',
                title: 'Stock',
                icon: <Package className="w-4 h-4" />,
                rows: [
                  { label: 'Disponible', value: product.stock },
                  { label: 'Mínimo', value: product.minStock },
                  { label: 'Reservado', value: product.reserved || 0 },
                ]
              },
              {
                id: 'pricing',
                title: 'Precios',
                icon: <DollarSign className="w-4 h-4" />,
                rows: [
                  { label: 'Precio', value: formatCurrency(product.price) },
                  { label: 'Costo', value: formatCurrency(product.cost) },
                ]
              },
              {
                id: 'supplier',
                title: 'Proveedor',
                icon: <Truck className="w-4 h-4" />,
                rows: [
                  { label: 'Nombre', value: product.supplier || 'N/A' },
                  { label: 'RUT', value: product.supplierRut || 'N/A', copyable: true },
                ]
              }
            ]}
            onClose={() => setShowDetail(false)}
            onEdit={() => navigate(`/products/${product.barcode}/edit`)}
            onDelete={() => {}}
          />
        </Modal>
      )}
    </>
  );
};
```

---

## Props Principales

| Prop | Tipo | Descripción |
|------|------|-------------|
| `title` | `string` | Título principal |
| `subtitle` | `string` | Subtítulo |
| `icon` | `ReactNode` | Icono del header |
| `status` | `Status` | Estado (success, warning, error, info) |
| `statusLabel` | `string` | Label del badge |
| `sections` | `Section[]` | Secciones de información |
| `tabs` | `Tab[]` | Tabs a mostrar |
| `recordId` | `string` | ID para auditoría |
| `tableName` | `string` | Tabla para auditoría |
| `actions` | `Action[]` | Acciones rápidas |
| `onEdit` | `() => void` | Callback editar |
| `onDelete` | `() => void` | Callback eliminar |
| `onClose` | `() => void` | Callback cerrar |
| `syncStatus` | `SyncStatus` | Estado de sincronización |

---

## Sección InfoRow

```tsx
interface InfoRow {
  label: string;      // Label de la fila
  value: ReactNode;   // Valor (puede ser cualquier nodo)
  icon?: ReactNode;   // Icono opcional
  copyable?: boolean;  // Permite copiar al click
}
```

## Sección Completa

```tsx
interface Section {
  id: string;
  title: string;
  icon?: ReactNode;
  collapsible?: boolean;  // Puede colapsar (default: true)
  defaultOpen?: boolean;  // Estado inicial (default: true)
  rows?: InfoRow[];      // Filas de información
  content?: ReactNode;   // Contenido personalizado
}
```
