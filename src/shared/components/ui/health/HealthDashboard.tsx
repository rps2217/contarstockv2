/**
 * =============================================================================
 * HealthDashboard - Dashboard de salud del sistema
 * =============================================================================
 * 
 * Muestra:
 * - Estado general de salud
 * - Métricas clave
 * - Alertas activas
 * - Integridad de datos
 * - Historial de métricas
 * 
 * @since 2026-07-07
 */

import React, { useState, useEffect, useCallback } from 'react'
import { logger } from '@/services/logger';
;
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  RefreshCw,
  Clock,
  Package,
  Scan,
  Calendar,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  X,
  Check,
  Settings,
  TrendingDown as TrendDownIcon,
  History,
} from 'lucide-react';
import { healthService, SystemMetrics, Alert, HealthReport } from '@/services/HealthService';
import { integrityService, IntegrityCheckResult } from '@/services/IntegrityService';

interface HealthDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light' | string;
}

export const HealthDashboard: React.FC<HealthDashboardProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [integrityResult, setIntegrityResult] = useState<IntegrityCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'integrity' | 'history'>('overview');
  // ✅ Estado para historial de métricas
  const [metricsHistory, setMetricsHistory] = useState<SystemMetrics[]>([]);

  const isDark = theme === 'dark';

  // Cargar datos
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [health, metricsData, alertsData, integrity, history] = await Promise.all([
        healthService.getHealthReport(),
        healthService.getMetrics(),
        Promise.resolve(healthService.getUnacknowledgedAlerts()),
        integrityService.runAllChecks(),
        Promise.resolve(healthService.getMetricsHistory()),
      ]);
      
      setHealthReport(health);
      setMetrics(metricsData);
      setAlerts(alertsData);
      setIntegrityResult(integrity);
      // ✅ Cargar historial de métricas
      setMetricsHistory(history);
    } catch (error) {
      logger.error('HealthDashboard', 'Failed to load health data', error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Acknowledged alert
  const acknowledgeAlert = (alertId: string) => {
    healthService.acknowledgeAlert(alertId);
    setAlerts(healthService.getUnacknowledgedAlerts());
  };

  // Auto-fix
  const handleAutoFix = async () => {
    setIsLoading(true);
    try {
      const result = await integrityService.autoFix();
      alert(`Se corrigieron ${result.fixed} problemas automáticamente`);
      await loadData();
    } catch (error) {
      logger.error('HealthDashboard', 'Auto-fix failed', error instanceof Error ? error.message : String(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl ${
            isDark ? 'bg-base border-white/10' : 'bg-white border-slate-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-6 border-b flex items-center justify-between ${
            isDark ? 'border-white/10 bg-surface/50' : 'border-slate-200 bg-slate-50'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${
                healthReport?.overall === 'healthy' 
                  ? 'bg-emerald-500/20' 
                  : healthReport?.overall === 'degraded'
                    ? 'bg-amber-500/20'
                    : 'bg-red-500/20'
              }`}>
                <Activity className={`w-6 h-6 ${
                  healthReport?.overall === 'healthy' 
                    ? 'text-emerald-400' 
                    : healthReport?.overall === 'degraded'
                      ? 'text-amber-400'
                      : 'text-red-400'
                }`} />
              </div>
              <div>
                <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Dashboard de Salud
                </h2>
                <p className={`text-sm ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                  Estado del sistema y métricas en tiempo real
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={isLoading}
                className={`p-3 rounded-xl transition-colors ${
                  isDark 
                    ? 'bg-white/5 hover:bg-white/10 text-white' 
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                } ${isLoading ? 'animate-spin' : ''}`}
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className={`p-3 rounded-xl transition-colors ${
                  isDark 
                    ? 'bg-white/5 hover:bg-white/10 text-white' 
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className={`px-6 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
            <div className="flex gap-1">
              {[
                { id: 'overview', label: 'Resumen' },
                { id: 'alerts', label: 'Alertas', badge: alerts.length },
                { id: 'integrity', label: 'Integridad' },
                { id: 'history', label: 'Historial', badge: metricsHistory.length > 0 ? metricsHistory.length : undefined },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-4 py-3 text-sm font-bold transition-colors relative ${
                    activeTab === tab.id
                      ? isDark 
                        ? 'text-white border-b-2 border-blue-500'
                        : 'text-blue-600 border-b-2 border-blue-500'
                      : isDark
                        ? 'text-muted hover:text-white'
                        : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Health Status */}
                <div className={`p-6 rounded-2xl border-2 ${
                  healthReport?.overall === 'healthy'
                    ? isDark 
                      ? 'bg-emerald-500/10 border-emerald-500/30' 
                      : 'bg-green-50 border-green-200'
                    : healthReport?.overall === 'degraded'
                      ? isDark
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-amber-50 border-amber-200'
                      : isDark
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    {healthReport?.overall === 'healthy' ? (
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    ) : healthReport?.overall === 'degraded' ? (
                      <AlertTriangle className="w-6 h-6 text-amber-500" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    )}
                    <h3 className={`text-lg font-black ${
                      healthReport?.overall === 'healthy'
                        ? 'text-emerald-400'
                        : healthReport?.overall === 'degraded'
                          ? 'text-amber-400'
                          : 'text-red-400'
                    }`}>
                      {healthReport?.overall === 'healthy' 
                        ? 'Sistema Saludable' 
                        : healthReport?.overall === 'degraded'
                          ? 'Sistema con Problemas'
                          : 'Sistema Crítico'}
                    </h3>
                  </div>
                  <div className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Uptime: {healthService.getUptime()} • 
                    Última verificación: {healthReport && new Date(healthReport.timestamp).toLocaleTimeString()}
                  </div>
                </div>

                {/* Metrics Grid */}
                {metrics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard
                      icon={<Package className="w-5 h-5" />}
                      label="Productos"
                      value={metrics.totalProducts}
                      theme={theme}
                    />
                    <MetricCard
                      icon={<Scan className="w-5 h-5" />}
                      label="Scans Totales"
                      value={metrics.totalScans}
                      subValue={`${metrics.scansToday} hoy`}
                      theme={theme}
                    />
                    <MetricCard
                      icon={<Calendar className="w-5 h-5" />}
                      label="Vencimientos"
                      value={metrics.totalExpirations}
                      subValue={`${metrics.expiringThisMonth}/mes`}
                      theme={theme}
                    />
                    <MetricCard
                      icon={<Clock className="w-5 h-5" />}
                      label="Sesiones"
                      value={metrics.totalSessions}
                      subValue={`${metrics.sessionsActive} activas`}
                      theme={theme}
                    />
                  </div>
                )}

                {/* Expiry Alerts */}
                {metrics && (
                  <div className="grid grid-cols-3 gap-4">
                    <AlertCard
                      title="Esta Semana"
                      value={metrics.expiringThisWeek}
                      icon={<TrendingUp className="w-5 h-5" />}
                      color="amber"
                      theme={theme}
                    />
                    <AlertCard
                      title="Vencidos"
                      value={metrics.expiredCount}
                      icon={<AlertTriangle className="w-5 h-5" />}
                      color="red"
                      theme={theme}
                    />
                    <AlertCard
                      title="Tasa Sync"
                      value={`${metrics.syncSuccessRate}%`}
                      icon={<Activity className="w-5 h-5" />}
                      color={metrics.syncSuccessRate >= 90 ? 'green' : 'amber'}
                      theme={theme}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="space-y-4">
                {alerts.length === 0 ? (
                  <div className={`p-8 text-center rounded-2xl ${
                    isDark ? 'bg-white/5' : 'bg-slate-100'
                  }`}>
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      No hay alertas pendientes
                    </p>
                    <p className={`text-sm ${isDark ? 'text-muted' : 'text-slate-500'}`}>
                      Todas las alertas han sido reconocidas
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-xl border ${
                        alert.type === 'critical'
                          ? isDark
                            ? 'bg-red-500/10 border-red-500/30'
                            : 'bg-red-50 border-red-200'
                          : alert.type === 'warning'
                            ? isDark
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-amber-50 border-amber-200'
                            : isDark
                              ? 'bg-blue-500/10 border-blue-500/30'
                              : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                            alert.type === 'critical'
                              ? 'text-red-500'
                              : alert.type === 'warning'
                                ? 'text-amber-500'
                                : 'text-blue-500'
                          }`} />
                          <div>
                            <p className={`font-bold ${
                              alert.type === 'critical'
                                ? 'text-red-400'
                                : alert.type === 'warning'
                                  ? 'text-amber-400'
                                  : 'text-blue-400'
                            }`}>
                              {alert.title}
                            </p>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {alert.message}
                            </p>
                            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {new Date(alert.timestamp).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className={`p-2 rounded-lg ${
                            isDark
                              ? 'bg-white/5 hover:bg-white/10'
                              : 'bg-slate-200 hover:bg-slate-300'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Integrity Tab */}
            {activeTab === 'integrity' && (
              <div className="space-y-6">
                {integrityResult && (
                  <>
                    <div className={`p-6 rounded-2xl border ${
                      integrityResult.passed
                        ? isDark
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-green-50 border-green-200'
                        : isDark
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className={`text-lg font-bold ${
                            integrityResult.passed
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          }`}>
                            {integrityResult.passed 
                              ? '✅ Integridad Verificada' 
                              : '❌ Problemas de Integridad'}
                          </h3>
                          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            {integrityResult.totalIssues} problemas encontrados
                            ({integrityResult.criticalIssues} críticos, {integrityResult.warningIssues} warnings)
                          </p>
                        </div>
                        {!integrityResult.passed && (
                          <button
                            onClick={handleAutoFix}
                            disabled={isLoading}
                            className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-400 transition-colors"
                          >
                            Auto-Corregir
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Issues List */}
                    <div className="space-y-2">
                      {integrityResult.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`p-4 rounded-xl border ${
                            issue.severity === 'critical'
                              ? isDark
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-red-50 border-red-200'
                              : issue.severity === 'warning'
                                ? isDark
                                  ? 'bg-amber-500/10 border-amber-500/30'
                                  : 'bg-amber-50 border-amber-200'
                                : isDark
                                  ? 'bg-blue-500/10 border-blue-500/30'
                                  : 'bg-blue-50 border-blue-200'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg">
                              {issue.severity === 'critical' ? '🔴' 
                                : issue.severity === 'warning' ? '🟡' : '🔵'}
                            </span>
                            <div className="flex-1">
                              <p className={`font-bold ${
                                issue.severity === 'critical'
                                  ? 'text-red-400'
                                  : issue.severity === 'warning'
                                    ? 'text-amber-400'
                                    : 'text-blue-400'
                              }`}>
                                [{issue.table.toUpperCase()}] {issue.description}
                              </p>
                              {issue.suggestion && (
                                <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                💡 {issue.suggestion}
                              </p>
                            )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ✅ History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-6">
                <div className={`p-4 rounded-xl border ${
                  isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3 mb-2">
                    <History className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                    <h3 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Historial de Métricas
                    </h3>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {metricsHistory.length} registros de métricas capturados
                  </p>
                </div>

                {metricsHistory.length === 0 ? (
                  <div className={`p-8 text-center rounded-xl ${
                    isDark ? 'bg-white/5' : 'bg-slate-100'
                  }`}>
                    <History className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-slate-600' : 'text-slate-400'}`} />
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Sin datos de historial
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      Las métricas se registrarán automáticamente cada 5 minutos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Header de la tabla */}
                    <div className={`grid grid-cols-6 gap-2 px-4 py-2 text-xs font-bold uppercase ${
                      isDark ? 'text-slate-500' : 'text-slate-500'
                    }`}>
                      <div>Fecha</div>
                      <div>Scans</div>
                      <div>Expirados</div>
                      <div>Esta Semana</div>
                      <div>Tasa Sync</div>
                      <div>Estado</div>
                    </div>
                    
                    {/* Filas de datos */}
                    {[...metricsHistory].reverse().slice(0, 20).map((m, idx) => {
                      const date = new Date(m.timestamp);
                      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <div
                          key={idx}
                          className={`grid grid-cols-6 gap-2 px-4 py-3 rounded-xl text-sm ${
                            isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-50 hover:bg-slate-100'
                          }`}
                        >
                          <div className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                            {timeStr}
                          </div>
                          <div className="font-medium">
                            {m.scansToday}
                          </div>
                          <div className={m.expiredCount > 0 ? 'text-red-400 font-bold' : ''}>
                            {m.expiredCount}
                          </div>
                          <div className={m.expiringThisWeek > 5 ? 'text-amber-400' : ''}>
                            {m.expiringThisWeek}
                          </div>
                          <div className={
                            m.syncSuccessRate >= 90 ? 'text-emerald-400' :
                            m.syncSuccessRate >= 70 ? 'text-amber-400' : 'text-red-400'
                          }>
                            {m.syncSuccessRate}%
                          </div>
                          <div>
                            {m.expiredCount > 0 ? (
                              <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold">
                                Crítico
                              </span>
                            ) : m.syncSuccessRate < 80 ? (
                              <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold">
                                Warning
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold">
                                OK
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Gráfico simple de tendencias */}
                {metricsHistory.length >= 2 && (
                  <div className={`p-6 rounded-xl border ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <h4 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Tendencia de Sincronización
                    </h4>
                    <div className="flex items-end gap-1 h-32">
                      {[...metricsHistory].reverse().slice(-10).map((m, idx) => {
                        const height = m.syncSuccessRate;
                        const color = height >= 90 ? 'bg-emerald-500' 
                          : height >= 70 ? 'bg-amber-500' 
                          : 'bg-red-500';
                        
                        return (
                          <div
                            key={idx}
                            className="flex-1 flex flex-col items-center justify-end"
                          >
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${height}%` }}
                              transition={{ duration: 0.5, delay: idx * 0.05 }}
                              className={`w-full rounded-t ${color} opacity-80`}
                              title={`${height}%`}
                            />
                            <span className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {idx === metricsHistory.length - 1 ? 'Ahora' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {metricsHistory.length > 0 && (
                      <div className="flex justify-between mt-2 text-xs text-muted">
                        <span>{new Date(metricsHistory[0]?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>{new Date(metricsHistory[metricsHistory.length - 1]?.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Sub-components
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subValue?: string;
  theme?: 'dark' | 'light' | string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, subValue, theme }) => {
  const isDark = theme === 'dark';
  
  return (
    <div className={`p-4 rounded-xl border ${
      isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>{icon}</span>
        <span className={`text-xs font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          {label}
        </span>
      </div>
      <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {value.toLocaleString()}
      </p>
      {subValue && (
        <p className={`text-xs ${isDark ? 'text-muted' : 'text-slate-500'}`}>
          {subValue}
        </p>
      )}
    </div>
  );
};

interface AlertCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'green' | 'amber' | 'red' | 'blue';
  theme?: 'dark' | 'light' | string;
}

const AlertCard: React.FC<AlertCardProps> = ({ title, value, icon, color, theme }) => {
  const isDark = theme === 'dark';
  const colorClasses = {
    green: isDark ? 'text-emerald-400' : 'text-green-600',
    amber: isDark ? 'text-amber-400' : 'text-amber-600',
    red: isDark ? 'text-red-400' : 'text-red-600',
    blue: isDark ? 'text-blue-400' : 'text-blue-600',
  };
  
  return (
    <div className={`p-4 rounded-xl border text-center ${
      isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className={`flex justify-center mb-2 ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>
      <p className={`text-xs ${isDark ? 'text-muted' : 'text-slate-500'}`}>
        {title}
      </p>
    </div>
  );
};
