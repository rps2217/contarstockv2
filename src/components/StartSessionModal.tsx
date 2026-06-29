import React, { useState, useCallback, useEffect } from 'react';
import { DownloadCloud, Loader2, AlertCircle, FileSearch, Database, Box, ArrowRight, Lock, Unlock } from 'lucide-react';
import { CountingSession, ExpectedOrder } from '../types';
import * as sessionService from '../services/sessionService';
import { SoundFX } from '../services/audio';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { Modal } from '../shared/components/ui/Modal';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionStart: (session: CountingSession) => void;
}

type Step = 'enter_erp' | 'confirm';

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ isOpen, onClose, onSessionStart }) => {
  const [step, setStep] = useState<Step>('enter_erp');
  const [erpOrder, setErpOrder] = useState('');
  const [isAutoLockEnabled, setIsAutoLockEnabled] = useState(true);
  const [error, setError] = useState('');
  
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudOrder, setCloudOrder] = useState<ExpectedOrder | null>(null);
  const [localSavedOrders, setLocalSavedOrders] = useState<ExpectedOrder[]>([]);

  const loadSavedOrders = useCallback(() => {
    ExpectedOrderRepository.getAll().then((list) => {
      setLocalSavedOrders(list || []);
    });
  }, []);

  useEffect(() => {
    if (isOpen && step === 'enter_erp') {
      loadSavedOrders();
    }
  }, [step, isOpen, loadSavedOrders]);

  useHIDScanner({
    isEnabled: isOpen && step === 'enter_erp',
    onScan: (raw) => {
      const cleanCode = raw.trim().toUpperCase();
      setErpOrder(cleanCode);
      SoundFX.play('success');
    }
  });

  const handleFetchFromCloud = async () => {
    if (!erpOrder.trim()) return;
    setIsCloudLoading(true);
    setError("");
    try {
      const localOrder = await ExpectedOrderRepository.getById(String(erpOrder || '').toUpperCase());
      if (localOrder) {
        setCloudOrder(localOrder);
        SoundFX.play('success');
        setStep('confirm');
        return;
      }
      const order = await sessionService.fetchExpectedItemsFromCloud(erpOrder);
      if (!order || order.items.length === 0) {
        setError("Documento no encontrado en la nube");
        setCloudOrder(null);
        SoundFX.play('error');
      } else {
        setCloudOrder(order);
        SoundFX.play('success');
        setStep('confirm');
      }
    } catch (err: any) {
      setError("Error de red: " + err.message);
      setCloudOrder(null);
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleStart = async () => {
    if (!erpOrder.trim()) {
      setError('Ingresa el numero de orden');
      return;
    }
    try {
      const session = await sessionService.createSession(
        erpOrder,
        `CNT_${Date.now()}`,
        'standard',
        cloudOrder || undefined,
        undefined,
        isAutoLockEnabled
      );
      onSessionStart(session);
      onClose();
      setTimeout(() => {
        setStep('enter_erp');
        setErpOrder('');
        setCloudOrder(null);
        setError('');
      }, 500);
    } catch (err) {
      setError("Error de base de datos local");
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      variant="bottom-sheet"
      className="md:max-w-md bg-base text-white border-t-4 border-blue-600"
    >
      <div className="p-5 md:p-8 pb-10 md:pb-12">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileSearch className="w-8 h-8 text-blue-400" />
          </div>
          <h3 className="text-xl font-black uppercase italic tracking-tight text-white">Nueva Carga</h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Con Orden ERP</p>
        </div>

        {error && (
          <div className="bg-rose-900/40 text-rose-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {step === 'enter_erp' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
              <p className="text-[10px] text-muted font-bold uppercase">Ingresa el numero de orden</p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={erpOrder}
                onChange={(e) => { setErpOrder(e.target.value.toUpperCase()); setCloudOrder(null); setError(''); }}
                autoFocus
                placeholder="Numero de Orden / ERP"
                className="w-full h-16 bg-surface rounded-2xl px-5 font-mono font-black text-lg md:text-xl border-2 border-blue-500 text-white outline-none shadow-[0_0_20px_rgba(59,130,246,0.15)] focus:border-blue-400 transition-all text-center"
              />
            </div>

            <button
              disabled={!erpOrder.trim() || isCloudLoading}
              onClick={handleFetchFromCloud}
              className="w-full h-14 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98] transition-all"
            >
              {isCloudLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5" />}
              Validar y Continuar
            </button>

            {localSavedOrders.length > 0 && (
              <div className="space-y-2 pt-4 border-t border-white/10">
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-emerald-400" /> Cargas Teoricas Guardadas:
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {localSavedOrders.slice(0, 5).map((order) => {
                    const dispName = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id;
                    return (
                      <button
                        key={order.id}
                        type="button"
                        onClick={() => {
                          setErpOrder(order.id);
                          setCloudOrder(order);
                          SoundFX.play('success');
                          setStep('confirm');
                        }}
                        className="w-full text-left bg-surface/60 hover:bg-emerald-950/20 border border-white/5 hover:border-emerald-500/30 p-3 rounded-xl transition-all flex items-center justify-between text-xs font-mono font-bold active:scale-[0.98]"
                      >
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-white truncate">{dispName}</span>
                          <span className="text-[8px] text-slate-500 truncate">ID: {order.id}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="px-1.5 py-0.5 bg-blue-500/10 rounded text-[7px] font-black text-blue-400">{order.items?.length || 0} SKUs</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-600" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Box className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-[10px] text-muted font-bold uppercase">Resumen</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 space-y-3 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase">Orden ERP</span>
                <span className="text-sm font-mono font-bold text-white">{erpOrder}</span>
              </div>
              {cloudOrder && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-emerald-500 uppercase">SKUs en Lista</span>
                  <span className="text-sm font-bold text-emerald-400">{cloudOrder.items.length} productos</span>
                </div>
              )}
              
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => setIsAutoLockEnabled(!isAutoLockEnabled)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isAutoLockEnabled 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                      : 'bg-elevated/50 border-white/5 text-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isAutoLockEnabled ? 'bg-blue-500/20' : 'bg-slate-700/50'}`}>
                      {isAutoLockEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-black uppercase tracking-wider">Auto-Bloqueo</div>
                      <div className="text-[8px] font-bold opacity-60 uppercase">
                        {isAutoLockEnabled ? 'Activado' : 'Desactivado'}
                      </div>
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${isAutoLockEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isAutoLockEnabled ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </div>

            <button 
              onClick={handleStart}
              className="w-full h-16 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Comenzar Conteo
            </button>

            <button 
              onClick={() => setStep('enter_erp')}
              className="w-full h-10 text-slate-500 font-black uppercase text-[10px] tracking-widest"
            >
              Cambiar Orden
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
