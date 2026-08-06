/**
 * Core - Exports centrales
 *
 * Arquitectura limpia con eventos para comunicación desacoplada.
 */

// Events
export { EventBus, AppEvents } from './events/EventBus';
export type { EventHandler, EventSubscription, EventBusConfig } from './events/EventBus';
