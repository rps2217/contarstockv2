/**
 * RFIDService - Integración con lectores RFID
 *
 * Proporciona lectura de tags RFID para conteo masivo.
 * Soporta:
 * - Lectores Web Serial API (Chrome/Edge)
 * - Simulación de lecturas
 * - Validación contra inventario esperado
 *
 * NOTA: Requiere hardware de lector RFID compatible con Web Serial API.
 */

import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

// Web Serial API types (simplified for compilation)
type _SerialPort = any;
type _Serial = any;

export type RFIDReaderStatus = 'disconnected' | 'connecting' | 'connected' | 'reading' | 'error';

export interface RFIDTag {
  id: string;
  epc: string; // Electronic Product Code
  tid?: string; // Tag ID
  rssi?: number; // Signal strength
  frequency?: number; // MHz
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface RFIDReaderConfig {
  /** Baud rate para conexión serial */
  baudRate: number;
  /** Puerto serie */
  port?: string;
  /** Auto-conectar al iniciar */
  autoConnect: boolean;
  /** Modo de lectura: 'single' | 'continuous' */
  readMode: 'single' | 'continuous';
  /** Intervalo de lectura (ms) */
  readInterval: number;
  /** Filtrar tags duplicados */
  filterDuplicates: boolean;
  /** Tiempo para considerar duplicado (ms) */
  duplicateWindow: number;
}

export interface RFIDReaderState {
  status: RFIDReaderStatus;
  isConnected: boolean;
  tagsRead: number;
  lastTag: RFIDTag | null;
  error: string | null;
}

interface RFIDReaderCallbacks {
  onTagRead?: (tag: RFIDTag) => void;
  onTagsBatch?: (tags: RFIDTag[]) => void;
  onStatusChange?: (status: RFIDReaderStatus) => void;
  onError?: (error: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_CONFIG: RFIDReaderConfig = {
  baudRate: 115200,
  autoConnect: false,
  readMode: 'continuous',
  readInterval: 100,
  filterDuplicates: true,
  duplicateWindow: 2000,
};

// ============================================================================
// SERVICIO
// ============================================================================

class RFIDServiceClass {
  private config: RFIDReaderConfig;
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private isReading = false;
  private readTimer: ReturnType<typeof setInterval> | null = null;
  private callbacks: RFIDReaderCallbacks = {};
  private state: RFIDReaderState = {
    status: 'disconnected',
    isConnected: false,
    tagsRead: 0,
    lastTag: null,
    error: null,
  };
  private recentTags = new Map<string, number>();

  constructor(config: Partial<RFIDReaderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Verificar soporte del navegador
   */
  isSupported(): boolean {
    return 'serial' in navigator;
  }

  /**
   * Obtener puertos disponibles
   */
  async getPorts(): Promise<any[]> {
    if (!this.isSupported()) {
      logger.warn('RFID', 'Web Serial API not supported');
      return [];
    }

    try {
      const ports = await (navigator as any).serial?.getPorts();
      return ports || [];
    } catch (error) {
      logger.error('RFID', 'Error getting ports', { error });
      return [];
    }
  }

  /**
   * Solicitar conexión a puerto
   */
  async requestPort(): Promise<boolean> {
    if (!this.isSupported()) {
      this.updateState({ status: 'error', error: 'Web Serial API no soportado' });
      return false;
    }

    try {
      this.port = await (navigator as any).serial?.requestPort();
      return true;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (err.name === 'NotFoundError') {
        logger.debug('RFID', 'No port selected');
      } else {
        logger.error('RFID', 'Error requesting port', { error });
        this.updateState({ status: 'error', error: err.message });
      }
      return false;
    }
  }

  /**
   * Conectar al lector
   */
  async connect(port?: any): Promise<boolean> {
    const targetPort = port || this.port;

    if (!targetPort) {
      const requested = await this.requestPort();
      if (!requested) return false;
    }

    this.updateState({ status: 'connecting' });

    try {
      const selectedPort = port || this.port;
      await selectedPort.open({ baudRate: this.config.baudRate });

      this.port = selectedPort;
      this.reader = selectedPort.readable?.getReader();
      this.writer = selectedPort.writable?.getWriter();

      this.updateState({
        status: 'connected',
        isConnected: true,
        error: null,
      });

      this.callbacks.onConnect?.();
      logger.info('RFID', 'Connected to reader');

      // Iniciar lectura si está en modo continuo
      if (this.config.readMode === 'continuous') {
        this.startReading();
      }

      return true;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('RFID', 'Connection failed', { error });
      this.updateState({
        status: 'error',
        error: err.message,
      });
      this.callbacks.onError?.(err.message);
      return false;
    }
  }

  /**
   * Desconectar del lector
   */
  async disconnect(): Promise<void> {
    this.stopReading();

    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }

      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.updateState({
        status: 'disconnected',
        isConnected: false,
      });

      this.callbacks.onDisconnect?.();
      logger.info('RFID', 'Disconnected from reader');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('RFID', 'Disconnect error', { error });
      this.updateState({ error: err.message });
    }
  }

  /**
   * Iniciar lectura continua
   */
  startReading(): void {
    if (this.isReading) return;
    this.isReading = true;
    this.updateState({ status: 'reading' });

    this.readTimer = setInterval(() => {
      this.readTags();
    }, this.config.readInterval);

    logger.debug('RFID', 'Started continuous reading');
  }

  /**
   * Detener lectura
   */
  stopReading(): void {
    this.isReading = false;

    if (this.readTimer) {
      clearInterval(this.readTimer);
      this.readTimer = null;
    }

    if (this.state.status === 'reading') {
      this.updateState({ status: 'connected' });
    }

    logger.debug('RFID', 'Stopped reading');
  }

  /**
   * Leer tags (implementación simulada para demo)
   */
  private async readTags(): Promise<void> {
    if (!this.reader || !this.state.isConnected) return;

    try {
      const { value, done } = await this.reader.read();

      if (done) {
        await this.disconnect();
        return;
      }

      // Parsear datos del lector
      const tags = this.parseTagData(value);

      if (tags.length > 0) {
        this.processTags(tags);
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (err.name !== 'AbortError') {
        logger.error('RFID', 'Read error', { error });
        this.updateState({ error: err.message });
      }
    }
  }

  /**
   * Procesar tags leídos
   */
  private processTags(tags: RFIDTag[]): void {
    const newTags: RFIDTag[] = [];

    for (const tag of tags) {
      // Filtrar duplicados
      if (this.config.filterDuplicates) {
        const lastRead = this.recentTags.get(tag.epc);
        const now = Date.now();

        if (lastRead && now - lastRead < this.config.duplicateWindow) {
          continue;
        }

        this.recentTags.set(tag.epc, now);
      }

      newTags.push(tag);
      this.state.tagsRead++;
    }

    // Limpiar tags antiguos del buffer
    const now = Date.now();
    for (const [epc, timestamp] of this.recentTags.entries()) {
      if (now - timestamp > this.config.duplicateWindow * 2) {
        this.recentTags.delete(epc);
      }
    }

    if (newTags.length > 0) {
      this.updateState({ lastTag: newTags[newTags.length - 1] });
      this.callbacks.onTagsBatch?.(newTags);
      newTags.forEach(tag => this.callbacks.onTagRead?.(tag));
    }
  }

  /**
   * Parsear datos crudos del lector
   */
  private parseTagData(data: Uint8Array): RFIDTag[] {
    // Implementación básica - ajustar según protocolo del lector
    const text = new TextDecoder().decode(data);
    const tags: RFIDTag[] = [];

    // Formato típico: "EPC:1234567890,RSSI:-45\n"
    const lines = text.split('\n').filter(l => l.trim());

    for (const line of lines) {
      const epcMatch = line.match(/EPC:([A-F0-9]+)/i);
      const rssiMatch = line.match(/RSSI:(-?\d+)/i);

      if (epcMatch) {
        tags.push({
          id: crypto.randomUUID(),
          epc: epcMatch[1],
          rssi: rssiMatch ? parseInt(rssiMatch[1]) : undefined,
          timestamp: Date.now(),
        });
      }
    }

    return tags;
  }

  /**
   * Simular lectura (para testing/demo)
   */
  simulateTag(epc?: string): RFIDTag {
    const tag: RFIDTag = {
      id: crypto.randomUUID(),
      epc: epc || `DEMO-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      rssi: Math.floor(Math.random() * 30) - 70,
      timestamp: Date.now(),
    };

    this.processTags([tag]);
    return tag;
  }

  /**
   * Registrar callbacks
   */
  on(callbacks: RFIDReaderCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Actualizar estado
   */
  private updateState(partial: Partial<RFIDReaderState>): void {
    this.state = { ...this.state, ...partial };
    this.callbacks.onStatusChange?.(this.state.status);
  }

  /**
   * Obtener estado actual
   */
  getState(): RFIDReaderState {
    return { ...this.state };
  }

  /**
   * Obtener configuración
   */
  getConfig(): RFIDReaderConfig {
    return { ...this.config };
  }

  /**
   * Actualizar configuración
   */
  updateConfig(config: Partial<RFIDReaderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Limpiar buffer de tags
   */
  clearBuffer(): void {
    this.recentTags.clear();
    this.state.tagsRead = 0;
    this.state.lastTag = null;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const RFIDService = new RFIDServiceClass();

export default RFIDService;
