
import { differenceInCalendarDays, startOfDay, addDays, isPast } from 'date-fns';

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
 * Optimizado para industria retail: mayor penalización si se acerca a la fecha de retiro sin canje.
 */
const calculateRiskScore = (daysLeft: number, quantity: number, hasCanje: boolean, withdrawalDays: number): number => {
  if (daysLeft < 0) return 100; // Vencido = Riesgo máximo absoluto
  
  const daysToWithdrawal = daysLeft - withdrawalDays;
  
  let timeScore = 0;
  if (daysToWithdrawal <= 0) {
    // Ya está en ventana de retiro
    timeScore = 60 + Math.min(20, (Math.abs(daysToWithdrawal) / withdrawalDays) * 20); 
    // Máximo 80 puntos por tiempo si ya se debió retirar
  } else if (daysToWithdrawal <= 90) {
    // Acercándose a la ventana de retiro (0 a 90 días)
    timeScore = 60 * (1 - (daysToWithdrawal / 90)); // Ponderación lineal ascendente
  }
  
  // Si no tiene política de canje, el riesgo financiero es mucho mayor
  const commercialScore = hasCanje ? 0 : 25; 
  
  // Volumen: A mayor cantidad, mayor riesgo de no poder drenarlo
  const volumeScore = Math.min(15, (quantity || 1) * 0.5);
  
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
  // differenceInCalendarDays evita problemas con los cambios de horario de verano (DST)
  const daysLeft = differenceInCalendarDays(startOfDay(expiryDate), today);
  const withdrawalDays = policy.withdrawalDays ?? 30;
  const withdrawalDate = addDays(startOfDay(expiryDate), -withdrawalDays);
  
  const daysToWithdrawal = daysLeft - withdrawalDays;

  const riskScore = calculateRiskScore(daysLeft, quantity, policy.hasCanje, withdrawalDays);
  const lifePercent = Math.max(0, Math.min(100, (daysLeft / 730) * 100)); // Usamos 730 días (2 años) como vida máxima ideal

  let status = ExpiryStatus.SAFE;
  let label = 'VIGENTE';

  if (daysLeft < 0) {
    status = ExpiryStatus.EXPIRED;
    label = 'VENCIDO';
  } else if (daysLeft <= withdrawalDays) {
    // Si ya estamos en o pasamos la fecha de retiro
    // Si está demasiado cerca del vencimiento (ej. menos del 30% del tiempo de retiro o 15 días) 
    // o no hay canje, es nivel CRÍTICO.
    if (daysLeft <= Math.max(15, withdrawalDays * 0.3) || (!policy.hasCanje && daysLeft <= 30)) {
      status = ExpiryStatus.CRITICAL;
      label = 'CRÍTICO';
    } else {
      status = ExpiryStatus.WITHDRAWAL;
      label = 'RETIRAR';
    }
  } else if (daysToWithdrawal <= 90) {
    // Si nos acercamos a la fecha de retiro (3 meses antes del retiro)
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
