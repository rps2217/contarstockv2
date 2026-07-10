/**
 * Monitoring Service - Sentry + Web Vitals
 * 
 * Configuración centralizada para monitoreo en producción.
 * Solo se inicializa en entorno de producción.
 */

import { logger } from './logger';
import * as Sentry from '@sentry/react';
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

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
 * 1. Crear cuenta en sentry.io
 * 2. Agregar VITE_SENTRY_DSN en .env
 */
export async function initSentry() {
  // Solo en producción
  if (!import.meta.env.PROD) {
    logger.info('MONITORING', 'Sentry skipped in development');
    return;
  }

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!sentryDsn) {
    logger.warn('MONITORING', 'Sentry DSN not configured - set VITE_SENTRY_DSN in .env');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      release: `contarstock@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
      
      // Sample rate para reducir volumen
      tracesSampleRate: 0.1,
      
      // Integraciones automáticas de @sentry/react
      // BrowserTracing, Replay están incluidos en el bundle
      
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

  Sentry.captureException(error, { extra: context });
}

/**
 * Captura un mensaje en Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!import.meta.env.PROD) {
    console.log('[Message Capture]', message);
    return;
  }

  Sentry.captureMessage(message, level);
}

/**
 * Configura información del usuario
 */
export function setUserContext(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

/**
 * Agrega tags adicionales
 */
export function setTags(tags: Record<string, string>) {
  Sentry.setTags(tags);
}

// ============================================================================
// WEB VITALS - Performance Monitoring
// ============================================================================

/**
 * Inicializa Web Vitals tracking
 */
export async function initWebVitals() {
  if (!import.meta.env.PROD) {
    logger.info('WEB_VITALS', 'Web Vitals skipped in development');
    return;
  }

  try {
    const reportWebVital = (metric: WebVitalsMetric) => {
      // Log en consola
      console.log(`[WebVital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);

      // Enviar a Google Analytics 4 si está disponible
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as any).gtag('event', metric.name, {
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          metric_rating: metric.rating,
          page_path: window.location.pathname,
        });
      }

      // Enviar a Sentry si es poor rating
      if (metric.rating === 'poor') {
        Sentry.captureMessage(`Poor Web Vital: ${metric.name}`, {
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
      }
    };

    // Registrar métricas
    onCLS(reportWebVital);
    onFCP(reportWebVital);
    onLCP(reportWebVital);
    onTTFB(reportWebVital);
    onINP(reportWebVital);

    logger.info('WEB_VITALS', 'Web Vitals tracking initialized');
  } catch (error) {
    logger.error('WEB_VITALS', 'Failed to init Web Vitals', error);
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

  // También trackear en Sentry Insights si está configurado
  if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      category: category,
      message: action,
      data: { label, value },
      level: 'info',
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
  captureMessage,
  setUserContext,
  setTags,
  trackEvent,
  performanceMark,
  performanceMeasure,
  // Re-export Sentry for direct use if needed
  Sentry,
};

export default monitoring;
