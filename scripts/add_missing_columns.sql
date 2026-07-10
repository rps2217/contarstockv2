-- ============================================================================
-- ACTUALIZAR ÍNDICE ÚNICO PARA USAR 'frc' en lugar de 'frc_code'
-- ============================================================================
DROP INDEX IF EXISTS idx_eventos_dedup;
CREATE UNIQUE INDEX idx_eventos_dedup 
ON public."EVENTOS" (lower(frc), lower(barcode))
WHERE frc IS NOT NULL AND frc <> '' AND barcode IS NOT NULL AND barcode <> '';

-- ============================================================================
-- VERIFICAR
-- ============================================================================
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'EVENTOS' AND indexname = 'idx_eventos_dedup';

DO $$
BEGIN
    RAISE NOTICE 'Índice actualizado correctamente!';
    RAISE NOTICE 'Usa lower(frc), lower(barcode) para deduplicación';
END $$;
