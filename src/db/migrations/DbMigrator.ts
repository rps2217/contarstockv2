import { LogiCountDB } from '../../db';

export class DbMigrator {
  static runMigrations(db: LogiCountDB) {
    db.version(1).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp]'
    });

    // Example of future migrations:
    // db.version(2).stores({ ... }).upgrade(tx => { ... });
    
    // v53: Schema base actual
    db.version(53).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
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
      blindManifests: '++id, batchId, barcode',
      // Vencimientos - Índice único en claveUnica para evitar duplicados
      expirations: '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
      // Audit Log - Sistema de trazabilidad estilo AppSheet
      audit_logs: '++id, tableName, recordId, action, userId, timestamp, synced, [tableName+recordId], [userId+timestamp]',
      // Sync Metrics - Métricas de sincronización (v53)
      syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]'
    }).upgrade(_tx => {
      // Migration completed successfully
    });

    // v54: Agregar índice importedAt para expectedOrders (queries en HammerPage)
    db.version(54).stores({
      products: '&barcode, name, syncStatus', 
      sessions: 'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]', 
      scans: 'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
      expectedOrders: 'id, internalId, importedAt',
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
      blindManifests: '++id, batchId, barcode',
      expirations: '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
      audit_logs: '++id, tableName, recordId, action, userId, timestamp, synced, [tableName+recordId], [userId+timestamp]',
      syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]'
    }).upgrade(_tx => {
      // Migration: índice importedAt agregado a expectedOrders
    });
  }
}
