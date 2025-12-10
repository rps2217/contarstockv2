
import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Keyboard, History as HistoryIcon, ArrowLeft, PackageCheck } from 'lucide-react';
import { CountingSession } from '../types';
import * as storage from '../services/storage';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { NumericKeypad } from './NumericKeypad';

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionStart: (session: CountingSession) => void;
}

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ isOpen, onClose, onSessionStart }) => {
  const [erpOrder, setErpOrder] = useState('');
  const [labelId, setLabelId] = useState('');
  const [error, setError] = useState('');

  // Keypad State
  const [showKeypad, setShowKeypad] = useState(true);
  const [activeKeypadField, setActiveKeypadField] = useState<'label' | 'erp'>('label');

  // Lazy Linking State
  const [draftSessionId, setDraftSessionId] = useState<string | null>(null);

  // --- INTELLIGENCE LOGIC ---
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
            if (!correlations.has(prefix)) {
                correlations.set(prefix, s.erpOrder);
            }
        }
    }
    return { recentErps: recents, correlationMap: correlations };
  }, [recentSessionsForAi]);

  // Check for Draft Sessions when labelId changes
  useEffect(() => {
      const checkDraft = async () => {
          if (!labelId || labelId.length < 3) {
              setDraftSessionId(null);
              return;
          }
          
          const cleanLabel = storage.sanitizeBarcode(labelId);
          const draft = await db.sessions.where('logisticsLabel').equals(cleanLabel).and(s => s.status === 'draft').first();
          
          if (draft) {
              setDraftSessionId(draft.id);
          } else {
              setDraftSessionId(null);
          }
      };
      
      const timer = setTimeout(checkDraft, 300); // Debounce check
      return () => clearTimeout(timer);
  }, [labelId]);

  const getSuggestedErp = () => {
      if (labelId.length < 3) return null;
      const prefix = labelId.substring(0, 3).toUpperCase();
      return correlationMap.get(prefix);
  };

  const suggestedErp = getSuggestedErp();

  // --- HANDLERS ---
  const handleNumericInputChange = (setter: (val: string) => void, val: string) => {
      const validValue = val.replace(/[^0-9-]/g, '');
      setter(validValue);
      setError('');
  };

  const handleKeypadInput = (char: string) => {
      if (activeKeypadField === 'erp') {
          setErpOrder(prev => prev + char);
      } else if (activeKeypadField === 'label') {
          setLabelId(prev => prev + char);
      }
      setError('');
  };

  const handleKeypadDelete = () => {
      if (activeKeypadField === 'erp') {
          setErpOrder(prev => prev.slice(0, -1));
      } else if (activeKeypadField === 'label') {
          setLabelId(prev => prev.slice(0, -1));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!erpOrder.trim() || !labelId.trim()) {
          setError('Por favor complete ambos campos obligatorios.');
          return;
      }

      try {
          let session: CountingSession;

          if (draftSessionId) {
              // LAZY LINKING: Activate the existing draft session
              session = await storage.activateDraftSession(draftSessionId, erpOrder);
          } else {
              // CREATE NEW
              session = await storage.createSession(erpOrder, labelId);
          }
          
          // If successful, trigger start
          onSessionStart(session);
          
          // Cleanup
          setErpOrder('');
          setLabelId('');
          setDraftSessionId(null);
          onClose();
      } catch (err: any) {
          console.error("Error creating session:", err);
          setError(`Error de base de datos: ${err.message || 'Desconocido'}. Intente reiniciar la app.`);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-slate-50 md:bg-black/60 md:backdrop-blur-sm transition-opacity" 
            onClick={onClose}
        />

        {/* Modal Content */}
        <div className="relative w-full h-[100dvh] md:h-auto md:max-h-[85vh] md:w-full md:max-w-md bg-white md:rounded-3xl shadow-none md:shadow-2xl flex flex-col animate-in slide-in-from-bottom-4 duration-300 overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-slate-100 shrink-0 z-10">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Iniciar Nuevo Conteo</h2>
                <button 
                    onClick={onClose} 
                    className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-50 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            {/* Scrollable Form Area */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0 bg-white">
                
                {/* INPUT 1: LOGISTICS LABEL */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">N° de Correo <span className="text-red-500">*</span></label>
                    <input 
                        type="text" 
                        inputMode="numeric"
                        className={`w-full p-3.5 font-bold text-xl rounded-xl outline-none transition-all border-2 placeholder:text-slate-300 placeholder:font-normal placeholder:text-base ${
                            activeKeypadField === 'label' 
                            ? 'border-blue-600 bg-white text-slate-900 ring-2 ring-blue-100' 
                            : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300'
                        }`}
                        placeholder="Ej: 12345" 
                        value={labelId} 
                        onFocus={() => setActiveKeypadField('label')}
                        onChange={(e) => handleNumericInputChange(setLabelId, e.target.value)} 
                        autoFocus
                    />
                </div>

                {/* DRAFT FOUND ALERT */}
                {draftSessionId && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                            <PackageCheck className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-emerald-800">Bulto Recepcionado</div>
                            <div className="text-xs text-emerald-600">Se vinculará el inventario a este registro previo.</div>
                        </div>
                    </div>
                )}

                 {/* SUGGESTION ALERT */}
                 {suggestedErp && suggestedErp !== erpOrder && !draftSessionId && (
                    <button 
                        type="button"
                        onClick={() => setErpOrder(suggestedErp)}
                        className="w-full bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-center justify-between text-left group hover:bg-blue-100 transition-colors animate-in fade-in slide-in-from-top-1"
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <div className="text-xs text-blue-800">
                                <span className="font-bold">Sugerencia:</span> Usar Orden {suggestedErp}
                            </div>
                        </div>
                        <div className="text-xs font-bold text-blue-600 group-hover:underline">Aplicar</div>
                    </button>
                )}

                {/* INPUT 2: ERP ORDER */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Orden Erp <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            inputMode="numeric"
                            className={`w-full p-3.5 font-bold text-xl rounded-xl outline-none transition-all border-2 placeholder:text-slate-300 placeholder:font-normal placeholder:text-base ${
                                activeKeypadField === 'erp' 
                                ? 'border-blue-600 bg-white text-slate-900 ring-2 ring-blue-100' 
                                : 'border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300'
                            }`}
                            placeholder="Ej: 98765" 
                            value={erpOrder} 
                            onFocus={() => setActiveKeypadField('erp')}
                            onChange={(e) => handleNumericInputChange(setErpOrder, e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowKeypad(!showKeypad)}
                            className={`shrink-0 w-14 rounded-xl flex items-center justify-center transition-all border-2 ${showKeypad ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
                        >
                            <Keyboard className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* RECENT ERP CHIPS */}
                {recentErps.length > 0 && (
                    <div className="space-y-2 pt-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1 flex items-center gap-1">
                            <HistoryIcon className="w-3 h-3" /> Recientes
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {recentErps.map(erp => (
                                <button 
                                    key={erp}
                                    type="button"
                                    onClick={() => setErpOrder(erp)}
                                    className="bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-all active:scale-95"
                                >
                                    {erp}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* EMBEDDED KEYPAD */}
                {showKeypad && (
                    <div className="pt-2">
                        <NumericKeypad 
                            isOpen={showKeypad}
                            embedded={true}
                            onInput={handleKeypadInput}
                            onDelete={handleKeypadDelete}
                        />
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 text-red-600 text-xs font-bold px-4 py-3 rounded-xl animate-in shake border border-red-100 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        {error}
                    </div>
                )}
            </form>

            {/* FIXED FOOTER BUTTON */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0 safe-area-pb">
                <button 
                    onClick={handleSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    {draftSessionId ? 'Vincular y Comenzar' : 'Comenzar Conteo'}
                </button>
            </div>
        </div>
    </div>
  );
};
