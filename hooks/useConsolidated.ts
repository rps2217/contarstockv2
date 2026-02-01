
import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { aggregateScans } from '../services/aggregator';

export const useConsolidated = () => {
    const [selectedErp, setSelectedErp] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [detailSearchQuery, setDetailSearchQuery] = useState('');

    // 1. Lógica de Agrupación (Nivel Maestro)
    const erpGroups = useLiveQuery(async () => {
        let sessions = await db.sessions.where('sessionType').equals('standard').toArray();
        
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            sessions = sessions.filter(s => s.erpOrder.toLowerCase().includes(q));
        }

        const groups: Record<string, any> = {};
        for (const s of sessions) {
            if (!groups[s.erpOrder]) {
                groups[s.erpOrder] = { 
                    count: 0, 
                    lastDate: 0, 
                    totalUnits: 0, 
                    allSynced: true, 
                    alertCount: 0 
                };
            }
            const g = groups[s.erpOrder];
            g.count++;
            g.lastDate = Math.max(g.lastDate, s.createdAt);
            g.totalUnits += (s.totalUnits || 0);
            if (!s.lastSyncTimestamp) g.allSynced = false;
            if (s.auditStatus === 'failed') g.alertCount++;
        }
        
        return Object.entries(groups)
            .map(([erp, data]) => ({ erp, ...data }))
            .sort((a, b) => b.lastDate - a.lastDate);
    }, [searchQuery], []);

    // 2. Lógica de Detalle (Nivel Detalle)
    const details = useLiveQuery(async () => {
        if (!selectedErp) return null;
        
        const sessions = await db.sessions
            .where('erpOrder').equals(selectedErp)
            .and(s => s.sessionType === 'standard')
            .toArray();
            
        const sessionIds = sessions.map(s => s.id);
        const scans = await db.scans.where('sessionId').anyOf(sessionIds).toArray();
        
        const aggregatedItems = await aggregateScans(scans);
        
        return { 
            items: aggregatedItems, 
            sessionsCount: sessions.length, 
            lastDate: Math.max(...sessions.map(s => s.createdAt)), 
            isFullySynced: sessions.every(s => !!s.lastSyncTimestamp),
            totalUnits: aggregatedItems.reduce((acc, i) => acc + i.totalQuantity, 0)
        };
    }, [selectedErp]);

    // 3. Filtrado de Items en Memoria
    const filteredDetailItems = useMemo(() => {
        if (!details) return [];
        if (!detailSearchQuery) return details.items;
        const q = detailSearchQuery.toLowerCase();
        return details.items.filter(i => 
            i.barcode.toLowerCase().includes(q) || 
            i.productName.toLowerCase().includes(q)
        );
    }, [details, detailSearchQuery]);

    return {
        state: { 
            erpGroups, 
            details, 
            filteredDetailItems, 
            selectedErp, 
            searchQuery, 
            detailSearchQuery 
        },
        actions: { 
            setSelectedErp, 
            setSearchQuery, 
            setDetailSearchQuery 
        }
    };
};
