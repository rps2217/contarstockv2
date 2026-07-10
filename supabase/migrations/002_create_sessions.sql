/* ============================================================================= */
/* Crear tabla SESSIONS para sincronizacion de sesiones de conteo                */
/* ============================================================================= */

-- Tabla principal de sesiones
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    erp_order TEXT DEFAULT '',
    logistics_label TEXT DEFAULT '',
    session_type TEXT DEFAULT 'standard',
    audit_status TEXT DEFAULT 'pending',
    photo_url TEXT DEFAULT '',
    mm INTEGER DEFAULT EXTRACT(MONTH FROM NOW()),
    yyyy INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
    batch TEXT DEFAULT '',
    last_sync TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_erp_order ON sessions(erp_order);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_batch ON sessions(batch);

/* ============================================================================= */
/* POLITICAS RLS (Row Level Security)                                           */
/* ============================================================================= */

-- Habilitar RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Politica para usuarios autenticados: pueden ver todas las sesiones
CREATE POLICY "Authenticated users can view all sessions"
    ON sessions FOR SELECT
    TO authenticated
    USING (true);

-- Politica para usuarios autenticados: pueden insertar sesiones
CREATE POLICY "Authenticated users can insert sessions"
    ON sessions FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Politica para usuarios autenticados: pueden actualizar sesiones
CREATE POLICY "Authenticated users can update sessions"
    ON sessions FOR UPDATE
    TO authenticated
    USING (true);

-- Politica para usuarios autenticados: pueden eliminar sesiones
CREATE POLICY "Authenticated users can delete sessions"
    ON sessions FOR DELETE
    TO authenticated
    USING (true);

/* ============================================================================= */
/* HABILITAR REALTIME                                                           */
/* ============================================================================= */

-- Habilitar realtime para la tabla (necesario para sync en tiempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;

/* ============================================================================= */
/* COMENTARIOS                                                                  */
/* ============================================================================= */

COMMENT ON TABLE sessions IS 'Sesiones de conteo sincronizadas entre dispositivos';
COMMENT ON COLUMN sessions.id IS 'UUID unico de la sesion';
COMMENT ON COLUMN sessions.status IS 'Estado: active, paused, completed';
COMMENT ON COLUMN sessions.erp_order IS 'Numero de orden ERP';
COMMENT ON COLUMN sessions.logistics_label IS 'Etiqueta de logistica';
COMMENT ON COLUMN sessions.session_type IS 'Tipo: standard, blind, theoretical';
COMMENT ON COLUMN sessions.audit_status IS 'Estado de auditoria: pending, synced, error';
COMMENT ON COLUMN sessions.mm IS 'Mes del conteo';
COMMENT ON COLUMN sessions.yyyy IS 'Anio del conteo';
COMMENT ON COLUMN sessions.batch IS 'Batch ID para sesiones ciego (HAM-XXXXXXXX)';
