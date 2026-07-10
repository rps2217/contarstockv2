/**
 * AI Lazy Loader - Carga diferida de servicios AI
 * 
 * Los módulos de AI (@google/genai, @xenova/transformers) son pesados (~800KB).
 * Este servicio permite cargarlos solo cuando el usuario los necesita,
 * mejorando significativamente el tiempo de carga inicial de la app.
 */

import { handleError } from '../types';
import { logger } from '../logger';

// Estado de carga
export type AILoadState = 'idle' | 'loading' | 'ready' | 'error';

// Servicios cargados dinámicamente
interface AIServices {
  visionService?: typeof import('./visionService').visionService;
  localBrain?: typeof import('../localBrain').localBrain;
}

/**
 * Servicio de lazy loading para módulos AI
 */
class AILazyLoader {
  private state: AILoadState = 'idle';
  private services: AIServices = {};
  private loadPromise: Promise<void> | null = null;
  private listeners: Set<(state: AILoadState) => void> = new Set();

  /**
   * Suscribe un listener a los cambios de estado de carga
   */
  public subscribe(listener: (state: AILoadState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Obtiene el estado actual
   */
  public getState(): AILoadState {
    return this.state;
  }

  /**
   * Verifica si los servicios AI están disponibles
   */
  public isReady(): boolean {
    return this.state === 'ready';
  }

  /**
   * Precarga los módulos AI en background
   * Llama este método cuando quieras iniciar la carga sin bloquear UI
   */
  public preload(): void {
    if (this.state === 'idle' || this.state === 'error') {
      this.load().catch(err => {
        logger.warn('AI_PRELOAD', `Precarga de AI falló: ${handleError(err)}`);
      });
    }
  }

  /**
   * Carga los módulos AI (se asegura que se carguen antes de usar)
   */
  public async load(): Promise<void> {
    // Si ya está listo, retornar inmediatamente
    if (this.state === 'ready') {
      return;
    }

    // Si ya está cargando, esperar a que termine
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.state = 'loading';
    this.notifyListeners();

    this.loadPromise = this.doLoad();
    return this.loadPromise;
  }

  private async doLoad(): Promise<void> {
    try {
      logger.info('AI_LAZY', 'Iniciando carga de módulos AI...');
      const startTime = performance.now();

      // Cargar visionService (Gemini)
      const visionModule = await import('./visionService');
      this.services.visionService = visionModule.visionService;

      // Cargar localBrain (transformers) - solo si está habilitado
      try {
        const brainModule = await import('../localBrain');
        this.services.localBrain = brainModule.localBrain;
      } catch (e) {
        logger.warn('AI_LAZY', 'LocalBrain no disponible');
      }

      const loadTime = performance.now() - startTime;
      logger.info('AI_LAZY', `Módulos AI cargados en ${loadTime.toFixed(0)}ms`);

      this.state = 'ready';
      this.notifyListeners();
    } catch (error) {
      const err = handleError(error);
      logger.error('AI_LAZY', `Error cargando módulos AI: ${err}`);
      this.state = 'error';
      this.notifyListeners();
      throw error;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Obtiene el servicio de visión (requiere load() primero)
   */
  public async getVisionService() {
    if (!this.services.visionService) {
      await this.load();
    }
    return this.services.visionService;
  }

  /**
   * Obtiene el servicio de brain local (requiere load() primero)
   */
  public async getLocalBrain() {
    if (!this.services.localBrain) {
      await this.load();
    }
    return this.services.localBrain;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Instancia singleton
export const aiLazyLoader = new AILazyLoader();

// Hook de React para usar el loader
export function useAILazyLoader() {
  return {
    state: aiLazyLoader.getState(),
    isReady: aiLazyLoader.isReady(),
    preload: () => aiLazyLoader.preload(),
    load: () => aiLazyLoader.load(),
    subscribe: aiLazyLoader.subscribe.bind(aiLazyLoader),
  };
}
