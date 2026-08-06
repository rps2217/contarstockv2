import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, MessageCircle } from 'lucide-react';
import { Customer, MessageTemplate } from '../../../types';
import { MessageTemplateRepository } from '../../../repositories/MessageTemplateRepository';

interface SendMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const SendMessageModal: React.FC<SendMessageModalProps> = ({
  isOpen,
  onClose,
  customer,
  theme = 'dark',
}) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');

  useEffect(() => {
    if (isOpen && customer) {
      loadTemplates();
    }
  }, [isOpen, customer]);

  const loadTemplates = async () => {
    await MessageTemplateRepository.initializeDefault();
    const data = await MessageTemplateRepository.getAll();
    setTemplates(data);

    if (data.length > 0) {
      // Select the first template by default
      const defaultTemplate = data[0];
      setSelectedTemplateId(defaultTemplate.id);
      applyTemplate(defaultTemplate, customer!);
    }
  };

  const applyTemplate = (template: MessageTemplate, cust: Customer) => {
    let msg = template.content;
    msg = msg.replace(/\{\{nombre\}\}/g, cust.firstName || '');
    msg = msg.replace(/\{\{apellido\}\}/g, cust.lastName || '');
    setCustomMessage(msg);
  };

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTemplateId(id);
    const template = templates.find(t => t.id === id);
    if (template && customer) {
      applyTemplate(template, customer);
    }
  };

  const handleSend = () => {
    if (!customer || !customMessage.trim()) return;

    let phone = (customer.phone || '').replace(/[\s-()]/g, '');
    if (!phone.startsWith('+')) {
      if (phone.length === 9) phone = `+56${phone}`;
      else if (phone.length === 11 && phone.startsWith('56')) phone = `+${phone}`;
    }
    const cleanPhone = phone.replace('+', '');

    const encodedMessage = encodeURIComponent(customMessage.trim());
    const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

    window.open(url, '_blank');
    onClose();
  };

  if (!isOpen || !customer) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border ${
            (theme as unknown) === 'dark' ||
            (theme as unknown) === 'night' ||
            (theme as unknown) === 'high-contrast' ||
            (theme as unknown) === 'appsheet-dark' ||
            (theme as unknown) === 'gray'
              ? 'bg-surface border-white/10'
              : 'bg-white border-slate-200'
          }`}
        >
          <div
            className={`p-4 border-b flex items-center justify-between ${
              (theme as unknown) === 'dark' ||
              (theme as unknown) === 'night' ||
              (theme as unknown) === 'high-contrast' ||
              (theme as unknown) === 'appsheet-dark' ||
              (theme as unknown) === 'gray'
                ? 'border-white/10'
                : 'border-slate-200'
            }`}
          >
            <h2
              className={`text-lg font-black uppercase tracking-widest flex items-center gap-2 ${
                (theme as unknown) === 'dark' ||
                (theme as unknown) === 'night' ||
                (theme as unknown) === 'high-contrast' ||
                (theme as unknown) === 'appsheet-dark' ||
                (theme as unknown) === 'gray'
                  ? 'text-white'
                  : 'text-slate-900'
              }`}
            >
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              Enviar Mensaje
            </h2>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                (theme as unknown) === 'dark' ||
                (theme as unknown) === 'night' ||
                (theme as unknown) === 'high-contrast' ||
                (theme as unknown) === 'appsheet-dark' ||
                (theme as unknown) === 'gray'
                  ? 'hover:bg-white/10 text-muted'
                  : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div
              className={`p-3 rounded-xl border flex items-center gap-3 ${
                (theme as unknown) === 'dark' ||
                (theme as unknown) === 'night' ||
                (theme as unknown) === 'high-contrast' ||
                (theme as unknown) === 'appsheet-dark' ||
                (theme as unknown) === 'gray'
                  ? 'bg-white/5 border-white/10'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                  (theme as unknown) === 'dark' ||
                  (theme as unknown) === 'night' ||
                  (theme as unknown) === 'high-contrast' ||
                  (theme as unknown) === 'appsheet-dark' ||
                  (theme as unknown) === 'gray'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {(customer.firstName || '').charAt(0)}
                {(customer.lastName || '').charAt(0)}
              </div>
              <div>
                <p
                  className={`text-sm font-bold ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-white' : 'text-slate-900'}`}
                >
                  {customer.firstName} {customer.lastName}
                </p>
                <p
                  className={`text-xs font-mono ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-muted' : 'text-slate-500'}`}
                >
                  {customer.phone}
                </p>
              </div>
            </div>

            <div>
              <label
                className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${
                  (theme as unknown) === 'dark' ||
                  (theme as unknown) === 'night' ||
                  (theme as unknown) === 'high-contrast' ||
                  (theme as unknown) === 'appsheet-dark' ||
                  (theme as unknown) === 'gray'
                    ? 'text-muted'
                    : 'text-slate-500'
                }`}
              >
                Seleccionar Plantilla
              </label>
              <select
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm appearance-none ${
                  (theme as unknown) === 'dark' ||
                  (theme as unknown) === 'night' ||
                  (theme as unknown) === 'high-contrast' ||
                  (theme as unknown) === 'appsheet-dark' ||
                  (theme as unknown) === 'gray'
                    ? 'bg-black/50 border-white/10 text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                }`}
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className={`block text-xs font-bold uppercase tracking-widest mb-1.5 ${
                  (theme as unknown) === 'dark' ||
                  (theme as unknown) === 'night' ||
                  (theme as unknown) === 'high-contrast' ||
                  (theme as unknown) === 'appsheet-dark' ||
                  (theme as unknown) === 'gray'
                    ? 'text-muted'
                    : 'text-slate-500'
                }`}
              >
                Mensaje a Enviar (Puedes editarlo)
              </label>
              <textarea
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                rows={5}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm resize-none ${
                  (theme as unknown) === 'dark' ||
                  (theme as unknown) === 'night' ||
                  (theme as unknown) === 'high-contrast' ||
                  (theme as unknown) === 'appsheet-dark' ||
                  (theme as unknown) === 'gray'
                    ? 'bg-black/50 border-white/10 text-white focus:border-emerald-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                }`}
              />
            </div>

            <div className="pt-4 flex gap-3">
              <button
                onClick={onClose}
                className={`flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-widest transition-colors ${
                  (theme as unknown) === 'dark' ||
                  (theme as unknown) === 'night' ||
                  (theme as unknown) === 'high-contrast' ||
                  (theme as unknown) === 'appsheet-dark' ||
                  (theme as unknown) === 'gray'
                    ? 'bg-white/5 hover:bg-white/10 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={!customMessage.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
              >
                <Send className="w-4 h-4" />
                Enviar
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
