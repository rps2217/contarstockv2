/**
 * Tipos para el sistema de Slices (vistas configurables de datos)
 */

export type SourceTable = 'scans' | 'products' | 'sessions' | 'providers' | 'customers' | 'dynamic_data';

export type FilterOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';

export interface AppSheetSlice {
  id: string;
  name: string;
  description: string;
  sourceTable: SourceTable;
  filterField: string;
  filterOperator: FilterOperator;
  filterValue: string;
  selectedColumns: string[];
  allowEdits: boolean;
  allowDeletes: boolean;
  isSystem?: boolean;
}

export interface SliceFilter {
  field: string;
  operator: FilterOperator;
  value: string;
}

export interface SliceColumn {
  key: string;
  label: string;
  width?: number;
}

export interface SliceStats {
  totalCount: number;
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
}
