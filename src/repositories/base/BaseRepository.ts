/**
 * BaseRepository - Guía de patrones para repositorios de ContarStock
 *
 * PATRÓN RECOMENDADO:
 * 1. Clase con métodos de instancia
 * 2. Exportar una instancia singleton
 * 3. Exportar wrapper legacy para backwards compatibility
 */

export interface RepositoryOptions {
  throwOnNotFound?: boolean;
}

export const REPOSITORY_PATTERNS = {
  SINGLETON: 'singleton', // Instancia exportada (RECOMENDADO)
  STATIC: 'static', // Métodos estáticos (deprecated)
  INSTANCE: 'instance', // Clase para instanciar
} as const;

export type RepositoryPattern = (typeof REPOSITORY_PATTERNS)[keyof typeof REPOSITORY_PATTERNS];
