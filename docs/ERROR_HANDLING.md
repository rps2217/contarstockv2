# Manejo de Errores Robusto

**Fecha:** 2026-07-02
**Estado:** ✅ IMPLEMENTADO

---

## Resumen

Sistema centralizado de manejo de errores con:
- Clases de error tipadas
- ErrorBoundary para React
- Logging centralizado
- Utilidades para clasificar errores

---

## Clases de Error

| Clase | Uso | Propiedades |
|-------|-----|-------------|
| `AppError` | Base para todos los errores | code, statusCode, context |
| `ValidationError` | Fallos de validación | errors[] |
| `NotFoundError` | Recursos no encontrados | resource, id |
| `SyncError` | Fallos de sincronización | tableName, operation, recoverable |
| `NetworkError` | Fallos de red | online |
| `DatabaseError` | Fallos de base de datos | operation |
| `AuthenticationError` | Fallos de autenticación | - |

---

## Uso

### Lanzar Errores Tipados

```typescript
import { AppError, NotFoundError, SyncError } from '@/lib/errors';

// Error genérico
throw new AppError('Algo salió mal', 'GENERIC_ERROR', 500);

// Recurso no encontrado
throw new NotFoundError('Product', barcode);

// Error de sync
throw new SyncError('Push failed', 'PRODUCTOS', 'push', true);
```

### ErrorBoundary en Componentes

```typescript
import { ErrorBoundary } from '@/lib/errors';

function MyPage() {
  return (
    <ErrorBoundary level="page">
      <MyComponent />
    </ErrorBoundary>
  );
}

// Con callback de error
<ErrorBoundary 
  onError={(error, info) => {
    // Reportar a Sentry, etc.
  }}
>
  <MyComponent />
</ErrorBoundary>
```

### Clasificar Errores

```typescript
import { formatError, isRecoverable, isNetworkError, isAuthError } from '@/lib/errors';

try {
  await saveData();
} catch (error) {
  if (isNetworkError(error)) {
    // Mostrar "Sin conexión"
  } else if (isAuthError(error)) {
    // Redirigir a login
  } else if (isRecoverable(error)) {
    // Mostrar botón de retry
  } else {
    // Error crítico
  }
}
```

### ErrorDisplay Component

```typescript
import { ErrorDisplay } from '@/lib/errors';

function MyComponent() {
  const [error, setError] = useState(null);

  return (
    <>
      {/* ... contenido ... */}
      
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={() => {/* reintentar */}}
          onDismiss={() => setError(null)}
        />
      )}
    </>
  );
}
```

---

## ErrorProvider

Envuelve tu app para manejo centralizado:

```typescript
import { ErrorProvider, useErrorHandler } from '@/lib/errors';

function App() {
  return (
    <ErrorProvider>
      {/* tu app */}
    </ErrorProvider>
  );
}

// En cualquier componente:
function MyComponent() {
  const { handleError, handleAsyncError } = useErrorHandler();
  
  // Para funciones async
  const loadData = async () => {
    const data = await handleAsyncError(fetchData(), 'loadData');
    if (data) {
      // usar data
    }
  };
  
  // Para errores síncronos
  handleError(new Error('Algo'), 'myContext');
}
```

---

## Utilidades

### formatError(error)

Formatea un error para mostrar al usuario:

```typescript
formatError(error); // "RUT inválido"
formatError(error, 'Error desconocido'); // fallback
```

### isRecoverable(error)

Determina si se debe mostrar retry:

```typescript
if (isRecoverable(error)) {
  // Mostrar botón de retry
}
```

### isNetworkError(error)

Determina si es error de conexión:

```typescript
if (isNetworkError(error)) {
  // "Sin conexión a internet"
}
```

---

## Patrón Recomendado

```typescript
async function saveRecord(data: unknown) {
  try {
    // 1. Validar con Zod
    const validData = validateExpiry(data);
    
    // 2. Guardar en DB
    await db.table('expirations').add(validData);
    
    // 3. Toast de éxito
    toast.success('Guardado');
    
  } catch (error) {
    // 4. Clasificar error
    if (error instanceof ValidationError) {
      toast.error(error.message);
    } else if (isNetworkError(error)) {
      toast.error('Sin conexión. Guardado localmente.');
    } else if (isRecoverable(error)) {
      toast.error('Error. Intenta nuevamente.');
    } else {
      // 5. Log crítico
      logger.error('CRITICAL', 'Save failed', error);
      toast.error('Error crítico. Contacta soporte.');
    }
  }
}
```
