/**
 * Services - Exports centralizados
 * 
 * Arquitectura Lego: Servicios organizados por dominio
 */

// Analytics
export * from './analytics';

// AI Services
export * from './ai';

// Cloud / Sync Services  
export * from './cloud';
export * from './sync';

// Core Services (individuales)
export { aggregator } from './aggregator';
export { analyticService } from './analytics';
export { audioService } from './audio';
export { backupService } from './backupService';
export { cloudBackupService } from './cloudBackupService';
export { configSyncService } from './configSyncService';
export { detectiveService } from './detectiveService';
export { diagnostics } from './diagnostics';
export { dynamicDataService } from './dynamicDataService';
export { dynamicSync } from './dynamicSync';
export { erpService } from './erpService';
export { exportData } from './export';
export { gemini } from './gemini';
export { hydrationService } from './hydrationService';
export { InitializationService, initializationService } from './initializationService';
export { integrity } from './integrity';
export { integrityGuard } from './integrityGuard';
export { lazyLoad } from './lazyLoad';
export { localBrain } from './localBrain';
export { locationService } from './locationService';
export { logger } from './logger';
export { maintenance } from './maintenance';
export { maintenanceService } from './maintenanceService';
export { massiveSync } from './massiveSync';
export { moduleManager } from './moduleManager';
export { normalizationService } from './normalizationService';
export { printService } from './printService';
export { productService } from './productService';
export { providerImporter } from './providerImporter';
export { scannerMachine } from './scannerMachine';
export { schemas } from './schemas';
export { search } from './search';
export { sessionService } from './sessionService';
export { settings } from './settings';
export { shareService } from './shareService';
export { storage } from './storage';
export { supabaseSyncService } from './supabaseSyncService';
export { syncManager } from './syncManager';
export { telemetryService } from './analytics';
export { thermalPrinterService } from './thermalPrinterService';
export { uiLogic } from './uiLogic';
export { utils } from './utils';
export { validation } from './validation';
export { validator } from './validator';
export { vectorService } from './vectorService';

// Constants
export * from './constants';

// Types
export * from './types';
