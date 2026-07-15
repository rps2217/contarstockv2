import { logger } from '@/services/logger';
import { handleError } from './types';
import { getSettings } from './settings';

// Lazy loading del módulo de transformers
let transformersModule: any = null;

async function loadTransformers() {
  if (!transformersModule) {
    transformersModule = await import('@xenova/transformers');
    // Configuración de entorno para máximo rendimiento local
    transformersModule.env.allowLocalModels = false;
    transformersModule.env.useBrowserCache = true;
  }
  return transformersModule;
}

type BrainStatus = 'idle' | 'downloading' | 'ready' | 'error' | 'disabled';
type StatusListener = (status: BrainStatus, progress: number, details?: string) => void;

class LocalBrainService {
  private pipe: any = null;
  private modelName = 'Xenova/all-MiniLM-L6-v2';
  private status: BrainStatus = 'idle';
  private progress: number = 0;
  private details: string = '';
  private listeners: Set<StatusListener> = new Set();
  private STORAGE_KEY = 'logicount_brain_installed';
  private initPromise: Promise<void> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem(this.STORAGE_KEY) === 'true') {
        const idleHandler = () => { this.init(true); };
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(idleHandler, { timeout: 10000 });
        } else {
          setTimeout(idleHandler, 5000);
        }
      }
    }
  }

  public subscribe(listener: StatusListener) {
    this.listeners.add(listener);
    listener(this.status, this.progress, this.details);
    return () => { this.listeners.delete(listener); };
  }

  private updateStatus(status: BrainStatus, progress: number, details: string = '') {
    this.status = status;
    this.progress = progress;
    this.details = details;
    this.listeners.forEach(l => l(status, progress, details));
  }

  async init(silent = false) {
    const settings = getSettings();
    if (settings.lowEndMode) {
      this.updateStatus('disabled', 0, 'Modo Bajo Rendimiento');
      return;
    }
    if (this.pipe) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!silent) this.updateStatus('downloading', 0, 'Iniciando IA...');
      try {
        const transformers = await loadTransformers();
        this.pipe = await transformers.pipeline('feature-extraction', this.modelName, {
          progress_callback: (data: any) => {
            if (data.status === 'progress' && !silent) {
              if (data.file.includes('onnx') || data.file.includes('model')) {
                this.updateStatus('downloading', Math.round(data.progress || 0), 'Asimilando...');
              }
            }
          }
        });
        localStorage.setItem(this.STORAGE_KEY, 'true');
        this.updateStatus('ready', 100, 'IA Activa');
      } catch (err: unknown) {
        const error = handleError(err, 'LocalBrain_INIT');
        console.error("[LocalBrain] Init Failed:", error.message);
        this.initPromise = null;
        if (!silent) this.updateStatus('error', 0, error.message);
        else this.status = 'idle';
      }
    })();
    return this.initPromise;
  }

  async embed(text: string): Promise<number[] | null> {
    const settings = getSettings();
    if (settings.lowEndMode) return null;
    if (!text || text.trim().length < 2) return null;
    try {
      if (!this.pipe) await this.init(false);
      if (!this.pipe) return null;
      const output = await this.pipe(text, { pooling: 'mean', normalize: true });
      const dataArray = Array.from(output.data as Float32Array);
      return dataArray.map((n: number) => Number(n.toFixed(4)));
    } catch (e) {
      return null;
    }
  }
}

export const localBrain = new LocalBrainService();
