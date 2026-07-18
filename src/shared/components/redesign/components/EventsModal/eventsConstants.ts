/**
 * EventsModal - Constantes y helpers
 */

import { Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

// ============================================================================
// Tipos
// ============================================================================

export type EventType = 'info' | 'warning' | 'error' | 'success';
export type EventStatus = 'pending' | 'destined' | 'adjusted';
export type ViewMode = 'table' | 'form';

export interface EventFormData {
  frcNumber: string;
  barcode: string;
  productName: string;
  batch: string;
  expiryDate: string;
  resolution: string;
  status: EventStatus;
  traspasoNumber: string;
}

// ============================================================================
// Constantes
// ============================================================================

export const EVENT_META: Record<
  EventType,
  {
    label: string;
    icon: React.ElementType;
    bg: string;
    border: string;
    dot: string;
    text: string;
  }
> = {
  info: {
    label: 'Info',
    icon: Info,
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    text: 'text-blue-500',
  },
  warning: {
    label: 'Advertencia',
    icon: AlertTriangle,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    text: 'text-amber-500',
  },
  error: {
    label: 'Error',
    icon: AlertCircle,
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
    text: 'text-rose-500',
  },
  success: {
    label: 'Éxito',
    icon: CheckCircle,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    text: 'text-emerald-500',
  },
};

export const STATUS_OPTIONS: { value: EventStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendiente', color: 'text-amber-500' },
  { value: 'destined', label: 'Destinados', color: 'text-blue-500' },
  { value: 'adjusted', label: 'Ajustados', color: 'text-emerald-500' },
];

export const TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Advertencia' },
  { value: 'error', label: 'Error' },
  { value: 'success', label: 'Éxito' },
];

export const COLUMNS = [
  { key: 'frcNumber', label: 'FRC', sortable: true, width: 'w-28' },
  { key: 'productName', label: 'Producto', sortable: true, width: 'flex-1' },
  { key: 'barcode', label: 'Barras', sortable: true, width: 'w-32' },
  { key: 'batch', label: 'Lote', sortable: true, width: 'w-24' },
  { key: 'expiryDate', label: 'Vencimiento', sortable: true, width: 'w-28' },
  { key: 'status', label: 'Estado', sortable: true, width: 'w-24' },
  { key: 'syncStatus', label: '', sortable: false, width: 'w-8' },
  { key: 'createdAt', label: 'Fecha', sortable: true, width: 'w-28' },
  { key: 'actions', label: '', sortable: false, width: 'w-24' },
];

// ============================================================================
// Helpers
// ============================================================================

export const formatEventDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export const EMPTY_FORM: EventFormData = {
  frcNumber: '',
  barcode: '',
  productName: '',
  batch: '',
  expiryDate: '',
  resolution: '',
  status: 'pending',
  traspasoNumber: '',
};

export default {
  EVENT_META,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  COLUMNS,
  formatEventDate,
  EMPTY_FORM,
};
