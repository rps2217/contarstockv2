/**
 * Bulk Actions - Tipos y constantes compartidos
 */

export interface ViewPreferences {
  module: string;
  compactView: boolean;
  sortBy: 'date' | 'name' | 'status';
  sortOrder: 'asc' | 'desc';
  expandedPanels: Record<string, boolean>;
  lastUpdated: number;
}

export interface BulkHistoryEntry {
  id: string;
  module: string;
  action: string;
  actionLabel: string;
  itemCount: number;
  itemIds: string[];
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  timestamp: number;
  undone: boolean;
  canUndo: boolean;
  undoTimeout: number;
}

export interface BulkUndoContext {
  entry: BulkHistoryEntry;
  undoAction: () => Promise<void>;
  items: unknown[];
}

export interface DryRunResult {
  actionId: string;
  affected: number;
  errors: string[];
  preview: Array<{
    id: string;
    status: 'would_change';
    changes: Record<string, unknown>;
  }>;
}

export const DEFAULT_VIEW_PREFERENCES: Omit<ViewPreferences, 'module'> = {
  compactView: false,
  sortBy: 'date',
  sortOrder: 'desc',
  expandedPanels: {},
  lastUpdated: Date.now()
};

export const UNDO_TIMEOUT_MS = 30000;
