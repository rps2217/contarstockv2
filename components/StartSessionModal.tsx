
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
            className="md:max-w-md border-t-4 border-blue-600 bg-slate-950 text-white"
            showCloseButton={true}
        >
            <div className="px-6 pt-4 pb-2 space-y-4">
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Configurar Bulto</h2>

                {error && (
                    <div className="bg-rose-900/30 text-rose-400 p-3 rounded-2xl text-[10px] font-black border border-rose-500/30 flex items-center gap-3 animate-in shake">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">ID Bulto</label>
                        <button 
                            onClick={() => setActiveKeypadField('label')} 
                            className={`w-full h-14 rounded-2xl flex items-center justify-center font-mono font-black text-lg border-2 transition-all ${activeKeypadField === 'label' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-900 border-white/5 text-slate-400'}`}
                        >
                            {labelId || "---"}
                        </button>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Orden ERP</label>
                        <button 
                            onClick={() => setActiveKeypadField('erp')} 
                            className={`w-full h-14 rounded-2xl flex items-center justify-center font-mono font-black text-lg border-2 transition-all ${activeKeypadField === 'erp' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-slate-900 border-white/5 text-slate-400'}`}
                        >
                            {erpOrder || "---"}
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setIsCameraOpen(true)} className="flex-1 h-12 bg-white/5 border border-white/10 text-white rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest active:bg-blue-600 transition-colors">
                        <Camera className="w-4 h-4" /> Escanear ID
                    </button>
                    <button 
                        onClick={handleFetchFromCloud}
                        disabled={isCloudLoading || !erpOrder}
                        className={`flex-1 h-12 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all ${cloudItems ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 disabled:opacity-20'}`}
                    >
                        {isCloudLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (cloudItems ? <CheckCircle2 className="w-4 h-4" /> : <DownloadCloud className="w-4 h-4" />)}
                        {cloudItems ? 'Items OK' : 'Cargar ERP'}
                    </button>
                </div>

                <div className="md:hidden">
                    <NumericKeypad 
                        isOpen={true} 
                        embedded={true} 
                        onInput={(c) => { 
                            if (activeKeypadField === 'erp') { setErpOrder(p => p + c); setCloudItems(null); } 
                            else setLabelId(p => p + c); 
                            setError('');
                        }} 
                        onDelete={() => { 
                            if (activeKeypadField === 'erp') { setErpOrder(p => p.slice(0, -1)); setCloudItems(null); }
                            else setLabelId(p => p.slice(0, -1)); 
                        }} 
                        onConfirm={handleStart}
                    />
                </div>
            </div>

            <div className="p-6 pb-10">
                <button 
                    onClick={handleStart} 
                    className="w-full bg-blue-600 text-white font-black h-16 rounded-3xl shadow-2xl active:scale-95 uppercase tracking-[0.3em] text-xs transition-all border-b-8 border-blue-900"
                >
                    {cloudItems ? 'Iniciar Verificado' : 'Iniciar a Ciegas'}
                </button>
            </div>
        </Modal>

        {isCameraOpen && <CameraScanner isTriggered={true} onScan={(code) => { setLabelId(sanitizeBarcode(code)); setIsCameraOpen(false); setActiveKeypadField('erp'); }} onClose={() => setIsCameraOpen(false)} />}
    </>
  );
};
