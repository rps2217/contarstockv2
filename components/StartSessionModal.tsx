
import React, { useState } from 'react';
import { DownloadCloud, Loader2, CheckCircle2, AlertCircle, FileSearch } from 'lucide-react';
import { CountingSession, ExpectedOrder } from '../types';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { NumericKeypad } from './NumericKeypad';
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
  
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudOrder, setCloudOrder] = useState<ExpectedOrder | null>(null);

  useHIDScanner({
      isEnabled: isOpen,
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
    if (!erpOrder.trim()) return;
    setIsCloudLoading(true);
    setError("");
    try {
        const order = await sessionService.fetchExpectedItemsFromCloud(erpOrder);
        if (!order || order.items.length === 0) {
            setError("Documento no encontrado");
            setCloudOrder(null);
            SoundFX.play('error');
        } else {
            setCloudOrder(order);
            SoundFX.play('success');
        }
    } catch (err: any) {
        setError("Fallo de conexión cloud");
        setCloudOrder(null);
    } finally {
        setIsCloudLoading(false);
    }
  };

  const handleStart = async () => {
    if (!erpOrder.trim() || !labelId.trim()) { 
        setError('Ingrese Bulto y ERP'); 
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
        <div className="px-6 pt-10 pb-2 space-y-4">
            
            {error && (
                <div className="bg-rose-900/40 text-rose-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-3 animate-in shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* INPUT BULTO / SSCC - PLACEHOLDER INTERNO */}
            <button 
                onClick={() => setActiveKeypadField('label')} 
                className={`w-full h-20 rounded-2xl flex items-center justify-center font-mono font-black text-2xl border-4 transition-all duration-300 ${activeKeypadField === 'label' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-white/5 text-slate-500'}`}
            >
                <span className={`tracking-[0.1em] px-4 truncate ${!labelId ? 'opacity-30 text-lg italic' : ''}`}>
                    {labelId || "IDENTIFICADOR_BULTO_SSCC"}
                </span>
            </button>

            {/* FILA ERP + VALIDAR - PLACEHOLDER INTERNO */}
            <div className="flex gap-2">
                <button 
                    onClick={() => setActiveKeypadField('erp')} 
                    className={`flex-[2.5] h-16 rounded-2xl flex items-center justify-center font-mono font-black text-lg border-4 transition-all ${activeKeypadField === 'erp' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                >
                    <span className={!erpOrder ? 'opacity-30 text-sm italic' : ''}>
                        {erpOrder || "ORDEN_ERP"}
                    </span>
                </button>
                
                <button 
                    onClick={handleFetchFromCloud}
                    disabled={isCloudLoading || !erpOrder}
                    className={`flex-1 h-16 rounded-2xl flex flex-col items-center justify-center font-black text-[10px] uppercase tracking-tighter transition-all border-4 ${cloudOrder ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 disabled:opacity-10'}`}
                >
                    {isCloudLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            {cloudOrder ? <CheckCircle2 className="w-5 h-5 mb-1" /> : <DownloadCloud className="w-5 h-5 mb-1" />}
                            <span>{cloudOrder ? 'ITEMS_OK' : 'CARGAR'}</span>
                        </>
                    )}
                </button>
            </div>

            <div className="md:hidden pt-4">
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
                className="w-full bg-blue-600 text-white font-black h-16 rounded-[2rem] shadow-2xl active:scale-95 uppercase tracking-[0.2em] text-xs transition-all border-b-8 border-blue-900 flex items-center justify-center gap-3"
            >
                <FileSearch className="w-5 h-5" />
                {cloudOrder ? 'INICIAR_VERIFICADO' : 'INICIAR_A_CIEGAS'}
            </button>
        </div>
    </Modal>
  );
};
