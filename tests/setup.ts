// Tests setup file
import { vi } from 'vitest';

// Mock IndexedDB/Dexie
const mockDexie = {
  products: {
    where: vi.fn().mockReturnThis(),
    anyOf: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(1),
    put: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    bulkPut: vi.fn().mockResolvedValue([]),
    bulkAdd: vi.fn().mockResolvedValue([]),
    bulkDelete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    toCollection: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    reverse: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    modify: vi.fn().mockResolvedValue(undefined),
  },
  sessions: {
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(1),
    put: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    bulkPut: vi.fn().mockResolvedValue([]),
    clear: vi.fn().mockResolvedValue(undefined),
    toCollection: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    reverse: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    modify: vi.fn().mockResolvedValue(undefined),
  },
  scans: {
    where: vi.fn().mockReturnThis(),
    equals: vi.fn().mockReturnThis(),
    anyOf: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(1),
    put: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(0),
    bulkPut: vi.fn().mockResolvedValue([]),
    bulkAdd: vi.fn().mockResolvedValue([]),
    bulkDelete: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    toCollection: vi.fn().mockReturnThis(),
    first: vi.fn().mockResolvedValue(undefined),
    reverse: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    modify: vi.fn().mockResolvedValue(undefined),
  },
  logs: {
    add: vi.fn().mockResolvedValue(1),
    orderBy: vi.fn().mockReturnThis(),
    reverse: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    clear: vi.fn().mockResolvedValue(undefined),
    bulkDelete: vi.fn().mockResolvedValue(undefined),
  },
  transaction: vi.fn().mockImplementation(async (mode, tables, callback) => {
    return callback();
  }),
  version: vi.fn().mockReturnThis(),
  stores: vi.fn().mockReturnThis(),
  upgrade: vi.fn().mockReturnThis(),
};

// Mock global db
global.db = mockDexie as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;

// Mock window
global.window = {
  localStorage: localStorageMock,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
} as any;

// Suppress console in tests unless explicitly needed
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};