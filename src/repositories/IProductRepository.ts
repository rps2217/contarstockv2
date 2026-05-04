
import { Product } from '../types';

export interface IProductRepository {
  getById(barcode: string): Promise<Product | undefined>;
  save(product: Product): Promise<void>;
  saveBatch(products: Product[]): Promise<void>;
  delete(barcode: string): Promise<void>;
  deleteAll(): Promise<void>;
  getAll(): Promise<Product[]>;
  getLimited(limit: number): Promise<Product[]>;
  getPendingSyncCount(): Promise<number>;
  getPendingSync(): Promise<Product[]>;
  markAsSynced(barcodes: string[]): Promise<void>;
  search(query: string, limit?: number): Promise<Product[]>;
  getQuickStats(): Promise<{ total: number; synced: number }>;
}

// Forced GitHub sync
