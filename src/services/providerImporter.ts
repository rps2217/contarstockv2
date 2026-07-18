import { logger } from '@/services/logger';
import Papa from 'papaparse';
import { Provider } from '../types';
import { ProviderRepository } from '../repositories/ProviderRepository';
import { normalizeIdentity } from '@/lib/normalize';

export const bulkImportProviders = async (csvText: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: async results => {
        try {
          const providers: Provider[] = [];

          for (const row of results.data as any[]) {
            // Find appropriate fields dynamically ignoring case and spaces
            const getField = (keys: string[]) => {
              const rowKeys = Object.keys(row);
              for (const k of keys) {
                const found = rowKeys.find(rk => rk.toLowerCase().trim() === k.toLowerCase());
                if (found && row[found] !== undefined) return String(row[found]).trim();
              }
              return null;
            };

            let rut = getField(['id_rut', 'rut', 'id rut', 'rut proveedor', 'id']) || '';
            rut = rut
              .trim()
              .replace(/[^0-9Kk-]/g, '')
              .toUpperCase();

            let name = getField(['nombre proveedor', 'nombre', 'proveedor', 'razon social']) || '';
            name = name.toUpperCase();

            // Skip invalid
            if (!name) continue;

            if (!rut) {
              rut = 'RUT_NR_' + name.replace(/[^A-Z0-9]/g, '_').substring(0, 15);
            }

            const estado = getField(['estado']) || '';
            // If the provider is 'Eliminado', maybe still import but leave as no exchange or delete?
            // We'll just import whatever hasExchange is.

            const canjeVal = getField([
              'canje sólo por vencimiento',
              'canje solo por vencimiento',
              'canje',
              'politica de canje',
            ]);
            const retiroVal = getField([
              'retiro (días)',
              'retiro (dias)',
              'retiro dias',
              'dias retiro',
              'retiro',
              'días de anticipación',
              'dias',
            ]);
            const bodegaVal = getField([
              'bodega sólo por vencimiento',
              'bodega solo por vencimiento',
              'bodega sólo por vencimient',
              'bodega',
            ]);

            let hasExchange = true;
            let withdrawalDays = 90; // Default
            let exchangePolicy = '';

            const canjeLower = (canjeVal || '').toLowerCase();
            if (canjeLower.includes('sin canje') || canjeLower === 'no' || canjeLower === 'false') {
              hasExchange = false;
              withdrawalDays = 0;
              exchangePolicy = 'SIN CANJE';
            } else {
              hasExchange = true;
              if (canjeVal && !isNaN(Number(canjeVal))) {
                exchangePolicy = `Canje Venc: ${canjeVal}D`;
              }
            }

            if (retiroVal !== null && retiroVal !== '' && !isNaN(Number(retiroVal))) {
              withdrawalDays = parseInt(retiroVal, 10);
            } else if (
              canjeVal &&
              canjeVal !== '' &&
              !isNaN(Number(canjeVal)) &&
              withdrawalDays === 90
            ) {
              // Si retiro no viene pero canje sí es número, asumimos canje como días de retiro
              withdrawalDays = parseInt(canjeVal, 10);
            }

            if (bodegaVal) {
              exchangePolicy += exchangePolicy ? ` | Bodega: ${bodegaVal}` : `Bodega: ${bodegaVal}`;
            }
            if (estado) {
              exchangePolicy += ` | Est: ${estado}`;
            }

            providers.push({
              rut,
              name,
              hasExchange,
              withdrawalDays,
              exchangePolicy,
            });
          }

          // Dedup providers
          const uniqueProviders = new Map<string, Provider>();
          for (const p of providers) {
            uniqueProviders.set(p.rut, p);
          }

          const arrayToSave = Array.from(uniqueProviders.values());
          if (arrayToSave.length > 0) {
            const { db } = await import('../db');
            await db.providers.bulkPut(arrayToSave);
          }

          resolve(arrayToSave.length);
        } catch (err: unknown) {
          logger.error(
            'providerImporter',
            'Error bulk saving providers',
            err instanceof Error ? err.message : String(err)
          );
          reject(err);
        }
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
};
