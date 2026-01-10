
import React, { useState } from 'react';
import { X, Camera, Loader2, ScanBarcode, Zap } from 'lucide-react';
import { CountingSession } from '../types';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { NumericKeypad } from './NumericKeypad';
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
  const [activeKeypadField, setActiveKeypadField] = useState<'label' | 'erp'>('label');
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  if (!isOpen) return null;

  const handleStart = async () => {
    if (!erpOrder.trim() || !labelId.trim()) { 
        setError('Complete ambos campos'); 
        return; 
    }
    
    try {
        // Inicio directo y local (Rendimiento inmediato)
        const session = await sessionService.createSession(erpOrder, labelId);
        onSessionStart(session);
        onClose();
    } catch (err) {
        setError("Error al crear sesión local");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose} />
        <div className="relative w-full bg-white rounded-t-[3rem] md:rounded-[3rem] animate-in slide-in-from-bottom-8 duration-300 md:max-w-md overflow-hidden border-t-8 border-black">
            
            <div className="p-8 pb-4">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Nueva Carga</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Conteo Físico Local</p>
            </div>
            
            <div className="px-8 py-4 space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">ID Bulto</label>
                    <div className="flex gap-2">
                        <div onClick={() => setActiveKeypadField('label')} className={`flex-1 h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-4 ${activeKeypadField === 'label' ? 'bg-blue-50 border-blue-600 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-900'}`}>
                            {labelId || "---"}
                        </div>
                        <button onClick={() => setIsCameraOpen(true)} className="h-16 w-16 bg-black text-white rounded-2xl flex items-center justify-center active:scale-90"><Camera className="w-6 h-6" /></button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Orden ERP</label>
                    <div onClick={() => setActiveKeypadField('erp')} className={`w-full h-16 rounded-2xl flex items-center justify-center font-black text-2xl border-4 ${activeKeypadField === 'erp' ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-900'}`}>
                        {erpOrder || "---"}
                    </div>
                </div>

                <div className="md:hidden">
                    <NumericKeypad isOpen={true} embedded={true} onInput={(c) => { if (activeKeypadField === 'erp') setErpOrder(p => p + c); else setLabelId(p => p + c); }} onDelete={() => { if (activeKeypadField === 'erp') setErpOrder(p => p.slice(0, -1)); else setLabelId(p => p.slice(0, -1)); }} />
                </div>
            </div>

            <div className="p-6">
                <button 
                    onClick={handleStart} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-16 rounded-2xl shadow-xl active:scale-95 uppercase tracking-widest"
                >
                    Abrir Bulto
                </button>
            </div>
        </div>

        {isCameraOpen && <CameraScanner onScan={(code) => { setLabelId(sanitizeBarcode(code)); setIsCameraOpen(false); setActiveKeypadField('erp'); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};
