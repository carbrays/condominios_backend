-- Migration: 004_propietarios_inquilinos.sql
-- Dominio: Relaciones de tenencia y documentos legales

CREATE TABLE IF NOT EXISTS unidad_propietarios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE RESTRICT,
    porcentaje_propiedad NUMERIC(5,2) NOT NULL DEFAULT 100.00,
    es_representante_legal BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_adquisicion DATE,
    folio_real VARCHAR(100),
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'HISTORICO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contratos_residencia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
    persona_id BIGINT NOT NULL REFERENCES personas(id) ON DELETE RESTRICT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('PROPIETARIO_HABITANTE', 'INQUILINO', 'FAMILIAR', 'OTRO')),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'FINALIZADO', 'CANCELADO')),
    responsable_pago BOOLEAN NOT NULL DEFAULT TRUE,
    observaciones TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documentos_legales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT REFERENCES unidades(id) ON DELETE SET NULL,
    persona_id BIGINT REFERENCES personas(id) ON DELETE SET NULL,
    tipo_documento VARCHAR(50) NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    archivo_url TEXT NOT NULL,
    privado BOOLEAN NOT NULL DEFAULT TRUE,
    subido_por BIGINT REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unidad_propietarios_persona ON unidad_propietarios(persona_id);
CREATE INDEX IF NOT EXISTS idx_unidad_propietarios_unidad ON unidad_propietarios(unidad_id);
CREATE INDEX IF NOT EXISTS idx_contratos_residencia_persona ON contratos_residencia(persona_id);
CREATE INDEX IF NOT EXISTS idx_contratos_residencia_unidad ON contratos_residencia(unidad_id);
