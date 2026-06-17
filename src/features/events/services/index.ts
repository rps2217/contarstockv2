/**
 * Event Services - Módulos para gestión de eventos
 */

// Sync services
export {
  fetchInitialEventData,
  startEventRealtimeSync,
  syncEvent,
  deleteEventRemote,
  type EventSyncResult,
} from './eventSyncService';

// Processor services
export {
  processEventRecord,
  processEventsBatch,
  filterEventsBySearch,
  filterEventsByDateRange,
  type ProcessedEvent,
} from './eventProcessor';
