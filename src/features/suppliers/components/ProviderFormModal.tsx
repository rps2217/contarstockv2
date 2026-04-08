import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Truck, ShieldAlert, Info } from 'lucide-react';
import { Provider } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: Provider) => void;
  initialData?: Provider;
}

export const ProviderFormModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<Provider>({
    rut: '',
    name: '',
    hasExchange: true,
    withdrawalDays: 90,
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
          withdrawalDays: 90,
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
    <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 uppercase">
                {initialData ? 'Editar Proveedor' : 'Nuevo Proveedor'}
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Configuración de Logística
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                RUT del Proveedor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!!initialData}
                value={formData.rut}
                onChange={e => setFormData({ ...formData, rut: e.target.value })}
                placeholder="Ej: 76.123.456-7"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium disabled:opacity-50"
              />
              {!initialData && (
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> El RUT es el identificador único y no se puede cambiar después.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                Razón Social / Nombre <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                placeholder="Ej: LABORATORIOS CHILE S.A."
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium uppercase"
              />
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-700 uppercase flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-500" />
              Política de Vencimientos
            </h3>

            <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors">
              <input
                type="checkbox"
                checked={formData.hasExchange}
                onChange={e => setFormData({ ...formData, hasExchange: e.target.checked })}
                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <div>
                <p className="text-sm font-bold text-slate-800">Acepta Canje / Devolución</p>
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
                  onChange={e => setFormData({ ...formData, withdrawalDays: parseInt(e.target.value) || 0 })}
                  className="w-24 px-4 py-2 bg-white border-2 border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all font-black text-center text-lg"
                />
                <span className="text-sm font-bold text-slate-600">Días antes de la fecha de caducidad</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
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
