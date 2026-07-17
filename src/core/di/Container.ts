/**
 * Container - Sistema de Dependency Injection
 *
 * Proporciona inversión de control (IoC) y resolución de dependencias.
 *
 * Patrones implementados:
 * - Singleton por defecto
 * - Factory methods
 * - Auto-wiring
 * - Circular dependency detection
 */

import { logger } from '@/services/logger';

// ============================================================================
// TIPOS
// ============================================================================

export type Factory<T = any> = () => T;
export type Resolver<T = any> = (container: any) => T;

export interface Registration<T = any> {
  factory: T;
  singleton: boolean;
  instance?: T;
  dependencies: string[];
}

export type ContainerType = ContainerClass;

export interface ContainerConfig {
  /** Habilitar logging */
  debug?: boolean;
  /** Auto-resolver dependencias */
  autoWire?: boolean;
  /** Fallback para dependencias no registradas */
  allowUnregisteredResolution?: boolean;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DEFAULT_CONFIG: ContainerConfig = {
  debug: false,
  autoWire: true,
  allowUnregisteredResolution: true,
};

// ============================================================================
// CONTAINER
// ============================================================================

class ContainerClass {
  private registrations = new Map<string, Registration>();
  private config: ContainerConfig;
  private resolutionStack: string[] = [];

  constructor(config: Partial<ContainerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Registrar una clase o factory
   */
  register<T>(
    token: string,
    factory: T,
    options?: { singleton?: boolean; dependencies?: string[] }
  ): this {
    this.registrations.set(token, {
      factory,
      singleton: options?.singleton ?? true,
      dependencies: options?.dependencies || [],
    });

    this.log('register', { token, singleton: options?.singleton ?? true });
    return this;
  }

  /**
   * Registrar como singleton (forma corta)
   */
  singleton<T>(token: string, factory: Factory<T>): this {
    return this.register(token, factory, { singleton: true });
  }

  /**
   * Registrar como factory (nueva instancia cada vez)
   */
  factory<T>(token: string, factory: Factory<T>): this {
    return this.register(token, factory, { singleton: false });
  }

  /**
   * Resolver una dependencia
   */
  resolve<T>(token: string): T {
    const registration = this.registrations.get(token);

    if (!registration) {
      if (this.config.allowUnregisteredResolution) {
        // Intentar auto-wiring
        this.log('resolve', { token, mode: 'auto-wire' });
        return this.autoWire<T>(token);
      }
      throw new Error(`Dependency not found: ${token}`);
    }

    // Detectar dependencias circulares
    if (this.resolutionStack.includes(token)) {
      const cycle = [...this.resolutionStack, token].join(' -> ');
      logger.error('Container', 'Circular dependency detected', { cycle });
      throw new Error(`Circular dependency: ${cycle}`);
    }

    this.resolutionStack.push(token);

    try {
      let instance: T;

      if (registration.singleton && registration.instance !== undefined) {
        // Ya existe instancia
        instance = registration.instance;
        this.log('resolve', { token, mode: 'cached' });
      } else {
        // Crear nueva instancia
        if (typeof registration.factory === 'function') {
          instance = (registration.factory as Factory<T>)();
        } else {
          instance = registration.factory;
        }
        this.log('resolve', { token, mode: 'new' });

        if (registration.singleton) {
          registration.instance = instance;
        }
      }

      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  /**
   * Auto-wire: intenta crear una instancia automáticamente
   */
  private autoWire<T>(token: string): T {
    // Intentar encontrar la clase
    const parts = token.split('.');
    let obj: any = window as any;

    for (const part of parts) {
      obj = obj?.[part];
      if (!obj) break;
    }

    if (typeof obj === 'function') {
      // Es una clase, intentar instanciar
      try {
        // Intentar inyección por nombre de parámetro (similar a Angular)
        return new obj();
      } catch (error) {
        logger.warn('Container', 'Auto-wire failed', { token, error });
        throw error;
      }
    }

    throw new Error(`Cannot auto-wire: ${token}`);
  }

  /**
   * Verificar si está registrado
   */
  has(token: string): boolean {
    return this.registrations.has(token);
  }

  /**
   * Obtener todos los tokens registrados
   */
  getRegisteredTokens(): string[] {
    return Array.from(this.registrations.keys());
  }

  /**
   * Limpiar todas las instancias singleton
   */
  reset(): void {
    this.registrations.forEach(reg => {
      reg.instance = undefined;
    });
    this.log('reset', {});
  }

  /**
   * Limpiar completamente
   */
  clear(): void {
    this.registrations.clear();
    this.resolutionStack = [];
    this.log('clear', {});
  }

  /**
   * Crear scope hijo (para testing)
   */
  createScope(): ContainerClass {
    const scope = new ContainerClass(this.config);

    // Copiar referencias al scope padre
    this.registrations.forEach((reg, token) => {
      scope.registrations.set(token, reg);
    });

    return scope;
  }

  /**
   * Configurar container
   */
  configure(config: Partial<ContainerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Logging
   */
  private log(action: string, data: any): void {
    if (this.config.debug) {
      logger.debug('Container', action, data);
    }
  }
}

// ============================================================================
// DECORATORS (para uso futuro con TypeScript experimental)
// ============================================================================

/**
 * Marcar una clase como inyectable
 */
export function Injectable() {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    // Por ahora solo marca, en el futuro puede agregar metadata
    return constructor;
  };
}

/**
 * Marcar un parámetro como inyectable
 */
export function Inject(token: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    // Por ahora solo marca
    // En producción usar reflect-metadata
  };
}

// ============================================================================
// SINGLTION GLOBAL
// ============================================================================

export const Container = new ContainerClass();

export default Container;
