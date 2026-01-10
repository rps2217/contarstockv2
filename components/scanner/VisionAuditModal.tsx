
import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { auditWithVision } from '../../services/geminiVisionService';
import { ConsolidatedItem } from '../../types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentItems: ConsolidatedItem[];
}

export const VisionAuditModal: React.FC<Props> = ({ isOpen, onClose, currentItems }) => {
    const [image, setImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => setImage(reader.result as string);
        reader.readAsDataURL(file);
    };

    const runAudit = async () => {
        if (!image) return;
        setIsAnalyzing(true);
        try {
            const base64 = image.split(',')[1];
            const auditResult = await auditWithVision(base64, currentItems);
            setResult(auditResult);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[250] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-black uppercase tracking-tight">Auditor IA Vision</h2>
                    </div>
                    <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5"/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                    {!image ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-24 h-24 bg-slate-50 border-4 border-dashed border-slate-200 rounded-full flex items-center justify-center text-slate-300 hover:text-indigo-600 hover:border-indigo-300 transition-all mb-6"
                            >
                                <Camera className="w-10 h-10" />
                            </button>
                            <h3 className="font-black text-slate-400 uppercase tracking-widest text-xs">Capturar Foto de Carga</h3>
                            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCapture} />
                        </div>
                    ) : !result ? (
                        <div className="space-y-6">
                            <img src={image} className="w-full aspect-square object-cover rounded-3xl shadow-lg border-4 border-white" />
                            <button 
                                onClick={runAudit}
                                disabled={isAnalyzing}
                                className="w-full bg-indigo-600 text-white h-16 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                                {isAnalyzing ? 'Analizando...' : 'Comenzar Auditoría Visual'}
                            </button>
                            <button onClick={() => setImage(null)} className="w-full text-slate-400 font-bold uppercase text-[10px]">Cambiar Foto</button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div className="bg-indigo-50 border-2 border-indigo-100 p-6 rounded-[2rem]">
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3">Veredicto IA</h4>
                                <p className="text-indigo-900 font-medium text-sm leading-relaxed italic">"{result.summary}"</p>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Estimaciones Visuales</h4>
                                {result.estimatedItems.map((item: any, idx: number) => {
                                    const local = currentItems.find(i => i.barcode === item.barcode);
                                    const diff = item.qty - (local?.totalQuantity || 0);
                                    return (
                                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                                            <div>
                                                <div className="font-black text-slate-900 text-xs uppercase">{item.name}</div>
                                                <div className="font-mono text-[10px] text-slate-400">{item.barcode}</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <div className="text-xl font-black text-slate-900">{item.qty}</div>
                                                    <div className="text-[8px] font-bold text-slate-400 uppercase">En Foto</div>
                                                </div>
                                                {diff !== 0 && (
                                                    <div className={`p-2 rounded-lg ${diff > 0 ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                                        <AlertTriangle className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <button onClick={() => { setImage(null); setResult(null); }} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">Cerrar Auditoría</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
