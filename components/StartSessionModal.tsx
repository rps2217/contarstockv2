
import React, { useState, useCallback } from 'react';
import { DownloadCloud, Loader2, AlertCircle, FileSearch, Sparkles, Database, Ghost, Camera, X, Box, FileText, ArrowRight, ScanLine, Lock, Unlock } from 'lucide-react';
import { CountingSession, ExpectedOrder } from '../types';
import * as sessionService from '../services/sessionService'; 
import { sanitizeBarcode } from '../services/utils';
import { SoundFX } from '../services/audio';
import { useHIDScanner } from '../hooks/useHIDScanner';
import { Modal } from '../shared/components/ui/Modal';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';
import { CameraScanner } from './CameraScanner';
import { useNavigate } from 'react-router-dom';

interface StartSessionModalProps {
 isOpen: boolean;
 onClose: () => void;
 onSessionStart: (session: CountingSession) => void;
}

type Mode = 'select' | 'guided' | 'blind';
type Step = 'select' | 'scan_label' | 'take_photo' | 'enter_erp' | 'confirm';

export const StartSessionModal: React.FC<StartSessionModalProps> = ({ isOpen, onClose, onSessionStart }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('select');
  const [step, setStep] = useState<Step>('select');
  const [erpOrder, setErpOrder] = useState('');
  const [labelId, setLabelId] = useState('');
  const [labelPhoto, setLabelPhoto] = useState<string | null>(null);
  const [isAutoLockEnabled, setIsAutoLockEnabled] = useState(true);
  const [error, setError] = useState('');
  const [activeField, setActiveField] = useState<'label' | 'erp'>('label');
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [cloudOrder, setCloudOrder] = useState<ExpectedOrder | null>(null);

  // Scanner de hardware integrado
  useHIDScanner({
    isEnabled: isOpen && !isCameraOpen && step !== 'select' && step !== 'take_photo',
    onScan: (raw) => {
      const cleanCode = sanitizeBarcode(raw);
      if (step === 'scan_label') {
        setLabelId(cleanCode);
        SoundFX.play('success');
        setStep('take_photo');
      } else if (step === 'enter_erp') {
        setErpOrder(cleanCode);
        SoundFX.play('success');
      }
    }
  });

  const handleCameraScan = useCallback((code: string) => {
    const clean = sanitizeBarcode(code);
    if (clean) {
      if (step === 'scan_label') {
        setLabelId(clean);
        setStep('take_photo');
      } else if (step === 'enter_erp') {
        setErpOrder(clean);
      }
      setIsCameraOpen(false);
      SoundFX.play('success');
    }
  }, [step]);

  const handlePhotoCapture = (photo: string) => {
    setLabelPhoto(photo);
    setIsCameraOpen(false);
    SoundFX.play('success');
    if (mode === 'guided') {
      setStep('enter_erp');
    } else {
      setStep('confirm');
    }
  };

  const handleFetchFromCloud = async () => {
    if (!erpOrder || !erpOrder.trim()) return;
    setIsCloudLoading(true);
    setError("");
    try {
      const localOrder = await ExpectedOrderRepository.getById(String(erpOrder || '').toUpperCase());
      if (localOrder) {
        setCloudOrder(localOrder);
        SoundFX.play('success');
        setStep('confirm');
        return;
      }

      const order = await sessionService.fetchExpectedItemsFromCloud(erpOrder);
      if (!order || order.items.length === 0) {
        setError("Documento no encontrado en nube ni localmente");
        setCloudOrder(null);
        SoundFX.play('error');
      } else {
        setCloudOrder(order);
        SoundFX.play('success');
        setStep('confirm');
      }
    } catch (err: any) {
      setError("Error de red: " + err.message);
      setCloudOrder(null);
    } finally {
      setIsCloudLoading(false);
    }
  };

  const handleStart = async () => {
    if (!labelId.trim()) { 
      setError('Ingrese ID de Bulto'); 
      return; 
    }
    if (mode === 'guided' && !erpOrder.trim()) {
      setError('Ingrese ERP para modo manual');
      return;
    }

    try {
      const erpLabel = mode === 'blind' ? 'CONTEO_CIEGO' : erpOrder;

      const session = await sessionService.createSession(
        erpLabel, 
        labelId, 
        'standard', 
        cloudOrder || undefined,
        labelPhoto || undefined,
        isAutoLockEnabled
      );
      onSessionStart(session);
      onClose();
      // Reset state for next time
      setTimeout(() => {
        setMode('select');
        setStep('select');
        setLabelId('');
        setErpOrder('');
        setLabelPhoto(null);
        setCloudOrder(null);
        setError('');
      }, 500);
    } catch (err) {
      setError("Error de base de datos local");
    }
  };

  const renderSelectMode = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-xl font-black uppercase italic tracking-tight text-white">Nueva Carga</h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Selecciona el método de ingreso</p>
      </div>

      <button 
        onClick={() => { setMode('guided'); setStep('scan_label'); setError(''); }}
        className="w-full bg-blue-600/10 border-2 border-blue-500/30 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-all text-left group hover:bg-blue-600/20"
      >
        <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
          <FileSearch className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-white uppercase tracking-wider">Con Orden ERP</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Validar contra documento previo</p>
        </div>
        <ArrowRight className="w-5 h-5 text-blue-500 opacity-50 group-hover:opacity-100 transition-opacity" />
      </button>

      <button 
        onClick={() => { setMode('blind'); setStep('scan_label'); setError(''); }}
        className="w-full bg-orange-600/10 border-2 border-orange-500/30 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-all text-left group hover:bg-orange-600/20"
      >
        <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center shrink-0">
          <Ghost className="w-6 h-6 text-orange-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-white uppercase tracking-wider">Conteo Ciego</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Escanear sin guía previa</p>
        </div>
        <ArrowRight className="w-5 h-5 text-orange-500 opacity-50 group-hover:opacity-100 transition-opacity" />
      </button>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-white/10"></div>
        <span className="flex-shrink-0 mx-4 text-slate-500 text-[9px] font-black uppercase">Otras Opciones</span>
        <div className="flex-grow border-t border-white/10"></div>
      </div>

      <button 
        onClick={() => { onClose(); navigate('/reception'); }}
        className="w-full bg-slate-800 border-2 border-white/5 p-4 rounded-2xl flex items-center gap-4 active:scale-95 transition-all text-left group hover:bg-slate-700"
      >
        <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
          <ScanLine className="w-6 h-6 text-slate-300" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-white uppercase tracking-wider">Recepción</h4>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Escanear documento físico con IA</p>
        </div>
        <ArrowRight className="w-5 h-5 text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );

  const renderWizard = () => {
    return (
      <div className="space-y-6 md:space-y-8">
        <div className="flex items-center gap-4 mb-2">
          <button 
            onClick={() => setStep('select')} 
            className="p-2.5 bg-white/5 rounded-xl text-slate-400 active:bg-white/10 active:scale-90 transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-black uppercase italic tracking-tight text-white truncate">
              {mode === 'guided' ? 'Con Orden ERP' : 'Conteo Ciego'}
            </h3>
            <div className="flex gap-1.5 mt-1.5">
              {[1, 2, 3, 4].map((s) => {
                const currentStepIdx = ['scan_label', 'take_photo', 'enter_erp', 'confirm'].indexOf(step) + 1;
                const isCompleted = ['scan_label', 'take_photo', 'enter_erp', 'confirm'].indexOf(step) + 1 > s;
                const isActive = ['scan_label', 'take_photo', 'enter_erp', 'confirm'].indexOf(step) + 1 === s;
                
                // Skip step 3 for blind mode
                if (mode === 'blind' && s === 3) return null;

                return (
                  <div 
                    key={s} 
                    className={`h-1.5 rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500 w-6' : isActive ? 'bg-blue-500 w-10' : 'bg-white/10 w-4'}`} 
                  />
                );
              })}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-900/40 text-rose-400 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-3 animate-in shake">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}

        {/* STEP 1: SCAN LABEL */}
        {step === 'scan_label' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-blue-500/30">
                <ScanLine className="w-10 h-10 text-blue-400" />
              </div>
              <h4 className="text-white font-black uppercase tracking-wider">Paso 1: Escanear Etiqueta</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Escanea el código de barras del bulto</p>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text"
                  value={labelId}
                  onChange={(e) => setLabelId(e.target.value)}
                  autoFocus
                  placeholder="ID_Bulto_SSCC"
                  className="w-full h-16 bg-slate-900 rounded-2xl px-5 font-mono font-black text-lg md:text-xl border-2 border-blue-500 text-white outline-none shadow-[0_0_20px_rgba(59,130,246,0.15)] focus:border-blue-400 transition-all"
                />
              </div>
              <button 
                onClick={() => setIsCameraOpen(true)}
                className="w-16 h-16 bg-blue-500/10 border-2 border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 active:scale-95 active:bg-blue-600 active:text-white transition-all shrink-0"
              >
                <Camera className="w-7 h-7" />
              </button>
            </div>

            <button 
              disabled={!labelId.trim()}
              onClick={() => setStep('take_photo')}
              className="w-full h-14 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest disabled:opacity-50"
            >
              Siguiente Paso
            </button>
          </div>
        )}

        {/* STEP 2: TAKE PHOTO */}
        {step === 'take_photo' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-amber-500/30">
                <Camera className="w-10 h-10 text-amber-400" />
              </div>
              <h4 className="text-white font-black uppercase tracking-wider">Paso 2: Fotografía</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Captura una imagen de la etiqueta física</p>
            </div>

            {labelPhoto ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500/30">
                <img src={labelPhoto} alt="Label" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setLabelPhoto(null)}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setIsCameraOpen(true)}
                className="w-full aspect-video bg-slate-900 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-500 hover:border-amber-500/50 hover:text-amber-500 transition-all"
              >
                <Camera className="w-10 h-10" />
                <span className="text-[10px] font-black uppercase tracking-widest">Abrir Cámara</span>
              </button>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => setStep('scan_label')}
                className="flex-1 h-14 bg-white/5 text-slate-400 font-black rounded-2xl uppercase tracking-widest"
              >
                Atrás
              </button>
              <button 
                disabled={!labelPhoto}
                onClick={() => mode === 'guided' ? setStep('enter_erp') : setStep('confirm')}
                className="flex-[2] h-14 bg-amber-600 text-white font-black rounded-2xl uppercase tracking-widest disabled:opacity-50"
              >
                Siguiente Paso
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: ENTER ERP */}
        {step === 'enter_erp' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500/30">
                <FileText className="w-10 h-10 text-emerald-400" />
              </div>
              <h4 className="text-white font-black uppercase tracking-wider">Paso 3: Orden ERP</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Ingresa el número de orden para descargar datos</p>
            </div>

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input 
                  type="text"
                  value={erpOrder}
                  onChange={(e) => { setErpOrder(e.target.value); setCloudOrder(null); }}
                  autoFocus
                  placeholder="Número de Orden / ERP"
                  className="w-full h-16 bg-slate-900 rounded-2xl px-5 font-mono font-black text-lg md:text-xl border-2 border-emerald-500 text-white outline-none shadow-[0_0_20px_rgba(16,185,129,0.15)] focus:border-emerald-400 transition-all"
                />
              </div>
              <button 
                onClick={() => setIsCameraOpen(true)}
                className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 active:scale-95 active:bg-emerald-600 active:text-white transition-all shrink-0"
              >
                <Camera className="w-7 h-7" />
              </button>
            </div>

            <button 
              disabled={!erpOrder.trim() || isCloudLoading}
              onClick={handleFetchFromCloud}
              className="w-full h-14 bg-emerald-600 text-white font-black rounded-2xl uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isCloudLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <DownloadCloud className="w-5 h-5" />}
              Validar y Descargar
            </button>

            <button 
              onClick={() => setStep('take_photo')}
              className="w-full h-10 text-slate-500 font-black uppercase text-[10px] tracking-widest"
            >
              Atrás
            </button>
          </div>
        )}

        {/* STEP 4: CONFIRM */}
        {step === 'confirm' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-indigo-500/30">
                <Box className="w-10 h-10 text-indigo-400" />
              </div>
              <h4 className="text-white font-black uppercase tracking-wider">Resumen de Inicio</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Verifica los datos antes de comenzar</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 space-y-3 border border-white/10">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase">ID Bulto</span>
                <span className="text-xs font-mono font-bold text-white">{labelId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase">ERP / Orden</span>
                <span className="text-xs font-mono font-bold text-white">{erpOrder || 'CONTEO CIEGO'}</span>
              </div>
              {cloudOrder && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-emerald-500 uppercase">Items Cloud</span>
                  <span className="text-xs font-bold text-emerald-400">{cloudOrder.items.length} detectados</span>
                </div>
              )}
              <div className="pt-2">
                <div className="text-[10px] font-black text-slate-500 uppercase mb-2">Foto de Etiqueta</div>
                <div className="aspect-video rounded-xl overflow-hidden bg-black/20">
                  <img src={labelPhoto || ''} alt="Label" className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => setIsAutoLockEnabled(!isAutoLockEnabled)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isAutoLockEnabled 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' 
                      : 'bg-slate-800/50 border-white/5 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isAutoLockEnabled ? 'bg-blue-500/20' : 'bg-slate-700/50'}`}>
                      {isAutoLockEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] font-black uppercase tracking-wider">Auto-Bloqueo</div>
                      <div className="text-[8px] font-bold opacity-60 uppercase">
                        {isAutoLockEnabled ? 'Activado (Seguridad)' : 'Desactivado (Continuo)'}
                      </div>
                    </div>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${isAutoLockEnabled ? 'bg-blue-500' : 'bg-slate-700'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isAutoLockEnabled ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
              </div>
            </div>

            <button 
              onClick={handleStart}
              className="w-full h-16 bg-indigo-600 text-white font-black rounded-2xl uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
            >
              Comenzar Conteo
            </button>

            <button 
              onClick={() => mode === 'guided' ? setStep('enter_erp') : setStep('take_photo')}
              className="w-full h-10 text-slate-500 font-black uppercase text-[10px] tracking-widest"
            >
              Atrás
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      variant="bottom-sheet"
      className="md:max-w-md bg-slate-950 text-white border-t-4 border-slate-800"
      showCloseButton={step === 'select'}
    >
      <div className="p-5 md:p-8 pb-10 md:pb-12">
        {step === 'select' ? renderSelectMode() : renderWizard()}
      </div>

      {/* MODAL DE CÁMARA / FOTO */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-[500]">
          {step === 'take_photo' ? (
            <div className="absolute inset-0 bg-black flex flex-col">
              <CameraScanner 
                onScan={() => {}} // No scan needed for photo
                onClose={() => setIsCameraOpen(false)} 
                isTriggered={true}
                mode="photo" // I need to check if CameraScanner supports photo mode
                onCapture={handlePhotoCapture}
              />
            </div>
          ) : (
            <CameraScanner 
              onScan={handleCameraScan} 
              onClose={() => setIsCameraOpen(false)} 
              isTriggered={true} 
            />
          )}
        </div>
      )}
    </Modal>
  );
};
