
import { db } from '../db';
import { MessageTemplateRepository } from '../repositories/MessageTemplateRepository';
import { logger } from './logger';
import { supabaseSyncService } from './supabaseSyncService';
import { MessageTemplate } from '../types';

export class TemplateSyncService {
  private unsubscribe: (() => void) | null = null;
  private tableName = 'PLANTILLAS_MENSAJES';

  startSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    // Usar Supabase para sincronización en tiempo real
    this.unsubscribe = supabaseSyncService.startSync(this.tableName, {
      put: async (data: any) => {
        const template = data as MessageTemplate;
        const local = await db.dynamic_data.get(template.id);
        if (local?.syncStatus !== 'pending_delete') {
          await MessageTemplateRepository.save({ ...template });
        }
      },
      delete: async (id: string) => {
        await db.dynamic_data.delete(id);
      }
    });

    logger.info('TEMPLATE_SYNC', `Real-time sync for ${this.tableName} started via Supabase`);
    return this.unsubscribe;
  }

  stopSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const templateSyncService = new TemplateSyncService();
