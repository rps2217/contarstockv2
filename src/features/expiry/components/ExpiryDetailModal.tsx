import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Package, Factory, ShieldAlert, Barcode, CalendarDays, Clock, FileWarning, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ExpiryItem } from '../../../store/useExpiryStore';
import { useLiveQuery } from 'dexie-react-hooks';
import { productRepository } from '../../../repositories/DexieProductRepository';
import { ProviderRepository } from '../../../repositories/ProviderRepository';
import { normalizeIdentity } from '../../../services/utils';

interface ExpiryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: ExpiryItem | null;
}

export const ExpiryDetailModal: React.FC<ExpiryDetailModalProps> = ({
  isOpen,
  onClose,
  item
}) => {
  const norm = normalizeIdentity;

  const product = useLiveQuery(() => {
    if (!item?.barcode) return null;
    return productRepository.getById(item.barcode);
  }, [item?.barcode]);

  const provider = useLiveQuery(async () => {
    if (product?.supplierRut) {
      const cleanRut = norm(product.supplierRut);
      // 1. Direct fetch with exact RUT
      let p = await ProviderRepository.getByRut(product.supplierRut);
      
      // 2. Direct fetch with normalized RUT
      if (!p) {
        p = await ProviderRepository.getByRut(cleanRut);
      }
      
      // 3. Normalized list search
      if (!p) {
        const allProviders = await ProviderRepository.getAll();
        p = allProviders.find(prov => norm(prov.rut) === cleanRut);
      }
      if (p) return p;
    }
    
    // 4. Fallback: Search by name
    const searchName = product?.supplier || item?.providerName;
    if (searchName && searchName !== 'N/A') {
      const providers = await ProviderRepository.getAll();
      return providers.find(p => norm(p.name!) === norm(searchName)) || null;
    }
    return null;
  }, [product?.supplierRut, product?.supplier, item?.providerName]);

  if (!item) return null;

  const isWarning = item.daysLeft <= 90;
  const isExpired = item.daysLeft <= 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-dark/40 z-[200]"
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 bg-slate-900 border-t border-slate-800 rounded-t-3xl z-[201] flex flex-col max-h-[85vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className={`p-6 border-b flex items-center justify-between ${
                isExpired ? 'border-rose-500/30 bg-rose-500/5' : isWarning ? 'border-amber-500/30 bg-amber-500/5' : 'border-indigo-500/30 bg-indigo-500/5'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  isExpired ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' : isWarning ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500'
                }`}>
                  {isExpired ? <FileWarning className="w-6 h-6" /> : <CalendarDays className="w-6 h-6" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight line-clamp-1">{item.productName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-bold text-slate-400 font-mono">{item.barcode}</span>
                    <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                      isExpired ? 'bg-rose-500/20 text-rose-400' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {item.daysLeft > 0 ? `${item.daysLeft} DÍAS RESTANTES` : 'VENCIDO'}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Scroll */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
              
              {/* Product Info Group (AppSheet Style) */}
              <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" /> SKU / Producto
                </h3>
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden divide-y divide-slate-700/50">
                  <DetailRow label="Nombre Embalaje" value={item.productName} />
                  <DetailRow label="Categoría" value={product?.category || item.category || 'SIN CATEGORÍA'} />
                  {provider?.hasExchange !== undefined && (
                     <DetailRow label="Políticas SKU" value={provider.withdrawalDays ? `${provider.withdrawalDays} días (${provider.hasExchange ? 'Canje' : 'Merma'})` : 'Sin definir'} />
                  )}
                  {item.observaciones && <DetailRow label="Observaciones" value={item.observaciones} isHighlighted />}
                </div>
              </section>

              {/* Provider Info Group */}
              <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Factory className="w-4 h-4" /> Origen / Fabricante
                </h3>
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden divide-y divide-slate-700/50">
                  <DetailRow label="Proveedor" value={provider?.name || (item.providerName !== 'N/A' ? item.providerName : product?.supplier) || 'SIN PROVEEDOR'} />
                  {provider?.rut && <DetailRow label="RUT Proveedor" value={provider.rut} />}
                  {((provider?.withdrawalDays ?? (product as any)?.withdrawalDays ?? (item as any).withdrawalDays) !== undefined) && (
                     <DetailRow label="Política Maestra" value={`${provider?.withdrawalDays ?? (product as any)?.withdrawalDays ?? (item as any).withdrawalDays} días (${(provider?.hasExchange ?? (product as any)?.hasExchange ?? item.hasCanje) ? 'CANJE' : 'MERMA'})`} />
                  )}
                </div>
              </section>

              {/* Lifecycle Info */}
              <section>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Ciclo de Vida
                </h3>
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden divide-y divide-slate-700/50">
                  <DetailRow label="Fecha Vencimiento" value={item.expiryDateObj ? format(item.expiryDateObj, 'MM/yyyy') : `${item.mm}/${item.yyyy}`} />
                  <DetailRow label="Fecha de Retiro Sugerida" value={item.withdrawalDate ? format(item.withdrawalDate, 'dd/MM/yyyy') : 'N/A'} isDate />
                  <DetailRow label="Estado Lógico" value={isExpired ? 'CRITICO - VENCIDO' : isWarning ? 'ALERTA PREVENTIVA' : 'ÓPTIMO'} 
                    status={isExpired ? 'error' : isWarning ? 'warning' : 'success'} 
                  />
                  <DetailRow label="Capturado el" value={item.timestamp ? format(item.timestamp, "dd/MM/yyyy HH:mm") : 'Desconocido'} />
                </div>
              </section>

            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  );
};

const DetailRow: React.FC<{ label: string, value: string, isHighlighted?: boolean, isDate?: boolean, status?: 'success' | 'warning' | 'error' | 'neutral' }> = ({ label, value, isHighlighted, isDate, status = 'neutral' }) => {
  return (
    <div className={`p-4 flex justify-between items-center ${isHighlighted ? 'bg-amber-500/5' : ''}`}>
      <span className="text-xs font-bold text-slate-400">{label}</span>
      <span className={`text-sm font-black text-right max-w-[60%] ${
        status === 'error' ? 'text-rose-400' : 
        status === 'warning' ? 'text-amber-400' : 
        status === 'success' ? 'text-emerald-400' : 
        isHighlighted ? 'text-amber-300' : 'text-white'
      }`}>
        {value}
      </span>
    </div>
  );
};
