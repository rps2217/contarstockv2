import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Barcode, Calendar, Zap, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SoundFX } from '../../../services/audio';
import { normalizeSku } from '../../../services/utils';

interface ExpirationModalProps {
  onComplete: (data: { barcode: string; productName: string; mm: number; yyyy: number }) => void;
  onCancel?: () => void;
  productMap: Record<string, any>;
}

export const ExpirationModal: React.FC<ExpirationModalProps> = ({ 
  onComplete, 
  onCancel,
  productMap 
}) => {
  const [barcode, setBarcode] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [selectedMm, setSelectedMm] = useState<number | null>(null);
  const [selectedYyyy, setSelectedYyyy] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingCloud, setIsSearchingCloud] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Auto-lookup logic - Búsqueda Híbrida (Local + Cloud)
  useEffect(() => {
    const sku = normalizeSku(barcode);
    if (!sku) {
      setProductName('');
      return;
    }

    // 1. INTENTO LOCAL (Instante)
    const localProduct = productMap[sku];
    if (localProduct) {
      setProductName(localProduct.name || localProduct.DESCRIPTOR || 'PRODUCTO IDENTIFICADO');
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
        const config = settings.appSheetConfig;
        const productsTable = config?.productsTableName || 'PRODUCTOS';
        const barcodeCol = config?.mappings?.products?.barcode || 'SKU';
        const nameCol = config?.mappings?.products?.name || 'DESCRIPTOR';

        const { firebaseSyncService } = await import('../../../services/firebaseSyncService');
        const response = await firebaseSyncService.query(productsTable, barcodeCol, sku);
        
        if (!isMounted) return;

        if (response.success && response.rows && response.rows.length > 0) {
          const product = response.rows[0];
          const name = product[nameCol] || product.DESCRIPTOR || 'PRODUCTO ENCONTRADO';
          setProductName(name);

          // ESTRATEGIA LOCAL-FIRST: Guardar en DB local para que el siguiente escaneo sea instantáneo
          const { db } = await import('../../../db');
          const supplierRut = normalizeSku(product.PROVEEDOR_RUT || product.supplierRut || '');
          
          const newProduct = {
            barcode: sku,
            name: name,
            category: product.CATEGORIA || product.category || 'GENERAL',
            supplier: product.PROVEEDOR || product.supplier || 'N/A',
            supplierRut: supplierRut,
            price: parseFloat(product.PRECIO || 0),
            syncStatus: 'synced' as const
          };
          
          await db.products.put(newProduct);

          // Si el proveedor no existe localmente, también lo traemos en caliente
          if (supplierRut) {
            const localProvider = await db.providers.get(supplierRut);
            if (!localProvider) {
              const providersTable = config?.providersTableName || 'PROVEEDORES';
              const rutCol = 'ID_RUT'; // Ajustar según realidad o mapping
              const provResponse = await firebaseSyncService.query(providersTable, rutCol, supplierRut);
              
              if (provResponse.success && provResponse.rows && provResponse.rows.length > 0) {
                const p = provResponse.rows[0];
                const withdrawalRaw = String(p['RETIRO (DÍAS)'] || p['RETIRO'] || '0');
                const match = withdrawalRaw.match(/\d+/);
                const withdrawalDays = match ? parseInt(match[0], 10) : 0;

                await db.providers.put({
                  rut: supplierRut,
                  name: String(p['NOMBRE PROVEEDOR'] || p['PROVEEDOR'] || 'N/A'),
                  withdrawalDays,
                  hasExchange: withdrawalDays > 0
                });
              }
            }
          }
        } else {
          setProductName('PRODUCTO NO ENCONTRADO EN NINGÚN SISTEMA');
        }
      } catch (err) {
        if (isMounted) setProductName('ERROR AL BUSCAR EN LA NUBE');
      } finally {
        if (isMounted) setIsSearchingCloud(false);
      }
    };

    const timer = setTimeout(searchInCloud, 600); // Pequeño delay para no saturar al escribir
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [barcode, productMap]);

  const handleSave = async () => {
    if (barcode && selectedMm && selectedYyyy && !isSubmitting) {
      setIsSubmitting(true);
      SoundFX.play('success');
      try {
        await onComplete({
          barcode,
          productName: productName || 'Producto Manual',
          mm: selectedMm,
          yyyy: selectedYyyy
        });
      } catch (err) {
        setIsSubmitting(false);
      }
    } else if (!isSubmitting) {
      SoundFX.play('error');
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [2026, 2027];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]"
      >
        {/* HEADER */}
        <div className="p-6 bg-[#111] border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/30">
              <Zap className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tighter leading-none">REGISTRO</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Ingreso rápido</p>
            </div>
          </div>
          {onCancel && (
            <button 
              onClick={onCancel} 
              className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors group"
            >
              <X className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" />
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-6">
          
          {/* BARCODE SECTION */}
          <div className="space-y-2">
            <div className="flex justify-between items-center px-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">1. SKU</label>
              <AnimatePresence>
                {productName && (
                  <motion.span 
                    initial={{ opacity: 0, x: 10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      productName.includes('NO ENCONTRADO') ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {productName.includes('NO ENCONTRADO') ? 'Desconocido' : 'Identificado'}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <Barcode className={`w-6 h-6 transition-colors ${barcode ? 'text-blue-500' : 'text-slate-700'}`} />
              </div>
              <input 
                autoFocus
                ref={barcodeRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                className="w-full bg-black border-2 border-white/10 group-hover:border-white/20 rounded-2xl py-4 pl-14 pr-4 text-2xl font-black focus:outline-none focus:border-blue-600 text-white tracking-[0.1em] transition-all placeholder:text-white/5"
                placeholder="00000000"
              />
            </div>
            {productName && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl"
              >
                <p className="text-sm font-black text-blue-400 uppercase italic truncate text-center">
                  {productName}
                </p>
              </motion.div>
            )}
          </div>

          {/* MONTH SELECTOR - FULL WIDTH ROW */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">2. MES</label>
            <div className="grid grid-cols-6 gap-2">
              {months.map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setSelectedMm(m);
                    SoundFX.play('increment');
                  }}
                  className={`h-12 rounded-xl font-black text-lg transition-all border-2 ${
                    selectedMm === m 
                      ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' 
                      : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* YEAR SELECTOR - HORIZONTAL ROW */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">3. AÑO</label>
            <div className="grid grid-cols-2 gap-3">
              {years.map(y => (
                <button
                  key={y}
                  onClick={() => {
                    setSelectedYyyy(y);
                    SoundFX.play('increment');
                  }}
                  className={`h-16 rounded-2xl font-black text-2xl transition-all border-2 flex items-center justify-center italic tracking-tighter ${
                    selectedYyyy === y 
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                      : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* FINAL ACTION */}
          <div className="pt-2">
            <button
              disabled={!barcode || !selectedMm || !selectedYyyy || isSubmitting}
              onClick={handleSave}
              className={`w-full py-6 rounded-2xl font-black text-xl uppercase tracking-[0.2em] flex items-center justify-center gap-4 transition-all ${
                isSubmitting 
                  ? 'bg-blue-900/50 text-blue-200 border border-blue-500/30 cursor-wait'
                  : barcode && selectedMm && selectedYyyy
                    ? 'bg-white text-black hover:bg-blue-50 shadow-[0_10px_20px_rgba(255,255,255,0.05)] cursor-pointer'
                    : 'bg-white/5 text-white/10 border border-white/5 cursor-not-allowed grayscale'
              }`}
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
                  />
                  REGISTRANDO...
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  REGISTRAR
                </>
              )}
            </button>
          </div>

        </div>
      </motion.div>
    </div>
  );
};
