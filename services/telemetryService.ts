import { TelemetryEvent, TelemetryEventType } from '../types';
import { firebaseSyncService } from './firebaseSyncService';

class TelemetryService {
  private buffer: TelemetryEvent[] = [];
  private readonly MAX_BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL = 60000; // 1 minute
  private flushTimer: any = null;
  private deviceInfo: string = '';

  constructor() {
    this.deviceInfo = `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`;
    this.startFlushTimer();
  }

  public track(type: TelemetryEventType, action: string, metadata?: Record<string, any>, duration?: number, batchId?: string) {
    const event: TelemetryEvent = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type,
      action,
      duration,
      metadata,
      operatorId: localStorage.getItem('logicount_operator_id') || 'UNKNOWN',
      batchId,
      deviceInfo: this.deviceInfo
    };

    this.buffer.push(event);

    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(() => this.flush(), this.FLUSH_INTERVAL);
  }

  public async flush() {
    if (this.buffer.length === 0) return;

    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      // Flatten metadata for storage
      const rows = eventsToFlush.map(e => ({
        id: e.id,
        ID: e.id,
        TIMESTAMP: new Date(e.timestamp).toISOString(),
        TIPO: e.type,
        ACCION: e.action,
        DURACION_MS: e.duration || 0,
        OPERADOR: e.operatorId,
        LOTE: e.batchId || '',
        DISPOSITIVO: e.deviceInfo,
        METADATOS: JSON.stringify(e.metadata || {})
      }));

      await firebaseSyncService.pushBatch('TELEMETRIA', rows);
    } catch (err: any) {
      console.error('[TelemetryService] FLUSH_FAIL:', err.message);
    }
  }
}

export const telemetry = new TelemetryService();
