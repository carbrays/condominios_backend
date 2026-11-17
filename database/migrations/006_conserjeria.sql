-- Migration: 006_conserjeria.sql
-- Dominio: Portería, pases QR, visitas, paquetería, correspondencia y bitácora

CREATE TABLE IF NOT EXISTS pases_qr (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
    creado_por BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo_seguro VARCHAR(100) UNIQUE NOT NULL,
    nombre_visitante VARCHAR(150) NOT NULL,
    documento_visitante VARCHAR(30),
    fecha_inicio TIMESTAMPTZ NOT NULL,
    fecha_expiracion TIMESTAMPTZ NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'USADO', 'EXPIRADO', 'CANCELADO')),
    uso_multiple BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visitas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
    visitante_nombre VARCHAR(150) NOT NULL,
    visitante_documento VARCHAR(30) NOT NULL,
    residente_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    pase_qr_id BIGINT REFERENCES pases_qr(id) ON DELETE SET NULL,
    fecha_entrada TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_salida TIMESTAMPTZ,
    vehiculo_placa VARCHAR(20),
    observaciones TEXT,
    registrado_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paqueteria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
    empresa_transporte VARCHAR(100),
    destinatario_nombre VARCHAR(150) NOT NULL,
    remitente VARCHAR(150),
    codigo_paquete VARCHAR(50),
    fotografia_url TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'RECIBIDO' CHECK (estado IN ('RECIBIDO', 'NOTIFICADO', 'ENTREGADO', 'DEVUELTO')),
    recibido_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    entregado_a VARCHAR(150),
    fecha_recepcion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS correspondencia (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
    remitente VARCHAR(150),
    tipo VARCHAR(50) NOT NULL DEFAULT 'CARTA',
    estado VARCHAR(20) NOT NULL DEFAULT 'RECIBIDO' CHECK (estado IN ('RECIBIDO', 'ENTREGADO')),
    fecha_recepcion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_entrega TIMESTAMPTZ,
    entregado_a VARCHAR(150),
    recibido_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bitacora_conserjeria (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    turno VARCHAR(30) NOT NULL,
    tipo_evento VARCHAR(50) NOT NULL CHECK (tipo_evento IN ('CAMBIO_TURNO', 'NOVEDAD', 'TECNICO', 'VEHICULO', 'INCIDENTE', 'OBSERVACION')),
    detalle TEXT NOT NULL,
    adjunto_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitas_condominio ON visitas(condominio_id);
CREATE INDEX IF NOT EXISTS idx_visitas_unidad ON visitas(unidad_id);
CREATE INDEX IF NOT EXISTS idx_visitas_entrada ON visitas(fecha_entrada);
CREATE INDEX IF NOT EXISTS idx_paqueteria_unidad ON paqueteria(unidad_id);
CREATE INDEX IF NOT EXISTS idx_paqueteria_estado ON paqueteria(estado);
CREATE INDEX IF NOT EXISTS idx_pases_qr_codigo ON pases_qr(codigo_seguro);
