/**
 * IntegrityPanel - Panel de Validación de Integridad
 *
 * Muestra:
 * - Estado general de integridad
 * - Lista de problemas detectados
 * - Opciones de auto-reparación
 * - Historial de validaciones
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Info,
  Zap,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  IntegrityValidator,
  type IntegrityReport,
  type IntegrityIssue,
} from '@/db/services/IntegrityValidator';

// ============================================================================
// TIPOS
// ============================================================================

interface IntegrityPanelProps {
  className?: string;
}

// ============================================================================
// COMPONENTES HIJO
// ============================================================================

function StatusBadge({ status }: { status: 'healthy' | 'warning' | 'critical' }) {
  const config = {
    healthy: {
      icon: CheckCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      label: 'Saludable',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      label: 'Advertencia',
    },
    critical: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10', label: 'Crítico' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
        bg,
        color
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </span>
  );
}

function IssueCard({ issue, onExpand }: { issue: IntegrityIssue; onExpand: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const severityConfig = {
    info: { color: 'text-blue-500', bg: 'border-blue-500/20 bg-blue-500/5' },
    warning: { color: 'text-amber-500', bg: 'border-amber-500/20 bg-amber-500/5' },
    error: { color: 'text-rose-500', bg: 'border-rose-500/20 bg-rose-500/5' },
    critical: { color: 'text-rose-600', bg: 'border-rose-600/30 bg-rose-600/10' },
  };

  const { color, bg } = severityConfig[issue.severity];

  return (
    <div className={cn('border rounded-xl overflow-hidden', bg)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              issue.severity === 'critical'
                ? 'bg-rose-600'
                : issue.severity === 'error'
                  ? 'bg-rose-500'
                  : issue.severity === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
            )}
          />
          <div className="text-left">
            <p className="text-sm font-medium text-primary">{issue.description}</p>
            <p className="text-xs text-muted">
              {issue.table} • {issue.recordIds.length} registros
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {issue.autoFixAvailable && (
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 text-xs rounded-full">
              Auto-fix
            </span>
          )}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-white/10">
              <div className="pt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Tipo:</span>
                  <span className="text-secondary">{issue.type}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted">Severidad:</span>
                  <span className={color}>{issue.severity}</span>
                </div>
                {issue.estimatedImpact && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted">Impacto:</span>
                    <span className="text-secondary">{issue.estimatedImpact}</span>
                  </div>
                )}
                {issue.recordIds.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-muted mb-1">IDs afectados:</p>
                    <div className="max-h-24 overflow-y-auto bg-black/10 rounded p-2">
                      {issue.recordIds.slice(0, 10).map((id, i) => (
                        <p key={i} className="text-xs font-mono text-secondary truncate">
                          {id}
                        </p>
                      ))}
                      {issue.recordIds.length > 10 && (
                        <p className="text-xs text-muted mt-1">
                          +{issue.recordIds.length - 10} más...
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricsCard({ report }: { report: IntegrityReport }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 bg-surface rounded-xl text-center">
        <p
          className={cn(
            'text-2xl font-bold',
            report.metrics.orphanedRecords > 0 ? 'text-amber-500' : 'text-emerald-500'
          )}
        >
          {report.metrics.orphanedRecords}
        </p>
        <p className="text-xs text-muted">Huérfanos</p>
      </div>
      <div className="p-3 bg-surface rounded-xl text-center">
        <p
          className={cn(
            'text-2xl font-bold',
            report.metrics.duplicateRecords > 0 ? 'text-rose-500' : 'text-emerald-500'
          )}
        >
          {report.metrics.duplicateRecords}
        </p>
        <p className="text-xs text-muted">Duplicados</p>
      </div>
      <div className="p-3 bg-surface rounded-xl text-center">
        <p
          className={cn(
            'text-2xl font-bold',
            report.metrics.validationErrors > 0 ? 'text-rose-500' : 'text-emerald-500'
          )}
        >
          {report.metrics.validationErrors}
        </p>
        <p className="text-xs text-muted">Errores</p>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function IntegrityPanel({ className }: IntegrityPanelProps) {
  const [report, setReport] = useState<IntegrityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Cargar estado inicial
  useEffect(() => {
    loadQuickStatus();
  }, []);

  const loadQuickStatus = async () => {
    setIsLoading(true);
    try {
      const status = await IntegrityValidator.getQuickStatus();
      // Solo mostrar si tenemos issues
      if (status.issues > 0) {
        const fullReport = await IntegrityValidator.validate(false);
        setReport(fullReport);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidate = async (autoFix = false) => {
    setIsRunning(true);
    try {
      const newReport = await IntegrityValidator.validate(autoFix);
      setReport(newReport);

      if (newReport.totalIssues === 0) {
        toast.success('Integridad validada: Sin problemas detectados');
      } else if (autoFix) {
        toast.success(
          `Validación completada: ${newReport.totalIssues} problemas, algunos corregidos`
        );
      } else {
        toast.warning(`Se encontraron ${newReport.totalIssues} problemas`);
      }
    } catch (error) {
      toast.error('Error al validar integridad');
    } finally {
      setIsRunning(false);
    }
  };

  const getOverallStatus = (): 'healthy' | 'warning' | 'critical' => {
    if (!report) return 'healthy';
    const critical = report.issuesBySeverity['critical'] || 0;
    const errors = report.issuesBySeverity['error'] || 0;

    if (critical > 0 || errors > 5) return 'critical';
    if (critical > 0 || errors > 0) return 'warning';
    return 'healthy';
  };

  return (
    <div className={cn('bg-base rounded-2xl border border-subtle overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-bold text-primary">Integridad de Datos</h3>
              <p className="text-xs text-muted">Valida la consistencia de la base de datos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={getOverallStatus()} />
            <button
              onClick={() => handleValidate(false)}
              disabled={isRunning}
              className="p-2 rounded-lg hover:bg-surface transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-5 h-5 text-muted', isRunning && 'animate-spin')} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-muted animate-spin" />
          </div>
        ) : !report ? (
          <div className="text-center py-8">
            <p className="text-muted mb-4">No hay datos de validación recientes</p>
            <button
              onClick={() => handleValidate(false)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Validar Ahora
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info */}
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Validado: {new Date(report.timestamp).toLocaleString()}</span>
              <span>{report.duration.toFixed(0)}ms</span>
            </div>

            {/* Metrics */}
            <MetricsCard report={report} />

            {/* Summary */}
            {report.totalIssues > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-secondary">
                  Problemas Detectados ({report.totalIssues})
                </h4>

                {/* Group by severity */}
                {['critical', 'error', 'warning', 'info'].map(severity => {
                  const issues = report.issues.filter(i => i.severity === severity);
                  if (issues.length === 0) return null;

                  return (
                    <div key={severity} className="space-y-2">
                      <p
                        className={cn(
                          'text-xs font-medium uppercase',
                          severity === 'critical'
                            ? 'text-rose-600'
                            : severity === 'error'
                              ? 'text-rose-500'
                              : severity === 'warning'
                                ? 'text-amber-500'
                                : 'text-blue-500'
                        )}
                      >
                        {severity} ({issues.length})
                      </p>
                      {issues.map(issue => (
                        <IssueCard key={issue.id} issue={issue} onExpand={() => {}} />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {report.totalIssues === 0 && (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="text-primary font-medium">¡Todo en orden!</p>
                <p className="text-sm text-muted">No se detectaron problemas de integridad</p>
              </div>
            )}

            {/* Actions */}
            {report.totalIssues > 0 && (
              <div className="flex gap-3 pt-4 border-t border-subtle">
                <button
                  onClick={() => handleValidate(true)}
                  disabled={isRunning}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  <Zap className="w-4 h-4" />
                  Auto-Reparar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default IntegrityPanel;
