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
    const hasExpectedItems = expectedItems.length > 0;
    const expectedMap = new Map<string, number>(expectedItems.map(ei => [normalizeSku(ei.barcode), ei.expectedQty]));

    const finalItems = rawHistory.map(pi => ({
      ...pi,
      expectedQuantity: expectedMap.get(normalizeSku(pi.barcode)) || 0
    }));

    // Show expected items even if not isVerifiedMode - this is for test mode
    if (hasExpectedItems) {
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
      // In test mode, put expected items first (with 0 qty), then scanned items
      if (hasExpectedItems) {
        if (a.totalQuantity === 0 && b.totalQuantity > 0) return -1;
        if (a.totalQuantity > 0 && b.totalQuantity === 0) return 1;
      }
      return b.totalQuantity - a.totalQuantity;
    });

    itemsRef.current = sorted;
    return sorted;
  }, [rawHistory, session, activeBarcode, itemsRef]);

  return { session, consolidatedHistory };
};
