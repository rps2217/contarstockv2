/**
 * @deprecatedcloudSync.ts - MÓDULO ELIMINADO
 * 
 * Todas las funciones han sido migradas a GenericSyncEngine.
 * 
 * Funciones migradas:
 * - syncProductsToCloud → useProductSync.handleSyncToCloud (usa GenericSyncEngine.pushIncremental)
 * - syncProvidersToCloud → useProvidersSync.handleSyncToCloud (usa GenericSyncEngine.pushIncremental)
 * 
 * Este archivo se elimina en la próxima versión.
 * 
 * @deprecated Desde 2026-06-20
 */

// Archivo mantenido solo para backwards compatibility temporal
// Será eliminado una vez se validen los hooks migrados en producción

export {};
