
import { pipeline, env } from '@xenova/transformers';
import { getSettings } from './settings';

// Configuración de entorno para máximo rendimiento local
env.allowLocalModels = false;
env.useBrowserCache = true;

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
 // Carga diferida agresiva: Esperamos a que la CPU esté libre
 if (localStorage.getItem(this.STORAGE_KEY) === 'true') {
 const idleHandler = () => {
 this.init(true);
 };
 
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
 this.pipe = await pipeline('feature-extraction', this.modelName, {
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
 } catch (e: any) {
 console.error("[LocalBrain] Init Failed:", e);
 this.initPromise = null;
 if (!silent) this.updateStatus('error', 0, e.message);
 else this.status = 'idle';
 }
 })();

 return this.initPromise;
 }

 /**
 * Genera un embedding. Si el modelo no está cargado, lo inicia.
 */
 async embed(text: string): Promise<number[] | null> {
 const settings = getSettings();
 if (settings.lowEndMode) return null;

 if (!text || text.trim().length < 2) return null;
 try {
 if (!this.pipe) await this.init(false);
 
 if (!this.pipe) return null; // Fallback in case init was aborted

 // Forzamos el uso de memoria reducida (Pooling Mean)
 const output = await this.pipe(text, { pooling: 'mean', normalize: true });
 const vector = Array.from(output.data) as number[];
 
 // Redondear dimensiones para ahorrar espacio en IndexedDB
 return vector.map(n => Number(n.toFixed(4)));
 } catch (e) {
 return null;
 }
 }
}

export const localBrain = new LocalBrainService();

// Forced GitHub sync
