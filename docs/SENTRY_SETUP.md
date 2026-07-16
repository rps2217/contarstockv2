# Configuración de Sentry - Monitoring en Producción

## Overview

ContarStock v2 incluye integración con **Sentry** para tracking de errores y **Web Vitals** para métricas de performance en producción.

## Estado Actual

✅ El código de monitoring está **implementado y listo**  
✅ Se activa automáticamente en entorno de producción  
❌ Requiere configuración de `.env` para funcionar

## Configuración

### 1. Crear cuenta en Sentry

1. Ir a [sentry.io](https://sentry.io)
2. Crear proyecto (Web / React)
3. Obtener el **DSN** del proyecto

### 2. Configurar variables de entorno

Crear/editar archivo `.env` en la raíz del proyecto:

```bash
# .env
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_APP_VERSION=3.1.1
```

### 3. (Opcional) Habilitar funcionalidades extra

```bash
# Habilitar session replays (consume más recursos)
VITE_ENABLE_REPLAYS=true

# Habilitar analytics
VITE_ENABLE_ANALYTICS=true
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Qué se rastrea automáticamente

### Errores

- Excepciones no capturadas
- Errores de Promise
- Errores de componentes React

### Performance (Web Vitals)

- **CLS** - Cumulative Layout Shift
- **FCP** - First Contentful Paint
- **LCP** - Largest Contentful Paint
- **TTFB** - Time to First Byte
- **INP** - Interaction to Next Paint

### Métricas de Sync

- Duración de sincronizaciones
- Conflicts y errores
- Latencia de red

## Verificar que funciona

### Desarrollo local (no envía datos)

```bash
npm run dev
# Ver consola: "Sentry skipped in development"
```

### Producción (envía datos)

```bash
npm run build
npm run preview
# Ver consola: "Sentry initialized successfully"
```

## Desactivar temporalmente

Para desactivar sin eliminar el código:

```bash
# En .env
VITE_SENTRY_DSN=
```

O eliminar la variable `initSentry()` de `src/index.tsx`.

## Dashboard de Sentry

En [sentry.io](https://sentry.io) puedes ver:

| Sección     | Contenido                               |
| ----------- | --------------------------------------- |
| Issues      | Errores capturados                      |
| Performance | Métricas de velocidad                   |
| Replays     | Grabaciones de sesiones (si habilitado) |
| Alerts      | Notificaciones configuradas             |

## Recomendaciones

1. **No capturar datos sensibles**: El código ya sanitiza datos sensibles
2. **Sample rate**: Configurado a 10% para reducir volumen
3. **Alertas**: Configurar alertas para errores críticos
4. **Release tracking**: El DSN incluye el release automáticamente

## Troubleshooting

### "Sentry DSN not configured"

- Verificar que `VITE_SENTRY_DSN` está en `.env`
- Verificar que el archivo `.env` está en la raíz del proyecto
- Reiniciar el servidor de desarrollo

### Errores no aparecen

- Verificar que `import.meta.env.PROD` es `true`
- Verificar network en DevTools
- Revisar [Sentry Status](https://status.sentry.io)

### Data rate limit exceeded

- Reducir `tracesSampleRate` en `src/services/monitoring.ts`
- O agregar API key de Sentry

## Recursos

- [Documentación Sentry React](https://docs.sentry.io/platforms/javascript/react/)
- [Web Vitals](https://web.dev/vitals/)
- [Configuración de alertas](https://docs.sentry.io/product/alerts/)
