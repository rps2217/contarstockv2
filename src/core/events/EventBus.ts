/**
 * EventBus - Sistema de eventos para comunicación desacoplada
 *
 * Permite que componentes se comuniquen sin depender directamente
 * unos de otros, reduciendo el acoplamiento.
 *
 * Patrones implementados:
 * - Observer pattern
 * - Pub/Sub pattern
 * - Event-driven architecture
 */

import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export type EventHandler<T = any> = (payload: T) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  event: string;
  handler: EventHandler;
  once?: boolean;
  priority?: number;
}

export interface EventBusConfig {
  /** Habilitar logging de eventos */
  debug?: boolean;
  /** Máximo de handlers por evento (0 = ilimitado) */
  maxHandlers?: number;
  /** Timeout para handlers asíncronos (ms) */
  handlerTimeout?: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_CONFIG: EventBusConfig = {
  debug: false,
  maxHandlers: 50,
  handlerTimeout: 5000,
};

// ============================================================================
// EVENT BUS
// ============================================================================

class EventBusClass {
  private subscriptions = new Map<string, EventSubscription[]>();
  private config: EventBusConfig;
  private eventHistory: Array<{ event: string; timestamp: number }> = [];
  private readonly MAX_HISTORY = 100;

  constructor(config: Partial<EventBusConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Suscribirse a un evento
   */
  subscribe<T = any>(
    event: string,
    handler: EventHandler<T>,
    options?: { once?: boolean; priority?: number }
  ): () => void {
    const subscription: EventSubscription = {
      id: crypto.randomUUID(),
      event,
      handler: handler as EventHandler,
      once: options?.once,
      priority: options?.priority ?? 0,
    };

    const current = this.subscriptions.get(event) || [];

    // Verificar límite
    if (this.config.maxHandlers && current.length >= this.config.maxHandlers) {
      logger.warn('EventBus', `Max handlers reached for event: ${event}`);
    }

    // Agregar y ordenar por prioridad
    current.push(subscription);
    current.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    this.subscriptions.set(event, current);

    this.log('subscribe', { event, handlerId: subscription.id });

    // Retornar función de unsubscribe
    return () => this.unsubscribe(subscription.id, event);
  }

  /**
   * Suscribirse solo una vez
   */
  once<T = any>(event: string, handler: EventHandler<T>): () => void {
    return this.subscribe(event, handler, { once: true });
  }

  /**
   * Publicar un evento
   */
  async publish<T = any>(event: string, payload?: T): Promise<void> {
    this.log('publish', { event, payload });

    // Registrar en historial
    this.eventHistory.push({ event, timestamp: Date.now() });
    if (this.eventHistory.length > this.MAX_HISTORY) {
      this.eventHistory.shift();
    }

    const subscriptions = this.subscriptions.get(event) || [];
    const toRemove: string[] = [];

    // Ejecutar handlers
    await Promise.all(
      subscriptions.map(async sub => {
        try {
          await this.executeHandler(sub, payload);

          if (sub.once) {
            toRemove.push(sub.id);
          }
        } catch (error) {
          logger.error('EventBus', `Handler error for ${event}`, {
            error,
            handlerId: sub.id,
          });
        }
      })
    );

    // Limpiar subscriptions de una vez
    toRemove.forEach(id => this.removeSubscription(id, event));
  }

  /**
   * Ejecutar un handler con timeout
   */
  private async executeHandler<T>(subscription: EventSubscription, payload?: T): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        logger.warn('EventBus', `Handler timeout for ${subscription.event}`, {
          handlerId: subscription.id,
        });
        resolve(); // No rechazar por timeout
      }, this.config.handlerTimeout || 5000);

      try {
        const result = subscription.handler(payload);

        if (result instanceof Promise) {
          result
            .then(() => {
              clearTimeout(timeout);
              resolve();
            })
            .catch(error => {
              clearTimeout(timeout);
              reject(error);
            });
        } else {
          clearTimeout(timeout);
          resolve();
        }
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Desuscribirse
   */
  unsubscribe(id: string, event?: string): void {
    if (event) {
      this.removeSubscription(id, event);
    } else {
      // Remover de todos los eventos
      this.subscriptions.forEach((subs, evt) => {
        this.removeSubscription(id, evt);
      });
    }
  }

  /**
   * Remover subscription específica
   */
  private removeSubscription(id: string, event: string): void {
    const current = this.subscriptions.get(event) || [];
    const filtered = current.filter(sub => sub.id !== id);

    if (filtered.length === 0) {
      this.subscriptions.delete(event);
    } else {
      this.subscriptions.set(event, filtered);
    }

    this.log('unsubscribe', { event, id });
  }

  /**
   * Limpiar todas las suscripciones de un evento
   */
  clear(event?: string): void {
    if (event) {
      this.subscriptions.delete(event);
      this.log('clear', { event });
    } else {
      this.subscriptions.clear();
      this.log('clear', { all: true });
    }
  }

  /**
   * Obtener número de suscriptores
   */
  getSubscriberCount(event?: string): number {
    if (event) {
      return this.subscriptions.get(event)?.length || 0;
    }

    let total = 0;
    this.subscriptions.forEach(subs => {
      total += subs.length;
    });
    return total;
  }

  /**
   * Obtener historial de eventos
   */
  getHistory(limit = 20): Array<{ event: string; timestamp: number }> {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Configurar EventBus
   */
  configure(config: Partial<EventBusConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Logging
   */
  private log(action: string, data: unknown): void {
    if (this.config.debug) {
      logger.debug('EventBus', action, data);
    }
  }
}

// ============================================================================
// EVENTOS PREDEFINIDOS
// ============================================================================

export const AppEvents = {
  // counting
  COUNT_STARTED: 'count:started',
  COUNT_FINISHED: 'count:finished',
  COUNT_ITEM_ADDED: 'count:item-added',
  COUNT_ITEM_UPDATED: 'count:item-updated',
  COUNT_DISCREPANCY: 'count:discrepancy',

  // sync
  SYNC_STARTED: 'sync:started',
  SYNC_COMPLETED: 'sync:completed',
  SYNC_FAILED: 'sync:failed',
  SYNC_PROGRESS: 'sync:progress',
  SYNC_QUEUE_CHANGED: 'sync:queue-changed',

  // ui
  THEME_CHANGED: 'ui:theme-changed',
  LOCATION_CHANGED: 'ui:location-changed',
  MODAL_OPENED: 'ui:modal-opened',
  MODAL_CLOSED: 'ui:modal-closed',

  // errors
  ERROR_OCCURRED: 'error:occurred',
  ERROR_RECOVERED: 'error:recovered',

  // session
  SESSION_EXPIRED: 'session:expired',
  SESSION_RESTORED: 'session:restored',
  SESSION_LOCK_ACQUIRED: 'session:lock-acquired',
  SESSION_LOCK_RELEASED: 'session:lock-released',
  SESSION_LOCK_FORCED: 'session:lock-forced',

  // snapshots
  SNAPSHOT_CREATED: 'snapshot:created',
  SNAPSHOT_RESTORED: 'snapshot:restored',
} as const;

// ============================================================================
// EXPORT
// ============================================================================

export const EventBus = new EventBusClass();

export default EventBus;
