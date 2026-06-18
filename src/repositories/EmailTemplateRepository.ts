import { dynamicDataService } from '../services/dynamicDataService';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  to: string;
  module?: 'expiry' | 'events';
}

export class EmailTemplateRepository {
  private static tableName = 'PLANTILLAS_CORREOS';

  static async getAll(module?: 'expiry' | 'events'): Promise<EmailTemplate[]> {
    const records = await dynamicDataService.getRecordsByTable(this.tableName);
    const templates = records.map(r => r.data as EmailTemplate);
    if (module) {
        return templates.filter(t => t.module === module || !t.module);
    }
    return templates;
  }

  static async save(template: EmailTemplate): Promise<void> {
    await dynamicDataService.saveRecord(this.tableName, template as unknown as Record<string, unknown>, template.id);
  }

  static async delete(id: string): Promise<void> {
    await dynamicDataService.deleteRecord(id);
  }
}
