
import React, { useState, useEffect } from 'react';
import { Calendar, X, Check, ChevronRight, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SoundFX } from '../../../services/audio';

interface ExpirationModalProps {
  productName: string;
  onComplete: (mm?: number, yyyy?: number, batch?: string) => void;
  onCancel?: () => void;
}

export const ExpirationModal: React.FC<ExpirationModalProps> = ({ productName, onComplete, onCancel }) => {
  const [step, setStep] = useState<'mm' | 'yyyy' | 'batch'>('mm');
  const [mm, setMm] = useState<string>('');
  const [yyyy, setYyyy] = useState<string>('');
  const [batch, setBatch] = useState<string>('');

  const handleMmInput = (val: string) => {
    if (val.length > 2) return;
    setMm(val);
    if (val.length === 2) {
      const month = parseInt(val);
      if (month >= 1 && month <= 12) {
        setStep('yyyy');
        SoundFX.play('success');
      } else {
        SoundFX.play('error');
        setMm('');
      }
    }
  };

  const handleYyyyInput = (val: string) => {
    if (val.length > 4) return;
    setYyyy(val);
    if (val.length === 4) {
      const year = parseInt(val);
      const currentYear = new Date().getFullYear();
      if (year >= currentYear - 1 && year <= currentYear + 20) {
        setStep('batch');
        SoundFX.play('success');
      } else {
        SoundFX.play('error');
        setYyyy('');
      }
    }
  };

  const handleFinish = () => {
    onComplete(parseInt(mm), parseInt(yyyy), batch || undefined);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* HEADER */}
        <div className="p-6 bg-slate-800/50 border-b border-white/5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-2xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">DATOS VENCIMIENTO</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[200px]">{productName}</p>
            </div>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          )}
        </div>

        {/* CONTENT */}
        <div className="p-8">
          <div className="flex justify-center gap-4 mb-8">
            <div className={`flex flex-col items-center gap-2 transition-opacity ${step === 'mm' ? 'opacity-100' : 'opacity-40'}`}>
              <span className="text-[10px] font-black text-slate-500 uppercase">MES</span>
              <div className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${step === 'mm' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-slate-600'}`}>
                {mm || '--'}
              </div>
            </div>
            <div className="flex items-center pt-6 text-slate-700">
              <span className="text-2xl font-black">/</span>
            </div>
            <div className={`flex flex-col items-center gap-2 transition-opacity ${step === 'yyyy' ? 'opacity-100' : 'opacity-40'}`}>
              <span className="text-[10px] font-black text-slate-500 uppercase">AÑO</span>
              <div className={`w-24 h-16 rounded-2xl border-2 flex items-center justify-center text-2xl font-black ${step === 'yyyy' ? 'border-blue-500 bg-blue-500/10 text-white' : 'border-white/5 bg-white/5 text-slate-600'}`}>
                {yyyy || '----'}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 'mm' && (
              <motion.div 
                key="mm-input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-center">INGRESE MES (01-12)</label>
                <input 
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  value={mm}
                  onChange={(e) => handleMmInput(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-6 text-center text-4xl font-black focus:outline-none focus:border-blue-500"
                  placeholder="00"
                />
              </motion.div>
            )}

            {step === 'yyyy' && (
              <motion.div 
                key="yyyy-input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block text-center">INGRESE AÑO (4 DÍGITOS)</label>
                <input 
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  value={yyyy}
                  onChange={(e) => handleYyyyInput(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-6 text-center text-4xl font-black focus:outline-none focus:border-blue-500"
                  placeholder="202X"
                />
                <button 
                  onClick={() => setStep('mm')}
                  className="w-full py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest"
                >
                  VOLVER A MES
                </button>
              </motion.div>
            )}

            {step === 'batch' && (
              <motion.div 
                key="batch-input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 justify-center mb-2">
                  <Hash className="w-3 h-3 text-blue-500" />
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">NÚMERO DE LOTE (OPCIONAL)</label>
                </div>
                <input 
                  autoFocus
                  type="text"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-white/10 rounded-2xl py-6 text-center text-2xl font-black focus:outline-none focus:border-blue-500 uppercase"
                  placeholder="LOTE-XXXX"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => setStep('yyyy')}
                    className="flex-1 py-4 bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                  >
                    VOLVER
                  </button>
                  <button 
                    onClick={handleFinish}
                    className="flex-[2] py-4 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    FINALIZAR REGISTRO
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
