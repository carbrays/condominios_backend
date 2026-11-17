const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');

test('Flujo E2E: Login Super Admin (CI 1000001) y selección de condominio', async () => {
  // 1. Login
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      ci: '1000001',
      password: 'password123'
    });

  assert.equal(loginRes.statusCode, 200);
  assert.equal(loginRes.body.success, true);
  assert.ok(loginRes.body.data.tokens.accessToken);
  assert.ok(loginRes.body.data.condominios.length > 0);

  const token = loginRes.body.data.tokens.accessToken;
  const condominioId = loginRes.body.data.condominios[0].id;

  // 2. Consulta de condominios
  const condsRes = await request(app)
    .get('/api/v1/condominios')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(condsRes.statusCode, 200);
  assert.ok(condsRes.body.data.items.length > 0);

  // 3. Dashboard del condominio
  const dashRes = await request(app)
    .get('/api/v1/condominios/dashboard')
    .set('Authorization', `Bearer ${token}`)
    .set('x-condominio-id', String(condominioId));
  assert.equal(dashRes.statusCode, 200);
  assert.ok(dashRes.body.data.unidades);
  assert.ok(dashRes.body.data.finanzas);

  // 4. Listar unidades
  const unitsRes = await request(app)
    .get('/api/v1/unidades')
    .set('Authorization', `Bearer ${token}`)
    .set('x-condominio-id', String(condominioId));
  assert.equal(unitsRes.statusCode, 200);
  assert.ok(unitsRes.body.data.items.length > 0);

  // 5. Listar expensas
  const expRes = await request(app)
    .get('/api/v1/finanzas/expensas')
    .set('Authorization', `Bearer ${token}`)
    .set('x-condominio-id', String(condominioId));
  assert.equal(expRes.statusCode, 200);
});

test('Flujo E2E: Login Propietario (CI 4000004), estado de cuenta y pase QR', async () => {
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({
      ci: '4000004',
      password: 'password123'
    });

  assert.equal(loginRes.statusCode, 200);
  const token = loginRes.body.data.tokens.accessToken;
  const condominioId = loginRes.body.data.condominios[0].id;

  // Generar Pase QR
  const qrRes = await request(app)
    .post('/api/v1/conserjeria/qr/generar')
    .set('Authorization', `Bearer ${token}`)
    .set('x-condominio-id', String(condominioId))
    .send({
      unidad_id: 1,
      nombre_visitante: 'Visita Familiar E2E',
      documento_visitante: '998877',
      fecha_expiracion: new Date(Date.now() + 86400000).toISOString()
    });

  assert.equal(qrRes.statusCode, 201);
  assert.ok(qrRes.body.data.codigo_seguro);
  assert.ok(qrRes.body.data.qr_image);
});
