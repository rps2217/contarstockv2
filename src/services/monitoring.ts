/**
 * Monitoring Service - Sentry + Web Vitals
 * 
 * Configuración centralizada para monitoreo en producción.
 * Solo se inicializa en entorno de producción.
 */

import { logger } from './logger';

// Tipos para Web Vitals
interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

/**
 * Inicializa Sentry para tracking de errores
 * 
 * Para activar:
 * 1. npm install @sentry/react
 * 2. Crear cuenta en sentry.io
 * 3. Agregar VITE_SENTRY_DSN en .env
 */
export async function initSentry() {
  // Solo en producción
  if (!import.meta.env.PROD) {
    logger.info('MONITORING', 'Sentry skipped in development');
    return;
  }

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!sentryDsn) {
    logger.warn('MONITORING', 'Sentry DSN not configured');
    return;
  }

  try {
    const { init, captureException, setUser, setTag } = await import('@sentry/react');
    
    init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      release: `contarstock@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
      
      // Sample rate para reducir volumen
      tracesSampleRate: 0.1, // 10% de transacciones
      
      // Replays para debugging
      replaysSessionSampleRate: 0.05,
      replaysOnErrorSampleRate: 1.0,
      
      // Integraciones
      integrations: [
        // Capture errors en setTimeout/setInterval
        new BrowserTracing(),
        // Extraer información de React
        Replay,
      ],
      
      // Tags globales
      initialScope: {
        tags: {
          app: 'contarstock',
          platform: 'web',
        },
      },
    });

    logger.info('MONITORING', 'Sentry initialized');
  } catch (error) {
    logger.error('MONITORING', 'Failed to init Sentry', error);
  }
}

/**
 * Captura una excepción en Sentry
 */
export function captureError(error: Error, context?: Record<string, unknown>) {
  if (!import.meta.env.PROD) {
    console.error('[Error Capture]', error, context);
    return;
  }

  try {
    const { captureException } = require('@sentry/react');
    captureException(error, { extra: context });
  } catch {
    // Sentry no disponible
  }
}

/**
 * Configura información del usuario
 */
export function setUserContext(user: { id: string; email?: string; username?: string }) {
  if (!import.meta.env.PROD) return;

  try {
    const { setUser } = require('@sentry/react');
    setUser(user);
  } catch {
    // Sentry no disponible
  }
}

// ============================================================================
// WEB VITALS - Performance Monitoring
// ============================================================================

/**
 * Tipos de métricas de Web Vitals
 */
type MetricCallback = (metric: WebVitalsMetric) => void;

/**
 * Obtiene el rating de una métrica basado en thresholds
 */
function getRating(value: number, thresholds: { poor: number; needsImprovement: number; good: number }): WebVitalsMetric['rating'] {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * CLS (Cumulative Layout Shift) thresholds
 */
const CLS_THRESHOLDS = { poor: 0.25, needsImprovement: 0.1, good: 0.1 };

/**
 * LCP (Largest Contentful Paint) thresholds
 */
const LCP_THRESHOLDS = { poor: 4000, needsImprovement: 2500, good: 2500 };

/**
 * FID (First Input Delay) / INP thresholds
 */
const FID_THRESHOLDS = { poor: 300, needsImprovement: 100, good: 100 };

/**
 * TTFB (Time to First Byte) thresholds
 */
const TTFB_THRESHOLDS = { poor: 1800, needsImprovement: 800, good: 800 };

/**
 * Inicializa Web Vitals tracking
 */
export async function initWebVitals() {
  if (!import.meta.env.PROD) {
    logger.info('WEB_VITALS', 'Web Vitals skipped in development');
    return;
  }

  try {
    const { onCLS, onFID, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    const reportWebVital = async (metric: WebVitalsMetric) => {
      // Log en consola
      console.log(`[WebVital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);

      // Enviar a analytics (ej: Google Analytics, Mixpanel)
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as any).gtag('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          metric_rating: metric.rating,
          page_path: window.location.pathname,
        });
      }

      // Enviar a Sentry si es poor rating
      if (metric.rating === 'poor') {
        captureWebVitalAlert(metric);
      }
    };

    // Registrar métricas
    onCLS(reportWebVital);
    onFID(reportWebVital);
    onFCP(reportWebVital);
    onLCP(reportWebVital);
    onTTFB(reportWebVital);
    onINP(reportWebVital);

    logger.info('WEB_VITALS', 'Web Vitals tracking initialized');
  } catch (error) {
    logger.error('WEB_VITALS', 'Failed to init Web Vitals', error);
  }
}

/**
 * Captura alertas de Web Vitals poor
 */
function captureWebVitalAlert(metric: WebVitalsMetric) {
  try {
    const { captureMessage } = require('@sentry/react');
    captureMessage(`Poor Web Vital: ${metric.name}`, {
      level: 'warning',
      tags: {
        web_vital: metric.name,
        rating: metric.rating,
      },
      extra: {
        value: metric.value,
        id: metric.id,
      },
    });
  } catch {
    // Sentry no disponible
  }
}

// ============================================================================
// ANALYTICS - Tracking de eventos
// ============================================================================

interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

/**
 * Trackea un evento de analytics
 */
export function trackEvent({ category, action, label, value }: AnalyticsEvent) {
  // Console log en desarrollo
  if (import.meta.env.DEV) {
    console.log(`[Analytics] ${category} / ${action}`, { label, value });
  }

  // Google Analytics 4
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

// ============================================================================
// PERFORMANCE MARKS
// ============================================================================

/**
 * Marca personalizada de performance
 */
export function performanceMark(name: string, detail?: string) {
  if (typeof performance !== 'undefined' && 'mark' in performance) {
    performance.mark(name, { detail });
  }
}

/**
 * Mide tiempo entre dos marks
 */
export function performanceMeasure(name: string, startMark: string, endMark?: string) {
  if (typeof performance !== 'undefined' && 'measure' in performance) {
    try {
      performance.measure(name, startMark, endMark);
    } catch {
      // Marks no existen
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const monitoring = {
  initSentry,
  initWebVitals,
  captureError,
  setUserContext,
  trackEvent,
  performanceMark,
  performanceMeasure,
};

export default monitoring;
