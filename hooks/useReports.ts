
import React, { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService';

export const useReports = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    
    // Paginación Reactiva
    const [limit, setLimit] = useState(50);

    const pendingSyncCount = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);

    const sessions = useLiveQuery(async () => {
        const q = searchQuery.trim();
        let collection;

        if (q) {
            collection = db.sessions
                .where('erpOrder').startsWithIgnoreCase(q)
                .or('logisticsLabel').startsWithIgnoreCase(q);
        } else {
            collection = db.sessions.orderBy('createdAt');
        }

        return await collection.reverse().limit(limit).toArray();
    }, [searchQuery, limit], []);

    const loadMore = useCallback(() => {
        setLimit(prev => prev + 50);
    }, []);

    const handleCleanSynced = useCallback(async () => {
        if (!confirm("Se purgarán los datos ya respaldados en la nube. ¿Continuar?")) return;
        setIsCleaning(true);
        try {
            const count = await sessionService.cleanSyncedSessions(); 
            if (count > 0) alert(`Purga exitosa: ${count} registros eliminados.`);
        } finally { 
            setIsCleaning(false); 
        }
    }, []);

    const handleDeleteSession = useCallback(async (e: React.MouseEvent, sessionId: string) => {
        e.stopPropagation();
        if (window.confirm('¿Eliminar registro permanentemente?')) {
            await sessionService.deleteSession(sessionId); 
            setActiveMenuId(null);
        }
    }, []);

    const handleMenuToggle = useCallback((e: React.MouseEvent, id: string) => { 
        e.stopPropagation(); 
        setActiveMenuId(prev => prev === id ? null : id); 
    }, []);

    return {
        state: {
            sessions,
            pendingSyncCount,
            searchQuery,
            selectedSessionId,
            isCleaning,
            isStartModalOpen,
            activeMenuId,
            hasMore: sessions?.length === limit
        },
        actions: {
            setSearchQuery,
            setSelectedSessionId,
            setIsStartModalOpen,
            handleCleanSynced,
            handleDeleteSession,
            handleMenuToggle,
            loadMore
        }
    };
};
