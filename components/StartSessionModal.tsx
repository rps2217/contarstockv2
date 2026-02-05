
import React, { useState, useEffect } from 'react';
import { DownloadCloud, Loader2, CheckCircle2, AlertCircle, FileSearch, Sparkles, Database, PackageSearch, Ghost } from 'lucide-react';
import { CountingSession, ExpectedOrder } from '../types';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { NumericKeypad } from './NumericKeypad';
import { SoundFX } from '../services/audio';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { Modal } from './common/Modal';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

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
  
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [cloudOrder, setCloudOrder] = useState<ExpectedOrder | null>(null);

  const ordersInLocalCount = useLiveQuery(() => db.expectedOrders.count(), [], 0);

  useHIDScanner({
      isEnabled: isOpen,
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

  const handleFetchAll = async () => {
    setIsSyncingAll(true);
    try {
        const count = await sessionService.fetchAllOrdersFromCloud();
        SoundFX.play('success');
        alert(`✓ ${count} Órdenes sincronizadas para modo Detective.`);
    } catch (e: any) {
        SoundFX.play('error');
        setError("Error cargando base de pedidos: " + e.message);
    } finally {
        setIsSyncingAll(false);
    }
  };

  const handleFetchFromCloud = async () => {
    if (!erpOrder.trim()) return;
    setIsCloudLoading(true);
    setError("");
    try {
        const order = await sessionService.fetchExpectedItemsFromCloud(erpOrder);
        if (!order || order.items.length === 0) {
            setError("Documento no encontrado");
            setCloudOrder(null);
            SoundFX.play('error');
        } else {
            setCloudOrder(order);
            SoundFX.play('success');
        }
    } catch (err: any) {
        setError("Fallo de conexión cloud");
        setCloudOrder(null);
    } finally {
        setIsCloudLoading(false);
    }
  };

  const handleStart = async (mode: 'manual' | 'detective') => {
    if (!labelId.trim()) { 
        setError('Ingrese ID de Bulto'); 
        return; 
    }
    if (mode === 'manual' && !erpOrder.trim()) {
        setError('Ingrese ERP para modo manual');
        return;
    }

    try {
        const erpLabel = mode === 'detective' 
            ? (ordersInLocalCount > 0 ? 'BUSCANDO_ERP...' : 'CONTEO_CIEGO')
            : erpOrder;

        const session = await sessionService.createSession(
            erpLabel, 
            labelId, 
            'standard', 
            cloudOrder || undefined
        );
        onSessionStart(session);
        onClose();
    } catch (err) {
        setError("Error de base de datos local");
    }
  };

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        variant="bottom-sheet"
        className="md:max-w-md bg-slate-950 text-white"
        showCloseButton={true}
    >
        <div className="px-6 pt-10 pb-2 space-y-4">
            
            {error && (
                <div className="bg-rose-900/40 text-rose-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-3 animate-in shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* SYNC GENERAL BUTTON */}
            <button 
                onClick={handleFetchAll}
                disabled={isSyncingAll}
                className="w-full bg-indigo-600/20 border-2 border-indigo-500/30 py-3 rounded-2xl flex items-center justify-center gap-3 mb-2 active:scale-95 transition-all"
            >
                {isSyncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4 text-indigo-400" />}
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-100">
                    Sincronizar Pedidos ({ordersInLocalCount})
                </span>
            </button>

            {/* INPUT BULTO */}
            <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-4">Etiqueta Física</span>
                <button 
                    onClick={() => setActiveKeypadField('label')} 
                    className={`w-full h-20 rounded-2xl flex items-center justify-center font-mono font-black text-2xl border-4 transition-all duration-300 ${activeKeypadField === 'label' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                >
                    <span className={`tracking-[0.1em] px-4 truncate ${!labelId ? 'opacity-30 text-lg italic' : ''}`}>
                        {labelId || "ID_BULTO_SSCC"}
                    </span>
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <button 
                    onClick={() => handleStart('detective')}
                    className={`h-32 rounded-3xl border-4 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${ordersInLocalCount > 0 ? 'bg-orange-600/20 border-orange-500/30' : 'bg-slate-900 border-white/5 opacity-80'}`}
                >
                    <div className={`p-3 rounded-2xl ${ordersInLocalCount > 0 ? 'bg-orange-500/20' : 'bg-white/5'}`}>
                        {ordersInLocalCount > 0 ? <Sparkles className="w-6 h-6 text-orange-500" /> : <Ghost className="w-6 h-6 text-slate-500" />}
                    </div>
                    <div className="text-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 block">
                            {ordersInLocalCount > 0 ? 'Deducir ERP' : 'Conteo Ciego'}
                        </span>
                        {ordersInLocalCount > 0 && <span className="text-[8px] font-bold text-orange-400 uppercase tracking-widest">{ordersInLocalCount} Guías</span>}
                    </div>
                </button>

                <button 
                    onClick={() => setActiveKeypadField('erp')}
                    className={`h-32 rounded-3xl border-4 flex flex-col items-center justify-center gap-3 transition-all active:scale-95 ${activeKeypadField === 'erp' ? 'bg-blue-600 border-blue-400' : 'bg-slate-900 border-white/5'}`}
                >
                    <div className={`p-3 rounded-2xl ${activeKeypadField === 'erp' ? 'bg-white/20' : 'bg-blue-500/10'}`}>
                        <FileSearch className={`w-6 h-6 ${activeKeypadField === 'erp' ? 'text-white' : 'text-blue-500'}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Manual / QR</span>
                </button>
            </div>

            {activeKeypadField === 'erp' && (
                <div className="flex gap-2 animate-in slide-in-from-top-2">
                    <div className="flex-[3] h-14 bg-slate-900 border-2 border-white/10 rounded-xl flex items-center justify-center font-mono font-black text-white">
                        {erpOrder || "ORDEN_ERP"}
                    </div>
                    <button 
                        onClick={handleFetchFromCloud}
                        className="flex-1 bg-emerald-600 rounded-xl flex items-center justify-center"
                    >
                        {isCloudLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5" />}
                    </button>
                </div>
            )}

            <div className="md:hidden pt-2">
                <NumericKeypad 
                    isOpen={true} 
                    embedded={true} 
                    onInput={(c) => { 
                        if (activeKeypadField === 'erp') { setErpOrder(p => p + c); setCloudOrder(null); } 
                        else setLabelId(p => p + c); 
                        setError('');
                    }} 
                    onDelete={() => { 
                        if (activeKeypadField === 'erp') { setErpOrder(p => p.slice(0, -1)); setCloudOrder(null); }
                        else setLabelId(p => p.slice(0, -1)); 
                    }} 
                />
            </div>
        </div>

        <div className="p-6 pb-12">
            <button 
                onClick={() => handleStart(erpOrder ? 'manual' : 'detective')} 
                className={`w-full font-black h-16 rounded-[2rem] shadow-2xl active:scale-95 uppercase tracking-[0.2em] text-xs transition-all border-b-8 flex items-center justify-center gap-3 ${erpOrder ? 'bg-blue-600 text-white border-blue-900' : 'bg-orange-600 text-white border-orange-900'}`}
            >
                {cloudOrder ? 'INICIAR VERIFICADO' : (erpOrder ? 'INICIAR MANUAL' : (ordersInLocalCount > 0 ? 'PISTEAR Y DEDUCIR' : 'PISTEAR SIN GUÍA'))}
            </button>
        </div>
    </Modal>
  );
};
