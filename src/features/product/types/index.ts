/**
 * Product Types - Tipos para productos
 */

// ============================================
// PRODUCT STATUS
// ============================================

export type ProductSyncStatus = 'synced' | 'pending' | 'error';

// ============================================
// PRODUCT
// ============================================

export interface Product {
  barcode: string;
  name: string;
  category: string;
  supplier?: string;
  supplierRut?: string;
  price?: number;
  unitsPerBox?: number;
  
  // Metadatos
  description?: string;
  imageUrl?: string;
  
  // Inventario
  stock?: number;
  minStock?: number;
  
  // Sync
  syncStatus?: ProductSyncStatus;
  lastSyncAt?: number;
  
  // Timestamps
  createdAt?: number;
  updatedAt?: number;
}

// ============================================
// PRODUCT FILTERS
// ============================================

export interface ProductFilters {
  search?: string;
  barcode?: string;
  category?: string;
  supplier?: string;
  syncStatus?: ProductSyncStatus;
  hasStock?: boolean;
}

export interface ProductSort {
  field: 'name' | 'barcode' | 'category' | 'supplier' | 'price';
  direction: 'asc' | 'desc';
}

// ============================================
// PRODUCT FORM
// ============================================

export interface CreateProductForm {
  barcode: string;
  name: string;
  category?: string;
  supplier?: string;
  supplierRut?: string;
  price?: number;
  unitsPerBox?: number;
}

export interface UpdateProductForm {
  name?: string;
  category?: string;
  supplier?: string;
  supplierRut?: string;
  price?: number;
  unitsPerBox?: number;
  stock?: number;
  minStock?: number;
}

// ============================================
// PRODUCT IMPORT
// ============================================

export interface ProductImportRow {
  barcode: string;
  name: string;
  category?: string;
  supplier?: string;
  supplierRut?: string;
  price?: number | string;
  unitsPerBox?: number | string;
}

export interface ProductImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

// ============================================
// PRODUCT STATS
// ============================================

export interface ProductStats {
  total: number;
  byCategory: Record<string, number>;
  bySupplier: Record<string, number>;
  pendingSync: number;
}
