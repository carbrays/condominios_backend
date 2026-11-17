const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

async function runSeed() {
  console.log('[SEED] Iniciando carga de datos demo para desarrollo...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Ejecutar seed SQL base (roles, permisos, tipos de unidad)
    const sqlPath = path.join(__dirname, 'seeds', '001_seed_dev.sql');
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      await client.query(sql);
      console.log('[SEED] Roles, permisos y tipos de unidad cargados.');
    }

    // 2. Hash de contraseña genérica para demo
    const defaultPassword = 'password123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 3. Crear personas demo
    const personasDemo = [
      {
        ci: '1000001',
        ci_expedicion: 'LP',
        nombres: 'Carlos',
        apellidos: 'García Soliz',
        email: 'superadmin@condominios.com',
        telefono: '+591 70000001',
        rol: 'SUPER_ADMIN'
      },
      {
        ci: '2000002',
        ci_expedicion: 'SC',
        nombres: 'Mariana',
        apellidos: 'Roca Justiniano',
        email: 'admin@condominios.com',
        telefono: '+591 70000002',
        rol: 'ADMINISTRADOR'
      },
      {
        ci: '3000003',
        ci_expedicion: 'CB',
        nombres: 'Juan',
        apellidos: 'Condori Mamani',
        email: 'conserje@condominios.com',
        telefono: '+591 70000003',
        rol: 'CONSERJE'
      },
      {
        ci: '4000004',
        ci_expedicion: 'SC',
        nombres: 'Roberto',
        apellidos: 'Mendoza Prado',
        email: 'propietario@condominios.com',
        telefono: '+591 70000004',
        rol: 'COPROPIETARIO'
      },
      {
        ci: '5000005',
        ci_expedicion: 'LP',
        nombres: 'Andrea',
        apellidos: 'Suárez Vargas',
        email: 'inquilino@condominios.com',
        telefono: '+591 70000005',
        rol: 'INQUILINO'
      }
    ];

    const usuarioMap = {};

    for (const p of personasDemo) {
      let personaId;
      const resPersona = await client.query(
        `INSERT INTO personas (ci, ci_expedicion, nombres, apellidos, email, telefono)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (ci) DO UPDATE SET email = EXCLUDED.email
         RETURNING id;`,
        [p.ci, p.ci_expedicion, p.nombres, p.apellidos, p.email, p.telefono]
      );
      personaId = resPersona.rows[0].id;

      const resUsuario = await client.query(
        `INSERT INTO usuarios (persona_id, password_hash, activo)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (persona_id) DO UPDATE SET password_hash = EXCLUDED.password_hash
         RETURNING id;`,
        [personaId, passwordHash]
      );
      usuarioMap[p.rol] = {
        usuarioId: resUsuario.rows[0].id,
        personaId: personaId,
        ci: p.ci,
        email: p.email
      };
    }
    console.log('[SEED] Usuarios y personas demo creados con contraseña "password123".');

    // 4. Crear Condominio Demo
    const resCondominio = await client.query(
      `INSERT INTO condominios (nombre, nit, direccion, ciudad, telefono, email, fondo_reserva, dia_limite_pago, porcentaje_mora_mensual)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING
       RETURNING id;`,
      [
        'Condominio Las Palmas Real',
        '349812023',
        'Av. Las Palmas esq. Calle Los Laureles #450',
        'Santa Cruz de la Sierra',
        '+591 3 3445566',
        'contacto@laspalmasreal.com',
        15000.00,
        10,
        3.00
      ]
    );

    let condominioId;
    if (resCondominio.rows.length > 0) {
      condominioId = resCondominio.rows[0].id;
    } else {
      const existingCond = await client.query('SELECT id FROM condominios WHERE nombre = $1 LIMIT 1', ['Condominio Las Palmas Real']);
      condominioId = existingCond.rows[0].id;
    }

    // 5. Asignar Membresías al Condominio Demo
    for (const [rol, data] of Object.entries(usuarioMap)) {
      await client.query(
        `INSERT INTO membresias (usuario_id, condominio_id, rol_id, estado, fecha_inicio)
         VALUES ($1, $2, $3, 'ACTIVO', CURRENT_DATE)
         ON CONFLICT (usuario_id, condominio_id, rol_id) DO UPDATE SET estado = 'ACTIVO';`,
        [data.usuarioId, condominioId, rol]
      );
    }
    console.log('[SEED] Membresías creadas para todos los roles en el condominio demo.');

    // 6. Bloques y Pisos
    const resBloque = await client.query(
      `INSERT INTO bloques (condominio_id, nombre, descripcion)
       VALUES ($1, 'Torre A', 'Torre principal de 10 pisos')
       RETURNING id;`,
      [condominioId]
    );
    const bloqueId = resBloque.rows[0].id;

    const resPiso1 = await client.query(
      `INSERT INTO pisos (condominio_id, bloque_id, numero, nombre)
       VALUES ($1, $2, 1, 'Piso 1') RETURNING id;`,
      [condominioId, bloqueId]
    );
    const piso1Id = resPiso1.rows[0].id;

    const resPiso2 = await client.query(
      `INSERT INTO pisos (condominio_id, bloque_id, numero, nombre)
       VALUES ($1, $2, 2, 'Piso 2') RETURNING id;`,
      [condominioId, bloqueId]
    );
    const piso2Id = resPiso2.rows[0].id;

    // 7. Unidades
    const resUnidad101 = await client.query(
      `INSERT INTO unidades (condominio_id, bloque_id, piso_id, tipo_unidad_id, codigo, alicuota, metros_cuadrados, estado)
       VALUES ($1, $2, $3, 'DEPARTAMENTO', 'DEP-101', 0.0500, 110.50, 'OCUPADA')
       ON CONFLICT (condominio_id, codigo) DO UPDATE SET alicuota = EXCLUDED.alicuota
       RETURNING id;`,
      [condominioId, bloqueId, piso1Id]
    );
    const unidad101Id = resUnidad101.rows[0].id;

    const resUnidad201 = await client.query(
      `INSERT INTO unidades (condominio_id, bloque_id, piso_id, tipo_unidad_id, codigo, alicuota, metros_cuadrados, estado)
       VALUES ($1, $2, $3, 'DEPARTAMENTO', 'DEP-201', 0.0450, 95.00, 'OCUPADA')
       ON CONFLICT (condominio_id, codigo) DO UPDATE SET alicuota = EXCLUDED.alicuota
       RETURNING id;`,
      [condominioId, bloqueId, piso2Id]
    );
    const unidad201Id = resUnidad201.rows[0].id;

    // Parqueo
    await client.query(
      `INSERT INTO unidades (condominio_id, bloque_id, piso_id, tipo_unidad_id, codigo, alicuota, metros_cuadrados, estado)
       VALUES ($1, $2, $3, 'PARQUEO', 'PRQ-01', 0.0050, 15.00, 'DISPONIBLE')
       ON CONFLICT (condominio_id, codigo) DO NOTHING;`,
      [condominioId, bloqueId, piso1Id]
    );

    // 8. Relación de Propietario e Inquilino
    const propData = usuarioMap['COPROPIETARIO'];
    await client.query(
      `INSERT INTO unidad_propietarios (unidad_id, persona_id, porcentaje_propiedad, es_representante_legal, fecha_adquisicion, folio_real)
       VALUES ($1, $2, 100.00, TRUE, '2023-01-15', 'FOL-7.01.1.01.0098234');`,
      [unidad101Id, propData.personaId]
    );

    const inqData = usuarioMap['INQUILINO'];
    await client.query(
      `INSERT INTO contratos_residencia (unidad_id, persona_id, tipo, fecha_inicio, fecha_fin, estado, responsable_pago)
       VALUES ($1, $2, 'INQUILINO', '2024-01-01', '2026-12-31', 'ACTIVO', TRUE);`,
      [unidad201Id, inqData.personaId]
    );
    console.log('[SEED] Unidades y contratos de residencia asociados.');

    // 9. Cuenta Bancaria QR
    await client.query(
      `INSERT INTO cuentas_bancarias_qr (condominio_id, banco, tipo_cuenta, numero_cuenta, titular, qr_imagen_url)
       VALUES ($1, 'Banco Nacional de Bolivia', 'Caja de Ahorro', '150-1289384-01', 'Condominio Las Palmas Real', 'https://via.placeholder.com/400x400.png?text=QR+Banco+BNB');`,
      [condominioId]
    );

    // 10. Conceptos de Gasto y Expensas Demo
    const resConcepto = await client.query(
      `INSERT INTO conceptos_gasto (condominio_id, nombre, tipo, descripcion)
       VALUES ($1, 'Expensa Ordinaria Mensual', 'ORDINARIA', 'Cuota de mantenimiento, seguridad y limpieza')
       RETURNING id;`,
      [condominioId]
    );
    const conceptoId = resConcepto.rows[0].id;

    // Expensa para DEP-101
    const resExpensa = await client.query(
      `INSERT INTO expensas (condominio_id, unidad_id, concepto_id, periodo, monto_base, monto_total, saldo_pendiente, fecha_emision, fecha_vencimiento, estado)
       VALUES ($1, $2, $3, '2026-11', 450.00, 450.00, 450.00, '2026-11-01', '2026-11-10', 'PENDIENTE')
       ON CONFLICT (unidad_id, periodo, concepto_id) DO NOTHING
       RETURNING id;`,
      [condominioId, unidad101Id, conceptoId]
    );

    // 11. Áreas comunes
    await client.query(
      `INSERT INTO areas_comunes (condominio_id, nombre, descripcion, capacidad_maxima, costo_reserva, garantia, hora_inicio, hora_fin, duracion_maxima_horas, reglas)
       VALUES 
       ($1, 'Churrasquera / Parrillero 1', 'Área de asador techada con mesas y lavaplatos', 25, 50.00, 100.00, '10:00', '23:00', 6, 'Música a volumen moderado hasta las 22:00. Dejar limpio.'),
       ($1, 'Salón Social de Eventos', 'Salón climatizado para fiestas y reuniones', 60, 200.00, 300.00, '12:00', '02:00', 8, 'Prohibido pirotecnia. Respetar horario de salida.');`,
      [condominioId]
    );

    // 12. Comunicado Demo
    const adminData = usuarioMap['ADMINISTRADOR'];
    await client.query(
      `INSERT INTO comunicados (condominio_id, autor_id, titulo, contenido, prioridad, estado)
       VALUES ($1, $2, 'Mantenimiento Preventivo de Ascensores', 'Estimados copropietarios, este jueves 20 se realizará mantenimiento general de 09:00 a 13:00.', 'NORMAL', 'PUBLICADO');`,
      [condominioId, adminData.usuarioId]
    );

    await client.query('COMMIT');
    console.log('[SEED] ¡Carga de datos de desarrollo completada exitosamente!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[SEED ERROR] Error cargando seed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
