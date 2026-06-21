-- ============================================================
-- MIGRACIÓN: Agregar Restricción Única a VENCIMIENTOS
-- Fecha: 2026-06-21
-- Proyecto: ContarStock
-- ============================================================

-- ============================================================================
-- PASO 1: VERIFICAR COLUMNAS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'VENCIMIENTOS' 
        AND column_name = 'claveUnica'
    ) THEN
        RAISE NOTICE '⚠️ Columna claveUnica NO encontrada';
    ELSE
        RAISE NOTICE '✅ Columna claveUnica encontrada';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: LISTAR DUPLICADOS
-- ============================================================================

SELECT 
    claveUnica,
    COUNT(*) as total,
    MIN(timestamp) as primer_registro,
    MAX(timestamp) as ultimo_registro
FROM "VENCIMIENTOS"
WHERE claveUnica IS NOT NULL AND claveUnica != ''
GROUP BY claveUnica
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 20;

-- ============================================================================
-- PASO 3: CREAR ÍNDICE ÚNICO
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_vencimientos_claveunica 
ON "VENCIMIENTOS"(claveUnica) 
WHERE claveUnica IS NOT NULL AND claveUnica != '';

-- ============================================================================
-- PASO 4: VERIFICACIÓN
-- ============================================================================

SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'VENCIMIENTOS' 
AND indexname LIKE '%claveunica%';
