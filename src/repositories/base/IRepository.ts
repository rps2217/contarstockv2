/**
 * Base Repository Interface
 * Define el contrato para todos los repositorios de datos
 */
export interface IRepository<T, ID = string> {
  /** Obtener un elemento por su ID */
  get(id: ID): Promise<T | null>;
  
  /** Obtener todos los elementos */
  getAll(): Promise<T[]>;
  
  /** Guardar o actualizar un elemento */
  save(entity: T): Promise<ID>;
  
  /** Guardar múltiples elementos */
  saveMany?(entities: T[]): Promise<ID[]>;
  
  /** Actualizar parcialmente un elemento */
  update?(id: ID, data: Partial<T>): Promise<void>;
  
  /** Eliminar un elemento por ID */
  delete(id: ID): Promise<void>;
  
  /** Eliminar múltiples elementos */
  deleteMany?(ids: ID[]): Promise<void>;
  
  /** Contar elementos */
  count(): Promise<number>;
  
  /** Verificar si existe un elemento */
  exists?(id: ID): Promise<boolean>;
}

export interface QueryConditions<T> {
  where?: Partial<Record<keyof T, unknown>>;
  limit?: number;
  offset?: number;
  orderBy?: keyof T;
  orderDirection?: 'asc' | 'desc';
}

export interface IQueryRepository<T, ID = string> extends IRepository<T, ID> {
  /** Consultas con condiciones */
  find(conditions: QueryConditions<T>): Promise<T[]>;
  
  /** Buscar por campo específico */
  findByField<K extends keyof T>(field: K, value: T[K]): Promise<T[]>;
  
  /** Buscar el primero que cumpla condiciones */
  findOne(conditions: QueryConditions<T>): Promise<T | null>;
}

export interface ISyncableRepository<T, ID = string> extends IRepository<T, ID> {
  /** Obtener elementos pendientes de sincronizar */
  getPendingSync(): Promise<T[]>;
  
  /** Marcar como sincronizado */
  markSynced(id: ID): Promise<void>;
  
  /** Marcar como error */
  markSyncError(id: ID, error: string): Promise<void>;
  
  /** Obtener contador de pendientes */
  getPendingCount(): Promise<number>;
}
