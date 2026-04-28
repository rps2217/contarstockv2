
/**
 * LogiCount Core Domain: Expiry Logic
 * Este archivo contiene la lógica PURA de negocio. 
 * NO debe tener dependencias de React ni de Firebase/Supabase.
 */

export enum ExpiryStatus {
  EXPIRED = 'expired',
  CRITICAL = 'critical',
  WITHDRAWAL = 'withdrawal',
  NEXT_EXPIRY = 'next_expiry',
  SAFE = 'safe'
}

export interface ExpiryPolicy {
  withdrawalDays: number; // Días antes para retirar
  hasCanje: boolean;     // Si permite canje
}

export interface ExpiryEvaluation {
  status: ExpiryStatus;
  daysLeft: number;
  lifePercent: number;
  riskScore: number;
  label: string;
  withdrawalDate: Date | null;
}

/**
 * Calcula el puntaje de riesgo (0-100)
 */
const calculateRiskScore = (daysLeft: number, quantity: number, hasCanje: boolean): number => {
  if (daysLeft < 0) return 100;
  
  const timeScore = Math.max(0, 60 - (daysLeft / 3)); 
  const commercialScore = hasCanje ? 10 : 25;
  const volumeScore = Math.min(15, (quantity || 1) * 0.3);
  
  return Math.round(Math.min(100, timeScore + commercialScore + volumeScore));
};

/**
 * Calcula el estado de un producto basado en su fecha de vencimiento y las políticas del proveedor
 */
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
  const daysLeft = differenceInDays(expiryDate, today);
  const withdrawalDays = policy.withdrawalDays || 30;
  const withdrawalDate = addDays(expiryDate, -withdrawalDays);

  const riskScore = calculateRiskScore(daysLeft, quantity, policy.hasCanje);
  const lifePercent = Math.max(0, Math.min(100, (daysLeft / 365) * 100));

  let status = ExpiryStatus.SAFE;
  let label = 'VIGENTE';

  if (isPast(expiryDate)) {
    status = ExpiryStatus.EXPIRED;
    label = 'VENCIDO';
  } else if (daysLeft <= 30) {
    status = ExpiryStatus.CRITICAL;
    label = 'CRÍTICO';
  } else if (withdrawalDate && (isPast(withdrawalDate) || isWithinInterval(withdrawalDate, { 
    start: startOfMonth(today), 
    end: endOfMonth(today) 
  }))) {
    status = ExpiryStatus.WITHDRAWAL;
    label = 'RETIRAR';
  } else if (daysLeft <= 120) {
    status = ExpiryStatus.NEXT_EXPIRY;
    label = 'PRÓXIMO';
  }

  return {
    status,
    daysLeft,
    lifePercent,
    riskScore,
    label,
    withdrawalDate
  };
};

import { differenceInDays, startOfDay, endOfMonth, addDays, isPast, isWithinInterval, startOfMonth } from 'date-fns';
