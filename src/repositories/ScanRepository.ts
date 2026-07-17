/**
 * ScanRepository - Backwards Compatibility
 *
 * @deprecated Usar '@/repositories' y scanRepository directamente
 *
 * Este archivo re-exporta desde la nueva ubicación para mantener
 * compatibilidad con código existente que importa directamente.
 */

export { ScanRepository, scanRepository, ScanRepositoryLegacy } from './scan/ScanRepository';
