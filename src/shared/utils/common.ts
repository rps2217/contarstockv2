/**
 * Common Utils - Utilidades compartidas para toda la aplicación
 *
 * Este archivo centraliza funciones utilitarias que se usan en múltiples lugares
 * para evitar duplicación de código.
 */

// NOTA: normalizeSku ha sido movido a @/lib/normalize

// Re-export normalize functions from centralized location
export { normalizeSku, sanitizeBarcode, normalizeIdentity, normalizeHeader } from '@/lib/normalize';

/**
 * Formatea un timestamp a fecha legible
 */
export function formatTimestamp(timestamp: number | string | null | undefined): string {
  if (!timestamp) return '';
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formatea un timestamp a solo fecha
 */
export function formatDate(timestamp: number | string | null | undefined): string {
  if (!timestamp) return '';
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  return date.toLocaleDateString('es-CL');
}

/**
 * Formatea un timestamp a solo hora
 */
export function formatTime(timestamp: number | string | null | undefined): string {
  if (!timestamp) return '';
  const date = new Date(typeof timestamp === 'string' ? timestamp : timestamp);
  return date.toLocaleTimeString('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Capitaliza la primera letra de un texto
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convierte un texto a slug (URL-friendly)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Genera un ID único basado en timestamp + random
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Parses a value that could be a string or number into a number
 */
export function parseNumber(value: string | number | null | undefined, defaultValue = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Formatea un número como moneda CLP
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea un número con separadores de miles
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-CL').format(num);
}

/**
 * Calcula el porcentaje
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

/**
 * Valida que un RUT chileno sea válido
 */
export function validateRut(rut: string): boolean {
  if (!rut) return false;
  const cleaned = rut.replace(/[^0-9kK]/g, '');
  if (cleaned.length < 8) return false;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();

  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDv = String(11 - (sum % 11));
  const calculatedDv = expectedDv === '11' ? '0' : expectedDv === '10' ? 'K' : expectedDv;

  return calculatedDv === dv;
}

/**
 * Formatea un RUT chileno
 */
export function formatRut(rut: string): string {
  if (!rut) return '';
  const cleaned = rut.replace(/[^0-9kK]/g, '');
  if (cleaned.length < 8) return rut;

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1).toUpperCase();

  return `${parseInt(body).toLocaleString('es-CL')}-${dv}`;
}

/**
 * Deep clone de un objeto
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Verifica si un objeto está vacío
 */
export function isEmpty(obj: Record<string, unknown> | null | undefined): boolean {
  if (!obj) return true;
  return Object.keys(obj).length === 0;
}

/**
 * Agrupa un array por una clave específica
 */
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (result, item) => {
      const groupKey = String(item[key]);
      if (!result[groupKey]) {
        result[groupKey] = [];
      }
      result[groupKey].push(item);
      return result;
    },
    {} as Record<string, T[]>
  );
}

/**
 * Ordena un array por una clave específica
 */
export function sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
}

/**
 * Retorna solo las claves de un objeto que tienen valor
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Excluye claves de un objeto
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry con backoff exponencial
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await sleep(baseDelay * Math.pow(2, i));
      }
    }
  }

  throw lastError!;
}

/**
 * Formatea bytes a string legible (B, KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
