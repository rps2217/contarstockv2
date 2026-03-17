
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Tag, ArrowRight, Sparkles, Loader2, X, Camera } from 'lucide-react';
import { extractPharmaData } from '../services/geminiVisionService';
import { SoundFX } from '../services/audio';
import { Modal } from '../shared/components/ui/Modal';

interface ExpirationModalProps {
 onComplete: (mm?: number, yyyy?: number, batch?: string) => void;
 productName: string;
}

export const ExpirationModal: React.FC<ExpirationModalProps> = ({ onComplete, productName }) => {
 const [step, setStep] = useState<'batch' | 'year' | 'month'>('batch');
 const [batch, setBatch] = useState('');
 const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
 const [isAiLoading, setIsAiLoading] = useState(false);
 
 const inputRef = useRef<HTMLInputElement>(null);
 const fileInputRef = useRef<HTMLInputElement>(null);

 useEffect(() => {
 if (step === 'batch') setTimeout(() => inputRef.current?.focus(), 100);
 }, [step]);

 const handleAiScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 
 setIsAiLoading(true);
 try {
 const reader = new FileReader();
 reader.readAsDataURL(file);
 reader.onloadend = async () => {
 const base64 = (reader.result as string).split(',')[1];
 const result = await extractPharmaData(base64);
 if (result) {
 setBatch(result.batch || '');
 if (result.mm && result.yyyy) {
 // Autocompletado total si la IA es precisa
 onComplete(result.mm, result.yyyy, result.batch);
 SoundFX.play('success');
 } else {
 // Si falta algo, vamos al siguiente paso manual
 setStep('year');
 }
 }
 };
 } catch (err) {
 alert("Error procesando imagen.");
 } finally {
 setIsAiLoading(false);
 }
 };

 const handleYearSelect = (year: number) => {
 setSelectedYear(year);
 setStep('month');
 };

 const handleMonthSelect = (month: number) => {
 onComplete(month, selectedYear, batch.trim().toUpperCase());
 };

 return (
 <Modal 
 isOpen={true} 
 onClose={() => onComplete(undefined, undefined, batch.trim() || 'SIN_LOTE')} 
 variant="bottom-sheet"
 className="bg-slate-950 text-white border-t-4 border-slate-800"
 showCloseButton={false}
 >
 <div className="p-6 pb-12">
 <div className="flex justify-between items-center mb-6">
 <div>
 <h3 className="text-xl font-black uppercase italic tracking-tight text-white flex items-center gap-2">
 {step === 'batch' ? <Tag className="w-6 h-6 text-blue-500" /> : <Calendar className="w-6 h-6 text-blue-500" />}
 Validación Pharma
 </h3>
 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 truncate max-w-[250px]">{productName}</p>
 </div>
 <button onClick={() => onComplete(undefined, undefined, batch.trim() || 'SIN_LOTE')} className="p-3 bg-white/5 rounded-full text-slate-400">
 <X className="w-6 h-6" />
 </button>
 </div>

 {step === 'batch' && (
 <div className="space-y-4">
 <button 
 onClick={() => fileInputRef.current?.click()}
 disabled={isAiLoading}
 className="w-full h-16 bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center gap-4 group transition-all active:scale-95"
 >
 {isAiLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6 animate-pulse" />}
 <div className="text-left">
 <div className="text-xs font-black uppercase tracking-widest">Escaneo Inteligente</div>
 <div className="text-[9px] font-bold opacity-60 uppercase">Leer caja con IA</div>
 </div>
 </button>
 
 <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAiScan} />

 <div className="relative flex items-center py-2">
 <div className="flex-grow border-t border-white/10"></div>
 <span className="flex-shrink-0 mx-4 text-slate-500 text-[9px] font-black uppercase">O Manual</span>
 <div className="flex-grow border-t border-white/10"></div>
 </div>

 <input 
 ref={inputRef}
 value={batch}
 onChange={(e) => setBatch(e.target.value)}
 placeholder="LOTE"
 className="w-full h-16 bg-slate-900 border-2 border-white/10 rounded-2xl text-center text-2xl font-black uppercase tracking-widest text-white outline-none focus:border-blue-500 transition-all"
 onKeyDown={(e) => e.key === 'Enter' && batch.trim() && setStep('year')}
 />
 
 <button 
 disabled={!batch.trim()}
 onClick={() => setStep('year')}
 className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-20 active:scale-95 transition-all"
 >
 Continuar <ArrowRight className="w-5 h-5" />
 </button>
 </div>
 )}

 {step === 'year' && (
 <div className="space-y-4 text-center">
 <div className="bg-blue-500/20 text-blue-400 py-2 px-4 rounded-full inline-block text-[10px] font-black uppercase mb-2 border border-blue-500/30">LOTE: {batch}</div>
 <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Año Vencimiento</p>
 <div className="grid grid-cols-2 gap-3">
 {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
 <button key={y} onClick={() => handleYearSelect(y)} className="h-16 bg-slate-900 border-2 border-white/10 rounded-xl font-black text-xl text-white hover:border-blue-500 active:scale-95 transition-all">{y}</button>
 ))}
 </div>
 </div>
 )}

 {step === 'month' && (
 <div className="space-y-4">
 <div className="flex items-center justify-between px-2 mb-2">
 <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Mes Venc.</p>
 <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-500/30">AÑO {selectedYear}</span>
 </div>
 <div className="grid grid-cols-4 gap-2">
 {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
 <button key={m} onClick={() => handleMonthSelect(m)} className="aspect-square flex items-center justify-center bg-slate-900 border-2 border-white/10 rounded-xl font-black text-lg text-white hover:border-blue-500 active:scale-90 transition-all">{m}</button>
 ))}
 </div>
 </div>
 )}

 <div className="mt-6 flex justify-between gap-3">
 <button onClick={() => onComplete(undefined, undefined, batch.trim() || 'SIN_LOTE')} className="flex-1 py-3 text-slate-500 font-bold hover:text-slate-300 text-xs uppercase tracking-widest">Omitir Fecha</button>
 {step !== 'batch' && <button onClick={() => setStep(step === 'month' ? 'year' : 'batch')} className="px-6 py-3 bg-slate-800 border border-white/10 rounded-xl text-white font-bold text-xs uppercase shadow-sm active:scale-95 transition-all">Volver</button>}
 </div>
 </div>
 </Modal>
 );
};
