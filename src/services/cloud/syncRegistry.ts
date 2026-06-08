import { getSettings } from '../settings';

/**
 * Registry for all tables that participate in synchronization.
 * Define primary keys and local/remote mappings here.
 */

// Helper to map local record to remote snake_case database row based on user-defined mappings
const mapExpiryToRemote = (record: any) => {
  const settings = getSettings();
  const mapping = settings?.cloudConfig?.mappings?.expiry || settings?.cloudConfig?.columnMapping;
  const data = record.data || {};
  
  if (!mapping) {
    return {
      ...data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    };
  }

  // Create remote object
  const remote: any = {};
  
  // Set ID column mapping
  const idCol = mapping.id || 'id';
  remote[idCol] = record.id;
  
  // Map fields that are in mapping
  const localKeys = [
    'barcode', 'productName', 'quantity', 'event', 'mm', 'yyyy', 
    'location', 'supplier', 'timestamp', 'frc', 'erp', 'traspaso', 
    'destino', 'observaciones', 'isAdjusted', 'batch', 'uniqueKey', 'claveUnica'
  ];

  localKeys.forEach(key => {
    let remoteCol = mapping[key];
    if (key === 'claveUnica' && !remoteCol) {
      remoteCol = mapping.uniqueKey || 'unique_key';
    }
    if (remoteCol && data[key] !== undefined) {
      remoteCol = String(remoteCol);
      if (key === 'quantity') {
        remote[remoteCol] = Number(data[key]);
      } else if (key === 'mm' || key === 'yyyy') {
        remote[remoteCol] = Number(data[key]);
      } else {
        remote[remoteCol] = data[key];
      }
    }
  });

  // Ensure updated_at is always set or mapped
  remote.updated_at = new Date(record.timestamp).toISOString();

  return remote;
};

// Helper to map remote snake_case database row back to local camelCase based on mappings
const mapExpiryToLocal = (remote: any) => {
  const settings = getSettings();
  const mapping = settings?.cloudConfig?.mappings?.expiry || settings?.cloudConfig?.columnMapping;
  const id = remote.id || remote.ID || (mapping?.id ? remote[mapping.id] : undefined) || 'unknown';

  if (!mapping) {
    return {
      id: String(id),
      tableName: 'VENCIMIENTOS',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced' as const
    };
  }

  // Inverse mapping: remote columns -> local keys
  const local: any = {};
  const mappingEntries = Object.entries(mapping);
  
  // Fill local keys based on remote columns
  mappingEntries.forEach(([localKey, remoteCol]) => {
    if (remoteCol && remote[remoteCol as string] !== undefined && remote[remoteCol as string] !== null) {
      if (localKey === 'quantity' || localKey === 'mm' || localKey === 'yyyy') {
        local[localKey] = Number(remote[remoteCol as string]);
      } else {
        local[localKey] = remote[remoteCol as string];
      }
    }
  });

  // Ensure essential local keys exist
  local.id = String(id);
  local.barcode = local.barcode || remote.barcode || '';
  local.quantity = Number(local.quantity || remote.quantity || 0);
  local.mm = Number(local.mm || remote.mm || 0);
  local.yyyy = Number(local.yyyy || remote.yyyy || 0);
  local.claveUnica = local.claveUnica || local.uniqueKey || remote.unique_key || remote.claveUnica || remote.clave_unica || id;

  return {
    id: String(id),
    tableName: 'VENCIMIENTOS',
    data: local,
    timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
    syncStatus: 'synced' as const
  };
};

const mapEventToRemote = (record: any) => {
  const settings = getSettings();
  const mapping = settings?.cloudConfig?.mappings?.events || settings?.cloudConfig?.columnMapping;
  const data = record.data || {};
  
  if (!mapping) {
    return {
      ...data,
      id: record.id,
      updated_at: new Date(record.timestamp).toISOString()
    };
  }

  // Create remote object
  const remote: any = {};
  
  // Set ID column mapping
  const idCol = mapping.id || 'id';
  remote[idCol] = record.id;
  
  // Map fields that are in mapping
  const localKeys = [
    'barcode', 'productName', 'quantity', 'event', 'mm', 'yyyy', 
    'location', 'supplier', 'supplierRut', 'timestamp', 'frc', 'erp', 'traspaso', 
    'destino', 'observaciones', 'isAdjusted', 'batch'
  ];

  localKeys.forEach(key => {
    const remoteCol = mapping[key];
    if (remoteCol && data[key] !== undefined) {
      if (key === 'quantity') {
        remote[String(remoteCol)] = Number(data[key]);
      } else {
        remote[String(remoteCol)] = data[key];
      }
    }
  });

  remote.updated_at = new Date(record.timestamp).toISOString();

  return remote;
};

const mapEventToLocal = (remote: any) => {
  const settings = getSettings();
  const mapping = settings?.cloudConfig?.mappings?.events || settings?.cloudConfig?.columnMapping;
  const id = remote.id || remote.ID || (mapping?.id ? remote[mapping.id] : undefined) || 'unknown';

  if (!mapping) {
    return {
      id: String(id),
      tableName: 'EVENTOS',
      data: remote,
      timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
      syncStatus: 'synced' as const
    };
  }

  const local: any = {};
  const mappingEntries = Object.entries(mapping);
  
  mappingEntries.forEach(([localKey, remoteCol]) => {
    if (remoteCol && remote[remoteCol as string] !== undefined && remote[remoteCol as string] !== null) {
      if (localKey === 'quantity') {
        local[localKey] = Number(remote[remoteCol as string]);
      } else {
        local[localKey] = remote[remoteCol as string];
      }
    }
  });

  local.id = String(id);
  local.barcode = local.barcode || remote.barcode || '';
  local.quantity = Number(local.quantity || remote.quantity || 0);

  return {
    id: String(id),
    tableName: 'EVENTOS',
    data: local,
    timestamp: remote.updated_at ? new Date(remote.updated_at).getTime() : Date.now(),
    syncStatus: 'synced' as const
  };
};

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
    mapToRemote: mapExpiryToRemote,
    mapToLocal: mapExpiryToLocal
  },
  events: {
    localTable: 'dynamic_data',
    filterField: 'tableName',
    filterValue: 'EVENTOS',
    remoteTable: 'EVENTOS',
    primaryKey: 'id',
    mapToRemote: mapEventToRemote,
    mapToLocal: mapEventToLocal
  }
};
