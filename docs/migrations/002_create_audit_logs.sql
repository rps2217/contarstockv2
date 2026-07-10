-- =====================================================
-- AUDIT_LOGS Table - Registro de Auditoría
-- Estilo AppSheet para trazabilidad completa
-- =====================================================

-- Tabla principal de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    user_id TEXT,
    device_info TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    synced BOOLEAN DEFAULT TRUE
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- Comentarios
COMMENT ON TABLE audit_logs IS 'Registro de auditoría estilo AppSheet - Trazabilidad completa de cambios';
COMMENT ON COLUMN audit_logs.table_name IS 'Nombre de la tabla afectada (events, products, etc.)';
COMMENT ON COLUMN audit_logs.record_id IS 'ID del registro afectado';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de acción: CREATE, UPDATE, DELETE';
COMMENT ON COLUMN audit_logs.field_name IS 'Campo específico modificado (para UPDATE)';
COMMENT ON COLUMN audit_logs.old_value IS 'Valor anterior en JSON';
COMMENT ON COLUMN audit_logs.new_value IS 'Nuevo valor en JSON';
COMMENT ON COLUMN audit_logs.user_id IS 'ID del usuario que hizo el cambio';
COMMENT ON COLUMN audit_logs.device_info IS 'Información del dispositivo';
COMMENT ON COLUMN audit_logs.timestamp IS 'Fecha y hora del cambio';
COMMENT ON COLUMN audit_logs.synced_at IS 'Fecha de sincronización a la nube';

-- =====================================================
-- Vistas Útiles
-- =====================================================

-- Vista: Resumen de actividad por tabla
CREATE OR REPLACE VIEW v_audit_summary_by_table AS
SELECT 
    table_name,
    action,
    COUNT(*) as change_count,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(timestamp) as first_change,
    MAX(timestamp) as last_change
FROM audit_logs
GROUP BY table_name, action
ORDER BY last_change DESC;

-- Vista: Actividad por usuario
CREATE OR REPLACE VIEW v_audit_activity_by_user AS
SELECT 
    user_id,
    table_name,
    action,
    COUNT(*) as action_count,
    MAX(timestamp) as last_action
FROM audit_logs
WHERE user_id IS NOT NULL
GROUP BY user_id, table_name, action
ORDER BY last_action DESC;

-- =====================================================
-- Funciones Útiles
-- =====================================================

-- Función: Obtener historial de un registro
CREATE OR REPLACE FUNCTION fn_get_record_history(
    p_table_name TEXT,
    p_record_id TEXT,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id INTEGER,
    action TEXT,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    user_id TEXT,
    timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.action,
        a.field_name,
        a.old_value,
        a.new_value,
        a.user_id,
        a.timestamp
    FROM audit_logs a
    WHERE a.table_name = p_table_name 
      AND a.record_id = p_record_id
    ORDER BY a.timestamp DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver todos los logs
CREATE POLICY "Admins can view all audit logs"
    ON audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_roles.user_id = auth.uid() 
            AND user_roles.role = 'admin'
        )
    );

-- Política: Todos pueden insertar (el sistema lo hace)
CREATE POLICY "Anyone can insert audit logs"
    ON audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- =====================================================
-- Datos de Prueba (opcional)
-- =====================================================

-- Descomentar para insertar datos de prueba:
/*
INSERT INTO audit_logs (table_name, record_id, action, field_name, old_value, new_value, user_id, device_info, timestamp)
VALUES 
    ('products', '123', 'UPDATE', 'name', '"Arroz Anterior"', '"Arroz Premium"', 'user_1', 'iOS | Safari', NOW() - INTERVAL '1 day'),
    ('products', '123', 'UPDATE', 'price', '2500', '2990', 'user_1', 'iOS | Safari', NOW() - INTERVAL '2 hours'),
    ('events', '456', 'CREATE', NULL, NULL, '{"quantity": 10}', 'user_2', 'Android | Chrome', NOW() - INTERVAL '5 hours'),
    ('events', '456', 'UPDATE', 'quantity', '10', '15', 'user_2', 'Android | Chrome', NOW() - INTERVAL '1 hour');
*/
