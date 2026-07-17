/**
 * SessionRepository - Backwards Compatibility
 *
 * @deprecated Usar '@/repositories' y sessionRepository directamente
 *
 * Este archivo re-exporta desde la nueva ubicación para mantener
 * compatibilidad con código existente que importa directamente.
 */

export {
  SessionRepository,
  sessionRepository,
  SessionRepositoryLegacy,
} from './session/SessionRepository';
