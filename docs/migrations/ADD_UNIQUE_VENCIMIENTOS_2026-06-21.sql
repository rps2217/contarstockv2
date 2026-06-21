-- ============================================================
-- MIGRACIÓN: Agregar Restricción Única a VENCIMIENTOS
-- Fecha: 2026-06-21
-- Proyecto: qoxwuqlmudtrsihgvlri
-- ============================================================
-- 
-- PROBLEMA:
-- La tabla VENCIMIENTOS en Supabase no tiene restricción UNIQUE
-- en la columna claveUnica, lo que permite duplicados.
--
-- SOLUCIÓN:
-- 1. Verificar que la columna claveUnica exista
-- 2. Agregar constraint UNIQUE si no existe
-- 3. Agregar índice único para rendimiento
-- ============================================================

-- ============================================================================
-- PASO 1: VERIFICAR QUE LA COLUMNA claveUnica EXISTA
-- ============================================================================

DO $$
BEGIN
    -- Verificar si la columna existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'VENCIMIENTOS' 
        AND column_name = 'claveUnica'
    ) THEN
        -- Intentar con nombre alternativo (snake_case)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'VENCIMIENTOS' 
            AND column_name = 'unique_key'
        ) THEN
            RAISE NOTICE 'ℹ️ La columna se llama unique_key en lugar de claveUnica';
        ELSE
            -- Intentar con unique_key
            RAISE WARNING '⚠️ Columna claveUnica/unique_key NO encontrada en VENCIMIENTOS';
        END IF;
    ELSE
        RAISE NOTICE '✅ Columna claveUnica encontrada';
    END IF;
END $$;

-- ============================================================================
-- PASO 2: LISTAR VALORES DUPLICADOS (para auditoría antes de aplicar)
-- ============================================================================

-- Contar duplicados
SELECT 
    claveUnica,
    COUNT(*) as total,
    COUNT(DISTINCT barcode) as productos_unicos,
    MIN(timestamp) as primer_registro,
    MAX(timestamp) as ultimo_registro
FROM VENCIMIENTOS
WHERE claveUnica IS NOT NULL AND claveUnica != ''
GROUP BY claveUnica
HAVING COUNT(*) > 1
ORDER BY total DESC
LIMIT 20;

-- ============================================================================
-- PASO 3: IDENTIFICAR REGISTROS DUPLICADOS (mostrar cuáles serán afectados)
-- ============================================================================

-- Ver cuáles registros se eliminarían si se aplica la restricción
SELECT 
    id,
    claveUnica,
    barcode,
    productName,
    mm,
    yyyy,
    timestamp,
    syncStatus,
    ROW_NUMBER() OVER (PARTITION BY claveUnica ORDER BY timestamp DESC) as rn
FROM VENCIMIENTOS
WHERE claveUnica IN (
    SELECT claveUnica 
    FROM VENCIMIENTOS 
    WHERE claveUnica IS NOT NULL AND claveUnica != ''
    GROUP BY claveUnica 
    HAVING COUNT(*) > 1
)
ORDER BY claveUnica, timestamp DESC;

-- ============================================================================
-- PASO 4: CREAR ÍNDICE ÚNICO (ejecutar SOLO si no hay duplicados o se решил mantener el primero)
-- ============================================================================

-- Opción A: Crear índice único (fallará si hay duplicados)
-- ALTER TABLE VENCIMIENTOS ADD CONSTRAINT uq_vencimientos_claveunica UNIQUE (claveUnica);

-- Opción B: Crear índice único excluyendo duplicados primero
-- Primero, identificar y eliminar o actualizar duplicados
-- Luego aplicar la restricción

-- Opción C: Crear índice único condicional (PostgreSQL 12+)
-- CREATE UNIQUE INDEX CONCURRENTLY idx_vencimientos_claveunica ON VENCIMIENTOS(claveUnica) 
-- WHERE claveUnica IS NOT NULL AND claveUnica != '';

-- ============================================================================
-- PASO 5: ELIMINAR DUPLICADOS MANTENIENDO EL MÁS RECIENTE
-- ============================================================================

-- Eliminar duplicados manteniendo el registro con timestamp más reciente
-- ADVERTENCIA: Esta consulta elimina datos. Ejecutar con precaución.
-- DESCOMENTAR SOLO SI SE DESEA APLICAR

/*
WITH duplicates AS (
    SELECT id, claveUnica, timestamp,
           ROW_NUMBER() OVER (PARTITION BY claveUnica ORDER BY timestamp DESC) as rn
    FROM VENCIMIENTOS
    WHERE claveUnica IS NOT NULL AND claveUnica != ''
)
DELETE FROM VENCIMIENTOS
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

RAISE NOTICE '✅ Duplicados eliminados. Ahora se puede agregar la restricción UNIQUE';
*/

-- ============================================================================
-- PASO 6: APLICAR RESTRICCIÓN ÚNICA (descomentar después de limpiar duplicados)
-- ============================================================================

-- Método 1: Constraint tradicional (requiere tabla sin duplicados)
-- ALTER TABLE VENCIMIENTOS ADD CONSTRAINT uq_vencimientos_claveunica UNIQUE (claveUnica);

-- Método 2: Índice único (puede usarse con datos existentes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vencimientos_claveunica ON VENCIMIENTOS(claveUnica) 
WHERE claveUnica IS NOT NULL AND claveUnica != '';

-- ============================================================================
-- PASO 7: VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que el índice se creó
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'vencimientos' 
AND indexname LIKE '%claveunica%';

-- Probar que ahora rechaza duplicados
-- INSERT INTO VENCIMIENTOS (claveUnica, barcode, productName, mm, yyyy) 
-- VALUES ('TEST123', '123456789', 'Test', 6, 2026);

-- INSERT INTO VENCIMIENTOS (claveUnica, barcode, productName, mm, yyyy) 
-- VALUES ('TEST123', '123456789', 'Test Duplicate', 6, 2026);
-- Debería fallar con: duplicate key value violates unique constraint
