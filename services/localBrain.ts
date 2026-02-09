
import { pipeline, env } from '@xenova/transformers';

// Configuración estricta para entorno Web/PWA
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
        // Si el usuario ya lo instaló antes, intentamos activarlo silenciosamente
        if (typeof window !== 'undefined' && localStorage.getItem(this.STORAGE_KEY) === 'true') {
            this.init(true); 
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

    /**
     * @param silent Si es true, no emite estados de carga pesados a menos que fallen
     */
    async init(silent = false) {
        if (this.pipe) return;
        if (this.status === 'downloading') return;

        if (!silent) this.updateStatus('downloading', 0, 'Iniciando Motor...');
        
        try {
            this.pipe = await pipeline('feature-extraction', this.modelName, {
                progress_callback: (data: any) => {
                    if (data.status === 'progress' && !silent) {
                        if (data.file.includes('onnx') || data.file.includes('model')) {
                            this.updateStatus('downloading', Math.round(data.progress || 0), 'Cargando Red Neuronal...');
                        }
                    }
                }
            });
            
            localStorage.setItem(this.STORAGE_KEY, 'true');
            this.updateStatus('ready', 100, 'Motor Activo');
        } catch (e: any) {
            console.error("[LocalBrain] Error:", e);
            if (!silent) this.updateStatus('error', 0, e.message);
            else this.status = 'idle'; // Reset para permitir reintento manual
        }
    }

    async embed(text: string): Promise<number[] | null> {
        if (!text || text.trim().length < 2) return null;
        
        try {
            if (!this.pipe) await this.init();
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
