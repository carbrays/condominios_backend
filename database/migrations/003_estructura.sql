-- Migration: 003_estructura.sql
-- Dominio: Estructura arquitectónica (bloques, pisos, tipos_unidad, unidades)

CREATE TABLE IF NOT EXISTS bloques (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT
);

CREATE TABLE IF NOT EXISTS pisos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    bloque_id BIGINT REFERENCES bloques(id) ON DELETE SET NULL,
    numero INT NOT NULL,
    nombre VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tipos_unidad (
    id VARCHAR(30) PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS unidades (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    bloque_id BIGINT REFERENCES bloques(id) ON DELETE SET NULL,
    piso_id BIGINT REFERENCES pisos(id) ON DELETE SET NULL,
    tipo_unidad_id VARCHAR(30) NOT NULL REFERENCES tipos_unidad(id) ON DELETE RESTRICT,
    codigo VARCHAR(50) NOT NULL,
    alicuota NUMERIC(8,4) NOT NULL DEFAULT 0.0000,
    metros_cuadrados NUMERIC(8,2),
    estado VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE' CHECK (estado IN ('DISPONIBLE', 'OCUPADA', 'EN_MANTENIMIENTO', 'RESERVADA')),
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    deleted_by BIGINT,
    CONSTRAINT uq_condominio_codigo_unidad UNIQUE (condominio_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_unidades_condominio ON unidades(condominio_id);
CREATE INDEX IF NOT EXISTS idx_unidades_bloque ON unidades(bloque_id);
CREATE INDEX IF NOT EXISTS idx_unidades_tipo ON unidades(tipo_unidad_id);
