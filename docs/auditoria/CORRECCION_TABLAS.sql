-- =============================================================================
-- CORRECCIÓN DE ESTRUCTURAS DE TABLAS SUPABASE
-- Fecha: 2026-07-02
-- Tablas: VENCIMIENTOS, CLIENTES, VISTA_SYNC_STATUS
-- =============================================================================

-- =============================================================================
-- 1. CREAR/MIGRAR TABLA VENCIMIENTOS
-- =============================================================================

-- Verificar si la tabla existe y tiene datos
-- SELECT COUNT(*) FROM VENCIMIENTOS; -- Currently: 0 rows

-- Crear tabla VENCIMIENTOS con estructura correcta
-- Requerido por: syncRegistry.expiry (dynamic_data con filtro tableName='VENCIMIENTOS')

CREATE TABLE IF NOT EXISTS VENCIMIENTOS (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(50) NOT NULL,
    product_name VARCHAR(255),
    product_name_upper VARCHAR(255),
    provider_name VARCHAR(255),
    provider_name_upper VARCHAR(255),
    provider_rut VARCHAR(20),
    mm INTEGER NOT NULL CHECK (mm >= 1 AND mm <= 12),
    yyyy INTEGER NOT NULL CHECK (yyyy >= 2020 AND yyyy <= 2050),
    quantity INTEGER DEFAULT 1,
    location VARCHAR(255),
    observaciones TEXT,
    clave_unica VARCHAR(100) UNIQUE,
    withdrawal_days INTEGER DEFAULT 30,
    has_canje BOOLEAN DEFAULT false,
    sync_status VARCHAR(20) DEFAULT 'synced',
    -- Campos heredados del producto
    category VARCHAR(50) DEFAULT 'GENERAL',
    supplier VARCHAR(255),
    -- Campos de trazabilidad
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Índices para queries frecuentes
    CONSTRAINT unique_vencimiento UNIQUE (barcode, mm, yyyy)
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_vencimientos_barcode ON VENCIMIENTOS(barcode);
CREATE INDEX IF NOT EXISTS idx_vencimientos_fecha ON VENCIMIENTOS(yyyy, mm);
CREATE INDEX IF NOT EXISTS idx_vencimientos_estado ON VENCIMIENTOS(sync_status);
CREATE INDEX IF NOT EXISTS idx_vencimientos_proveedor ON VENCIMIENTOS(provider_rut);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vencimientos_updated_at ON VENCIMIENTOS;
CREATE TRIGGER update_vencimientos_updated_at
    BEFORE UPDATE ON VENCIMIENTOS
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 2. CREAR/MIGRAR TABLA CLIENTES
-- =============================================================================

-- Verificar si la tabla existe y tiene datos
-- SELECT COUNT(*) FROM CLIENTES; -- Currently: 0 rows

-- Crear tabla CLIENTES con estructura correcta
-- Requerido por: syncRegistry.customers

CREATE TABLE IF NOT EXISTS CLIENTES (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    full_name VARCHAR(200),
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    rut VARCHAR(20) UNIQUE,
    -- Campos adicionales comunes
    business_name VARCHAR(255),
    city VARCHAR(100),
    region VARCHAR(100),
    -- Campos de trazabilidad
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_rut ON CLIENTES(rut);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON CLIENTES(full_name);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON CLIENTES(email);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_clientes_updated_at ON CLIENTES;
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON CLIENTES
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para mantener full_name actualizado
CREATE OR REPLACE FUNCTION update_cliente_full_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name = TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cliente_full_name_trigger ON CLIENTES;
CREATE TRIGGER update_cliente_full_name_trigger
    BEFORE INSERT OR UPDATE ON CLIENTES
    FOR EACH ROW
    EXECUTE FUNCTION update_cliente_full_name();

-- =============================================================================
-- 3. CREAR VISTA: SYNC_STATUS (Monitoreo de sincronización)
-- =============================================================================

CREATE OR REPLACE VIEW SYNC_STATUS AS
SELECT 
    'PRODUCTOS' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE sync_status = 'synced') as synced,
    COUNT(*) FILTER (WHERE sync_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE sync_status = 'error') as errors,
    COUNT(*) FILTER (WHERE sync_status IS NULL OR sync_status = '') as without_sync,
    MIN(updated_at) as oldest_record,
    MAX(updated_at) as newest_record
FROM PRODUCTOS
UNION ALL
SELECT 
    'PROVEEDORES' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE updated_at IS NOT NULL) as synced,
    0 as pending,
    0 as errors,
    0 as without_sync,
    MIN(updated_at) as oldest_record,
    MAX(updated_at) as newest_record
FROM PROVEEDORES
UNION ALL
SELECT 
    'PRODUCTO_PROVEEDOR' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE updated_at IS NOT NULL) as synced,
    0 as pending,
    0 as errors,
    COUNT(*) FILTER (WHERE updated_at IS NULL) as without_sync,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as newest_record
FROM PRODUCTO_PROVEEDOR
UNION ALL
SELECT 
    'VENCIMIENTOS' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE sync_status = 'synced') as synced,
    COUNT(*) FILTER (WHERE sync_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE sync_status = 'error') as errors,
    COUNT(*) FILTER (WHERE sync_status IS NULL) as without_sync,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as newest_record
FROM VENCIMIENTOS
UNION ALL
SELECT 
    'EVENTOS' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE updated_at IS NOT NULL) as synced,
    0 as pending,
    0 as errors,
    COUNT(*) FILTER (WHERE updated_at IS NULL) as without_sync,
    MIN(timestamp) as oldest_record,
    MAX(updated_at) as newest_record
FROM EVENTOS
UNION ALL
SELECT 
    'CLIENTES' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE updated_at IS NOT NULL) as synced,
    0 as pending,
    0 as errors,
    COUNT(*) FILTER (WHERE updated_at IS NULL) as without_sync,
    MIN(created_at) as oldest_record,
    MAX(updated_at) as newest_record
FROM CLIENTES;

-- =============================================================================
-- 4. COMENTARIOS DE DOCUMENTACIÓN
-- =============================================================================

COMMENT ON TABLE VENCIMIENTOS IS 'Tabla de vencimientos de productos. Sincroniza con dynamic_data local (tableName=VENCIMIENTOS)';
COMMENT ON TABLE CLIENTES IS 'Tabla de clientes. Sincroniza con tabla customers en IndexedDB local';
COMMENT ON VIEW SYNC_STATUS IS 'Vista de monitoreo de estado de sincronización para todas las tablas';

-- =============================================================================
-- FIN DE CORRECCIONES
-- =============================================================================
