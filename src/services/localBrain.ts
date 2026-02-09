
import { pipeline, env } from '@xenova/transformers';

// Configuración para evitar que intente cargar modelos desde el FS local (Node) y use CDN
env.allowLocalModels = false;
env.useBrowserCache = true;

class LocalBrainService {
    private pipe: any = null;
    private modelName = 'Xenova/all-MiniLM-L6-v2'; // Modelo optimizado para similitud semántica (pequeño y rápido)
    private isLoading = false;

    /**
     * Inicializa el modelo. Si ya está en caché del navegador, carga instantáneo.
     * Si no, descarga los pesos (~23MB) una sola vez.
     */
    async init() {
        if (this.pipe) return;
        if (this.isLoading) {
            // Esperar si ya se está cargando
            while (this.isLoading) {
                await new Promise(r => setTimeout(r, 100));
            }
            return;
        }

        this.isLoading = true;
        try {
            console.log(`[LocalBrain] Inicializando Motor Neural (${this.modelName})...`);
            // 'feature-extraction' es la tarea para generar embeddings
            this.pipe = await pipeline('feature-extraction', this.modelName);
            console.log(`[LocalBrain] Motor listo. Ejecutando localmente.`);
        } catch (e) {
            console.error("[LocalBrain] Fallo al cargar modelo local:", e);
            throw e;
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Genera un vector numérico que representa el significado del texto.
     * Funciona 100% Offline.
     */
    async embed(text: string): Promise<number[] | null> {
        if (!text || text.trim().length < 2) return null;
        
        try {
            await this.init();
            
            // Generar embedding. Pooling 'mean' y normalización para mejor comparación de coseno.
            const output = await this.pipe(text, { pooling: 'mean', normalize: true });
            
            // Convertir Tensor a Array normal de JS
            const vector = Array.from(output.data) as number[];
            
            // Reducir precisión a 4 decimales para ahorrar espacio en DB y Cloud sin perder mucha precisión
            return vector.map(n => Number(n.toFixed(4)));
        } catch (e) {
            console.error(`[LocalBrain] Error vectorizando "${text}":`, e);
            return null;
        }
    }
}

export const localBrain = new LocalBrainService();
