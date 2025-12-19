
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Sparkles, Keyboard, History as HistoryIcon, ArrowLeft, PackageCheck, Camera, Mail, FileUp, ShieldCheck, Loader2, Trash2 } from 'lucide-react';
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [expectedItems, setExpectedItems] = useState<ExpectedItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const erpInputRef = useRef<HTMLInputElement>(null);
  const [showKeypad, setShowKeypad] = useState(true);
  const [activeKeypadField, setActiveKeypadField] = useState<'label' | 'erp'>('label');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);

  const recentSessionsForAi = useLiveQuery(() => db.sessions.orderBy('createdAt').reverse().limit(50).toArray(), [], []);

  const { recentErps, correlationMap } = useMemo(() => {
    if (!recentSessionsForAi) return { recentErps: [], correlationMap: new Map() };
    const unique = new Set<string>();
    const recents: string[] = [];
    const correlations = new Map<string, string>();
    for (const s of recentSessionsForAi) {
        if (!unique.has(s.erpOrder) && recents.length < 4 && s.erpOrder !== 'PENDIENTE') {
            unique.add(s.erpOrder);
            recents.push(s.erpOrder);
        }
        if (s.logisticsLabel.length >= 3 && s.erpOrder !== 'PENDIENTE') {
            const prefix = s.logisticsLabel.substring(0, 3).toUpperCase();
            if (!correlations.has(prefix)) correlations.set(prefix, s.erpOrder);
        }
    }
    return { recentErps: recents, correlationMap: correlations };
  }, [recentSessionsForAi]);

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
      // Fix: Argument of type 'unknown[]' is not assignable to parameter of type 'File[]'.
      const files = Array.from(e.target.files || []) as File[];
      if (files.length === 0) return;
      setUploadedFiles(prev => [...prev, ...files]);
      setIsParsing(true);
      setError('');
      try {
          const items = await parseOrderDocument(files);
          setExpectedItems(prev => {
              const combined = [...prev, ...items];
              // De-duplicate by barcode
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
      if (isVerifiedMode && expectedItems.length === 0) { setError('En Modo Verificado debe cargar al menos un documento con productos.'); return; }

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
          setErpOrder(''); setLabelId(''); setDraftSessionId(null); setExpectedItems([]); setUploadedFiles([]); setIsVerifiedMode(false);
          onClose();
      } catch (err: any) {
          setError(`Error: ${err.message}`);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
        <div className="absolute inset-0 bg-slate-50 md:bg-black/60 md:backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div className="relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:w-full md:max-w-md bg-white md:rounded-3xl shadow-none md:shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
            
            <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-slate-100 shrink-0 z-10">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Nuevo Conteo</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-50 transition-colors">
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0 bg-white no-scrollbar">
                
                {/* LABEL FIELD */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">N° de Bulto / Etiqueta <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                        <input 
                            type="text" inputMode="numeric"
                            className={`flex-1 p-3.5 font-bold text-xl rounded-xl border-2 transition-all ${activeKeypadField === 'label' ? 'border-blue-600 bg-white' : 'border-slate-200 bg-slate-50'}`}
                            placeholder="Etiqueta" value={labelId} onFocus={() => setActiveKeypadField('label')}
                            onChange={(e) => handleNumericInputChange(setLabelId, e.target.value)}
                        />
                        <button type="button" onClick={() => setIsCameraOpen(true)} className="w-14 bg-slate-100 border-2 border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600">
                            <Camera className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* ERP FIELD */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Orden ERP <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                        <input 
                            ref={erpInputRef} type="text" inputMode="numeric"
                            className={`flex-1 p-3.5 font-bold text-xl rounded-xl border-2 transition-all ${activeKeypadField === 'erp' ? 'border-blue-600 bg-white' : 'border-slate-200 bg-slate-50'}`}
                            placeholder="N° ERP" value={erpOrder} onFocus={() => setActiveKeypadField('erp')}
                            onChange={(e) => handleNumericInputChange(setErpOrder, e.target.value)}
                        />
                        <button type="button" onClick={handleGmailSearch} className="w-14 bg-red-50 border-2 border-red-200 rounded-xl flex items-center justify-center text-red-600 hover:bg-red-100" title="Buscar en Gmail">
                            <Mail className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* VERIFIED MODE TOGGLE */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isVerifiedMode ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-slate-900 leading-tight">Modo Recepción Verificada</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Escaneo contra guía</div>
                            </div>
                        </div>
                        <button 
                            type="button"
                            onClick={() => setIsVerifiedMode(!isVerifiedMode)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${isVerifiedMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${isVerifiedMode ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>

                    {isVerifiedMode && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                            {expectedItems.length === 0 ? (
                                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-200 rounded-xl hover:bg-indigo-50/50 transition-colors cursor-pointer group">
                                    <FileUp className="w-8 h-8 text-indigo-400 group-hover:scale-110 transition-transform mb-2" />
                                    <span className="text-xs font-bold text-indigo-600">Subir PDF / Guía ERP</span>
                                    <span className="text-[9px] text-slate-400 mt-1 uppercase">Gemini extraerá los productos</span>
                                    <input type="file" className="hidden" accept=".pdf,image/*" multiple onChange={handleFileChange} />
                                </label>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{expectedItems.length} SKUs Identificados</span>
                                        <button type="button" onClick={() => { setExpectedItems([]); setUploadedFiles([]); }} className="text-[10px] font-bold text-red-500 hover:underline">Limpiar</button>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto border border-indigo-100 rounded-xl bg-white divide-y divide-slate-50">
                                        {expectedItems.map((item, idx) => (
                                            <div key={idx} className="p-3 flex justify-between items-center">
                                                <div className="min-w-0 flex-1 pr-2">
                                                    <div className="text-[11px] font-bold text-slate-900 truncate">{item.name}</div>
                                                    <div className="text-[9px] font-mono text-slate-400">{item.barcode}</div>
                                                </div>
                                                <div className="bg-indigo-50 px-2 py-1 rounded font-black text-xs text-indigo-700">{item.expectedQty}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {isParsing && (
                                <div className="flex items-center justify-center gap-2 py-2">
                                    <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase">Analizando Documento...</span>
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
                    <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl animate-in shake border border-red-100 flex items-center gap-2">
                        <X className="w-4 h-4" /> {error}
                    </div>
                )}
            </form>

            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 safe-area-pb">
                <button 
                    onClick={handleSubmit}
                    disabled={isParsing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-black text-lg py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    {isVerifiedMode ? <ShieldCheck className="w-5 h-5" /> : null}
                    {isVerifiedMode ? 'Empezar Recepción Guiada' : 'Comenzar Conteo Ciego'}
                </button>
            </div>
        </div>

        {isCameraOpen && <CameraScanner onScan={(code) => { setLabelId(sanitizeBarcode(code)); setIsCameraOpen(false); setActiveKeypadField('erp'); }} onClose={() => setIsCameraOpen(false)} />}
    </div>
  );
};
