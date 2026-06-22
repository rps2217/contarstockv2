/**
 * AppSheetView - Componentes de UI estilo AppSheet para compartir
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search,
  MoreVertical,
  X,
  ChevronLeft,
  Package
} from 'lucide-react';

// ============================================================================
// AppSheetHeader
// ============================================================================
interface AppSheetHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export const AppSheetHeader: React.FC<AppSheetHeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack = false,
  actions
}) => (
  <div className="bg-[var(--appsheet-bg-surface)] border-b border-[var(--appsheet-border-subtle)] px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {showBack && onBack && (
          <button 
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-[var(--appsheet-bg-hover)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-[var(--appsheet-text-primary)]">{title}</h1>
          {subtitle && (
            <p className="text-xs text-[var(--appsheet-text-tertiary)]">{subtitle}</p>
          )}
        </div>
      </div>
      {actions}
    </div>
  </div>
);

// ============================================================================
// AppSheetSearchBar
// ============================================================================
interface AppSheetSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const AppSheetSearchBar: React.FC<AppSheetSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...'
}) => (
  <div className="px-4 py-3 bg-[var(--appsheet-bg-base)]">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--appsheet-text-tertiary)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[var(--appsheet-bg-elevated)] border border-[var(--appsheet-border-subtle)] text-sm text-[var(--appsheet-text-primary)] placeholder:text-[var(--appsheet-text-tertiary)] focus:outline-none focus:border-[var(--appsheet-border-focus)] transition-colors"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--appsheet-bg-hover)]"
        >
          <X className="w-3 h-3 text-[var(--appsheet-text-tertiary)]" />
        </button>
      )}
    </div>
  </div>
);

// ============================================================================
// AppSheetRow
// ============================================================================
interface AppSheetRowProps {
  label: string;
  value: string | React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export const AppSheetRow: React.FC<AppSheetRowProps> = ({ label, value, icon, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 ${onClick ? 'cursor-pointer hover:bg-[var(--appsheet-bg-hover)]' : ''} transition-colors`}
  >
    {icon && <span className="text-[var(--appsheet-text-tertiary)]">{icon}</span>}
    <div className="flex-1 min-w-0">
      <p className="text-xs text-[var(--appsheet-text-tertiary)] uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[var(--appsheet-text-primary)] font-medium truncate">{value}</p>
    </div>
  </div>
);

// ============================================================================
// AppSheetActionMenu (3 puntos)
// ============================================================================
interface AppSheetActionMenuProps {
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
  }>;
}

export const AppSheetActionMenu: React.FC<AppSheetActionMenuProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className="p-2 rounded-lg hover:bg-[var(--appsheet-bg-hover)] transition-colors"
      >
        <MoreVertical className="w-5 h-5" />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute right-0 top-full mt-1 w-48 bg-[var(--appsheet-bg-card)] border border-[var(--appsheet-border-default)] rounded-lg shadow-lg overflow-hidden z-50"
          >
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); action.onClick(); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--appsheet-bg-hover)] transition-colors ${
                  action.variant === 'danger' ? 'text-[var(--appsheet-error)]' : 'text-[var(--appsheet-text-primary)]'
                }`}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// AppSheetListItem
// ============================================================================
interface AppSheetListItemProps {
  title: string;
  subtitle?: string;
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'info';
  };
  metadata?: Array<{ label: string; value: string }>;
  onClick?: () => void;
  actions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger';
  }>;
}

export const AppSheetListItem: React.FC<AppSheetListItemProps> = ({
  title,
  subtitle,
  status,
  metadata,
  onClick,
  actions
}) => {
  const statusColors = {
    success: 'bg-[var(--appsheet-success)]',
    warning: 'bg-[var(--appsheet-warning)]',
    error: 'bg-[var(--appsheet-error)]',
    info: 'bg-[var(--appsheet-info)]'
  };

  return (
    <div className="bg-[var(--appsheet-bg-surface)] border-b border-[var(--appsheet-border-subtle)] last:border-b-0">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status indicator */}
        <div className={`w-2 h-2 rounded-full shrink-0 ${status ? statusColors[status.variant] : 'bg-slate-500'}`} />
        
        {/* Content */}
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-[var(--appsheet-text-primary)] truncate">{title}</p>
            {status && (
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${
                status.variant === 'success' ? 'bg-[var(--appsheet-success-subtle)] text-[var(--appsheet-success)]' :
                status.variant === 'warning' ? 'bg-[var(--appsheet-warning-subtle)] text-[var(--appsheet-warning)]' :
                status.variant === 'error' ? 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)]' :
                'bg-[var(--appsheet-info-subtle)] text-[var(--appsheet-info)]'
              }`}>
                {status.label}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-[var(--appsheet-text-tertiary)] truncate">{subtitle}</p>
          )}
          {metadata && metadata.length > 0 && (
            <div className="flex items-center gap-4 mt-1">
              {metadata.slice(0, 3).map((m, i) => (
                <span key={i} className="text-[10px] text-[var(--appsheet-text-tertiary)]">
                  <span className="uppercase">{m.label}:</span> {m.value}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {actions && actions.length > 0 && (
          <AppSheetActionMenu actions={actions} />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// AppSheetDetailView
// ============================================================================
interface AppSheetDetailViewProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'info';
  };
  sections: Array<{
    title?: string;
    icon?: React.ReactNode;
    rows: Array<{ label: string; value: string }>;
  }>;
  onClose: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

export const AppSheetDetailView: React.FC<AppSheetDetailViewProps> = ({
  title,
  subtitle,
  icon,
  status,
  sections,
  onClose,
  actions
}) => {
  const statusColors = {
    success: 'bg-[var(--appsheet-success-subtle)] text-[var(--appsheet-success)] border-[var(--appsheet-success)]',
    warning: 'bg-[var(--appsheet-warning-subtle)] text-[var(--appsheet-warning)] border-[var(--appsheet-warning)]',
    error: 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)] border-[var(--appsheet-error)]',
    info: 'bg-[var(--appsheet-info-subtle)] text-[var(--appsheet-info)] border-[var(--appsheet-info)]'
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-[var(--appsheet-bg-base)] flex flex-col"
    >
      {/* Header */}
      <div className="bg-[var(--appsheet-bg-surface)] border-b border-[var(--appsheet-border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 rounded-lg hover:bg-[var(--appsheet-bg-hover)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-semibold text-[var(--appsheet-text-primary)] flex items-center gap-2">
                {icon}
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-[var(--appsheet-text-tertiary)]">{subtitle}</p>
              )}
            </div>
          </div>
          {status && (
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${statusColors[status.variant]}`}>
              {status.label}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={i} className="bg-[var(--appsheet-bg-surface)] border-b border-[var(--appsheet-border-subtle)]">
            {section.title && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--appsheet-bg-elevated)]">
                {section.icon && <span className="text-[var(--appsheet-primary-primary)]">{section.icon}</span>}
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--appsheet-text-secondary)]">
                  {section.title}
                </span>
              </div>
            )}
            {section.rows.map((row, j) => (
              <AppSheetRow key={j} label={row.label} value={row.value} />
            ))}
          </div>
        ))}
      </div>

      {/* Footer Actions */}
      {actions && actions.length > 0 && (
        <div className="p-4 bg-[var(--appsheet-bg-surface)] border-t border-[var(--appsheet-border-subtle)]">
          <div className="flex gap-3">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
                  action.variant === 'primary' 
                    ? 'bg-[var(--appsheet-primary-primary)] text-[var(--appsheet-text-inverse)] hover:opacity-90' :
                  action.variant === 'danger'
                    ? 'bg-[var(--appsheet-error-subtle)] text-[var(--appsheet-error)] hover:bg-[var(--appsheet-error)] hover:text-white' :
                    'bg-[var(--appsheet-bg-elevated)] text-[var(--appsheet-text-primary)] hover:bg-[var(--appsheet-bg-hover)]'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// ============================================================================
// AppSheetEmptyState
// ============================================================================
interface AppSheetEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const AppSheetEmptyState: React.FC<AppSheetEmptyStateProps> = ({
  icon,
  title,
  description,
  action
}) => (
  <div className="flex flex-col items-center justify-center py-12 text-center px-4">
    {icon && <div className="text-[var(--appsheet-text-disabled)] mb-4">{icon}</div>}
    <p className="text-[var(--appsheet-text-secondary)] font-medium">{title}</p>
    {description && (
      <p className="text-sm text-[var(--appsheet-text-tertiary)] mt-1">{description}</p>
    )}
    {action && (
      <button
        onClick={action.onClick}
        className="mt-4 px-4 py-2 rounded-lg bg-[var(--appsheet-primary-primary)] text-white text-sm font-medium"
      >
        {action.label}
      </button>
    )}
  </div>
);

// ============================================================================
// AppSheetFilterChips
// ============================================================================
interface AppSheetFilterChipsProps {
  filters: Array<{
    label: string;
    key: string[];
  }>;
  selectedKey: string[];
  onChange: (key: string[]) => void;
}

export const AppSheetFilterChips: React.FC<AppSheetFilterChipsProps> = ({
  filters,
  selectedKey,
  onChange
}) => (
  <div className="px-4 py-2 flex gap-2 overflow-x-auto">
    {filters.map(filter => {
      const isSelected = selectedKey.length === 0 && filter.key.length === 0 ||
                         JSON.stringify(selectedKey) === JSON.stringify(filter.key);
      return (
        <button
          key={filter.label}
          onClick={() => onChange(filter.key)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
            isSelected
              ? 'bg-[var(--appsheet-primary-primary)] text-[var(--appsheet-text-inverse)]'
              : 'bg-[var(--appsheet-bg-elevated)] text-[var(--appsheet-text-secondary)] hover:bg-[var(--appsheet-bg-hover)]'
          }`}
        >
          {filter.label}
        </button>
      );
    })}
  </div>
);
