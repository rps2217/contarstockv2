/**
 * UI Helpers - Utilidades centralizadas para formateo y estilos de UI
 * Unifica funciones duplicadas en toda la aplicación
 */

import React from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle,
  HelpCircle,
  TrendingUp
} from 'lucide-react';

// ============================================
// FORMATEO DE FECHAS Y TIEMPO
// ============================================

/**
 * Formatea timestamp a fecha legible
 * Ejemplo: "27 Jun 2024, 14:30"
 */
export function formatDate(
  timestamp?: number | string | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!timestamp) return 'N/A';
  
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  if (isNaN(date.getTime())) return 'N/A';
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  };
  
  return date.toLocaleDateString('es-CL', defaultOptions);
}

/**
 * Formatea timestamp para modales de detalle (formato completo)
 * Ejemplo: "27 Jun 2024, 14:30"
 */
export function formatDetailDate(timestamp?: number | string | null): string {
  if (!timestamp) return 'N/A';
  
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  if (isNaN(date.getTime())) return 'N/A';
  
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea timestamp a fecha con hora
 * Ejemplo: "27 Jun 2024, 14:30"
 */
export function formatDateTime(timestamp?: number | string | null): string {
  return formatDate(timestamp, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea timestamp a solo hora
 * Ejemplo: "14:30"
 */
export function formatTime(timestamp?: number | string | null): string {
  if (!timestamp) return '';
  
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  if (isNaN(date.getTime())) return '';
  
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formatea duración en milisegundos a texto legible
 * Ejemplo: "500ms", "2.5s", "3m"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}

/**
 * Formatea segundos a texto legible
 * Ejemplo: "30s", "5m", "2h", "1d"
 */
export function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

// ============================================
// HELPERS DE ICONOS Y COLORES
// ============================================

/**
 * Obtiene las clases de color para un icono según su color base
 */
export function getIconColorClass(
  color?: string, 
  isDark: boolean = true
): string {
  const colorMap: Record<string, { light: string; dark: string }> = {
    blue: { light: 'bg-blue-100 text-blue-600', dark: 'bg-blue-500/10 text-blue-400' },
    emerald: { light: 'bg-emerald-100 text-emerald-600', dark: 'bg-emerald-500/10 text-emerald-400' },
    amber: { light: 'bg-amber-100 text-amber-600', dark: 'bg-amber-500/10 text-amber-400' },
    rose: { light: 'bg-rose-100 text-rose-600', dark: 'bg-rose-500/10 text-rose-400' },
    purple: { light: 'bg-purple-100 text-purple-600', dark: 'bg-purple-500/10 text-purple-400' },
    indigo: { light: 'bg-indigo-100 text-indigo-600', dark: 'bg-indigo-500/10 text-indigo-400' },
    slate: { light: 'bg-slate-100 text-slate-600', dark: 'bg-slate-500/10 text-muted' },
  };
  
  const theme = isDark ? 'dark' : 'light';
  return colorMap[color || 'slate']?.[theme] || colorMap.slate[theme];
}

// ============================================
// HELPERS DE STATUS
// ============================================

export type SyncStatus = 'synced' | 'pending' | 'error' | 'never';
export type ItemStatus = 'success' | 'warning' | 'danger' | 'safe' | 'expired' | 'critical' | 'next_expiry';

/**
 * Obtiene el color de texto para un status
 */
export function getStatusColor(
  status: string, 
  mode: 'text' | 'bg' | 'border' = 'text'
): string {
  const colors: Record<string, Record<string, string>> = {
    synced: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    success: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    safe: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    pending: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    warning: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    next_expiry: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    error: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
    danger: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
    expired: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
    critical: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    never: { text: 'text-muted', bg: 'bg-slate-500/10', border: 'border-slate-500/30' },
    info: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  };
  
  return colors[status]?.[mode] || colors.never[mode];
}

/**
 * Obtiene las clases de color completas para un status
 */
export function getStatusColorClasses(
  status: string, 
  mode: 'text' | 'bg' | 'border' | 'all' = 'all'
): string {
  if (mode === 'all') {
    return `${getStatusColor(status, 'text')} ${getStatusColor(status, 'bg')} ${getStatusColor(status, 'border')}`;
  }
  return getStatusColor(status, mode);
}

/**
 * Obtiene el icono para un status de sync
 */
export function getStatusIcon(status: SyncStatus | string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    synced: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    pending: <Clock className="w-4 h-4 text-amber-400" />,
    error: <XCircle className="w-4 h-4 text-rose-400" />,
    expired: <AlertCircle className="w-4 h-4 text-rose-400" />,
    critical: <AlertCircle className="w-4 h-4 text-orange-400" />,
    never: <HelpCircle className="w-4 h-4 text-muted" />,
    default: <TrendingUp className="w-4 h-4 text-blue-400" />,
  };
  
  return iconMap[status] || iconMap.default;
}

/**
 * Obtiene el label legible para un status
 */
export function getStatusLabel(status?: string): string {
  const labels: Record<string, string> = {
    synced: 'Sincronizado',
    pending: 'Pendiente',
    error: 'Error',
    expired: 'Vencido',
    critical: 'Crítico',
    safe: 'Seguro',
    next_expiry: 'Próximo a vencer',
    success: 'Éxito',
    never: 'Nunca',
  };
  
  return labels[status || ''] || status?.toUpperCase() || 'DESCONOCIDO';
}

/**
 * Obtiene el estilo visual para un status (estilo inline)
 */
export function getStatusStyle(status: string): { color: string; bg: string } {
  const styles: Record<string, { color: string; bg: string }> = {
    synced: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
    pending: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
    error: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    expired: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
    critical: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
    safe: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)' },
    never: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
  };
  
  return styles[status] || styles.never;
}

// ============================================
// HELPERS PARA BADGES DE STATUS
// ============================================

export interface SessionStatusBadge {
  label: string;
  color: string;
  textColor: string;
}

/**
 * Obtiene configuración de badge para estado de sesión de conteo
 */
export function getSessionStatusBadge(status: string): SessionStatusBadge {
  const badges: Record<string, SessionStatusBadge> = {
    completed: { label: 'Completada', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
    closed: { label: 'Completada', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
    in_progress: { label: 'En Progreso', color: 'bg-blue-500', textColor: 'text-blue-400' },
    paused: { label: 'Pausada', color: 'bg-amber-500', textColor: 'text-amber-400' },
    active: { label: 'Activa', color: 'bg-slate-500', textColor: 'text-muted' },
  };
  
  return badges[status] || badges.active;
}

export interface SyncLogStatusBadge {
  bg: string;
  icon: React.ReactNode;
}

/**
 * Obtiene configuración de badge para log de sincronización
 */
export function getSyncLogStatusBadge(
  status: string,
  options?: { isHighContrast?: boolean; isLight?: boolean }
): SyncLogStatusBadge {
  const isHighContrast = options?.isHighContrast ?? false;
  const isLight = options?.isLight ?? false;
  
  if (status === 'success') {
    return {
      bg: isHighContrast ? 'bg-green-500/20 text-green-400' : isLight ? 'bg-emerald-100 text-emerald-600' : 'bg-emerald-500/20 text-emerald-500',
      icon: <CheckCircle2 className="w-5 h-5" />
    };
  }
  
  return {
    bg: isHighContrast ? 'bg-red-500/20 text-red-400' : isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-500/20 text-rose-500',
    icon: <AlertCircle className="w-5 h-5" />
  };
}

// ============================================
// HELPERS PARA MÉTRICAS
// ============================================

export type MetricVariant = 'default' | 'warning' | 'error' | 'success';

export interface MetricColorClasses {
  bg: string;
  text: string;
  border: string;
}

/**
 * Obtiene las clases de color para tarjetas de métricas según variante
 */
export function getMetricColorClasses(variant: MetricVariant = 'default'): MetricColorClasses {
  const colorMap: Record<MetricVariant, MetricColorClasses> = {
    default: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      border: 'border-subtle/60'
    },
    warning: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20'
    },
    error: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20'
    },
    success: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20'
    }
  };
  
  return colorMap[variant];
}
