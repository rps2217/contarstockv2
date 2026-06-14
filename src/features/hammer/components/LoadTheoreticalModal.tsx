import React, { useState, useEffect } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Database, FileText, Loader2, ArrowRight, RefreshCw, Layers, HardDrive } from 'lucide-react';
import { erpService } from '../../../services/erpService';
import { SoundFX } from '../../../services/audio';
import { ExpectedOrderRepository } from '../../../repositories/ExpectedOrderRepository';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportGeneralStock: () => Promise<void>;
  onImportExpectedOrder: (orderId: string) => Promise<void>;
  onImportLocalExpectedOrder: (orderId: string) => Promise<void>;
}

export const LoadTheoreticalModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportGeneralStock,
  onImportExpectedOrder,
  onImportLocalExpectedOrder
}) => {
  const [loadingList, setLoadingList] = useState(false);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [localOrders, setLocalOrders] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCloudOrders = async () => {
    setLoadingList(true);
    setError(null);
    try {
      const manifests = await erpService.downloadAllPendingManifests();
      setOrders(manifests || []);
    } catch (err: any) {
      console.error(err);
      setError("No se pudieron obtener las cargas teóricas de la nube");
    } finally {
      setLoadingList(false);
    }
  };

  const fetchLocalOrders = async () => {
    setLoadingLocal(true);
    try {
      const all = await ExpectedOrderRepository.getAll();
      setLocalOrders(all || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLocal(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCloudOrders();
      fetchLocalOrders();
    }
  }, [isOpen]);

  const handleGeneralImport = async () => {
    setActionLoading('general');
    setError(null);
    try {
      await onImportGeneralStock();
      SoundFX.play('success');
      onClose();
    } catch (err: any) {
      SoundFX.play('error');
      setError(err.message || "Error al cargar stock general");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOrderImport = async (orderId: string) => {
    setActionLoading(orderId);
    setError(null);
    try {
      await onImportExpectedOrder(orderId);
      SoundFX.play('success');
      onClose();
    } catch (err: any) {
      SoundFX.play('error');
      setError(err.message || `Error al importar orden ${orderId}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLocalOrderImport = async (orderId: string) => {
    setActionLoading(orderId);
    setError(null);
    try {
      await onImportLocalExpectedOrder(orderId);
      SoundFX.play('success');
      onClose();
    } catch (err: any) {
      SoundFX.play('error');
      setError(err.message || `Error al importar carga local ${orderId}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="center"
      title="Cargar Información Teórica"
      className="bg-slate-950 border border-slate-800 text-white w-full max-w-lg rounded-3xl"
    >
      <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto no-scrollbar">
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl text-center uppercase tracking-wider">
            {error}
          </div>
        )}

        {/* Option 1: General Stock */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Base de Datos General</h3>
          <button
            disabled={!!actionLoading}
            onClick={handleGeneralImport}
            className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-white/5 hover:border-amber-500/30 p-4 rounded-2xl flex items-center gap-4 transition-all active:scale-[0.98] group disabled:opacity-50"
          >
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0 border border-amber-500/20">
              {actionLoading === 'general' ? (
                <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
              ) : (
                <Database className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">Stock Teórico General</h4>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tight">Utilizar última planilla de stock total (STOCK)</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition-colors" />
          </button>
        </div>

        {/* Option 2: Local Theoretical Lists */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Cargas Teóricas del Dispositivo (Locales)
            </h3>
            <button
              onClick={fetchLocalOrders}
              disabled={loadingLocal || !!actionLoading}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 active:scale-95 transition-all"
              title="Actualizar listado local"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLocal ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {loadingLocal ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Buscando locales...</span>
              </div>
            ) : localOrders.length === 0 ? (
              <div className="py-6 bg-slate-900/40 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                <HardDrive className="w-7 h-7 text-slate-700 mb-2" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sin cargas locales guardadas</span>
                <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">Sube excel o pega en el panel de "Carga Teórica"</p>
              </div>
            ) : (
              localOrders.map((order) => {
                const displayName = order.metadata?.internalGuide || order.metadata?.purchaseOrder || order.id;
                return (
                  <button
                    key={order.id}
                    disabled={!!actionLoading}
                    onClick={() => handleLocalOrderImport(order.id)}
                    className="w-full text-left bg-emerald-950/10 hover:bg-emerald-950/25 border border-emerald-500/10 hover:border-emerald-500/30 p-3 rounded-xl flex items-center gap-3 transition-all active:scale-[0.98] group disabled:opacity-50"
                  >
                    <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0 border border-emerald-500/15">
                      {actionLoading === order.id ? (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                      ) : (
                        <HardDrive className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-white truncate">{displayName}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 rounded text-[7px] font-black uppercase text-emerald-400 tracking-widest shrink-0">
                          {order.items?.length || 0} SKUs
                        </span>
                      </div>
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight mt-0.5 truncate">
                        ID: {order.id} {order.metadata?.date ? `| Fecha: ${order.metadata.date}` : ''}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Option 3: Cloud Theoretical Lists */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-indigo-400" /> Cargas Teóricas de la Nube
            </h3>
            <button
              onClick={fetchCloudOrders}
              disabled={loadingList || !!actionLoading}
              className="p-1 hover:bg-white/5 rounded-lg text-slate-400 active:scale-95 transition-all"
              title="Actualizar listado"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-2 pr-1 no-scrollbar">
            {loadingList ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Buscando en la nube...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-8 bg-slate-900/50 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-center">
                <FileText className="w-8 h-8 text-slate-600 mb-2" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">No hay cargas en la nube</span>
                <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">Guarda listados teóricos en "Carga Teórica"</p>
              </div>
            ) : (
              orders.map((order) => (
                <button
                  key={order.id}
                  disabled={!!actionLoading}
                  onClick={() => handleOrderImport(order.id)}
                  className="w-full text-left bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-indigo-500/20 p-3.5 rounded-xl flex items-center gap-3 transition-all active:scale-[0.98] group disabled:opacity-50"
                >
                  <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center shrink-0 border border-indigo-500/10">
                    {actionLoading === order.id ? (
                      <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                    ) : (
                      <FileText className="w-4.5 h-4.5 text-indigo-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-white truncate">{order.id}</span>
                      <span className="px-1.5 py-0.5 bg-indigo-500/10 rounded text-[7px] font-black uppercase text-indigo-400 tracking-widest shrink-0">
                        {order.items?.length || 0} SKUs
                      </span>
                    </div>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-tight mt-0.5 truncate">
                      {order.description || "Sin descripción adicional"}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                </button>
              ))
            )}
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">Selecciona un listado a sincronizar</p>
        </div>
      </div>
    </Modal>
  );
};
