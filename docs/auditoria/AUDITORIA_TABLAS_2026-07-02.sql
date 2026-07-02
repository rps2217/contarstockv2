-- =============================================================================
-- AUDITORÍA COMPLETA DE TABLAS SUPABASE - ContarStock v2
-- Fecha: 2026-07-02
-- =============================================================================

-- =============================================================================
-- 1. VERIFICAR EXISTENCIA DE TODAS LAS TABLAS
-- =============================================================================
SELECT 'VERIFICANDO EXISTENCIA DE TABLAS...' as accion;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- =============================================================================
-- 2. AUDITORÍA DE CADA TABLA - COLUMNAS
-- =============================================================================

-- 2.1 PRODUCTOS
-- Requerido por: syncRegistry.products
-- Columnas esperadas: barcode, name, category, supplierRut, supplier, unitsPerBox, updated_at
SELECT '--- PRODUCTOS ---' as tabla;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'PRODUCTOS' 
ORDER BY ordinal_position;

-- 2.2 PROVEEDORES  
-- Requerido por: syncRegistry.providers
-- Columnas esperadas: rut, name, withdrawal_days, has_exchange, exchange_policy, updated_at
SELECT '--- PROVEEDORES ---' as tabla;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'PROVEEDORES' 
ORDER BY ordinal_position;

-- 2.3 PRODUCTO_PROVEEDOR
-- Requerido por: syncRegistry.productProviders
-- Columnas esperadas: id, product_barcode, provider_rut, is_primary, has_exchange, withdrawal_days, exchange_policy, mundo, marca
SELECT '--- PRODUCTO_PROVEEDOR ---' as tabla;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'PRODUCTO_PROVEEDOR' 
ORDER BY ordinal_position;

-- 2.4 VENCIMIENTOS
-- Requerido por: syncRegistry.expiry (usa dynamic_data con filtro tableName='VENCIMIENTOS')
-- Columnas esperadas: id, barcode, product_name, provider_name, mm, yyyy, quantity, location, observaciones, clave_unica, withdrawal_days, has_canje, sync_status, updated_at
SELECT '--- VENCIMIENTOS ---' as tabla;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'VENCIMIENTOS' 
ORDER BY ordinal_position;

-- 2.5 SESSIONS
-- Requerido por: syncRegistry.sessions
-- Columnas esperadas: id, status, created_at, erp_order, logistics_label, session_type, audit_status, photo_url, mm, yyyy, batch, last_sync
SELECT '--- SESSIONS ---' as tabla;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'SESSIONS' 
ORDER BY ordinal_position;

-- 2.6 SCANS
-- Requerido por: syncRegistry.scans
-- Columnas esperadas: id, session_id, barcode, logistics_label, timestamp, is_incident, expiry_date, batch, quantity, mm, yyyy
SELECT '--- SCANS ---' as tabla;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'SCANS' 
ORDER BY ordinal_position;

-- 2.7 EVENTOS
-- Requerido por: syncRegistry.events
-- Columnas esperadas: id, barcode, product_name, provider_name, event, quantity, location, frc, n_guia, destino, traspaso, observaciones, timestamp, clave_unica, is_adjusted, updated_at
SELECT '--- EVENTOS ---' as tabla;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'EVENTOS' 
ORDER BY ordinal_position;

-- 2.8 CLIENTES
-- Requerido por: syncRegistry.customers
-- Columnas esperadas: id, first_name, last_name, phone, email, address, rut, created_at, updated_at
SELECT '--- CLIENTES ---' as tabla;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'CLIENTES' 
ORDER BY ordinal_position;

-- 2.9 AUDIT_LOGS
-- Requerido por: syncRegistry.auditLogs
-- Columnas esperadas: id, table_name, record_id, action, field_name, old_value, new_value, user_id, device_info, timestamp, synced
SELECT '--- AUDIT_LOGS ---' as tabla;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'AUDIT_LOGS' 
ORDER BY ordinal_position;

-- 2.10 PEDIDOS
SELECT '--- PEDIDOS ---' as tabla;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'PEDIDOS' 
ORDER BY ordinal_position;

-- =============================================================================
-- 3. VERIFICAR CLAVES PRIMARIAS
-- =============================================================================
SELECT '--- CLAVES PRIMARIAS ---' as verificacion;
SELECT tc.table_name, tc.constraint_name, kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- =============================================================================
-- 4. VERIFICAR FILAS POR TABLA
-- =============================================================================
SELECT '--- CANTIDAD DE REGISTROS ---' as verificacion;
SELECT 'PRODUCTOS' as tabla, COUNT(*) as cantidad FROM PRODUCTOS
UNION ALL SELECT 'PROVEEDORES', COUNT(*) FROM PROVEEDORES
UNION ALL SELECT 'PRODUCTO_PROVEEDOR', COUNT(*) FROM PRODUCTO_PROVEEDOR
UNION ALL SELECT 'VENCIMIENTOS', COUNT(*) FROM VENCIMIENTOS
UNION ALL SELECT 'SESSIONS', COUNT(*) FROM SESSIONS
UNION ALL SELECT 'SCANS', COUNT(*) FROM SCANS
UNION ALL SELECT 'EVENTOS', COUNT(*) FROM EVENTOS
UNION ALL SELECT 'CLIENTES', COUNT(*) FROM CLIENTES
UNION ALL SELECT 'AUDIT_LOGS', COUNT(*) FROM AUDIT_LOGS
UNION ALL SELECT 'PEDIDOS', COUNT(*) FROM PEDIDOS
UNION ALL SELECT 'TELEMETRIA', COUNT(*) FROM TELEMETRIA
ORDER BY tabla;

-- =============================================================================
-- 5. RLS (Row Level Security) - Verificar si está habilitado
-- =============================================================================
SELECT '--- RLS STATUS ---' as verificacion;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- =============================================================================
-- FIN DE AUDITORÍA
-- =============================================================================
