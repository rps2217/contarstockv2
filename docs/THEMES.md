# Sistema de Temas

Este documento describe el sistema de temas implementado en ContarStock v2.

## Visión General

El sistema de temas permite:
- Cambio dinámico de tema sin recarga de página
- Temas predefinidos (Oscuro, Claro, Noche, Gris, Alto Contraste)
- Presets de color (Default, Corporate, Ocean, Forest, Sunset)
- Temas personalizados guardados en localStorage
- Persistencia en la store de settings

## Estructura de Archivos

```
src/hooks/useTheme/
├── useTheme.tsx      # Hook principal y ThemeProvider
└── ThemeService.ts   # Utilidades y constantes del tema
```

## Uso Básico

```tsx
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { theme, setTheme, isDark, toggleTheme } = useTheme();
  
  return (
    <div>
      <p>Tema actual: {theme}</p>
      <button onClick={toggleTheme}>Alternar tema</button>
      <button onClick={() => setTheme('light')}>Modo claro</button>
    </div>
  );
}
```

## Hook `useTheme`

### API

```typescript
interface UseThemeReturn {
  // Tema actual
  theme: ThemeName;
  preset: ThemePreset;
  
  // Temas personalizados
  customThemes: CustomTheme[];
  currentCustomTheme: CustomTheme | null;
  
  // Setters
  setTheme: (theme: ThemeName) => void;
  setPreset: (preset: ThemePreset) => void;
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
  applyCustomTheme: (theme: CustomTheme) => void;
  
  // Helpers
  isDark: boolean;
  isGray: boolean;
  isNight: boolean;
  toggleTheme: () => void;
  cycleTheme: () => void;
}
```

### Temas Disponibles

| Tema | Descripción | Es Oscuro |
|------|-------------|-----------|
| `dark` | Tema oscuro default | ✅ |
| `light` | Tema claro | ❌ |
| `night` | Tema noche profunda | ✅ |
| `gray` | Tema gris neutro | ✅ |
| `high-contrast` | Alto contraste | ✅ |
| `appsheet-dark` | Estilo AppSheet | ✅ |

### Ejemplo de Uso

```tsx
import { useTheme } from '@/hooks/useTheme';

function ThemeSwitcher() {
  const { theme, setTheme, cycleTheme, isDark } = useTheme();
  
  return (
    <div className="flex gap-2">
      <button onClick={() => setTheme('dark')}>🌙 Oscuro</button>
      <button onClick={() => setTheme('light')}>☀️ Claro</button>
      <button onClick={cycleTheme}>🔄 Siguiente</button>
      
      {isDark && <span>Modo oscuro activo</span>}
    </div>
  );
}
```

## Presets de Color

Los presets definen la paleta de colores para los componentes:

```typescript
const PRESETS = {
  default: {
    primary: '#3b82f6',
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
    // ...
  },
  corporate: {
    primary: '#2563eb',
    // ... colores corporativos
  },
  ocean: {
    primary: '#0ea5e9',
    // ... colores oceánicos
  },
  forest: {
    primary: '#22c55e',
    // ... colores de bosque
  },
  sunset: {
    primary: '#f97316',
    // ... colores atardecer
  },
};
```

## Variables CSS

El tema se aplica usando variables CSS en `:root`:

```css
:root {
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-background: #0A0A0B;
  --color-surface: #18181B;
  --color-text: #FAFAFA;
  --color-border: #27272a;
}
```

### Variables Disponibles

| Variable | Descripción |
|----------|-------------|
| `--color-primary` | Color primario |
| `--color-primary-hover` | Color hover del primario |
| `--color-success` | Color de éxito |
| `--color-warning` | Color de advertencia |
| `--color-error` | Color de error |
| `--color-info` | Color informativo |
| `--color-background` | Color de fondo |
| `--color-surface` | Color de superficie (cards) |
| `--color-text` | Color de texto principal |
| `--color-text-secondary` | Color de texto secundario |
| `--color-border` | Color de bordes |

## ThemeProvider

Para usar el hook `useTheme`, envolver tu app con `ThemeProvider`:

```tsx
// En App.tsx
import { ThemeProvider } from '@/hooks/useTheme';

function App() {
  return (
    <ThemeProvider>
      <YourAppContent />
    </ThemeProvider>
  );
}
```

## Tema en Componentes

### Usando Clases de Tema

```tsx
<div className="bg-surface text-primary border-border">
  <Card className="bg-elevated">
    <h1 className="text-primary">Título</h1>
    <p className="text-secondary">Contenido secundario</p>
  </Card>
</div>
```

### Usando Variables CSS

```tsx
<div style={{ 
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-text)',
  borderColor: 'var(--color-border)'
}}>
  {/* Contenido */}
</div>
```

### Usando el Hook en Componentes

```tsx
import { isDarkTheme } from '@/hooks/useTheme';
import { useAppStore } from '@/stores';

function MyComponent() {
  const theme = useAppStore(state => state.settings.theme);
  const isDark = isDarkTheme(theme);
  
  return (
    <div className={isDark ? 'dark-class' : 'light-class'}>
      {/* Contenido */}
    </div>
  );
}
```

## Persistencia

El tema se guarda en:
1. **localStorage**: `contarstock-theme`
2. **Settings Store**: Sincronizado con Supabase

```typescript
// Al cambiar tema
setTheme('light');
// → Se guarda en localStorage automáticamente
// → Se sincroniza con la store
```

## ThemeService

`ThemeService.ts` proporciona utilidades adicionales:

```typescript
import ThemeService from '@/hooks/useTheme/ThemeService';

// Inyectar tema manualmente
ThemeService.injectThemeCSS(colors);

// Guardar/cargar de storage
ThemeService.saveThemeToStorage('dark');
const saved = ThemeService.loadThemeFromStorage();

// Verificar tipo de tema
ThemeService.isDarkTheme('dark'); // true
ThemeService.isLightTheme('light'); // true
```

## Mejores Prácticas

### 1. Usa las variables CSS cuando sea posible

```tsx
// ✅ Bueno
<div className="bg-surface text-primary">

// ❌ Evita
<div style={{ backgroundColor: '#18181B' }}>
```

### 2. No hardcodear colores

```tsx
// ✅ Bueno
<p className="text-secondary">

// ❌ Evita
<p style={{ color: '#a1a1aa' }}>
```

### 3. Para colores dinámicos, usa el hook

```tsx
function DynamicText({ children }) {
  const { isDark } = useTheme();
  return (
    <p style={{ color: isDark ? '#fff' : '#000' }}>
      {children}
    </p>
  );
}
```

## Animaciones de Tema

Para transiciones suaves entre temas:

```css
/* En tu CSS global */
* {
  transition: background-color 0.2s ease, 
              color 0.2s ease,
              border-color 0.2s ease;
}
```

## Recursos

- [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [React Context for Theming](https://react.dev/learn/passing-data-deeply-with-context)