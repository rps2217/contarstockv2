-- ============================================================
-- CORRECCIÓN: Tabla VENCIMIENTOS
-- Fecha: 2026-06-21
-- Problema: La sync falla con error 400 por formato de fecha
-- ============================================================

-- ============================================================================
-- PASO 1: Verificar estructura actual
-- ============================================================================

-- Mostrar estructura actual
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'VENCIMIENTOS'
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 2: Verificar si existe updated_at
-- ============================================================================

-- Buscar columna updated_at o similar
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'VENCIMIENTOS' 
  AND (column_name = 'updated_at' 
       OR column_name = 'updatedat' 
       OR column_name ILIKE '%update%'
       OR column_name = 'timestamp');

-- ============================================================================
-- PASO 3: Crear/Actualizar columna updated_at si no existe
-- ============================================================================

-- Opción A: Si NO existe updated_at, crearla
-- ALTER TABLE VENCIMIENTOS 
-- ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Opción B: Asegurar que existe y tiene el valor correcto
DO $$
BEGIN
    -- Agregar columna si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'VENCIMIENTOS' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE VENCIMIENTOS ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Columna updated_at creada';
    ELSE
        RAISE NOTICE 'ℹ️ Columna updated_at ya existe';
    END IF;
    
    -- Agregar índice si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'VENCIMIENTOS' AND indexname = 'idx_vencimientos_updated_at'
    ) THEN
        CREATE INDEX idx_vencimientos_updated_at ON VENCIMIENTOS(updated_at);
        RAISE NOTICE '✅ Índice idx_vencimientos_updated_at creado';
    ELSE
        RAISE NOTICE 'ℹ️ Índice idx_vencimientos_updated_at ya existe';
    END IF;
END $$;

-- ============================================================================
-- PASO 4: Crear trigger para actualizar updated_at automáticamente
-- ============================================================================

-- Función para actualizar timestamp
CREATE OR REPLACE FUNCTION update_vencimientos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger existente si hay duplicados
DROP TRIGGER IF EXISTS trigger_update_vencimiento_timestamp ON VENCIMIENTOS;

-- Crear trigger
CREATE TRIGGER trigger_update_vencimiento_timestamp
    BEFORE UPDATE ON VENCIMIENTOS
    FOR EACH ROW
    EXECUTE FUNCTION update_vencimientos_timestamp();

RAISE NOTICE '✅ Trigger creado para actualizar updated_at';

-- ============================================================================
-- PASO 5: Asegurar que todos los registros tengan updated_at
-- ============================================================================

UPDATE VENCIMIENTOS 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- ============================================================================
-- PASO 6: Verificar RLS
-- ============================================================================

-- Deshabilitar RLS para diagnóstico (luego lo revertimos)
-- ALTER TABLE VENCIMIENTOS DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 7: Política RLS (si está habilitada)
-- ============================================================================

-- Eliminar políticas existentes si hay problemas
DROP POLICY IF EXISTS "Enable read for authenticated" ON VENCIMIENTOS;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON VENCIMIENTOS;
DROP POLICY IF EXISTS "Enable update for authenticated" ON VENCIMIENTOS;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON VENCIMIENTOS;

-- Crear políticas permisivas
CREATE POLICY "Enable read for all" ON VENCIMIENTOS
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all" ON VENCIMIENTOS
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all" ON VENCIMIENTOS
    FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================================================
-- PASO 8: Habilitar RLS (descomenta si lo necesitas)
-- ============================================================================

-- ALTER TABLE VENCIMIENTOS ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASO 9: Verificación final
-- ============================================================================

SELECT 
    '✅ Verificación de VENCIMIENTOS' as estado,
    COUNT(*) as total_registros,
    COUNT(updated_at) as registros_con_updated_at,
    MIN(updated_at) as oldest_update,
    MAX(updated_at) as newest_update
FROM VENCIMIENTOS;
