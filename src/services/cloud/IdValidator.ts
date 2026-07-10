/**
 * IdValidator - Validación de IDs para prevenir errores 406
 * 
 * Valida que los IDs tengan el formato correcto antes de hacer queries
 * a Supabase para evitar errores de recursos no encontrados.
 */

import { logger } from '../logger';

/**
 * Formatos de ID soportados
 */
export type IdFormat = 'uuid' | 'string' | 'numeric' | 'erp';

/**
 * Configuración de validación por tabla
 */
export interface TableIdConfig {
  tableName: string;
  primaryKey: string;
  formats: IdFormat[];
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
}

/**
 * Configuraciones de tablas conocidas
 */
const TABLE_CONFIGS: Record<string, TableIdConfig> = {
  SESSIONS: {
    tableName: 'SESSIONS',
    primaryKey: 'id',
    formats: ['uuid', 'string'],
    minLength: 1,
    maxLength: 100,
  },
  PRODUCTS: {
    tableName: 'PRODUCTS',
    primaryKey: 'id',
    formats: ['string', 'numeric'],
    minLength: 1,
    maxLength: 50,
  },
  SCANS: {
    tableName: 'SCANS',
    primaryKey: 'id',
    formats: ['uuid', 'numeric'],
    minLength: 1,
    maxLength: 100,
  },
  CUSTOMERS: {
    tableName: 'CUSTOMERS',
    primaryKey: 'id',
    formats: ['uuid', 'string'],
    minLength: 1,
    maxLength: 100,
  },
};

/**
 * Validador de IDs
 */
export const IdValidator = {
  /**
   * Verifica si un ID tiene formato UUID válido
   */
  isValidUuid(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  },

  /**
   * Verifica si un ID es numérico
   */
  isNumeric(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    return /^\d+$/.test(id);
  },

  /**
   * Verifica si un ID es un código ERP válido
   */
  isErpCode(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    // Códigos ERP通常是字母数字组合
    return /^[A-Z0-9_-]+$/i.test(id) && id.length >= 3 && id.length <= 50;
  },

  /**
   * Valida un ID genérico
   */
  isValidId(id: unknown): id is string {
    if (typeof id !== 'string' && typeof id !== 'number') return false;
    const strId = String(id);
    return strId.length > 0 && strId.length <= 200;
  },

  /**
   * Valida un ID contra una configuración de tabla
   */
  validateForTable(id: string, tableName: string): { valid: boolean; reason?: string } {
    const config = TABLE_CONFIGS[tableName.toUpperCase()];
    
    if (!config) {
      // Si no hay config específica, usar validación genérica
      if (!this.isValidId(id)) {
        return { valid: false, reason: 'Invalid ID format' };
      }
      return { valid: true };
    }

    // Verificar longitud
    if (config.minLength && id.length < config.minLength) {
      return { valid: false, reason: `ID too short (min: ${config.minLength})` };
    }
    if (config.maxLength && id.length > config.maxLength) {
      return { valid: false, reason: `ID too long (max: ${config.maxLength})` };
    }

    // Verificar patrón específico
    if (config.pattern && !config.pattern.test(id)) {
      return { valid: false, reason: 'ID does not match required pattern' };
    }

    // Verificar al menos un formato válido
    const formatValid = config.formats.some(format => {
      switch (format) {
        case 'uuid': return this.isValidUuid(id);
        case 'numeric': return this.isNumeric(id);
        case 'erp': return this.isErpCode(id);
        case 'string': return this.isValidId(id);
        default: return false;
      }
    });

    if (!formatValid) {
      return { valid: false, reason: `ID does not match any valid format: ${config.formats.join(', ')}` };
    }

    return { valid: true };
  },

  /**
   * Filtra IDs inválidos de un array
   */
  filterValidIds(ids: string[], tableName: string): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    for (const id of ids) {
      const result = this.validateForTable(id, tableName);
      if (result.valid) {
        valid.push(id);
      } else {
        invalid.push(id);
      }
    }

    if (invalid.length > 0) {
      logger.debug('ID_VALIDATOR', `Filtered ${invalid.length} invalid IDs for ${tableName}`);
    }

    return { valid, invalid };
  },

  /**
   * Sanitiza un ID para uso en queries
   */
  sanitizeId(id: string): string {
    // Remover caracteres potencialmente peligrosos
    return id.replace(/[\'";<>]/g, '').trim();
  },

  /**
   * Intenta parsear un ID como diferente tipo
   */
  parseId(id: string): { type: 'uuid' | 'numeric' | 'string'; value: string } {
    if (this.isValidUuid(id)) {
      return { type: 'uuid', value: id };
    }
    if (this.isNumeric(id)) {
      return { type: 'numeric', value: id };
    }
    return { type: 'string', value: id };
  },

  /**
   * Verifica si我们应该 hacer fetch antes de delete/update
   * (útil para evitar errores 406 en registros que no existen)
   */
  shouldFetchBeforeMutation(id: string, tableName: string): boolean {
    // UUIDs de aplicaciones externas no existen localmente
    // Podemos intentar la operación directamente y manejar el error
    if (this.isValidUuid(id)) {
      return false; // Intentar directamente, el error será manejado
    }
    
    // IDs numéricos o strings deberían existir localmente
    return true;
  },
};

export default IdValidator;
