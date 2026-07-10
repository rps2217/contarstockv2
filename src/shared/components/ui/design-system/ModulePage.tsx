/**
 * ModulePage - Wrapper unificado para páginas de módulo
 * 
 * Proporciona estructura consistente: header, contenido, FAB.
 */

import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, RefreshCw } from 'lucide-react';

interface ModulePageProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack?: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  isDark?: boolean;
  isLoading?: boolean;
  onRefresh?: () => void;
  showBackButton?: boolean;
  fab?: React.ReactNode;
  className?: string;
}

export const ModulePage: React.FC<ModulePageProps> = ({
  title,
  subtitle,
  icon,
  onBack,
  actions,
  children,
  isDark = true,
  isLoading = false,
  onRefresh,
  showBackButton = true,
  fab,
  className = '',
}) => {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-base' : 'bg-neutral-50'} ${className}`}>
      {/* Header */}
      <header className={`
        px-4 py-4 shrink-0 border-b
        ${isDark 
          ? 'bg-base border-subtle' 
          : 'bg-white border-neutral-200'
        }
      `}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Back Button */}
            {showBackButton && (
              <button 
                onClick={handleBack}
                className={`
                  p-2.5 rounded-xl transition-all active:scale-95
                  ${isDark 
                    ? 'bg-surface text-muted hover:text-white hover:bg-elevated' 
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                  }
                `}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            
            {/* Icon */}
            {icon && (
              <div className={`
                p-2.5 rounded-xl
                ${isDark ? 'bg-surface' : 'bg-neutral-100'}
              `}>
                {icon}
              </div>
            )}
            
            {/* Title */}
            <div>
              <h1 className={`
                text-lg font-bold tracking-tight
                ${isDark ? 'text-white' : 'text-neutral-900'}
              `}>
                {title}
              </h1>
              {subtitle && (
                <p className={`
                  text-xs font-medium
                  ${isDark ? 'text-neutral-500' : 'text-neutral-500'}
                `}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className={`
                  p-2.5 rounded-xl transition-all active:scale-95
                  ${isDark 
                    ? 'bg-surface text-muted hover:text-white hover:bg-elevated' 
                    : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                  }
                  ${isLoading ? 'animate-spin' : ''}
                `}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {actions}
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.main 
        className="flex-1 overflow-y-auto pb-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="max-w-4xl mx-auto p-4">
          {children}
        </div>
      </motion.main>

      {/* FAB */}
      {fab}
    </div>
  );
};

// ============================================
// SimpleHeader - Header simple para dashboard
// ============================================

interface SimpleHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  isDark?: boolean;
}

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({
  title,
  subtitle,
  action,
  isDark = true,
}) => {
  return (
    <header className={`px-4 py-4 ${isDark ? 'bg-base' : 'bg-white'}`}>
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <h1 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-neutral-900'}`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
};

export default ModulePage;