
import React, { useState } from 'react';
import { Camera, DownloadCloud, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { CountingSession, ExpectedItem } from '../types';
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
  const [cloudItems, setCloudItems] = useState<ExpectedItem[] | null>(null);

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
        setError("Ingrese la Orden ERP");
        return;
    }
    
    setIsCloudLoading(true);
    setError("");
    
    try {
        const items = await sessionService.fetchExpectedItemsFromCloud(erpOrder);
        if (items.length === 0) {
            setError("No hay items en Cloud.");
            setCloudItems(null);
            SoundFX.play('error');
        } else {
            setCloudItems(items);
            SoundFX.play('success');
        }
    } catch (err: any) {
        setError("Error Cloud.");
        setCloudItems(null);
    } finally {
        setIsCloudLoading(false);
    }
  };

  const handleStart = async () => {
    if (!erpOrder.trim() || !labelId.trim()) { 
        setError('Campos requeridos'); 
        return; 
    }
    
    try {
        const session = await sessionService.createSession(
            erpOrder, 
            labelId, 
            'standard', 
            cloudItems || undefined
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
            className="md:max-w-md border-t-8 border-black max-h-[98dvh]"
            showCloseButton={true}
        >
            {/* Cuerpo ultra-compacto (Sin título principal) */}
            <div className="px-4 pt-4 pb-2 space-y-3">
                {error && (
                    <div className="bg-rose-50 text-rose-600 p-2 rounded-xl text-[9px] font-black animate-in shake border border-rose-100 text-center flex items-center gap-2 justify-center">
                        <AlertCircle className="w-3 h-3" />
                        {error}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Bulto / Etiqueta</label>
                    <div className="flex gap-2">
                        <div 
                            onClick={() => setActiveKeypadField('label')} 
                            className={`flex-1 h-12 rounded-xl flex items-center justify-center font-black text-lg border-4 transition-all duration-200 ${activeKeypadField === 'label' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                        >
                            {labelId || "---"}
                        </div>
                        <button onClick={() => setIsCameraOpen(true)} className="h-12 w-12 bg-black text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform shadow-lg"><Camera className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Orden ERP</label>
                    <div className="flex gap-2">
                        <div 
                            onClick={() => setActiveKeypadField('erp')} 
                            className={`flex-1 h-12 rounded-xl flex items-center justify-center font-black text-lg border-4 transition-all duration-200 ${activeKeypadField === 'erp' ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                        >
                            {erpOrder || "---"}
                        </div>
                        <button 
                            onClick={handleFetchFromCloud}
                            disabled={isCloudLoading || !erpOrder}
                            className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${cloudItems ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white disabled:opacity-30'}`}
                        >
                            {isCloudLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (cloudItems ? <CheckCircle2 className="w-4 h-4" /> : <DownloadCloud className="w-4 h-4" />)}
                        </button>
                    </div>
                    {cloudItems && (
                        <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest text-center animate-in fade-in">
                            ✓ {cloudItems.length} SKUs cargados
                        </p>
                    )}
                </div>

                {/* Teclado numérico integrado más pequeño */}
                <div className="md:hidden">
                    <NumericKeypad 
                        isOpen={true} 
                        embedded={true} 
                        onInput={(c) => { 
                            if (activeKeypadField === 'erp') setErpOrder(p => p + c); 
                            else setLabelId(p => p + c); 
                            setError('');
                            if (activeKeypadField === 'erp') setCloudItems(null);
                        }} 
                        onDelete={() => { 
                            if (activeKeypadField === 'erp') {
                                setErpOrder(p => p.slice(0, -1)); 
                                setCloudItems(null);
                            }
                            else setLabelId(p => p.slice(0, -1)); 
                        }} 
                    />
                </div>
            </div>

            {/* Footer con altura mínima */}
            <div className="px-4 pt-1 pb-safe-area-inset-bottom">
                <button 
                    onClick={handleStart} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl shadow-xl active:scale-95 uppercase tracking-[0.15em] transition-all text-xs"
                >
                    {cloudItems ? 'Iniciar Verificado' : 'Iniciar a Ciegas'}
                </button>
            </div>
        </Modal>

        {isCameraOpen && <CameraScanner isTriggered={true} onScan={(code) => { setLabelId(sanitizeBarcode(code)); setIsCameraOpen(false); setActiveKeypadField('erp'); }} onClose={() => setIsCameraOpen(false)} />}
    </>
  );
};
