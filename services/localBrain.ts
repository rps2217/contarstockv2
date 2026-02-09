
import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

type BrainStatus = 'idle' | 'downloading' | 'ready' | 'error';
type StatusListener = (status: BrainStatus, progress: number, details?: string) => void;

class LocalBrainService {
    private pipe: any = null;
    private modelName = 'Xenova/all-MiniLM-L6-v2';
    private status: BrainStatus = 'idle';
    private progress: number = 0;
    private details: string = '';
    private listeners: Set<StatusListener> = new Set();
    private STORAGE_KEY = 'logicount_brain_installed';

    constructor() {
        // En lugar de init inmediato, esperamos a que el navegador esté libre
        if (typeof window !== 'undefined') {
            if (localStorage.getItem(this.STORAGE_KEY) === 'true') {
                if ('requestIdleCallback' in window) {
                    (window as any).requestIdleCallback(() => this.init(true));
                } else {
                    setTimeout(() => this.init(true), 3000);
                }
            }
        }
    }

    public subscribe(listener: StatusListener) {
        this.listeners.add(listener);
        listener(this.status, this.progress, this.details);
        return () => this.listeners.delete(listener);
    }

    private updateStatus(status: BrainStatus, progress: number, details: string = '') {
        this.status = status;
        this.progress = progress;
        this.details = details;
        this.listeners.forEach(l => l(status, progress, details));
    }

    async init(silent = false) {
        if (this.pipe || this.status === 'downloading') return;

        if (!silent) this.updateStatus('downloading', 0, 'Iniciando IA...');
        
        try {
            this.pipe = await pipeline('feature-extraction', this.modelName, {
                progress_callback: (data: any) => {
                    if (data.status === 'progress' && !silent) {
                        if (data.file.includes('onnx') || data.file.includes('model')) {
                            this.updateStatus('downloading', Math.round(data.progress || 0), 'Optimizando Cerebro...');
                        }
                    }
                }
            });
            
            localStorage.setItem(this.STORAGE_KEY, 'true');
            this.updateStatus('ready', 100, 'IA Activa');
        } catch (e: any) {
            console.error("[LocalBrain] Falló inicialización:", e);
            if (!silent) this.updateStatus('error', 0, e.message);
            else this.status = 'idle';
        }
    }

    async embed(text: string): Promise<number[] | null> {
        if (!text || text.trim().length < 2) return null;
        try {
            if (!this.pipe) await this.init(false);
            const output = await this.pipe(text, { pooling: 'mean', normalize: true });
            const vector = Array.from(output.data) as number[];
            return vector.map(n => Number(n.toFixed(4)));
        } catch (e) {
            return null;
        }
    }
    
    public getStatus() {
        return { status: this.status, progress: this.progress };
    }
}

export const localBrain = new LocalBrainService();
