
import React, { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import * as sessionService from '../services/sessionService';
import { useLocation } from 'react-router-dom';

export const useReports = () => {
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    
    const searchParams = new URLSearchParams(location.search);
    const filterType = searchParams.get('type') || 'standard';

    const [limit, setLimit] = useState(50);

    const pendingSyncCount = useLiveQuery(() => db.scans.where('synced').equals(0).count(), [], 0);

    // Mapa de ERPs para identificar multi-bulto
    const erpCounts = useLiveQuery(async () => {
        const allSessions = await db.sessions.toArray();
        const counts: Record<string, number> = {};
        allSessions.forEach(s => {
            if (s.erpOrder) {
                counts[s.erpOrder] = (counts[s.erpOrder] || 0) + 1;
            }
        });
        return counts;
    }, []);

    const sessions = useLiveQuery(async () => {
        const q = searchQuery.trim().toLowerCase();
        
        let collection = db.sessions.where('sessionType').equals(filterType);

        if (q) {
            return await collection
                .filter(s => 
                    (s.erpOrder?.toLowerCase() || '').includes(q) || 
                    (s.logisticsLabel?.toLowerCase() || '').includes(q)
                )
                .reverse()
                .limit(limit)
                .toArray();
        }

        return await collection.reverse().limit(limit).toArray();
    }, [searchQuery, limit, filterType], []);

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
            erpCounts: erpCounts || {},
            pendingSyncCount,
            searchQuery,
            selectedSessionId,
            isCleaning,
            isStartModalOpen,
            activeMenuId,
            filterType,
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
