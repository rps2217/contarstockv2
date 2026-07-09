-- =============================================================================
-- ROLLBACK: Revertir cambios de migración de EVENTOS
-- =============================================================================
-- Fecha: 2026-07-09
-- ADVERTENCIA: Esto eliminará datos. Ejecutar solo si es necesario.
-- =============================================================================

-- ============================================================================
-- 1. ELIMINAR TRIGGER Y FUNCIÓN
-- ============================================================================

DROP TRIGGER IF EXISTS update_eventos_updated_at ON public."EVENTOS";
DROP FUNCTION IF EXISTS update_updated_at_column();

-- ============================================================================
-- 2. ELIMINAR ÍNDICES
-- ============================================================================

DROP INDEX IF EXISTS idx_eventos_dedup;
DROP INDEX IF EXISTS idx_eventos_sync_status;
DROP INDEX IF EXISTS idx_eventos_updated_at;
DROP INDEX IF EXISTS idx_eventos_barcode;
DROP INDEX IF EXISTS idx_eventos_created_at;
DROP INDEX IF EXISTS idx_deleted_events_key;
DROP INDEX IF EXISTS idx_deleted_events_barcode;
DROP INDEX IF EXISTS idx_deleted_events_frc;

-- ============================================================================
-- 3. ELIMINAR TABLA DE ELIMINACIONES
-- ============================================================================

DROP TABLE IF EXISTS public."DELETED_EVENTS";

-- ============================================================================
-- 4. ELIMINAR COLUMNAS AGREGADAS
-- ============================================================================

ALTER TABLE public."EVENTOS" DROP COLUMN IF EXISTS frc_code;
ALTER TABLE public."EVENTOS" DROP COLUMN IF EXISTS location;
ALTER TABLE public."EVENTOS" DROP COLUMN IF EXISTS destination;

-- ============================================================================
-- 5. DESHABILITAR RLS
-- ============================================================================

ALTER TABLE public."EVENTOS" DISABLE ROW LEVEL SECURITY;
ALTER TABLE public."DELETED_EVENTS" DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. ELIMINAR POLÍTICAS RLS
-- ============================================================================

DROP POLICY IF EXISTS "eventos_select_all" ON public."EVENTOS";
DROP POLICY IF EXISTS "eventos_insert_all" ON public."EVENTOS";
DROP POLICY IF EXISTS "eventos_update_all" ON public."EVENTOS";
DROP POLICY IF EXISTS "eventos_delete_all" ON public."EVENTOS";
DROP POLICY IF EXISTS "deleted_events_select_all" ON public."DELETED_EVENTS";
DROP POLICY IF EXISTS "deleted_events_insert_all" ON public."DELETED_EVENTS";

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

SELECT 
    'Rollback completado' as status,
    COUNT(*) as eventos_restantes
FROM public."EVENTOS";

SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'EVENTOS' 
ORDER BY ordinal_position;
