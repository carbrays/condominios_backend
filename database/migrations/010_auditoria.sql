-- Migration: 010_auditoria.sql
-- Dominio: Auditoría de eventos y cambios sensibles

CREATE TABLE IF NOT EXISTS auditoria_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    condominio_id BIGINT REFERENCES condominios(id) ON DELETE SET NULL,
    accion VARCHAR(100) NOT NULL,
    entidad VARCHAR(100) NOT NULL,
    entidad_id VARCHAR(100),
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    ip VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario ON auditoria_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_condominio ON auditoria_logs(condominio_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria_logs(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_logs(created_at);
