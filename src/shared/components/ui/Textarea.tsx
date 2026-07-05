/**
 * Textarea - Campo de texto multilínea
 */

import React, { memo, forwardRef, useState, useEffect } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  maxLength?: number;
  showCount?: boolean;
  autoResize?: boolean;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  containerClassName?: string;
}

export const Textarea = memo(forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helper,
  maxLength,
  showCount = false,
  autoResize = false,
  rows = 3,
  minRows = 3,
  maxRows = 10,
  containerClassName = '',
  className = '',
  value,
  onChange,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState('');
  const [currentRows, setCurrentRows] = useState(rows);
  const textValue = (value ?? internalValue) as string;
  const charCount = textValue.length;

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value as string);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    
    if (maxLength && newValue.length > maxLength) return;
    
    if (value === undefined) {
      setInternalValue(newValue);
    }
    
    onChange?.(e);

    // Auto-resize
    if (autoResize) {
      const textarea = e.target;
      const lineHeight = 24; // approximate line height
      const newRows = Math.min(
        maxRows,
        Math.max(minRows, Math.ceil(textarea.scrollHeight / lineHeight))
      );
      setCurrentRows(newRows);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${containerClassName}`}>
      {label && (
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
          {label}
        </label>
      )}

      <div className="relative">
        <textarea
          ref={ref}
          value={textValue}
          onChange={handleChange}
          rows={autoResize ? currentRows : rows}
          maxLength={maxLength}
          className={`
            w-full bg-brand-surface/40 border border-white/5 rounded-2xl
            px-5 py-4 text-sm font-bold
            placeholder:text-slate-600
            focus:outline-none focus:border-brand-info focus:bg-brand-surface/60
            transition-all resize-none
            disabled:opacity-50
            ${error ? 'border-rose-500 bg-rose-500/5' : ''}
            ${autoResize ? 'resize-none overflow-hidden' : 'resize-y'}
            ${className}
          `}
          {...props}
        />
      </div>

      <div className="flex items-center justify-between">
        <div>
          {error && (
            <span className="text-[10px] font-bold text-rose-500 ml-1 animate-pulse">
              {error}
            </span>
          )}
          {helper && !error && (
            <span className="text-[10px] text-slate-500 ml-1">
              {helper}
            </span>
          )}
        </div>

        {showCount && maxLength && (
          <span className={`
            text-[10px] font-bold
            ${charCount >= maxLength ? 'text-rose-500' : 'text-slate-500'}
          `}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}));

Textarea.displayName = 'Textarea';

// AutoResizeTextarea - Wrapper convenience
interface AutoResizeTextareaProps extends Omit<TextareaProps, 'autoResize'> {
  minRows?: number;
  maxRows?: number;
}

export const AutoResizeTextarea = memo((props: AutoResizeTextareaProps) => {
  return <Textarea {...props} autoResize />;
});

AutoResizeTextarea.displayName = 'AutoResizeTextarea';