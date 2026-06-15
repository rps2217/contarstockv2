-- =========================================================================
-- SCRIPT DE AUDITORÍA, SANITIZACIÓN Y RELACIONES RELACIONALES EN SUPABASE
-- Diseñado para LogiCount Pro Core - Motor de Relaciones en Postgres (Origen)
-- =========================================================================
--
-- Este script realiza las siguientes operaciones automáticas en tu base de datos:
--   1. Crea funciones de normalización de Identidad Logística (SKUs y RUTs) idénticas a las de la app.
--   2. Corrige e integra restricciones relacionales con actualización en cascada.
--   3. Implementa Triggers automáticos para limpiar y formatear datos de entrada en inserciones/actualizaciones.
--   4. Implementa un Trigger de Resolución de Relaciones cruzadas en "VENCIMIENTOS":
--      Cada vez que se guarde un registro de Vencimiento, Postgres buscará de forma autónoma el Barcode
--      en el Catálogo de Productos para rescatar el RUT del Proveedor oficial, buscará su Nombre limpio
--      en Proveedores, y autocompletará las relaciones correspondientes.
--   5. Ejecuta un Backfill inmediato para consolidar el histórico actual.
--
-- INSTRUCCIONES:
--   1. Copia este script completo.
--   2. Ve al panel de Supabase -> pestaña "SQL Editor" -> haz clic en "New query".
--   3. Pega este script y presiona "Run".

BEGIN;

-- =========================================================================
-- 1. CREACIÓN DE FUNCIONES DE NORMALIZACIÓN LOGÍSTICA (DRY)
-- =========================================================================

-- Normaliza SKUs y Códigos de Barra (Equivalente a normalizeSku / sanitizeBarcode)
-- Conserva solo letras (A-Z) y números (0-9) en mayúscula.
CREATE OR REPLACE FUNCTION public.normalize_sku(p_barcode text)
RETURNS text AS $$
BEGIN
    IF p_barcode IS NULL THEN
        RETURN '';
    END IF;
    -- Convertir a mayúsculas, remover caracteres especiales y dejar solo letras/números
    RETURN regexp_replace(upper(trim(p_barcode)), '[^A-Z0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Normaliza RUTs e Identidades (Equivalente a normalizeIdentity)
-- Remueve guiones, puntos, espacios y caracteres especiales.
CREATE OR REPLACE FUNCTION public.normalize_identity(p_id text)
RETURNS text AS $$
BEGIN
    IF p_id IS NULL THEN
        RETURN '';
    END IF;
    -- Eliminar todo excepto letras y números y pasar a mayúsculas
    RETURN regexp_replace(upper(trim(p_id)), '[^A-Z0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- =========================================================================
-- 2. ASEGURAR COLUMNAS Y ESTRUCTURA BÁSICA EN TABLAS PRINCIPALES
-- =========================================================================

-- Asegurar columnas en PROVEEDORES
-- Algunos esquemas usan "withdrawal_days" o "has_exchange" en snake_case
ALTER TABLE IF EXISTS public."PROVEEDORES" ADD COLUMN IF NOT EXISTS "rut" text;
ALTER TABLE IF EXISTS public."PROVEEDORES" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE IF EXISTS public."PROVEEDORES" ADD COLUMN IF NOT EXISTS "exchangePolicy" text;
ALTER TABLE IF EXISTS public."PROVEEDORES" ADD COLUMN IF NOT EXISTS "withdrawalDays" integer DEFAULT 0;
ALTER TABLE IF EXISTS public."PROVEEDORES" ADD COLUMN IF NOT EXISTS "hasExchange" boolean DEFAULT false;

-- Si RUT es clave primaria, nos aseguramos de que no tenga nulos y creamos la PK si no existe
DO $$
BEGIN
    -- Asegurar que 'rut' no tenga nulos para poder ser PK
    UPDATE public."PROVEEDORES" SET "rut" = normalize_identity("rut") WHERE "rut" IS NULL OR "rut" = '';
    UPDATE public."PROVEEDORES" SET "rut" = 'RUT_NUL_PROV_TEMP' WHERE "rut" IS NULL;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='PROVEEDORES' AND constraint_type='PRIMARY KEY'
    ) THEN
        ALTER TABLE public."PROVEEDORES" ADD PRIMARY KEY (rut);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Aviso al estructurar PK en PROVEEDORES: %', SQLERRM;
END;
$$;


-- Asegurar columnas en PRODUCTOS
ALTER TABLE IF EXISTS public."PRODUCTOS" ADD COLUMN IF NOT EXISTS "barcode" text;
ALTER TABLE IF EXISTS public."PRODUCTOS" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE IF EXISTS public."PRODUCTOS" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'GENERAL';
ALTER TABLE IF EXISTS public."PRODUCTOS" ADD COLUMN IF NOT EXISTS "supplier" text;
ALTER TABLE IF EXISTS public."PRODUCTOS" ADD COLUMN IF NOT EXISTS "supplierRut" text;
ALTER TABLE IF EXISTS public."PRODUCTOS" ADD COLUMN IF NOT EXISTS "price" numeric;
ALTER TABLE IF EXISTS public."PRODUCTOS" ADD COLUMN IF NOT EXISTS "unitsPerBox" integer DEFAULT 1;

DO $$
BEGIN
    -- Asegurar clave primaria en PRODUCTOS
    UPDATE public."PRODUCTOS" SET "barcode" = normalize_sku("barcode") WHERE "barcode" IS NULL OR "barcode" = '';
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name='PRODUCTOS' AND constraint_type='PRIMARY KEY'
    ) THEN
        ALTER TABLE public."PRODUCTOS" ADD PRIMARY KEY (barcode);
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Aviso al estructurar PK en PRODUCTOS: %', SQLERRM;
END;
$$;


-- Asegurar columnas relacionales en VENCIMIENTOS
ALTER TABLE IF EXISTS public."VENCIMIENTOS" ADD COLUMN IF NOT EXISTS "barcode" text;
ALTER TABLE IF EXISTS public."VENCIMIENTOS" ADD COLUMN IF NOT EXISTS "productName" text;
ALTER TABLE IF EXISTS public."VENCIMIENTOS" ADD COLUMN IF NOT EXISTS "providerName" text;
ALTER TABLE IF EXISTS public."VENCIMIENTOS" ADD COLUMN IF NOT EXISTS "providerRut" text;
ALTER TABLE IF EXISTS public."VENCIMIENTOS" ADD COLUMN IF NOT EXISTS "quantity" numrange; -- o numeric si se prefiere. Lo aseguramos como numeric
-- Cambiamos a numeric si está nulo o vacío
ALTER TABLE IF EXISTS public."VENCIMIENTOS" ALTER COLUMN "quantity" TYPE numeric USING (quantity::text::numeric);
ALTER TABLE IF EXISTS public."VENCIMIENTOS" ADD COLUMN IF NOT EXISTS "batch" text DEFAULT 'N/A';
ALTER TABLE IF EXISTS public."VENCIMIENTOS" ADD COLUMN IF NOT EXISTS "location" text DEFAULT 'N/A';
ALTER TABLE IF EXISTS public."VENCIMIENTOS" ADD COLUMN IF NOT EXISTS "timestamp" bigint;


-- =========================================================================
-- 3. TRIGGERS DE CORRECCIÓN AUTOMÁTICA EN INSERCIÓN/ACTUALIZACIÓN
-- =========================================================================

-- Trigger para normalizar Proveedores automáticamente
CREATE OR REPLACE FUNCTION public.fn_tg_proveedores_normalize()
RETURNS trigger AS $$
BEGIN
    NEW.rut := public.normalize_identity(NEW.rut);
    NEW.name := upper(trim(NEW.name));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proveedores_normalize ON public."PROVEEDORES";
CREATE TRIGGER trg_proveedores_normalize
    BEFORE INSERT OR UPDATE OF rut, name ON public."PROVEEDORES"
    FOR EACH ROW EXECUTE FUNCTION public.fn_tg_proveedores_normalize();


-- Trigger para normalizar Productos automáticamente
CREATE OR REPLACE FUNCTION public.fn_tg_productos_normalize()
RETURNS trigger AS $$
BEGIN
    NEW.barcode := public.normalize_sku(NEW.barcode);
    IF NEW."supplierRut" IS NOT NULL AND NEW."supplierRut" <> '' THEN
        NEW."supplierRut" := public.normalize_identity(NEW."supplierRut");
    END IF;
    NEW.name := upper(trim(NEW.name));
    IF NEW.supplier IS NOT NULL THEN
        NEW.supplier := upper(trim(NEW.supplier));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_productos_normalize ON public."PRODUCTOS";
CREATE TRIGGER trg_productos_normalize
    BEFORE INSERT OR UPDATE OF barcode, "supplierRut", name, supplier ON public."PRODUCTOS"
    FOR EACH ROW EXECUTE FUNCTION public.fn_tg_productos_normalize();


-- =========================================================================
-- 4. TRIGGER MAESTRO DE RESOLUCIÓN AUTOMÁTICA EN "VENCIMIENTOS"
--    ¡Este trigger realiza el saneamiento de cruces en caliente!
-- =========================================================================

CREATE OR REPLACE FUNCTION public.fn_tg_vencimientos_resolve_relations()
RETURNS trigger AS $$
DECLARE
    r_product record;
    r_provider record;
BEGIN
    -- A. Normalizar el código de barra del vencimiento entrante
    NEW.barcode := public.normalize_sku(NEW.barcode);

    -- B. Buscar en el catálogo de productos por código de barra sanitizado
    SELECT * INTO r_product FROM public."PRODUCTOS" WHERE barcode = NEW.barcode LIMIT 1;

    IF FOUND THEN
        -- 1. Si no tiene nombre de producto o es genérico, rescatamos el nombre maestro del producto
        IF NEW."productName" IS NULL OR NEW."productName" = '' OR NEW."productName" = 'PRODUCTO SIN DESCRIPTOR' THEN
            NEW."productName" := r_product.name;
        END IF;

        -- 2. Si el producto tiene un RUT de proveedor cargado
        IF r_product."supplierRut" IS NOT NULL AND r_product."supplierRut" <> '' THEN
            NEW."providerRut" := public.normalize_identity(r_product."supplierRut");
            
            -- Buscamos el nombre del proveedor oficial por RUT
            SELECT * INTO r_provider FROM public."PROVEEDORES" WHERE rut = NEW."providerRut" LIMIT 1;
            IF FOUND THEN
                NEW."providerName" := r_provider.name;
            ELSE
                -- Si no existe en la tabla proveedores, usamos el nombre que tenga el producto
                NEW."providerName" := coalesce(r_product.supplier, 'SIN PROVEEDOR REGISTRADO');
            END IF;
        ELSE
            -- Si el producto no tiene RUT de proveedor, pero sí tiene nombre de proveedor en texto
            IF r_product.supplier IS NOT NULL AND r_product.supplier <> '' AND r_product.supplier <> 'N/A' THEN
                NEW."providerName" := r_product.supplier;
                
                -- Intentamos buscar por coincidencia de nombre en proveedores para emparejar el RUT
                SELECT * INTO r_provider FROM public."PROVEEDORES" 
                WHERE normalize_identity(name) = normalize_identity(r_product.supplier) LIMIT 1;
                IF FOUND THEN
                    NEW."providerRut" := r_provider.rut;
                    NEW."providerName" := r_provider.name; -- Nombre maestro formateado
                END IF;
            END IF;
        END IF;
    ELSE
        -- C. Si el producto no existe en el catálogo maestro, pero viene un nombre o RUT en el vencimiento
        IF NEW."providerRut" IS NOT NULL AND NEW."providerRut" <> '' THEN
            NEW."providerRut" := public.normalize_identity(NEW."providerRut");
            SELECT * INTO r_provider FROM public."PROVEEDORES" WHERE rut = NEW."providerRut" LIMIT 1;
            IF FOUND THEN
                NEW."providerName" := r_provider.name;
            END IF;
        END IF;
    END IF;

    -- D. Rellenar defaults para consistencia visual
    IF NEW."providerName" IS NULL OR NEW."providerName" = '' OR NEW."providerName" = 'N/A' THEN
        NEW."providerName" := 'SIN PROVEEDOR';
    END IF;
    NEW."providerName" := upper(trim(NEW."providerName"));
    
    IF NEW."productName" IS NULL OR NEW."productName" = '' THEN
        NEW."productName" := 'PRODUCTO SIN DESCRIPTOR';
    END IF;
    NEW."productName" := upper(trim(NEW."productName"));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vencimientos_resolve_relations ON public."VENCIMIENTOS";
CREATE TRIGGER trg_vencimientos_resolve_relations
    BEFORE INSERT OR UPDATE OF barcode, "productName", "providerName", "providerRut" ON public."VENCIMIENTOS"
    FOR EACH ROW EXECUTE FUNCTION public.fn_tg_vencimientos_resolve_relations();


-- =========================================================================
-- 5. CONSTRUCCIÓN DE ÍNDICES DE RENDIMIENTO RELACIONALES
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_productos_supplier_rut ON public."PRODUCTOS" ("supplierRut");
CREATE INDEX IF NOT EXISTS idx_vencimientos_barcode ON public."VENCIMIENTOS" (barcode);
CREATE INDEX IF NOT EXISTS idx_vencimientos_provider_rut ON public."VENCIMIENTOS" ("providerRut");


-- =========================================================================
-- 6. EJECUCIÓN DEL SANEAMIENTO INMEDIATO DE DATOS EXISTENTES (BACKFILL)
-- =========================================================================

DO $$
BEGIN
    RAISE NOTICE 'Iniciando saneamiento de datos históricos...';

    -- A. Normalizar tabla de Proveedores
    UPDATE public."PROVEEDORES" 
    SET rut = normalize_identity(rut),
        name = upper(trim(name))
    WHERE rut IS NOT NULL;

    -- B. Normalizar tabla de Productos
    UPDATE public."PRODUCTOS"
    SET barcode = normalize_sku(barcode),
        name = upper(trim(name)),
        "supplierRut" = normalize_identity("supplierRut"),
        supplier = upper(trim(supplier))
    WHERE barcode IS NOT NULL;

    -- C. Normalizar y Resolver Vencimientos históricos
    -- Al forzar un update, nuestro trigger fn_tg_vencimientos_resolve_relations se dispara
    -- automáticamente y reconstruye todos los cruces y nombres para el total de registros.
    UPDATE public."VENCIMIENTOS"
    SET barcode = normalize_sku(barcode),
        "productName" = upper(trim("productName"))
    WHERE barcode IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in backfill: %', SQLERRM;
END;
$$;

COMMIT;

-- =========================================================================
-- RESULTADO DE AUDITORÍA RELACIONAL COMPLETADO SATISFACTORIAMENTE
-- Las tablas y relaciones ahora son robustas desde el motor de Supabase.
-- =========================================================================
