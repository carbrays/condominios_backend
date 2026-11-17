-- Migration: 007_reservas_comunicados_encuestas.sql
-- Dominio: Áreas comunes, reservas, comunicados oficiales, encuestas y votaciones

CREATE TABLE IF NOT EXISTS areas_comunes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    capacidad_maxima INT NOT NULL DEFAULT 10,
    costo_reserva NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    garantia NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    duracion_maxima_horas INT NOT NULL DEFAULT 4,
    reglas TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    area_comun_id BIGINT NOT NULL REFERENCES areas_comunes(id) ON DELETE RESTRICT,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_reserva DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA' CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'CANCELADA', 'RECHAZADA', 'FINALIZADA')),
    motivo_cancelacion TEXT,
    costo_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS comunicados (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    autor_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (prioridad IN ('BAJA', 'NORMAL', 'ALTA', 'URGENTE')),
    adjunto_url TEXT,
    fecha_publicacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMPTZ,
    estado VARCHAR(20) NOT NULL DEFAULT 'PUBLICADO' CHECK (estado IN ('BORRADOR', 'PUBLICADO', 'ARCHIVADO')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encuestas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    creado_por BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_fin TIMESTAMPTZ NOT NULL,
    ponderar_por_alicuota BOOLEAN NOT NULL DEFAULT FALSE,
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('BORRADOR', 'ABIERTA', 'CERRADA', 'CANCELADA')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encuesta_opciones (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    encuesta_id BIGINT NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
    opcion_texto VARCHAR(255) NOT NULL,
    orden INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS votos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    encuesta_id BIGINT NOT NULL REFERENCES encuestas(id) ON DELETE CASCADE,
    opcion_id BIGINT NOT NULL REFERENCES encuesta_opciones(id) ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    peso_voto NUMERIC(8,4) NOT NULL DEFAULT 1.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_voto_usuario_encuesta UNIQUE (encuesta_id, usuario_id, unidad_id)
);

CREATE INDEX IF NOT EXISTS idx_reservas_area_fecha ON reservas(area_comun_id, fecha_reserva);
CREATE INDEX IF NOT EXISTS idx_comunicados_condominio ON comunicados(condominio_id);
CREATE INDEX IF NOT EXISTS idx_encuestas_condominio ON encuestas(condominio_id);
