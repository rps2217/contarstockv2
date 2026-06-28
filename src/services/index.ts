/**
 * Services - Exports centralizados
 *
 * Arquitectura Lego: Servicios organizados por dominio
 */

// Analytics
export * from './analytics';

// AI Services
export * from './ai';

// Cloud / Sync Services  
export * from './cloud';
export * from './sync';

// Sync Orchestrator (nuevo punto de entrada)
export { syncOrchestrator } from './sync/SyncOrchestrator';

// Core Services - exports verificados
export { configSyncService } from './configSyncService';
export { dynamicDataService } from './dynamicDataService';
export { InitializationService } from './initializationService';
export { localBrain } from './localBrain';
export { logger } from './logger';

// Constants
export * from './constants';

// Types
export * from './types';
