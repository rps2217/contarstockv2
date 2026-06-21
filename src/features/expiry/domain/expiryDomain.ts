/**
 * ExpiryDomain - Lógica de negocio pura para vencimientos
 * 
 * Sin dependencias de React ni Supabase.
 */

import { differenceInCalendarDays, startOfDay, addDays } from 'date-fns';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// TIPOS
// ============================================================================

export enum ExpiryStatus {
  EXPIRED = 'expired',
  CRITICAL = 'critical',
  WITHDRAWAL = 'withdrawal',
  NEXT_EXPIRY = 'next_expiry',
  SAFE = 'safe'
}

export interface ExpiryPolicy {
  withdrawalDays: number;
  hasCanje: boolean;
}

export interface ExpiryEvaluation {
  status: ExpiryStatus;
  daysLeft: number;
  lifePercent: number;
  riskScore: number;
  label: string;
  withdrawalDate: Date | null;
}

const calculateRiskScore = (
  daysLeft: number, 
  quantity: number, 
  hasCanje: boolean, 
  withdrawalDays: number
): number => {
  if (daysLeft < 0) return 100;
  
  const daysToWithdrawal = daysLeft - withdrawalDays;
  
  let timeScore = 0;
  if (daysToWithdrawal <= 0) {
    timeScore = 60 + Math.min(20, (Math.abs(daysToWithdrawal) / withdrawalDays) * 20);
  } else if (daysToWithdrawal <= 90) {
    timeScore = 60 * (1 - (daysToWithdrawal / 90));
  }
  
  const commercialScore = hasCanje ? 0 : 25;
  const volumeScore = Math.min(15, (quantity || 1) * 0.5);
  
  return Math.round(Math.min(100, timeScore + commercialScore + volumeScore));
};

export const evaluateExpiry = (
  expiryDate: Date | null,
  policy: ExpiryPolicy,
  referenceDate: Date = new Date(),
  quantity: number = 1
): ExpiryEvaluation => {
  if (!expiryDate) {
    return {
      status: ExpiryStatus.SAFE,
      daysLeft: 0,
      lifePercent: 100,
      riskScore: 0,
      label: 'SIN FECHA',
      withdrawalDate: null
    };
  }

  const today = startOfDay(referenceDate);
  const daysLeft = differenceInCalendarDays(startOfDay(expiryDate), today);
  const withdrawalDays = policy.withdrawalDays ?? 30;
  const withdrawalDate = addDays(startOfDay(expiryDate), -withdrawalDays);
  
  const daysToWithdrawal = daysLeft - withdrawalDays;
  const riskScore = calculateRiskScore(daysLeft, quantity, policy.hasCanje, withdrawalDays);
  const lifePercent = Math.max(0, Math.min(100, (daysLeft / 730) * 100));

  let status = ExpiryStatus.SAFE;
  let label = 'VIGENTE';

  if (daysLeft < 0) {
    status = ExpiryStatus.EXPIRED;
    label = 'VENCIDO';
  } else if (daysLeft <= withdrawalDays) {
    if (daysLeft <= Math.max(15, withdrawalDays * 0.3) || (!policy.hasCanje && daysLeft <= 30)) {
      status = ExpiryStatus.CRITICAL;
      label = 'CRÍTICO';
    } else {
      status = ExpiryStatus.WITHDRAWAL;
      label = 'RETIRAR';
    }
  } else if (daysToWithdrawal <= 90) {
    status = ExpiryStatus.NEXT_EXPIRY;
    label = 'PRÓXIMO';
  }

  return { status, daysLeft, lifePercent, riskScore, label, withdrawalDate };
};

export const getDaysUntilExpiry = (mm: number, yyyy: number): number => {
  const expiryDate = new Date(yyyy, mm - 1, 1);
  expiryDate.setMonth(expiryDate.getMonth() + 1);
  expiryDate.setDate(0);
  return differenceInCalendarDays(expiryDate, new Date());
};

export const getExpiryStatusColor = (status: ExpiryStatus): string => {
  switch (status) {
    case ExpiryStatus.EXPIRED:
      return 'text-red-500';
    case ExpiryStatus.CRITICAL:
      return 'text-amber-500';
    case ExpiryStatus.WITHDRAWAL:
      return 'text-orange-500';
    case ExpiryStatus.NEXT_EXPIRY:
      return 'text-yellow-500';
    default:
      return 'text-emerald-500';
  }
};

export const getExpiryStatusBgColor = (status: ExpiryStatus): string => {
  switch (status) {
    case ExpiryStatus.EXPIRED:
      return 'bg-red-500/10 border-red-500/30';
    case ExpiryStatus.CRITICAL:
      return 'bg-amber-500/10 border-amber-500/30';
    case ExpiryStatus.WITHDRAWAL:
      return 'bg-orange-500/10 border-orange-500/30';
    case ExpiryStatus.NEXT_EXPIRY:
      return 'bg-yellow-500/10 border-yellow-500/30';
    default:
      return 'bg-emerald-500/10 border-emerald-500/30';
  }
};

// ============================================================================
// HELPERS
// ============================================================================

export const formatExpiryDate = (mm: number, yyyy: number): string => {
  return format(new Date(yyyy, mm - 1), "MMM yyyy", { locale: es }).toUpperCase();
};

export const getStatusLabel = (status: ExpiryStatus): string => {
  switch (status) {
    case ExpiryStatus.EXPIRED: return 'VENCIDO';
    case ExpiryStatus.CRITICAL: return 'CRÍTICO';
    case ExpiryStatus.WITHDRAWAL: return 'RETIRAR';
    case ExpiryStatus.NEXT_EXPIRY: return 'PRÓXIMO';
    default: return 'VIGENTE';
  }
};
