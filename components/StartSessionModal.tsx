
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
        setError("Ingrese ERP");
        return;
    }
    
    setIsCloudLoading(true);
    setError("");
    
    try {
        const items = await sessionService.fetchExpectedItemsFromCloud(erpOrder);
        if (items.length === 0) {
            setError("Sin items.");
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
        setError('Complete campos'); 
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
            className="md:max-w-md border-t-4 border-blue-600 max-h-[98dvh]"
            showCloseButton={true}
        >
            <div className="px-3 pt-2 pb-1 space-y-1.5">
                {error && (
                    <div className="bg-rose-50 text-rose-600 p-1 rounded-lg text-[9px] font-black border border-rose-100 text-center flex items-center gap-2 justify-center">
                        <AlertCircle className="w-3 h-3" />
                        {error}
                    </div>
                )}

                {/* ID Bulto Row */}
                <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-0.5">
                        <label className="text-[7px] font-black text-slate-400 uppercase ml-1">ID Bulto</label>
                        <div 
                            onClick={() => setActiveKeypadField('label')} 
                            className={`h-10 rounded-lg flex items-center justify-center font-black text-base border-2 transition-all duration-200 ${activeKeypadField === 'label' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        >
                            {labelId || "---"}
                        </div>
                    </div>
                    <button onClick={() => setIsCameraOpen(true)} className="h-10 w-10 bg-black text-white rounded-lg flex items-center justify-center active:scale-90 transition-transform"><Camera className="w-4 h-4" /></button>
                </div>

                {/* ERP Row */}
                <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-0.5">
                        <label className="text-[7px] font-black text-slate-400 uppercase ml-1">Orden ERP</label>
                        <div 
                            onClick={() => setActiveKeypadField('erp')} 
                            className={`h-10 rounded-lg flex items-center justify-center font-black text-base border-2 transition-all duration-200 ${activeKeypadField === 'erp' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                        >
                            {erpOrder || "---"}
                        </div>
                    </div>
                    <button 
                        onClick={handleFetchFromCloud}
                        disabled={isCloudLoading || !erpOrder}
                        className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${cloudItems ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white disabled:opacity-20'}`}
                    >
                        {isCloudLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (cloudItems ? <CheckCircle2 className="w-4 h-4" /> : <DownloadCloud className="w-4 h-4" />)}
                    </button>
                </div>

                {cloudItems && (
                    <p className="text-[7px] font-black text-emerald-600 uppercase text-center mt-0 animate-in fade-in">
                        ✓ {cloudItems.length} SKUs cargados
                    </p>
                )}

                {/* Teclado numérico ultra-compacto */}
                <div className="md:hidden pt-0.5">
                    <NumericKeypad 
                        isOpen={true} 
                        embedded={true} 
                        onInput={(c) => { 
                            if (activeKeypadField === 'erp') {
                                setErpOrder(p => p + c); 
                                setCloudItems(null);
                            } else setLabelId(p => p + c); 
                            setError('');
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

            {/* Footer con padding extra para evitar que el dock lo alcance si hubiera algún remanente */}
            <div className="px-3 pb-6 pt-1">
                <button 
                    onClick={handleStart} 
                    className="w-full bg-blue-600 text-white font-black h-12 rounded-xl shadow-lg active:scale-95 uppercase tracking-widest text-[10px] transition-all"
                >
                    {cloudItems ? 'Iniciar Verificado' : 'Iniciar a Ciegas'}
                </button>
            </div>
        </Modal>

        {isCameraOpen && <CameraScanner isTriggered={true} onScan={(code) => { setLabelId(sanitizeBarcode(code)); setIsCameraOpen(false); setActiveKeypadField('erp'); }} onClose={() => setIsCameraOpen(false)} />}
    </>
  );
};
