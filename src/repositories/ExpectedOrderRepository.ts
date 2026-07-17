/**
 * ExpectedOrderRepository - Backwards Compatibility
 *
 * @deprecated Usar '@/repositories' y expectedOrderRepository directamente
 *
 * Este archivo re-exporta desde la nueva ubicación para mantener
 * compatibilidad con código existente que importa directamente.
 */

export {
  ExpectedOrderRepository,
  expectedOrderRepository,
  ExpectedOrderRepositoryLegacy,
} from './expected/ExpectedOrderRepository';
