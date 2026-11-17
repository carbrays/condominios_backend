-- Migration: 005_finanzas_pagos.sql
-- Dominio: Finanzas, expensas, cargos, cuentas QR, pagos y servicios

CREATE TABLE IF NOT EXISTS conceptos_gasto (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('ORDINARIA', 'EXTRAORDINARIA', 'MULTA', 'INTERES', 'FONDO_RESERVA', 'OTRO')),
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expensas (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
    concepto_id BIGINT REFERENCES conceptos_gasto(id) ON DELETE SET NULL,
    periodo VARCHAR(7) NOT NULL, -- YYYY-MM
    monto_base NUMERIC(12,2) NOT NULL,
    monto_mora NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monto_descuento NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    monto_total NUMERIC(12,2) NOT NULL,
    saldo_pendiente NUMERIC(12,2) NOT NULL,
    fecha_emision DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'PAGADO', 'ANULADO', 'EN_MORA')),
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_expensa_unidad_periodo_concepto UNIQUE (unidad_id, periodo, concepto_id)
);

CREATE TABLE IF NOT EXISTS cargos_adicionales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
    descripcion VARCHAR(200) NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    aplicado_en_expensa_id BIGINT REFERENCES expensas(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cuentas_bancarias_qr (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    banco VARCHAR(100) NOT NULL,
    tipo_cuenta VARCHAR(50),
    numero_cuenta VARCHAR(100) NOT NULL,
    titular VARCHAR(150) NOT NULL,
    qr_imagen_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
    expensa_id BIGINT REFERENCES expensas(id) ON DELETE SET NULL,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    monto NUMERIC(12,2) NOT NULL,
    fecha_pago DATE NOT NULL,
    metodo_pago VARCHAR(30) NOT NULL DEFAULT 'QR_TRANSFERENCIA' CHECK (metodo_pago IN ('QR_TRANSFERENCIA', 'EFECTIVO', 'DEPOSITO', 'OTRO')),
    referencia_transaccion VARCHAR(100),
    comprobante_url TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO')),
    motivo_rechazo TEXT,
    validado_por BIGINT REFERENCES usuarios(id),
    fecha_validacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recibos_servicios (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    condominio_id BIGINT NOT NULL REFERENCES condominios(id) ON DELETE CASCADE,
    unidad_id BIGINT REFERENCES unidades(id) ON DELETE CASCADE,
    servicio VARCHAR(50) NOT NULL CHECK (servicio IN ('LUZ', 'AGUA', 'GAS', 'INTERNET', 'CABLE', 'OTRO')),
    periodo VARCHAR(20) NOT NULL,
    monto NUMERIC(12,2) NOT NULL,
    fecha_emision DATE,
    fecha_vencimiento DATE,
    imagen_url TEXT NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADO' CHECK (estado IN ('REGISTRADO', 'NOTIFICADO', 'PAGADO')),
    registrado_por BIGINT REFERENCES usuarios(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expensas_condominio ON expensas(condominio_id);
CREATE INDEX IF NOT EXISTS idx_expensas_unidad ON expensas(unidad_id);
CREATE INDEX IF NOT EXISTS idx_expensas_periodo ON expensas(periodo);
CREATE INDEX IF NOT EXISTS idx_pagos_condominio ON pagos(condominio_id);
CREATE INDEX IF NOT EXISTS idx_pagos_expensa ON pagos(expensa_id);
CREATE INDEX IF NOT EXISTS idx_pagos_usuario ON pagos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recibos_unidad ON recibos_servicios(unidad_id);
