/**
 * =============================================================================
 * EXPIRY CONSTANTS - Constantes para ExpiryPage
 * =============================================================================
 *
 * Constantes de UI para el módulo de vencimientos.
 *
 * @module ExpiryPage/expiryConstants
 */

import React from 'react';
import { Skull, AlertTriangle, PackageX, Clock, ShieldCheck } from 'lucide-react';

// Tipos
export type UxExpiryStatus = 'expired' | 'critical' | 'withdrawal' | 'next' | 'safe';

// Mapeo de estados
export const mapStatus = (status: string): UxExpiryStatus => {
  const statusMap: Record<string, UxExpiryStatus> = {
    expired: 'expired',
    critical: 'critical',
    withdrawal: 'withdrawal',
    next: 'next',
    safe: 'safe',
  };
  return statusMap[status] || 'safe';
};

// Metadata de estados
export const STATUS_META: Record<
  UxExpiryStatus,
  { label: string; icon: React.ElementType; text: string; bg: string; border: string; dot: string }
> = {
  expired: {
    label: 'Vencido',
    icon: Skull,
    text: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
  },
  critical: {
    label: 'Crítico',
    icon: AlertTriangle,
    text: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
  },
  withdrawal: {
    label: 'A retirar',
    icon: PackageX,
    text: 'text-orange-500',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
  },
  next: {
    label: 'Próximo',
    icon: Clock,
    text: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
  },
  safe: {
    label: 'Seguro',
    icon: ShieldCheck,
    text: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
};

// Orden de estados
export const STATUS_ORDER: UxExpiryStatus[] = ['expired', 'critical', 'withdrawal', 'next', 'safe'];

// Meses
export const MONTHS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

// Filtros predefinidos
export const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'expired', label: 'Vencidos' },
  { value: 'critical', label: 'Críticos' },
  { value: 'withdrawal', label: 'A retirar' },
  { value: 'next', label: 'Próximos' },
  { value: 'safe', label: 'Válidos' },
];
