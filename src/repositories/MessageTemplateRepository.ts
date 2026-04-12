import { db, DynamicRecord } from '../db';
import { MessageTemplate } from '../types';
import { dynamicDataService } from '../services/dynamicDataService';

export class MessageTemplateRepository {
  private static tableName = 'PLANTILLAS_MENSAJES';

  static async getAll(): Promise<MessageTemplate[]> {
    const records = await db.dynamic_data
      .where('tableName')
      .equals(this.tableName)
      .toArray();
    
    return records
      .filter(r => r.syncStatus !== 'pending_delete')
      .map(r => this.mapToTemplate(r))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  static async getById(id: string): Promise<MessageTemplate | undefined> {
    const record = await db.dynamic_data.get(id);
    if (!record || record.tableName !== this.tableName || record.syncStatus === 'pending_delete') return undefined;
    return this.mapToTemplate(record);
  }

  static async save(template: MessageTemplate): Promise<void> {
    await dynamicDataService.saveRecord(this.tableName, template, template.id);
  }

  static async delete(id: string): Promise<void> {
    await dynamicDataService.deleteRecord(id);
  }

  private static mapToTemplate(record: DynamicRecord): MessageTemplate {
    return {
      ...record.data,
      id: record.id,
      updatedAt: record.timestamp
    } as MessageTemplate;
  }

  // Inicializar con una plantilla por defecto si no hay ninguna
  static async initializeDefault(): Promise<void> {
    const count = await db.dynamic_data.where('tableName').equals(this.tableName).count();
    if (count === 0) {
      await this.save({
        id: crypto.randomUUID(),
        name: 'Aviso de Retiro (Por Defecto)',
        content: 'Hola {{nombre}} {{apellido}}, te avisamos que tus productos comprados ya están listos para ser retirados.',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }
  }
}
