-- ============================================================
-- ROLLBACK: Eliminar PRODUCTO_PROVEEDOR
-- Fecha: 2026-06-19
-- Descripción: Script para revertir la migración
-- ============================================================

-- ⚠️ ADVERTENCIA: Esto eliminará TODOS los datos relacionados

-- 1. Eliminar trigger primero
DROP TRIGGER IF EXISTS update_producto_proveedor_updated_at ON PRODUCTO_PROVEEDOR;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- 2. Eliminar vistas
DROP VIEW IF EXISTS VIEW_CUMPLIMIENTO_POLITICAS;
DROP VIEW IF EXISTS VIEW_PRODUCTO_PRINCIPAL;

-- 3. Eliminar índices
DROP INDEX IF EXISTS idx_pp_producto_proveedor;
DROP INDEX IF EXISTS idx_pp_principal;
DROP INDEX IF EXISTS idx_pp_proveedor;
DROP INDEX IF EXISTS idx_pp_producto;

-- 4. Eliminar tabla (y todos los datos)
DROP TABLE IF EXISTS PRODUCTO_PROVEEDOR CASCADE;

-- 5. Verificar eliminación
SELECT 
    'Tabla PRODUCTO_PROVEEDOR eliminada' AS status,
    NOW() AS executed_at;
