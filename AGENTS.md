# ContarStock v2 - Agente de Desarrollo......

## Estructura del Proyecto

```
src/
├── features/           # Modulos de dominio
│   ├── events/
│   ├── counting/
│   ├── sync/
│   └── ...
├── repositories/       # Acceso a datos
│   ├── base/           # IRepository, BaseRepository
│   └── ScanRepository.ts
├── services/          # Logica de negocio
├── shared/            # Componentes compartidos
└── types/             # Definiciones de tipos
```

## TypeScript Conventions

### Manejo de Errores
- Usar `handleError(err: unknown)` para procesar errores en catch blocks
- Para `logger.error()`, pasar strings: `logger.error('MODULE', String(err))`
- Usar `const errorMsg = handleError(err)` en catch blocks antes de usar `errorMsg`

### Tipos de Sync
- `SyncQueueItem` y tipos relacionados estan en `src/types/global/sync.ts`
- Re-exportados en `src/features/sync/types/index.ts`
- No duplicar definiciones de tipos de sync

### Servicios Sync
- `pushBatch<T extends object>()` - usa generics, no `any[]`
- `sanitizeData(data: SupabaseRow): SupabaseRow` - tipos estrictos
- `formatError(e: unknown): string` - metodo existente para formatear errores

### UI Components
- `SyncStatusBadge` usa `Record<string, string>` para acceso dinamico
- `InputProps` debe usar `Omit<InputHTMLAttributes, 'size'>` para evitar conflictos

## Repository Pattern

### Estructura
```
src/repositories/
├── base/
│   ├── IRepository.ts         # Interfaces
│   ├── BaseRepository.ts      # Implementacion Dexie
│   ├── SyncableRepository.ts  # Para entidades con sync
│   └── index.ts
├── ScanRepository.ts          # Repositorio de ejemplo
└── index.ts
```

### Uso
```typescript
// Antiguo (mantener compatibilidad)
import { ScanRepository } from '@/repositories';
await ScanRepository.getAll();

// Nuevo codigo
import { scanRepository } from '@/repositories';
await scanRepository.getAll();
```

## Scripts Disponibles

```bash
npm run dev          # Vite dev server
npm run build        # Production build
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run format       # prettier --write .
npm run test:run     # vitest (single run)
npm run test         # vitest (watch mode)
```

---

# 🎨 Patrones UI AppSheet - Guía de Implementación

Este documento contiene todos los patrones de UI/UX implementados para replicar la experiencia visual de AppSheet en los módulos de ContarStock.

## Tabla de Contenidos
1. [Componente DualView](#componente-dualview) ⭐
2. [Tokens CSS - AppSheet Theme](#tokens-css---appsheet-theme)
3. [State Layers (MD3)](#state-layers-md3)
4. [Vista Dual (Master-Detail)](#vista-dual-master-detail)
5. [Splitter Redimensionable](#splitter-redimensionable)
6. [SearchBar Estilo AppSheet](#searchbar-estilo-appsheet)
7. [Filter Chips](#filter-chips)
8. [List Items](#list-items)
9. [Detail Panel](#detail-panel)
10. [Action Menu (3 puntos)](#action-menu-3-puntos)
11. [FAB (Floating Action Button)](#fab-floating-action-button)
12. [Tipografías](#tipografías)
13. [Refactoring Expiry v2](#refactoring-módulo-expiry-v2-2026-06-21)
14. [Refactoring Events v2](#refactoring-módulo-events-v2-2026-06-22) 🆕

---

## Componente DualView ⭐

### Ubicación
`src/shared/components/layout/DualView.tsx`

### Concepto
Componente robusto y reutilizable que encapsula toda la funcionalidad de la vista dual (master-detail) con splitter redimensionable. Implementación basada en el patrón de VS Code, Figma y AppSheet.

### ⚠️ Importante: Sin Animaciones
```
Este componente NO usa animaciones de slide.
Los paneles SIEMPRE están pegados a sus bordes.
El splitter redimensiona en tiempo real sin efectos visuales.
```

### Patrón de Layout
```
┌─────────────────┬─────────────────┐
│                 │                 │
│     LISTA       │    DETALLE     │
│                 │                 │
│   (izquierda)   │   (derecha)    │
│                 │                 │
│    width:px     │    flex: 1     │
│    flexShrink:0 │    minWidth:0  │
└────────┬────────┴─────────────────┘
         │
         ▼
┌─────────────────┐
│    SPLITTER      │ ← 1px draggable
│   (draggable)   │
└─────────────────┘
```

### Sub-componentes incluidos
- **DualView**: Contenedor principal con splitter
- **DetailPanel**: Panel de detalle estilizado
- **Section**: Sección con título e icono
- **Row**: Fila de datos

### API Completa
```tsx
import { DualView, DetailPanel, Section, Row } from '@/shared/components/layout';

// Uso básico
<DualView
  selectedItem={selectedEvent}
  onSelectItem={setSelectedEvent}
  minLeftWidth={200}      // Ancho mínimo en pixels
  maxLeftWidth={800}      // Ancho máximo en pixels
  listPanel={
    events.map(event => (
      <ListItem
        key={event.id}
        onClick={() => setSelectedEvent(event)}
        isSelected={selectedEvent?.id === event.id}
        // ...props
      />
    ))
  }
  detailPanel={
    <DetailPanel
      title={selectedEvent.name}
      subtitle={selectedEvent.barcode}
      onClose={() => setSelectedEvent(null)}
      actions={[
        { label: 'Editar', onClick: handleEdit, variant: 'primary' },
        { label: 'Eliminar', onClick: handleDelete, variant: 'danger' }
      ]}
    >
      <Section title="Producto" icon={<Package />}>
        <Row label="Nombre" value={selectedEvent.name} />
        <Row label="Barcode" value={selectedEvent.barcode} />
      </Section>
    </DetailPanel>
  }
/>
```

### Props de DualView
| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `listPanel` | ReactNode | - | Panel izquierdo (lista) |
| `detailPanel` | ReactNode | - | Panel derecho (detalle) |
| `selectedItem` | any | null | Item seleccionado |
| `onSelectItem` | function | - | Callback al seleccionar |
| `minLeftWidth` | number | 200 | Ancho mínimo (px) |
| `maxLeftWidth` | number | 800 | Ancho máximo (px) |
| `enableSplitter` | boolean | true | Habilitar drag |
| `className` | string | - | Clases CSS adicionales |

### Props de DetailPanel
| Prop | Tipo | Descripción |
|------|------|-------------|
| `title` | string | Título del panel |
| `subtitle` | string? | Subtítulo |
| `icon` | ReactNode? | Ícono del título |
| `status` | {label, variant}? | Badge de estado |
| `onClose` | function | Callback cerrar |
| `actions` | Action[]? | Botones de acción |
| `children` | ReactNode | Contenido |

### Props de Section
| Prop | Tipo | Descripción |
|------|------|-------------|
| `title` | string? | Título de sección |
| `icon` | ReactNode? | Ícono del título |
| `children` | ReactNode | Contenido (Rows) |

### Props de Row
| Prop | Tipo | Descripción |
|------|------|-------------|
| `label` | string | Label superior |
| `value` | string \| ReactNode | Valor |
| `className` | string? | Clases adicionales |

### Ejemplo Completo
```tsx
import { DualView, DetailPanel, Section, Row } from '@/shared/components/layout';
import { Package, FileText, MapPin, Clock } from 'lucide-react';

function MyModule() {
  const [selectedItem, setSelectedItem] = useState(null);

  return (
    <DualView
      selectedItem={selectedItem}
      onSelectItem={setSelectedItem}
      minLeftWidth={200}
      maxLeftWidth={800}
      listPanel={
        <div className="h-full overflow-y-auto bg-[var(--appsheet-bg-base)]">
          {items.map(item => (
            <ListItem
              key={item.id}
              title={item.name}
              onClick={() => setSelectedItem(item)}
              isSelected={selectedItem?.id === item.id}
            />
          ))}
        </div>
      }
      detailPanel={
        selectedItem && (
          <DetailPanel
            title={selectedItem.name}
            subtitle={selectedItem.code}
            status={{ label: selectedItem.status, variant: 'success' }}
            onClose={() => setSelectedItem(null)}
            actions={[
              { label: 'Editar', onClick: () => edit(selectedItem), variant: 'primary' },
              { label: 'Eliminar', onClick: () => remove(selectedItem.id), variant: 'danger' }
            ]}
          >
            <Section title="Información" icon={<Package />}>
              <Row label="Nombre" value={selectedItem.name} />
              <Row label="Código" value={selectedItem.code} />
            </Section>
            
            <Section title="Documento" icon={<FileText />}>
              <Row label="FRC" value={selectedItem.frc} />
            </Section>
            
            <Section title="Ubicación" icon={<MapPin />}>
              <Row label="Destino" value={selectedItem.destino} />
            </Section>
            
            <Section title="Tiempo" icon={<Clock />}>
              <Row label="Creado" value={formatDate(selectedItem.createdAt)} />
            </Section>
          </DetailPanel>
        )
      }
    />
  );
}
```

### Detalles Técnicos Importantes

#### Layout CSS
```tsx
// Panel izquierdo - SIEMPRE pegado a la izquierda
<div style={{ 
  width: hasDetail ? leftWidth : '100%',
  flexShrink: 0,
  minWidth: hasDetail ? leftWidth : undefined,
  maxWidth: hasDetail ? leftWidth : '100%'
}}>

// Panel derecho - SIEMPRE pegado a la derecha
<div style={{
  flex: 1,
  minWidth: 0
}}>
```

#### Splitter
- **1px de ancho** (w-1)
- **Indicador visual** solo visible en hover/drag
- **Resize en pixels** (no porcentaje)
- **Sin animaciones** de entrada/salida

### Checklist de Implementación

Al replicar en un nuevo módulo:

- [ ] Importar `{ DualView, DetailPanel, Section, Row }` de `@/shared/components/layout`
- [ ] Crear estado `const [selectedItem, setSelectedItem] = useState(null)`
- [ ] Renderizar lista con `onClick={() => setSelectedItem(item)}`
- [ ] Renderizar `DualView` con `listPanel` y `detailPanel`
- [ ] Usar `DetailPanel` para el panel de detalle
- [ ] Usar `Section` con `icon` para grupos de datos
- [ ] Usar `Row` para cada fila de datos
- [ ] Ocultar FAB cuando hay item seleccionado

---

## Tokens CSS - AppSheet Theme

### Ubicación
`src/styles/appsheet-theme.css`

### Backgrounds - Sistema de elevación MD3
```css
--appsheet-bg-base: #121212;        /* Surface container lowest */
--appsheet-bg-elevated: #1e1e1e;    /* Surface container low */
--appsheet-bg-surface: #252525;     /* Surface container */
--appsheet-bg-card: #2d2d2d;        /* Surface container high */
--appsheet-bg-hover: rgba(255, 255, 255, 0.06);
--appsheet-bg-active: rgba(255, 255, 255, 0.10);
```

### Primary - Azul AppSheet
```css
--appsheet-primary: #8AB4F8;        /* Google Blue accent */
--appsheet-primary-hover: #AECBFA;
--appsheet-primary-pressed: #669DF6;
--appsheet-on-primary: #000000;
--appsheet-primary-subtle: rgba(138, 180, 248, 0.12);
```

### Search Bar
```css
--appsheet-bg-search: #353535;      /* Fondo más claro para input */
```

### State Layer Opacities (MD3)
```css
--md3-state-hover: rgba(255, 255, 255, 0.08);    /* 8% */
--md3-state-focus: rgba(255, 255, 255, 0.10);     /* 10% */
--md3-state-pressed: rgba(255, 255, 255, 0.10);  /* 10% */
--md3-state-dragged: rgba(255, 255, 255, 0.16);   /* 16% */
--md3-state-disabled: rgba(255, 255, 255, 0.38);  /* 38% */
```

### Clases CSS Utilitarias
```css
.md3-hover   /* Hover 8% */
.md3-pressed  /* Pressed 10% */
.md3-focus    /* Focus 10% */
.md3-drag     /* Dragged 16% */
.md3-disabled /* Disabled 38% */
```

---

## State Layers (MD3)

### Concepto
State layers son overlays semitransparentes que indican el estado de interacción de un elemento. Usan opacidades fijas según Material Design 3.

### Especificación MD3
| Estado | Opacidad | Uso |
|--------|----------|-----|
| Hover | 8% | Cursor sobre elemento |
| Focus | 10% | Navegación por teclado |
| Pressed | 10% | Click/tap |
| Dragged | 16% | Arrastrar |
| Disabled | 38% | Elementos inoperables |

### Implementación CSS
```css
.list-item {
  background-color: var(--appsheet-bg-surface);
  transition: background-color 150ms ease;
}

.list-item:hover {
  background-color: var(--appsheet-bg-elevated);
}

.list-item:active {
  background-color: var(--appsheet-bg-card);
}
```

### En React con Clases
```tsx
<div className="list-item md3-hover">
  {/* contenido */}
</div>
```

---

## Vista Dual (Master-Detail)

### Concepto
La vista divide el espacio en dos paneles:
1. **Lista** (izquierda) - Mantiene la lista completa de items
2. **Panel Detalle** (derecha) - Muestra detalles del item seleccionado

### Implementación Recomendada
**Usar el componente `DualView`** (ver sección anterior) en lugar de implementar la lógica manualmente.

### Flujo de Usuario
```
1. Ver lista completa (100%)
   ↓ Click en item
2. Panel detalle aparece
   Lista ocupa ~50%, Detalle el resto
   ↓ Click Editar
3. Modal supersede el panel de detalle
   ↓ Cerrar modal
4. Panel detalle sigue visible (actualizado)
   ↓ Click X en panel
5. Panel detalle se cierra, lista vuelve al 100%
```

### Patrón CSS Clave
```css
/* Contenedor principal */
.dual-view {
  display: flex;
  height: 100%;
  overflow: hidden;
}

/* Panel izquierdo */
.dual-view-list {
  flex-shrink: 0; /* NO se encoge */
  overflow: hidden;
}

/* Splitter */
.dual-view-splitter {
  width: 1px;
  cursor: col-resize;
  flex-shrink: 0;
}

/* Panel derecho */
.dual-view-detail {
  flex: 1; /* Crece para ocupar el resto */
  min-width: 0;
  overflow: hidden;
}
```

---

## SearchBar Estilo AppSheet

### Diseño
- Centrado (max-w-md mx-auto)
- Padding lateral px-6
- Fondo: `var(--appsheet-bg-search)` (#353535)
- Forma: rounded-full (pill)
- Sin borde visible

### Implementación
```tsx
const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, placeholder }) => (
  <div className="px-6 pb-3">
    <div className="relative max-w-md mx-auto">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--appsheet-text-secondary)]" />
      
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 pl-11 pr-10 rounded-full 
                   bg-[var(--appsheet-bg-search)] 
                   text-base 
                   text-[var(--appsheet-text-primary)]
                   placeholder:text-[var(--appsheet-text-secondary)]
                   border-none
                   focus:outline-none
                   focus:bg-[var(--appsheet-bg-elevated)]
                   transition-all"
      />
      
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-[var(--appsheet-bg-elevated)]"
        >
          <X className="w-4 h-4 text-[var(--appsheet-text-secondary)]" />
        </button>
      )}
    </div>
  </div>
);
```

### Tokens
```css
--appsheet-bg-search: #353535;
```

---

## Filter Chips

### Diseño
- Pills horizontales con scroll
- Estado activo: fondo primary con texto negro
- Estado inactivo: fondo elevated con texto secondary
- Hover: fondo hover sutil

### Implementación
```tsx
const FilterChips: React.FC<FilterChipsProps> = ({ filters, selected, onChange }) => (
  <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
    {filters.map(filter => {
      const isActive = /* condición */;
      return (
        <button
          key={filter.label}
          onClick={() => onChange(filter.key)}
          className={cn(
            'h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-all',
            isActive
              ? 'bg-[var(--appsheet-primary)] text-black'
              : 'bg-[var(--appsheet-bg-elevated)] text-[var(--appsheet-text-secondary)] hover:bg-[var(--appsheet-bg-hover)]'
          )}
        >
          {filter.label}
        </button>
      );
    })}
  </div>
);
```

### Estados
```
[ Todos ] [ Pendientes ] [ Destinados ] [ Ajustados ]
  ↑Activo      ↑Inactivo       ↑Inactivo      ↑Inactivo
```

---

## List Items

### Diseño
- Altura mínima: 76px
- Dot de estado (2.5px)
- Título con texto base
- Subtítulo con texto secondary
- Metadatos opcionales
- Border bottom sutil

### Implementación
```tsx
interface ListItemProps {
  title: string;
  subtitle?: string;
  status?: { label: string; variant: 'success' | 'warning' | 'error' | 'info' };
  meta?: Array<{ label: string; value: string }>;
  onClick?: () => void;
  isSelected?: boolean;
  actions?: ActionMenuProps['actions'];
}

const ListItem: React.FC<ListItemProps> = ({ title, subtitle, status, meta, onClick, isSelected, actions }) => (
  <div 
    onClick={onClick}
    className={cn(
      'list-item border-b border-[var(--appsheet-border-subtle)] cursor-pointer transition-colors duration-150',
      isSelected 
        ? 'bg-[var(--appsheet-primary-subtle)] border-l-4 border-l-[var(--appsheet-primary)]' 
        : 'bg-[var(--appsheet-bg-surface)] hover:bg-[var(--appsheet-bg-elevated)]'
    )}
  >
    <div className="flex items-center min-h-[76px] px-4 py-3">
      {/* Status dot */}
      <div className={cn('w-2.5 h-2.5 rounded-full shrink-0 mr-3', 
        status?.variant === 'success' ? 'bg-[var(--appsheet-success)]' :
        status?.variant === 'warning' ? 'bg-[var(--appsheet-warning)]' :
        status?.variant === 'error' ? 'bg-[var(--appsheet-error)]' :
        status?.variant === 'info' ? 'bg-[var(--appsheet-info)]' :
        'bg-[var(--appsheet-text-disabled)]'
      )} />
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-base font-medium truncate', 
            isSelected && 'text-[var(--appsheet-primary)]'
          )}>{title}</p>
          {status && (
            <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-full',
              status.variant === 'success' ? 'bg-[var(--appsheet-success-subtle)] text-[var(--appsheet-success)]' :
              // ...otros status
            )}>
              {status.label}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-[var(--appsheet-text-tertiary)] truncate">{subtitle}</p>
        )}
        {meta && meta.length > 0 && (
          <div className="flex gap-4 mt-1.5">
            {meta.slice(0, 3).map((m, i) => (
              <span key={i} className="text-sm text-[var(--appsheet-text-disabled)]">
                <span className="uppercase font-medium">{m.label}:</span> {m.value}
              </span>
            ))}
          </div>
        )}
      </div>

      {actions && <ActionMenu actions={actions} />}
    </div>
  </div>
);
```

### Item Seleccionado
```
┌─────────────────────────────────────────────────────────┐
│ ▌● Producto Ejemplo                              [⋮]  │
│ ▌  7701234567890                                      │
│ ▌  FRC: 12345  Destino: BOD.37                       │
└─────────────────────────────────────────────────────────┘
 ↑
 Borde azul izq (4px) + Fondo primary-subtle
```

---

## Detail Panel

### Diseño
- Slide-in desde la derecha (spring animation)
- Sin backdrop (panel transparente)
- Header con título y status
- Secciones con iconos
- Footer con acciones

### Implementación
```tsx
const DetailViewPanel: React.FC<DetailViewPanelProps> = ({ 
  title, subtitle, icon, status, sections, onClose, actions 
}) => (
  <motion.div
    initial={{ x: '100%' }}
    animate={{ x: 0 }}
    exit={{ x: '100%' }}
    transition={{ type: 'spring', damping: 30, stiffness: 350, mass: 0.8 }}
    className="h-full w-full max-w-md bg-[var(--appsheet-bg-surface)] border-l border-[var(--appsheet-border-subtle)] flex flex-col"
  >
    {/* Header */}
    <div className="flex items-center h-14 px-4 gap-3 border-b">
      <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--appsheet-bg-hover)]">
        <X className="w-5 h-5" />
      </button>
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {subtitle && (
          <p className="text-sm text-[var(--appsheet-text-tertiary)] truncate">{subtitle}</p>
        )}
      </div>
      {status && (
        <span className={cn('px-3 py-1 text-xs font-semibold rounded-full border', 
          // status variant classes
        )}>
          {status.label}
        </span>
      )}
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto">
      {sections.map((section, i) => (
        <div key={i} className="border-b border-[var(--appsheet-border-subtle)]">
          {section.title && (
            <div className="flex items-center gap-2 px-4 py-3 bg-[var(--appsheet-bg-elevated)]">
              {section.icon && <span className="text-[var(--appsheet-primary)]">{section.icon}</span>}
              <span className="text-sm font-semibold uppercase tracking-wider text-[var(--appsheet-text-secondary)]">
                {section.title}
              </span>
            </div>
          )}
          {section.rows.map((row, j) => (
            <div key={j} className="detail-row flex items-center gap-3 px-4 py-4 transition-colors duration-150">
              <div className="flex-1">
                <p className="text-sm text-[var(--appsheet-text-tertiary)] uppercase tracking-wider">{row.label}</p>
                <p className="text-base font-medium mt-0.5">{row.value}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>

    {/* Actions */}
    {actions && actions.length > 0 && (
      <div className="p-4 border-t border-[var(--appsheet-border-subtle)] flex gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={cn(
              'flex-1 h-12 rounded-xl text-base font-semibold transition-all',
              action.variant === 'primary'
                ? 'bg-[var(--appsheet-primary)] text-black hover:brightness-110'
                : action.variant === 'danger'
                ? 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)] hover:bg-[var(--appsheet-error)] hover:text-white'
                : 'bg-[var(--appsheet-bg-elevated)] hover:bg-[var(--appsheet-bg-hover)]'
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
    )}
  </motion.div>
);
```

### Animación
```tsx
transition={{
  type: 'spring',
  damping: 30,      // Amortiguamiento suave
  stiffness: 350,    // Rigidez moderada
  mass: 0.8         // Masa ligera para respuesta rápida
}}
```

---

## Action Menu (3 puntos)

### Diseño
- Botón con icono MoreVertical
- Menú desplegable animado
- Items con icono y label
- Opción danger para acciones destructivas

### Implementación
```tsx
const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          buttonRef && !buttonRef.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [buttonRef]);

  return (
    <div className="relative">
      <button
        ref={setButtonRef}
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-[var(--appsheet-bg-hover)]"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 top-full mt-1 min-w-[180px] bg-[var(--appsheet-bg-card)] rounded-xl shadow-lg border border-[var(--appsheet-border-subtle)] overflow-hidden z-50"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none" />
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => { action.onClick(); setOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-base transition-colors relative',
                  action.danger
                    ? 'text-[var(--appsheet-error)] hover:bg-[var(--appsheet-error-subtle)]'
                    : 'text-[var(--appsheet-text-primary)] hover:bg-[var(--appsheet-bg-hover)]'
                )}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
```

---

## FAB (Floating Action Button)

### Diseño
- Posición: bottom-right
- Color: primary
- Icono: Plus
- Sombra con glow sutil
- Solo visible cuando no hay detalle abierto

### Implementación
```tsx
const FAB: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <motion.button
    onClick={onClick}
    initial={{ scale: 0, rotate: -180 }}
    animate={{ scale: 1, rotate: 0 }}
    whileTap={{ scale: 0.9 }}
    className="fixed bottom-6 right-6 w-14 h-14 rounded-full 
               bg-[var(--appsheet-primary)] text-black
               flex items-center justify-center
               shadow-lg hover:shadow-xl hover:brightness-110
               transition-all z-40"
    style={{ boxShadow: '0 4px 12px rgba(138, 180, 248, 0.4)' }}
  >
    <Plus className="w-6 h-6" />
  </motion.button>
);
```

---

## Tipografías

### Escala Recomendada
| Elemento | Tamaño | Peso | Uso |
|-----------|--------|------|-----|
| AppBar título | text-lg | font-semibold | Títulos principales |
| AppBar subtítulo | text-sm | normal | Metadatos secundarios |
| Search input | text-base | normal | Inputs de texto |
| Filter chips | text-sm | font-medium | Pills de filtro |
| List título | text-base | font-medium | Títulos de item |
| List subtítulo | text-sm | normal | Subtítulos de item |
| List meta | text-sm | normal | Metadatos |
| Detail label | text-sm | normal | Labels de detalle |
| Detail value | text-base | font-medium | Valores de detalle |
| Menu items | text-base | normal | Items de menú |
| Botones | text-base | font-semibold | CTA principales |
| Empty state título | text-base | font-medium | Mensajes de estado vacío |
| Empty state desc | text-sm | normal | Descripciones |

### Tokens
```css
--appsheet-font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

---

## Checklist de Implementación

Al replicar en un nuevo módulo:

- [ ] Importar tokens CSS de `appsheet-theme.css`
- [ ] Implementar SearchBar con tokens correctos
- [ ] Implementar FilterChips con estados
- [ ] Implementar ListItem con isSelected y state layers
- [ ] Implementar ActionMenu
- [ ] Implementar Vista Dual con Splitter
- [ ] Implementar DetailViewPanel
- [ ] Implementar FAB (oculto con detalle abierto)
- [ ] Usar tipografías correctas según escala
- [ ] Verificar transiciones CSS suaves
- [ ] Testear redimensionamiento del splitter

---

## Commits Relacionados

| Commit | Descripción |
|--------|-------------|
| `aee2e3e9` | feat: Splitter redimensionable para vista dual |
| `57a5eeae` | Merge branch con vista dual |
| `1901755a` | feat: Vista dual (Master-Detail) estilo AppSheet |
| `0f909e6f` | feat: Aumentar tipografías y aclarar fondo search bar |
| `f04e8117` | fix: Transiciones CSS nativas para state layers |
| `36096117` | feat: State Layers MD3 en lista y detalle |
| `c597f24c` | feat: SearchBar estilo AppSheet (centrado y discreto) |
| `205c4c5e` | feat: Animaciones Material Design 3 |

---

## Refactoring Progress (2024-06-18)

### Completado:
- FASE 0: Setup DX (Husky, ESLint, Prettier, Scripts)
- FASE 1: Repository Pattern Base (IRepository, BaseRepository, SyncableRepository)

### En Progreso:
- FASE 2: Repository Pattern por Dominios

### Pendiente:
- FASE 3: FSM para Sync
- FASE 4: Commands para Sync
- FASE 5: Domain Stores
- FASE 6: Design Tokens
- FASE 7: Type Ownership
- FASE 8: Testing

### Metricas:
- syncManager.ts: 495 lineas (meta: ~150)
- Repository coverage: 50% (meta: 80%)
- Errores TypeScript: 0

---

## Refactoring Tema 3 Colores (2026-06-17)

### Paletas de Colores
| Tema | Background | Primary | Text | Accents |
|------|------------|---------|------|---------|
| dark | slate-950 | blue-500 | gray-100 | blue-400 |
| light | white | blue-600 | slate-900 | slate-500 |
| high-contrast | black | yellow-400 | yellow-400 | yellow-500 |

### Componentes Actualizados (✅)
- **Slices**: SlicesPage, SlicesSidebar, SliceFilters, SlicePreview, CreateSliceModal
- **Reports**: ReportMetrics, ReportFilters, LiveConsolidationGrid, SessionHistoryList, SessionRow, SessionRowSkeleton
- **Settings**: CloudSection, OperationalSection, PreferencesSection, NavigationSection, ModulesSection, ThemeSection, SettingsElements, SupportSection, PrinterSection, DiagnosticsCard, MaintenanceCard, KernelSystemCard, BackupCard, SystemLogsModal, SupabaseAuditorModal, SyncLogsModal
- **Events**: EventItemRow, EventCaptureModal
- **Compliance**: ComplianceDashboardPage + RiskItemRow

### Commits Realizados
- `48d95b91` - fix: Soporte high-contrast en SessionHistory y SessionRow
- `04f0291c` - fix: Soporte theme en componentes Reports y Settings
- `4d6f5f0b` - fix: Soporte theme en Settings components
- `fb0fb63f` - fix: Soporte theme en Settings support cards y modals
- `7cf727f2` - fix: Soporte theme en Events y Compliance

---

## PRODUCTO_PROVEEDOR - Relación Many-to-Many (2026-06-19)

### Estructura de la Tabla
```
┌─────────────────┐     ┌────────────────────────┐     ┌─────────────────┐
│  PRODUCTOS       │     │   PRODUCTO_PROVEEDOR    │     │  PROVEEDORES    │
├─────────────────┤     ├────────────────────────┤     ├─────────────────┤
│ barcode (PK)    │◄────│ product_barcode (FK)   │────►│ rut (PK)        │
│ supplierRut     │     │ provider_rut (FK)       │     │ exchangePolicy   │
└─────────────────┘     │ is_primary (boolean)    │     │ withdrawalDays   │
                         │ has_exchange (nullable) │     │ hasExchange     │
                         │ withdrawal_days (nullable)│    └─────────────────┘
                         └────────────────────────┘
```

### Archivos de Migración
| Archivo | Descripción |
|---------|-------------|
| `docs/migrations/001_create_producto_proveedor.sql` | Schema + vistas |
| `docs/migrations/import_producto_proveedor.py` | Script reutilizable |
| `docs/migrations/migrate_BCM_2026-06-19.sql` | 3,263 registros listos |

### Código Frontend
- `src/repositories/ProductProviderRepository.ts` - Repository con sync
- `src/db.ts` - Interfaz ProductProvider + tabla productProviders
- `src/db/migrations/DbMigrator.ts` - Migración v48
- `src/services/cloud/syncRegistry.ts` - Sync bidireccional

### Estadísticas
- Total filas Excel: 3,263
- Proveedores únicos: 193
- Productos únicos: 3,204

### Commits
- `b3dcdd40` - feat: Scripts de migración para PRODUCTO_PROVEEDOR
- `d3389c9b` - feat: Agregar tabla PRODUCTO_PROVEEDOR al código frontend

---

## Refactoring Progreso (2026-06-20)

### Completado:
- FASE 0: Setup DX ✅
- FASE 1: Repository Pattern Base ✅
- FASE 2: Repository Pattern por Dominios ✅
- **FASE 3: FSM para Sync** ✅ (nueva implementación integrada)
- **FASE 8: Testing** ✅ (142 tests pasando)

### Dead Code Eliminado:
- Commands (SyncOrchestrator, CatalogSyncCommand, etc.) - 622 líneas
- FSM legacy (no integrada) - 464 líneas
- Test huérfano - 186 líneas
- Store duplicado - 64 líneas
- **Total: ~1,583 líneas**

### Nueva FSM Integrada:
- `src/services/sync/fsm/` (nuevo)
  - `SyncFSM.ts` - Clase FSM con transiciones
  - `types.ts` - SyncState, SyncEvent, SyncContext
  - `useSyncFSM.ts` - Hook de React
  - `SyncFSM.test.ts` - Tests unitarios (12 tests)

### Domain Stores Centralizados:
- `src/stores/index.ts` - Exports centralizados
- 71 archivos actualizados para usar `@/stores`
- Stores: useSyncStore, useToastStore, useTaskStore, useExpiryStore, useAppStore, useUIStore, useSettingsStore

### Documentación UI:
- `src/shared/components/ui/docs/COMPONENTS.md` - Docs de componentes

### Commits (2026-06-20):
- `d2b22d94` - Dead Code Cleanup (~1,583 líneas eliminadas)
- `28e5f922` - FSM integrada para sincronización (12 tests)
- `cdd28716` - Domain Stores centralizados + docs UI
- `378bf621` - Actualizar AGENTS.md
- `c577ad26` - Consolidar tipos Sync + tests logger

### Métricas:
- syncManager.ts: 37 líneas ✅
- Sync modules: 4 archivos modulares ✅
- Tests: 149 pasando ✅
- Coverage: 40% statements (logger: 73%)
- Bundle: ~4,476 KB

### Pendientes:
- Aumentar coverage de tests (meta: 60%)
- Tests para Repositories (ScanRepository, SessionRepository)
- Storybook para компоненты UI

---

## Productividad Dashboard - Lego Architecture (2026-06-20)

### Completado:
- **Dashboard Productividad** - Metricas en tiempo real para Counting
- **Modo Turbo** - Conteo rapido sin animaciones
- **Hammer migrado** - Usa ScannerContainer
- **EventCapture actualizado** - Con productividad

### Mejoras (2026-06-22):
- **bestPace** - Mejor ritmo de items/min registrado
- **fatigueLevel** - Indicador de energía del operador
  - `fresh` (verde) - Acelerando con >10% mejora
  - `normal` (azul) - Ritmo estable
  - `tired` (ámbar) - Desacelerando por >2 min

### Componentes Compartidos:
- `src/features/counting/hooks/useProductivity.ts`
- `src/features/counting/hooks/useTurboMode.ts`
- `src/features/counting/components/ProductivityDashboard.tsx`
- `src/features/counting/components/TurboModeOverlay.tsx`
- `src/shared/components/scanner/layouts/ScannerContainer.tsx`
- `src/shared/components/scanner/layouts/ScannerCameraSection.tsx`
- `src/shared/components/scanner/layouts/ScannerFeedbackOverlay.tsx`
- `src/shared/components/scanner/layouts/LabelPreviewModal.tsx`

### Atajos de Teclado:
- `Alt+P` - Toggle dashboard productividad
- `Alt+Shift+T` - Toggle modo turbo

### Commits:
- `009ef5a1` - feat: Mejoras en Productivity Dashboard
- `2179b67a` - refactor: Migrar Hammer a ScannerContainer
- `a8776f25` - feat: Agregar dashboard de productividad a EventCapture
- `d35cdcd4` - fix: Corregir nombres de tabla a minusculas en scripts SQL

---

## UI Sync Simplification + Migración GenericSyncEngine (2026-06-20)

### Componentes UI Unificados:

| Componente | Líneas | Reemplaza |
|------------|--------|-----------|
| **SyncQueuePanel** | 224 | SyncQueue + SyncQueueList + SyncQueueDetail |
| **SyncActivity** | 220 | Logs inline + Incidents inline |

### hooks Migrados a GenericSyncEngine:

| Hook | Antes | Después |
|------|-------|---------|
| useProductSync | cloudSync.ts | GenericSyncEngine.pushIncremental |
| useProvidersSync | cloudSync.ts | GenericSyncEngine.pushIncremental |

### Archivos Eliminados/Deprecados:
- `cloudSync.ts` - Marcado como deprecated (vacío)
- `supabaseSyncService.ts` - Wrapper deprecated (usado internamente)

### Commits UI Sync:
- `ae78a1c4` - feat: Crear SyncQueuePanel unificado
- `fd0d9205` - feat: Crear SyncActivity unificado
- `xxxxxxx` - refactor: Migrar hooks a GenericSyncEngine

### Métricas:
- SyncCenterPage: 349 → 256 líneas (-93)
- Componentes sync: más cohesivos
- Tests: 149 pasando ✅

---

## Refactoring Módulo Expiry v2 (2026-06-21)

### Arquitectura Simplificada (Similar a Events)

```
src/features/expiry/
├── ExpiryPage.tsx           # Componente principal (simplificado)
├── domain/
│   └── expiryDomain.ts       # Lógica de negocio pura (evaluación, helpers)
├── hooks/
│   └── useExpiry.ts         # Hook centralizado (estado unificado)
├── components/
│   ├── ExpiryItemCard.tsx   # Card de vencimiento
│   ├── ExpiryStatsBar.tsx   # Barra de estadísticas
│   ├── ExpiryDetailModal.tsx
│   └── ExpiryCaptureModal.tsx
├── utils/
│   ├── expiryUtils.ts       # Servicios de impresión (CRÍTICO - mantener)
│   └── expiryProcessor.ts    # Procesamiento para watcher (CRÍTICO)
└── (legacy services/)       # Mantenidos por compatibilidad
```

### Hook Centralizado: useExpiry

```typescript
const {
  filteredRecords,
  stats,
  filters,
  isLoading,
  isSyncing,
  selectedIds,
  actions
} = useExpiry();
```

### Estados de Vencimiento

| Estado | Descripción | Color |
|--------|-------------|-------|
| EXPIRED | Vencido | 🔴 Rojo |
| CRITICAL | Crítico (<días retiro) | 🟠 Naranja |
| WITHDRAWAL | Por retirar | 🟡 Amarillo |
| NEXT_EXPIRY | Próximo (<90 días) | 🟡 Amarillo claro |
| SAFE | Vigente | 🟢 Verde |

### Commits:
- `xxxxxxx` - refactor: Reescribir módulo Expiry con arquitectura simplificada v2
- `707c7f92` - test: Agregar tests para expiryDomain (27 tests)

### Pendientes:
- [x] ~~Limpiar código legacy~~ (Parcialmente - mantenido expiryUtils y expiryProcessor por servicios críticos)
- [x] ~~Agregar tests para expiryDomain~~ ✅ (27 tests)
- [ ] Integrar con scanner para captura rápida

---

## Refactoring Módulo Events v2 (2026-06-22)

### Arquitectura Simplificada (Patrón Expiry)

```
src/features/events/
├── EventsPage.tsx           # Componente principal (simplificado)
├── domain/
│   └── eventsDomain.ts      # Lógica de negocio pura (evaluación, helpers)
├── hooks/
│   ├── index.ts             # Exports centralizados
│   └── useEvents.ts        # Hook centralizado (estado unificado)
├── components/
│   ├── EventCard.tsx        # Card de evento
│   ├── EventStatsBar.tsx    # Barra de estadísticas
│   └── (CreateEventModal, etc.)
└── (legacy hooks/ components/ utils/)  # Pendiente cleanup
```

### Hook Centralizado: useEvents

```typescript
const {
  filteredEvents,
  stats,
  filters,
  isLoading,
  isSyncing,
  selectedIds,
  selectedEvent,
  actions
} = useEvents();
```

### Estados de Evento

| Estado | Descripción | Color |
|--------|-------------|-------|
| PENDING | Sin destino, sin ajustar | 🔵 Azul |
| DESTINED | Con destino asignado | 🟡 Amarillo |
| ADJUSTED | Marcado como ajustado | 🟢 Verde |

### Componentes UI

| Componente | Descripción |
|------------|-------------|
| `EventSection` | Sección colapsable con header e icono |
| `EventCard` | Card individual con estado, metadata y acciones |
| `EventStatsBar` | Barra de estadísticas con chips de filtro |
| `ModuleHeader` | Header reusable con título y acciones |

### Commits:
- `xxxxxxx` - feat: Crear eventsDomain.ts con lógica de negocio pura
- `xxxxxxx` - feat: Refactorizar useEvents con estadísticas y estados
- `xxxxxxx` - feat: Crear EventStatsBar y EventCard
- `xxxxxxx` - refactor: Reescribir EventsPage siguiendo patrón ExpiryPage

### Patrones Implementados
- Secciones colapsables con animación (motion)
- Cards con estado visual (color del borde, badge)
- Barra de estadísticas con chips de filtro
- Búsqueda con normalización de texto
- Soporte multi-tema (dark/light/high-contrast)
- Atajos de teclado (Alt+N para nuevo, / para buscar)

---

## Refactoring Módulo Inventory/Products (2026-06-22)

### Arquitectura Simplificada

```
src/features/inventory/
├── InventoryPage.tsx         # Página principal (legacy - en refactor)
├── domain/
│   ├── productsDomain.ts     # ✅ Lógica de negocio pura
│   └── productsDomain.test.ts # ✅ Tests (34 tests)
├── hooks/
│   └── useProductDatabase.ts  # Hook centralizado existente
├── components/
│   ├── ProductStatsBar.tsx   # ✅ Barra de estadísticas
│   ├── ProductCard.tsx       # ✅ Card de producto
│   ├── ProductList.tsx        # Lista legacy
│   ├── ProductForm.tsx        # Formulario legacy
│   ├── ProductDetailModal.tsx
│   ├── InventoryMetricsCards.tsx  # Legacy - métricas
│   └── InventoryKanbanView.tsx    # Legacy - vista kanban
└── (legacy hooks/)           # Mantenidos por compatibilidad
```

### Domain: productsDomain.ts

```typescript
// Estados
enum ProductPolicyStatus { EXCHANGE, LOSS, NO_INFO, ALL }
enum StockStatus { NORMAL, LOW, CRITICAL, EXCESS }

// Funciones
evaluateProductPolicy(product): ProductPolicyStatus
evaluateStockStatus(product): StockStatus
calculateProductStats(products, pendingChanges): ProductStats
productMatchesSearch(product, query): boolean
filterByPolicy(products, filter): Product[]
sortProducts(products, field, order): Product[]
```

### Commits:
- `1c532a07` - feat: Agregar domain y componentes para Products
- `707c7f92` - test: Agregar tests para expiryDomain

### Pendientes:
- [ ] Integrar ProductStatsBar y ProductCard en InventoryPage
- [ ] Refactorizar InventoryMetricsCards a usar ProductStats
- [x] ~~Agregar tests para productsDomain~~ ✅ (34 tests)
