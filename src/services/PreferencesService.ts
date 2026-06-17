/**
 * PreferencesService - Servicio centralizado para manejar localStorage
 * 
 * Centraliza todas las operaciones de localStorage en un solo lugar
 * para evitar inconsistencias y facilitar mantenimiento.
 */

export const PREFERENCES_KEYS = {
  SETTINGS: 'logicount_settings',
  SLICES: 'logicount_appsheet_slices',
  EVENT_PREFS: 'event_preferences',
  OPERATOR: 'logicount_operator_id',
  AUTH: 'logicount_auth',
  SYNC_LAST: 'sync_last_timestamp',
} as const;

export type PreferencesKey = keyof typeof PREFERENCES_KEYS;

class PreferencesServiceClass {
  private static instance: PreferencesServiceClass;

  private constructor() {}

  static getInstance(): PreferencesServiceClass {
    if (!PreferencesServiceClass.instance) {
      PreferencesServiceClass.instance = new PreferencesServiceClass();
    }
    return PreferencesServiceClass.instance;
  }

  /**
   * Obtiene un valor de localStorage con valor por defecto
   */
  get<T>(key: PreferencesKey, defaultValue: T): T {
    try {
      const data = localStorage.getItem(PREFERENCES_KEYS[key]);
      if (data === null) return defaultValue;
      return JSON.parse(data) as T;
    } catch {
      console.warn(`[PreferencesService] Error reading key: ${key}`);
      return defaultValue;
    }
  }

  /**
   * Obtiene un valor de localStorage sin valor por defecto
   */
  getOptional<T>(key: PreferencesKey): T | null {
    try {
      const data = localStorage.getItem(PREFERENCES_KEYS[key]);
      if (data === null) return null;
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Guarda un valor en localStorage
   */
  set<T>(key: PreferencesKey, value: T): void {
    try {
      localStorage.setItem(PREFERENCES_KEYS[key], JSON.stringify(value));
    } catch (e) {
      console.error(`[PreferencesService] Error writing key: ${key}`, e);
    }
  }

  /**
   * Elimina un valor de localStorage
   */
  remove(key: PreferencesKey): void {
    localStorage.removeItem(PREFERENCES_KEYS[key]);
  }

  /**
   * Elimina todas las preferencias
   */
  clear(): void {
    Object.values(PREFERENCES_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  /**
   * Verifica si una clave existe
   */
  has(key: PreferencesKey): boolean {
    return localStorage.getItem(PREFERENCES_KEYS[key]) !== null;
  }

  /**
   * Obtiene el timestamp de la última sincronización para una tabla
   */
  getLastSyncTime(tableName: string): number | null {
    const data = this.get<Record<string, number>>(PREFERENCES_KEYS.SYNC_LAST, {});
    return data[tableName] ?? null;
  }

  /**
   * Actualiza el timestamp de sincronización para una tabla
   */
  setLastSyncTime(tableName: string, timestamp: number = Date.now()): void {
    const data = this.get<Record<string, number>>(PREFERENCES_KEYS.SYNC_LAST, {});
    data[tableName] = timestamp;
    this.set(PREFERENCES_KEYS.SYNC_LAST, data);
  }
}

export const PreferencesService = PreferencesServiceClass.getInstance();

// Para uso directo en componentes
export const preferences = {
  get: <T>(key: PreferencesKey, defaultValue: T) => PreferencesService.get(key, defaultValue),
  set: <T>(key: PreferencesKey, value: T) => PreferencesService.set(key, value),
  remove: (key: PreferencesKey) => PreferencesService.remove(key),
  has: (key: PreferencesKey) => PreferencesService.has(key),
  getLastSyncTime: (tableName: string) => PreferencesService.getLastSyncTime(tableName),
  setLastSyncTime: (tableName: string, timestamp?: number) => PreferencesService.setLastSyncTime(tableName, timestamp),
};
