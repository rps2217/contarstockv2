-- =============================================================================
-- LIMPIEZA SIMPLE DE EVENTOS (Versión ligera)
-- =============================================================================
-- Ejecutar todo junto en Supabase SQL Editor
-- =============================================================================

-- PASO 1: Ver estado antes
SELECT 
  'Total' as metric, COUNT(*) as count FROM public."EVENTOS"
UNION ALL
SELECT 
  'Sin frc_code', COUNT(*) FROM public."EVENTOS" WHERE frc_code IS NULL OR frc_code = ''
UNION ALL
SELECT 
  'Sin barcode', COUNT(*) FROM public."EVENTOS" WHERE barcode IS NULL OR barcode = '';

-- PASO 2: Eliminar huérfanos
BEGIN;

-- Eliminar sin frc_code
DELETE FROM public."EVENTOS" WHERE frc_code IS NULL OR frc_code = '';

-- Eliminar sin barcode  
DELETE FROM public."EVENTOS" WHERE barcode IS NULL OR barcode = '';

-- Eliminar duplicados (mantener el más antiguo)
DELETE FROM public."EVENTOS" e
USING (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(frc_code)), LOWER(TRIM(barcode))
      ORDER BY id
    ) as rn
    FROM public."EVENTOS"
  ) t WHERE rn > 1
) dup
WHERE e.id = dup.id;

COMMIT;

-- PASO 3: Verificar después
SELECT 'Total final' as metric, COUNT(*) as count FROM public."EVENTOS";
