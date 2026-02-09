
import { pipeline, env } from '@xenova/transformers';

// Configuración para entorno web estricto
env.allowLocalModels = false;
env.useBrowserCache = true;

type BrainStatus = 'idle' | 'downloading' | 'ready' | 'error';
type StatusListener = (status: BrainStatus, progress: number) => void;

class LocalBrainService {
    private pipe: any = null;
    private modelName = 'Xenova/all-MiniLM-L6-v2';
    private status: BrainStatus = 'idle';
    private progress: number = 0;
    private listeners: Set<StatusListener> = new Set();

    constructor() {
        // Verificar si ya tenemos el modelo en caché al iniciar (estimación)
        this.checkCache();
    }

    private async checkCache() {
        // Simple verificación de estado inicial
        if (this.pipe) {
            this.updateStatus('ready', 100);
        }
    }

    public subscribe(listener: StatusListener) {
        this.listeners.add(listener);
        listener(this.status, this.progress); // Emitir estado actual al suscribirse
        return () => this.listeners.delete(listener);
    }

    private updateStatus(status: BrainStatus, progress: number) {
        this.status = status;
        this.progress = progress;
        this.listeners.forEach(l => l(status, progress));
    }

    async init() {
        if (this.pipe) return;
        if (this.status === 'downloading') return;

        this.updateStatus('downloading', 0);
        
        try {
            console.log(`[LocalBrain] Iniciando descarga de modelo ${this.modelName}...`);
            
            this.pipe = await pipeline('feature-extraction', this.modelName, {
                progress_callback: (data: any) => {
                    if (data.status === 'progress') {
                        // El progreso viene por archivos (shard), normalizamos un poco
                        const p = data.progress || 0;
                        this.updateStatus('downloading', Math.round(p));
                    } else if (data.status === 'done') {
                        // Un archivo completado
                    }
                }
            });
            
            console.log(`[LocalBrain] Motor listo y cargado en memoria.`);
            this.updateStatus('ready', 100);
        } catch (e) {
            console.error("[LocalBrain] Error fatal cargando modelo:", e);
            this.updateStatus('error', 0);
            throw e;
        }
    }

    async embed(text: string): Promise<number[] | null> {
        if (!text || text.trim().length < 2) return null;
        
        try {
            if (!this.pipe) await this.init();
            
            const output = await this.pipe(text, { pooling: 'mean', normalize: true });
            const vector = Array.from(output.data) as number[];
            // Reducir precisión a 4 decimales para optimizar almacenamiento
            return vector.map(n => Number(n.toFixed(4)));
        } catch (e) {
            console.error(`[LocalBrain] Error vectorizando:`, e);
            return null;
        }
    }
    
    public getStatus() {
        return { status: this.status, progress: this.progress };
    }
}

export const localBrain = new LocalBrainService();
