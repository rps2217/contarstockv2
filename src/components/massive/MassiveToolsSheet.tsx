
import React from 'react';
import { Barcode, RotateCcw, Download, X, MapPin, Printer } from 'lucide-react';
import { Modal } from '../common/Modal';
import { IndustrialActionCard } from '../../shared/components/ui/IndustrialActionCard';
import { useCloudAction } from '../../shared/hooks/useCloudAction';
import { importManifestFromCloud } from '../../services/massiveSync';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    batchId: string;
    hasActiveItem: boolean;
    location: string;
    onChangeLocation: () => void;
    onShowLabel: () => void;
    onReset: () => void;
    onPrintSummary: () => void;
}

export const MassiveToolsSheet: React.FC<Props> = ({ 
    isOpen, onClose, batchId, hasActiveItem, location, 
    onChangeLocation, onShowLabel, onReset, onPrintSummary 
}) => {
    
    const { execute: syncStock, isLoading: isSyncing } = useCloudAction<number>();

    const handleDownloadStock = () => {
        syncStock({
            action: () => importManifestFromCloud(batchId),
            successMsg: "Stock teórico actualizado",
            errorMsg: "Fallo al descargar stock desde Google Sheets",
            onSuccess: (count) => {
                alert(`Sincronización Exitosa: ${count} metas cargadas.`);
                onClose();
            }
        });
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            variant="bottom-sheet" 
            className="bg-black border-t-8 border-slate-900 overflow-visible"
            showCloseButton={false}
        >
            <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mt-4 mb-2"></div>

            <div className="p-8 pb-12 bg-black text-white">
                <div className="flex justify-between items-center mb-10 px-2">
                    <div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Acciones Martillo</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">V4_Industrial_Core</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white/5 rounded-full text-slate-400 active:bg-rose-600 active:text-white transition-all">
                        <X className="w-7 h-7" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <IndustrialActionCard 
                        onClick={onChangeLocation}
                        icon={MapPin}
                        label="Cambiar Ubicación"
                        sublabel={`Actual: ${location || 'SIN_DEFINIR'}`}
                        color="text-blue-400"
                    />

                    <IndustrialActionCard 
                        onClick={handleDownloadStock}
                        icon={Download}
                        label="Descargar Stock Teórico"
                        sublabel="Sincronizar Guía desde Cloud"
                        isLoading={isSyncing}
                        color="text-amber-400"
                    />

                    <IndustrialActionCard 
                        onClick={onShowLabel}
                        icon={Barcode}
                        label="Generar Etiqueta SKU"
                        sublabel="Código 128 para Lector Láser"
                        disabled={!hasActiveItem}
                        color="text-indigo-400"
                    />

                    <IndustrialActionCard 
                        onClick={onPrintSummary}
                        icon={Printer}
                        label="Imprimir Manifiesto"
                        sublabel="Exportar discrepancias a PDF"
                        color="text-emerald-400"
                    />

                    <div className="pt-6 mt-2 border-t border-white/5">
                        <IndustrialActionCard 
                            onClick={onReset}
                            icon={RotateCcw}
                            label="Vaciar Todo el Lote"
                            sublabel="Resetear conteos de esta sesión"
                            variant="danger"
                            color="text-rose-500"
                        />
                    </div>
                </div>
            </div>
        </Modal>
    );
};
