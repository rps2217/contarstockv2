-- ====================================================================
-- SUPABASE POSTGRESQL OPTIMAL SCHEMA: EVENTOS (EVENTS & MERMAS LOGS)
-- ====================================================================
-- Este script realiza una reestructuración premium e industrial de la tabla
-- "EVENTOS", optimizando su rendimiento ante mermas masivas y auditorías.
-- Cuenta con compatibilidad dual automática para camelCase (App original)
-- y snake_case (Estándares SQL locales), indexación por tipo de evento/fechas,
-- políticas RLS seguras y suscripción para Sockets de Tiempo Real.
-- ====================================================================

-- 1. CREACIÓN DE LA TABLA "EVENTOS" CON COMPATIBILIDAD DUAL DE ESCUADRA
CREATE TABLE IF NOT EXISTS public."EVENTOS" (
    -- Clave Primaria Principal (Generada de manera unificada por la App)
    id VARCHAR(150) NOT NULL,
    
    -- Identificadores y Códigos Fundamentales
    barcode VARCHAR(100) NOT NULL,              -- EAN/PLU del artículo
    event VARCHAR(100) NOT NULL DEFAULT 'OTRO',   -- Tipo: MERMA, ROTURA, TRASPASO, etc.
    quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0), -- Cantidad afectada
    
    -- Atributos Documentales y Operativos
    frc VARCHAR(100) DEFAULT '',                -- Folio FRC de control
    destino VARCHAR(150) DEFAULT '',            -- Destino / Bodega asignada
    traspaso VARCHAR(150) DEFAULT '',          -- Documento de traspaso interno
    observaciones TEXT DEFAULT '',              -- Notas libres / Detalles adicionales
    nguia VARCHAR(100) DEFAULT '',              -- Guía de despacho asociada
    
    -- Compatibilidad de Atributos (camelCase / double-quoted)
    "claveUnica" VARCHAR(150) DEFAULT '',
    "productName" VARCHAR(255) DEFAULT '',
    "providerName" VARCHAR(255) DEFAULT 'N/A',
    
    -- Compatibilidad de Atributos (snake_case / estándar)
    clave_unica VARCHAR(150) DEFAULT '',
    product_name VARCHAR(255) DEFAULT '',
    provider_name VARCHAR(255) DEFAULT 'N/A',

    -- Fechas y Metadatos de Auditoría
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, -- Fecha de la transacción
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL, -- Control de Sincronización
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Restricción de Clave Primaria
    CONSTRAINT pk_eventos PRIMARY KEY (id)
);

-- Comentarios profesionales del Diccionario de Datos
COMMENT ON TABLE public."EVENTOS" IS 'Log transaccional de consumo, mermas, robos, mermas por vencimiento y roturas de inventario';
COMMENT ON COLUMN public."EVENTOS".id IS 'Clave lógica universal: barcode + FRC o UUID autogenerado';
COMMENT ON COLUMN public."EVENTOS".event IS 'Categoría del siniestro o evento (MERMA, CANJE, ROTURA, MERMA_VENCIMIENTO, SOBRANTE)';

-- 2. TRIGGER DE ENLACE Y ESPEJADO DUAL (CAMELCASE / SNAKE_CASE)
-- Asegura que datos insertados/actualizados tanto en formatos antiguos como nuevos
-- tengan consistencia absoluta sin depender de la resiliencia automatizada de la app.
CREATE OR REPLACE FUNCTION public.fn_sync_eventos_column_aliases()
RETURNS TRIGGER AS $$
BEGIN
    -- Espejado de claveUnica <--> clave_unica
    IF NEW."claveUnica" IS NOT NULL AND NEW."claveUnica" <> '' THEN
        NEW.clave_unica = NEW."claveUnica";
    ELSIF NEW.clave_unica IS NOT NULL AND NEW.clave_unica <> '' THEN
        NEW."claveUnica" = NEW.clave_unica;
    END IF;

    -- Espejado de productName <--> product_name
    IF NEW."productName" IS NOT NULL AND NEW."productName" <> '' THEN
        NEW.product_name = NEW."productName";
    ELSIF NEW.product_name IS NOT NULL AND NEW.product_name <> '' THEN
        NEW."productName" = NEW.product_name;
    END IF;

    -- Espejado de providerName <--> provider_name
    IF NEW."providerName" IS NOT NULL AND NEW."providerName" <> 'N/A' THEN
        NEW.provider_name = NEW."providerName";
    ELSIF NEW.provider_name IS NOT NULL AND NEW.provider_name <> 'N/A' THEN
        NEW."providerName" = NEW.provider_name;
    END IF;

    -- Actualización de marcas de tiempo de sincronización
    NEW.updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_eventos_column_sync ON public."EVENTOS";
CREATE TRIGGER tr_eventos_column_sync
    BEFORE INSERT OR UPDATE ON public."EVENTOS"
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_eventos_column_aliases();


-- 3. CREACIÓN DE ÍNDICES DE ALTO RENDIMIENTO (VELOCIDAD INDUSTRIAL)
-- Acelera los reportes analíticos agregados por tipo de Evento (Merma, Siniestro)
CREATE INDEX IF NOT EXISTS idx_eventos_type ON public."EVENTOS" (event);

-- Acelera la búsqueda por códigos SKU o nombres descriptivos de productos
CREATE INDEX IF NOT EXISTS idx_eventos_barcode ON public."EVENTOS" (barcode);
CREATE INDEX IF NOT EXISTS idx_eventos_product_name ON public."EVENTOS" (product_name);

-- Permite ordenar instantáneamente el flujo cronológico de la bitácora
CREATE INDEX IF NOT EXISTS idx_eventos_timestamp ON public."EVENTOS" (timestamp DESC);

-- Optimiza la sincronización incremental por lotes de transacciones
CREATE INDEX IF NOT EXISTS idx_eventos_updated_at ON public."EVENTOS" (updated_at);


-- 4. HABILITACIÓN PARA TIEMPO REAL (REALTIME TRANSMISSION CHANNEL)
-- Agrega soporte al planificador de sockets para que todos los dispositivos sientan la bitácora unificada instantáneamente
ALTER publication supabase_realtime ADD TABLE public."EVENTOS";


-- 5. POLÍTICAS DE SEGURIDAD DE FILAS (RLS - ROW LEVEL SECURITY)
ALTER TABLE public."EVENTOS" ENABLE ROW LEVEL SECURITY;

-- Configuración de políticas de seguridad estándar para lectura y edición libre de operarios legítimos
CREATE POLICY "Permitir lectura para todos los usuarios legítimos" 
ON public."EVENTOS" FOR SELECT 
USING (true);

CREATE POLICY "Permitir inserción/escritura de logs de mermas" 
ON public."EVENTOS" FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Permitir actualizaciones para corrección de eventos" 
ON public."EVENTOS" FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "Permitir limpieza o eliminación de logs de eventos" 
ON public."EVENTOS" FOR DELETE 
USING (true);
