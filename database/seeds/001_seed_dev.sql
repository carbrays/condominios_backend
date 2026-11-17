-- Seed de desarrollo: 001_seed_dev.sql

-- 1. ROLES
INSERT INTO roles (id, nombre, descripcion, es_sistema) VALUES
('SUPER_ADMIN', 'Super Administrador del Sistema', 'Acceso global a todo el ecosistema de condominios', TRUE),
('ADMINISTRADOR', 'Administrador de Condominio', 'Gestión operativa, financiera y legal del condominio', TRUE),
('DIRECTORIO', 'Miembro del Directorio', 'Supervisión ejecutiva y aprobación de presupuestos', TRUE),
('CONSERJE', 'Conserjería y Seguridad', 'Control de accesos, paquetería, visitas y novedades', TRUE),
('COPROPIETARIO', 'Copropietario / Residente', 'Propietario de unidad habitacional con derechos de voto y finanzas', TRUE),
('INQUILINO', 'Inquilino', 'Arrendatario de unidad con accesos y visualización de servicios', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 2. TIPOS DE UNIDAD
INSERT INTO tipos_unidad (id, nombre, descripcion) VALUES
('DEPARTAMENTO', 'Departamento Habitacional', 'Unidad residencial principal'),
('PARQUEO', 'Estacionamiento / Garaje', 'Espacio vehicular privado'),
('BAULERA', 'Baulera / Depósito', 'Espacio de almacenamiento'),
('LOCAL_COMERCIAL', 'Local Comercial', 'Área de comercio en planta baja'),
('OFICINA', 'Oficina Administrativa', 'Espacio de oficina'),
('OTRO', 'Otro tipo de unidad', 'Otras unidades')
ON CONFLICT (id) DO NOTHING;

-- 3. PERMISOS
INSERT INTO permisos (id, modulo, descripcion) VALUES
-- Condominios
('CONDOMINIO_VER', 'CONDOMINIOS', 'Ver detalles de condominios'),
('CONDOMINIO_CREAR', 'CONDOMINIOS', 'Crear nuevos condominios'),
('CONDOMINIO_EDITAR', 'CONDOMINIOS', 'Modificar configuración de condominios'),
-- Unidades
('UNIDAD_VER', 'UNIDADES', 'Ver listado y detalles de unidades'),
('UNIDAD_CREAR', 'UNIDADES', 'Crear nuevas unidades'),
('UNIDAD_EDITAR', 'UNIDADES', 'Editar unidades existentes'),
-- Personas y Residentes
('PERSONA_VER', 'PERSONAS', 'Consultar información de personas'),
('PERSONA_CREAR', 'PERSONAS', 'Registrar nuevas personas'),
('PERSONA_EDITAR', 'PERSONAS', 'Actualizar datos de personas'),
-- Finanzas y Expensas
('EXPENSA_VER', 'FINANZAS', 'Ver expensas y estados de cuenta'),
('EXPENSA_CREAR', 'FINANZAS', 'Generar expensas mensuales o extraordinarias'),
('EXPENSA_EDITAR', 'FINANZAS', 'Modificar expensas o anular'),
-- Pagos
('PAGO_VER', 'PAGOS', 'Ver historial y estado de pagos'),
('PAGO_CREAR', 'PAGOS', 'Registrar o subir comprobante de pago'),
('PAGO_VALIDAR', 'PAGOS', 'Aprobar o rechazar pagos'),
-- Servicios
('SERVICIO_VER', 'SERVICIOS', 'Ver recibos de servicios'),
('SERVICIO_CREAR', 'SERVICIOS', 'Registrar lecturas y fotos de recibos'),
-- Conserjería y Accesos
('CONSERJERIA_VER', 'CONSERJERIA', 'Ver bitácora y visitas'),
('CONSERJERIA_GESTIONAR', 'CONSERJERIA', 'Registrar visitas, paquetería y escanear QR'),
-- Reservas
('RESERVA_VER', 'RESERVAS', 'Ver disponibilidad de áreas comunes'),
('RESERVA_CREAR', 'RESERVAS', 'Reservar áreas comunes'),
('RESERVA_CANCELAR', 'RESERVAS', 'Cancelar o administrar reservas'),
-- Comunicados
('COMUNICADO_VER', 'COMUNICADOS', 'Ver comunicados del condominio'),
('COMUNICADO_CREAR', 'COMUNICADOS', 'Publicar comunicados oficiales'),
-- Encuestas
('ENCUESTA_VER', 'ENCUESTAS', 'Ver encuestas activas'),
('ENCUESTA_CREAR', 'ENCUESTAS', 'Crear encuestas y votaciones'),
('ENCUESTA_VOTAR', 'ENCUESTAS', 'Emitir voto en encuestas'),
-- Incidencias
('INCIDENCIA_VER', 'INCIDENCIAS', 'Ver incidencias reportadas'),
('INCIDENCIA_CREAR', 'INCIDENCIAS', 'Reportar nueva incidencia'),
('INCIDENCIA_GESTIONAR', 'INCIDENCIAS', 'Asignar, actualizar estado y resolver incidencias'),
-- Reputación
('REPUTACION_VER', 'REPUTACION', 'Ver calificaciones de reputación'),
('REPUTACION_CREAR', 'REPUTACION', 'Calificar a inquilino o propietario'),
-- Auditoría
('AUDITORIA_VER', 'AUDITORIA', 'Ver registros de auditoría')
ON CONFLICT (id) DO NOTHING;

-- 4. ROL_PERMISOS (SUPER_ADMIN recibe todos los permisos)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'SUPER_ADMIN', id FROM permisos
ON CONFLICT DO NOTHING;

-- ADMINISTRADOR (Gestión casi total del condominio)
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT 'ADMINISTRADOR', id FROM permisos
WHERE id NOT IN ('CONDOMINIO_CREAR')
ON CONFLICT DO NOTHING;

-- DIRECTORIO
INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
('DIRECTORIO', 'CONDOMINIO_VER'),
('DIRECTORIO', 'UNIDAD_VER'),
('DIRECTORIO', 'PERSONA_VER'),
('DIRECTORIO', 'EXPENSA_VER'),
('DIRECTORIO', 'PAGO_VER'),
('DIRECTORIO', 'SERVICIO_VER'),
('DIRECTORIO', 'CONSERJERIA_VER'),
('DIRECTORIO', 'RESERVA_VER'),
('DIRECTORIO', 'COMUNICADO_VER'),
('DIRECTORIO', 'ENCUESTA_VER'),
('DIRECTORIO', 'INCIDENCIA_VER'),
('DIRECTORIO', 'AUDITORIA_VER')
ON CONFLICT DO NOTHING;

-- CONSERJE
INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
('CONSERJE', 'CONDOMINIO_VER'),
('CONSERJE', 'UNIDAD_VER'),
('CONSERJE', 'PERSONA_VER'),
('CONSERJE', 'CONSERJERIA_VER'),
('CONSERJE', 'CONSERJERIA_GESTIONAR'),
('CONSERJE', 'SERVICIO_VER'),
('CONSERJE', 'SERVICIO_CREAR'),
('CONSERJE', 'INCIDENCIA_VER'),
('CONSERJE', 'INCIDENCIA_CREAR'),
('CONSERJE', 'COMUNICADO_VER')
ON CONFLICT DO NOTHING;

-- COPROPIETARIO
INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
('COPROPIETARIO', 'CONDOMINIO_VER'),
('COPROPIETARIO', 'UNIDAD_VER'),
('COPROPIETARIO', 'EXPENSA_VER'),
('COPROPIETARIO', 'PAGO_VER'),
('COPROPIETARIO', 'PAGO_CREAR'),
('COPROPIETARIO', 'SERVICIO_VER'),
('COPROPIETARIO', 'RESERVA_VER'),
('COPROPIETARIO', 'RESERVA_CREAR'),
('COPROPIETARIO', 'COMUNICADO_VER'),
('COPROPIETARIO', 'ENCUESTA_VER'),
('COPROPIETARIO', 'ENCUESTA_VOTAR'),
('COPROPIETARIO', 'INCIDENCIA_VER'),
('COPROPIETARIO', 'INCIDENCIA_CREAR'),
('COPROPIETARIO', 'REPUTACION_VER'),
('COPROPIETARIO', 'REPUTACION_CREAR')
ON CONFLICT DO NOTHING;

-- INQUILINO
INSERT INTO rol_permisos (rol_id, permiso_id) VALUES
('INQUILINO', 'CONDOMINIO_VER'),
('INQUILINO', 'UNIDAD_VER'),
('INQUILINO', 'EXPENSA_VER'),
('INQUILINO', 'PAGO_VER'),
('INQUILINO', 'PAGO_CREAR'),
('INQUILINO', 'SERVICIO_VER'),
('INQUILINO', 'RESERVA_VER'),
('INQUILINO', 'RESERVA_CREAR'),
('INQUILINO', 'COMUNICADO_VER'),
('INQUILINO', 'ENCUESTA_VER'),
('INQUILINO', 'INCIDENCIA_VER'),
('INQUILINO', 'INCIDENCIA_CREAR'),
('INQUILINO', 'REPUTACION_VER')
ON CONFLICT DO NOTHING;
