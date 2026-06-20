
-- ============================================================
-- SECCIÓN 3: CREAR VISTAS (después de insertar datos)
-- ============================================================

-- 4. VISTA PARA OBTENER PROVEEDOR PRINCIPAL DE CADA PRODUCTO
CREATE OR REPLACE VIEW "VIEW_PRODUCTO_PRINCIPAL" AS
SELECT 
    pp.product_barcode,
    pp.provider_rut,
    pr.name AS provider_name,
    pr.has_exchange AS provider_has_exchange,
    pr.withdrawal_days AS provider_withdrawal_days,
    COALESCE(pp.has_exchange, pr.has_exchange) AS effective_has_exchange,
    COALESCE(pp.withdrawal_days, pr.withdrawal_days, 30) AS effective_withdrawal_days,
    pp.mundo,
    pp.marca
FROM "PRODUCTO_PROVEEDOR" pp
JOIN "PROVEEDORES" pr ON pp.provider_rut = pr.rut
WHERE pp.is_primary = TRUE;

-- 5. VISTA PARA CUMPLIMIENTO CON POLÍTICAS RESUELTAS
CREATE OR REPLACE VIEW "VIEW_CUMPLIMIENTO_POLITICAS" AS
SELECT 
    v.barcode,
    v.mm,
    v.yyyy,
    v.quantity,
    p.name AS product_name,
    pr.name AS provider_name,
    pr.rut AS provider_rut,
    COALESCE(pp.has_exchange, pr.has_exchange) AS has_exchange,
    COALESCE(pp.withdrawal_days, pr.withdrawal_days, 30) AS withdrawal_days,
    pr.exchange_policy,
    DATE(
        MAKE_DATE(v.yyyy, v.mm, 1) - INTERVAL '1 day' * COALESCE(pp.withdrawal_days, pr.withdrawal_days, 30)
    ) AS withdrawal_date,
    DATE(
        MAKE_DATE(v.yyyy, v.mm, 1) - INTERVAL '1 day' * COALESCE(pp.withdrawal_days, pr.withdrawal_days, 30)
    ) - CURRENT_DATE AS days_remaining
FROM "VENCIMIENTOS" v
JOIN "PRODUCTOS" p ON v.barcode = p.barcode
LEFT JOIN "PRODUCTO_PROVEEDOR" pp ON p.barcode = pp.product_barcode AND pp.is_primary = TRUE
LEFT JOIN "PROVEEDORES" pr ON COALESCE(pp.provider_rut, p.supplier_rut) = pr.rut;

-- 6. COMENTARIOS
COMMENT ON TABLE "PRODUCTO_PROVEEDOR" IS 'Relación many-to-many entre productos y proveedores con políticas específicas';
COMMENT ON COLUMN "PRODUCTO_PROVEEDOR".product_barcode IS 'Código del producto (FK a PRODUCTOS.barcode)';
COMMENT ON COLUMN "PRODUCTO_PROVEEDOR".provider_rut IS 'RUT del proveedor (FK a PROVEEDORES.rut)';
COMMENT ON COLUMN "PRODUCTO_PROVEEDOR".is_primary IS 'Indica si este es el proveedor principal del producto';
COMMENT ON COLUMN "PRODUCTO_PROVEEDOR".has_exchange IS 'Política de canje (NULL = hereda del proveedor)';
COMMENT ON COLUMN "PRODUCTO_PROVEEDOR".withdrawal_days IS 'Días de retiro (NULL = hereda del proveedor, default 30)';
