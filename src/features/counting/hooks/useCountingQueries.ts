import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import * as sessionService from '../../../services/sessionService'; 
import { aggregateScans } from '../../../services/aggregator';
import { normalizeSku } from '../../../services/utils';
import { ConsolidatedItem } from '../../../types';
import { SessionRepository } from '../../../repositories/SessionRepository';
import { ScanRepository } from '../../../repositories/ScanRepository';

export const useCountingQueries = (sessionId: string | undefined, activeBarcode: string | null, itemsRef: React.MutableRefObject<ConsolidatedItem[]>) => {
  const session = useLiveQuery(async () => {
    if (!sessionId) return null;
    return await SessionRepository.getById(sessionId);
  }, [sessionId]);

  const rawHistory = useLiveQuery(async () => {
    if (!sessionId) return [];
    const scans = await ScanRepository.getBySession(sessionId);
    const pending = sessionService.getPendingBuffer().filter(s => s.sessionId === sessionId);
    return await aggregateScans([...scans, ...pending]);
  }, [sessionId]);

  const consolidatedHistory = useMemo(() => {
    if (!rawHistory) return [];
    
    const expectedItems = session?.expectedItems || [];
    const expectedMap = new Map<string, number>(expectedItems.map(ei => [normalizeSku(ei.barcode), ei.expectedQty]));

    const finalItems = rawHistory.map(pi => ({
      ...pi,
      expectedQuantity: expectedMap.get(normalizeSku(pi.barcode)) || 0
    }));

    if (session?.isVerifiedMode) {
      const scannedBarcodes = new Set(rawHistory.map(pi => normalizeSku(pi.barcode)));
      expectedItems.forEach(exp => {
        if (!scannedBarcodes.has(normalizeSku(exp.barcode))) {
          finalItems.push({
            barcode: exp.barcode,
            productName: exp.name,
            totalQuantity: 0,
            expectedQuantity: exp.expectedQty,
            scans: 0,
            location: 'GUÍA'
          });
        }
      });
    }

    const sorted = finalItems.sort((a, b) => {
      if (normalizeSku(a.barcode) === activeBarcode) return -1;
      return b.totalQuantity - a.totalQuantity;
    });

    itemsRef.current = sorted;
    return sorted;
  }, [rawHistory, session, activeBarcode, itemsRef]);

  return { session, consolidatedHistory };
};
