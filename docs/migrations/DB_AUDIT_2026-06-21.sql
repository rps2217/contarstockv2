-- ============================================================
-- AUDITORÍA DE BASE DE DATOS SUPABASE
-- Fecha: 2026-06-21
-- Proyecto: qoxwuqlmudtrsihgvlri
-- ============================================================

-- ============================================================================
-- 1. LISTAR TODAS LAS TABLAS
-- ============================================================================

SELECT 
    table_name,
    table_type,
    obj_description((table_schema || '.' || table_name)::regclass, 'pg_class') as description
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- 2. ESTRUCTURA DETALLADA DE CADA TABLA
-- ============================================================================

-- 2.1 PRODUCTOS
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'PRODUCTOS'
ORDER BY ordinal_position;

-- 2.2 PROVEEDORES  
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'PROVEEDORES'
ORDER BY ordinal_position;

-- 2.3 VENCIMIENTOS
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'VENCIMIENTOS'
ORDER BY ordinal_position;

-- 2.4 EVENTOS
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'EVENTOS'
ORDER BY ordinal_position;

-- 2.5 SESIONES_CONTEO
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'SESIONES_CONTEO'
ORDER BY ordinal_position;

-- 2.6 SCANS
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'SCANS'
ORDER BY ordinal_position;

-- 2.7 PRODUCTO_PROVEEDOR
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'PRODUCTO_PROVEEDOR'
ORDER BY ordinal_position;

-- 2.8 AUDIT_LOGS
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'AUDIT_LOGS'
ORDER BY ordinal_position;

-- ============================================================================
-- 3. CONTEO DE REGISTROS POR TABLA
-- ============================================================================

SELECT 
    'PRODUCTOS' as tabla, COUNT(*) as registros FROM PRODUCTOS
UNION ALL SELECT 'PROVEEDORES', COUNT(*) FROM PROVEEDORES
UNION ALL SELECT 'VENCIMIENTOS', COUNT(*) FROM VENCIMIENTOS
UNION ALL SELECT 'EVENTOS', COUNT(*) FROM EVENTOS
UNION ALL SELECT 'SESIONES_CONTEO', COUNT(*) FROM SESIONES_CONTEO
UNION ALL SELECT 'SCANS', COUNT(*) FROM SCANS
UNION ALL SELECT 'PRODUCTO_PROVEEDOR', COUNT(*) FROM PRODUCTO_PROVEEDOR
UNION ALL SELECT 'AUDIT_LOGS', COUNT(*) FROM AUDIT_LOGS
ORDER BY tabla;

-- ============================================================================
-- 4. VERIFICAR ÍNDICES
-- ============================================================================

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- 5. VERIFICAR FUNCIONES Y TRIGGERS
-- ============================================================================

SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- ============================================================================
-- 6. VERIFICAR POLÍTICAS RLS (Row Level Security)
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 7. COLUMNAS updated_at EN CADA TABLA (para sync)
-- ============================================================================

SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    COALESCE(trigger_name, 'Sin trigger') as tiene_trigger_updated_at
FROM information_schema.columns c
LEFT JOIN (
    SELECT 
        event_object_schema,
        event_object_table,
        trigger_name
    FROM information_schema.triggers 
    WHERE trigger_name LIKE '%updated_at%'
) t ON c.table_name = t.event_object_table AND c.table_schema = t.event_object_schema
WHERE c.table_schema = 'public'
  AND c.column_name IN ('updated_at', 'updatedat', 'updated', 'timestamp', 'sync_timestamp')
ORDER BY c.table_name;

-- ============================================================================
-- 8. DETECTAR COLUMNAS HUÉRFANAS O INNECESARIAS
-- ============================================================================

-- Buscar columnas sin uso (NULL en todos los registros)
-- Nota: Esto puede tomar tiempo en tablas grandes

DO $$
DECLARE
    r RECORD;
    null_count BIGINT;
    total_count BIGINT;
    null_ratio NUMERIC;
BEGIN
    RAISE NOTICE 'Analizando columnas con muchos valores NULL...';
    
    FOR r IN 
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND data_type NOT IN ('serial', 'bigserial')
        ORDER BY table_name, ordinal_position
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I.%I', r.table_name, r.column_name) INTO null_count;
        EXECUTE format('SELECT COUNT(*) FROM %I', r.table_name) INTO total_count;
        
        IF total_count > 0 THEN
            null_ratio := (null_count::NUMERIC / total_count::NUMERIC) * 100;
            
            IF null_ratio > 90 THEN
                RAISE NOTICE '⚠️  %%.% tiene %%% % valores NULL (de % registros)', 
                    r.table_name, r.column_name, null_ratio::TEXT, null_count, total_count;
            END IF;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- 9. RESUMEN EJECUTIVO
-- ============================================================================

SELECT 
    'RESUMEN DE AUDITORÍA' as titulo,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tablas,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public') as total_columnas,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indices,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_politicas_rls;
