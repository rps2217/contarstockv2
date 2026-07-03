/**
 * useExpiryNotifications - Genera notificaciones de vencimientos próximos
 * 
 * Monitorea la base de datos de vencimientos y genera notificaciones
 * cuando hay productos próximos a vencer o vencidos.
 */

import { useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNotificationCenter } from '@/components/NotificationCenter/NotificationCenter';
import { db } from '@/db';
import { toast } from 'sonner';

const EXPIRY_THRESHOLDS = {
  CRITICAL: 7,   // Días para alerta crítica
  WARNING: 30,    // Días para alerta de atención
};

export function useExpiryNotifications() {
  const { addNotification } = useNotificationCenter();
  const lastNotifiedRef = useRef<string>('');

  // Consultar vencimientos
  const expirations = useLiveQuery(() => db.table('expirations').toArray()) as any[] | undefined;

  useEffect(() => {
    if (!expirations) return;

    // Filtrar vencimientos que requieren atención
    const now = Date.now();
    const criticalItems = expirations.filter(e => {
      const daysLeft = e.daysLeft ?? 0;
      return daysLeft <= EXPIRY_THRESHOLDS.CRITICAL && daysLeft >= 0;
    });

    const expiredItems = expirations.filter(e => (e.daysLeft ?? 0) < 0);
    const warningItems = expirations.filter(e => {
      const daysLeft = e.daysLeft ?? 0;
      return daysLeft > EXPIRY_THRESHOLDS.CRITICAL && daysLeft <= EXPIRY_THRESHOLDS.WARNING;
    });

    // Generar notificación de productos críticos
    if (criticalItems.length > 0) {
      const key = `critical-${criticalItems.length}`;
      if (lastNotifiedRef.current !== key) {
        lastNotifiedRef.current = key;
        
        addNotification({
          type: 'expiry',
          title: '⚠️ Productos próximos a vencer',
          message: `${criticalItems.length} producto${criticalItems.length > 1 ? 's' : ''} vencen en ${EXPIRY_THRESHOLDS.CRITICAL} días o menos`,
          link: '/expiry',
          metadata: { count: criticalItems.length, type: 'critical' }
        });

        // También mostrar toast
        toast.warning(
          `${criticalItems.length} producto${criticalItems.length > 1 ? 's' : ''} próximo${criticalItems.length > 1 ? 's' : ''} a vencer`,
          { description: 'Revisa la sección de vencimientos' }
        );
      }
    }

    // Generar notificación de productos vencidos
    if (expiredItems.length > 0) {
      const key = `expired-${expiredItems.length}`;
      if (!lastNotifiedRef.current.startsWith('expired') || lastNotifiedRef.current !== key) {
        lastNotifiedRef.current = key;
        
        addNotification({
          type: 'error',
          title: '🔴 Productos vencidos',
          message: `${expiredItems.length} producto${expiredItems.length > 1 ? 's' : ''} ya vencieron`,
          link: '/expiry',
          metadata: { count: expiredItems.length, type: 'expired' }
        });

        toast.error(
          `${expiredItems.length} producto${expiredItems.length > 1 ? 's' : ''} vencid${expiredItems.length > 1 ? 'os' : 'o'}`,
          { description: 'Requiere atención inmediata' }
        );
      }
    }

    // Generar notificación de atención (warning)
    if (warningItems.length > 0) {
      const key = `warning-${warningItems.length}`;
      if (!lastNotifiedRef.current.startsWith('warning') && lastNotifiedRef.current !== key) {
        lastNotifiedRef.current = key;
        
        addNotification({
          type: 'expiry',
          title: '📅 Revisar vencimientos',
          message: `${warningItems.length} producto${warningItems.length > 1 ? 's' : ''} vencen en ${EXPIRY_THRESHOLDS.WARNING} días`,
          link: '/expiry',
          metadata: { count: warningItems.length, type: 'warning' }
        });
      }
    }

  }, [expirations, addNotification]);

  return {
    expirations,
    criticalCount: expirations?.filter(e => (e.daysLeft ?? 0) <= EXPIRY_THRESHOLDS.CRITICAL && (e.daysLeft ?? 0) >= 0).length ?? 0,
    expiredCount: expirations?.filter(e => (e.daysLeft ?? 0) < 0).length ?? 0,
    warningCount: expirations?.filter(e => {
      const daysLeft = e.daysLeft ?? 0;
      return daysLeft > EXPIRY_THRESHOLDS.CRITICAL && daysLeft <= EXPIRY_THRESHOLDS.WARNING;
    }).length ?? 0,
  };
}
