/**
 * useFormValidation - Hook para validación de formularios con feedback en tiempo real
 */

import { useState, useCallback, useMemo } from 'react';
import { ValidationRule, ValidationStatus } from '@/shared/components/ui/ValidatedInput';

export interface FieldConfig<T = any> {
  value: T;
  rules?: ValidationRule[];
  touched?: boolean;
}

export interface FormFieldState {
  value: any;
  status: ValidationStatus;
  message?: string;
  touched: boolean;
}

export interface UseFormValidationOptions {
  // Valores iniciales
  initialValues: Record<string, any>;
  // Reglas de validación por campo
  validationRules?: Record<string, ValidationRule[]>;
  // Validación asíncrona por campo
  asyncValidators?: Record<string, (value: any) => Promise<{ valid: boolean; message?: string }>>;
  // Callback cuando el formulario cambia
  onChange?: (values: Record<string, any>) => void;
  // Callback cuando el estado de validación cambia
  onValidationChange?: (isValid: boolean) => void;
  // Debounce para validación en ms
  debounceMs?: number;
}

export const useFormValidation = (options: UseFormValidationOptions) => {
  const {
    initialValues,
    validationRules = {},
    asyncValidators = {},
    onChange,
    onValidationChange,
    debounceMs = 300,
  } = options;

  // Estado de los campos
  const [fields, setFields] = useState<Record<string, FormFieldState>>(() => {
    const initial: Record<string, FormFieldState> = {};
    Object.entries(initialValues).forEach(([key, value]) => {
      initial[key] = {
        value,
        status: 'idle',
        touched: false,
      };
    });
    return initial;
  });

  // Estado general del formulario
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validar un campo individual
  const validateField = useCallback(async (fieldName: string, value: any): Promise<FormFieldState> => {
    const rules = validationRules[fieldName] || [];
    const asyncValidator = asyncValidators[fieldName];
    const allValues = Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, v.value])
    );

    let status: ValidationStatus = 'valid';
    let message: string | undefined;

    // Validación síncrona
    for (const rule of rules) {
      const isValid = rule.validate(value, { ...allValues, [fieldName]: value });
      if (!isValid) {
        status = rule.level === 'warning' ? 'warning' : 'invalid';
        message = rule.message;
        break;
      }
    }

    // Validación asíncrona
    if (status !== 'invalid' && asyncValidator) {
      try {
        const result = await asyncValidator(value);
        if (!result.valid) {
          status = 'invalid';
          message = result.message;
        }
      } catch {
        status = 'invalid';
        message = 'Error de validación';
      }
    }

    // Si no se han tocado y no hay errores, está idle
    if (status === 'valid' && !fields[fieldName]?.touched) {
      status = 'idle';
    }

    return {
      value,
      status,
      message,
      touched: fields[fieldName]?.touched || false,
    };
  }, [validationRules, asyncValidators, fields]);

  // Actualizar valor de un campo
  const setFieldValue = useCallback((fieldName: string, value: any) => {
    setFields(prev => {
      const newFields = {
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          value,
        },
      };

      // Notificar cambios
      const values = Object.fromEntries(
        Object.entries(newFields).map(([k, v]) => [k, v.value])
      );
      onChange?.(values);

      return newFields;
    });

    // Validar con debounce
    setTimeout(() => {
      validateField(fieldName, value);
    }, debounceMs);
  }, [validateField, debounceMs, onChange]);

  // Marcar campo como "touched" (blur)
  const touchField = useCallback((fieldName: string) => {
    setFields(prev => {
      const newFields = {
        ...prev,
        [fieldName]: {
          ...prev[fieldName],
          touched: true,
        },
      };

      // Validar al tocar
      validateField(fieldName, prev[fieldName].value);

      return newFields;
    });
  }, [validateField]);

  // Validar todo el formulario
  const validateAll = useCallback(async (): Promise<boolean> => {
    setIsSubmitting(true);
    
    let isValid = true;
    const newFields: Record<string, FormFieldState> = {};

    for (const [fieldName, fieldState] of Object.entries(fields)) {
      const validated = await validateField(fieldName, fieldState.value);
      newFields[fieldName] = { ...validated, touched: true };
      if (validated.status === 'invalid') {
        isValid = false;
      }
    }

    setFields(newFields);
    setIsSubmitting(false);
    onValidationChange?.(isValid);

    return isValid;
  }, [fields, validateField, onValidationChange]);

  // Resetear formulario
  const reset = useCallback(() => {
    const resetFields: Record<string, FormFieldState> = {};
    Object.entries(initialValues).forEach(([key, value]) => {
      resetFields[key] = {
        value,
        status: 'idle',
        touched: false,
      };
    });
    setFields(resetFields);
    onValidationChange?.(true);
  }, [initialValues, onValidationChange]);

  // Obtener valores actuales
  const values = useMemo(() => {
    return Object.fromEntries(
      Object.entries(fields).map(([k, v]) => [k, v.value])
    );
  }, [fields]);

  // Verificar si hay errores
  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    Object.entries(fields).forEach(([key, field]) => {
      if (field.status === 'invalid' && field.touched) {
        errs[key] = field.message || 'Valor inválido';
      }
    });
    return errs;
  }, [fields]);

  // Verificar si hay advertencias
  const warnings = useMemo(() => {
    const warns: Record<string, string> = {};
    Object.entries(fields).forEach(([key, field]) => {
      if (field.status === 'warning' && field.touched) {
        warns[key] = field.message || 'Advertencia';
      }
    });
    return warns;
  }, [fields]);

  // ¿El formulario es válido?
  const isValid = useMemo(() => {
    return Object.values(fields).every(
      field => field.status !== 'invalid'
    );
  }, [fields]);

  // ¿El formulario fue modificado?
  const isDirty = useMemo(() => {
    return Object.entries(fields).some(([key, field]) => {
      return field.value !== initialValues[key] || field.touched;
    });
  }, [fields, initialValues]);

  return {
    // Valores
    values,
    fields,
    
    // Estado
    isValid,
    isDirty,
    isSubmitting,
    hasErrors: Object.keys(errors).length > 0,
    hasWarnings: Object.keys(warnings).length > 0,
    
    // Errores y warnings
    errors,
    warnings,
    
    // Métodos
    setFieldValue,
    touchField,
    validateAll,
    reset,
    
    // Estado de campo individual
    getFieldState: (name: string) => fields[name] || { value: undefined, status: 'idle' as ValidationStatus, touched: false },
  };
};

export default useFormValidation;
