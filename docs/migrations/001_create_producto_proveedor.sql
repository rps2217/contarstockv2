-- ============================================================
-- MIGRACIÓN: Crear tabla PRODUCTO_PROVEEDOR
-- Fecha: 2026-06-19
-- Descripción: Relación many-to-many entre PRODUCTOS y PROVEEDORES
--              con políticas de negocio por producto-proveedor
-- ============================================================

-- 1. CREAR TABLA PRODUCTO_PROVEEDOR
-- Esta tabla permite asociar múltiples proveedores a un producto
-- y definir políticas específicas por cada relación

CREATE TABLE IF NOT EXISTS PRODUCTO_PROVEEDOR (
    id SERIAL PRIMARY KEY,
    
    -- Llaves foráneas
    product_barcode VARCHAR(50) NOT NULL,
    provider_rut VARCHAR(20) NOT NULL,
    
    -- Relación
    is_primary BOOLEAN DEFAULT FALSE,  -- Solo 1 proveedor principal por producto
    
    -- Políticas de negocio (pueden heredar del proveedor o sobreescribirse)
    has_exchange BOOLEAN,             -- ¿Acepta canje este producto de este proveedor?
    withdrawal_days INTEGER,           -- Días antes del vencimiento para retirar
    exchange_policy TEXT,              -- Descripción de la política
    
    -- Metadata
    mundo VARCHAR(50),                 -- Categoría (ALMACEN, MED, COM, ALI, etc.)
    marca VARCHAR(50),                -- Marca BCM (A, B, C, TN)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(product_barcode, provider_rut)
);

-- 2. CREAR ÍNDICES PARA QUERIES RÁPIDAS

-- Índice para buscar por producto
CREATE INDEX idx_pp_producto 
    ON PRODUCTO_PROVEEDOR(product_barcode);

-- Índice para buscar por proveedor
CREATE INDEX idx_pp_proveedor 
    ON PRODUCTO_PROVEEDOR(provider_rut);

-- Índice para buscar proveedor principal
CREATE INDEX idx_pp_principal 
    ON PRODUCTO_PROVEEDOR(product_barcode) 
    WHERE is_primary = TRUE;

-- Índice compuesto para JOINs frecuentes
CREATE INDEX idx_pp_producto_proveedor 
    ON PRODUCTO_PROVEEDOR(product_barcode, provider_rut);

-- 3. FUNCIÓN PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_producto_proveedor_updated_at
    BEFORE UPDATE ON PRODUCTO_PROVEEDOR
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. VISTA PARA OBTENER PROVEEDOR PRINCIPAL DE CADA PRODUCTO
CREATE OR REPLACE VIEW VIEW_PRODUCTO_PRINCIPAL AS
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
FROM PRODUCTO_PROVEEDOR pp
JOIN PROVEEDORES pr ON pp.provider_rut = pr.rut
WHERE pp.is_primary = TRUE;

-- 5. VISTA PARA CUMPLIMIENTO CON POLÍTICAS RESUELTAS
CREATE OR REPLACE VIEW VIEW_CUMPLIMIENTO_POLITICAS AS
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
    -- Fecha de retiro calculada
    DATE(
        MAKE_DATE(
            v.yyyy, 
            v.mm, 
            1
        ) - INTERVAL '1 day' * COALESCE(pp.withdrawal_days, pr.withdrawal_days, 30)
    ) AS withdrawal_date,
    -- Días restantes hasta retiro
    DATE(
        MAKE_DATE(v.yyyy, v.mm, 1) - INTERVAL '1 day' * COALESCE(pp.withdrawal_days, pr.withdrawal_days, 30)
    ) - CURRENT_DATE AS days_remaining
FROM VENCIMIENTOS v
JOIN PRODUCTOS p ON v.barcode = p.barcode
LEFT JOIN PRODUCTO_PROVEEDOR pp ON p.barcode = pp.product_barcode AND pp.is_primary = TRUE
LEFT JOIN PROVEEDORES pr ON COALESCE(pp.provider_rut, p.supplier_rut) = pr.rut;

-- 6. COMENTARIOS
COMMENT ON TABLE PRODUCTO_PROVEEDOR IS 'Relación many-to-many entre productos y proveedores con políticas específicas';
COMMENT ON COLUMN PRODUCTO_PROVEEDOR.product_barcode IS 'Código del producto (FK a PRODUCTOS.barcode)';
COMMENT ON COLUMN PRODUCTO_PROVEEDOR.provider_rut IS 'RUT del proveedor (FK a PROVEEDORES.rut)';
COMMENT ON COLUMN PRODUCTO_PROVEEDOR.is_primary IS 'Indica si este es el proveedor principal del producto';
COMMENT ON COLUMN PRODUCTO_PROVEEDOR.has_exchange IS 'Política de canje (NULL = hereda del proveedor)';
COMMENT ON COLUMN PRODUCTO_PROVEEDOR.withdrawal_days IS 'Días de retiro (NULL = hereda del proveedor, default 30)';
