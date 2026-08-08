import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Barcode, Calendar, Zap, AlertCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeSku } from '../../../services/utils';

// ✅ NUEVO: Imports de constantes
import { EXPIRY_YEARS } from '../constants';

interface ExpirationModalProps {
  onComplete: (data: { barcode: string; productName: string; mm: number; yyyy: number; observaciones?: string }) => void;
  onCancel?: () => void;
  productMap: Record<string, any>;
  initialBarcode?: string;
  initialData?: { mm: number; yyyy: number; productName: string; observaciones?: string };
  title?: string;
}

export const ExpirationModal: React.FC<ExpirationModalProps> = ({ 
  onComplete, 
  onCancel,
  productMap,
  initialBarcode = '',
  initialData,
  title = 'REGISTRO DESKTOP'
}) => {
  const [barcode, setBarcode] = useState<string>(initialBarcode);
  const [productName, setProductName] = useState<string>(initialData?.productName || '');
  const [observaciones, setObservaciones] = useState<string>(initialData?.observaciones || '');
  const [selectedMm, setSelectedMm] = useState<number | null>(initialData?.mm || null);
  const [selectedYyyy, setSelectedYyyy] = useState<number | null>(initialData?.yyyy || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCloud, setIsSearchingCloud] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  
  const barcodeRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  // Auto-lookup logic - Búsqueda Híbrida (Local + Cloud)
  useEffect(() => {
    const sku = normalizeSku(barcode);
    if (!sku) {
      setProductName('');
      return;
    }

    // 1. INTENTO LOCAL (Instante)
    const localProduct = productMap instanceof Map ? productMap.get(sku) : productMap[sku];
    if (localProduct) {
      setProductName(localProduct.name || localProduct.DESCRIPTOR || localProduct.DESCRIPCION || 'PRODUCTO IDENTIFICADO');
      setIsSearchingCloud(false);
      return;
    }

    // 2. INTENTO EN LA NUBE (Fallback)
    let isMounted = true;
    const searchInCloud = async () => {
      try {
        setIsSearchingCloud(true);
        setProductName('BUSCANDO EN LA NUBE...');
        
        const settings = (await import('../../../services/settings')).getSettings();
        const config = settings.cloudConfig;
        const productsTable = config?.productsTableName || 'PRODUCTOS';
        const barcodeCol = config?.mappings?.products?.barcode || 'barcode';
        const nameCol = config?.mappings?.products?.name || 'name';

        // LÓGICA MIGRADA A SUPABASE
        const { supabaseSyncService } = await import('../../../services/supabaseSyncService');
        const response = await supabaseSyncService.query(productsTable, barcodeCol, sku);
        
        if (!isMounted) return;

        if (response.success && response.rows && response.rows.length > 0) {
          const product = response.rows[0] as Record<string, unknown>;
          const name = product[nameCol] || product.name || product.DESCRIPTOR || 'PRODUCTO ENCONTRADO';
          setProductName(String(name));

          // ESTRATEGIA LOCAL-FIRST: Guardar en DB local para que el siguiente escaneo sea instantáneo
          const { productRepository } = await import('../../../repositories/DexieProductRepository');
          const { ProviderRepository } = await import('../../../repositories/ProviderRepository');
          const supplierRut = normalizeSku(String(product.supplier_rut || product.supplierRut || product.PROVEEDOR_RUT || ''));
          
          const newProduct = {
            barcode: sku,
            name: String(name),
            category: String(product.category || product.CATEGORIA || 'GENERAL'),
            supplier: String(product.supplier || product.PROVEEDOR || 'N/A'),
            supplierRut: supplierRut,
            price: parseFloat(String(product.price || product.PRECIO || 0)),
            syncStatus: 'synced' as const
          };
          
          await productRepository.save(newProduct);

          // Si el proveedor no existe localmente, también lo traemos en caliente desde Supabase
          if (supplierRut) {
            const localProvider = await ProviderRepository.getByRut(supplierRut);
            if (!localProvider) {
              const providersTable = config?.providersTableName || 'PROVEEDORES';
              const rutCol = 'rut'; // Supabase usa 'rut'
              const provResponse = await supabaseSyncService.query(providersTable, rutCol, supplierRut);
              
              if (provResponse.success && provResponse.rows && provResponse.rows.length > 0) {
                const p = provResponse.rows[0] as Record<string, unknown>;
                const withdrawalDays = Number(p.withdrawal_days || p.withdrawalDays || 0);

                await ProviderRepository.save({
                  rut: supplierRut,
                  name: String(p.name || p.NOMBRE || 'N/A'),
                  withdrawalDays: Number(withdrawalDays),
                  hasExchange: withdrawalDays > 0,
                  syncStatus: 'synced'
                });
              }
            }
          }
        } else {
          setProductName('PRODUCTO NO ENCONTRADO');
        }
      } catch (err) {
        if (isMounted) setProductName('ERROR DE CONEXIÓN');
      } finally {
        if (isMounted) setIsSearchingCloud(false);
      }
    };

    const timer = setTimeout(searchInCloud, 600);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [barcode, productMap]);

  // Keyboard Navigation Logic
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) onCancel();
      
      // Auto-submit on Enter if all fields are ready
      if (e.key === 'Enter' && barcode && selectedMm && selectedYyyy && !isSubmitting) {
        handleSave();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [barcode, selectedMm, selectedYyyy, isSubmitting]);

  const handleSave = async () => {
    if (barcode && selectedMm && selectedYyyy && !isSubmitting) {
      setIsSubmitting(true);
      
      try {
        await onComplete({
          barcode,
          productName: productName || 'Producto Manual',
          mm: selectedMm,
          yyyy: selectedYyyy,
          observaciones
        });

        if (continuousMode) {
          // Reset for next item
          setBarcode('');
          setProductName('');
          setObservaciones('');
          setSelectedMm(null);
          setSelectedYyyy(null);
          setIsSubmitting(false);
          barcodeRef.current?.focus();
        }
      } catch (err) {
        setIsSubmitting(false);
      }
    } else if (!isSubmitting) {
      
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  // ✅ CORREGIDO: Usar años del rango válido (2024-2027)
  const years = [...EXPIRY_YEARS];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.9)]"
      >
        {/* HEADER */}
        <div className="p-6 bg-[#111] border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">{title}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Optimizado para Teclado + Scanner</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setContinuousMode(!continuousMode)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                continuousMode 
                  ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' 
                  : 'bg-white/5 border-white/10 text-slate-500'
              }`}
              title="Modo Continuo: No cierra el modal tras registrar"
            >
              <RefreshCcw className={`w-4 h-4 ${continuousMode ? 'animate-spin-slow' : ''}`} />
              <span className="text-[9px] font-black uppercase tracking-widest">Modo Continuo</span>
            </button>
            {onCancel && (
              <button 
                onClick={onCancel} 
                className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors group"
              >
                <X className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8 space-y-8">
          
          {/* BARCODE SECTION */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">1. ESCANEAR PRODUCTO</label>
              <AnimatePresence>
                {productName && (
                  <motion.span 
                    initial={{ opacity: 0, x: 10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                      productName.includes('NO ENCONTRADO') ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {productName.includes('NO ENCONTRADO') ? 'Desconocido' : 'Identificado'}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="relative group">
              <div className="absolute left-5 top-1/2 -translate-y-1/2">
                <Barcode className={`w-8 h-8 transition-colors ${barcode ? 'text-blue-500' : 'text-slate-700'}`} />
              </div>
              <input 
                autoFocus
                ref={barcodeRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && barcode) {
                    // Focus month buttons or handle auto-flow
                  }
                }}
                className="w-full bg-black border-2 border-white/10 group-hover:border-white/20 rounded-3xl py-6 pl-16 pr-6 text-3xl font-black focus:outline-none focus:border-blue-600 text-white tracking-[0.15em] transition-all placeholder:text-white/5"
                placeholder="ESCANEAR..."
              />
            </div>
            {productName && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl"
              >
                <p className="text-base font-black text-blue-400 uppercase italic truncate text-center tracking-tight">
                  {productName}
                </p>
              </motion.div>
            )}
          </div>

          {/* OBSERVATIONS SECTION */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">DESCRIPCIÓN ADICIONAL / OBSERVACIONES</label>
            <input 
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full bg-black border-2 border-white/10 hover:border-white/20 rounded-2xl py-4 px-6 text-xl font-bold focus:outline-none focus:border-amber-500 text-white transition-all placeholder:text-white/5 uppercase"
              placeholder="OPCIONAL (EJ: CAJA DAÑADA, RELLENO, ETC)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* MONTH SELECTOR */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">2. MES DE VENCIMIENTO</label>
              <div className="grid grid-cols-4 gap-2">
                {months.map(m => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMm(m);
                      
                    }}
                    className={`h-14 rounded-xl font-black text-xl transition-all border-2 ${
                      selectedMm === m 
                        ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] scale-105 z-10' 
                        : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>

            {/* YEAR SELECTOR */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">3. AÑO DE VENCIMIENTO</label>
              <div className="grid grid-cols-2 gap-3">
                {years.map(y => (
                  <button
                    key={y}
                    onClick={() => {
                      setSelectedYyyy(y);
                      
                    }}
                    className={`h-20 rounded-2xl font-black text-2xl transition-all border-2 flex items-center justify-center italic tracking-tighter ${
                      selectedYyyy === y 
                        ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.4)] scale-105 z-10' 
                        : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* FINAL ACTION */}
          <div className="pt-4">
            <button
              disabled={!barcode || !selectedMm || !selectedYyyy || isSubmitting}
              onClick={handleSave}
              className={`w-full py-8 rounded-[2rem] font-black text-2xl uppercase tracking-[0.3em] flex items-center justify-center gap-6 transition-all ${
                isSubmitting 
                  ? 'bg-blue-900/50 text-blue-200 border border-blue-500/30 cursor-wait'
                  : barcode && selectedMm && selectedYyyy
                    ? 'bg-white text-black hover:bg-blue-50 shadow-[0_20px_40px_rgba(255,255,255,0.1)] cursor-pointer active:scale-[0.98]'
                    : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed grayscale'
              }`}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full"
                  />
                  PROCESANDO...
                </>
              ) : (
                <>
                  <Check className="w-8 h-8 stroke-[3px]" />
                  CONFIRMAR REGISTRO
                </>
              )}
            </button>
            <p className="text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-4">
              Presiona <span className="text-muted">ENTER</span> para confirmar rápido
            </p>
          </div>

        </div>
      </motion.div>
      
      <style>{`
        @keyframes spin-slow {
          from { rotate: 0deg; }
          to { rotate: 360deg; }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
      `}</style>
    </div>
  );
};

