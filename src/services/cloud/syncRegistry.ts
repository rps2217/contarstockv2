/**
 * Registry for all tables that participate in synchronization.
 * Define primary keys and local/remote mappings here.
 */

export interface TableSyncMeta {
  localTable: string;
  remoteTable: string;
  primaryKey: string;
  filterField?: string;
  filterValue?: string;
  isDynamic?: boolean;
  mapToRemote?: (local: any) => any;
  mapToLocal?: (remote: any) => any;
}

export const syncRegistry: Record<string, TableSyncMeta> = {
  products: {
    localTable: 'products',
    remoteTable: 'PRODUCTOS',
    primaryKey: 'barcode',
    mapToRemote: (p) => ({
      barcode: p.barcode,
      name: p.name,
      category: p.category || 'GENERAL',
      supplier_rut: p.supplierRut || null,
      supplier: p.supplier || '', // Cache for faster queries in Supabase
      price: Number(p.price) || 0,
      units_per_box: Number(p.unitsPerBox) || 1,
      updated_at: new Date().toISOString()
    }),
    mapToLocal: (remote) => ({
      barcode: remote.barcode,
      name: remote.name,
      category: remote.category,
      supplierRut: remote.supplier_rut || remote.supplierrut,
      supplier: remote.supplier,
      price: Number(remote.price) || 0,
      unitsPerBox: Number(remote.units_per_box) || Number(remote.unitsPerBox) || 1,
      syncStatus: 'synced',
      updatedAt: (remote.updated_at || remote.updatedat) ? new Date(remote.updated_at || remote.updatedat).getTime() : Date.now()
    })
  },
  sessions: {
    localTable: 'sessions',
    remoteTable: 'SESSIONS',
    primaryKey: 'id',
    mapToRemote: (s) => ({
      id: s.id,
      status: s.status,
      created_at: new Date(s.createdAt).toISOString(),
      erp_order: s.erpOrder || '',
      logistics_label: s.logisticsLabel || '',
      session_type: s.sessionType || 'standard',
      audit_status: s.auditStatus || 'pending',
      photo_url: s.photoUrl || '',
      mm: s.mm || new Date().getMonth() + 1,
      yyyy: s.yyyy || new Date().getFullYear(),
      batch: s.batch || '',
      last_sync: new Date().toISOString()
    })
  },
  scans: {
    localTable: 'scans',
    remoteTable: 'SCANS',
    primaryKey: 'id',
    mapToRemote: (s) => ({
      id: s.id,
      session_id: s.sessionId,
      barcode: s.barcode,
      logistics_label: s.logisticsLabel || '',
      timestamp: new Date(s.timestamp).toISOString(),
      is_incident: s.isIncident || false,
      expiry_date: s.expiryDate || null,
      batch: s.batch || '',
      quantity: s.quantity || 1,
      mm: s.mm || new Date().getMonth() + 1,
      yyyy: s.yyyy || new Date().getFullYear()
    })
  },
  providers: {
    localTable: 'providers',
    remoteTable: 'PROVEEDORES',
    primaryKey: 'rut',
    mapToRemote: (p) => ({
      rut: p.rut,
      name: p.name,
      withdrawal_days: Number(p.withdrawalDays) || 30,
      has_exchange: Boolean(p.hasExchange),
      exchange_policy: p.exchangePolicy || '',
      updated_at: new Date().toISOString()
    }),
    mapToLocal: (remote) => ({
      rut: remote.rut,
      name: remote.name,
      withdrawalDays: Number(remote.withdrawal_days || remote.withdrawaldays || remote.withdrawalDays || 30),
      hasExchange: Boolean(remote.has_exchange || remote.hasexchange || remote.hasExchange),
      exchangePolicy: remote.exchange_policy || remote.exchangepolicy || remote.exchangePolicy || '',
      syncStatus: 'synced',
      updatedAt: (remote.updated_at || remote.updatedat) ? new Date(remote.updated_at || remote.updatedat).getTime() : Date.now()
    })
  },
  customers: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'CLIENTES',
    remoteTable: 'CLIENTES',
    primaryKey: 'id',
    mapToRemote: (record) => ({
      ...record.data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      tableName: 'CLIENTES',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced'
    })
  },
  messageTemplates: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'MESSAGE_TEMPLATES',
    remoteTable: 'MESSAGE_TEMPLATES',
    primaryKey: 'id',
    mapToRemote: (record) => ({
      ...record.data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      tableName: 'MESSAGE_TEMPLATES',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced'
    })
  },
  emailTemplates: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'PLANTILLAS_CORREOS',
    remoteTable: 'PLANTILLAS_CORREOS',
    primaryKey: 'id',
    mapToRemote: (record) => ({
      ...record.data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      tableName: 'PLANTILLAS_CORREOS',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced'
    })
  },
  expiry: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'VENCIMIENTOS',
    remoteTable: 'VENCIMIENTOS',
    primaryKey: 'id',
    mapToRemote: (record) => ({
      ...record.data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      tableName: 'VENCIMIENTOS',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced'
    })
  },
  events: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'EVENTOS',
    remoteTable: 'EVENTOS',
    primaryKey: 'id',
    mapToRemote: (record) => ({
      ...record.data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    }),
    mapToLocal: (remote) => ({
      id: remote.id,
      tableName: 'EVENTOS',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced'
    })
  }
};
