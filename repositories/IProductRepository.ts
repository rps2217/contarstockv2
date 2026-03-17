
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
}
