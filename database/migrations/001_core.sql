-- Migration: 001_core.sql
-- Dominio: Core (personas, usuarios, roles, permisos, rol_permisos)

CREATE TABLE IF NOT EXISTS personas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ci VARCHAR(30) UNIQUE NOT NULL,
    ci_expedicion VARCHAR(10),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE,
    telefono VARCHAR(30),
    fecha_nacimiento DATE,
    direccion_alternativa TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT
);

CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE RESTRICT,
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    CONSTRAINT uq_usuario_persona UNIQUE (persona_id)
);

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    es_sistema BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permisos (
    id VARCHAR(50) PRIMARY KEY,
    modulo VARCHAR(30) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rol_permisos (
    rol_id VARCHAR(30) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permiso_id VARCHAR(50) NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE INDEX IF NOT EXISTS idx_personas_ci ON personas(ci);
CREATE INDEX IF NOT EXISTS idx_personas_email ON personas(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_persona ON usuarios(persona_id);
