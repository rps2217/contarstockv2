-- =============================================================================
-- MIGRACIÓN DEL ESQUEMA DE EVENTOS - SUPABASE
-- =============================================================================
-- Fecha: 2026-07-09
-- Descripción: Agrega columnas faltantes, constraints únicos, tabla de eliminaciones
-- =============================================================================

-- ============================================================================
-- PASO 1: VERIFICAR ESTADO ACTUAL
-- ============================================================================

-- Ver estructura actual de EVENTOS
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'EVENTOS' 
ORDER BY ordinal_position;

-- Ver conteo actual
SELECT COUNT(*) as total_eventos FROM public."EVENTOS";

-- Verificar si hay duplicados
SELECT 
  frc_code, 
  barcode, 
  COUNT(*) as occurrences 
FROM public."EVENTOS"
WHERE frc_code IS NOT NULL AND barcode IS NOT NULL
GROUP BY frc_code, barcode
HAVING COUNT(*) > 1
ORDER BY occurrences DESC
LIMIT 10;

-- ============================================================================
-- PASO 2: AGREGAR COLUMNAS FALTANTES
-- ============================================================================

ALTER TABLE public."EVENTOS" 
ADD COLUMN IF NOT EXISTS frc_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS destination VARCHAR(255);

-- Verificar que se agregaron
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'EVENTOS' 
AND column_name IN ('frc_code', 'location', 'destination');

-- ============================================================================
-- PASO 3: NORMALIZAR DATOS EXISTENTES
-- ============================================================================

-- Si hay una columna diferente para FRC, migrar datos
-- Ejemplo: si existe 'frcNumber' copiar a 'frc_code'
-- Descomenta y adapta según tu esquema:
-- UPDATE public."EVENTOS" SET frc_code = frcNumber WHERE frc_code IS NULL AND frcNumber IS NOT NULL;

-- ============================================================================
-- PASO 4: LIMPIEZA DE DUPLICADOS EXISTENTES
-- ============================================================================

-- Contar duplicados antes de limpiar
DO $$
DECLARE
    dup_count INTEGER;
    total_affected INTEGER;
BEGIN
    -- Contar grupos duplicados
    SELECT COUNT(*) INTO dup_count
    FROM (
        SELECT frc_code, barcode
        FROM public."EVENTOS"
        WHERE frc_code IS NOT NULL AND frc_code != ''
          AND barcode IS NOT NULL AND barcode != ''
        GROUP BY frc_code, barcode
        HAVING COUNT(*) > 1
    ) dups;
    
    RAISE NOTICE 'Grupos de duplicados encontrados: %', dup_count;
    
    IF dup_count > 0 THEN
        -- Mostrar información de duplicados
        RAISE NOTICE 'Duplicados a eliminar:';
        
        -- Eliminar duplicados (mantener el más reciente por updated_at)
        WITH duplicates AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY LOWER(TRIM(frc_code)), LOWER(TRIM(barcode))
                       ORDER BY COALESCE(updated_at, '1900-01-01'::timestamp) DESC, created_at DESC
                   ) as rn
            FROM public."EVENTOS"
            WHERE frc_code IS NOT NULL AND frc_code != ''
              AND barcode IS NOT NULL AND barcode != ''
        )
        SELECT COUNT(*) INTO total_affected
        FROM duplicates WHERE rn > 1;
        
        DELETE FROM public."EVENTOS" e
        USING (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (
                    PARTITION BY LOWER(TRIM(frc_code)), LOWER(TRIM(barcode))
                    ORDER BY COALESCE(updated_at, '1900-01-01'::timestamp) DESC, created_at DESC
                ) as rn
                FROM public."EVENTOS"
                WHERE frc_code IS NOT NULL AND frc_code != ''
                  AND barcode IS NOT NULL AND barcode != ''
            ) t WHERE rn > 1
        ) dup WHERE e.id = dup.id;
        
        RAISE NOTICE 'Registros eliminados: %', total_affected;
    END IF;
END $$;

-- ============================================================================
-- PASO 5: CREAR ÍNDICE ÚNICO PARA DEDUPLICACIÓN
-- ============================================================================

-- Primero eliminar índice existente si hay
DROP INDEX IF EXISTS idx_eventos_dedup;
DROP INDEX IF EXISTS idx_eventos_frc_barcode;

-- Crear índice único usando expresión (sin TRIM, la app normaliza datos)
-- Usamos lower() para case-insensitive
CREATE UNIQUE INDEX idx_eventos_dedup 
ON public."EVENTOS" (lower(frc_code), lower(barcode))
WHERE frc_code IS NOT NULL AND frc_code <> '' AND barcode IS NOT NULL AND barcode <> '';

-- ============================================================================
-- PASO 6: CREAR TABLA DE ELIMINACIONES (SOFT DELETES)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public."DELETED_EVENTS" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_key VARCHAR(255) NOT NULL,
    barcode VARCHAR(255),
    frc_code VARCHAR(255),
    deleted_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_by UUID,
    local_id INTEGER
);

-- Crear índices para la tabla de eliminaciones
CREATE INDEX IF NOT EXISTS idx_deleted_events_key ON public."DELETED_EVENTS" (lower(event_key));
CREATE INDEX IF NOT EXISTS idx_deleted_events_barcode ON public."DELETED_EVENTS" (barcode);
CREATE INDEX IF NOT EXISTS idx_deleted_events_frc ON public."DELETED_EVENTS" (frc_code);

-- ============================================================================
-- PASO 7: AGREGAR ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_eventos_sync_status ON public."EVENTOS" (sync_status);
CREATE INDEX IF NOT EXISTS idx_eventos_updated_at ON public."EVENTOS" (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_eventos_barcode ON public."EVENTOS" (barcode);
CREATE INDEX IF NOT EXISTS idx_eventos_created_at ON public."EVENTOS" (created_at DESC);

-- ============================================================================
-- PASO 8: CREAR FUNCIÓN PARA TRIGGER DE UPDATED_AT
-- ============================================================================

-- Eliminar función anterior si existe
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Crear función
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
DROP TRIGGER IF EXISTS update_eventos_updated_at ON public."EVENTOS";
CREATE TRIGGER update_eventos_updated_at
    BEFORE UPDATE ON public."EVENTOS"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 9: HABILITAR RLS
-- ============================================================================

-- Habilitar RLS en tablas
ALTER TABLE public."EVENTOS" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DELETED_EVENTS" ENABLE ROW LEVEL SECURITY;

-- Verificar RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('EVENTOS', 'DELETED_EVENTS');

-- ============================================================================
-- PASO 10: CREAR POLÍTICAS RLS
-- ============================================================================

-- Drop políticas existentes
DROP POLICY IF EXISTS "eventos_select_all" ON public."EVENTOS";
DROP POLICY IF EXISTS "eventos_insert_all" ON public."EVENTOS";
DROP POLICY IF EXISTS "eventos_update_all" ON public."EVENTOS";
DROP POLICY IF EXISTS "eventos_delete_all" ON public."EVENTOS";
DROP POLICY IF EXISTS "deleted_events_select_all" ON public."DELETED_EVENTS";
DROP POLICY IF EXISTS "deleted_events_insert_all" ON public."DELETED_EVENTS";

-- Crear políticas para EVENTOS
CREATE POLICY "eventos_select_all" ON public."EVENTOS"
    FOR SELECT USING (true);

CREATE POLICY "eventos_insert_all" ON public."EVENTOS"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "eventos_update_all" ON public."EVENTOS"
    FOR UPDATE USING (true);

CREATE POLICY "eventos_delete_all" ON public."EVENTOS"
    FOR DELETE USING (true);

-- Crear políticas para DELETED_EVENTS
CREATE POLICY "deleted_events_select_all" ON public."DELETED_EVENTS"
    FOR SELECT USING (true);

CREATE POLICY "deleted_events_insert_all" ON public."DELETED_EVENTS"
    FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PASO 11: VERIFICACIÓN FINAL
-- ============================================================================

-- Tabla EVENTOS
SELECT 
    'EVENTOS' as table_name,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE frc_code IS NULL OR frc_code = '') as sin_frc,
    COUNT(*) FILTER (WHERE barcode IS NULL OR barcode = '') as sin_barcode,
    COUNT(*) FILTER (WHERE sync_status = 'synced') as synced,
    COUNT(*) FILTER (WHERE sync_status = 'pending') as pending,
    COUNT(*) FILTER (WHERE sync_status = 'error') as errors
FROM public."EVENTOS";

-- Tabla DELETED_EVENTS
SELECT 
    'DELETED_EVENTS' as table_name,
    COUNT(*) as total_records
FROM public."DELETED_EVENTS";

-- Verificar índices
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename IN ('EVENTOS', 'DELETED_EVENTS')
ORDER BY tablename, indexname;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Cambios realizados:';
    RAISE NOTICE '  1. Columnas agregadas: frc_code, location, destination';
    RAISE NOTICE '  2. Índice único creado: idx_eventos_dedup';
    RAISE NOTICE '  3. Tabla creada: DELETED_EVENTS';
    RAISE NOTICE '  4. Índices de performance agregados';
    RAISE NOTICE '  5. Trigger de updated_at creado';
    RAISE NOTICE '  6. RLS habilitado';
    RAISE NOTICE '  7. Políticas RLS creadas';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- ROLLBACK (si algo falla)
-- Ejecutar este script para revertir cambios
-- ============================================================================
-- DROP TRIGGER IF EXISTS update_eventos_updated_at ON public."EVENTOS";
-- DROP FUNCTION IF EXISTS update_updated_at_column();
-- DROP INDEX IF EXISTS idx_eventos_dedup;
-- DROP INDEX IF EXISTS idx_eventos_sync_status;
-- DROP INDEX IF EXISTS idx_eventos_updated_at;
-- DROP INDEX IF EXISTS idx_eventos_barcode;
-- DROP INDEX IF EXISTS idx_eventos_created_at;
-- DROP TABLE IF EXISTS public."DELETED_EVENTS";
-- ALTER TABLE public."EVENTOS" DROP COLUMN IF EXISTS frc_code;
-- ALTER TABLE public."EVENTOS" DROP COLUMN IF EXISTS location;
-- ALTER TABLE public."EVENTOS" DROP COLUMN IF EXISTS destination;
-- ALTER TABLE public."EVENTOS" DISABLE ROW LEVEL SECURITY;
