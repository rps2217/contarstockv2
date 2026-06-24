/**
 * ExpiryCaptureModalWithScanner - Modal de captura con scanner integrado
 * 
 * Características:
 * - Scanner HID para capturar productos
 * - Auto-completar barcode + nombre
 * - Validación contra catálogo
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Scan, 
  Package, 
  Calendar, 
  MapPin,
  Building2,
  AlertTriangle,
  Check,
  Loader2
} from 'lucide-react';
import { useHIDScanner } from '@/hooks/useHIDScanner';
import { productRepository } from '@/repositories/DexieProductRepository';
import { toast } from 'sonner';

interface ExpiryCaptureModalWithScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpiryFormData) => Promise<void>;
  theme?: 'dark' | 'light' | 'high-contrast';
}

export interface ExpiryFormData {
  barcode: string;
  productName: string;
  mm: number;
  yyyy: number;
  quantity: number;
  location: string;
  observaciones: string;
  providerName: string;
  providerRut?: string;
  hasCanje: boolean;
  withdrawalDays: number;
}

export const ExpiryCaptureModalWithScanner: React.FC<ExpiryCaptureModalWithScannerProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<{barcode: string; name: string} | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<ExpiryFormData>({
    barcode: '',
    productName: '',
    mm: new Date().getMonth() + 1,
    yyyy: new Date().getFullYear(),
    quantity: 1,
    location: 'BOD-01',
    observaciones: '',
    providerName: '',
    hasCanje: false,
    withdrawalDays: 30
  });

  // Scanner
  const handleScan = useCallback(async (barcode: string) => {
    setIsScanning(true);
    setScanError(null);
    
    try {
      const product = await productRepository.getById(barcode);
      
      if (product) {
        setScannedProduct({ barcode: product.barcode, name: product.name });
        setFormData(prev => ({
          ...prev,
          barcode: product.barcode,
          productName: product.name,
          location: product.location || prev.location
        }));
        toast.success(`Producto: ${product.name}`);
        
        // Haptic feedback
        if (navigator.vibrate) navigator.vibrate(10);
      } else {
        setScannedProduct({ barcode, name: '' });
        setFormData(prev => ({ ...prev, barcode, productName: '' }));
        toast.info(`Código ${barcode} no encontrado. Complete manualmente.`);
      }
    } catch {
      setScanError('Error al buscar producto');
      toast.error('Error al buscar producto');
    } finally {
      setIsScanning(false);
    }
  }, []);

  useHIDScanner({
    onScan: handleScan,
    isEnabled: isOpen,
    maxLatency: 50
  });

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setFormData({
        barcode: '',
        productName: '',
        mm: new Date().getMonth() + 1,
        yyyy: new Date().getFullYear(),
        quantity: 1,
        location: 'BOD-01',
        observaciones: '',
        providerName: '',
        hasCanje: false,
        withdrawalDays: 30
      });
      setScannedProduct(null);
      setScanError(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.barcode || !formData.productName) {
      toast.error('Complete barcode y nombre del producto');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const months = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' }, { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' }, { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-lg mx-auto z-50 rounded-2xl overflow-hidden
              ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white border border-slate-200 shadow-2xl'}
            `}
          >
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Registrar Vencimiento
                  </h2>
                  <p className="text-xs text-slate-500">
                    Escanee o ingrese manualmente
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Scanner Status */}
            <div className={`px-6 py-3 ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'} border-b ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isScanning ? 'bg-blue-500/20' : scannedProduct ? 'bg-emerald-500/20' : 'bg-slate-700'
                }`}>
                  {isScanning ? (
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  ) : scannedProduct ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Scan className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {isScanning ? 'Buscando producto...' : 
                     scannedProduct ? scannedProduct.name || scannedProduct.barcode : 
                     'Esperando escaneo...'}
                  </p>
                  {scannedProduct?.barcode && (
                    <p className="text-xs text-slate-500 font-mono">{scannedProduct.barcode}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Barcode + Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Barcode
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                      className={`w-full h-11 pl-10 pr-4 rounded-xl border text-sm font-mono
                        ${isDark 
                          ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        } outline-none transition-colors`}
                      placeholder="7701234567890"
                    />
                  </div>
                </div>
                
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Producto
                  </label>
                  <input
                    type="text"
                    value={formData.productName}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value.toUpperCase() }))}
                    className={`w-full h-11 px-4 rounded-xl border text-sm font-medium
                      ${isDark 
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      } outline-none transition-colors`}
                    placeholder="NOMBRE DEL PRODUCTO"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Mes
                  </label>
                  <select
                    value={formData.mm}
                    onChange={(e) => setFormData(prev => ({ ...prev, mm: Number(e.target.value) }))}
                    className={`w-full h-11 px-4 rounded-xl border text-sm
                      ${isDark 
                        ? 'bg-slate-800 border-slate-700 text-white' 
                        : 'bg-white border-slate-300 text-slate-900'
                      } outline-none focus:border-blue-500 transition-colors`}
                  >
                    {months.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Año
                  </label>
                  <input
                    type="number"
                    value={formData.yyyy}
                    onChange={(e) => setFormData(prev => ({ ...prev, yyyy: Number(e.target.value) }))}
                    min={2020}
                    max={2100}
                    className={`w-full h-11 px-4 rounded-xl border text-sm font-mono
                      ${isDark 
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      } outline-none transition-colors`}
                  />
                </div>
              </div>

              {/* Quantity + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: Math.max(1, Number(e.target.value)) }))}
                    min={1}
                    className={`w-full h-11 px-4 rounded-xl border text-sm font-mono
                      ${isDark 
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      } outline-none transition-colors`}
                  />
                </div>
                
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Ubicación
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value.toUpperCase() }))}
                      className={`w-full h-11 pl-10 pr-4 rounded-xl border text-sm font-medium
                        ${isDark 
                          ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                          : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                        } outline-none transition-colors`}
                      placeholder="BOD-01"
                    />
                  </div>
                </div>
              </div>

              {/* Provider */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Proveedor
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={formData.providerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, providerName: e.target.value.toUpperCase() }))}
                    className={`w-full h-11 pl-10 pr-4 rounded-xl border text-sm font-medium
                      ${isDark 
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      } outline-none transition-colors`}
                    placeholder="NOMBRE DEL PROVEEDOR"
                  />
                </div>
              </div>

              {/* Canje + Days */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="hasCanje"
                    checked={formData.hasCanje}
                    onChange={(e) => setFormData(prev => ({ ...prev, hasCanje: e.target.checked }))}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="hasCanje" className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Permite Cambio/Devolución
                  </label>
                </div>
                
                <div>
                  <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Días para Retirar
                  </label>
                  <input
                    type="number"
                    value={formData.withdrawalDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, withdrawalDays: Math.max(0, Number(e.target.value)) }))}
                    min={0}
                    className={`w-full h-11 px-4 rounded-xl border text-sm font-mono
                      ${isDark 
                        ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                        : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                      } outline-none transition-colors`}
                  />
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Observaciones
                </label>
                <textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                  rows={2}
                  className={`w-full px-4 py-3 rounded-xl border text-sm resize-none
                    ${isDark 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' 
                      : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                    } outline-none transition-colors`}
                  placeholder="Observaciones adicionales..."
                />
              </div>
            </form>

            {/* Footer */}
            <div className={`px-6 py-4 flex items-center justify-end gap-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !formData.barcode || !formData.productName}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Registrar
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
