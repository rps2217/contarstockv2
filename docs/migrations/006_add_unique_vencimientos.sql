-- ============================================================
-- MIGRACIÓN: Agregar claveUnica a VENCIMIENTOS si no existe
-- Fecha: 2026-06-21
-- Proyecto: ContarStock
-- ============================================================

-- PASO 1: Agregar columna claveUnica si no existe
ALTER TABLE "VENCIMIENTOS" ADD COLUMN IF NOT EXISTS claveunica TEXT;

-- PASO 2: Actualizar registros existentes sin claveunica
UPDATE "VENCIMIENTOS" 
SET claveunica = barcode || yyyy || LPAD(mm::TEXT, 2, '0')
WHERE claveunica IS NULL OR claveunica = '';

-- PASO 3: Crear índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_vencimientos_claveunica 
ON "VENCIMIENTOS"(claveunica) 
WHERE claveunica IS NOT NULL AND claveunica != '';

-- PASO 4: Verificación
SELECT 'VENCIMIENTOS' as tabla, COUNT(*) as total_registros FROM "VENCIMIENTOS";
