/**
 * =============================================================================
 * EXPIRY HELPERS - Funciones utilitarias para ExpiryPage
 * =============================================================================
 *
 * Funciones helper para formateo y cálculos de vencimientos.
 *
 * @module ExpiryPage/expiryHelpers
 */

import { ExpiryRecord } from '@/features/expiry/hooks/useExpiry';
import { UxExpiryStatus, MONTHS, STATUS_META } from './expiryConstants';

// Tipos para colores
export interface DateColorSet {
  text: string;
  bg: string;
  border: string;
}

/**
 * Formatea fecha de vencimiento (retorna componentes)
 */
export const formatExpiryDate = (record: ExpiryRecord) => {
  const day = record.expiryDateObj ? record.expiryDateObj.getDate() : 1;
  const month = record.expiryDateObj ? record.expiryDateObj.getMonth() + 1 : record.mm;
  const year = record.expiryDateObj ? record.expiryDateObj.getFullYear() : record.yyyy;
  return { day, month, year };
};

/**
 * Obtiene los colores según días restantes hasta vencimiento
 */
export const getExpiryDateColor = (daysLeft: number): DateColorSet => {
  if (daysLeft < 0)
    return { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/40' };
  if (daysLeft === 0)
    return { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/40' };
  if (daysLeft <= 7)
    return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40' };
  if (daysLeft <= 30)
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/15', border: 'border-yellow-500/40' };
  return { text: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40' };
};

/**
 * Obtiene los colores según días hasta retiro
 */
export const getWithdrawalDateColor = (
  daysUntilWithdrawal: number,
  withdrawalDays: number
): DateColorSet => {
  if (daysUntilWithdrawal < 0)
    return { text: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/40' };
  if (daysUntilWithdrawal <= 7)
    return { text: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40' };
  if (daysUntilWithdrawal <= withdrawalDays)
    return { text: 'text-orange-400', bg: 'bg-orange-500/15', border: 'border-orange-500/40' };
  return { text: 'text-blue-400', bg: 'bg-blue-500/15', border: 'border-blue-500/40' };
};

/**
 * Obtiene la clase CSS para el estado
 */
export const getStatusClasses = (
  status: UxExpiryStatus
): { text: string; bg: string; border: string; dot: string } => {
  return STATUS_META[status] || STATUS_META.safe;
};
