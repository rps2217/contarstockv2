/**
 * Core - Exports centrales
 *
 * Arquitectura limpia con inversión de control y eventos.
 */

// Events
export { EventBus, AppEvents } from './events/EventBus';
export type { EventHandler, EventSubscription, EventBusConfig } from './events/EventBus';

// DI
export { Container } from './di/Container';
export { Injectable, Inject } from './di/Container';
export type {
  Factory,
  Resolver,
  Registration,
  ContainerConfig,
  ContainerType,
} from './di/Container';

// Error Recovery
export { ErrorRecoveryService } from './domain/ErrorRecoveryService';
export type {
  RecoveryStrategy,
  RetryConfig,
  RecoveryConfig,
  RecoveryResult,
} from './domain/ErrorRecoveryService';
