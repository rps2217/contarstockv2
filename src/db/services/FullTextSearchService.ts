/**
 * FullTextSearchService - Búsqueda de texto completo
 *
 * Proporciona:
 * - Búsqueda fuzzy
 * - Búsqueda por múltiples campos
 * - Ranking de resultados
 * - Suggestions/autocomplete
 * - Historial de búsquedas
 * - Filtros avanzados
 */

import { db } from '../../db';
import { logger } from '@/services/logger';
import { QueryCache } from './QueryCache';

// ============================================================================
// TIPOS
// ============================================================================

export interface SearchableField {
  field: string;
  weight: number; // 1-10
  fuzzy?: boolean;
}

export interface SearchConfig {
  /** Campos a buscar */
  fields: SearchableField[];
  /** Tabla a buscar */
  table: string;
  /** Límite de resultados */
  limit?: number;
  /** Offset para paginación */
  offset?: number;
}

export interface SearchResult<T = any> {
  item: T;
  score: number;
  matches: Array<{
    field: string;
    value: string;
    indices: number[];
    score: number;
  }>;
}

export interface SearchResponse<T = any> {
  query: string;
  results: SearchResult<T>[];
  total: number;
  took: number; // ms
  suggestions?: string[];
}

export interface SearchHistory {
  query: string;
  timestamp: number;
  resultsCount: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const FUZZY_THRESHOLD = 0.7; // 70% de similitud mínimo
const MAX_SUGGESTIONS = 5;
const MAX_HISTORY = 20;

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Calcular distancia de Levenshtein
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calcular similitud entre dos strings
 */
function stringSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const maxLength = Math.max(a.length, b.length);

  return 1 - distance / maxLength;
}

/**
 * Tokenizar string en palabras
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * Encontrar coincidencias en un string
 */
function findMatches(
  text: string,
  query: string,
  fuzzy: boolean = false
): { matched: boolean; score: number; indices: number[] } {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  // Coincidencia exacta
  const exactIndex = normalizedText.indexOf(normalizedQuery);
  if (exactIndex !== -1) {
    return {
      matched: true,
      score: 10,
      indices: Array.from({ length: query.length }, (_, i) => exactIndex + i),
    };
  }

  // Coincidencia fuzzy
  if (fuzzy) {
    const words = tokenize(text);
    let bestScore = 0;
    let bestIndex = 0;

    for (const word of words) {
      const similarity = stringSimilarity(word, normalizedQuery);
      if (similarity > FUZZY_THRESHOLD && similarity > bestScore) {
        bestScore = similarity;
        bestIndex = normalizedText.indexOf(word);
      }
    }

    if (bestScore > 0) {
      return {
        matched: true,
        score: bestScore * 5,
        indices: [bestIndex],
      };
    }
  }

  return { matched: false, score: 0, indices: [] };
}

// ============================================================================
// SERVICE
// ============================================================================

class FullTextSearchServiceClass {
  private searchHistory: SearchHistory[] = [];

  constructor() {
    this.loadHistory();
  }

  /**
   * Cargar historial de búsquedas
   */
  private async loadHistory(): Promise<void> {
    try {
      const saved = await db.settings.get('search_history');
      if (saved?.value && Array.isArray(saved.value)) {
        this.searchHistory = saved.value as SearchHistory[];
      }
    } catch {
      this.searchHistory = [];
    }
  }

  /**
   * Guardar historial
   */
  private async saveHistory(): Promise<void> {
    try {
      await db.settings.put({
        key: 'search_history',
        value: this.searchHistory.slice(0, MAX_HISTORY),
      });
    } catch {
      // Ignore save errors
    }
  }

  /**
   * Buscar en una tabla
   */
  async search<T = any>(query: string, config: SearchConfig): Promise<SearchResponse<T>> {
    const startTime = performance.now();
    const { fields, table, limit = 50, offset = 0 } = config;

    if (!query || query.trim().length < 2) {
      return {
        query,
        results: [],
        total: 0,
        took: performance.now() - startTime,
      };
    }

    // Intentar obtener de cache primero
    const cacheKey = `search:${table}:${query}:${JSON.stringify(fields)}`;

    if (QueryCache.has(cacheKey)) {
      const cached = QueryCache.getInfo(cacheKey);
      if (cached && !cached.expired) {
        logger.debug('FullTextSearch', 'Cache hit', { query });
      }
    }

    try {
      // Obtener todos los registros de la tabla
      const tableInstance = db.table(table);
      const items = await tableInstance.toArray();

      // Buscar coincidencias
      const results: SearchResult<T>[] = [];
      const queryTokens = tokenize(query);

      for (const item of items) {
        const result = this.scoreItem(item, query, queryTokens, fields);
        if (result && result.score > 0) {
          results.push(result as SearchResult<T>);
        }
      }

      // Ordenar por score descendente
      results.sort((a, b) => b.score - a.score);

      // Aplicar paginación
      const paginatedResults = results.slice(offset, offset + limit);

      // Generar sugerencias si no hay resultados exactos
      let suggestions: string[] | undefined;
      if (results.length === 0) {
        suggestions = await this.generateSuggestions(query, table);
      }

      // Guardar en historial
      this.addToHistory(query, results.length);

      const took = performance.now() - startTime;

      // Guardar en cache
      QueryCache.set(cacheKey, { results: paginatedResults, total: results.length }, 5 * 60 * 1000);

      return {
        query,
        results: paginatedResults,
        total: results.length,
        took,
        suggestions,
      };
    } catch (error) {
      logger.error('FullTextSearch', 'Search failed', { query, error });
      return {
        query,
        results: [],
        total: 0,
        took: performance.now() - startTime,
      };
    }
  }

  /**
   * Puntuar un item según la búsqueda
   */
  private scoreItem<T>(
    item: T,
    query: string,
    queryTokens: string[],
    fields: SearchableField[]
  ): SearchResult<T> | null {
    let totalScore = 0;
    const matches: SearchResult['matches'] = [];

    for (const fieldConfig of fields) {
      const value = (item as any)[fieldConfig.field];

      if (value === undefined || value === null) continue;

      const stringValue = String(value);
      const { matched, score, indices } = findMatches(
        stringValue,
        query,
        fieldConfig.fuzzy ?? false
      );

      if (matched) {
        totalScore += score * fieldConfig.weight;
        matches.push({
          field: fieldConfig.field,
          value: stringValue,
          indices,
          score: score * fieldConfig.weight,
        });
      }

      // Bonus por coincidencia en cualquier token
      for (const token of queryTokens) {
        if (stringValue.toLowerCase().includes(token)) {
          totalScore += 2 * fieldConfig.weight;
        }
      }
    }

    if (totalScore > 0) {
      return {
        item,
        score: totalScore,
        matches,
      };
    }

    return null;
  }

  /**
   * Generar sugerencias para una búsqueda fallida
   */
  private async generateSuggestions(query: string, table: string): Promise<string[]> {
    // Buscar en historial
    const historyMatches = this.searchHistory
      .filter(h => h.query.includes(query) || stringSimilarity(h.query, query) > 0.5)
      .slice(0, MAX_SUGGESTIONS)
      .map(h => h.query);

    // Buscar en productos/nombres más comunes
    try {
      const tableInstance = db.table(table);
      const items = await tableInstance.limit(100).toArray();

      const suggestions: string[] = [];
      for (const item of items) {
        const name = (item as any).name || (item as any).productName || (item as any).barcode;
        if (name && stringSimilarity(name.toLowerCase(), query.toLowerCase()) > 0.4) {
          suggestions.push(name);
        }
      }

      return [...new Set([...suggestions, ...historyMatches])].slice(0, MAX_SUGGESTIONS);
    } catch {
      return historyMatches;
    }
  }

  /**
   * Agregar búsqueda al historial
   */
  private addToHistory(query: string, resultsCount: number): void {
    // Remover duplicados
    this.searchHistory = this.searchHistory.filter(h => h.query !== query);

    // Agregar al inicio
    this.searchHistory.unshift({
      query,
      timestamp: Date.now(),
      resultsCount,
    });

    // Limitar tamaño
    if (this.searchHistory.length > MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, MAX_HISTORY);
    }

    // Guardar de forma async
    this.saveHistory();
  }

  /**
   * Obtener historial de búsquedas
   */
  getHistory(): SearchHistory[] {
    return [...this.searchHistory];
  }

  /**
   * Limpiar historial de búsquedas
   */
  clearHistory(): void {
    this.searchHistory = [];
    this.saveHistory();
  }

  /**
   * Buscar en productos (preset)
   */
  async searchProducts(query: string, limit = 50): Promise<SearchResponse> {
    return this.search(query, {
      table: 'products',
      fields: [
        { field: 'barcode', weight: 10, fuzzy: true },
        { field: 'name', weight: 8, fuzzy: true },
        { field: 'description', weight: 4, fuzzy: true },
        { field: 'category', weight: 3, fuzzy: false },
        { field: 'brand', weight: 3, fuzzy: true },
      ],
      limit,
    });
  }

  /**
   * Buscar en sesiones (preset)
   */
  async searchSessions(query: string, limit = 50): Promise<SearchResponse> {
    return this.search(query, {
      table: 'sessions',
      fields: [
        { field: 'id', weight: 10, fuzzy: false },
        { field: 'erpOrder', weight: 8, fuzzy: true },
        { field: 'location', weight: 5, fuzzy: true },
        { field: 'status', weight: 3, fuzzy: false },
      ],
      limit,
    });
  }

  /**
   * Autocomplete para productos
   */
  async autocomplete(query: string, limit = 10): Promise<string[]> {
    if (!query || query.length < 2) return [];

    const result = await this.searchProducts(query, limit);

    // Extraer nombres únicos
    const suggestions = new Set<string>();
    for (const r of result.results) {
      const name = (r.item as any).name || (r.item as any).productName;
      if (name) suggestions.add(name);

      const barcode = (r.item as any).barcode;
      if (barcode) suggestions.add(barcode);
    }

    return Array.from(suggestions).slice(0, limit);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const FullTextSearchService = new FullTextSearchServiceClass();
export default FullTextSearchService;
