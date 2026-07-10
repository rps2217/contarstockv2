/**
 * Dashboard Components - Exportaciones
 * 
 * Componentes para el dashboard con optimizaciones de performance.
 */

// Core components
export { MetricCard } from './MetricCard';
export { QuickAction } from './QuickAction';
export { RecentActivity } from './RecentActivity';
export { DashboardHeader } from './DashboardHeader';
export { SparklineChart } from './SparklineChart';
export { TodaySummary } from './TodaySummary';
export { KeyboardShortcuts } from './KeyboardShortcuts';

// Optimized components (memoized)
export { DashboardStatCard, DashboardStatCardSimple } from './DashboardStatCard';
export { DashboardActionCard, DashboardActionCardSimple } from './DashboardActionCard';
export { LazyStatsGrid } from './LazyStatsGrid';