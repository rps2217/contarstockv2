# UI Components Library

Biblioteca de componentes atómicos para ContarStock v2.

## Componentes

### Badge

**Props:**
```typescript
interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';
  size?: 'sm' | 'md';
  children: React.ReactNode;
}
```

**Uso:**
```tsx
<Badge variant="success">Sincronizado</Badge>
<Badge variant="warning" size="sm">Pendiente</Badge>
```

### Button

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}
```

**Uso:**
```tsx
<Button variant="primary" onClick={handleClick}>
  Guardar
</Button>
<Button variant="danger" size="sm" loading={isLoading}>
  Eliminar
</Button>
```

### Card

**Uso:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    Contenido
  </CardContent>
</Card>
```

### Spinner

**Props:**
```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}
```

**Uso:**
```tsx
<Spinner size="md" />
<Spinner color="text-blue-500" />
```

### Input

**Props:**
```typescript
interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
}
```

### VirtualList

**Props:**
```typescript
interface VirtualListProps<T> {
  items: T[];
  getItemKey: (item: T) => string | number;
  renderItem: (item: T, index: number) => React.ReactNode;
  estimatedItemSize?: number;
  height?: number | string;
  className?: string;
}
```

**Uso:**
```tsx
<VirtualList
  items={items}
  getItemKey={(item) => item.id}
  renderItem={(item) => <div>{item.name}</div>}
  height={400}
/>
```

## Tokens de Diseño

Ver `src/shared/constants/theme.ts` para:
- `COLORS` - Colores brand, semantic, neutral
- `SPACING` - Sistema de espaciado (xs a 2xl)
- `TYPOGRAPHY` - Tamaños y pesos de fuente
- `BORDERS` - Radios de bordes
