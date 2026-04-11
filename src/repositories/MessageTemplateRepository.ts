import { db } from '../db';
import { MessageTemplate } from '../types';

export class MessageTemplateRepository {
  static async getAll(): Promise<MessageTemplate[]> {
    return await db.messageTemplates.toArray();
  }

  static async getById(id: string): Promise<MessageTemplate | undefined> {
    return await db.messageTemplates.get(id);
  }

  static async save(template: MessageTemplate): Promise<void> {
    await db.messageTemplates.put(template);
  }

  static async delete(id: string): Promise<void> {
    await db.messageTemplates.delete(id);
  }

  // Inicializar con una plantilla por defecto si no hay ninguna
  static async initializeDefault(): Promise<void> {
    const count = await db.messageTemplates.count();
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
