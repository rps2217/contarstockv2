/**
 * RedesignPreview - Página de preview del rediseño completo
 * 
 * Esta página demuestra todos los componentes del rediseño
 * y puede ser accedida como ruta de preview para validación.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ExternalLink, 
  LayoutDashboard, 
  ScanLine, 
  Database,
  BarChart3,
  Settings,
  Check,
} from 'lucide-react';
import { RedesignAppShellWrapper } from './AppShell';
import { RedesignThemeProvider } from './ThemeContext';
import { cn } from '@/lib/utils';

interface RedesignPreviewProps {
  onClose?: () => void;
  embedded?: boolean;
}

type PreviewView = 'shell' | 'dashboard' | 'capture' | 'data' | 'expiry' | 'reports' | 'settings' | 'sync';

const THUMBNAIL_NAV = [
  { id: 'shell' as PreviewView, label: 'App Shell', icon: LayoutDashboard },
  { id: 'dashboard' as PreviewView, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'capture' as PreviewView, label: 'Captura', icon: ScanLine },
  { id: 'data' as PreviewView, label: 'Datos', icon: Database },
  { id: 'reports' as PreviewView, label: 'Reportes', icon: BarChart3 },
  { id: 'settings' as PreviewView, label: 'Ajustes', icon: Settings },
];

export const RedesignPreview: React.FC<RedesignPreviewProps> = ({ 
  onClose,
  embedded = false 
}) => {
  const [currentView, setCurrentView] = useState<PreviewView>('shell');

  // Si está embebido, mostrar solo el shell
  if (embedded) {
    return (
      <RedesignAppShellWrapper />
    );
  }

  // Vista de selector de preview
  return (
    <RedesignThemeProvider>
      <div className="fixed inset-0 z-[200] bg-neutral-950 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Preview del Rediseño</h1>
              <p className="text-xs text-neutral-400">ContarStock v2 - Nueva Interfaz</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Check className="w-3 h-3" />
              Build OK
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar de navegación */}
          <div className="w-64 bg-neutral-900/50 border-r border-neutral-800 p-4 shrink-0">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-4">
              Seleccionar Vista
            </h2>
            <div className="space-y-2">
              {THUMBNAIL_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <h3 className="text-sm font-semibold text-blue-400 mb-2">Info</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Este preview muestra la nueva interfaz rediseñada con el sistema 
                de tokens unificados y componentes optimizados para móvil.
              </p>
            </div>
          </div>

          {/* Preview area */}
          <div className="flex-1 bg-neutral-950 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {currentView === 'shell' ? (
                  <iframe
                    src="/preview/redesign"
                    className="w-full h-full border-0"
                    title="Redesign Shell Preview"
                  />
                ) : (
                  <RedesignAppShellWrapper 
                    syncPending={3}
                    userName="Preview User"
                    isOnline={true}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </RedesignThemeProvider>
  );
};

export default RedesignPreview;
