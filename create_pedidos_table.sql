-- =========================================================================
-- TABLA PEDIDOS - Para Sincronización de Cargas Teóricas (Picking Lists)
-- =========================================================================
-- Esta tabla almacena los productos esperados de cada orden de picking.
-- Un pedido puede tener múltiples filas (una por cada SKU del pedido).
-- La relación entre filas se hace por el campo 'erp' (ID del documento).
--
-- Ejemplo: Un pedido con ID "OC-2024-001" que tiene 3 productos
-- genera 3 filas en esta tabla, todas con erp = "OC-2024-001"
-- =========================================================================

BEGIN;

-- 1. Crear la tabla PEDIDOS
CREATE TABLE IF NOT EXISTS public."PEDIDOS" (
    -- ID único de la fila (no del pedido)
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Clave de agrupamiento: ID del documento/pedido en el ERP
    -- Todas las filas de un mismo pedido tienen el mismo erp
    erp TEXT NOT NULL,
    
    -- Datos del producto
    barcode TEXT NOT NULL,
    name TEXT,
    
    -- Cantidad esperada de este SKU
    qty INTEGER DEFAULT 0,
    
    -- Metadatos del documento
    document_type TEXT DEFAULT 'Picking List',
    date TEXT,
    purchase_order TEXT,
    order_note TEXT,
    
    -- Timestamps automáticos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para búsqueda eficiente
-- Índice principal: buscar todas las filas de un pedido
CREATE INDEX IF NOT EXISTS idx_pedidos_erp ON public."PEDIDOS" (erp);

-- Índice para buscar por producto
CREATE INDEX IF NOT EXISTS idx_pedidos_barcode ON public."PEDIDOS" (barcode);

-- Índice compuesto para evitar duplicados (mismo erp + barcode)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pedidos_erp_barcode 
    ON public."PEDIDOS" (erp, barcode);

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON public."PEDIDOS" (created_at DESC);

-- 3. Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en cada modificación
DROP TRIGGER IF EXISTS update_pedidos_updated_at ON public."PEDIDOS";
CREATE TRIGGER update_pedidos_updated_at
    BEFORE UPDATE ON public."PEDIDOS"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public."PEDIDOS" ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS
-- Permitir lectura a todos los usuarios autenticados
DROP POLICY IF EXISTS "Permitir lectura PEDIDOS" ON public."PEDIDOS";
CREATE POLICY "Permitir lectura PEDIDOS"
    ON public."PEDIDOS" FOR SELECT
    USING (true);

-- Permitir inserción a todos
DROP POLICY IF EXISTS "Permitir inserción PEDIDOS" ON public."PEDIDOS";
CREATE POLICY "Permitir inserción PEDIDOS"
    ON public."PEDIDOS" FOR INSERT
    WITH CHECK (true);

-- Permitir actualización a todos
DROP POLICY IF EXISTS "Permitir actualización PEDIDOS" ON public."PEDIDOS";
CREATE POLICY "Permitir actualización PEDIDOS"
    ON public."PEDIDOS" FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Permitir eliminación a todos
DROP POLICY IF EXISTS "Permitir eliminación PEDIDOS" ON public."PEDIDOS";
CREATE POLICY "Permitir eliminación PEDIDOS"
    ON public."PEDIDOS" FOR DELETE
    USING (true);

COMMIT;

-- =========================================================================
-- VERIFICACIÓN
-- =========================================================================
-- Para verificar que se creó correctamente, ejecuta:
-- SELECT * FROM public."PEDIDOS" LIMIT 10;
-- =========================================================================
