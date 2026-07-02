-- ============================================================
-- CORREGIR: Actualizar políticas de proveedores
-- Fecha: 2026-07-02
-- Descripción: Cambiar has_exchange=true y withdrawal_days=30
--              para que funcione correctamente el módulo de vencimientos
-- ============================================================

-- Actualizar TODOS los proveedores con políticas correctas
UPDATE "PROVEEDORES" 
SET 
    has_exchange = TRUE,
    hasExchange = TRUE,
    withdrawal_days = 30,
    withdrawalDays = 30,
    exchange_policy = COALESCE(exchange_policy, 'Política estándar');

-- Verificar resultado
SELECT rut, name, has_exchange, withdrawal_days FROM "PROVEEDORES" LIMIT 10;
