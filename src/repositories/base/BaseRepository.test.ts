/**
 * BaseRepository Tests
 * 
 * Tests para la implementación base del patrón Repository con Dexie.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRepository } from './BaseRepository';

interface TestEntity {
  id?: string;
  name: string;
  value: number;
}

// Mock Dexie Table
const createMockTable = () => {
  const storage = new Map<string, TestEntity>();
  
  return {
    get: vi.fn(async (id: string) => storage.get(id) ?? undefined),
    toArray: vi.fn(async () => Array.from(storage.values())),
    put: vi.fn(async (entity: TestEntity) => {
      const id = entity.id || crypto.randomUUID();
      storage.set(id, { ...entity, id });
      return id;
    }),
    add: vi.fn(async (entity: TestEntity) => {
      const id = crypto.randomUUID();
      storage.set(id, { ...entity, id });
      return id;
    }),
    bulkPut: vi.fn(async (entities: TestEntity[]) => {
      const ids: string[] = [];
      for (const entity of entities) {
        const id = entity.id || crypto.randomUUID();
        storage.set(id, { ...entity, id });
        ids.push(id);
      }
      return ids;
    }),
    bulkDelete: vi.fn(async (ids: string[]) => {
      ids.forEach(id => storage.delete(id));
    }),
    update: vi.fn(async (id: string, changes: Partial<TestEntity>) => {
      const existing = storage.get(id);
      if (existing) {
        storage.set(id, { ...existing, ...changes });
      }
    }),
    delete: vi.fn(async (id: string) => {
      storage.delete(id);
    }),
    count: vi.fn(async () => storage.size),
    clear: vi.fn(async () => storage.clear()),
    _storage: storage,
  };
};

// Concrete implementation for testing
class TestRepository extends BaseRepository<TestEntity, string> {
  constructor(table: ReturnType<typeof createMockTable>) {
    super(table as any);
  }
}

describe('BaseRepository', () => {
  let mockTable: ReturnType<typeof createMockTable>;
  let repository: TestRepository;

  beforeEach(() => {
    mockTable = createMockTable();
    repository = new TestRepository(mockTable);
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('should return null when entity not found', async () => {
      const result = await repository.get('non-existent-id');
      expect(result).toBeNull();
    });

    it('should return entity when found', async () => {
      // Setup storage
      mockTable._storage.set('test-id', { id: 'test-id', name: 'Test', value: 42 });
      
      const result = await repository.get('test-id');
      
      expect(result).toEqual({ id: 'test-id', name: 'Test', value: 42 });
      expect(mockTable.get).toHaveBeenCalledWith('test-id');
    });
  });

  describe('getAll', () => {
    it('should return empty array when no entities', async () => {
      const result = await repository.getAll();
      
      expect(result).toEqual([]);
      expect(mockTable.toArray).toHaveBeenCalled();
    });

    it('should return all entities', async () => {
      mockTable._storage.set('1', { id: '1', name: 'One', value: 1 });
      mockTable._storage.set('2', { id: '2', name: 'Two', value: 2 });
      
      const result = await repository.getAll();
      
      expect(result).toHaveLength(2);
    });
  });

  describe('save', () => {
    it('should update existing entity when id is present', async () => {
      mockTable._storage.set('existing-id', { id: 'existing-id', name: 'Old', value: 0 });
      
      const result = await repository.save({ id: 'existing-id', name: 'New', value: 100 });
      
      expect(result).toBe('existing-id');
      expect(mockTable.put).toHaveBeenCalled();
    });

    it('should add new entity when id is not present', async () => {
      const newEntity = { name: 'New', value: 42 };
      
      const result = await repository.save(newEntity);
      
      expect(result).toBeDefined();
      expect(mockTable.add).toHaveBeenCalled();
    });
  });

  describe('saveMany', () => {
    it('should return empty array for empty input', async () => {
      const result = await repository.saveMany([]);
      
      expect(result).toEqual([]);
      expect(mockTable.bulkPut).not.toHaveBeenCalled();
    });

    it('should save multiple entities', async () => {
      const entities = [
        { name: 'One', value: 1 },
        { name: 'Two', value: 2 },
      ];
      
      const result = await repository.saveMany(entities);
      
      expect(result).toHaveLength(2);
      expect(mockTable.bulkPut).toHaveBeenCalledWith(entities);
    });
  });

  describe('update', () => {
    it('should update entity fields', async () => {
      mockTable._storage.set('update-id', { id: 'update-id', name: 'Old', value: 0 });
      
      await repository.update('update-id', { name: 'Updated', value: 99 });
      
      expect(mockTable.update).toHaveBeenCalledWith('update-id', { name: 'Updated', value: 99 });
    });
  });

  describe('delete', () => {
    it('should delete entity by id', async () => {
      await repository.delete('delete-id');
      
      expect(mockTable.delete).toHaveBeenCalledWith('delete-id');
    });
  });

  describe('deleteMany', () => {
    it('should return early for empty array', async () => {
      await repository.deleteMany([]);
      
      expect(mockTable.bulkDelete).not.toHaveBeenCalled();
    });

    it('should delete multiple entities', async () => {
      await repository.deleteMany(['id1', 'id2', 'id3']);
      
      expect(mockTable.bulkDelete).toHaveBeenCalledWith(['id1', 'id2', 'id3']);
    });
  });

  describe('count', () => {
    it('should return entity count', async () => {
      mockTable._storage.set('1', { id: '1', name: 'One', value: 1 });
      mockTable._storage.set('2', { id: '2', name: 'Two', value: 2 });
      
      const result = await repository.count();
      
      expect(result).toBe(2);
      expect(mockTable.count).toHaveBeenCalled();
    });
  });
});

describe('IRepository interface compliance', () => {
  let mockTable: ReturnType<typeof createMockTable>;
  let repository: BaseRepository<TestEntity, string>;

  beforeEach(() => {
    mockTable = createMockTable();
    repository = new TestRepository(mockTable);
  });

  it('should implement all IRepository methods', () => {
    expect(typeof repository.get).toBe('function');
    expect(typeof repository.getAll).toBe('function');
    expect(typeof repository.save).toBe('function');
    expect(typeof repository.saveMany).toBe('function');
    expect(typeof repository.update).toBe('function');
    expect(typeof repository.delete).toBe('function');
    expect(typeof repository.deleteMany).toBe('function');
    expect(typeof repository.count).toBe('function');
  });
});
