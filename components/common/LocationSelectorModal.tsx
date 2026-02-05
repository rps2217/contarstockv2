
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Plus, Trash2, X, Check, History } from 'lucide-react';
import { Modal } from './Modal';
import { LocationService } from '../../services/locationService';
import { LocationEntry } from '../../db';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    currentLocation: string;
    onSelect: (name: string) => void;
}

export const LocationSelectorModal: React.FC<Props> = ({ isOpen, onClose, currentLocation, onSelect }) => {
    const [savedLocations, setSavedLocations] = useState<LocationEntry[]>([]);
    const [inputValue, setInputValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadLocations();
            setTimeout(() => inputRef.current?.focus(), 150);
        }
    }, [isOpen]);

    const loadLocations = async () => {
        const list = await LocationService.getSavedLocations();
        setSavedLocations(list);
    };

    const handleConfirmNew = async () => {
        const name = inputValue.trim().toUpperCase();
        if (!name) return;
        await LocationService.saveLocation(name);
        onSelect(name);
        setInputValue('');
        onClose();
    };

    const handleSelectExisting = async (name: string) => {
        await LocationService.saveLocation(name);
        onSelect(name);
        onClose();
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (confirm("¿Eliminar del historial?")) {
            await LocationService.deleteLocation(id);
            loadLocations();
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Ubicación Física" 
            variant="bottom-sheet"
            className="bg-slate-900 border-t-4 border-blue-600/50"
        >
            <div className="p-6 pb-12 space-y-6">
                {/* INPUT NUEVA UBICACIÓN */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-2">Nueva Posición</label>
                    <div className="relative group">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-blue-500" />
                        <input 
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && handleConfirmNew()}
                            className="w-full h-16 pl-14 pr-16 bg-black border-4 border-white/5 rounded-2xl text-xl font-black uppercase tracking-widest text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-700"
                            placeholder="Ej: ESTANTE-01"
                        />
                        <button 
                            onClick={handleConfirmNew}
                            disabled={!inputValue.trim()}
                            className="absolute right-2 top-2 bottom-2 px-4 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest disabled:opacity-20 active:scale-95 transition-all"
                        >
                            OK
                        </button>
                    </div>
                </div>

                {/* HISTORIAL / RECIENTES */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 ml-2">
                        <History className="w-3 h-3 text-slate-500" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Recientes en Bodega</span>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                        {savedLocations.length === 0 ? (
                            <div className="py-10 text-center opacity-20 border-2 border-dashed border-white/10 rounded-[2rem]">
                                <p className="text-[10px] font-black uppercase tracking-widest">Sin historial guardado</p>
                            </div>
                        ) : (
                            savedLocations.map((loc) => {
                                const isCurrent = loc.name === currentLocation;
                                return (
                                    <button 
                                        key={loc.id}
                                        onClick={() => handleSelectExisting(loc.name)}
                                        className={`w-full p-5 rounded-[1.8rem] border-2 flex items-center justify-between transition-all active:scale-[0.98] ${
                                            isCurrent 
                                            ? 'bg-blue-600/20 border-blue-500 text-blue-400' 
                                            : 'bg-white/5 border-white/5 text-slate-400'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${isCurrent ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-600'}`}>
                                                <Check className="w-4 h-4 stroke-[4px]" />
                                            </div>
                                            <span className="text-lg font-black tracking-tight">{loc.name}</span>
                                        </div>
                                        <button 
                                            onClick={(e) => handleDelete(e, loc.id!)}
                                            className="p-3 text-slate-700 hover:text-rose-500 transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
