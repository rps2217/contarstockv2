-- =============================================================================
-- MIGRACIÓN: CREAR TABLAS FALTANTES Y CORREGIR ESTRUCTURAS
-- ContarStock v2
-- Fecha: 2026-07-02
-- IMPORTANTE: Usar comillas dobles para tablas con mayúsculas en PostgreSQL
-- =============================================================================

-- =============================================================================
-- 1. CREAR TABLA SCANS (NO EXISTE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "SCANS" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    barcode VARCHAR(50) NOT NULL,
    logistics_label VARCHAR(255),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    is_incident BOOLEAN DEFAULT false,
    expiry_date DATE,
    batch VARCHAR(50),
    quantity INTEGER DEFAULT 1,
    mm INTEGER,
    yyyy INTEGER,
    synced BOOLEAN DEFAULT false,
    sync_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scans_session ON "SCANS"(session_id);
CREATE INDEX IF NOT EXISTS idx_scans_barcode ON "SCANS"(barcode);
CREATE INDEX IF NOT EXISTS idx_scans_sync ON "SCANS"(sync_status);

-- =============================================================================
-- 2. CREAR TABLA AUDIT_LOGS (NO EXISTE)
-- =============================================================================

CREATE TABLE IF NOT EXISTS "AUDIT_LOGS" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    action VARCHAR(20) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    user_id VARCHAR(100),
    device_info TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    synced BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON "AUDIT_LOGS"(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON "AUDIT_LOGS"(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON "AUDIT_LOGS"(timestamp);

-- =============================================================================
-- 3. CORREGIR "SESSIONS" - Agregar columnas faltantes
-- =============================================================================

ALTER TABLE "SESSIONS" 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS erp_order VARCHAR(255),
ADD COLUMN IF NOT EXISTS logistics_label VARCHAR(255),
ADD COLUMN IF NOT EXISTS session_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS audit_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS last_sync TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mm INTEGER,
ADD COLUMN IF NOT EXISTS yyyy INTEGER,
ADD COLUMN IF NOT EXISTS batch VARCHAR(50);

-- Migrar datos de camelCase a snake_case si existen
UPDATE "SESSIONS" SET created_at = createdat WHERE createdat IS NOT NULL AND created_at IS NULL;
UPDATE "SESSIONS" SET erp_order = erporder WHERE erporder IS NOT NULL AND erp_order IS NULL;
UPDATE "SESSIONS" SET logistics_label = logisticslabel WHERE logisticslabel IS NOT NULL AND logistics_label IS NULL;
UPDATE "SESSIONS" SET session_type = sessiontype WHERE sessiontype IS NOT NULL AND session_type IS NULL;
UPDATE "SESSIONS" SET photo_url = photourl WHERE photourl IS NOT NULL AND photo_url IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_status ON "SESSIONS"(status);
CREATE INDEX IF NOT EXISTS idx_sessions_erp ON "SESSIONS"(erp_order);
CREATE INDEX IF NOT EXISTS idx_sessions_fecha ON "SESSIONS"(yyyy, mm);

-- =============================================================================
-- 4. CORREGIR "EVENTOS" - Agregar columna product_name
-- =============================================================================

ALTER TABLE "EVENTOS" 
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS clave_unica VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_adjusted BOOLEAN;

UPDATE "EVENTOS" SET product_name = productName WHERE productName IS NOT NULL AND product_name IS NULL;
UPDATE "EVENTOS" SET provider_name = providerName WHERE providerName IS NOT NULL AND provider_name IS NULL;
UPDATE "EVENTOS" SET is_adjusted = isAdjusted WHERE isAdjusted IS NOT NULL AND is_adjusted IS NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_barcode ON "EVENTOS"(barcode);
CREATE INDEX IF NOT EXISTS idx_eventos_clave ON "EVENTOS"(clave_unica);
CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON "EVENTOS"(timestamp);

-- =============================================================================
-- 5. ACTUALIZAR "VENCIMIENTOS" - Asegurar estructura completa
-- =============================================================================

ALTER TABLE "VENCIMIENTOS" 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50),
ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS mm INTEGER,
ADD COLUMN IF NOT EXISTS yyyy INTEGER,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(20) DEFAULT 'synced',
ADD COLUMN IF NOT EXISTS withdrawal_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS has_canje BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS clave_unica VARCHAR(100),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_venc_barcode ON "VENCIMIENTOS"(barcode);
CREATE INDEX IF NOT EXISTS idx_venc_fecha ON "VENCIMIENTOS"(yyyy, mm);
CREATE INDEX IF NOT EXISTS idx_venc_estado ON "VENCIMIENTOS"(sync_status);

-- =============================================================================
-- 6. ACTUALIZAR "CLIENTES" - Asegurar estructura completa
-- =============================================================================

ALTER TABLE "CLIENTES" 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS full_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS rut VARCHAR(20),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_clientes_rut ON "CLIENTES"(rut);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre ON "CLIENTES"(full_name);

-- =============================================================================
-- 7. CREAR FUNCIONES DE ACTUALIZACIÓN AUTOMÁTICA
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS scans_updated_at ON "SCANS";
CREATE TRIGGER scans_updated_at BEFORE UPDATE ON "SCANS" FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS sessions_updated_at ON "SESSIONS";
CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON "SESSIONS" FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS eventos_updated_at ON "EVENTOS";
CREATE TRIGGER eventos_updated_at BEFORE UPDATE ON "EVENTOS" FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS vencimientos_updated_at ON "VENCIMIENTOS";
CREATE TRIGGER vencimientos_updated_at BEFORE UPDATE ON "VENCIMIENTOS" FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS clientes_updated_at ON "CLIENTES";
CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON "CLIENTES" FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- 8. VERIFICACIÓN FINAL
-- =============================================================================

SELECT 'VERIFICACIÓN DE TABLAS' as resultado;

SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = c.table_name) as columnas
FROM information_schema.tables c
WHERE table_schema = 'public' 
  AND table_name IN ('SCANS', 'AUDIT_LOGS', 'SESSIONS', 'EVENTOS', 'VENCIMIENTOS', 'CLIENTES')
ORDER BY table_name;

-- =============================================================================
-- FIN DE MIGRACIÓN
-- =============================================================================
