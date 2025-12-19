
import React, { useState } from 'react';
import { LifeBuoy, RefreshCw, RotateCcw, Database, Download, Upload, Loader2 } from 'lucide-react';
import { createFullBackup, restoreFullBackup } from '../../services/backupService';

export const SupportSection: React.FC = () => {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleSoftReset = () => {
        if (confirm("¿Reiniciar interfaz?\n\nNo perderás tus datos.")) {
            window.location.reload();
        }
    };

    const handleHardReset = () => {
        if (confirm("¿Limpieza profunda?\n\nBorrara el caché y forzará la descarga de la última versión.")) {
            sessionStorage.clear();
            window.location.href = '/?t=' + Date.now();
        }
    };

    const handleBackup = async () => {
        setIsBackingUp(true);
        try { await createFullBackup(); } catch (e) { alert("Fallo backup"); }
        finally { setIsBackingUp(false); }
    };

    const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm("⚠️ ADVERTENCIA: Esta acción REEMPLAZARÁ todos los datos locales. ¿Continuar?")) return;
        setIsRestoring(true);
        try {
            await restoreFullBackup(file);
            alert("Restauración exitosa. Reiniciando...");
            window.location.reload();
        } catch (err: any) { alert(`Error: ${err.message}`); }
        finally { setIsRestoring(false); }
    };

    return (
        <div className="space-y-6">
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <LifeBuoy className="w-5 h-5 text-blue-600" /> Soporte y Recuperación
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={handleSoftReset} className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:bg-blue-50 transition-all text-left">
                        <RefreshCw className="w-6 h-6 text-blue-500" />
                        <div>
                            <div className="font-bold text-slate-900 text-sm">Reinicio Suave</div>
                            <div className="text-[10px] text-slate-400">Refrescar interfaz</div>
                        </div>
                    </button>
                    <button onClick={handleHardReset} className="flex items-center gap-4 p-4 rounded-xl border-2 border-slate-100 hover:bg-red-50 transition-all text-left">
                        <RotateCcw className="w-6 h-6 text-red-500" />
                        <div>
                            <div className="font-bold text-slate-900 text-sm">Reinicio Profundo</div>
                            <div className="text-[10px] text-slate-400">Limpiar caché de sesión</div>
                        </div>
                    </button>
                </div>
            </section>

            <section className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-600" /> Respaldo Local
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={handleBackup} disabled={isBackingUp} className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 p-4 rounded-xl font-bold flex flex-col items-center gap-2 transition-all">
                        {isBackingUp ? <Loader2 className="animate-spin" /> : <Download />}
                        <span className="text-xs">Exportar JSON</span>
                    </button>
                    <label className="bg-white hover:bg-amber-50 text-amber-600 border border-amber-200 p-4 rounded-xl font-bold flex flex-col items-center gap-2 transition-all cursor-pointer">
                        <input type="file" accept=".json" onChange={handleRestoreFile} className="hidden" />
                        {isRestoring ? <Loader2 className="animate-spin" /> : <Upload />}
                        <span className="text-xs">Importar JSON</span>
                    </label>
                </div>
            </section>
        </div>
    );
};
