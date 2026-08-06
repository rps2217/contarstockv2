import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, FileText, Trash2, Plus } from 'lucide-react';
import { MessageTemplate } from '../../../types';
import { MessageTemplateRepository } from '../../../repositories/MessageTemplateRepository';
import { toast } from 'sonner';

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light' | 'gray' | 'high-contrast' | 'appsheet-dark' | 'night';
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
}) => {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const loadTemplates = async () => {
    const data = await MessageTemplateRepository.getAll();
    setTemplates(data.sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setEditingTemplate(null);
      setName('');
      setContent('');
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    const now = Date.now();
    const template: MessageTemplate = {
      id: editingTemplate?.id || crypto.randomUUID(),
      name: name.trim(),
      content: content.trim(),
      createdAt: editingTemplate?.createdAt || now,
      updatedAt: now,
    };

    try {
      await MessageTemplateRepository.save(template);
      toast.success(editingTemplate ? 'Plantilla actualizada' : 'Plantilla guardada');
      setEditingTemplate(null);
      setName('');
      setContent('');
      loadTemplates();
    } catch (error) {
      toast.error('Error al guardar la plantilla');
    }
  };

  const handleEdit = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    setContent(template.content);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
      try {
        await MessageTemplateRepository.delete(id);
        toast.success('Plantilla eliminada');
        if (editingTemplate?.id === id) {
          setEditingTemplate(null);
          setName('');
          setContent('');
        }
        loadTemplates();
      } catch (error) {
        toast.error('Error al eliminar la plantilla');
      }
    }
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setName('');
    setContent('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border flex flex-col max-h-[85vh] ${
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
            className={`p-4 border-b flex items-center justify-between shrink-0 ${
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
              <FileText className="w-5 h-5 text-blue-500" />
              Gestión de Plantillas
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

          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* LISTA DE PLANTILLAS */}
            <div
              className={`w-full md:w-1/2 border-b md:border-b-0 md:border-r overflow-y-auto p-4 space-y-3 ${
                (theme as unknown) === 'dark' ||
                (theme as unknown) === 'night' ||
                (theme as unknown) === 'high-contrast' ||
                (theme as unknown) === 'appsheet-dark' ||
                (theme as unknown) === 'gray'
                  ? 'border-white/10 bg-base/30'
                  : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <h3
                className={`text-xs font-bold uppercase tracking-widest mb-4 ${
                  (theme as unknown) === 'dark' ||
                  (theme as unknown) === 'night' ||
                  (theme as unknown) === 'high-contrast' ||
                  (theme as unknown) === 'appsheet-dark' ||
                  (theme as unknown) === 'gray'
                    ? 'text-muted'
                    : 'text-slate-500'
                }`}
              >
                Tus Plantillas ({templates.length})
              </h3>

              {templates.map(template => (
                <div
                  key={template.id}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    editingTemplate?.id === template.id
                      ? (theme as unknown) === 'dark' ||
                        (theme as unknown) === 'night' ||
                        (theme as unknown) === 'high-contrast' ||
                        (theme as unknown) === 'appsheet-dark' ||
                        (theme as unknown) === 'gray'
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'bg-blue-50 border-blue-200'
                      : (theme as unknown) === 'dark' ||
                          (theme as unknown) === 'night' ||
                          (theme as unknown) === 'high-contrast' ||
                          (theme as unknown) === 'appsheet-dark' ||
                          (theme as unknown) === 'gray'
                        ? 'bg-white/5 border-white/10 hover:border-white/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleEdit(template)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className={`font-bold text-sm truncate ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-white' : 'text-slate-900'}`}
                    >
                      {template.name}
                    </h4>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(template.id);
                      }}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        (theme as unknown) === 'dark' ||
                        (theme as unknown) === 'night' ||
                        (theme as unknown) === 'high-contrast' ||
                        (theme as unknown) === 'appsheet-dark' ||
                        (theme as unknown) === 'gray'
                          ? 'hover:bg-rose-500/20 text-rose-400'
                          : 'hover:bg-rose-100 text-rose-500'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p
                    className={`text-xs mt-1 line-clamp-2 ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-muted' : 'text-slate-500'}`}
                  >
                    {template.content}
                  </p>
                </div>
              ))}

              {templates.length === 0 && (
                <div
                  className={`text-center py-8 text-sm ${(theme as unknown) === 'dark' || (theme as unknown) === 'night' || (theme as unknown) === 'high-contrast' || (theme as unknown) === 'appsheet-dark' || (theme as unknown) === 'gray' ? 'text-slate-500' : 'text-muted'}`}
                >
                  No hay plantillas guardadas.
                </div>
              )}
            </div>

            {/* FORMULARIO DE EDICIÓN/CREACIÓN */}
            <div className="w-full md:w-1/2 p-4 overflow-y-auto">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3
                    className={`text-xs font-bold uppercase tracking-widest ${
                      (theme as unknown) === 'dark' ||
                      (theme as unknown) === 'night' ||
                      (theme as unknown) === 'high-contrast' ||
                      (theme as unknown) === 'appsheet-dark' ||
                      (theme as unknown) === 'gray'
                        ? 'text-muted'
                        : 'text-slate-500'
                    }`}
                  >
                    {editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                  </h3>
                  {editingTemplate && (
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-[10px] font-bold text-blue-500 uppercase tracking-widest hover:underline"
                    >
                      Cancelar Edición
                    </button>
                  )}
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
                    Nombre de la Plantilla
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl border outline-none transition-all text-sm ${
                      (theme as unknown) === 'dark' ||
                      (theme as unknown) === 'night' ||
                      (theme as unknown) === 'high-contrast' ||
                      (theme as unknown) === 'appsheet-dark' ||
                      (theme as unknown) === 'gray'
                        ? 'bg-black/50 border-white/10 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                    placeholder="Ej. Aviso Retiro Estandar"
                  />
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
                    Mensaje
                  </label>
                  <textarea
                    required
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={5}
                    className={`w-full px-4 py-3 rounded-xl border outline-none transition-all text-sm resize-none ${
                      (theme as unknown) === 'dark' ||
                      (theme as unknown) === 'night' ||
                      (theme as unknown) === 'high-contrast' ||
                      (theme as unknown) === 'appsheet-dark' ||
                      (theme as unknown) === 'gray'
                        ? 'bg-black/50 border-white/10 text-white focus:border-blue-500'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                    }`}
                    placeholder="Hola {{nombre}} {{apellido}}, tu pedido está listo..."
                  />
                  <div
                    className={`mt-2 p-3 rounded-xl border text-xs ${
                      (theme as unknown) === 'dark' ||
                      (theme as unknown) === 'night' ||
                      (theme as unknown) === 'high-contrast' ||
                      (theme as unknown) === 'appsheet-dark' ||
                      (theme as unknown) === 'gray'
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-200'
                        : 'bg-blue-50 border-blue-100 text-blue-800'
                    }`}
                  >
                    <span className="font-bold block mb-1">Variables disponibles:</span>
                    <code className="bg-black/20 px-1.5 py-0.5 rounded mr-2">{'{{nombre}}'}</code>
                    <code className="bg-black/20 px-1.5 py-0.5 rounded">{'{{apellido}}'}</code>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors mt-4"
                >
                  {editingTemplate ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingTemplate ? 'Guardar Cambios' : 'Crear Plantilla'}
                </button>
              </form>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
