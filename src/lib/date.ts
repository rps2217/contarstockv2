/**
 * Date Utilities - Funciones para formateo de fechas y tiempo relativo
 * Unifica formatTimeAgo y formatRelativeTime en una sola función
 */

interface FormatTimeAgoOptions {
  locale?: string;
  lessThanOneMinute?: string;
}

/**
 * Formatea un timestamp a texto de tiempo relativo
 * Ejemplos: "Hace un momento", "hace 5 min", "hace 2 horas", "Ayer", "hace 3 días"
 */
export function formatTimeAgo(timestamp: number, options: FormatTimeAgoOptions | string = {}): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  const opts = typeof options === 'string' ? { locale: options } : options;
  const locale = opts.locale || 'es-ES';
  const lessThanOneMsg = opts.lessThanOneMinute || 'Hace un momento';
  
  if (minutes < 1) return lessThanOneMsg;
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} horas`;
  if (days === 1) return 'Ayer';
  if (days < 7) return `hace ${days} días`;
  
  // Para fechas más antiguas, usar formato de fecha
  return new Date(timestamp).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short'
  });
}

/**
 * Alias para formatTimeAgo - mantiene compatibilidad con código existente
 */
export const formatRelativeTime = formatTimeAgo;

/**
 * Formatea segundos a texto legible
 * Ejemplos: "30s", "5m", "2h", "1d"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export default formatTimeAgo;