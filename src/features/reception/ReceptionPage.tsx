
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReceptionLogic } from './hooks/useReceptionLogic';
import { CameraScanner } from '../../components/CameraScanner';
import { IndustrialDisplay } from '../../shared/components/ui/IndustrialDisplay';
import { QueueManager } from '../../components/reception/QueueManager'; 
import { ScannerFooter } from '../../shared/components/controls/ScannerFooter';
import { VirtualList } from '../../components/common/VirtualList';
import { ScreenLockOverlay } from '../../components/common/ScreenLockOverlay';
import { NumericKeypad } from '../../components/NumericKeypad';
import { ChevronLeft, Box, Trash2, Save, Loader2 } from 'lucide-react';
import { useAutoLock } from '../../hooks/useAutoLock';
import { useHIDScanner } from '../../hooks/useHIDScanner';

const ReceptionRow = React.memo(({ index, data }: any) => {
    const item = data.items[index];
    if (!item) return null;
    const { onDelete, onSelect, activeBarcode } = data;
    const isActive = activeBarcode === item.logisticsLabel;

    return (
        <div className="px-3 py-1 h-full">
            <div 
                onClick={() => onSelect(item.logisticsLabel)}
                className={`w-full h-full border-2 p-4 rounded-2xl flex items-center justify-between transition-all active:scale-[0.98] ${
                    isActive ? 'bg-blue-600 border-blue-400 shadow-lg scale-[1.02]' : 'bg-slate-900/40 border-white/5'
                }`}
            >
                <div className="flex items-center gap-4 overflow-hidden">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-white/20 text-white' : 'bg-blue-900/20 text-blue-500 border border-blue-500/20'}`}>
                        <Box className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className={`font-mono font-black truncate text-sm uppercase tracking-wider ${isActive ? 'text-white' : 'text-slate-200'}`}>
                            {item.logisticsLabel}
                        </div>
                        <div className={`text-[9px] font-bold uppercase mt-1 flex items-center gap-2 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                            <span>{new Date(item.createdAt).toLocaleTimeString()}</span>
                            <span className="w-1 h-1 bg-current rounded-full opacity-30"></span>
                            <span className="font-black tracking-tighter">BORRADOR</span>
                        </div>
                    </div>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isActive ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-slate-700 hover:text-rose-500 hover:bg-rose-900/20'}`}
                >
                    <Trash2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
});

export const ReceptionPage: React.FC = () => {
    const navigate = useNavigate();
    const { state, actions } = useReceptionLogic();
    const { isLocked, unlock, lock } = useAutoLock(3000);
    
    const [isTriggerActive, setIsTriggerActive] = useState(false);
    const [showKeypad, setShowKeypad] = useState(false);
    const [showQueue, setShowQueue] = useState(false);

    useHIDScanner({
        onScan: (barcode) => actions.handleScan(barcode),
        isEnabled: !isLocked && !showKeypad && !showQueue,
        maxLatency: 50
    });

    const handleFinalize = async () => {
        if (!state.draftCount) return;
        if (confirm(`¿Confirmar recepción de ${state.draftCount} bultos?`)) {
            const ok = await actions.finalizeReception();
            if (ok) navigate('/sync');
        }
    };

    const rowData = React.useMemo(() => ({ 
        onDelete: actions.deleteDraft,
        onSelect: actions.selectItem,
        activeBarcode: state.activeBarcode
    }), [actions.deleteDraft, actions.selectItem, state.activeBarcode]);

    return (
        <div className="h-screen w-full flex flex-col font-mono select-none overflow-hidden bg-black text-white">
            
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-slate-900 shadow-2xl shrink-0 z-50">
                <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl active:bg-blue-600 transition-colors">
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/40 leading-none mb-1">RECEPCIÓN</span>
                    <span className="text-xs font-black uppercase tracking-widest text-white italic">Burst_Mode</span>
                </div>
                <button 
                    onClick={handleFinalize}
                    disabled={state.draftCount === 0 || state.isFinalizing}
                    className="h-10 px-4 bg-emerald-600 disabled:bg-slate-800 disabled:opacity-30 rounded-xl active:scale-95 flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                    {state.isFinalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span className="text-[9px] font-black uppercase tracking-widest">Cerrar</span>
                </button>
            </div>

            <div className="h-[32dvh] shrink-0">
                <IndustrialDisplay 
                    barcode={state.activeBarcode}
                    name="BULTO RECIBIDO"
                    quantity={state.draftCount}
                    feedback={state.feedback}
                    onIncrement={() => {}} // No aplica en recepción ciega ráfaga
                    onDecrement={() => state.activeBarcode && actions.handleScan(state.activeBarcode)} // Opcional
                />
            </div>

            <div className="flex-1 min-h-0 relative bg-black">
                <VirtualList 
                    items={state.unsyncedDrafts} 
                    itemHeight={80} 
                    renderRow={ReceptionRow} 
                    rowData={rowData} 
                />
            </div>

            <ScannerFooter 
                multiplier={1}
                isTriggerActive={isTriggerActive}
                onMultiplierChange={() => {}}
                onOpenManual={() => setShowKeypad(true)}
                onTriggerStart={() => !isLocked && setIsTriggerActive(true)}
                onTriggerEnd={() => setIsTriggerActive(false)}
            />

            {isTriggerActive && (
                <div className="fixed inset-0 z-[200]">
                    <CameraScanner onScan={(c) => { actions.handleScan(c); setIsTriggerActive(false); }} onClose={() => setIsTriggerActive(false)} isTriggered={true} />
                </div>
            )}

            <NumericKeypad isOpen={showKeypad} title="ETIQUETA MANUAL" onClose={() => setShowKeypad(false)} onConfirm={(v) => { actions.handleManualInput(v); setShowKeypad(false); }} />
            <QueueManager isOpen={showQueue} onClose={() => setShowQueue(false)} drafts={state.unsyncedDrafts} onDelete={actions.deleteDraft} onDiscardAll={actions.discardAll} />
            <ScreenLockOverlay isLocked={isLocked} onUnlock={unlock} />
        </div>
    );
};

export default ReceptionPage;
