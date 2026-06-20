# PROPUESTA: RecordDetailView - Vista Detalle Estilo AppSheet

## Inspiración: AppSheet Record Detail

AppSheet tiene una vista de detalle consistente para todos los registros:
- Header con información clave
- Secciones colapsables
- Tabs: Detalle | Historial | Acciones
- Acciones rápidas

---

## Propuesta para ContarStock v2

### 1. Componente RecordDetailView

```tsx
interface RecordDetailViewProps {
  recordId: string;
  tableName: string;
  title?: string;
  tabs?: ('detail' | 'history' | 'actions')[];
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onClose?: () => void;
  renderCustomSections?: () => React.ReactNode;
}
```

### 2. Diseño

```
┌─────────────────────────────────────────────────────────────┐
│ ← Volver                              [···] Editar | Eliminar│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  📦 PRODUCTO                                         │  │
│  │  Arroz Calderón Premium 1kg                          │  │
│  │  ──────────────────────────────────────────────────  │  │
│  │  SKU: 7801234567890         Stock: 150 unidades     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [ Detalle ]  [ Historial ]  [ Acciones ]                  │
│  ───────────────────────────────────────────────────────    │
│                                                             │
│  ┌─ Descripción ─────────────────────────────────────────┐  │
│  │ Precio: $2.990        Categoría: Granos               │  │
│  │ Proveedor: Distribuidora ABC                        │  │
│  │ Ubicación: Bodega A - Estante 3                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Stock Actual ────────────────────────────────────────┐  │
│  │ Disponible: 150    Reservado: 25    Mínimo: 50       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Metadatos ────────────────────────────────────────────┐  │
│  │ Creado: 15 Jun 2026 12:30  Por: admin               │  │
│  │ Actualizado: 17 Jun 2026 14:25  Por: admin          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3. Estructura de Secciones

Cada sección puede ser:
- **CollapsibleSection**: Secciones que se pueden expandir/colapsar
- **InfoRow**: Fila clave-valor
- **StatusBadge**: Badge de estado con color
- **ActionButton**: Botón de acción
- **RelatedList**: Lista de registros relacionados

### 4. Hook useRecordDetail

```typescript
export function useRecordDetail(tableName: string, recordId: string) {
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { getRecordHistory } = useAudit();
  
  // Cargar registro desde repositorio
  // Cargar historial de auditoría
  
  return { record, loading, history, refresh };
}
```

### 5. Beneficios

| Aspecto | Valor |
|---------|-------|
| Consistencia | Mismo patrón para todos los módulos |
| Auditoría | Integración nativa con sistema de auditoría |
| Productividad | Vista completa sin navegación |
| Mantenibilidad | Componente centralizado |

---

## Esfuerzo de Implementación

| Componente | Líneas estimadas |
|------------|------------------|
| RecordDetailView | ~200 |
| CollapsibleSection | ~50 |
| InfoRow | ~30 |
| useRecordDetail hook | ~60 |
| **Total** | **~340 líneas** |

---

## Siguiente Paso

¿Te interesa que implemente esta vista detalle? Puedo empezar con un módulo específico (ej: Products, Events) y luego generalizar.
