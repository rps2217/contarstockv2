// Redesign Components - Exportaciones centralizadas

export { RedesignSidebar } from './Sidebar';
export { RedesignBottomDock } from './BottomDock';
export { RedesignDashboard } from './Dashboard';
export { RedesignThemeProvider, useRedesignTheme, useTheme } from './ThemeContext';
export { RedesignAppShell, RedesignAppShellWrapper } from './AppShell';
export { cn } from './utils';

// Re-exportar ThemeName para uso en componentes del rediseño
export type { ThemeName } from './ThemeContext';

// Páginas rediseñadas
export { RedesignCapturePage } from './pages/CapturePage';
export { RedesignSettingsPage } from './pages/SettingsPage';
export { RedesignExpiryPage } from './pages/ExpiryPage';
export { RedesignReportsPage } from './pages/ReportsPage';
export { RedesignDataPage } from './pages/DataPage';
export { RedesignSyncPage } from './pages/SyncPage';