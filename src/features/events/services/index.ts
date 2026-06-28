/**
 * Event Services - Módulos para gestión de eventos
 *
 * Nota: La sincronización ahora usa genericSyncEngine directamente.
 * Solo se mantienen los servicios de procesamiento.
 */

// Processor services
export {
  processEventRecord,
  processEventsBatch,
  filterEventsBySearch,
  filterEventsByDateRange,
  type ProcessedEvent,
} from './eventProcessor';
