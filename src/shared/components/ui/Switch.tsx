/**
 * Switch - Toggle switch component
 */

import React, { memo } from 'react';

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

const sizeClasses = {
  sm: {
    track: 'w-8 h-4',
    thumb: 'w-3 h-3',
    translate: 'translate-x-4',
    translateOff: 'translate-x-0.5',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'w-5 h-5',
    translate: 'translate-x-5',
    translateOff: 'translate-x-0.5',
  },
  lg: {
    track: 'w-14 h-7',
    thumb: 'w-6 h-6',
    translate: 'translate-x-7',
    translateOff: 'translate-x-0.5',
  },
};

export const Switch = memo(({
  checked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  className = '',
  id,
}: SwitchProps) => {
  const trackId = id || `switch-${Math.random().toString(36).substr(2, 9)}`;
  const sizes = sizeClasses[size];

  const handleChange = () => {
    if (disabled) return;
    onChange?.(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleChange();
    }
  };

  return (
    <div className={`flex items-start gap-3 ${disabled ? 'opacity-50' : ''} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${trackId}-label`}
        aria-describedby={description ? `${trackId}-description` : undefined}
        disabled={disabled}
        onClick={handleChange}
        onKeyDown={handleKeyDown}
        className={`
          relative inline-flex shrink-0 rounded-full
          transition-colors duration-200 ease-in-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-info focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark
          ${sizes.track}
          ${checked
            ? 'bg-brand-info'
            : 'bg-slate-600 hover:bg-slate-500'
          }
        `}
      >
        <span
          className={`
            pointer-events-none inline-block rounded-full
            shadow-lg transform transition-transform duration-200 ease-in-out
            bg-white
            ${sizes.thumb}
            ${sizes.translateOff}
            ${checked ? sizes.translate : ''}
          `}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              id={`${trackId}-label`}
              className={`
                text-sm font-bold cursor-pointer
                ${disabled ? 'text-slate-500 cursor-not-allowed' : 'text-white'}
              `}
              onClick={!disabled ? handleChange : undefined}
            >
              {label}
            </label>
          )}
          {description && (
            <span
              id={`${trackId}-description`}
              className="text-xs text-slate-500 mt-0.5"
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';

// Checkbox - Versión con estilo switch
interface CheckboxSwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const CheckboxSwitch = memo(({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = '',
}: CheckboxSwitchProps) => {
  return (
    <label className={`
      flex items-center gap-3 cursor-pointer
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${className}
    `}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`
          w-11 h-6 rounded-full
          transition-colors duration-200
          ${checked ? 'bg-brand-info' : 'bg-slate-600'}
        `}>
          <span className={`
            absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white
            shadow-lg transform transition-transform duration-200 ease-in-out
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `} />
        </div>
      </div>
      {label && (
        <span className="text-sm font-bold text-white">{label}</span>
      )}
    </label>
  );
});

CheckboxSwitch.displayName = 'CheckboxSwitch';