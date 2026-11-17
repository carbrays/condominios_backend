-- Migration: 008_incidencias_reputacion.sql
-- Dominio: Incidencias, tickets de mantenimiento y sistema de reputación

CREATE TABLE IF NOT EXISTS incidencias (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT REFERENCES unidades(id) ON DELETE SET NULL,
    reportado_por BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    categoria VARCHAR(50) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    ubicacion VARCHAR(150),
    prioridad VARCHAR(20) NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA', 'URGENTE')),
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_PROCESO', 'RESUELTO', 'CANCELADO')),
    asignado_a BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    fotografia_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incidencia_comentarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    incidencia_id BIGINT NOT NULL REFERENCES incidencias(id) ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    comentario TEXT NOT NULL,
    adjunto_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reputacion_calificaciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    calificador_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    calificado_persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE RESTRICT,
    tipo_calificado VARCHAR(30) NOT NULL CHECK (tipo_calificado IN ('PROPIETARIO', 'INQUILINO', 'ADMINISTRACION')),
    puntuacion INT NOT NULL CHECK (puntuacion >= 1 AND puntuacion <= 5),
    comentario TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_incidencias_condominio ON incidencias(condominio_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_estado ON incidencias(estado);
CREATE INDEX IF NOT EXISTS idx_reputacion_persona ON reputacion_calificaciones(calificado_persona_id);
