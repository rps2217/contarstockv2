import { LogiCountDB } from '../../db';

export class DbMigrator {
  static runMigrations(db: LogiCountDB) {
    db.version(1).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp]'
    });

    // Example of future migrations:
    // db.version(2).stores({ ... }).upgrade(tx => { ... });
    
    // Catch-all robust current schema mapping
    db.version(49).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
      expectedOrders: 'id, internalId',
      logs: '++id, level, module, timestamp',
      sync_logs: '++id, timestamp, action, tableName, status',
      settings: '&key',
      locations: '++id, &name, lastUsed',
      visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
      erpSessions: 'id, erpOrderId, status, createdAt',
      providers: '&rut, name, syncStatus',
      customers: '&id, firstName, lastName, phone, syncStatus',
      messageTemplates: 'id, name, syncStatus',
      dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
      productProviders: '++id, &productBarcode, &providerRut, isPrimary, [productBarcode+providerRut]',
      blindScans: '++id, batchId, barcode, timestamp',
      blindManifests: '++id, batchId, barcode'
    }).upgrade(tx => {
      // Enterprise migration log
      console.log('Database migrated to v49 - Added composite index for scans sync optimization');
    });
  }
}
