/**
 * useAudit - Re-export from features/sync/hooks
 * @deprecated Use @/features/sync/hooks or @/hooks instead
 */

// Re-export everything from the canonical location
export {
  useAudit,
  auditService,
  type CreateAuditEntry,
  type UseAuditReturn,
} from '@/features/sync/hooks/useAudit';

export { default } from '@/features/sync/hooks/useAudit';
