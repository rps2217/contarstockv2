
import { db } from '../db';
import { MessageTemplateRepository } from '../repositories/MessageTemplateRepository';
import { logger } from './logger';
import { supabaseSyncService } from './supabaseSyncService';
import { MessageTemplate } from '../types';

export class TemplateSyncService {
  private unsubMensajes: (() => void) | null = null;
  private unsubCorreos: (() => void) | null = null;
  private tableMensajes = 'PLANTILLAS_MENSAJES';
  private tableCorreos = 'PLANTILLAS_CORREOS';

  startSync() {
    this.stopSync();

    // Usar Supabase para sincronización en tiempo real - Mensajes
    this.unsubMensajes = supabaseSyncService.startSync(this.tableMensajes, {
      put: async (data: any) => {
        const local = await db.dynamic_data.get(data.id);
        if (local?.syncStatus !== 'pending_delete' && local?.syncStatus !== 'pending') {
          await db.dynamic_data.put({
            id: data.id,
            tableName: this.tableMensajes,
            data: data,
            timestamp: data.updatedAt || Date.now(),
            syncStatus: 'synced'
          });
        }
      },
      delete: async (id: string) => {
        await db.dynamic_data.delete(id);
      }
    });

    // Usar Supabase para sincronización en tiempo real - Correos
    this.unsubCorreos = supabaseSyncService.startSync(this.tableCorreos, {
      put: async (data: any) => {
        const local = await db.dynamic_data.get(data.id);
        if (local?.syncStatus !== 'pending_delete' && local?.syncStatus !== 'pending') {
          await db.dynamic_data.put({
            id: data.id,
            tableName: this.tableCorreos,
            data: data,
            timestamp: data.updatedAt || Date.now(),
            syncStatus: 'synced'
          });
        }
      },
      delete: async (id: string) => {
        await db.dynamic_data.delete(id);
      }
    });

    logger.info('TEMPLATE_SYNC', `Real-time sync for templates started via Supabase`);
  }

  stopSync() {
    if (this.unsubMensajes) {
      this.unsubMensajes();
      this.unsubMensajes = null;
    }
    if (this.unsubCorreos) {
      this.unsubCorreos();
      this.unsubCorreos = null;
    }
  }
}


export const templateSyncService = new TemplateSyncService();
