-- ====================================================================
-- SUPABASE POSTGRESQL OPTIMAL SCHEMA: VENCIMIENTOS (EXPIRY MODULE)
-- ====================================================================
-- Este script realiza una reestructuración limpia e industrial para el
-- almacenamiento de vencimientos y lotes de producto en Supabase,
-- asegurando consistencia referencial, prevención de duplicados,
-- índices de alta velocidad, triggers automáticos y soporte de Sockets en Tiempo Real.
-- ====================================================================

-- 1. LIMPIEZA Y PREPARACIÓN (Ejecutar solo si se desea recrear desde cero)
-- DROP TABLE IF EXISTS public."VENCIMIENTOS" CASCADE;

-- 2. DEFINICIÓN DE LA TABLA COMPATIBLE Y ROBUSTA
CREATE TABLE IF NOT EXISTS public."VENCIMIENTOS" (
    -- Clave Primaria Física (Soporta Upsert nativo de la App: unique_key)
    unique_key VARCHAR(150) NOT NULL,
    
    -- Identificadores y Datos Básicos
    id UUID NOT NULL DEFAULT gen_random_uuid(), -- ID Único del registro
    barcode VARCHAR(100) NOT NULL,              -- EAN/PLU del artículo
    product_name VARCHAR(255) NOT NULL,         -- Descriptor textual (Nombre del Producto)
    provider_name VARCHAR(255) DEFAULT 'N/A',   -- Nombre del Proveedor / Laboratorio
    
    -- Segmentación de Fechas (Mes, Año, y Tipo Fecha SQL compilada)
    mm INT NOT NULL CHECK (mm BETWEEN 1 AND 12),
    yyyy INT NOT NULL CHECK (yyyy >= 2020),
    
    -- Atributos Operativos
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    location VARCHAR(150) DEFAULT 'N/A',        -- Pasillo, Góndola, Almacén
    batch VARCHAR(100) DEFAULT 'N/A',           -- Código de Lote de Producto
    observaciones TEXT DEFAULT '',              -- Notas libres / Motivos canje
    
    -- Campos de Auditoría y Control de Sincronización
    timestamp BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint, -- Unix Epoch ms
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricción de Clave Primaria
    CONSTRAINT pk_vencimientos PRIMARY KEY (unique_key)
);

-- Comentarios explicativos integrados en el motor Postgres
COMMENT ON TABLE public."VENCIMIENTOS" IS 'Tabla centralizada para la auditoría de stock con fechas de vencimiento y lotes críticos';
COMMENT ON COLUMN public."VENCIMIENTOS".unique_key IS 'Clave lógica unificada generada por la App: barcode + yyyy + mm + dd';
COMMENT ON COLUMN public."VENCIMIENTOS".id IS 'Identificador universal secundario para operaciones de ruteo de socket';

-- 3. CREACIÓN DE ÍNDICES DE ALTO RENDIMIENTO (OPTIMIZACIÓN DE CONSULTAS)
-- Permite búsquedas instantáneas por código o nombre de producto en el almacén
CREATE INDEX IF NOT EXISTS idx_vencimientos_barcode ON public."VENCIMIENTOS" (barcode);
CREATE INDEX IF NOT EXISTS idx_vencimientos_product ON public."VENCIMIENTOS" (product_name);

-- Optimiza los filtros de expiración (vistas semanales, mensuales de mermas/alertas)
CREATE INDEX IF NOT EXISTS idx_vencimientos_expiry_dates ON public."VENCIMIENTOS" (yyyy, mm);

-- Optimiza la sincronización incremental filtrando por última fecha de modificación
CREATE INDEX IF NOT EXISTS idx_vencimientos_updated_at ON public."VENCIMIENTOS" (updated_at);

-- 4. TRIGGER AUTOMÁTICO PARA LA COLUMNA 'updated_at'
-- Asegura que todo cambio remoto (web, API, consola) actualice a la perfección los metadatos de sincronización
CREATE OR REPLACE FUNCTION public.fn_update_vencimientos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    NEW.timestamp = (extract(epoch from now()) * 1000)::bigint;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_vencimientos_update ON public."VENCIMIENTOS";
CREATE TRIGGER tr_vencimientos_update
    BEFORE UPDATE ON public."VENCIMIENTOS"
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_update_vencimientos_timestamp();

-- 5. HABILITACIÓN DE TIEMPO REAL (REALTIME SUB-GRID SUBSCRIPTION)
-- Requerido para que supabaseSyncService de la App web escuche dinámicamente los cambios de los operarios
ALTER publication supabase_realtime ADD TABLE public."VENCIMIENTOS";

-- 6. POLÍTICAS DE SEGURIDAD DE FILAS (RLS - ROW LEVEL SECURITY)
-- Modificar a conveniencia si requieres autenticación de usuarios por token Supabase JWT Auth
ALTER TABLE public."VENCIMIENTOS" ENABLE ROW LEVEL SECURITY;

-- Crear políticas limpias que permiten lectura y escritura (Ajustar según RLS corporativo)
CREATE POLICY "Permitir lectura para todos los usuarios legítimos" 
ON public."VENCIMIENTOS" FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserción/escritura libre" 
ON public."VENCIMIENTOS" FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir actualizaciones para todos" 
ON public."VENCIMIENTOS" FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir borrados" 
ON public."VENCIMIENTOS" FOR DELETE 
USING (true);
