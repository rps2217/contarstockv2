import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Globe, Edit2, Trash2, Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';

interface ExpiryDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
  theme?: 'dark' | 'light';
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  onPrintCode: (item: any) => void;
}

export const ExpiryDetailDrawer: React.FC<ExpiryDetailDrawerProps> = ({
  isOpen,
  onClose,
  item,
  theme = 'dark',
  onEdit,
  onDelete,
  onPrintCode
}) => {
  const isDark = theme === 'dark';

  if (!item) return null;

  const handleWebSearch = () => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(item.productName)}`, '_blank');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed inset-y-0 right-0 w-full md:w-[400px] z-50 flex flex-col shadow-2xl border-l ${
              isDark ? 'bg-brand-surface border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-4 border-b shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <h2 className={`text-lg font-black uppercase tracking-tighter truncate md:w-auto w-[80%] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {item.productName}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDelete(item)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isDark ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10' : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                  }`}
                  title="Eliminar registro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEdit(item)}
                  className={`border px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${
                    isDark ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button
                  onClick={onClose}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors lg:hidden ${
                    isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-6">
              
              {/* Top Quick Actions */}
              <div className="flex items-center justify-center gap-8 mb-10 mt-2">
                <div 
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                  onClick={() => onPrintCode(item)}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isDark ? 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                  }`}>
                    <Printer className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest text-center max-w-[80px] leading-tight ${
                    isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'
                  }`}>
                    Imprimir Etiqueta
                  </span>
                </div>
                <div 
                  className="flex flex-col items-center gap-2 cursor-pointer group"
                  onClick={handleWebSearch}
                >
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isDark ? 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                  }`}>
                    <Globe className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest text-center max-w-[80px] leading-tight ${
                    isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'
                  }`}>
                    Buscar en Web
                  </span>
                </div>
              </div>

              {/* Data List */}
              <div className="space-y-6">
                
                <DetailRow 
                  label="SKU" 
                  value={item.barcode} 
                  isDark={isDark} 
                  copyable
                />
                
                <DetailRow 
                  label="Producto" 
                  value={item.productName} 
                  isDark={isDark} 
                  highlight
                />
                
                <DetailRow 
                  label="Proveedor" 
                  value={item.providerName || 'Sin Proveedor'} 
                  isDark={isDark} 
                  highlight
                />
                
                <div className={`p-4 rounded-xl border ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                  <DetailRow 
                    label="Vencimiento" 
                    value={item.expiryDateObj ? format(item.expiryDateObj, 'dd/MM/yyyy') : '--'} 
                    isDark={isDark}
                    icon={Calendar}
                    className="mb-4"
                  />
                  
                  <DetailRow 
                    label="Retiro Sugerido" 
                    value={item.withdrawalDate ? format(item.withdrawalDate, 'dd/MM/yyyy') : '--'} 
                    isDark={isDark}
                    icon={Calendar}
                    valueColor={isDark ? 'text-amber-400' : 'text-amber-600'}
                  />
                </div>

                <DetailRow 
                  label="Días Política Retiro" 
                  value={item.withdrawalDays?.toString() || '--'} 
                  isDark={isDark} 
                />

                <DetailRow 
                  label="Política" 
                  value={item.hasCanje ? 'Canje' : 'Merma'} 
                  isDark={isDark} 
                  valueColor={item.hasCanje ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : (isDark ? 'text-rose-400' : 'text-rose-600')}
                />

                {item.observaciones && (
                  <DetailRow 
                    label="Observaciones" 
                    value={item.observaciones} 
                    isDark={isDark} 
                    icon={FileText}
                    valueColor={isDark ? 'text-amber-400' : 'text-amber-600'}
                  />
                )}

                <DetailRow 
                  label="Cantidad Registrada" 
                  value={`${item.quantity || 1} uds.`} 
                  isDark={isDark} 
                />

                <DetailRow 
                  label="Status ID" 
                  value={item.id} 
                  isDark={isDark} 
                  textClass="text-xs"
                />

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const DetailRow = ({ 
  label, 
  value, 
  isDark, 
  copyable, 
  highlight,
  icon: Icon,
  className = '',
  valueColor,
  textClass = 'text-base'
}: { 
  label: string; 
  value: string; 
  isDark: boolean;
  copyable?: boolean;
  highlight?: boolean;
  icon?: any;
  className?: string;
  valueColor?: string;
  textClass?: string;
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </span>
      <div 
        className={`flex items-center gap-2 ${copyable ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
        onClick={() => {
          if (copyable) navigator.clipboard.writeText(value);
        }}
      >
        {Icon && <Icon className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />}
        <span className={`font-medium ${textClass} ${
          valueColor ? valueColor :
          highlight 
            ? isDark ? 'text-slate-200 font-semibold text-lg' : 'text-slate-800 font-semibold text-lg' 
            : isDark ? 'text-slate-300' : 'text-slate-700'
        } ${copyable ? 'font-mono' : ''}`}>
          {value}
        </span>
      </div>
    </div>
  );
};
