-- ============================================================
-- MIGRACIÓN: Corrección de Estructura para Sincronización
-- Fecha: 2026-06-21
-- Proyecto: qoxwuqlmudtrsihgvlri
-- ============================================================

-- ============================================================================
-- RESUMEN DE PROBLEMAS DETECTADOS:
-- ============================================================================
-- 1. VENCIMIENTOS - Falta columna updated_at (TIMESTAMPTZ) para sync
-- 2. EVENTOS - Falta columna updated_at para sync  
-- 3. PRODUCTO_PROVEEDOR - Ya tiene updated_at ✅
-- 4. SESSIONS - Ya tiene updated_at ✅
-- 5. PRODUCTOS - Ya tiene updated_at ✅
-- 6. PROVEEDORES - Ya tiene updated_at ✅
-- ============================================================================

-- ============================================================================
-- PASO 1: AGREGAR updated_at A VENCIMIENTOS
-- ============================================================================

-- Columnas actuales de VENCIMIENTOS:
-- id, barcode, productName, timestamp, mm, yyyy, quantity, location,
-- claveUnica, syncStatus, providerName, FECHA_INGRESO, batch, providerRut

ALTER TABLE VENCIMIENTOS ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices para optimizar queries de sync
CREATE INDEX IF NOT EXISTS idx_vencimientos_updated_at ON VENCIMIENTOS(updated_at);
CREATE INDEX IF NOT EXISTS idx_vencimientos_barcode ON VENCIMIENTOS(barcode);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_vencimiento_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vencimiento_ts ON VENCIMIENTOS;
CREATE TRIGGER trigger_update_vencimiento_ts
    BEFORE UPDATE ON VENCIMIENTOS
    FOR EACH ROW EXECUTE FUNCTION update_vencimiento_timestamp();

-- Actualizar registros existentes con updated_at
UPDATE VENCIMIENTOS SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================================================
-- PASO 2: AGREGAR updated_at A EVENTOS
-- ============================================================================

-- Columnas actuales de EVENTOS:
-- ID, barcode, claveUnica, destino, event, frc, id, isAdjusted, location,
-- nguia, observaciones, productName, providerName, quantity, timestamp, traspaso

ALTER TABLE EVENTOS ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Índices
CREATE INDEX IF NOT EXISTS idx_eventos_updated_at ON EVENTOS(updated_at);
CREATE INDEX IF NOT EXISTS idx_eventos_barcode ON EVENTOS(barcode);
CREATE INDEX IF NOT EXISTS idx_eventos_event ON EVENTOS(event);

-- Trigger
CREATE OR REPLACE FUNCTION update_evento_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_evento_ts ON EVENTOS;
CREATE TRIGGER trigger_update_evento_ts
    BEFORE UPDATE ON EVENTOS
    FOR EACH ROW EXECUTE FUNCTION update_evento_timestamp();

-- Actualizar registros existentes
UPDATE EVENTOS SET updated_at = NOW() WHERE updated_at IS NULL;

-- ============================================================================
-- PASO 3: CREAR TABLA AUDIT_LOGS (si no existe)
-- ============================================================================

CREATE TABLE IF NOT EXISTS AUDIT_LOGS (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    action VARCHAR(20) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    user_id VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON AUDIT_LOGS(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON AUDIT_LOGS(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON AUDIT_LOGS(timestamp);

-- ============================================================================
-- PASO 4: DESHABILITAR RLS TEMPORALMENTE (para diagnóstico)
-- ============================================================================

-- Si tienes problemas de sync, descomenta estas líneas:
-- ALTER TABLE VENCIMIENTOS DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE EVENTOS DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 
    '✅ MIGRACIÓN COMPLETADA' AS status,
    NOW() AS executed_at,
    current_setting('current_user') AS db_user;

-- Verificar que todas las tablas tengan updated_at
SELECT 
    t.table_name,
    c.column_name = 'updated_at' AS tiene_updated_at
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name 
    AND c.column_name = 'updated_at'
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
