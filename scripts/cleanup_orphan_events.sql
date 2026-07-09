-- =============================================================================
-- LIMPIEZA DE REGISTROS HUÉRFANOS EN TABLA EVENTOS
-- =============================================================================
-- Ejecutar en Supabase SQL Editor o cualquier cliente PostgreSQL
-- =============================================================================

-- ============================================================================
-- PASO 1: Verificar el estado actual antes de limpiar
-- ============================================================================

-- Total de registros
SELECT 'Total de registros' as metric, COUNT(*) as count FROM public."EVENTOS";

-- Registros con frc_code o barcode NULL/vacío
SELECT 
  'Sin frc_code' as issue,
  COUNT(*) as count
FROM public."EVENTOS"
WHERE frc_code IS NULL OR frc_code = '';

SELECT 
  'Sin barcode' as issue,
  COUNT(*) as count
FROM public."EVENTOS"
WHERE barcode IS NULL OR barcode = '';

SELECT 
  'Sin frc_code NI barcode' as issue,
  COUNT(*) as count
FROM public."EVENTOS"
WHERE (frc_code IS NULL OR frc_code = '') 
  AND (barcode IS NULL OR barcode = '');

-- Registros duplicados (mismo frc_code + barcode)
SELECT 
  'Duplicados (frc_code + barcode)' as issue,
  COUNT(*) - COUNT(DISTINCT (frc_code, barcode)) as duplicate_count
FROM public."EVENTOS"
WHERE frc_code IS NOT NULL AND frc_code != '' 
  AND barcode IS NOT NULL AND barcode != '';

-- Ver duplicados exactos
SELECT 
  frc_code,
  barcode,
  COUNT(*) as occurrences,
  MIN(id) as keep_id,
  ARRAY_AGG(id ORDER BY id) as all_ids
FROM public."EVENTOS"
WHERE frc_code IS NOT NULL AND frc_code != ''
  AND barcode IS NOT NULL AND barcode != ''
GROUP BY frc_code, barcode
HAVING COUNT(*) > 1
ORDER BY occurrences DESC;

-- ============================================================================
-- PASO 2: Crear tabla de respaldo antes de limpiar
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."EVENTOS_backup_cleaned" (
  LIKE public."EVENTOS" INCLUDING ALL
);

-- Respaldar registros que serán eliminados (duplicados)
INSERT INTO public."EVENTOS_backup_cleaned"
SELECT e.*
FROM public."EVENTOS" e
INNER JOIN (
  SELECT frc_code, barcode
  FROM public."EVENTOS"
  WHERE frc_code IS NOT NULL AND frc_code != ''
    AND barcode IS NOT NULL AND barcode != ''
  GROUP BY frc_code, barcode
  HAVING COUNT(*) > 1
) dup ON e.frc_code = dup.frc_code AND e.barcode = dup.barcode
WHERE e.id NOT IN (
  SELECT MIN(id)
  FROM public."EVENTOS"
  WHERE frc_code IS NOT NULL AND frc_code != ''
    AND barcode IS NOT NULL AND barcode != ''
  GROUP BY frc_code, barcode
);

-- ============================================================================
-- PASO 3: ELIMINAR REGISTROS HUÉRFANOS
-- ============================================================================

-- 3.1 Eliminar registros sin frc_code válido
DELETE FROM public."EVENTOS"
WHERE frc_code IS NULL OR frc_code = '';

-- 3.2 Eliminar registros sin barcode válido
DELETE FROM public."EVENTOS"
WHERE barcode IS NULL OR barcode = '';

-- 3.3 Eliminar duplicados (mantener el de menor id)
DELETE FROM public."EVENTOS" e
USING (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(TRIM(frc_code)), LOWER(TRIM(barcode))
        ORDER BY id
      ) as rn
    FROM public."EVENTOS"
    WHERE frc_code IS NOT NULL AND frc_code != ''
      AND barcode IS NOT NULL AND barcode != ''
  ) ranked
  WHERE rn > 1
) duplicates
WHERE e.id = duplicates.id;

-- ============================================================================
-- PASO 4: Verificar resultados
-- ============================================================================

-- Total después de limpieza
SELECT 'Total después de limpieza' as metric, COUNT(*) as count FROM public."EVENTOS";

-- Verificar que no hay duplicados
SELECT 
  'Duplicados restantes' as metric,
  COUNT(*) - COUNT(DISTINCT (frc_code, barcode)) as remaining_duplicates
FROM public."EVENTOS";

-- Verificar registros válidos
SELECT 
  'Con frc_code' as metric, 
  COUNT(*) as count 
FROM public."EVENTOS" 
WHERE frc_code IS NOT NULL AND frc_code != '';

SELECT 
  'Con barcode' as metric, 
  COUNT(*) as count 
FROM public."EVENTOS" 
WHERE barcode IS NOT NULL AND barcode != '';

-- ============================================================================
-- PASO 5: Stats finales
-- ============================================================================

SELECT 
  'Resumen final' as info,
  COUNT(*) FILTER (WHERE sync_status = 'synced') as synced,
  COUNT(*) FILTER (WHERE sync_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE sync_status = 'error') as errors
FROM public."EVENTOS";

-- ============================================================================
-- NOTAS:
-- ============================================================================
-- 
-- 1. Los duplicados se eliminan manteniendo el registro con menor ID
-- 2. Los registros eliminados se respaldan en EVENTOS_backup_cleaned
-- 3. Para eliminar el backup después de verificar: 
--    DROP TABLE public."EVENTOS_backup_cleaned";
--
-- 4. Para hacer esto de forma más eficiente con grandes volúmenes,
--    se puede usar una tabla temporal:
--
--    CREATE TEMP TABLE ids_to_keep AS
--    SELECT MIN(id) as id
--    FROM public."EVENTOS"
--    WHERE frc_code IS NOT NULL AND frc_code != ''
--      AND barcode IS NOT NULL AND barcode != ''
--    GROUP BY frc_code, barcode;
--
--    DELETE FROM public."EVENTOS" WHERE id NOT IN (SELECT id FROM ids_to_keep);
--
-- ============================================================================
