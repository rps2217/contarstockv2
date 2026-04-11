import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Phone, Save } from 'lucide-react';
import { Customer } from '../../../types';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  editingCustomer?: Customer;
  theme?: 'dark' | 'light';
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingCustomer,
  theme = 'dark'
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editingCustomer) {
        setFirstName(editingCustomer.firstName);
        setLastName(editingCustomer.lastName);
        setPhone(editingCustomer.phone);
      } else {
        setFirstName('');
        setLastName('');
        setPhone('');
      }
    }
  }, [isOpen, editingCustomer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) return;

    const now = Date.now();
    const customer: Customer = {
      id: editingCustomer?.id || crypto.randomUUID(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      createdAt: editingCustomer?.createdAt || now,
      updatedAt: now,
    };

    onSave(customer);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
            theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          <div className={`p-4 border-b flex items-center justify-between ${
            theme === 'dark' ? 'border-white/10' : 'border-slate-200'
          }`}>
            <h2 className={`text-lg font-black uppercase tracking-widest flex items-center gap-2 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              <User className="w-5 h-5 text-blue-500" />
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                theme === 'dark' ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Nombre
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/50 border-white/10 text-white focus:border-blue-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                }`}
                placeholder="Ej. Juan"
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Apellido
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                  theme === 'dark' 
                    ? 'bg-black/50 border-white/10 text-white focus:border-blue-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                }`}
                placeholder="Ej. Pérez"
              />
            </div>

            <div>
              <label className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Teléfono (WhatsApp)
              </label>
              <div className="relative">
                <Phone className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                }`} />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-black/50 border-white/10 text-white focus:border-blue-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                  placeholder="+56912345678"
                />
              </div>
              <p className={`text-[10px] mt-1.5 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                Incluye el código de país (ej. +56 para Chile).
              </p>
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-colors ${
                  theme === 'dark' 
                    ? 'bg-white/5 hover:bg-white/10 text-white' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
