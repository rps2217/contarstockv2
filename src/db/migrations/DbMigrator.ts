import { LogiCountDB } from '../../db';

export class DbMigrator {
  static runMigrations(db: LogiCountDB) {
    db.version(1).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp]'
    });

    // v53: Schema base actual
    db.version(53).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
      expectedOrders: 'id, internalId, importedAt',
      logs: '++id, level, module, timestamp',
      sync_logs: '++id, timestamp, action, tableName, status',
      syncQueue: '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
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
      blindManifests: '++id, batchId, barcode',
      expirations: '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
      audit_logs: '++id, tableName, recordId, action, userId, timestamp, synced, [tableName+recordId], [userId+timestamp]',
      bulkHistory: '++id, module, action, timestamp, undone',
      viewPreferences: '++id, module',
      syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]'
    }).upgrade(_tx => {
      // v53: Schema base
    });

    // v54: Agregar bulkHistory y viewPreferences
    db.version(54).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
      expectedOrders: 'id, internalId, importedAt',
      logs: '++id, level, module, timestamp',
      sync_logs: '++id, timestamp, action, tableName, status',
      syncQueue: '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
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
      blindManifests: '++id, batchId, barcode',
      expirations: '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
      audit_logs: '++id, tableName, recordId, action, userId, timestamp, synced, [tableName+recordId], [userId+timestamp]',
      bulkHistory: '++id, module, action, timestamp, undone',
      viewPreferences: '++id, module',
      syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]'
    }).upgrade(_tx => {
      // v54: bulkHistory and viewPreferences tables added
    });

    // v55: Agregar withdrawalDays y hasExchange a providers
    db.version(55).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
      expectedOrders: 'id, internalId, importedAt',
      logs: '++id, level, module, timestamp',
      sync_logs: '++id, timestamp, action, tableName, status',
      syncQueue: '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
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
      blindManifests: '++id, batchId, barcode',
      expirations: '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
      audit_logs: '++id, tableName, recordId, action, userId, timestamp, synced, [tableName+recordId], [userId+timestamp]',
      bulkHistory: '++id, module, action, timestamp, undone',
      viewPreferences: '++id, module',
      syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]'
    }).upgrade(async (tx) => {
      // v55: Agregar valores por defecto a proveedores existentes
      const providers = await tx.table('providers').toArray();
      for (const provider of providers) {
        if (provider.withdrawalDays === undefined) {
          provider.withdrawalDays = 30;
        }
        if (provider.hasExchange === undefined) {
          provider.hasExchange = true;
        }
        await tx.table('providers').put(provider);
      }
    });
  }
}
