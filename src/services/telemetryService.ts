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
    if ((this as any).disabled) return;
    
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

      // Use a direct call to avoid circular logging via firebaseSyncService -> logger -> telemetry
      const { error } = await (await import('../lib/supabase')).supabase
        .from('TELEMETRIA')
        .insert(rows);
        
      if (error) {
        // If table doesn't exist, we don't want to spam the console
        if (error.code === '42P01' || error.message?.includes('schema cache') || error.code === 'PGRST116' || error.message?.includes('404')) {
          console.warn('[TelemetryService] Table TELEMETRIA not found. Disabling telemetry.');
          this.buffer = [];
          if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
          }
          // Mark as disabled to avoid further tracks
          (this as any).disabled = true;
          return;
        }
        throw error;
      }
    } catch (err: any) {
      console.warn('[TelemetryService] Silent flush failure (prevents circular logging):', err.message);
    }
  }
}

export const telemetry = new TelemetryService();

// Forced GitHub sync
