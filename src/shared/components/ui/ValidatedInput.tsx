/**
 * ValidatedInput - Componente de input con validaciones en tiempo real
 * 
 * Proporciona feedback visual inmediato mientras el usuario escribe
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react';

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'warning' | 'invalid';

export interface ValidationRule<T = any> {
  validate: (value: T, allValues?: Record<string, any>) => boolean;
  message: string;
  level?: 'error' | 'warning';
}

export interface ValidatedInputProps {
  // Valor actual
  value: string | number;
  // Placeholder
  placeholder?: string;
  // Tipo de input
  type?: 'text' | 'number' | 'email' | 'password' | 'tel';
  // Reglas de validación
  rules?: ValidationRule[];
  // Estado deshabilitado
  disabled?: boolean;
  // Clase adicional
  className?: string;
  // Callback cuando cambia el valor
  onChange?: (value: string) => void;
  // Callback cuando cambia el estado de validación
  onValidationChange?: (status: ValidationStatus, message?: string) => void;
  // Validación asíncrona (ej: verificar si existe en BD)
  asyncValidator?: (value: string) => Promise<{ valid: boolean; message?: string }>;
  // Todos los valores del formulario (para validación cruzada)
  allValues?: Record<string, any>;
  // Mostrar indicador de estado
  showStatus?: boolean;
  // Auto-validar al blur (además de onChange)
  validateOnBlur?: boolean;
  // Longitud máxima
  maxLength?: number;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
  value,
  placeholder,
  type = 'text',
  rules = [],
  disabled = false,
  className = '',
  onChange,
  onValidationChange,
  asyncValidator,
  allValues = {},
  showStatus = true,
  validateOnBlur = true,
  maxLength,
}) => {
  const [status, setStatus] = useState<ValidationStatus>('idle');
  const [message, setMessage] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  // Validar el valor
  const validate = useCallback(async (val: string | number) => {
    const strVal = String(val);
    
    // Si no hay reglas y no es async, está válido
    if (rules.length === 0 && !asyncValidator) {
      return { status: 'idle' as ValidationStatus, message: undefined };
    }

    // Validación síncrona
    for (const rule of rules) {
      const isValid = rule.validate(strVal, allValues);
      if (!isValid) {
        return {
          status: rule.level === 'warning' ? 'warning' as ValidationStatus : 'invalid' as ValidationStatus,
          message: rule.message
        };
      }
    }

    // Validación asíncrona
    if (asyncValidator) {
      setStatus('validating');
      try {
        const result = await asyncValidator(strVal);
        if (!result.valid) {
          return { status: 'invalid' as ValidationStatus, message: result.message };
        }
      } catch {
        return { status: 'invalid' as ValidationStatus, message: 'Error de validación' };
      }
    }

    return { status: 'valid' as ValidationStatus, message: undefined };
  }, [rules, asyncValidator, allValues]);

  // Efecto para validar cuando cambia el valor
  useEffect(() => {
    if (!touched && status === 'idle') return;
    
    const timer = setTimeout(async () => {
      const result = await validate(value);
      setStatus(result.status);
      setMessage(result.message);
      onValidationChange?.(result.status, result.message);
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timer);
  }, [value, touched, validate, onValidationChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleBlur = () => {
    if (validateOnBlur) {
      setTouched(true);
      validate(value).then(result => {
        setStatus(result.status);
        setMessage(result.message);
      });
    }
  };

  const handleFocus = () => {
    // No limpiar el estado hasta que el usuario termine
  };

  // Colores según el estado
  const getStatusStyles = () => {
    switch (status) {
      case 'valid':
        return {
          border: 'border-emerald-500 focus:border-emerald-500',
          icon: <Check className="w-4 h-4 text-emerald-500" />,
          textColor: 'text-emerald-400'
        };
      case 'invalid':
        return {
          border: 'border-rose-500 focus:border-rose-500',
          icon: <AlertCircle className="w-4 h-4 text-rose-500" />,
          textColor: 'text-rose-400'
        };
      case 'warning':
        return {
          border: 'border-amber-500 focus:border-amber-500',
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          textColor: 'text-amber-400'
        };
      case 'validating':
        return {
          border: 'border-blue-500 focus:border-blue-500',
          icon: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
          textColor: 'text-blue-400'
        };
      default:
        return {
          border: 'border-slate-700 focus:border-blue-500',
          icon: null,
          textColor: ''
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={`
            w-full px-4 py-3 rounded-xl
            bg-slate-800 text-white
            border-2 ${styles.border}
            placeholder-slate-500
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            focus:outline-none focus:ring-2 focus:ring-blue-500/20
            ${showStatus && status !== 'idle' ? 'pr-10' : ''}
            ${className}
          `}
        />
        
        {/* Indicador de estado */}
        {showStatus && status !== 'idle' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {styles.icon}
          </div>
        )}
      </div>

      {/* Mensaje de error/advertencia */}
      <AnimatePresence>
        {message && touched && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`text-xs ${styles.textColor} pl-1`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Reglas predefinidas
export const ValidationRules = {
  required: (message = 'Este campo es requerido'): ValidationRule => ({
    validate: (value) => String(value).trim().length > 0,
    message,
    level: 'error'
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    validate: (value) => String(value).length >= min,
    message: message || `Mínimo ${min} caracteres`,
    level: 'error'
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    validate: (value) => String(value).length <= max,
    message: message || `Máximo ${max} caracteres`,
    level: 'error'
  }),

  numeric: (message = 'Debe ser un número'): ValidationRule => ({
    validate: (value) => !isNaN(Number(value)) && String(value).trim().length > 0,
    message,
    level: 'error'
  }),

  positive: (message = 'Debe ser un número positivo'): ValidationRule => ({
    validate: (value) => Number(value) > 0,
    message,
    level: 'error'
  }),

  range: (min: number, max: number, message?: string): ValidationRule => ({
    validate: (value) => {
      const num = Number(value);
      return num >= min && num <= max;
    },
    message: message || `Debe estar entre ${min} y ${max}`,
    level: 'error'
  }),

  email: (message = 'Email inválido'): ValidationRule => ({
    validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value)),
    message,
    level: 'error'
  }),

  pattern: (regex: RegExp, message: string): ValidationRule => ({
    validate: (value) => regex.test(String(value)),
    message,
    level: 'error'
  }),

  // Warn if different from another field
  matches: (field: string, message?: string): ValidationRule => ({
    validate: (value, allValues) => value === allValues[field],
    message: message || `No coincide con ${field}`,
    level: 'error'
  }),

  warningIf: (condition: (value: string, allValues: Record<string, any>) => boolean, message: string): ValidationRule => ({
    validate: (value, allValues) => !condition(value, allValues),
    message,
    level: 'warning'
  }),
};

export default ValidatedInput;
