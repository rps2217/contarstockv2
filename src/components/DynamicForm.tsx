import React, { useState, useEffect } from 'react';
import { TableSchema, ColumnSchema } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Check, ChevronDown, Barcode, Hash, Image as ImageIcon } from 'lucide-react';
import { DynamicImageInput } from './DynamicImageInput';

interface DynamicFormProps {
  schema: TableSchema;
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  theme?: 'dark' | 'light';
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  schema,
  initialValues = {},
  onSubmit,
  onCancel,
  isLoading = false,
  theme = 'dark'
}) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Initialize with default values from schema or initialValues
    const initial: Record<string, any> = { ...initialValues };
    Object.entries(schema.columns).forEach(([key, col]) => {
      if (initial[key] === undefined && col.defaultValue !== undefined) {
        initial[key] = col.defaultValue;
      }
    });
    setValues(initial);
  }, [schema, initialValues]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    Object.entries(schema.columns).forEach(([key, col]) => {
      if (col.required && !values[key]) {
        newErrors[key] = `${col.label} es obligatorio`;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(values);
    }
  };

  const handleChange = (key: string, value: any) => {
    setValues(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const renderInput = (key: string, col: ColumnSchema) => {
    const commonClasses = `w-full px-4 py-3 rounded-xl border transition-all outline-none ${
      theme === 'dark' 
        ? 'bg-white/5 border-white/10 focus:border-amber-500/50 text-white' 
        : 'bg-slate-50 border-slate-200 focus:border-amber-500 text-slate-900 shadow-sm'
    } ${errors[key] ? 'border-rose-500' : ''} ${col.editable === false ? 'opacity-50 cursor-not-allowed' : ''}`;

    switch (col.type) {
      case 'barcode':
        return (
          <div className="relative group">
            <input
              type="text"
              value={values[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={col.placeholder || `Escanear o ingresar ${col.label.toLowerCase()}`}
              className={`${commonClasses} pr-12 font-mono`}
              readOnly={col.editable === false}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors">
              <Barcode className="w-5 h-5" />
            </div>
          </div>
        );
      case 'number':
        return (
          <div className="relative group">
            <input
              type="number"
              value={values[key] || ''}
              onChange={(e) => handleChange(key, Number(e.target.value))}
              className={`${commonClasses} pr-12`}
              readOnly={col.editable === false}
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors">
              <Hash className="w-5 h-5" />
            </div>
          </div>
        );
      case 'string':
        return (
          <div className="relative group">
            <input
              type="text"
              value={values[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder={col.placeholder || `Ingresar ${col.label.toLowerCase()}`}
              className={`${commonClasses} pr-12`}
              readOnly={col.editable === false}
            />
          </div>
        );
      case 'enum':
        if (col.renderType === 'grid' || col.renderType === 'segmented') {
          return (
            <div className={`grid ${col.renderType === 'grid' ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
              {col.options?.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleChange(key, opt)}
                  className={`h-12 rounded-xl text-sm font-black transition-all border ${
                    values[key] === opt
                      ? 'bg-amber-500 border-amber-500 text-black'
                      : theme === 'dark' ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          );
        }
        return (
          <div className="relative group">
            <select
              value={values[key] || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              className={`${commonClasses} appearance-none pr-12`}
            >
              <option value="">Seleccionar {col.label.toLowerCase()}...</option>
              {col.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors pointer-events-none">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
        );
      case 'boolean':
        return (
          <button
            type="button"
            onClick={() => handleChange(key, !values[key])}
            className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
              values[key] 
                ? 'border-amber-500 bg-amber-500/10' 
                : theme === 'dark' ? 'border-white/5 bg-white/5' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className={`text-xs font-black uppercase tracking-widest ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{col.label}</span>
            <div className={`w-10 h-5 rounded-full relative transition-all ${values[key] ? 'bg-amber-500' : 'bg-slate-700'}`}>
              <motion.div 
                animate={{ x: values[key] ? 20 : 2 }}
                className="absolute top-1 left-0 w-3 h-3 bg-white rounded-full shadow-sm"
              />
            </div>
          </button>
        );
      case 'image':
        return (
          <DynamicImageInput
            value={values[key]}
            onChange={(url) => handleChange(key, url)}
            label={col.label}
            theme={theme}
            tableName={schema.tableName}
          />
        );
      default:
        return (
          <input
            type="text"
            value={values[key] || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={col.placeholder}
            className={commonClasses}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(schema.columns).filter(([_, col]) => col.visible !== false).map(([key, col]) => (
          <div key={key} className="space-y-2">
            <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              {col.label}
              {col.required && <span className="text-rose-500">*</span>}
            </label>
            {renderInput(key, col)}
            <AnimatePresence>
              {errors[key] && (
                <motion.p 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="text-[10px] text-rose-500 font-bold uppercase tracking-widest flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  {errors[key]}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 pt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              theme === 'dark' ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-[2] py-4 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest transition-all hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
        >
          {isLoading ? 'Guardando...' : (
            <>
              <Check className="w-4 h-4" />
              Guardar Registro
            </>
          )}
        </button>
      </div>
    </form>
  );
};

