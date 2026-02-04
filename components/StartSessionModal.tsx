
import React, { useState } from 'react';
import { Camera, DownloadCloud, Loader2, CheckCircle2, AlertCircle, Box, FileSearch } from 'lucide-react';
import { CountingSession, ExpectedItem, ExpectedOrder } from '../types';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { SoundFX } from '../services/audio';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { Modal } from './common/Modal';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionStart: (session: CountingSession) => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ isOpen, onClose, onSessionStart }) => {
  const [erpOrder, setErpOrder] = useState('');
  const [labelId, setLabelId] = useState('');
  const [error, setError] = useState('');
  const [activeKeypadField, setActiveKeypadField] = useState<'label' | 'erp'>('label');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudOrder, setCloudOrder] = useState<ExpectedOrder | null>(null);

  useHIDScanner({
      isEnabled: isOpen && !isCameraOpen,
      onScan: (raw) => {
          const cleanCode = sanitizeBarcode(raw);
          if (activeKeypadField === 'label') {
              setLabelId(cleanCode);
              setActiveKeypadField('erp'); 
              SoundFX.play('success');
          } else {
              setErpOrder(cleanCode);
              SoundFX.play('success');
          }
      }
  });

  const handleFetchFromCloud = async () => {
    if (!erpOrder.trim()) {
        setError("Ingrese ERP");
        return;
    }
    setIsCloudLoading(true);
    setError("");
    try {
        const order = await sessionService.fetchExpectedItemsFromCloud(erpOrder);
        if (!order || order.items.length === 0) {
            setError("Sin items.");
            setCloudOrder(null);
            SoundFX.play('error');
        } else {
            setCloudOrder(order);
            SoundFX.play('success');
        }
    } catch (err: any) {
        setError("Error Cloud.");
        setCloudOrder(null);
    } finally {
        setIsCloudLoading(false);
    }
  };

  const handleStart = async () => {
    if (!erpOrder.trim() || !labelId.trim()) { 
        setError('Complete campos'); 
        return; 
    }
    try {
        const session = await sessionService.createSession(
            erpOrder, 
            labelId, 
            'standard', 
            cloudOrder || undefined
        );
        onSessionStart(session);
        onClose();
    } catch (err) {
        setError("Error local");
    }
  };

  return (
    <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            variant="bottom-sheet"
            className="md:max-w-md border-t-4 border-blue-600 bg-slate-950 text-white"
            showCloseButton={true}
        >
            <div className="px-6 pt-6 pb-2 space-y-5">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600/20 p-2 rounded-xl">
                        <Box className="w-5 h-5 text-blue-500" />
                    </div>
                    <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Configurar Bulto</h2>
                </div>

                {error && (
                    <div className="bg-rose-900/30 text-rose-400 p-3 rounded-2xl text-[10px] font-black border border-rose-500/30 flex items-center gap-3 animate-in shake">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                {/* CAMPO ID BULTO - ANCHO COMPLETO PARA CÓDIGOS LARGOS */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Identificador de Bulto / SSCC</label>
                    <div className="relative group">
                        <button 
                            onClick={() => setActiveKeypadField('label')} 
                            className={`w-full h-20 rounded-3xl flex items-center justify-center font-mono font-black text-2xl border-4 transition-all duration-300 overflow-hidden ${activeKeypadField === 'label' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_30px_rgba(59,130,246,0.4)]' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                        >
                            <span className="tracking-[0.1em] px-4 truncate">
                                {labelId || "ESCANEE_O_DIGITE"}
                            </span>
                        </button>
                        <button 
                            onClick={() => setIsCameraOpen(true)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-2xl flex items-center justify-center transition-colors border border-white/10"
                        >
                            <Camera className="w-5 h-5 text-white/60" />
                        </button>
                    </div>
                </div>

                {/* FILA COMPARTIDA: ORDEN ERP + CARGAR CLOUD */}
                <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Documento de Referencia</label>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setActiveKeypadField('erp')} 
                            className={`flex-[2] h-16 rounded-2xl flex items-center justify-center font-mono font-black text-lg border-2 transition-all ${activeKeypadField === 'erp' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-white/5 text-slate-400'}`}
                        >
                            {erpOrder || "ORDEN_ERP"}
                        </button>
                        
                        <button 
                            onClick={handleFetchFromCloud}
                            disabled={isCloudLoading || !erpOrder}
                            className={`flex-1 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-black text-[9px] uppercase tracking-tighter transition-all border-2 ${cloudOrder ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 disabled:opacity-20'}`}
                        >
                            {isCloudLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {cloudOrder ? <CheckCircle2 className="w-5 h-5" /> : <DownloadCloud className="w-5 h-5" />}
                                    <span>{cloudOrder ? 'Items OK' : 'Validar'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="md:hidden pt-2">
                    <NumericKeypad 
                        isOpen={true} 
                        embedded={true} 
                        onInput={(c) => { 
                            if (activeKeypadField === 'erp') { setErpOrder(p => p + c); setCloudOrder(null); } 
                            else setLabelId(p => p + c); 
                            setError('');
                        }} 
                        onDelete={() => { 
                            if (activeKeypadField === 'erp') { setErpOrder(p => p.slice(0, -1)); setCloudOrder(null); }
                            else setLabelId(p => p.slice(0, -1)); 
                        }} 
                        onConfirm={handleStart}
                    />
                </div>
            </div>

            <div className="p-6 pb-12">
                <button 
                    onClick={handleStart} 
                    className="w-full bg-blue-600 text-white font-black h-16 rounded-[2rem] shadow-2xl active:scale-95 uppercase tracking-[0.3em] text-xs transition-all border-b-8 border-blue-900 flex items-center justify-center gap-3"
                >
                    <FileSearch className="w-5 h-5" />
                    {cloudOrder ? 'Iniciar Verificado' : 'Iniciar a Ciegas'}
                </button>
            </div>
        </Modal>

        {isCameraOpen && <CameraScanner isTriggered={true} onScan={(code) => { setLabelId(sanitizeBarcode(code)); setIsCameraOpen(false); setActiveKeypadField('erp'); }} onClose={() => setIsCameraOpen(false)} />}
    </>
  );
};
