
import { ExpectedOrder, ConsolidatedItem, MatchResult } from '../types';
import { ExpectedOrderRepository } from '../repositories/ExpectedOrderRepository';

/**
 * DETECTIVE SERVICE: El cerebro que vincula bultos ciegos con órdenes ERP.
 */
export class DetectiveService {
  private static worker: Worker | null = null;

  private static getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/detective.worker.ts', import.meta.url), {
        type: 'module'
      });
    }
    return this.worker;
  }

  /**
   * Busca en el repositorio local qué órdenes se parecen más a lo que se contó.
   */
  static async findMatchingOrders(physicalItems: ConsolidatedItem[]): Promise<MatchResult[]> {
    const allOrders = await ExpectedOrderRepository.getAll();
    if (allOrders.length === 0) return [];

    const worker = this.getWorker();

    return new Promise((resolve, reject) => {
      const handler = (e: MessageEvent) => {
        worker.removeEventListener('message', handler);
        if (e.data.success) {
          resolve(e.data.results);
        } else {
          reject(new Error(e.data.error));
        }
      };

      worker.addEventListener('message', handler);
      worker.postMessage({
        physicalItems,
        expectedOrders: allOrders
      });
    });
  }
}
