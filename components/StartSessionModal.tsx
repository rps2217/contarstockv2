
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Camera, Mail, ShieldCheck, Loader2, FileUp } from 'lucide-react';
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
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

        {/* Modal Container: Adjusted height constraints and padding */}
        <div className="relative w-full max-h-[90dvh] flex flex-col bg-white rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-4 duration-300 md:max-w-md md:h-auto overflow-hidden">
            
            <div className="flex justify-between items-center px-6 py-5 bg-white border-b border-slate-100 shrink-0 z-10">
                <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Iniciar Conteo</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-50 transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 bg-white no-scrollbar">
                
                {/* LABEL FIELD */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Etiqueta Logística</label>
                    <div className="flex gap-2">
                        <input 
                            type="text" inputMode="numeric"
                            className={`flex-1 p-4 font-black text-xl rounded-2xl border-2 transition-all outline-none text-center tracking-wider ${activeKeypadField === 'label' ? 'border-blue-600 bg-white text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
                            placeholder="BULTO" value={labelId} onFocus={() => setActiveKeypadField('label')}
                            onChange={(e) => handleNumericInputChange(setLabelId, e.target.value)}
                        />
                        <button type="button" onClick={() => setIsCameraOpen(true)} className="w-16 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all">
                            <Camera className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* ERP FIELD */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">N° Documento ERP</label>
                    <div className="flex gap-2">
                        <input 
                            ref={erpInputRef} type="text" inputMode="numeric"
                            className={`flex-1 p-4 font-black text-xl rounded-2xl border-2 transition-all outline-none text-center tracking-wider ${activeKeypadField === 'erp' ? 'border-blue-600 bg-white text-blue-600' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
                            placeholder="ORDEN" value={erpOrder} onFocus={() => setActiveKeypadField('erp')}
                            onChange={(e) => handleNumericInputChange(setErpOrder, e.target.value)}
                        />
                        <button type="button" onClick={handleGmailSearch} className="w-16 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center justify-center text-red-400 hover:text-red-600 hover:border-red-200 transition-all" title="Buscar en Gmail">
                            <Mail className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* VERIFIED MODE TOGGLE */}
                <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl transition-colors ${isVerifiedMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}>
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900 leading-tight">Modo Verificado</div>
                                <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Requiere Guía PDF/IMG</div>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setIsVerifiedMode(!isVerifiedMode)}
                            className={`w-14 h-8 rounded-full transition-colors relative shadow-inner ${isVerifiedMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform shadow-sm ${isVerifiedMode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {isVerifiedMode && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            {expectedItems.length === 0 ? (
                                <label className="flex flex-col items-center justify-center p-6 border-3 border-dashed border-indigo-200 rounded-2xl hover:bg-indigo-50/50 transition-colors cursor-pointer group bg-white">
                                    <FileUp className="w-8 h-8 text-indigo-300 group-hover:text-indigo-600 group-hover:scale-110 transition-all mb-2" />
                                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Cargar Documento</span>
                                    <input type="file" className="hidden" accept=".pdf,image/*" multiple onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className="bg-white rounded-2xl border border-indigo-100 p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{expectedItems.length} SKUs Leídos</span>
                                        <button type="button" onClick={() => { setExpectedItems([]); }} className="text-[10px] font-bold text-red-500 hover:underline uppercase">Borrar</button>
                                    </div>
                                    <div className="h-1 w-full bg-indigo-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 w-full animate-pulse"></div>
                                    </div>
                                </div>
                            )}
                            {isParsing && (
                                <div className="flex items-center justify-center gap-2 py-2">
                                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Analizando con Gemini...</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {showKeypad && (
                    <div className="pt-2">
                        <NumericKeypad isOpen={showKeypad} embedded={true} onInput={handleKeypadInput} onDelete={handleKeypadDelete} />
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-4 rounded-2xl animate-in shake border border-red-100 flex items-center gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div> {error}
                    </div>
                )}
            </form>

            {/* Footer with extra padding for mobile devices */}
            <div className="p-4 bg-white border-t border-slate-100 shrink-0 pb-8 md:pb-6">
                <button 
                    onClick={handleSubmit}
                    disabled={isParsing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-sm py-5 rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-widest"
                >
                    {isVerifiedMode ? 'Comenzar Recepción' : 'Iniciar Conteo'}
                </button>
            </div>
        </div>

        {isCameraOpen && <CameraScanner onScan={(code) => { setLabelId(sanitizeBarcode(code)); setIsCameraOpen(false); setActiveKeypadField('erp'); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};
