/**
 * DbMigrator - Migraciones de Base de Datos
 *
 * Usa DbSchema.ts como fuente de verdad para los schemas.
 */

import { LogiCountDB } from '../../db';
import { SCHEMA_V53 } from './DbSchema';

// Schema base usado en todas las versiones desde v53
const BASE_TABLES = SCHEMA_V53;

// Tablas comunes para todas las versiones desde v53
const COMMON_TABLES = [
  'products',
  'sessions',
  'scans',
  'expectedOrders',
  'logs',
  'sync_logs',
  'syncQueue',
  'settings',
  'locations',
  'visualGuides',
  'erpSessions',
  'providers',
  'customers',
  'messageTemplates',
  'dynamic_data',
  'productProviders',
  'blindScans',
  'blindManifests',
  'expirations',
  'audit_logs',
  'bulkHistory',
  'viewPreferences',
  'syncMetrics',
];

export class DbMigrator {
  static runMigrations(db: LogiCountDB) {
    // v1: Schema inicial
    db.version(1).stores({
      products: '&barcode, name, syncStatus',
      sessions:
        '&id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]',
      scans:
        '&id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp]',
    });

    // v53-v62: Schema base actual (usando DbSchema como referencia)
    db.version(53).stores(SCHEMA_V53);

    db.version(54).stores(SCHEMA_V53);

    db.version(55)
      .stores({
        ...SCHEMA_V53,
        productProviders:
          '++id, &productBarcode, &providerRut, isPrimary, syncStatus, [productBarcode+providerRut], [productBarcode+syncStatus]',
        audit_logs:
          '++id, tableName, recordId, action, userId, timestamp, synced, syncStatus, [tableName+recordId], [userId+timestamp], [tableName+syncStatus]',
      })
      .upgrade(async tx => {
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

    // v56: Agregar índices syncStatus faltantes a productProviders y audit_logs
    db.version(56)
      .stores({
        products: '&barcode, name, syncStatus',
        sessions:
          'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]',
        scans:
          'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
        expectedOrders: 'id, internalId, importedAt',
        logs: '++id, level, module, timestamp',
        sync_logs: '++id, timestamp, action, tableName, status',
        syncQueue:
          '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
        settings: '&key',
        locations: '++id, &name, lastUsed',
        visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
        erpSessions: 'id, erpOrderId, status, createdAt',
        providers: '&rut, name, syncStatus',
        customers: '&id, firstName, lastName, phone, syncStatus',
        messageTemplates: 'id, name, syncStatus',
        dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
        productProviders:
          '++id, &productBarcode, &providerRut, isPrimary, syncStatus, [productBarcode+providerRut], [productBarcode+syncStatus]',
        blindScans: '++id, batchId, barcode, timestamp',
        blindManifests: '++id, batchId, barcode',
        expirations:
          '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
        audit_logs:
          '++id, tableName, recordId, action, userId, timestamp, synced, syncStatus, [tableName+recordId], [userId+timestamp], [tableName+syncStatus]',
        bulkHistory: '++id, module, action, timestamp, undone',
        viewPreferences: '++id, module',
        syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]',
      })
      .upgrade(async tx => {
        // v56: Migrar syncStatus en productProviders si no existe
        const productProviders = await tx.table('productProviders').toArray();
        for (const pp of productProviders) {
          if (pp.syncStatus === undefined) {
            await tx.table('productProviders').update(pp.id!, { syncStatus: 'synced' });
          }
        }
        // v56: Migrar syncStatus en audit_logs si no existe
        const auditLogs = await tx.table('audit_logs').toArray();
        for (const log of auditLogs) {
          if (log.syncStatus === undefined) {
            await tx
              .table('audit_logs')
              .update(log.id!, { syncStatus: log.synced ? 'synced' : 'pending' });
          }
        }
      });

    // v57: Agregar tabla events para registro de incidencias
    db.version(57)
      .stores({
        products: '&barcode, name, syncStatus',
        sessions:
          'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]',
        scans:
          'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
        expectedOrders: 'id, internalId, importedAt',
        logs: '++id, level, module, timestamp',
        sync_logs: '++id, timestamp, action, tableName, status',
        syncQueue:
          '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
        settings: '&key',
        locations: '++id, &name, lastUsed',
        visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
        erpSessions: 'id, erpOrderId, status, createdAt',
        providers: '&rut, name, syncStatus',
        customers: '&id, firstName, lastName, phone, syncStatus',
        messageTemplates: 'id, name, syncStatus',
        dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
        productProviders:
          '++id, &productBarcode, &providerRut, isPrimary, syncStatus, [productBarcode+providerRut], [productBarcode+syncStatus]',
        events:
          '++id, type, barcode, frcNumber, status, createdAt, [type+status], [barcode+createdAt]',
        blindScans: '++id, batchId, barcode, timestamp',
        blindManifests: '++id, batchId, barcode',
        expirations:
          '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
        audit_logs:
          '++id, tableName, recordId, action, userId, timestamp, synced, syncStatus, [tableName+recordId], [userId+timestamp], [tableName+syncStatus]',
        bulkHistory: '++id, module, action, timestamp, undone',
        viewPreferences: '++id, module',
        syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]',
      })
      .upgrade(_tx => {
        // v57: Nueva tabla events - no requiere migración de datos existentes
      });

    // v58: Actualizar status de eventos (pending, destined, adjusted)
    db.version(58)
      .stores({
        products: '&barcode, name, syncStatus',
        sessions:
          'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]',
        scans:
          'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
        expectedOrders: 'id, internalId, importedAt',
        logs: '++id, level, module, timestamp',
        sync_logs: '++id, timestamp, action, tableName, status',
        syncQueue:
          '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
        settings: '&key',
        locations: '++id, &name, lastUsed',
        visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
        erpSessions: 'id, erpOrderId, status, createdAt',
        providers: '&rut, name, syncStatus',
        customers: '&id, firstName, lastName, phone, syncStatus',
        messageTemplates: 'id, name, syncStatus',
        dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
        productProviders:
          '++id, &productBarcode, &providerRut, isPrimary, syncStatus, [productBarcode+providerRut], [productBarcode+syncStatus]',
        events:
          '++id, type, barcode, frcNumber, status, createdAt, [type+status], [barcode+createdAt]',
        blindScans: '++id, batchId, barcode, timestamp',
        blindManifests: '++id, batchId, barcode',
        expirations:
          '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
        audit_logs:
          '++id, tableName, recordId, action, userId, timestamp, synced, syncStatus, [tableName+recordId], [userId+timestamp], [tableName+syncStatus]',
        bulkHistory: '++id, module, action, timestamp, undone',
        viewPreferences: '++id, module',
        syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]',
      })
      .upgrade(async tx => {
        // v58: Migrar status de eventos
        // active -> pending, resolved -> destined, dismissed -> adjusted
        const events = await tx.table('events').toArray();
        for (const event of events) {
          let newStatus: 'pending' | 'destined' | 'adjusted' = 'pending';
          if (event.status === 'resolved') newStatus = 'destined';
          else if (event.status === 'adjusted') newStatus = 'adjusted';
          // else keep as pending

          if (event.status !== newStatus) {
            await tx.table('events').update(event.id!, { status: newStatus });
          }
        }
      });

    // v59: Agregar campo traspasoNumber a eventos
    db.version(59)
      .stores({
        products: '&barcode, name, syncStatus',
        sessions:
          'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]',
        scans:
          'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
        expectedOrders: 'id, internalId, importedAt',
        logs: '++id, level, module, timestamp',
        sync_logs: '++id, timestamp, action, tableName, status',
        syncQueue:
          '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
        settings: '&key',
        locations: '++id, &name, lastUsed',
        visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
        erpSessions: 'id, erpOrderId, status, createdAt',
        providers: '&rut, name, syncStatus',
        customers: '&id, firstName, lastName, phone, syncStatus',
        messageTemplates: 'id, name, syncStatus',
        dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
        productProviders:
          '++id, &productBarcode, &providerRut, isPrimary, syncStatus, [productBarcode+providerRut], [productBarcode+syncStatus]',
        events:
          '++id, type, barcode, frcNumber, status, createdAt, [type+status], [barcode+createdAt]',
        blindScans: '++id, batchId, barcode, timestamp',
        blindManifests: '++id, batchId, barcode',
        expirations:
          '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
        audit_logs:
          '++id, tableName, recordId, action, userId, timestamp, synced, syncStatus, [tableName+recordId], [userId+timestamp], [tableName+syncStatus]',
        bulkHistory: '++id, module, action, timestamp, undone',
        viewPreferences: '++id, module',
        syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]',
      })
      .upgrade(_tx => {
        // v59: Campo traspasoNumber agregado (opcional, Dexie lo maneja automáticamente)
      });

    // v60: Agregar índice syncStatus a tabla events para sincronización bidireccional
    db.version(60)
      .stores({
        products: '&barcode, name, syncStatus',
        sessions:
          'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]',
        scans:
          'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
        expectedOrders: 'id, internalId, importedAt',
        logs: '++id, level, module, timestamp',
        sync_logs: '++id, timestamp, action, tableName, status',
        syncQueue:
          '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
        settings: '&key',
        locations: '++id, &name, lastUsed',
        visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
        erpSessions: 'id, erpOrderId, status, createdAt',
        providers: '&rut, name, syncStatus',
        customers: '&id, firstName, lastName, phone, syncStatus',
        messageTemplates: 'id, name, syncStatus',
        dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
        productProviders:
          '++id, &productBarcode, &providerRut, isPrimary, syncStatus, [productBarcode+providerRut], [productBarcode+syncStatus]',
        events:
          '++id, type, barcode, frcNumber, status, createdAt, syncStatus, [type+status], [barcode+createdAt], [syncStatus+createdAt]',
        blindScans: '++id, batchId, barcode, timestamp',
        blindManifests: '++id, batchId, barcode',
        expirations:
          '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
        audit_logs:
          '++id, tableName, recordId, action, userId, timestamp, synced, syncStatus, [tableName+recordId], [userId+timestamp], [tableName+syncStatus]',
        bulkHistory: '++id, module, action, timestamp, undone',
        viewPreferences: '++id, module',
        syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]',
      })
      .upgrade(async tx => {
        // v60: Agregar syncStatus a eventos existentes con valor 'synced' por defecto
        const events = await tx.table('events').toArray();
        for (const event of events) {
          if (event.syncStatus === undefined) {
            await tx.table('events').update(event.id!, {
              syncStatus: 'synced',
              lastSyncTimestamp: Date.now(),
            });
          }
        }
      });

    // v61: Agregar tabla deletedEvents para registrar eventos eliminados localmente
    db.version(61).stores({
      products: '&barcode, name, syncStatus',
      sessions:
        'id, status, createdAt, erpOrder, logisticsLabel, sessionType, auditStatus, lastSyncTimestamp, mm, yyyy, batch, photoUrl, syncStatus, expectedItems, [erpOrder+createdAt], [status+lastSyncTimestamp]',
      scans:
        'id, sessionId, barcode, logisticsLabel, timestamp, synced, isIncident, expiryDate, mm, yyyy, batch, quantity, syncStatus, [sessionId+synced], [sessionId+barcode], [sessionId+logisticsLabel], [sessionId+timestamp], [synced+mm+yyyy]',
      expectedOrders: 'id, internalId, importedAt',
      logs: '++id, level, module, timestamp',
      sync_logs: '++id, timestamp, action, tableName, status',
      syncQueue:
        '++id, tableName, operation, recordId, timestamp, retries, priority, [tableName+operation]',
      settings: '&key',
      locations: '++id, &name, lastUsed',
      visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
      erpSessions: 'id, erpOrderId, status, createdAt',
      providers: '&rut, name, syncStatus',
      customers: '&id, firstName, lastName, phone, syncStatus',
      messageTemplates: 'id, name, syncStatus',
      dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
      productProviders:
        '++id, &productBarcode, &providerRut, isPrimary, syncStatus, [productBarcode+providerRut], [productBarcode+syncStatus]',
      events:
        '++id, type, barcode, frcNumber, status, createdAt, syncStatus, [type+status], [barcode+createdAt], [syncStatus+createdAt]',
      deletedEvents: '++id, &eventKey, barcode, frcNumber, deletedAt, synced, [barcode+frcNumber]',
      blindScans: '++id, batchId, barcode, timestamp',
      blindManifests: '++id, batchId, barcode',
      expirations:
        '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
      audit_logs:
        '++id, tableName, recordId, action, userId, timestamp, synced, syncStatus, [tableName+recordId], [userId+timestamp], [tableName+syncStatus]',
      bulkHistory: '++id, module, action, timestamp, undone',
      viewPreferences: '++id, module',
      syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]',
    });

    // v62: Índices compuestos optimizados + tabla sessionLocks
    db.version(62).stores({
      products: '&barcode, name, syncStatus, category, [category+name]',
      sessions: `
        &id, 
        status, 
        createdAt, 
        erpOrder, 
        logisticsLabel, 
        sessionType, 
        auditStatus,
        lastSyncTimestamp,
        operatorId,
        mm, 
        yyyy, 
        batch, 
        photoUrl, 
        syncStatus,
        expectedItems,
        [sessionType+status],
        [sessionType+createdAt],
        [status+createdAt],
        [erpOrder+createdAt],
        [operatorId+createdAt],
        [mm+yyyy]
      `,
      scans: `
        &id,
        sessionId,
        barcode,
        logisticsLabel,
        timestamp,
        synced,
        isIncident,
        expiryDate,
        mm,
        yyyy,
        batch,
        quantity,
        syncStatus,
        [sessionId+barcode],
        [sessionId+timestamp],
        [synced+mm+yyyy],
        [barcode+mm]
      `,
      expectedOrders: 'id, internalId, importedAt',
      logs: '++id, level, module, timestamp',
      sync_logs: '++id, timestamp, action, tableName, status',
      syncQueue:
        '++id, tableName, operation, recordId, timestamp, status, priority, [tableName+operation], [status+priority]',
      settings: '&key',
      locations: '++id, &name, lastUsed',
      visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
      erpSessions: 'id, erpOrderId, status, createdAt',
      providers: '&rut, name, syncStatus',
      customers: '&id, firstName, lastName, phone, syncStatus',
      messageTemplates: 'id, name, syncStatus',
      dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
      productProviders:
        '++id, &productBarcode, &providerRut, isPrimary, syncStatus, [productBarcode+providerRut], [productBarcode+syncStatus]',
      events:
        '++id, type, barcode, frcNumber, status, createdAt, syncStatus, [type+status], [barcode+createdAt], [syncStatus+createdAt]',
      deletedEvents: '++id, &eventKey, barcode, frcNumber, deletedAt, synced, [barcode+frcNumber]',
      blindScans: '++id, batchId, barcode, timestamp',
      blindManifests: '++id, batchId, barcode',
      expirations:
        '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
      audit_logs:
        '++id, tableName, recordId, action, userId, timestamp, synced, syncStatus, [tableName+recordId], [userId+timestamp], [tableName+syncStatus]',
      bulkHistory: '++id, module, action, timestamp, undone',
      viewPreferences: '++id, module',
      syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]',
      // Nueva tabla para locks de sesiones
      sessionLocks: '&sessionId, lockedBy, expiresAt, [lockedBy+expiresAt]',
    });

    // v63: Tabla de snapshots para versionamiento
    db.version(63).stores({
      products: '&barcode, name, syncStatus, category, [category+name]',
      sessions: `
        &id, 
        status, 
        createdAt, 
        erpOrder, 
        logisticsLabel, 
        sessionType, 
        auditStatus,
        lastSyncTimestamp,
        operatorId,
        mm, 
        yyyy, 
        batch, 
        photoUrl, 
        syncStatus,
        expectedItems,
        [sessionType+status],
        [sessionType+createdAt],
        [status+createdAt],
        [erpOrder+createdAt],
        [operatorId+createdAt],
        [mm+yyyy]
      `,
      scans: `
        &id,
        sessionId,
        barcode,
        logisticsLabel,
        timestamp,
        synced,
        isIncident,
        expiryDate,
        mm,
        yyyy,
        batch,
        quantity,
        syncStatus,
        [sessionId+barcode],
        [sessionId+timestamp],
        [synced+mm+yyyy],
        [barcode+mm]
      `,
      expectedOrders: 'id, internalId, importedAt',
      logs: '++id, level, module, timestamp',
      sync_logs: '++id, timestamp, action, tableName, status',
      syncQueue:
        '++id, tableName, operation, recordId, timestamp, status, priority, [tableName+operation], [status+priority]',
      settings: '&key',
      locations: '++id, &name, lastUsed',
      visualGuides: 'id, guideNumber, erpOrderId, status, createdAt',
      erpSessions: 'id, erpOrderId, status, createdAt',
      providers: '&rut, name, syncStatus',
      customers: '&id, firstName, lastName, phone, syncStatus',
      messageTemplates: 'id, name, syncStatus',
      dynamic_data: 'id, tableName, timestamp, syncStatus, [tableName+syncStatus]',
      productProviders:
        '++id, &productBarcode, &providerRut, isPrimary, syncStatus, [productBarcode+providerRut], [productBarcode+syncStatus]',
      events:
        '++id, type, barcode, frcNumber, status, createdAt, syncStatus, [type+status], [barcode+createdAt], [syncStatus+createdAt]',
      deletedEvents: '++id, &eventKey, barcode, frcNumber, deletedAt, synced, [barcode+frcNumber]',
      blindScans: '++id, batchId, barcode, timestamp',
      blindManifests: '++id, batchId, barcode',
      expirations:
        '++id, &claveUnica, barcode, mm, yyyy, status, timestamp, syncStatus, [mm+yyyy], [barcode+mm+yyyy]',
      audit_logs:
        '++id, tableName, recordId, action, userId, timestamp, synced, syncStatus, [tableName+recordId], [userId+timestamp], [tableName+syncStatus]',
      bulkHistory: '++id, module, action, timestamp, undone',
      viewPreferences: '++id, module',
      syncMetrics: '++id, timestamp, tableName, operation, [timestamp+tableName]',
      sessionLocks: '&sessionId, lockedBy, expiresAt, [lockedBy+expiresAt]',
      // Nueva tabla para snapshots de versionamiento
      snapshots:
        '&id, tableName, recordId, version, type, createdAt, createdBy, [tableName+recordId], [recordId+createdAt]',
    });
  }
}
