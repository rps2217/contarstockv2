/**
 * Counting Components - Exports
 * 
 * Componentes legacy y nuevos para el módulo de conteo.
 */

// Modal de inicio unificado
export { StartCountingModal, type StartCountingConfig, type CountingMode, type TheoreticalSource } from './StartCountingModal';

// Selector de cargas teóricas
export { TheoreticalLoadSelector, type SelectedLoad, type TheoreticalSource as LoadSource } from './TheoreticalLoadSelector';

// Componentes existentes
export { CountingCameraView } from './CountingCameraView';
export { CountingKanbanView } from './CountingKanbanView';
export { CountingMetricsCards } from './CountingMetricsCards';
export { EditExpiryModal } from './EditExpiryModal';
export { ProductivityDashboard } from './ProductivityDashboard';
export { ScannerToolsSheet } from './ScannerToolsSheet';
export { TestModeExpiryModal } from './TestModeExpiryModal';
export { TurboModeOverlay } from './TurboModeOverlay';
