import React, { useState } from 'react';
import { Camera } from 'lucide-react';
import { CountingSession } from '../types';
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

  const handleStart = async () => {
    if (!erpOrder.trim() || !labelId.trim()) { 
        setError('Complete ambos campos'); 
        return; 
    }
    
    try {
        const session = await sessionService.createSession(erpOrder, labelId);
        onSessionStart(session);
        onClose();
    } catch (err) {
        setError("Error al crear sesión local");
    }
  };

  return (
    <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            variant="bottom-sheet"
            className="md:max-w-md border-t-8 border-black"
            showCloseButton={false} // Custom header below
        >
            <div className="p-8 pb-4">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Nueva Carga</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Conteo Físico Local</p>
            </div>
            
            <div className="px-8 py-4 space-y-6">
                {error && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold animate-in shake border border-rose-100 text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ID Bulto (Etiqueta)</label>
                    <div className="flex gap-2">
                        <div 
                            onClick={() => setActiveKeypadField('label')} 
                            className={`flex-1 h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-4 transition-all duration-200 ${activeKeypadField === 'label' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                        >
                            {labelId || "---"}
                        </div>
                        <button onClick={() => setIsCameraOpen(true)} className="h-16 w-16 bg-black text-white rounded-2xl flex items-center justify-center active:scale-90 transition-transform shadow-lg"><Camera className="w-6 h-6" /></button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Orden ERP (OC/Traspaso)</label>
                    <div 
                        onClick={() => setActiveKeypadField('erp')} 
                        className={`w-full h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-4 transition-all duration-200 ${activeKeypadField === 'erp' ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-inner' : 'bg-slate-50 border-slate-100 text-slate-900'}`}
                    >
                        {erpOrder || "---"}
                    </div>
                </div>

                <div className="md:hidden">
                    <NumericKeypad 
                        isOpen={true} 
                        embedded={true} 
                        onInput={(c) => { 
                            if (activeKeypadField === 'erp') setErpOrder(p => p + c); 
                            else setLabelId(p => p + c); 
                            setError('');
                        }} 
                        onDelete={() => { 
                            if (activeKeypadField === 'erp') setErpOrder(p => p.slice(0, -1)); 
                            else setLabelId(p => p.slice(0, -1)); 
                        }} 
                    />
                </div>
            </div>

            <div className="p-6">
                <button 
                    onClick={handleStart} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-2xl shadow-xl active:scale-95 uppercase tracking-widest transition-all"
                >
                    Abrir Bulto
                </button>
            </div>
        </Modal>

        {isCameraOpen && <CameraScanner isTriggered={true} onScan={(code) => { setLabelId(sanitizeBarcode(code)); setIsCameraOpen(false); setActiveKeypadField('erp'); }} onClose={() => setIsCameraOpen(false)} />}
    </>
  );
};