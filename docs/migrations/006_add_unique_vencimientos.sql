-- ============================================================
-- MIGRACIÓN: Agregar claveUnica a VENCIMIENTOS si no existe
-- Fecha: 2026-06-21
-- Proyecto: ContarStock
-- ============================================================

-- PASO 1: Agregar columna claveUnica si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vencimientos' 
        AND column_name = 'claveunica'
    ) THEN
        ALTER TABLE vencimientos ADD COLUMN claveunica TEXT;
        RAISE NOTICE '✅ Columna claveunica agregada a VENCIMIENTOS';
    ELSE
        RAISE NOTICE 'ℹ️ Columna claveunica ya existe en VENCIMIENTOS';
    END IF;
END $$;

-- PASO 2: Actualizar registros existentes sin claveunica
UPDATE vencimientos 
SET claveunica = barcode || yyyy || LPAD(mm::TEXT, 2, '0')
WHERE claveunica IS NULL OR claveunica = '';

-- PASO 3: Crear índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_vencimientos_claveunica 
ON vencimientos(claveunica) 
WHERE claveunica IS NOT NULL AND claveunica != '';

-- PASO 4: Verificación
SELECT 'VENCIMIENTOS' as tabla, COUNT(*) as total_registros FROM vencimientos
UNION ALL
SELECT 'Índice único creado:', COUNT(*) 
FROM pg_indexes 
WHERE tablename = 'vencimientos' AND indexname = 'idx_vencimientos_claveunica';
