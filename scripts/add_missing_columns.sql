-- ============================================================================
-- AGREGAR COLUMNAS FALTANTES A EVENTOS
-- ============================================================================
-- Ejecuta este script si ves errores 400 al sincronizar eventos
-- ============================================================================

-- Verificar columnas actuales
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'EVENTOS' 
ORDER BY ordinal_position;

-- ============================================================================
-- AGREGAR COLUMNAS FALTANTES (todas opcionales)
-- ============================================================================
ALTER TABLE public."EVENTOS" 
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS resolution TEXT,
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'info',
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS transfer_doc VARCHAR(255),
ADD COLUMN IF NOT EXISTS destination VARCHAR(255),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- CREAR ÍNDICE ÚNICO PARA UPSERT (si no existe)
-- ============================================================================
DROP INDEX IF EXISTS idx_eventos_dedup;
CREATE UNIQUE INDEX idx_eventos_dedup 
ON public."EVENTOS" (lower(frc_code), lower(barcode))
WHERE frc_code IS NOT NULL AND frc_code <> '' AND barcode IS NOT NULL AND barcode <> '';

-- ============================================================================
-- VERIFICAR RESULTADO
-- ============================================================================
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'EVENTOS' 
ORDER BY ordinal_position;

DO $$
BEGIN
    RAISE NOTICE 'Columnas agregadas correctamente!';
END $$;
