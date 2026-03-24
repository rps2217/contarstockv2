import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Copy, ExternalLink, Save, Trash2, Edit2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  to: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'default-1',
    name: 'Solicitud Markdown 30%',
    to: 'pm@empresa.com',
    subject: 'Solicitud de Precio Especial (Markdown 30%) - [CANTIDAD_ITEMS] productos',
    body: 'Hola,\n\nTe escribo para solicitar autorización de un precio especial (Markdown 30%) para los siguientes productos que están próximos a su fecha de caducidad, con el objetivo de acelerar su venta y evitar mermas.\n\n[TABLA_PRODUCTOS]\n\nQuedo atento a tu confirmación para proceder con el cambio de flejes/etiquetas.\n\nSaludos.'
  },
  {
    id: 'default-2',
    name: 'Aviso de Merma / Destrucción',
    to: 'control@empresa.com',
    subject: 'Aviso de Merma - [CANTIDAD_ITEMS] productos vencidos',
    body: 'Estimados,\n\nAdjunto el detalle de los productos que han cumplido su fecha de caducidad y serán procesados como merma/destrucción según el protocolo vigente.\n\n[TABLA_PRODUCTOS]\n\nPor favor confirmar recepción de esta información para proceder con el descarte físico.\n\nSaludos.'
  },
  {
    id: 'default-3',
    name: 'Reporte General',
    to: '',
    subject: 'Reporte de Vencimientos - [FECHA]',
    body: 'Adjunto el detalle de los productos seleccionados para revisión:\n\n[TABLA_PRODUCTOS]\n\nSaludos.'
  }
];

interface ExpiryEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedItems: any[];
  theme?: 'dark' | 'light';
}

export const ExpiryEmailModal: React.FC<ExpiryEmailModalProps> = ({
  isOpen,
  onClose,
  selectedItems,
  theme = 'dark'
}) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('default-1');
  
  // Current editing state
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Load templates on mount
  useEffect(() => {
    const saved = localStorage.getItem('logicount_email_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setTemplates(parsed);
          setSelectedTemplateId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error('Error parsing templates', e);
      }
    }
    setTemplates(DEFAULT_TEMPLATES);
    setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
  }, []);

  // Update form when template changes
  useEffect(() => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template) {
      setTo(template.to);
      setSubject(template.subject);
      setBody(template.body);
      setIsEditingTemplate(false);
    }
  }, [selectedTemplateId, templates]);

  const saveTemplates = (newTemplates: EmailTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('logicount_email_templates', JSON.stringify(newTemplates));
  };

  const handleSaveAsNewTemplate = () => {
    if (!newTemplateName.trim()) {
      toast.error('Ingresa un nombre para la plantilla');
      return;
    }
    const newTemplate: EmailTemplate = {
      id: `custom-${Date.now()}`,
      name: newTemplateName,
      to,
      subject,
      body
    };
    saveTemplates([...templates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setIsEditingTemplate(false);
    setNewTemplateName('');
    toast.success('Plantilla guardada exitosamente');
  };

  const handleUpdateTemplate = () => {
    const isDefault = selectedTemplateId.startsWith('default-');
    if (isDefault) {
      toast.error('No puedes sobrescribir una plantilla por defecto. Guárdala como nueva.');
      return;
    }
    const updated = templates.map(t => 
      t.id === selectedTemplateId ? { ...t, to, subject, body } : t
    );
    saveTemplates(updated);
    toast.success('Plantilla actualizada');
  };

  const handleDeleteTemplate = () => {
    const isDefault = selectedTemplateId.startsWith('default-');
    if (isDefault) {
      toast.error('No puedes eliminar una plantilla por defecto');
      return;
    }
    const confirm = window.confirm('¿Eliminar esta plantilla?');
    if (confirm) {
      const updated = templates.filter(t => t.id !== selectedTemplateId);
      saveTemplates(updated);
      setSelectedTemplateId(updated[0]?.id || '');
      toast.success('Plantilla eliminada');
    }
  };

  const processText = (text: string) => {
    const now = new Date();
    return text
      .replace(/\[CANTIDAD_ITEMS\]/g, selectedItems.length.toString())
      .replace(/\[FECHA\]/g, format(now, 'dd/MM/yyyy'));
  };

  const generateHtmlTable = () => {
    const rows = selectedItems.map(item => {
      const expiry = item.mm && item.yyyy ? `${String(item.mm).padStart(2, '0')}/${item.yyyy}` : 'N/A';
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-family: monospace;">${item.barcode || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${item.productName || 'N/A'}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${expiry}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.quantity || 1}</td>
        </tr>
      `;
    }).join('');

    return `
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; font-family: Arial, sans-serif; font-size: 14px;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #ddd; color: #334155;">SKU</th>
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #ddd; color: #334155;">Descripción</th>
            <th style="padding: 10px 8px; text-align: center; border: 1px solid #ddd; color: #334155;">Vencimiento</th>
            <th style="padding: 10px 8px; text-align: right; border: 1px solid #ddd; color: #334155;">Cant</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  };

  const generateFullHtml = () => {
    const processedBody = processText(body);
    const parts = processedBody.split('[TABLA_PRODUCTOS]');
    
    let html = `<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">`;
    
    if (parts.length > 1) {
      html += `<p style="white-space: pre-wrap; margin-bottom: 0;">${parts[0]}</p>`;
      html += generateHtmlTable();
      html += `<p style="white-space: pre-wrap; margin-top: 0;">${parts[1]}</p>`;
    } else {
      html += `<p style="white-space: pre-wrap;">${processedBody}</p>`;
      html += generateHtmlTable();
    }
    
    html += `</div>`;
    return html;
  };

  const handleCopyAndOpen = async () => {
    const finalSubject = processText(subject);
    const htmlContent = generateFullHtml();
    
    try {
      // Create a blob with the HTML content
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([processText(body).replace('[TABLA_PRODUCTOS]', '(Tabla copiada en formato HTML)')], { type: 'text/plain' });
      
      const clipboardItem = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      
      await navigator.clipboard.write([clipboardItem]);
      toast.success('¡Contenido copiado al portapapeles!');
      
      // Open default email client
      const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent('Por favor, pega (Ctrl+V) el contenido aquí.')}`;
      window.location.href = mailtoLink;
      
      setTimeout(onClose, 1000);
    } catch (err) {
      console.error('Error copying to clipboard', err);
      toast.error('Error al copiar. Tu navegador podría no soportar esta función.');
      
      // Fallback: just open mailto
      const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(finalSubject)}`;
      window.location.href = mailtoLink;
    }
  };

  const handleOpenGmail = async () => {
    const finalSubject = processText(subject);
    const htmlContent = generateFullHtml();
    
    try {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([processText(body).replace('[TABLA_PRODUCTOS]', '(Tabla copiada en formato HTML)')], { type: 'text/plain' });
      
      const clipboardItem = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText
      });
      
      await navigator.clipboard.write([clipboardItem]);
      toast.success('¡Contenido copiado al portapapeles!');
      
      // Open Gmail in new tab
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(finalSubject)}&body=${encodeURIComponent('Por favor, pega (Ctrl+V) el contenido aquí.')}`;
      window.open(gmailUrl, '_blank');
      
      setTimeout(onClose, 1000);
    } catch (err) {
      console.error('Error copying to clipboard', err);
      toast.error('Error al copiar. Tu navegador podría no soportar esta función.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={e => e.stopPropagation()}
          className={`w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
            theme === 'dark' ? 'bg-slate-900 border border-white/10' : 'bg-white border border-slate-200'
          }`}
        >
          {/* Header */}
          <div className={`p-6 border-b flex items-center justify-between shrink-0 ${
            theme === 'dark' ? 'border-white/10' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <Mail className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h2 className={`text-2xl font-black uppercase tracking-tighter italic leading-none ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>Redactar Solicitud</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {selectedItems.length} ítems seleccionados
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                theme === 'dark' ? 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column: Editor */}
            <div className="space-y-6 flex flex-col">
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-3 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Plantilla</label>
                <div className="flex gap-3">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    className={`flex-1 px-5 py-4 rounded-2xl text-sm font-bold border outline-none transition-all ${
                      theme === 'dark' 
                        ? 'bg-black/20 border-white/10 text-white focus:border-indigo-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                    }`}
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {!selectedTemplateId.startsWith('default-') && (
                    <button
                      onClick={handleDeleteTemplate}
                      className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-colors"
                      title="Eliminar plantilla"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-3 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Para (Destinatario)</label>
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="ej. pm@empresa.com"
                  className={`w-full px-5 py-4 rounded-2xl text-sm font-medium border outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-black/20 border-white/10 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-3 ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}>Asunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={`w-full px-5 py-4 rounded-2xl text-sm font-medium border outline-none transition-all ${
                    theme === 'dark' 
                      ? 'bg-black/20 border-white/10 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="flex-1 flex flex-col min-h-[250px]">
                <div className="flex items-center justify-between mb-3">
                  <label className={`block text-xs font-black uppercase tracking-widest ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                  }`}>Mensaje</label>
                  <span className="text-[10px] text-indigo-500 font-bold bg-indigo-500/10 px-3 py-1 rounded-full">Usa [TABLA_PRODUCTOS] para insertar la tabla</span>
                </div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className={`flex-1 w-full px-5 py-4 rounded-2xl text-sm font-medium border outline-none transition-all resize-none ${
                    theme === 'dark' 
                      ? 'bg-black/20 border-white/10 text-white focus:border-indigo-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Template Save Controls */}
              <div className={`p-5 rounded-2xl border ${
                theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
                {!isEditingTemplate ? (
                  <div className="flex gap-3">
                    {!selectedTemplateId.startsWith('default-') && (
                      <button
                        onClick={handleUpdateTemplate}
                        className="flex-1 py-3 rounded-xl bg-indigo-500/10 text-indigo-500 font-bold text-xs uppercase tracking-wider hover:bg-indigo-500/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" /> Actualizar Actual
                      </button>
                    )}
                    <button
                      onClick={() => setIsEditingTemplate(true)}
                      className="flex-1 py-3 rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-xs uppercase tracking-wider hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> Guardar como Nueva
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Nombre de la nueva plantilla..."
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium border outline-none ${
                        theme === 'dark' ? 'bg-black/40 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                      }`}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveAsNewTemplate}
                      className="px-5 py-3 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setIsEditingTemplate(false)}
                      className="px-4 py-3 rounded-xl bg-slate-500/20 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Preview */}
            <div className="flex flex-col h-full">
              <label className={`block text-xs font-black uppercase tracking-widest mb-3 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}>Vista Previa del Correo</label>
              
              <div className={`flex-1 rounded-3xl border overflow-hidden flex flex-col shadow-inner ${
                theme === 'dark' ? 'bg-white border-white/10' : 'bg-white border-slate-200'
              }`}>
                <div className="bg-slate-100 border-b border-slate-200 p-5 text-sm text-slate-600 font-medium shrink-0">
                  <div className="flex items-center"><span className="text-slate-400 w-16 inline-block">Para:</span> {to || '(Sin destinatario)'}</div>
                  <div className="mt-2 flex items-start"><span className="text-slate-400 w-16 inline-block shrink-0">Asunto:</span> <span className="font-bold text-slate-800">{processText(subject) || '(Sin asunto)'}</span></div>
                </div>
                <div 
                  className="p-6 overflow-y-auto text-sm text-slate-800"
                  dangerouslySetInnerHTML={{ __html: generateFullHtml() }}
                />
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className={`p-6 border-t flex justify-end shrink-0 ${
            theme === 'dark' ? 'border-white/10 bg-black/20' : 'border-slate-200 bg-slate-50'
          }`}>
            <button
              onClick={handleOpenGmail}
              className="w-full md:w-auto px-10 bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest transition-all shadow-xl shadow-rose-500/20 active:scale-95 flex items-center justify-center gap-3"
            >
              <Mail className="w-6 h-6" />
              Copiar y Abrir en Gmail
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
