-- =============================================================================
-- MIGRACIÓN SIMPLIFICADA PARA EVENTOS - SUPABASE
-- =============================================================================
-- Este script solo agrega las columnas mínimas necesarias
-- =============================================================================

-- ============================================================================
-- VERIFICAR COLUMNAS ACTUALES
-- ============================================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'EVENTOS' 
ORDER BY ordinal_position;

-- ============================================================================
-- 1. AGREGAR COLUMNAS FALTANTES
-- ============================================================================
ALTER TABLE public."EVENTOS" 
ADD COLUMN IF NOT EXISTS frc_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS destination VARCHAR(255);

-- ============================================================================
-- 2. CREAR ÍNDICE ÚNICO PARA DEDUPLICACIÓN
-- ============================================================================
-- Primero eliminar duplicados existentes si hay
DELETE FROM public."EVENTOS" e1
USING public."EVENTOS" e2
WHERE e1.ctid < e2.ctid
  AND e1.frc_code IS NOT NULL 
  AND e1.barcode IS NOT NULL
  AND e1.frc_code = e2.frc_code 
  AND e1.barcode = e2.barcode;

-- Crear índice único
DROP INDEX IF EXISTS idx_eventos_dedup;
CREATE UNIQUE INDEX idx_eventos_dedup 
ON public."EVENTOS" (lower(frc_code), lower(barcode))
WHERE frc_code IS NOT NULL AND frc_code <> '' AND barcode IS NOT NULL AND barcode <> '';

-- ============================================================================
-- 3. CREAR TABLA DE ELIMINACIONES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public."DELETED_EVENTS" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key VARCHAR(255) NOT NULL,
    barcode VARCHAR(255),
    frc_code VARCHAR(255),
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deleted_events_key 
ON public."DELETED_EVENTS" (lower(event_key));

-- ============================================================================
-- 4. CREAR TRIGGER PARA UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_eventos_updated_at ON public."EVENTOS";
CREATE TRIGGER update_eventos_updated_at
    BEFORE UPDATE ON public."EVENTOS"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. CREAR ÍNDICES DE PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_eventos_updated_at ON public."EVENTOS" (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_barcode ON public."EVENTOS" (barcode);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================
SELECT 
    'EVENTOS' as table_name,
    COUNT(*) as total_records
FROM public."EVENTOS";

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'EVENTOS' 
ORDER BY ordinal_position;

-- ============================================================================
-- RESUMEN
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Columnas agregadas: frc_code, location, destination';
    RAISE NOTICE 'Índice único creado: idx_eventos_dedup';
    RAISE NOTICE 'Tabla creada: DELETED_EVENTS';
    RAISE NOTICE 'Trigger creado: update_eventos_updated_at';
END $$;
