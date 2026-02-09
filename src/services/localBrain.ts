
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

    constructor() {
        // Verificar si ya está cargado (por si hubo hot-reload)
        if (this.pipe) this.updateStatus('ready', 100);
    }

    public subscribe(listener: StatusListener) {
        this.listeners.add(listener);
        // Emitir estado actual inmediatamente al suscribirse
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
     * Inicia la descarga del modelo.
     * Prioriza el archivo .onnx para la barra de progreso principal.
     */
    async init() {
        if (this.pipe) return;
        if (this.status === 'downloading') return;

        this.updateStatus('downloading', 0, 'Iniciando...');
        
        try {
            console.log(`[LocalBrain] Iniciando descarga de ${this.modelName}...`);
            
            this.pipe = await pipeline('feature-extraction', this.modelName, {
                progress_callback: (data: any) => {
                    if (data.status === 'progress') {
                        // Solo actualizamos la barra con el archivo del modelo principal o el progreso general
                        // Filtramos archivos pequeños (config.json) para evitar saltos raros en la barra
                        if (data.file.includes('onnx') || data.file.includes('model')) {
                            this.updateStatus('downloading', Math.round(data.progress || 0), 'Descargando Motor Neural...');
                        }
                    } else if (data.status === 'done') {
                        // Archivo parcial completado
                    } else if (data.status === 'initiate') {
                        this.updateStatus('downloading', 0, `Conectando: ${data.file}`);
                    }
                }
            });
            
            console.log(`[LocalBrain] Motor listo.`);
            this.updateStatus('ready', 100, 'Motor Activo');
        } catch (e: any) {
            console.error("[LocalBrain] Error fatal:", e);
            this.updateStatus('error', 0, e.message);
            throw e;
        }
    }

    async embed(text: string): Promise<number[] | null> {
        if (!text || text.trim().length < 2) return null;
        
        try {
            if (!this.pipe) await this.init();
            
            // Generar embedding
            const output = await this.pipe(text, { pooling: 'mean', normalize: true });
            const vector = Array.from(output.data) as number[];
            
            // Reducir precisión a 4 decimales para optimizar almacenamiento DB
            return vector.map(n => Number(n.toFixed(4)));
        } catch (e) {
            console.error(`[LocalBrain] Error procesando "${text}":`, e);
            return null;
        }
    }
    
    public getStatus() {
        return { status: this.status, progress: this.progress };
    }
}

export const localBrain = new LocalBrainService();
