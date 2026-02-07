
import React, { useState, useEffect, useCallback } from 'react';
import { DownloadCloud, Loader2, AlertCircle, FileSearch, Sparkles, Database, Ghost, Camera, X, Box } from 'lucide-react';
import { CountingSession, ExpectedOrder } from '../types';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { NumericKeypad } from './NumericKeypad';
import { SoundFX } from '../services/audio';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { Modal } from './common/Modal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { CameraScanner } from './CameraScanner';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionStart: (session: CountingSession) => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ isOpen, onClose, onSessionStart }) => {
  const [erpOrder, setErpOrder] = useState('');
  const [labelId, setLabelId] = useState('');
  const [error, setError] = useState('');
  const [activeField, setActiveField] = useState<'label' | 'erp'>('label');
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudOrder, setCloudOrder] = useState<ExpectedOrder | null>(null);

  const ordersInLocalCount = useLiveQuery(() => db.expectedOrders.count(), [], 0);

  // Scanner de hardware integrado
  useHIDScanner({
      isEnabled: isOpen && !isCameraOpen,
      onScan: (raw) => {
          const cleanCode = sanitizeBarcode(raw);
          if (activeField === 'label') {
              setLabelId(cleanCode);
              setActiveField('erp'); 
              SoundFX.play('success');
          } else {
              setErpOrder(cleanCode);
              SoundFX.play('success');
          }
      }
  });

  const handleCameraScan = useCallback((code: string) => {
      const clean = sanitizeBarcode(code);
      if (clean) {
          if (activeField === 'label') {
              setLabelId(clean);
              setActiveField('erp');
          } else {
              setErpOrder(clean);
          }
          setIsCameraOpen(false);
          SoundFX.play('success');
      }
  }, [activeField]);

  const handleFetchFromCloud = async () => {
    if (!erpOrder.trim()) return;
    setIsCloudLoading(true);
    setError("");
    try {
        const order = await sessionService.fetchExpectedItemsFromCloud(erpOrder);
        if (!order || order.items.length === 0) {
            setError("Documento no encontrado en nube");
            setCloudOrder(null);
            SoundFX.play('error');
        } else {
            setCloudOrder(order);
            SoundFX.play('success');
        }
    } catch (err: any) {
        setError("Error de red: " + err.message);
        setCloudOrder(null);
    } finally {
        setIsCloudLoading(false);
    }
  };

  const handleStart = async (mode: 'manual' | 'detective') => {
    if (!labelId.trim()) { 
        setError('Ingrese ID de Bulto'); 
        return; 
    }
    if (mode === 'manual' && !erpOrder.trim()) {
        setError('Ingrese ERP para modo manual');
        return;
    }

    try {
        const erpLabel = mode === 'detective' 
            ? (ordersInLocalCount > 0 ? 'BUSCANDO_ERP...' : 'CONTEO_CIEGO')
            : erpOrder;

        const session = await sessionService.createSession(
            erpLabel, 
            labelId, 
            'standard', 
            cloudOrder || undefined
        );
        onSessionStart(session);
        onClose();
    } catch (err) {
        setError("Error de base de datos local");
    }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        variant="bottom-sheet"
        className="md:max-w-md bg-slate-950 text-white"
        showCloseButton={true}
    >
        <div className="px-6 pt-10 pb-4 space-y-6">
            
            {error && (
                <div className="bg-rose-900/40 text-rose-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-3 animate-in shake">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                </div>
            )}

            {/* INPUT BULTO */}
            <div className="space-y-2">
                <div className="flex justify-between items-end px-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Identificador de Bulto</span>
                    {labelId && <span className="text-[9px] font-black text-emerald-500 uppercase">✓ Capturado</span>}
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveField('label')} 
                        className={`flex-1 h-20 rounded-3xl flex items-center justify-center font-mono font-black text-2xl border-4 transition-all duration-300 ${activeField === 'label' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_25px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                    >
                        <span className={`tracking-[0.1em] px-4 truncate ${!labelId ? 'opacity-20 italic text-lg' : ''}`}>
                            {labelId || "ID_Bulto_SSCC"}
                        </span>
                    </button>
                    <button 
                        onClick={() => { setActiveField('label'); setIsCameraOpen(true); }}
                        className="w-20 h-20 bg-blue-500/10 border-4 border-blue-500/30 rounded-3xl flex items-center justify-center text-blue-400 active:bg-blue-600 active:text-white transition-all shadow-lg"
                    >
                        <Camera className="w-8 h-8" />
                    </button>
                </div>
            </div>

            {/* INPUT ERP / DOCUMENTO */}
            <div className="space-y-2">
                <div className="flex justify-between items-end px-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Orden de Compra / ERP</span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveField('erp')} 
                        className={`flex-1 h-20 rounded-3xl flex items-center justify-center font-mono font-black text-2xl border-4 transition-all duration-300 ${activeField === 'erp' ? 'bg-slate-800 border-blue-400 text-white shadow-[0_0_25px_rgba(59,130,246,0.1)]' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                    >
                        <span className={`tracking-[0.1em] px-4 truncate ${!erpOrder ? 'opacity-20 italic text-lg' : ''}`}>
                            {erpOrder || "Escanear_ERP"}
                        </span>
                    </button>
                    <button 
                        onClick={() => { setActiveField('erp'); setIsCameraOpen(true); }}
                        className="w-20 h-20 bg-amber-500/10 border-4 border-amber-500/30 rounded-3xl flex items-center justify-center text-amber-500 active:bg-amber-500 active:text-black transition-all shadow-lg"
                    >
                        <FileSearch className="w-8 h-8" />
                    </button>
                </div>
            </div>

            {erpOrder && !cloudOrder && (
                <button 
                    onClick={handleFetchFromCloud}
                    disabled={isCloudLoading}
                    className="w-full h-12 bg-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-3 text-emerald-400 active:scale-[0.98] transition-all"
                >
                    {isCloudLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">Validar ERP en Nube</span>
                </button>
            )}

            {cloudOrder && (
                <div className="bg-emerald-500/10 border-2 border-emerald-500/30 p-4 rounded-2xl flex items-center gap-4 animate-in zoom-in-95">
                    <div className="bg-emerald-500 p-2 rounded-lg text-black"><Sparkles className="w-4 h-4" /></div>
                    <div>
                        <div className="text-[10px] font-black uppercase text-emerald-400">Verificación Cloud OK</div>
                        <div className="text-xs font-bold text-white">{cloudOrder.items.length} ítems cargados</div>
                    </div>
                </div>
            )}

            <div className="md:hidden">
                <NumericKeypad 
                    isOpen={true} 
                    embedded={true} 
                    onInput={(c) => { 
                        if (activeField === 'erp') { setErpOrder(p => p + c); setCloudOrder(null); } 
                        else setLabelId(p => p + c); 
                        setError('');
                    }} 
                    onDelete={() => { 
                        if (activeField === 'erp') { setErpOrder(p => p.slice(0, -1)); setCloudOrder(null); }
                        else setLabelId(p => p.slice(0, -1)); 
                    }} 
                />
            </div>
        </div>

        <div className="p-6 pb-12">
            <button 
                onClick={() => handleStart(erpOrder ? 'manual' : 'detective')} 
                className={`w-full font-black h-20 rounded-[2.5rem] shadow-2xl active:scale-95 uppercase tracking-[0.3em] text-sm transition-all border-b-8 flex items-center justify-center gap-3 ${erpOrder ? 'bg-blue-600 text-white border-blue-900' : 'bg-orange-600 text-white border-orange-900'}`}
            >
                {cloudOrder ? 'INICIAR VERIFICADO' : (erpOrder ? 'INICIAR MANUAL' : 'PISTEAR SIN GUÍA')}
            </button>
        </div>

        {/* MODAL DE CÁMARA */}
        {isCameraOpen && (
            <div className="fixed inset-0 z-[500]">
                <CameraScanner 
                    onScan={handleCameraScan} 
                    onClose={() => setIsCameraOpen(false)} 
                    isTriggered={true} 
                />
            </div>
        )}
    </Modal>
  );
};
