/**
 * NotificationCenter - Centro de notificaciones centralizado
 * 
 * Gestiona notificaciones push, alertas de sincronización,
 * vencimientos próximos y tareas pendientes.
 */

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  AlertTriangle,
  AlertCircle,
  Info,
  Trash2,
  Clock,
  Package,
  RefreshCw,
  Calendar,
  ChevronRight
} from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'sync' | 'expiry' | 'task';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  link?: string;
  icon?: React.ElementType;
  metadata?: Record<string, any>;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationCenterContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

// ============================================================
// CONTEXTO
// ============================================================

const NotificationCenterContext = createContext<NotificationCenterContextType | null>(null);

export function NotificationCenterProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Notificaciones de ejemplo al cargar (remover en producción)
  useEffect(() => {
    const sampleNotifications: Notification[] = [
      {
        id: '1',
        type: 'expiry',
        title: 'Productos próximos a vencer',
        message: '3 productos vencen en los próximos 7 días',
        timestamp: Date.now() - 3600000,
        read: false,
        link: '/expiry',
        icon: Calendar,
      },
      {
        id: '2',
        type: 'sync',
        title: 'Sincronización completada',
        message: 'Se sincronizaron 45 registros correctamente',
        timestamp: Date.now() - 7200000,
        read: true,
        icon: RefreshCw,
      },
      {
        id: '3',
        type: 'warning',
        title: 'Stock bajo',
        message: '15 productos tienen stock mínimo',
        timestamp: Date.now() - 86400000,
        read: false,
        link: '/inventory',
        icon: Package,
      },
    ];
    setNotifications(sampleNotifications);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Max 50 notifications
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationCenterContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }}>
      {children}
      <NotificationPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
      
    </NotificationCenterContext.Provider>
  );
}

export function useNotificationCenter() {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error('useNotificationCenter must be used within NotificationCenterProvider');
  }
  return context;
}

// ============================================================
// COMPONENTES
// ============================================================

const ICONS: Record<NotificationType, React.ElementType> = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: Check,
  sync: RefreshCw,
  expiry: Calendar,
  task: Clock,
};

const COLORS: Record<NotificationType, { bg: string; text: string; border: string }> = {
  info: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  error: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  success: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  sync: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  expiry: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  task: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotificationCenter();
  const panelRef = useRef<HTMLDivElement>(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const bell = document.getElementById('notification-bell');
        if (!bell?.contains(e.target as Node)) {
          onClose();
        }
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[190]"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-16 right-4 z-[191] w-full max-w-md bg-surface rounded-2xl shadow-2xl border border-subtle overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-subtle">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-white">Notificaciones</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-black bg-amber-500 text-black rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-2 text-muted hover:text-white hover:bg-elevated rounded-lg transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={clearAll}
                  className="p-2 text-muted hover:text-rose-400 hover:bg-elevated rounded-lg transition-colors"
                  title="Limpiar todas"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-muted hover:text-white hover:bg-elevated rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  const Icon = notification.icon || ICONS[notification.type];
                  const colors = COLORS[notification.type];
                  
                  return (
                    <div
                      key={notification.id}
                      className={`relative px-4 py-3 border-b border-subtle hover:bg-elevated/50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-elevated/30' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      {/* Indicador no leído */}
                      {!notification.read && (
                        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-amber-500 rounded-full" />
                      )}
                      
                      <div className="flex items-start gap-3 pl-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.bg}`}>
                          <Icon className={`w-5 h-5 ${colors.text}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className={`font-bold text-sm truncate ${notification.read ? 'text-secondary' : 'text-white'}`}>
                              {notification.title}
                            </h3>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-muted line-clamp-2 mt-0.5">
                            {notification.message}
                          </p>
                          
                          {notification.action && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                notification.action?.onClick();
                              }}
                              className={`mt-2 px-3 py-1 text-xs font-bold rounded-lg ${colors.bg} ${colors.text} hover:opacity-80 transition-opacity`}
                            >
                              {notification.action.label}
                            </button>
                          )}
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeNotification(notification.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-bold text-muted">No hay notificaciones</p>
                  <p className="text-xs text-slate-500 mt-1">Las notificaciones aparecerán aquí</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function NotificationBell() {
  const { unreadCount, open } = useNotificationCenter();

  return (
    <button
      id="notification-bell"
      onClick={open}
      className="relative p-2 text-muted hover:text-white transition-colors"
    >
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.div>
      )}
    </button>
  );
}

// ============================================================
// Hook para crear notificaciones rápidas
// ============================================================

export function useToastNotifications() {
  const { addNotification } = useNotificationCenter();

  return {
    notify: (type: NotificationType, title: string, message: string, options?: Partial<Notification>) => {
      addNotification({ type, title, message, ...options });
    },
    info: (title: string, message: string, options?: Partial<Notification>) => 
      addNotification({ type: 'info', title, message, ...options }),
    warning: (title: string, message: string, options?: Partial<Notification>) => 
      addNotification({ type: 'warning', title, message, ...options }),
    error: (title: string, message: string, options?: Partial<Notification>) => 
      addNotification({ type: 'error', title, message, ...options }),
    success: (title: string, message: string, options?: Partial<Notification>) => 
      addNotification({ type: 'success', title, message, ...options }),
    sync: (title: string, message: string, options?: Partial<Notification>) => 
      addNotification({ type: 'sync', title, message, ...options }),
    expiry: (title: string, message: string, options?: Partial<Notification>) => 
      addNotification({ type: 'expiry', title, message, ...options }),
    task: (title: string, message: string, options?: Partial<Notification>) => 
      addNotification({ type: 'task', title, message, ...options }),
  };
}
