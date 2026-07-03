// Redesign Components - Exportaciones centralizadas

export { RedesignSidebar } from './Sidebar';
export { RedesignBottomDock } from './BottomDock';
export { RedesignDashboard } from './Dashboard';
export { RedesignThemeProvider, useRedesignTheme, useTheme } from './ThemeContext';
export { RedesignAppShell, RedesignAppShellWrapper } from './AppShell';
export { cn } from './utils';

// Hooks de base de datos
export { useDbReady, safeDbOperation, safeCount } from './hooks/useDbReady';

// Componentes
export { DbLoader, DbError } from './components/DbLoader';

// Re-exportar ThemeName para uso en componentes del rediseño
export type { ThemeName } from './ThemeContext';

// Páginas rediseñadas
export { RedesignCapturePage } from './pages/CapturePage';
export { RedesignSettingsPage } from './pages/SettingsPage';
export { RedesignExpiryPage } from './pages/ExpiryPage';
export { RedesignReportsPage } from './pages/ReportsPage';
export { RedesignDataPage } from './pages/DataPage';
export { RedesignSyncPage } from './pages/SyncPage';
export { RedesignHammerPage } from './pages/HammerPage';
export { RedesignEventsPage } from './pages/EventsPage';
export { RedesignCustomersPage } from './pages/CustomersPage';
export { RedesignSuppliersPage } from './pages/SuppliersPage';
export { RedesignSlicesPage } from './pages/SlicesPage';
export { RedesignTheoreticalLoadsPage } from './pages/TheoreticalLoadsPage';
export { RedesignInventoryPage } from './pages/InventoryPage';
export { RedesignAuditPage } from './pages/AuditPage';
