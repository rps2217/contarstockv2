import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Truck, ShieldAlert, Info } from 'lucide-react';
import { Provider } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: Provider) => void;
  initialData?: Provider;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const ProviderFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, theme = 'dark' }) => {
  const [formData, setFormData] = useState<Provider>({
    rut: '',
    name: '',
    hasExchange: true,
    withdrawalDays: 30,
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          rut: '',
          name: '',
          hasExchange: true,
          withdrawalDays: 30,
        });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.rut) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-surface/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border ${
          (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-surface border-white/10' : 'bg-white border-slate-200'
        }`}
      >
        <div className={`flex items-center justify-between p-6 border-b ${
          (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'border-white/5' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-info/10' : 'bg-indigo-100'
            }`}>
              <Truck className={`w-5 h-5 ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-brand-info' : 'text-indigo-600'}`} />
            </div>
            <div>
              <h2 className={`text-lg font-black uppercase ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-white' : 'text-slate-800'}`}>
                {initialData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Configuración de Logística
              </p>
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full transition-colors ${
            (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'hover:bg-white/10 text-muted' : 'hover:bg-slate-100 text-muted'
          }`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                RUT del Proveedor <span className="text-brand-warning">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!!initialData}
                value={formData.rut}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, rut: e.target.value })}
                placeholder="Ej: 76.123.456-7"
                className={`w-full px-4 py-3 rounded-xl outline-none transition-all font-medium disabled:opacity-50 border-2 ${
                  (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' 
                    ? 'bg-brand-dark border-white/5 focus:border-brand-warning text-white' 
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900'
                }`}
              />
              {!initialData && (
                <p className="text-[10px] text-muted mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> El RUT es el identificador único y no se puede cambiar después.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Razón Social / Nombre <span className="text-brand-warning">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                placeholder="Ej: LABORATORIOS CHILE S.A."
                className={`w-full px-4 py-3 rounded-xl outline-none transition-all font-medium uppercase border-2 ${
                  (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' 
                    ? 'bg-brand-dark border-white/5 focus:border-brand-warning text-white' 
                    : 'bg-slate-50 border-slate-200 focus:border-indigo-500 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className={`rounded-2xl p-5 border space-y-4 ${
            (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-dark border-white/5' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className={`text-sm font-black uppercase flex items-center gap-2 ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-white' : 'text-slate-700'
            }`}>
              <ShieldAlert className={`w-4 h-4 ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-brand-info' : 'text-indigo-500'}`} />
              Política de Vencimientos
            </h3>

            <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-colors ${
              (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-surface border-white/5 hover:border-brand-info' : 'bg-white border-slate-200 hover:border-indigo-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.hasExchange}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, hasExchange: e.target.checked })}
                className="w-5 h-5 text-brand-info rounded focus:ring-brand-info"
              />
              <div>
                <p className={`text-sm font-bold ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-white' : 'text-slate-800'}`}>Acepta Canje / Devolución</p>
                <p className="text-[10px] font-medium text-slate-500">Permite retornar productos por vencer</p>
              </div>
            </label>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Días de Anticipación para Retiro
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={formData.withdrawalDays}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, withdrawalDays: parseInt(e.target.value) || 0 })}
                  className={`w-24 px-4 py-2 rounded-xl outline-none transition-all font-black text-center text-lg border-2 ${
                    (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' 
                      ? 'bg-brand-surface border-white/5 focus:border-brand-warning text-white' 
                      : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-900'
                  }`}
                />
                <span className={`text-sm font-bold ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-muted' : 'text-slate-600'}`}>Días antes de la fecha de caducidad</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Detalle Política (Opcional)
              </label>
              <textarea
                rows={2}
                value={formData.exchangePolicy || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, exchangePolicy: e.target.value })}
                placeholder="Ej: Solo se acepta canje presentando factura original."
                className={`w-full px-4 py-3 rounded-xl outline-none transition-all font-medium border-2 resize-none ${
                  (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' 
                    ? 'bg-brand-surface border-white/5 focus:border-brand-info text-white' 
                    : 'bg-white border-slate-200 focus:border-indigo-500 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors ${
                (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-dark text-muted hover:bg-brand-dark/80' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-bold rounded-xl transition-colors shadow-lg ${
                (theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'bg-brand-warning text-black hover:bg-brand-warning/90 shadow-brand-warning/10' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              <Save className="w-5 h-5" />
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
