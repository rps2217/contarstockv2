/**
 * AppSheet Components - Sistema de componentes con estilo AppSheet
 * 
 * Proporciona componentes pre-estilizados con el tema AppSheet:
 * - Cards, Buttons, Inputs, Badges, Modals, etc.
 */

import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

// ============================================================================
// TIPOS COMPARTIDOS
// ============================================================================

export type AppSheetVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
export type AppSheetSize = 'sm' | 'md' | 'lg';

// ============================================================================
// BUTTON
// ============================================================================

export interface AppButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppSheetVariant;
  size?: AppSheetSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}, ref) => {
  const variantClass = {
    primary: 'appsheet-btn--primary',
    secondary: 'appsheet-btn--secondary',
    ghost: 'appsheet-btn--ghost',
    danger: 'appsheet-btn--danger',
    success: 'appsheet-btn--success',
    warning: 'appsheet-btn--warning',
  }[variant];

  const sizeClass = {
    sm: 'appsheet-btn--sm',
    md: '',
    lg: 'appsheet-btn--lg',
  }[size];

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`appsheet-btn ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          {children}
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </button>
  );
});

AppButton.displayName = 'AppButton';

// ============================================================================
// INPUT
// ============================================================================

export interface AppInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  size?: AppSheetSize;
}

export const AppInput = forwardRef<HTMLInputElement, AppInputProps>(({
  label,
  error,
  hint,
  icon,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const stateClass = error ? 'appsheet-input--error' : '';

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="appsheet-label">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--appsheet-text-tertiary)]">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`appsheet-input ${stateClass} ${icon ? 'pl-10' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="appsheet-hint--error">{error}</p>}
      {hint && !error && <p className="appsheet-hint">{hint}</p>}
    </div>
  );
});

AppInput.displayName = 'AppInput';

// ============================================================================
// TEXTAREA
// ============================================================================

export interface AppTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const AppTextarea = forwardRef<HTMLTextAreaElement, AppTextareaProps>(({
  label,
  error,
  hint,
  className = '',
  ...props
}, ref) => {
  const stateClass = error ? 'appsheet-input--error' : '';

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="appsheet-label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        className={`appsheet-input appsheet-textarea ${stateClass} ${className}`}
        {...props}
      />
      {error && <p className="appsheet-hint--error">{error}</p>}
      {hint && !error && <p className="appsheet-hint">{hint}</p>}
    </div>
  );
});

AppTextarea.displayName = 'AppTextarea';

// ============================================================================
// SELECT
// ============================================================================

export interface AppSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export const AppSelect = forwardRef<HTMLSelectElement, AppSelectProps>(({
  label,
  error,
  hint,
  options,
  placeholder,
  className = '',
  ...props
}, ref) => {
  const stateClass = error ? 'appsheet-input--error' : '';

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="appsheet-label">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={`appsheet-input appsheet-select ${stateClass} ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-[var(--appsheet-text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
      {error && <p className="appsheet-hint--error">{error}</p>}
      {hint && !error && <p className="appsheet-hint">{hint}</p>}
    </div>
  );
});

AppSelect.displayName = 'AppSelect';

// ============================================================================
// CARD
// ============================================================================

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const AppCard = forwardRef<HTMLDivElement, AppCardProps>(({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}, ref) => {
  const variantClass = {
    default: 'appsheet-card',
    elevated: 'appsheet-card appsheet-card--elevated',
    interactive: 'appsheet-card appsheet-card--interactive',
  }[variant];

  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }[padding];

  return (
    <div
      ref={ref}
      className={`${variantClass} ${paddingClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

AppCard.displayName = 'AppCard';

// ============================================================================
// BADGE
// ============================================================================

export interface AppBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const AppBadge: React.FC<AppBadgeProps> = ({
  children,
  variant = 'default',
  className = '',
  ...props
}) => {
  const variantClass = {
    default: 'appsheet-badge--default',
    primary: 'appsheet-badge--primary',
    success: 'appsheet-badge--success',
    warning: 'appsheet-badge--warning',
    error: 'appsheet-badge--error',
    info: 'appsheet-badge--info',
  }[variant];

  return (
    <span className={`appsheet-badge ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
};

// ============================================================================
// MODAL
// ============================================================================

export interface AppModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlay?: boolean;
}

export const AppModal: React.FC<AppModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
}) => {
  if (!isOpen) return null;

  const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-4xl',
  }[size];

  return (
    <>
      <div className="appsheet-modal-backdrop" onClick={closeOnOverlay ? onClose : undefined} />
      <div className={`appsheet-modal ${sizeClass}`}>
        {title && (
          <div className="appsheet-modal-header">
            <h2 className="text-title">{title}</h2>
            {description && (
              <p className="text-caption text-[var(--appsheet-text-secondary)] mt-1">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="appsheet-modal-body">
          {children}
        </div>
        {footer && (
          <div className="appsheet-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

// ============================================================================
// TABS
// ============================================================================

export interface AppTabsProps {
  tabs: Array<{ id: string; label: string; icon?: React.ReactNode }>;
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pill';
}

export const AppTabs: React.FC<AppTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
}) => {
  if (variant === 'pill') {
    return (
      <div className="appsheet-tabs-pill">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`appsheet-tab ${activeTab === tab.id ? 'appsheet-tab--active' : ''}`}
          >
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="appsheet-tabs">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`appsheet-tab ${activeTab === tab.id ? 'appsheet-tab--active' : ''}`}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// LIST
// ============================================================================

export interface AppListProps {
  children: React.ReactNode;
  interactive?: boolean;
}

export const AppList: React.FC<AppListProps> = ({ children, interactive = false }) => (
  <div className={`appsheet-list ${interactive ? 'appsheet-list--interactive' : ''}`}>
    {children}
  </div>
);

export interface AppListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
}

export const AppListItem: React.FC<AppListItemProps> = ({
  children,
  interactive = false,
  selected = false,
  className = '',
  ...props
}) => (
  <div
    className={`appsheet-list-item ${interactive ? 'appsheet-list-item--interactive' : ''} ${selected ? 'appsheet-list-item--selected' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

// ============================================================================
// SKELETON
// ============================================================================

export interface AppSkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
}

export const AppSkeleton: React.FC<AppSkeletonProps> = ({
  width,
  height,
  variant = 'rectangular',
  className = '',
}) => {
  const variantClass = {
    text: 'appsheet-skeleton--text',
    circular: 'appsheet-skeleton--circular',
    rectangular: 'appsheet-skeleton--rectangular',
  }[variant];

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`appsheet-skeleton ${variantClass} ${className}`}
      style={style}
    />
  );
};


