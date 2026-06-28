/**
 * Initialization - Módulos para inicialización de la aplicación
 * 
 * Estructura:
 * - types.ts: Tipos compartidos
 * - VersionChecker.ts: Verificación de versión
 * - DatabaseBootstrap.ts: Inicialización de IndexedDB
 * - DataImporter.ts: Importación de datos desde la nube
 * - ConfigSynchronizer.ts: Sincronización de configuración
 * 
 * @module initialization
 */

// Types
export * from './types';

// Modules
export { checkVersion, type VersionCheckResult } from './VersionChecker';
export { bootstrapDatabase, needsInitialSync, type DatabaseBootstrapResult } from './DatabaseBootstrap';
export { importInitialData, sanitizeDatabase, type DataImportResult } from './DataImporter';
export { syncConfig, type ConfigSyncResult } from './ConfigSynchronizer';
