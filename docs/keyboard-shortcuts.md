# Atajos de Teclado - ContarStock v2

Este documento lista todos los atajos de teclado disponibles en la aplicación.

## Atajos Globales

| Atajo | Descripción | Contexto |
|-------|-------------|----------|
| `Alt + N` | Crear nuevo evento | Eventos |
| `Alt + P` | Toggle dashboard de productividad | Counting, Events |
| `Alt + Shift + T` | Toggle modo turbo | Counting, Hammer |
| `/` | Activar búsqueda | Cualquier página |
| `Esc` | Cerrar modal / Cancelar | Modales abiertos |
| `Enter` | Confirmar acción | Formularios |

## Atajos por Módulo

### Counting (Conteo)

| Atajo | Descripción |
|-------|-------------|
| `1` | Multiplicador x1 |
| `6` | Multiplicador x6 |
| `B` | Multiplicador x12 |
| `T` | Multiplicador x24 |
| `L` | Cambiar ubicación |
| `M` | Toggle modo manual |
| `C` | Toggle cámara |
| `F` | Finalizar sesión |
| `P` | Toggle productividad |

### Hammer (Conteo Masivo)

| Atajo | Descripción |
|-------|-------------|
| `1-4` | Seleccionar multiplicador |
| `L` | Cambiar ubicación |
| `R` | Reiniciar sesión |
| `E` | Exportar a Excel |
| `S` | Sincronizar |
| `T` | Toggle modo turbo |

### Events (Eventos)

| Atajo | Descripción |
|-------|-------------|
| `Alt + N` | Nuevo evento |
| `D` | Destinar evento |
| `A` | Ajustar evento |
| `/` | Buscar eventos |
| `Esc` | Deseleccionar |

### Navegación

| Atajo | Descripción |
|-------|-------------|
| `G + D` | Ir a Dashboard |
| `G + S` | Ir a Settings |
| `G + R` | Ir a Reports |
| `G + E` | Ir a Events |
| `G + C` | Ir a Counting |

## Implementación

Los atajos se definen en:

```typescript
// src/hooks/useKeyboardShortcuts.ts
// src/shared/hooks/useGlobalShortcuts.ts
```

### Agregar nuevos atajos

```typescript
// Ejemplo de uso de atajo
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Alt + P para productividad
    if (e.altKey && e.key === 'p') {
      e.preventDefault();
      toggleProductivity();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [toggleProductivity]);
```

## Visualización

Para ver los atajos disponibles, presiona `?` en cualquier página (si está implementado).

---

**Última actualización:** 2026-06-23
