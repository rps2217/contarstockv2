
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Camera, Mail, ShieldCheck, Loader2, FileUp, ScanBarcode, Search } from 'lucide-react';
import { CountingSession, ExpectedItem } from '../types';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { NumericKeypad } from './NumericKeypad';
import { CameraScanner } from './CameraScanner';
import { parseOrderDocument } from '../services/geminiParserService';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionStart: (session: CountingSession) => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ isOpen, onClose, onSessionStart }) => {
  const [erpOrder, setErpOrder] = useState('');
  const [labelId, setLabelId] = useState('');
  const [error, setError] = useState('');

  // Modo Verificado
  const [isVerifiedMode, setIsVerifiedMode] = useState(false);
  const [expectedItems, setExpectedItems] = useState<ExpectedItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const erpInputRef = useRef<HTMLInputElement>(null);
  const [showKeypad, setShowKeypad] = useState(true);
  const [activeKeypadField, setActiveKeypadField] = useState<'label' | 'erp'>('label');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);

  useEffect(() => {
      const checkDraft = async () => {
          if (!labelId || labelId.length < 3) { setDraftSessionId(null); return; }
          const cleanLabel = sanitizeBarcode(labelId);
          const draft = await db.sessions.where('logisticsLabel').equals(cleanLabel).and(s => s.status === 'draft').first();
          if (draft) setDraftSessionId(draft.id); else setDraftSessionId(null);
      };
      const timer = setTimeout(checkDraft, 300);
      return () => clearTimeout(timer);
  }, [labelId]);

  const handleGmailSearch = () => {
      if (!erpOrder) { setError('Ingrese el N° ERP para buscar en Gmail.'); return; }
      const url = `https://mail.google.com/mail/u/0/#search/subject%3A${encodeURIComponent(erpOrder)}+OR+${encodeURIComponent(erpOrder)}`;
      window.open(url, '_blank');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []) as File[];
      if (files.length === 0) return;
      setIsParsing(true);
      setError('');
      try {
          const items = await parseOrderDocument(files);
          setExpectedItems(prev => {
              const combined = [...prev, ...items];
              const unique = Array.from(new Map(combined.map(item => [item.barcode, item])).values());
              return unique;
          });
      } catch (err: any) {
          setError(err.message);
      } finally {
          setIsParsing(false);
      }
  };

  const handleNumericInputChange = (setter: (val: string) => void, val: string) => {
      setter(val.replace(/[^0-9-]/g, ''));
      setError('');
  };

  const handleKeypadInput = (char: string) => {
      if (activeKeypadField === 'erp') setErpOrder(prev => prev + char);
      else if (activeKeypadField === 'label') setLabelId(prev => prev + char);
      setError('');
  };

  const handleKeypadDelete = () => {
      if (activeKeypadField === 'erp') setErpOrder(prev => prev.slice(0, -1));
      else if (activeKeypadField === 'label') setLabelId(prev => prev.slice(0, -1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!erpOrder.trim() || !labelId.trim()) { setError('Por favor complete ambos campos obligatorios.'); return; }
      if (isVerifiedMode && expectedItems.length === 0) { setError('En Modo Verificado debe cargar al menos un documento.'); return; }

      try {
          let session: CountingSession;
          if (draftSessionId) {
              session = await sessionService.activateDraftSession(draftSessionId, erpOrder);
          } else {
              session = await sessionService.createSession(erpOrder, labelId);
          }
          
          if (isVerifiedMode) {
              await db.sessions.update(session.id, { 
                  isVerifiedMode: true, 
                  expectedItems 
              });
              session = { ...session, isVerifiedMode: true, expectedItems };
          }
          
          onSessionStart(session);
          setErpOrder(''); setLabelId(''); setDraftSessionId(null); setExpectedItems([]); setIsVerifiedMode(false);
          onClose();
      } catch (err: any) {
          setError(`Error: ${err.message}`);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />

        <div className="relative w-full max-h-[95dvh] flex flex-col bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-4 duration-300 md:max-w-md overflow-hidden">
            
            {/* Header Limpio */}
            <div className="flex justify-between items-center px-6 pt-6 pb-2 bg-white shrink-0 z-10">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">INICIAR CONTEO</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Nueva Sesión Operativa</p>
                </div>
                <button onClick={onClose} className="bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 p-3 rounded-full transition-colors active:scale-90">
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-h-0 bg-white no-scrollbar">
                
                {/* CAMPO: ETIQUETA LOGÍSTICA */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <ScanBarcode className="w-3 h-3" /> Etiqueta Logística
                    </label>
                    <div className="flex gap-3">
                        <div 
                            className={`flex-1 relative rounded-2xl transition-all duration-300 ${activeKeypadField === 'label' ? 'ring-4 ring-blue-100 bg-white' : 'bg-slate-50'}`}
                            onClick={() => setActiveKeypadField('label')}
                        >
                            <input 
                                type="text" inputMode="none" readOnly
                                className="w-full h-16 bg-transparent border-0 text-center font-black text-2xl text-slate-900 placeholder:text-slate-300 focus:ring-0 rounded-2xl tracking-wider"
                                placeholder="BULTO" value={labelId}
                            />
                            {/* Indicador de Foco */}
                            {activeKeypadField === 'label' && <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 rounded-b-2xl animate-in slide-in-from-left duration-300"></div>}
                        </div>
                        
                        {/* Botón Cámara Principal - Grande y Visible */}
                        <button 
                            type="button" 
                            onClick={() => setIsCameraOpen(true)} 
                            className="h-16 w-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center active:scale-90 transition-all shrink-0"
                        >
                            <Camera className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                {/* CAMPO: DOCUMENTO ERP */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <FileUp className="w-3 h-3" /> Documento ERP
                    </label>
                    <div className="flex gap-3">
                        <div 
                            className={`flex-1 relative rounded-2xl transition-all duration-300 ${activeKeypadField === 'erp' ? 'ring-4 ring-blue-100 bg-white' : 'bg-slate-50'}`}
                            onClick={() => setActiveKeypadField('erp')}
                        >
                            <input 
                                type="text" inputMode="none" readOnly
                                className="w-full h-16 bg-transparent border-0 text-center font-black text-2xl text-slate-900 placeholder:text-slate-300 focus:ring-0 rounded-2xl tracking-wider"
                                placeholder="ORDEN" value={erpOrder}
                            />
                            {activeKeypadField === 'erp' && <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 rounded-b-2xl animate-in slide-in-from-left duration-300"></div>}
                        </div>

                        {/* Botón Gmail/Buscar - Estilo Secundario pero Visible */}
                        <button 
                            type="button" 
                            onClick={handleGmailSearch} 
                            className="h-16 w-16 bg-white border-2 border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 rounded-2xl flex items-center justify-center active:scale-90 transition-all shrink-0 shadow-sm"
                            title="Buscar en Gmail"
                        >
                            <Mail className="w-7 h-7" />
                        </button>
                    </div>
                </div>

                {/* MODO VERIFICADO */}
                <div className={`rounded-3xl p-1 border transition-all duration-300 ${isVerifiedMode ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-white'}`}>
                    <button 
                        type="button"
                        onClick={() => setIsVerifiedMode(!isVerifiedMode)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] ${isVerifiedMode ? 'bg-white border-indigo-100 shadow-sm' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl transition-colors ${isVerifiedMode ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <div className={`text-sm font-black ${isVerifiedMode ? 'text-indigo-900' : 'text-slate-500'}`}>Modo Verificado</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Requiere Guía PDF/IMG</div>
                            </div>
                        </div>
                        <div className={`w-12 h-7 rounded-full relative transition-colors ${isVerifiedMode ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${isVerifiedMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </div>
                    </button>

                    {isVerifiedMode && (
                        <div className="px-2 pb-2 pt-1 animate-in slide-in-from-top-2">
                            {expectedItems.length === 0 ? (
                                <label className="flex items-center justify-center gap-3 p-4 bg-indigo-100/50 border border-dashed border-indigo-300 text-indigo-700 rounded-xl cursor-pointer hover:bg-indigo-100 transition-colors active:scale-95">
                                    <FileUp className="w-5 h-5" />
                                    <span className="text-xs font-black uppercase">Cargar Documento</span>
                                    <input type="file" className="hidden" accept=".pdf,image/*" multiple onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className="bg-white rounded-xl border border-indigo-100 p-3 flex justify-between items-center shadow-sm">
                                    <div className="flex items-center gap-2 text-indigo-700">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-xs font-black uppercase">{expectedItems.length} SKUs Listos</span>
                                    </div>
                                    <button type="button" onClick={() => setExpectedItems([])} className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-1 rounded hover:bg-red-100">BORRAR</button>
                                </div>
                            )}
                            {isParsing && <div className="text-center text-[10px] font-bold text-indigo-500 py-2 animate-pulse">Analizando documento...</div>}
                        </div>
                    )}
                </div>

                {/* TECLADO INTEGRADO */}
                {showKeypad && (
                    <div className="pt-2 pb-2">
                        <NumericKeypad isOpen={showKeypad} embedded={true} onInput={handleKeypadInput} onDelete={handleKeypadDelete} />
                    </div>
                )}

                {error && (
                    <div className="bg-rose-50 text-rose-600 text-xs font-bold p-4 rounded-2xl animate-in shake border border-rose-100 flex items-center gap-3 shadow-sm">
                        <div className="w-2 h-2 bg-rose-500 rounded-full shrink-0"></div> {error}
                    </div>
                )}
            </form>

            {/* Footer Action */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-8 md:pb-6 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                <button 
                    onClick={handleSubmit}
                    disabled={isParsing}
                    className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-base py-5 rounded-2xl shadow-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-widest"
                >
                    {isVerifiedMode ? 'Comenzar Recepción' : 'Iniciar Conteo'}
                </button>
            </div>
        </div>

        {isCameraOpen && <CameraScanner onScan={(code) => { setLabelId(sanitizeBarcode(code)); setIsCameraOpen(false); setActiveKeypadField('erp'); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};

// Simple icon component helper if not imported
const CheckCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);
