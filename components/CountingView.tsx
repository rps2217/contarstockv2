
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Scanner } from './Scanner';
import { Loader2, AlertCircle } from 'lucide-react';
import * as sessionService from '../services/sessionService';

export const CountingView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const session = useLiveQuery(async () => {
        if (!id) return null;
        return await db.sessions.get(id);
    }, [id]);

    const handleClose = async () => {
        if (id) {
            await sessionService.closeSession(id);
            navigate('/reports');
        }
    };

    const handleDiscard = async () => {
        if (id) {
            await sessionService.deleteSession(id);
            navigate('/reports');
        }
    };

    if (session === undefined) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Cargando motor de escaneo...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
                <div className="bg-rose-100 p-6 rounded-full mb-6">
                    <AlertCircle className="w-12 h-12 text-rose-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">Sesión no encontrada</h2>
                <p className="text-slate-500 mb-8 max-w-xs">El ID de bulto no existe o fue eliminado de la base de datos local.</p>
                <button 
                    onClick={() => navigate('/reports')}
                    className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95"
                >
                    Volver al Historial
                </button>
            </div>
        );
    }

    return (
        <Scanner 
            session={session} 
            onCloseSession={handleClose} 
            onDiscardSession={handleDiscard} 
        />
    );
};
