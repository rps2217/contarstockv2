
import React, { Suspense, useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus } from './components/NetworkStatus';
import { Sidebar } from './components/Sidebar';
import { BottomDock } from './components/BottomDock';
import { SystemStatus } from './components/SystemStatus';
import { Box, Loader2, Database, WifiOff, Cpu, RefreshCw } from 'lucide-react';
import { lazyWithRetry } from './services/lazyLoad';
import { initPersistence } from './services/backupService';
import { Login } from './components/Login';
import { InitializationService, InitStep } from './services/initializationService';

// --- VISTAS MAESTRAS ---
const Dashboard = lazyWithRetry(() => import('./components/Dashboard'));
const Reports = lazyWithRetry(() => import('./components/Reports'));
const DatabaseView = lazyWithRetry(() => import('./components/Database'));
const Sync = lazyWithRetry(() => import('./components/SyncManagerUI'));
const Settings = lazyWithRetry(() => import('./components/Settings'));

// --- MÓDULOS OPERATIVOS (FEATURES) ---
const CountingPage = lazyWithRetry(() => import('./features/counting/CountingPage'));
const HammerPage = lazyWithRetry(() => import('./features/hammer/HammerPage'));
const ReceptionPage = lazyWithRetry(() => import('./features/reception/ReceptionPage'));

const AppContent = () => {
 const location = useLocation();
 const { settings } = useAppStore();
 const [bootState, setBootState] = useState<'initializing' | 'ready'>('initializing');
 const [initStep, setInitStep] = useState<InitStep>('idle');
 const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
 
 // Detectar si estamos en un modo de escaneo inmersivo
 const isScanningMode = location.pathname.startsWith('/counting/') || 
 location.pathname === '/reception' || 
 location.pathname.startsWith('/massive/');

 useEffect(() => {
 initPersistence();
 const authStatus = localStorage.getItem('logicount_auth') === 'true';
 setIsAuthenticated(authStatus);
 
 if (authStatus) {
 InitializationService.run((step) => {
 setInitStep(step);
 if (step === 'ready') setBootState('ready');
 });
 } else {
 setBootState('ready');
 }
 }, [isAuthenticated]);

 const themeClasses: Record<string, string> = {
 'light': 'bg-slate-50 text-slate-900',
 'dark': 'bg-slate-950 text-slate-100',
 'navy': 'bg-blue-950 text-blue-50',
 'oled': 'bg-black text-white',
 'warm': 'bg-orange-50 text-orange-950',
 'contrast': 'bg-yellow-400 text-black'
 };

 const currentThemeClass = themeClasses[settings.theme] || themeClasses.dark;

 if (bootState === 'initializing' && isAuthenticated !== false) {
 return (
 <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-white p-8 font-mono">
 <div className="relative mb-10">
 <div className={`p-10 border-4 ${initStep === 'purging' ? 'border-amber-500' : 'border-blue-600'} rounded-[3rem] relative z-10 bg-slate-950`}>
 {initStep === 'config' ? <Cpu className="w-16 h-16 text-blue-400 animate-pulse" /> : 
 initStep === 'database' ? <Database className="w-16 h-16 text-amber-500 animate-bounce" /> :
 initStep === 'purging' ? <RefreshCw className="w-16 h-16 text-amber-500 animate-spin" /> :
 initStep === 'offline' ? <WifiOff className="w-16 h-16 text-rose-500" /> :
 <Box className="w-16 h-16 text-blue-500 animate-pulse" />}
 </div>
 <div className={`absolute inset-0 ${initStep === 'purging' ? 'bg-amber-600' : 'bg-blue-600'} blur-[60px] opacity-20 animate-pulse`}></div>
 </div>

 <h1 className="text-4xl font-black uppercase tracking-tighter italic mb-1">
 LOGICOUNT <span className="text-blue-500">PRO</span>
 </h1>
 
 <div className="mt-8 w-64">
 <div className="flex justify-between items-center mb-2 px-1">
 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
 {initStep === 'config' ? 'Cloud_Sync' : 
 initStep === 'database' ? 'Catalog_Refresh' : 
 initStep === 'purging' ? 'Purging_Cache' :
 'Kernel_Init'}
 </span>
 <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />
 </div>
 <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
 <div className="h-full bg-blue-600 transition-all duration-500 w-1/2" />
 </div>
 </div>
 </div>
 );
 }

 if (!isAuthenticated) return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;

 return (
 <div className={`w-full h-full flex flex-col transition-colors duration-500 ${currentThemeClass} font-mono`}>
 <SystemStatus />
 <NetworkStatus />
 
 <div className="flex-1 flex overflow-hidden relative">
 {!isScanningMode && <Sidebar view={location.pathname.split('/')[1] || 'dashboard'} settings={settings} />}
 
 <main className={`flex-1 relative overflow-hidden transition-all duration-500 ${!isScanningMode ? 'md:pl-64' : ''}`}>
 <ErrorBoundary>
 <Suspense fallback={<div className="h-full w-full flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>}>
 <Routes>
 <Route path="/" element={<Dashboard />} />
 <Route path="/dashboard" element={<Dashboard />} />
 <Route path="/reports" element={<Reports />} />
 <Route path="/database" element={<DatabaseView />} />
 <Route path="/sync" element={<Sync />} />
 <Route path="/settings" element={<Settings />} />
 
 {/* RUTAS MODULARES DE FEATURES */}
 <Route path="/reception" element={<ReceptionPage />} />
 <Route path="/counting/:id" element={<CountingPage />} />
 <Route path="/massive/:batchId" element={<HammerPage />} />
 
 <Route path="*" element={<Navigate to="/" replace />} />
 </Routes>
 </Suspense>
 </ErrorBoundary>
 </main>
 </div>
 
 {!isScanningMode && <BottomDock currentView={location.pathname.split('/')[1] || 'dashboard'} settings={settings} />}
 </div>
 );
};

const App = () => (
 <Router>
 <AppContent />
 </Router>
);

export default App;
