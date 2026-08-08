import { useEffect, useState } from 'react';
import * as productService from '../../../services/productService';
import { normalizeSku } from '../../../services/utils';
import { DetectiveService } from '../../../services/detectiveService';
import { SoundFX } from '../../../services/audio';
import { ConsolidatedItem, MatchResult, CountingSession, AppSettings } from '../../../types';
import { logger } from '../../../services/logger';

export const useCountingAI = (
  consolidatedHistory: ConsolidatedItem[] | undefined,
  session: any,
  settings: AppSettings
) => {
  const [potentialMatch, setPotentialMatch] = useState<MatchResult | null>(null);

  // MOTOR DETECTIVE: Resuelve 'Productos Desconocidos' en segundo plano para el conteo
  useEffect(() => {
    if (!consolidatedHistory) return;

    const unknownSkus = Array.from(
      new Set(
        consolidatedHistory
          .filter(
            item =>
              item.productName === 'Cargando...' ||
              item.productName === 'Producto Desconocido' ||
              !item.productName
          )
          .map(item => normalizeSku(item.barcode))
      )
    ).slice(0, 10);

    if (unknownSkus.length === 0) return;

    const timer = setTimeout(() => {
      productService.resolveUnknownProducts(unknownSkus, settings.cloudConfig);
    }, 1000);
    return () => clearTimeout(timer);
  }, [consolidatedHistory, settings]);

  // LÓGICA DE INFERENCIA EN SEGUNDO PLANO (Inteligencia Proactiva)
  useEffect(() => {
    if (!session || session.isVerifiedMode || !consolidatedHistory?.length) return;

    // Solo ejecutar si tenemos al menos 3 items diferentes para tener confianza
    if (consolidatedHistory.length < 3) return;

    const runInference = async () => {
      try {
        const matches = await DetectiveService.findMatchingOrders(consolidatedHistory);
        if (matches.length > 0 && matches[0].matchScore > 60) {
          // Si encontramos un match de alta confianza que no teníamos antes
          if (!potentialMatch || potentialMatch.expectedOrder.id !== matches[0].expectedOrder.id) {
            setPotentialMatch(matches[0]);
            // Feedback sutil para el operario
            SoundFX.play('success');
          }
        }
      } catch (e) {
        logger.error('CountingAI', 'Inference Error', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
    };

    const timer = setTimeout(runInference, 2000);
    return () => clearTimeout(timer);
  }, [consolidatedHistory, session, potentialMatch]);

  return { potentialMatch, setPotentialMatch };
};
