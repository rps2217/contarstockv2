
import React, { useEffect } from 'react';
import { FileSpreadsheet, X, Loader2, CheckCircle2, AlertTriangle, Download, Upload } from 'lucide-react';
import { useProductImporter } from '../../hooks/useProductImporter';
import { Modal } from '../common/Modal';

interface ImportToolsProps {
 isOpen: boolean;
 onClose: () => void;
 onImportComplete: (count: number) => void;
}

export const ImportTools: React.FC<ImportToolsProps> = ({ isOpen, onClose, onImportComplete }) => {
 // Patrón SoC: Delegamos la lógica al hook
 const { state, actions } = useProductImporter(onImportComplete);

 // Reiniciar estado al abrir/cerrar
 useEffect(() => {
 if (isOpen) actions.reset();
 }, [isOpen]);

 const handleClose = () => {
 actions.reset();
 onClose();
 };

 return (
 <Modal isOpen={isOpen} onClose={handleClose} className="md:max-w-md" showCloseButton={false}>
 <div className="relative p-8">
 <button onClick={handleClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 bg-slate-50 rounded-full transition-colors">
 <X className="w-5 h-5" />
 </button>

 <div className="text-center mb-8">
 <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${state.status === 'error' ? 'bg-red-50 text-red-500' : 'bg-green-100 text-green-600'}`}>
 {state.status === 'loading' ? <Loader2 className="w-10 h-10 animate-spin text-blue-600" /> : 
 state.status === 'error' ? <AlertTriangle className="w-10 h-10" /> :
 state.status === 'success' ? <CheckCircle2 className="w-10 h-10" /> :
 <FileSpreadsheet className="w-10 h-10" />}
 </div>
 <h2 className="text-2xl font-black text-slate-900 tracking-tight">
 {state.status === 'success' ? '¡Importación Exitosa!' : 'Importar Productos'}
 </h2>
 <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mt-2">
 {state.status === 'loading' ? 'Procesando datos masivos...' : 
 state.status === 'success' ? `Se cargaron ${state.count} registros nuevos` : 
 'Actualización Masiva de Catálogo'}
 </p>
 </div>

 {state.status === 'success' ? (
 <button onClick={handleClose} className="bg-slate-900 text-white w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
 Finalizar
 </button>
 ) : (
 <div className={`space-y-8 transition-opacity duration-300 ${state.status === 'loading' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
 
 {/* OPCIÓN A: ARCHIVO LOCAL */}
 <div className="relative group">
 <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Opción A: Archivo CSV</label>
 <div className="border-2 border-dashed border-slate-200 rounded-2xl p-1 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-200 transition-colors">
 <input 
 type="file" 
 accept=".csv" 
 onChange={actions.importFromCSV} 
 className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer h-14" 
 />
 </div>
 </div>

 <div className="relative flex items-center">
 <div className="flex-grow border-t border-slate-100"></div>
 <span className="flex-shrink-0 mx-4 text-slate-300 text-[9px] font-black uppercase tracking-widest">O desde la Nube</span>
 <div className="flex-grow border-t border-slate-100"></div>
 </div>

 {/* OPCIÓN B: URL GOOGLE */}
 <form onSubmit={actions.importFromSheet}>
 <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-2">Opción B: Google Sheet (Pública)</label>
 <div className="flex gap-2">
 <input
 value={state.sheetUrl}
 onChange={(e) => actions.setSheetUrl(e.target.value)}
 className="flex-1 h-14 pl-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-bold outline-none focus:bg-white focus:border-green-500 transition-all placeholder:text-slate-300"
 placeholder="https://docs.google.com/..."
 />
 <button type="submit" disabled={!state.sheetUrl} className="h-14 w-16 flex items-center justify-center bg-green-600 disabled:bg-slate-200 text-white rounded-2xl hover:bg-green-700 transition-colors shadow-lg active:scale-90">
 <Download className="w-6 h-6" />
 </button>
 </div>
 </form>

 {state.error && (
 <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl flex items-center gap-3 animate-in shake border border-red-100">
 <AlertTriangle className="w-5 h-5 shrink-0" /> 
 <span>{state.error}</span>
 </div>
 )}
 </div>
 )}
 </div>
 </Modal>
 );
};
