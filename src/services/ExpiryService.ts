/**
 * =============================================================================
 * ExpiryService - Servicio centralizado para gestión de vencimientos
 * =============================================================================
 * 
 * Proporciona una API unificada para registrar y consultar vencimientos
 * desde cualquier módulo de la aplicación (conteo, recepción, vencimientos directo).
 * 
 * Características:
 * - Rango de años configurable (MIN_YEAR - MAX_YEAR)
 * - Clave única: barcode-mm-yyyy
 * - Determinación automática de estado (expired, warning, valid)
 * - Productos fuera del rango pueden omitirse del registro
 * - Sincronización con la nube
 * 
 * @since 2026-07-07
 */

import { db } from '@/db';
import { normalizeSku } from './utils';
import { enqueueSync } from './cloud/SyncQueue';

// =============================================================================
// CONSTANTES
// =============================================================================

export const EXPIRY_CONSTANTS = {
  MIN_YEAR: 2025,
  MAX_YEAR: 2027,
} as const;

// Tipos de estado para vencimientos (compatibles con el enum del dominio)
export type ExpiryStatus = 'pending' | 'valid' | 'expired' | 'warning' | 'critical';
export type SyncStatus = 'synced' | 'pending' | 'error';

// =============================================================================
// TIPOS
// =============================================================================

export interface ExpiryEntry {
  id?: number;
  claveUnica: string;
  barcode: string;
  productName?: string;
  providerName?: string;
  location?: string;
  observaciones?: string;
  mm: number;
  yyyy: number;
  quantity: number;
  status: ExpiryStatus;
  timestamp: number;
  sessionId?: string;
  syncStatus: SyncStatus;
  
  // Campos adicionales
  withdrawalDays?: number;
  hasCanje?: boolean;
  daysLeft?: number;
  expiryDate?: string;
  expiryDateObj?: Date;
  withdrawalDate?: Date;
  category?: string;
  estado?: string;
  type?: 'Individual' | 'Batch';
}

export interface SaveExpiryParams {
  barcode: string;
  productName?: string;
  providerName?: string;
  location?: string;
  observaciones?: string;
  mm: number;
  yyyy: number;
  quantity: number;
  sessionId?: string;
  
  // Campos adicionales opcionales
  withdrawalDays?: number;
  category?: string;
}

export interface SaveExpiryOptions {
  /** Si es true, no registra en la BD si el año está fuera del rango */
  skipIfOutOfRange?: boolean;
  /** Si es true, retorna null en lugar de lanzar error */
  silent?: boolean;
}

export interface ExpiryCheckResult {
  /** Si el registro debe omitirse */
  shouldSkip: boolean;
  /** Razón del omisión (si apply) */
  reason?: 'out_of_range' | 'expired_product';
  /** Año mínimo permitido */
  minYear: number;
  /** Año máximo permitido */
  maxYear: number;
  /** Si está dentro del rango */
  isInRange: boolean;
}

// =============================================================================
// SERVICIO
// =============================================================================

export class ExpiryService {
  private static instance: ExpiryService;
  
  private constructor() {}

  static getInstance(): ExpiryService {
    if (!ExpiryService.instance) {
      ExpiryService.instance = new ExpiryService();
    }
    return ExpiryService.instance;
  }

  // ==========================================================================
  // UTILIDADES
  // ==========================================================================

  /**
   * Genera la clave única para un vencimiento
   */
  generateClaveUnica(barcode: string, mm: number, yyyy: number): string {
    return `${normalizeSku(barcode)}-${yyyy}-${String(mm).padStart(2, '0')}`;
  }

  /**
   * Determina el estado basado en la fecha
   */
  determineStatus(mm: number, yyyy: number): ExpiryStatus {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    // Ya vencido
    if (yyyy < currentYear || (yyyy === currentYear && mm < currentMonth)) {
      return 'expired';
    }
    
    // Crítico: vence en menos de 7 días
    const expiryDate = new Date(yyyy, mm - 1, 1);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 7) {
      return 'critical';
    }
    
    // Warning: vence en menos de 30 días
    if (daysUntilExpiry <= 30) {
      return 'warning';
    }
    
    return 'valid';
  }

  /**
   * Calcula los días hasta el vencimiento
   */
  calculateDaysLeft(mm: number, yyyy: number): number {
    const now = new Date();
    const expiryDate = new Date(yyyy, mm - 1, 1);
    return Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica si el año está dentro del rango permitido
   */
  checkYearRange(yyyy: number): ExpiryCheckResult {
    const isInRange = yyyy >= EXPIRY_CONSTANTS.MIN_YEAR && yyyy <= EXPIRY_CONSTANTS.MAX_YEAR;
    
    return {
      shouldSkip: !isInRange,
      reason: isInRange ? undefined : 'out_of_range',
      minYear: EXPIRY_CONSTANTS.MIN_YEAR,
      maxYear: EXPIRY_CONSTANTS.MAX_YEAR,
      isInRange,
    };
  }

  /**
   * Verifica si una fecha ya está vencida
   */
  isExpired(mm: number, yyyy: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    return yyyy < currentYear || (yyyy === currentYear && mm < currentMonth);
  }

  /**
   * Obtiene el rango de años disponibles
   */
  getAvailableYears(): number[] {
    const years: number[] = [];
    for (let y = EXPIRY_CONSTANTS.MIN_YEAR; y <= EXPIRY_CONSTANTS.MAX_YEAR; y++) {
      years.push(y);
    }
    return years;
  }

  /**
   * Obtiene los años extendidos (para selector, incluyendo fuera de rango)
   */
  getExtendedYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    // Incluir 2 años antes del rango y 3 años después
    for (let y = EXPIRY_CONSTANTS.MIN_YEAR - 2; y <= EXPIRY_CONSTANTS.MAX_YEAR + 3; y++) {
      years.push(y);
    }
    return years;
  }

  // ==========================================================================
  // OPERACIONES CRUD
  // ==========================================================================

  /**
   * Guarda un vencimiento en la base de datos
   */
  async save(params: SaveExpiryParams, options: SaveExpiryOptions = {}): Promise<ExpiryEntry | null> {
    const { barcode, mm, yyyy, skipIfOutOfRange = false, silent = false } = params;
    
    // Verificar rango de años
    const rangeCheck = this.checkYearRange(yyyy);
    
    if (rangeCheck.shouldSkip) {
      if (skipIfOutOfRange) {
        if (!silent) {
          console.log(`[ExpiryService] Omisión: año ${yyyy} fuera del rango ${EXPIRY_CONSTANTS.MIN_YEAR}-${EXPIRY_CONSTANTS.MAX_YEAR}`);
        }
        return null;
      }
      
      if (!silent) {
        console.warn(`[ExpiryService] Año ${yyyy} fuera del rango configurado, pero se guardará de todas formas`);
      }
    }
    
    // Determinar estado
    const status = this.determineStatus(mm, yyyy);
    const daysLeft = this.calculateDaysLeft(mm, yyyy);
    
    // Calcular fechas
    const expiryDate = new Date(yyyy, mm - 1, 1);
    const withdrawalDays = params.withdrawalDays ?? 30;
    const withdrawalDate = new Date(expiryDate.getTime() - withdrawalDays * 24 * 60 * 60 * 1000);
    
    // Crear entrada
    const entry: ExpiryEntry = {
      claveUnica: this.generateClaveUnica(barcode, mm, yyyy),
      barcode: normalizeSku(barcode),
      productName: params.productName,
      providerName: params.providerName || 'SIN PROVEEDOR',
      location: params.location || '',
      observaciones: params.observaciones || '',
      mm,
      yyyy,
      quantity: params.quantity,
      status,
      timestamp: Date.now(),
      sessionId: params.sessionId,
      syncStatus: 'pending',
      withdrawalDays,
      hasCanje: false,
      daysLeft,
      expiryDate: expiryDate.toISOString(),
      expiryDateObj: expiryDate,
      withdrawalDate,
      category: params.category || 'GENERAL',
      estado: this.getEstadoFromStatus(status),
      type: 'Individual',
    };
    
    // Guardar en IndexedDB
    await db.expirations.put(entry);
    
    // Encolar para sincronización
    await this.enqueueForSync(entry);
    
    return entry;
  }

  /**
   * Obtiene el estado del texto para la UI
   */
  private getEstadoFromStatus(status: ExpiryStatus): string {
    switch (status) {
      case 'expired': return 'Vencido';
      case 'critical': return 'Crítico';
      case 'warning': return 'Por Vencer';
      case 'pending': return 'Pendiente';
      default: return 'Vigente';
    }
  }

  /**
   * Obtiene un vencimiento por clave única
   */
  async getByClaveUnica(claveUnica: string): Promise<ExpiryEntry | undefined> {
    return await db.expirations.where('claveUnica').equals(claveUnica).first();
  }

  /**
   * Obtiene vencimientos por barcode
   */
  async getByBarcode(barcode: string): Promise<ExpiryEntry[]> {
    const normalized = normalizeSku(barcode);
    return await db.expirations
      .where('barcode')
      .equals(normalized)
      .toArray();
  }

  /**
   * Obtiene el vencimiento más reciente para un barcode
   */
  async getLatestForBarcode(barcode: string): Promise<ExpiryEntry | null> {
    const entries = await this.getByBarcode(barcode);
    if (entries.length === 0) return null;
    
    return entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];
  }

  /**
   * Obtiene todos los vencimientos
   */
  async getAll(limit?: number): Promise<ExpiryEntry[]> {
    let query = db.expirations.orderBy('timestamp').reverse();
    
    if (limit) {
      return await query.limit(limit).toArray();
    }
    return await query.toArray();
  }

  /**
   * Obtiene vencimientos próximos a vencer
   */
  async getExpiringSoon(monthsAhead: number = 3): Promise<ExpiryEntry[]> {
    const now = new Date();
    const limitDate = new Date(now.getTime() + monthsAhead * 30 * 24 * 60 * 60 * 1000);
    
    const all = await db.expirations.toArray();
    
    return all.filter(e => {
      const expiryDate = new Date(e.yyyy, e.mm - 1, 1);
      return expiryDate <= limitDate && expiryDate >= now;
    });
  }

  /**
   * Obtiene vencimientos vencidos
   */
  async getExpired(): Promise<ExpiryEntry[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const all = await db.expirations.toArray();
    
    return all.filter(e => {
      if (e.yyyy < currentYear || (e.yyyy === currentYear && e.mm < currentMonth)) {
        return true;
      }
      return false;
    });
  }

  /**
   * Elimina un vencimiento
   */
  async delete(id: number): Promise<void> {
    await db.expirations.delete(id);
  }

  /**
   * Actualiza un vencimiento
   */
  async update(id: number, updates: Partial<ExpiryEntry>): Promise<void> {
    await db.expirations.update(id, {
      ...updates,
      syncStatus: 'pending', // Marcar como pendiente de sync
    });
  }

  // ==========================================================================
  // SINCRONIZACIÓN
  // ==========================================================================

  /**
   * Encola un vencimiento para sincronización
   */
  private async enqueueForSync(entry: ExpiryEntry): Promise<void> {
    try {
      await enqueueSync({
        type: 'expiry',
        action: 'upsert',
        data: entry,
      });
    } catch (error) {
      console.error('[ExpiryService] Error al encolar para sync:', error);
    }
  }

  /**
   * Sincroniza un vencimiento específico
   */
  async syncEntry(entry: ExpiryEntry): Promise<void> {
    try {
      await enqueueSync({
        type: 'expiry',
        action: 'upsert',
        data: entry,
      });
      
      // Marcar como sincronizado
      if (entry.id) {
        await db.expirations.update(entry.id, { syncStatus: 'synced' });
      }
    } catch (error) {
      console.error('[ExpiryService] Error al sincronizar:', error);
      if (entry.id) {
        await db.expirations.update(entry.id, { syncStatus: 'error' });
      }
    }
  }

  // ==========================================================================
  // UTILIDADES DE SESIÓN
  // ==========================================================================

  /**
   * Obtiene vencimientos de una sesión
   */
  async getBySession(sessionId: string): Promise<ExpiryEntry[]> {
    return await db.expirations
      .where('sessionId')
      .equals(sessionId)
      .toArray();
  }

  /**
   * Cuenta vencimientos de una sesión
   */
  async countBySession(sessionId: string): Promise<number> {
    return await db.expirations
      .where('sessionId')
      .equals(sessionId)
      .count();
  }

  /**
   * Elimina vencimientos de una sesión
   */
  async deleteBySession(sessionId: string): Promise<void> {
    await db.expirations
      .where('sessionId')
      .equals(sessionId)
      .delete();
  }

  // ==========================================================================
  // ESTADÍSTICAS
  // ==========================================================================

  /**
   * Obtiene estadísticas de vencimientos
   */
  async getStats(): Promise<{
    total: number;
    expired: number;
    expiringThisWeek: number;
    expiringThisMonth: number;
    byStatus: Record<ExpiryStatus, number>;
  }> {
    const all = await db.expirations.toArray();
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    let expired = 0;
    let expiringThisWeek = 0;
    let expiringThisMonth = 0;
    const byStatus: Record<ExpiryStatus, number> = {
      pending: 0,
      valid: 0,
      expired: 0,
      warning: 0,
      critical: 0,
    };
    
    for (const e of all) {
      byStatus[e.status] = (byStatus[e.status] || 0) + 1;
      
      const expiryDate = new Date(e.yyyy, e.mm - 1, 1);
      
      if (expiryDate < now) {
        expired++;
      } else if (expiryDate <= weekFromNow) {
        expiringThisWeek++;
      } else if (expiryDate <= monthFromNow) {
        expiringThisMonth++;
      }
    }
    
    return {
      total: all.length,
      expired,
      expiringThisWeek,
      expiringThisMonth,
      byStatus,
    };
  }
}

// Instancia singleton
export const expiryService = ExpiryService.getInstance();

// Hook para usar en componentes
export const useExpiryService = () => {
  const save = (params: SaveExpiryParams, options?: SaveExpiryOptions) => 
    expiryService.save(params, options);
  
  const getByBarcode = (barcode: string) => 
    expiryService.getByBarcode(barcode);
  
  const getLatestForBarcode = (barcode: string) => 
    expiryService.getLatestForBarcode(barcode);
  
  const getAll = (limit?: number) => 
    expiryService.getAll(limit);
  
  const getExpiringSoon = (monthsAhead?: number) => 
    expiryService.getExpiringSoon(monthsAhead);
  
  const getExpired = () => 
    expiryService.getExpired();
  
  const getStats = () => 
    expiryService.getStats();
  
  const checkYearRange = (yyyy: number) => 
    expiryService.checkYearRange(yyyy);
  
  const getAvailableYears = () => 
    expiryService.getAvailableYears();
  
  const getExtendedYears = () => 
    expiryService.getExtendedYears();
  
  const isExpired = (mm: number, yyyy: number) => 
    expiryService.isExpired(mm, yyyy);

  return {
    // Métodos
    save,
    getByBarcode,
    getLatestForBarcode,
    getAll,
    getExpiringSoon,
    getExpired,
    getStats,
    syncEntry: expiryService.syncEntry.bind(expiryService),
    delete: expiryService.delete.bind(expiryService),
    update: expiryService.update.bind(expiryService),
    getBySession: expiryService.getBySession.bind(expiryService),
    deleteBySession: expiryService.deleteBySession.bind(expiryService),
    
    // Utilidades
    checkYearRange,
    getAvailableYears,
    getExtendedYears,
    isExpired,
    generateClaveUnica: expiryService.generateClaveUnica.bind(expiryService),
    determineStatus: expiryService.determineStatus.bind(expiryService),
    
    // Constantes
    CONSTANTS: EXPIRY_CONSTANTS,
  };
};
