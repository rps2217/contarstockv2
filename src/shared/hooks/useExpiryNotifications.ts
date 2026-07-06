/**
 * useExpiryNotifications - Hook para notificaciones de vencimiento
 * 
 * Muestra toasts cuando hay productos próximos a vencer o vencidos.
 */

import { useEffect, useRef } from 'react';
import { useExpiryTracker, ExpiryEntry } from '@/features/counting/hooks/useExpiryTracker';
import { toast } from 'sonner';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';

const MONTHS_ES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface NotificationConfig {
  enabled: boolean;
  notifyOnExpiringDays: number[]; // Días antes de vencer para notificar
  notifyOnExpired: boolean;
  debounceMs: number;
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  notifyOnExpiringDays: [7, 30], // Notificar 7 y 30 días antes
  notifyOnExpired: true,
  debounceMs: 60000 // No mostrar la misma notificación más de una vez por minuto
};

export const useExpiryNotifications = (config: Partial<NotificationConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { useExpiringSoon, useExpired } = useExpiryTracker();
  
  const expiringSoon = useExpiringSoon(3); // 3 meses
  const expired = useExpired();
  
  const lastNotifiedRef = useRef<number>(0);
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  const getDaysUntilExpiry = (mm: number, yyyy: number): number => {
    const now = new Date();
    const expiry = new Date(yyyy, mm - 1, 1);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const shouldNotify = (entry: ExpiryEntry): boolean => {
    if (!finalConfig.enabled) return false;
    
    const now = Date.now();
    if (now - lastNotifiedRef.current < finalConfig.debounceMs) return false;
    if (notifiedIdsRef.current.has(entry.claveUnica)) return false;
    
    return true;
  };

  const markAsNotified = (entry: ExpiryEntry) => {
    notifiedIdsRef.current.add(entry.claveUnica);
    lastNotifiedRef.current = Date.now();
    
    // Limpiar después de 5 minutos
    setTimeout(() => {
      notifiedIdsRef.current.delete(entry.claveUnica);
    }, 5 * 60 * 1000);
  };

  const showExpiryNotification = (entry: ExpiryEntry, daysUntil: number) => {
    const months_es = MONTHS_ES[entry.mm] || entry.mm;
    
    if (daysUntil <= 0) {
      // Producto vencido
      if (finalConfig.notifyOnExpired) {
        toast.error(`${entry.productName || 'Producto'} ha vencido`, {
          description: `Venció en ${months_es}/${entry.yyyy}`,
          icon: <XCircle className="w-5 h-5 text-red-400" />,
          duration: 8000
        });
      }
    } else if (finalConfig.notifyOnExpiringDays.includes(daysUntil)) {
      // Producto por vencer en días específicos
      toast.warning(`${entry.productName || 'Producto'} por vencer`, {
        description: `Vence en ${daysUntil} días (${months_es}/${entry.yyyy})`,
        icon: <Clock className="w-5 h-5 text-amber-400" />,
        duration: 6000
      });
    } else if (daysUntil <= 7) {
      // Producto por vencer esta semana
      toast.warning(`${entry.productName || 'Producto'} por vencer`, {
        description: `Vence pronto: ${months_es}/${entry.yyyy}`,
        icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        duration: 5000
      });
    }
  };

  useEffect(() => {
    if (!finalConfig.enabled) return;

    const checkAndNotify = () => {
      // Notificar productos vencidos
      expired?.forEach(entry => {
        if (shouldNotify(entry)) {
          showExpiryNotification(entry, getDaysUntilExpiry(entry.mm, entry.yyyy));
          markAsNotified(entry);
        }
      });

      // Notificar productos por vencer
      expiringSoon?.forEach(entry => {
        if (entry.status !== 'expired') {
          const daysUntil = getDaysUntilExpiry(entry.mm, entry.yyyy);
          if (daysUntil > 0 && daysUntil <= 30) {
            if (shouldNotify(entry)) {
              showExpiryNotification(entry, daysUntil);
              markAsNotified(entry);
            }
          }
        }
      });
    };

    // Verificar cada vez que cambien los datos
    checkAndNotify();
    
    // También verificar periódicamente (cada 5 minutos)
    const interval = setInterval(checkAndNotify, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [expiringSoon, expired, finalConfig.enabled]);

  // Función para mostrar notificación manual
  const notifyExpiry = (entry: ExpiryEntry) => {
    if (!shouldNotify(entry)) return;
    const daysUntil = getDaysUntilExpiry(entry.mm, entry.yyyy);
    showExpiryNotification(entry, daysUntil);
    markAsNotified(entry);
  };

  return {
    expiringSoon,
    expired,
    notifyExpiry,
    getDaysUntilExpiry
  };
};

// Componente wrapper para notificaciones
export const ExpiryNotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useExpiryNotifications();
  return <>{children}</>;
};
